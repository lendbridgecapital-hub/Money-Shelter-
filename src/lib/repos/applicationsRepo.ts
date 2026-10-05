import crypto from 'crypto';
import { db } from '@/lib/db';
import type { LoanApplication, ApplicationStatus, LoanType, PipelineStats, User } from '@/types/db';
import { listPartnersByRm, listPartnersBySubDsa, getUserById } from '@/lib/repos/usersRepo';
import { generateApplicationToken } from '@/lib/tokens';

export function createApplicationLink(data: {
  token: string;
  branchId: string;
  createdById: string;
  channelPartnerId?: string;
  channelPartnerName?: string;
  relationshipManagerId?: string | null;
  relationshipManagerName?: string | null;
  tenantId?: string;
}): LoanApplication {
  const id = `app_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';
  const partnerId = data.channelPartnerId || data.createdById;
  const partnerName = data.channelPartnerName || 'Channel Partner';

  db.prepare(
    `INSERT INTO loan_applications (
      id, tenant_id, token, branch_id, created_by_id, channel_partner_id, channel_partner_name,
      relationship_manager_id, relationship_manager_name, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tenantId,
    data.token,
    data.branchId,
    data.createdById,
    partnerId,
    partnerName,
    data.relationshipManagerId || null,
    data.relationshipManagerName || null,
    'LINK_SHARED',
    now,
    now
  );

  const created = getApplicationById(id);
  if (!created) {
    throw new Error('Failed to create application');
  }
  return created;
}

export function getApplicationById(id: string): LoanApplication | undefined {
  const row = db
    .prepare('SELECT * FROM loan_applications WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;

  return row ? mapRowToApplication(row) : undefined;
}

export function getApplicationByToken(token: string): LoanApplication | undefined {
  if (!token) return undefined;
  const clean = String(token).trim();
  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean);
  } catch {}

  // 1. Query by token
  let row = db
    .prepare('SELECT * FROM loan_applications WHERE token = ?')
    .get(clean) as Record<string, unknown> | undefined;

  // 2. Query by decoded token if different
  if (!row && decoded !== clean) {
    row = db
      .prepare('SELECT * FROM loan_applications WHERE token = ?')
      .get(decoded) as Record<string, unknown> | undefined;
  }

  // 3. Fallback: Query by application ID
  if (!row) {
    row = db
      .prepare('SELECT * FROM loan_applications WHERE id = ?')
      .get(clean) as Record<string, unknown> | undefined;
  }

  if (row) {
    return mapRowToApplication(row);
  }

  // 4. Fallback: check portable database disk cache
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const cachePath = path.resolve(process.cwd(), 'data/app-portable.json');
    if (fs.existsSync(cachePath)) {
      const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const list = Array.isArray(raw.loan_applications) ? raw.loan_applications : [];
      const match = list.find(
        (a: Record<string, unknown>) =>
          a.token === clean || a.token === decoded || a.id === clean || a.id === decoded
      );
      if (match) {
        return mapRowToApplication(match);
      }
    }
  } catch {}

  return undefined;
}

export function recordCustomerSubmission(
  id: string,
  data: {
    fullName: string;
    mobile: string;
    email: string;
    loanType: LoanType;
    loanAmount: number;
    monthlyIncome?: number;
    existingEmi?: number;
    tenureMonths?: number;
  }
): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE loan_applications
     SET full_name = ?, mobile = ?, email = ?, loan_type = ?, loan_amount = ?, monthly_income = ?, existing_emi = ?, tenure_months = COALESCE(?, tenure_months), status = ?, submitted_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    data.fullName.trim(),
    data.mobile.trim(),
    data.email.trim().toLowerCase(),
    data.loanType,
    data.loanAmount,
    data.monthlyIncome || null,
    data.existingEmi !== undefined && data.existingEmi !== null ? data.existingEmi : null,
    data.tenureMonths || null,
    'DOCUMENTS_IN',
    now,
    now,
    id
  );
}

