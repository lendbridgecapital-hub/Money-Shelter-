import crypto from 'crypto';
import { db } from '@/lib/db';
import type { LoanApplication, ApplicationStatus, LoanType, PipelineStats, User } from '@/types/db';
import { listPartnersByRm, listPartnersBySubDsa, getUserById, listUsers } from '@/lib/repos/usersRepo';
import { listBranches, getBranchById } from '@/lib/repos/branchesRepo';
import { generateApplicationToken } from '@/lib/tokens';
import { evaluateAndProcessSlaRules } from '@/lib/slaEngine';

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

  // Check branch / site details for auto-tagging and co-branding
  let rmId = data.relationshipManagerId || null;
  let rmName = data.relationshipManagerName || null;
  let isCoBranded = 0;
  let coBrandName: string | null = null;
  let coBrandLogoUrl: string | null = null;
  let coBrandTagline: string | null = null;
  let effectiveBranchId = data.branchId || '';

  if (effectiveBranchId && effectiveBranchId !== 'default') {
    try {
      const bRow = db
        .prepare('SELECT id, type, dedicated_rm_id, dedicated_rm_name, is_co_branded, co_brand_name, co_brand_logo_url, co_brand_tagline FROM branches WHERE id = ? OR code = ? OR name = ?')
        .get(effectiveBranchId, effectiveBranchId, effectiveBranchId) as {
          id?: string;
          type?: string;
          dedicated_rm_id?: string;
          dedicated_rm_name?: string;
          is_co_branded?: number | boolean;
          co_brand_name?: string;
          co_brand_logo_url?: string;
          co_brand_tagline?: string;
        } | undefined;
      if (bRow) {
        if (bRow.id) effectiveBranchId = bRow.id;
        if (!rmId && bRow.dedicated_rm_id) {
          rmId = bRow.dedicated_rm_id;
          rmName = bRow.dedicated_rm_name || null;
        }
        if (bRow.is_co_branded) {
          isCoBranded = 1;
          coBrandName = bRow.co_brand_name || null;
          coBrandLogoUrl = bRow.co_brand_logo_url || null;
          coBrandTagline = bRow.co_brand_tagline || null;
        }
      }
    } catch {}
  }

  // Failsafe: if creator or partner belongs to a specific branch (e.g. Satara / Lendbridge), inherit it
  if (!effectiveBranchId || effectiveBranchId === 'default') {
    try {
      const creatorUser = data.createdById ? (db.prepare('SELECT email, branch_id FROM users WHERE id = ?').get(data.createdById) as { email?: string; branch_id?: string } | undefined) : undefined;
      if (creatorUser?.branch_id && creatorUser.branch_id !== 'default') {
        effectiveBranchId = creatorUser.branch_id;
      } else if (creatorUser?.email?.toLowerCase().includes('lendbridge') || partnerName?.toLowerCase().includes('lendbridge')) {
        const satara = listBranches(tenantId).find(b => b.id === 'br_satara_01' || b.name.toLowerCase().includes('satara'));
        if (satara) {
          effectiveBranchId = satara.id;
          isCoBranded = 1;
          coBrandName = satara.coBrandName || 'Lendbridge Capital';
          coBrandTagline = satara.coBrandTagline || 'In strategic loan distribution partnership with Money Shelter Pvt. Ltd.';
        }
      }
    } catch {}
  }

  db.prepare(
    `INSERT INTO loan_applications (
      id, tenant_id, token, branch_id, created_by_id, channel_partner_id, channel_partner_name,
      relationship_manager_id, relationship_manager_name, status, status_changed_at,
      is_co_branded, co_brand_name, co_brand_logo_url, co_brand_tagline, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tenantId,
    data.token,
    effectiveBranchId || 'default',
    data.createdById,
    partnerId,
    partnerName,
    rmId,
    rmName,
    'LINK_SHARED',
    now,
    isCoBranded,
    coBrandName,
    coBrandLogoUrl,
    coBrandTagline,
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
  const existing = getApplicationById(id);
  const tenure = data.tenureMonths !== undefined && data.tenureMonths !== null
    ? data.tenureMonths
    : (existing?.tenureMonths || null);

  db.prepare(
    `UPDATE loan_applications
     SET full_name = ?, mobile = ?, email = ?, loan_type = ?, loan_amount = ?, monthly_income = ?, existing_emi = ?, tenure_months = ?, status = ?, status_changed_at = ?, tat_alerts_sent = NULL, submitted_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    data.fullName.trim(),
    data.mobile.trim(),
    data.email.trim().toLowerCase(),
    data.loanType,
    data.loanAmount,
    data.monthlyIncome || null,
    data.existingEmi !== undefined && data.existingEmi !== null ? data.existingEmi : null,
    tenure,
    'DOCUMENTS_IN',
    now,
    now,
    now,
    id
  );

  // Guaranteed Verification Guard: ensure status is strictly DOCUMENTS_IN
  const verified = getApplicationById(id);
  if (!verified || verified.status !== 'DOCUMENTS_IN') {
    db.prepare('UPDATE loan_applications SET status = ?, status_changed_at = ?, tat_alerts_sent = NULL, full_name = ?, mobile = ?, updated_at = ? WHERE id = ?')
      .run('DOCUMENTS_IN', now, data.fullName.trim(), data.mobile.trim(), now, id);
  }
}