export function updateApplicationStatus(id: string, status: ApplicationStatus): void {
  const now = new Date().toISOString();
  db.prepare('UPDATE loan_applications SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
}

export function updateApplicationCustomerInfo(
  id: string,
  data: {
    fullName: string;
    mobile: string;
    email?: string | null;
    loanType: LoanType;
    loanAmount: number;
    monthlyIncome?: number | null;
    existingEmi?: number | null;
    tenureMonths?: number | null;
    panNumber?: string | null;
    aadhaarNumber?: string | null;
  }
): LoanApplication {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE loan_applications
     SET full_name = ?, mobile = ?, email = ?, loan_type = ?, loan_amount = ?,
         monthly_income = ?, existing_emi = ?, tenure_months = ?, pan_number = ?, aadhaar_number = ?,
         updated_at = ?
     WHERE id = ?`
  ).run(
    data.fullName.trim(),
    data.mobile.trim(),
    data.email ? data.email.trim().toLowerCase() : null,
    data.loanType,
    Number(data.loanAmount) || 0,
    data.monthlyIncome !== undefined && data.monthlyIncome !== null ? Number(data.monthlyIncome) : null,
    data.existingEmi !== undefined && data.existingEmi !== null ? Number(data.existingEmi) : null,
    data.tenureMonths !== undefined && data.tenureMonths !== null ? Number(data.tenureMonths) : null,
    data.panNumber ? data.panNumber.trim().toUpperCase() : null,
    data.aadhaarNumber ? data.aadhaarNumber.trim().replace(/\s+/g, '') : null,
    now,
    id
  );

  const updated = getApplicationById(id);
  if (!updated) {
    throw new Error('Application not found after update');
  }
  return updated;
}

// 1. Send details to bank
export function sendCaseToBank(applicationId: string, bankId: string, bankName: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE loan_applications
     SET status = 'SENT_TO_BANK', bank_id = ?, bank_name = ?, sent_to_bank_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(bankId, bankName, now, now, applicationId);
}

// 2. Mark documents required
export function setDocumentsRequired(applicationId: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE loan_applications SET status = 'DOCUMENTS_REQUIRED', updated_at = ? WHERE id = ?`
  ).run(now, applicationId);
}

// 3. Bank approval with loan terms
export function approveApplication(
  applicationId: string,
  approvedAmount: number,
  interestRate: number,
  tenureMonths: number,
  bankId?: string,
  bankName?: string
): void {
  const now = new Date().toISOString();
  const updates: string[] = ['status = ?', 'approved_amount = ?', 'interest_rate = ?', 'tenure_months = ?', 'approved_at = ?', 'updated_at = ?'];
  const params: unknown[] = ['APPROVED', approvedAmount, interestRate, tenureMonths, now, now];

  if (bankId && bankName) {
    updates.push('bank_id = ?', 'bank_name = ?');
    params.push(bankId, bankName);
  }
  params.push(applicationId);

  db.prepare(`UPDATE loan_applications SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

// 4. Customer accepts sanction offer
export function customerAcceptLoanOffer(token: string, acceptanceLetterRef: string): LoanApplication | undefined {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE loan_applications
     SET status = 'CUSTOMER_ACCEPTED', customer_accepted_at = ?, acceptance_letter_ref = ?, updated_at = ?
     WHERE token = ?`
  ).run(now, acceptanceLetterRef, now, token);

  return getApplicationByToken(token);
}

// 5. Final Disbursement
export function disburseApplication(
  applicationId: string,
  disbursedAmount: number,
  commissionAmount: number
): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE loan_applications
     SET status = 'DISBURSED', disbursed_amount = ?, commission_amount = ?, commission_status = 'PENDING', disbursed_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(disbursedAmount, commissionAmount, now, now, applicationId);
}

export function listAllApplications(tenantId = 'default'): LoanApplication[] {
  const rows = db
    .prepare('SELECT * FROM loan_applications WHERE tenant_id = ? ORDER BY created_at DESC')
    .all(tenantId) as Record<string, unknown>[];

  return rows.map(mapRowToApplication);
}

export function listApplicationsByBranch(branchId: string): LoanApplication[] {
  const rows = db
    .prepare('SELECT * FROM loan_applications WHERE branch_id = ? ORDER BY created_at DESC')
    .all(branchId) as Record<string, unknown>[];

  return rows.map(mapRowToApplication);
}

export function listApplicationsByPartner(partnerId: string): LoanApplication[] {
  const rows = db
    .prepare('SELECT * FROM loan_applications WHERE channel_partner_id = ? OR created_by_id = ? ORDER BY created_at DESC')
    .all(partnerId, partnerId) as Record<string, unknown>[];

  return rows.map(mapRowToApplication);
}

export function listApplicationsForRm(rmId: string, tenantId = 'default'): LoanApplication[] {
  const assignedPartners = listPartnersByRm(rmId, tenantId);
  const partnerIds = new Set(assignedPartners.map((p) => p.id));

  const allApps = listAllApplications(tenantId);
  return allApps.filter((app) => {
    // 1. Direct RM attribution or created by RM
    if (app.relationshipManagerId === rmId || app.createdById === rmId) {
      return true;
    }
    // 2. Belonging to an assigned Channel Partner
    if (app.channelPartnerId && partnerIds.has(app.channelPartnerId)) {
      return true;
    }
    if (app.createdById && partnerIds.has(app.createdById)) {
      return true;
    }
    return false;
  });
}

export function listApplicationsForSubDsa(subDsaId: string, tenantId = 'default'): LoanApplication[] {
  const mappedPartners = listPartnersBySubDsa(subDsaId, tenantId);
  const mappedPartnerIds = new Set(mappedPartners.map((p) => p.id));
  const allApps = listAllApplications(tenantId);

  return allApps.filter((app) => {
    // 1. Direct cases created by Sub-DSA
    if (app.channelPartnerId === subDsaId || app.createdById === subDsaId) {
      return true;
    }
    // 2. Team cases created by mapped agents
    if (app.channelPartnerId && mappedPartnerIds.has(app.channelPartnerId)) {
      return true;
    }
    if (app.createdById && mappedPartnerIds.has(app.createdById)) {
      return true;
    }
    return false;
  });
}

export function listApplicationsByRole(user: User): LoanApplication[] {
  if (user.role === 'CHANNEL_PARTNER') {
    return listApplicationsByPartner(user.id);
  }
  if (user.role === 'SUB_DSA') {
    return listApplicationsForSubDsa(user.id, user.tenantId || 'default');
  }
  if (user.role === 'RELATIONSHIP_MANAGER') {
    return listApplicationsForRm(user.id, user.tenantId || 'default');
  }
  // Admin, Central Support, and Operations see all
  return listAllApplications(user.tenantId || 'default');
}

export function getPipelineStats(user?: User, tenantId = 'default'): PipelineStats {
  let apps: LoanApplication[];
  if (user) {
    apps = listApplicationsByRole(user);
  } else {
    apps = listAllApplications(tenantId);
  }

  const norm = (s?: string | null) => (s || '').toUpperCase();

  return {
    total: apps.length,
    linkShared: apps.filter((a) => norm(a.status) === 'LINK_SHARED').length,
    documentsIn: apps.filter((a) => norm(a.status) === 'DOCUMENTS_IN' || norm(a.status) === 'DOCUMENT_RECEIVED').length,
    sentToBank: apps.filter((a) => norm(a.status) === 'SENT_TO_BANK').length,
    documentsRequired: apps.filter((a) => norm(a.status) === 'DOCUMENTS_REQUIRED').length,
    approved: apps.filter((a) => norm(a.status) === 'APPROVED' || norm(a.status) === 'LOAN_APPROVED').length,
    customerAccepted: apps.filter((a) => norm(a.status) === 'CUSTOMER_ACCEPTED').length,
    disbursed: apps.filter((a) => norm(a.status) === 'DISBURSED' || norm(a.status) === 'LOAN_DISBURSED').length,
    rejected: apps.filter((a) => norm(a.status) === 'REJECTED' || norm(a.status) === 'LOAN_REJECTED').length,
  };
}

// Backward compatibility alias for branchStats
export function branchStats(branchId?: string, tenantId = 'default') {
  const apps = branchId ? listApplicationsByBranch(branchId) : listAllApplications(tenantId);
  const norm = (s?: string | null) => (s || '').toUpperCase();
  return {
    total: apps.length,
    linkShared: apps.filter((a) => norm(a.status) === 'LINK_SHARED').length,
    documentReceived: apps.filter((a) => norm(a.status) === 'DOCUMENTS_IN' || norm(a.status) === 'DOCUMENT_RECEIVED').length,
    approved: apps.filter((a) => norm(a.status) === 'APPROVED' || norm(a.status) === 'LOAN_APPROVED').length,
    rejected: apps.filter((a) => norm(a.status) === 'REJECTED' || norm(a.status) === 'LOAN_REJECTED').length,
    disbursed: apps.filter((a) => norm(a.status) === 'DISBURSED' || norm(a.status) === 'LOAN_DISBURSED').length,
  };
}