export function updateApplicationStatus(id: string, status: ApplicationStatus): void {
  const now = new Date().toISOString();
  db.prepare('UPDATE loan_applications SET status = ?, status_changed_at = ?, tat_alerts_sent = NULL, updated_at = ? WHERE id = ?').run(status, now, now, id);
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
     SET status = 'SENT_TO_BANK', bank_id = ?, bank_name = ?, sent_to_bank_at = ?, status_changed_at = ?, tat_alerts_sent = NULL, updated_at = ?
     WHERE id = ?`
  ).run(bankId, bankName, now, now, now, applicationId);
}

// 2. Mark documents required
export function setDocumentsRequired(applicationId: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE loan_applications SET status = 'DOCUMENTS_REQUIRED', status_changed_at = ?, tat_alerts_sent = NULL, updated_at = ? WHERE id = ?`
  ).run(now, now, applicationId);
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
  const updates: string[] = ['status = ?', 'approved_amount = ?', 'interest_rate = ?', 'tenure_months = ?', 'approved_at = ?', 'status_changed_at = ?', 'tat_alerts_sent = NULL', 'updated_at = ?'];
  const params: unknown[] = ['APPROVED', approvedAmount, interestRate, tenureMonths, now, now, now];

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
     SET status = 'CUSTOMER_ACCEPTED', customer_accepted_at = ?, status_changed_at = ?, tat_alerts_sent = NULL, acceptance_letter_ref = ?, updated_at = ?
     WHERE token = ?`
  ).run(now, now, acceptanceLetterRef, now, token);

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
     SET status = 'DISBURSED', disbursed_amount = ?, commission_amount = ?, commission_status = 'PENDING', status_changed_at = ?, tat_alerts_sent = NULL, disbursed_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(disbursedAmount, commissionAmount, now, now, applicationId);
}

export function listAllApplications(tenantId = 'default'): LoanApplication[] {
  const rows = db
    .prepare('SELECT * FROM loan_applications WHERE tenant_id = ? ORDER BY created_at DESC')
    .all(tenantId) as Record<string, unknown>[];

  const apps = rows.map(mapRowToApplication);
  try {
    evaluateAndProcessSlaRules(apps).catch((err) => {
      console.warn('[applicationsRepo] evaluateAndProcessSlaRules error:', err);
    });
  } catch {}
  return apps;
}

export function listApplicationsByBranch(branchId: string): LoanApplication[] {
  const rows = db
    .prepare(`
      SELECT * FROM loan_applications
      WHERE branch_id = ?
         OR branch_id IN (SELECT id FROM branches WHERE mapped_branch_id = ?)
      ORDER BY created_at DESC
    `)
    .all(branchId, branchId) as Record<string, unknown>[];

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
  const rmUser = getUserById(rmId);

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
    // 3. Belonging to a site that is operated by RM's regional branch
    if (rmUser?.branchId && (app.mappedBranchId === rmUser.branchId || app.branchId === rmUser.branchId)) {
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

export function isHeadOfficeBranch(branchId?: string | null): boolean {
  if (!branchId || branchId === 'default' || branchId === 'all') return true;
  const clean = branchId.trim().toLowerCase();
  const branches = listBranches();
  const b = branches.find(
    (x) => x.id.toLowerCase() === clean || x.code.toLowerCase() === clean || x.name.toLowerCase() === clean
  );
  if (!b) return false;
  const name = b.name.toLowerCase();
  const code = b.code.toLowerCase();
  return name.includes('head office') || name.includes('bavdhan hq') || code === 'pun01';
}

export function listApplicationsForBranch(branchIdentifier: string, tenantId = 'default'): LoanApplication[] {
  if (!branchIdentifier) return [];

  const branches = listBranches(tenantId);
  const clean = branchIdentifier.trim().toLowerCase();
  const targetBranch = branches.find(
    (b) =>
      b.id.toLowerCase() === clean ||
      b.code.toLowerCase() === clean ||
      b.name.toLowerCase() === clean ||
      (b.coBrandName && b.coBrandName.toLowerCase() === clean) ||
      (clean.includes('satara') && b.name.toLowerCase().includes('satara')) ||
      (clean.includes('lendbridge') && (b.name.toLowerCase().includes('satara') || (b.coBrandName && b.coBrandName.toLowerCase().includes('lendbridge'))))
  );

  const branchIds = new Set<string>();
  branchIds.add(clean);
  if (targetBranch) {
    branchIds.add(targetBranch.id.toLowerCase());
    branchIds.add(targetBranch.code.toLowerCase());
    branchIds.add(targetBranch.name.toLowerCase());
    if (targetBranch.coBrandName) branchIds.add(targetBranch.coBrandName.toLowerCase());

    const mappedSites = branches.filter(
      (s) => s.mappedBranchId === targetBranch.id || s.mappedBranchId === targetBranch.code
    );
    for (const site of mappedSites) {
      branchIds.add(site.id.toLowerCase());
      branchIds.add(site.code.toLowerCase());
      branchIds.add(site.name.toLowerCase());
    }
  }

  // Users assigned to this branch
  const allUsers = listUsers(tenantId);
  const branchUserIds = new Set(
    allUsers
      .filter((u) => {
        if (!u.branchId) return false;
        const ub = u.branchId.toLowerCase();
        return (
          branchIds.has(ub) ||
          (targetBranch && ub === targetBranch.id.toLowerCase()) ||
          (targetBranch && ub === targetBranch.code.toLowerCase())
        );
      })
      .map((u) => u.id)
  );

  const allApps = listAllApplications(tenantId);
  return allApps.filter((app) => {
    // 1. App explicitly tagged with branch ID or name
    if (app.branchId && branchIds.has(app.branchId.toLowerCase())) return true;
    if (app.branchName && branchIds.has(app.branchName.toLowerCase())) return true;
    // 2. Site mapped to this branch
    if (app.mappedBranchId && branchIds.has(app.mappedBranchId.toLowerCase())) return true;
    if (app.mappedBranchName && branchIds.has(app.mappedBranchName.toLowerCase())) return true;
    // 3. Co-branded match
    if (
      targetBranch?.coBrandName &&
      app.isCoBranded &&
      app.coBrandName?.toLowerCase() === targetBranch.coBrandName.toLowerCase()
    ) {
      return true;
    }
    if (
      targetBranch?.name.toLowerCase().includes('satara') &&
      (app.coBrandName?.toLowerCase().includes('lendbridge') || app.branchName?.toLowerCase().includes('satara'))
    ) {
      return true;
    }
    // 4. Created by or owned by a user in this branch
    if (app.createdById && branchUserIds.has(app.createdById)) return true;
    if (app.channelPartnerId && branchUserIds.has(app.channelPartnerId)) return true;

    return false;
  });
}

export function listApplicationsByRole(user: User): LoanApplication[] {
  // 1. Channel Partner: strictly sees only their own cases
  if (user.role === 'CHANNEL_PARTNER') {
    return listApplicationsByPartner(user.id);
  }

  // 2. Sub-DSA: strictly sees only their own cases and cases originated by their mapped team agents
  if (user.role === 'SUB_DSA') {
    return listApplicationsForSubDsa(user.id, user.tenantId || 'default');
  }

  // 3. Relationship Manager: strictly sees cases assigned to them, their partners, or their sites
  if (user.role === 'RELATIONSHIP_MANAGER') {
    return listApplicationsForRm(user.id, user.tenantId || 'default');
  }

  // 4. Operations Team:
  // If user is assigned to a specific branch (e.g. Satara Branch, Mumbai, Bengaluru, or any regional branch):
  // Strictly filter cases belonging to that branch and any sites mapped to it!
  if (user.role === 'OPERATIONS') {
    const isLendbridgeOrSatara =
      user.email.toLowerCase().includes('lendbridge') ||
      user.email.toLowerCase().includes('satara') ||
      user.name.toLowerCase().includes('lendbridge') ||
      user.name.toLowerCase().includes('satara');

    if (isLendbridgeOrSatara) {
      return listApplicationsForBranch('br_satara_01', user.tenantId || 'default');
    }

    if (user.branchId && !isHeadOfficeBranch(user.branchId)) {
      return listApplicationsForBranch(user.branchId, user.tenantId || 'default');
    }
  }

  // 5. Central HQ Support and Admin see all
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
    rejected: apps.filter((a) => norm(a.status) === 'REJECTED' || norm(a.status) === 'LOAN_REJECTED' || norm(a.status) === 'FAILED').length,
    failed: 0,
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
    rejected: apps.filter((a) => norm(a.status) === 'REJECTED' || norm(a.status) === 'LOAN_REJECTED' || norm(a.status) === 'FAILED').length,
    disbursed: apps.filter((a) => norm(a.status) === 'DISBURSED' || norm(a.status) === 'LOAN_DISBURSED').length,
    failed: 0,
  };
}

function mapRowToApplication(row: Record<string, unknown>): LoanApplication {
  const branchId = String(row.branch_id || row.branchId);
  let branchName = row.branch_name || row.branchName ? String(row.branch_name || row.branchName) : undefined;
  let branchType: 'BRANCH' | 'SITE' | undefined = (row.branch_type || row.branchType) as 'BRANCH' | 'SITE' | undefined;
  let mappedBranchId: string | null | undefined = undefined;
  let mappedBranchName: string | null | undefined = undefined;
  let isCoBranded = Boolean(row.is_co_branded || row.isCoBranded);
  let coBrandName = row.co_brand_name || row.coBrandName ? String(row.co_brand_name || row.coBrandName) : null;
  let coBrandLogoUrl = row.co_brand_logo_url || row.coBrandLogoUrl ? String(row.co_brand_logo_url || row.coBrandLogoUrl) : null;
  let coBrandTagline = row.co_brand_tagline || row.coBrandTagline ? String(row.co_brand_tagline || row.coBrandTagline) : null;

  if (branchId) {
    try {
      const bRow = db
        .prepare('SELECT name, type, mapped_branch_id, mapped_branch_name, is_co_branded, co_brand_name, co_brand_logo_url, co_brand_tagline FROM branches WHERE id = ?')
        .get(branchId) as {
          name?: string;
          type?: string;
          mapped_branch_id?: string;
          mapped_branch_name?: string;
          is_co_branded?: number | boolean;
          co_brand_name?: string;
          co_brand_logo_url?: string;
          co_brand_tagline?: string;
        } | undefined;

      if (bRow) {
        if (!branchName && bRow.name) branchName = String(bRow.name);
        if (!branchType && bRow.type) branchType = bRow.type === 'SITE' ? 'SITE' : 'BRANCH';
        mappedBranchId = bRow.mapped_branch_id || null;
        mappedBranchName = bRow.mapped_branch_name || null;
        if (bRow.is_co_branded) {
          isCoBranded = true;
          if (!coBrandName && bRow.co_brand_name) coBrandName = bRow.co_brand_name;
          if (!coBrandLogoUrl && bRow.co_brand_logo_url) coBrandLogoUrl = bRow.co_brand_logo_url;
          if (!coBrandTagline && bRow.co_brand_tagline) coBrandTagline = bRow.co_brand_tagline;
        }
      }
    } catch {}
  }

  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || row.tenantId || 'default'),
    token: String(row.token),
    branchId,
    branchName,
    branchType,
    mappedBranchId,
    mappedBranchName,
    createdById: String(row.created_by_id || row.createdById),
    createdByName: row.created_by_name || row.createdByName ? String(row.created_by_name || row.createdByName) : undefined,
    channelPartnerId: row.channel_partner_id || row.channelPartnerId ? String(row.channel_partner_id || row.channelPartnerId) : undefined,
    channelPartnerName: row.channel_partner_name || row.channelPartnerName ? String(row.channel_partner_name || row.channelPartnerName) : undefined,
    channelPartnerPhone: (() => {
      const pId = row.channel_partner_id || row.channelPartnerId || row.created_by_id || row.createdById;
      if (pId) {
        try {
          const u = db.prepare('SELECT phone FROM users WHERE id = ?').get(String(pId)) as { phone?: string } | undefined;
          return u?.phone || null;
        } catch {
          return null;
        }
      }
      return null;
    })(),
    channelPartnerMobile: (() => {
      const pId = row.channel_partner_id || row.channelPartnerId || row.created_by_id || row.createdById;
      if (pId) {
        try {
          const u = db.prepare('SELECT phone FROM users WHERE id = ?').get(String(pId)) as { phone?: string } | undefined;
          return u?.phone || null;
        } catch {
          return null;
        }
      }
      return null;
    })(),
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
    eligibilityOfferJson: row.eligibility_offer_json || row.eligibilityOfferJson ? String(row.eligibility_offer_json || row.eligibilityOfferJson) : null,
    createdAt: String(row.created_at || row.createdAt || ''),
    submittedAt: row.submitted_at || row.submittedAt ? String(row.submitted_at || row.submittedAt) : null,
    updatedAt: row.updated_at || row.updatedAt ? String(row.updated_at || row.updatedAt) : null,
    statusChangedAt: row.status_changed_at || row.statusChangedAt ? String(row.status_changed_at || row.statusChangedAt) : null,
    tatAlertsSent: row.tat_alerts_sent || row.tatAlertsSent ? String(row.tat_alerts_sent || row.tatAlertsSent) : null,
    isCoBranded,
    coBrandName,
    coBrandLogoUrl,
    coBrandTagline,
  };
}

export function saveApplicationEligibilityOffer(
  applicationId: string,
  eligibilityOfferJson: string
): void {
  const now = new Date().toISOString();
  try {
    db.prepare(
      `UPDATE loan_applications
       SET eligibility_offer_json = ?, updated_at = ?
       WHERE id = ?`
    ).run(eligibilityOfferJson, now, applicationId);
  } catch {
    try {
      db.prepare('ALTER TABLE loan_applications ADD COLUMN eligibility_offer_json TEXT').run();
      db.prepare(
        `UPDATE loan_applications
         SET eligibility_offer_json = ?, updated_at = ?
         WHERE id = ?`
      ).run(eligibilityOfferJson, now, applicationId);
    } catch {}
  }
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
  let branchId = user?.branchId || 'default';
  const isPartner = user?.role === 'CHANNEL_PARTNER' || user?.role === 'SUB_DSA';
  const isRM = user?.role === 'RELATIONSHIP_MANAGER';

  const isLendbridgeOrSataraUser =
    Boolean(user?.email && (user.email.toLowerCase().includes('lendbridge') || user.email.toLowerCase().includes('satara'))) ||
    Boolean(user?.name && (user.name.toLowerCase().includes('lendbridge') || user.name.toLowerCase().includes('satara')));

  if ((!branchId || branchId === 'default') && isLendbridgeOrSataraUser) {
    branchId = 'br_satara_01';
  }

  let isCoBranded = 0;
  let coBrandName: string | null = null;
  let coBrandLogoUrl: string | null = null;
  let coBrandTagline: string | null = null;

  if (branchId && branchId !== 'default') {
    try {
      const bRow = db
        .prepare('SELECT id, is_co_branded, co_brand_name, co_brand_logo_url, co_brand_tagline FROM branches WHERE id = ? OR code = ? OR name = ?')
        .get(branchId, branchId, branchId) as {
          id?: string;
          is_co_branded?: number | boolean;
          co_brand_name?: string;
          co_brand_logo_url?: string;
          co_brand_tagline?: string;
        } | undefined;
      if (bRow) {
        if (bRow.id) branchId = bRow.id;
        if (bRow.is_co_branded) {
          isCoBranded = 1;
          coBrandName = bRow.co_brand_name || null;
          coBrandLogoUrl = bRow.co_brand_logo_url || null;
          coBrandTagline = bRow.co_brand_tagline || null;
        }
      }
    } catch {}
  }

  db.prepare(
    `INSERT INTO loan_applications (
      id, tenant_id, token, branch_id, created_by_id, channel_partner_id, channel_partner_name,
      relationship_manager_id, relationship_manager_name, full_name, mobile, email,
      loan_type, loan_amount, status, status_changed_at, is_co_branded, co_brand_name, co_brand_logo_url, co_brand_tagline, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tenantId,
    token,
    branchId,
    data.advisorId,
    isPartner ? user?.id : undefined,
    isPartner ? user?.name : undefined,
    isRM ? user?.id : (user?.assignedRmId || null),
    isRM ? user?.name : (user?.assignedRmName || null),
    data.fullName.trim(),
    data.mobile.trim(),
    data.email ? data.email.trim().toLowerCase() : null,
    data.loanType || 'PERSONAL_LOAN',
    data.loanAmount || 0,
    'LINK_SHARED',
    now,
    isCoBranded,
    coBrandName,
    coBrandLogoUrl,
    coBrandTagline,
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
  let branchId = user?.branchId || 'default';
  const isPartner = user?.role === 'CHANNEL_PARTNER' || user?.role === 'SUB_DSA';
  const isRM = user?.role === 'RELATIONSHIP_MANAGER';
  const status = data.status || 'DOCUMENTS_IN';

  const isLendbridgeOrSataraUser =
    Boolean(user?.email && (user.email.toLowerCase().includes('lendbridge') || user.email.toLowerCase().includes('satara'))) ||
    Boolean(user?.name && (user.name.toLowerCase().includes('lendbridge') || user.name.toLowerCase().includes('satara')));

  if ((!branchId || branchId === 'default') && isLendbridgeOrSataraUser) {
    branchId = 'br_satara_01';
  }

  let isCoBranded = 0;
  let coBrandName: string | null = null;
  let coBrandLogoUrl: string | null = null;
  let coBrandTagline: string | null = null;

  if (branchId && branchId !== 'default') {
    try {
      const bRow = db
        .prepare('SELECT id, is_co_branded, co_brand_name, co_brand_logo_url, co_brand_tagline FROM branches WHERE id = ? OR code = ? OR name = ?')
        .get(branchId, branchId, branchId) as {
          id?: string;
          is_co_branded?: number | boolean;
          co_brand_name?: string;
          co_brand_logo_url?: string;
          co_brand_tagline?: string;
        } | undefined;
      if (bRow) {
        if (bRow.id) branchId = bRow.id;
        if (bRow.is_co_branded) {
          isCoBranded = 1;
          coBrandName = bRow.co_brand_name || null;
          coBrandLogoUrl = bRow.co_brand_logo_url || null;
          coBrandTagline = bRow.co_brand_tagline || null;
        }
      }
    } catch {}
  }

  db.prepare(
    `INSERT INTO loan_applications (
      id, tenant_id, token, branch_id, created_by_id, channel_partner_id, channel_partner_name,
      relationship_manager_id, relationship_manager_name, full_name, mobile, email,
      loan_type, loan_amount, monthly_income, existing_emi, tenure_months, pan_number, aadhaar_number, status, status_changed_at, submitted_at, is_co_branded, co_brand_name, co_brand_logo_url, co_brand_tagline, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    isCoBranded,
    coBrandName,
    coBrandLogoUrl,
    coBrandTagline,
    now,
    now
  );

  const created = getApplicationById(id);
  if (!created) throw new Error('Failed to create direct partner loan application');
  return created;
}