function mapRowToApplication(row: Record<string, unknown>): LoanApplication {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || row.tenantId || 'default'),
    token: String(row.token),
    branchId: String(row.branch_id || row.branchId),
    branchName: row.branch_name || row.branchName ? String(row.branch_name || row.branchName) : undefined,
    createdById: String(row.created_by_id || row.createdById),
    createdByName: row.created_by_name || row.createdByName ? String(row.created_by_name || row.createdByName) : undefined,
    channelPartnerId: row.channel_partner_id || row.channelPartnerId ? String(row.channel_partner_id || row.channelPartnerId) : undefined,
    channelPartnerName: row.channel_partner_name || row.channelPartnerName ? String(row.channel_partner_name || row.channelPartnerName) : undefined,
    relationshipManagerId: row.relationship_manager_id || row.relationshipManagerId ? String(row.relationship_manager_id || row.relationshipManagerId) : null,
    relationshipManagerName: row.relationship_manager_name || row.relationshipManagerName ? String(row.relationship_manager_name || row.relationshipManagerName) : null,
    status: (row.status as ApplicationStatus) || 'LINK_SHARED',
    fullName: row.full_name || row.fullName ? String(row.full_name || row.fullName) : null,
    mobile: row.mobile ? String(row.mobile) : null,
    email: row.email ? String(row.email) : null,
    loanType: (row.loan_type || row.loanType) as LoanType | null,
    loanAmount: row.loan_amount || row.loanAmount ? Number(row.loan_amount || row.loanAmount) : null,
    monthlyIncome: row.monthly_income || row.monthlyIncome ? Number(row.monthly_income || row.monthlyIncome) : null,
    existingEmi: row.existing_emi !== undefined && row.existing_emi !== null ? Number(row.existing_emi) : (row.existingEmi !== undefined && row.existingEmi !== null ? Number(row.existingEmi) : null),
    panNumber: row.pan_number || row.panNumber ? String(row.pan_number || row.panNumber) : null,
    aadhaarNumber: row.aadhaar_number || row.aadhaarNumber ? String(row.aadhaar_number || row.aadhaarNumber) : null,
    bankId: row.bank_id || row.bankId ? String(row.bank_id || row.bankId) : null,
    bankName: row.bank_name || row.bankName ? String(row.bank_name || row.bankName) : null,
    sentToBankAt: row.sent_to_bank_at || row.sentToBankAt ? String(row.sent_to_bank_at || row.sentToBankAt) : null,
    approvedAmount: row.approved_amount || row.approvedAmount ? Number(row.approved_amount || row.approvedAmount) : null,
    interestRate: row.interest_rate || row.interestRate ? Number(row.interest_rate || row.interestRate) : null,
    tenureMonths: row.tenure_months || row.tenureMonths ? Number(row.tenure_months || row.tenureMonths) : null,
    approvedAt: row.approved_at || row.approvedAt ? String(row.approved_at || row.approvedAt) : null,
    customerAcceptedAt: row.customer_accepted_at || row.customerAcceptedAt ? String(row.customer_accepted_at || row.customerAcceptedAt) : null,
    acceptanceLetterRef: row.acceptance_letter_ref || row.acceptanceLetterRef ? String(row.acceptance_letter_ref || row.acceptanceLetterRef) : null,
    disbursedAmount: row.disbursed_amount || row.disbursedAmount ? Number(row.disbursed_amount || row.disbursedAmount) : null,
    disbursedAt: row.disbursed_at || row.disbursedAt ? String(row.disbursed_at || row.disbursedAt) : null,
    commissionAmount: row.commission_amount || row.commissionAmount ? Number(row.commission_amount || row.commissionAmount) : null,
    commissionStatus: (row.commission_status || row.commissionStatus) as 'PENDING' | 'PAID' | 'CLAWBACK' | null,
    createdAt: String(row.created_at || row.createdAt || ''),
    submittedAt: row.submitted_at || row.submittedAt ? String(row.submitted_at || row.submittedAt) : null,
    updatedAt: row.updated_at || row.updatedAt ? String(row.updated_at || row.updatedAt) : null,
  };
}

export function createInquiryFromCard(data: {
  advisorId: string;
  fullName: string;
  mobile: string;
  email?: string;
  loanType?: LoanType;
  loanAmount?: number;
  city?: string;
  notes?: string;
}): LoanApplication {
  const user = getUserById(data.advisorId);
  const id = `app_${crypto.randomBytes(8).toString('hex')}`;
  const token = generateApplicationToken();
  const now = new Date().toISOString();
  const tenantId = user?.tenantId || 'default';
  const branchId = user?.branchId || 'default';
  const isPartner = user?.role === 'CHANNEL_PARTNER';
  const isRM = user?.role === 'RELATIONSHIP_MANAGER';

  db.prepare(
    `INSERT INTO loan_applications (
      id, tenant_id, token, branch_id, created_by_id, channel_partner_id, channel_partner_name,
      relationship_manager_id, relationship_manager_name, full_name, mobile, email,
      loan_type, loan_amount, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tenantId,
    token,
    branchId,
    data.advisorId,
    isPartner ? user.id : undefined,
    isPartner ? user.name : undefined,
    isRM ? user.id : (user?.assignedRmId || null),
    isRM ? user.name : (user?.assignedRmName || null),
    data.fullName.trim(),
    data.mobile.trim(),
    data.email ? data.email.trim().toLowerCase() : null,
    data.loanType || 'PERSONAL_LOAN',
    data.loanAmount || 0,
    'LINK_SHARED',
    now,
    now
  );

  const created = getApplicationById(id);
  if (!created) throw new Error('Failed to create card inquiry');
  return created;
}

export function createDirectPartnerApplication(data: {
  advisorId: string;
  advisor?: User;
  fullName: string;
  mobile: string;
  email?: string;
  loanType: LoanType;
  loanAmount: number;
  monthlyIncome?: number;
  existingEmi?: number;
  tenureMonths?: number;
  panNumber?: string;
  aadhaarNumber?: string;
  status?: ApplicationStatus;
}): LoanApplication {
  const user = data.advisor || getUserById(data.advisorId);
  const id = `app_${crypto.randomBytes(8).toString('hex')}`;
  const token = generateApplicationToken();
  const now = new Date().toISOString();
  const tenantId = user?.tenantId || 'default';
  const branchId = user?.branchId || 'default';
  const isPartner = user?.role === 'CHANNEL_PARTNER';
  const isRM = user?.role === 'RELATIONSHIP_MANAGER';
  const status = data.status || 'DOCUMENTS_IN';

  db.prepare(
    `INSERT INTO loan_applications (
      id, tenant_id, token, branch_id, created_by_id, channel_partner_id, channel_partner_name,
      relationship_manager_id, relationship_manager_name, full_name, mobile, email,
      loan_type, loan_amount, monthly_income, existing_emi, tenure_months, pan_number, aadhaar_number, status, submitted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tenantId,
    token,
    branchId,
    data.advisorId,
    isPartner ? user?.id : (user?.role === 'ADMIN' ? 'PARTNER_DIRECT' : undefined),
    isPartner ? user?.name : (user?.name || 'Partner'),
    isRM ? user?.id : (user?.assignedRmId || null),
    isRM ? user?.name : (user?.assignedRmName || null),
    data.fullName.trim(),
    data.mobile.trim(),
    data.email ? data.email.trim().toLowerCase() : null,
    data.loanType,
    data.loanAmount || 0,
    data.monthlyIncome || null,
    data.existingEmi !== undefined && data.existingEmi !== null ? data.existingEmi : null,
    data.tenureMonths || null,
    data.panNumber ? data.panNumber.trim().toUpperCase() : null,
    data.aadhaarNumber ? data.aadhaarNumber.trim().replace(/\s+/g, '') : null,
    status,
    now,
    now,
    now
  );

  const created = getApplicationById(id);
  if (!created) throw new Error('Failed to create direct partner loan application');
  return created;
}

