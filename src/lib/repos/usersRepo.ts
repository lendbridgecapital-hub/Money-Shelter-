import crypto from 'crypto';
import { db } from '@/lib/db';
import { saveBase64Document } from '@/lib/uploads';
import type { User, Role, PartnerStatus } from '@/types/db';

export function listUsers(tenantId = 'default'): User[] {
  const rows = db
    .prepare('SELECT * FROM users WHERE tenant_id = ? ORDER BY created_at DESC')
    .all(tenantId) as Record<string, unknown>[];

  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const seenPans = new Set<string>();
  const seenCodes = new Set<string>();
  const uniqueUsers: User[] = [];

  // Sort rows so approved/certified canonical partner records are preserved over duplicates
  const sortedRows = [...rows].sort((a, b) => {
    if (a.id === 'usr_tejas_subdsa_01') return -1;
    if (b.id === 'usr_tejas_subdsa_01') return 1;
    const aApproved = a.partner_status === 'APPROVED' ? 1 : 0;
    const bApproved = b.partner_status === 'APPROVED' ? 1 : 0;
    if (aApproved !== bApproved) return bApproved - aApproved;
    const aCert = a.certificate_number ? 1 : 0;
    const bCert = b.certificate_number ? 1 : 0;
    if (aCert !== bCert) return bCert - aCert;
    return 0;
  });

  for (const row of sortedRows) {
    const user = mapRowToUser(row);
    // Remove obsolete duplicate alias for Tejas
    if (
      user.id === 'usr_tejas_subdsa_alias' ||
      user.email === 'tejas.subdsa@quickfinsure.com' ||
      (user.id !== 'usr_tejas_subdsa_01' && (user.name || '').toLowerCase().includes('tejas') && (user.role === 'SUB_DSA' || (user.name || '').toLowerCase().includes('sub-dsa')))
    ) {
      continue;
    }

    const id = user.id.toLowerCase().trim();
    const email = (user.email || '').toLowerCase().trim();
    const pan = (user.panNumber || '').toUpperCase().trim();
    const code = (user.partnerCode || '').toUpperCase().trim();

    if (id && seenIds.has(id)) continue;
    if (email && seenEmails.has(email)) continue;
    if (pan && pan.length === 10 && seenPans.has(pan)) continue;
    if (code && seenCodes.has(code)) continue;

    if (id) seenIds.add(id);
    if (email) seenEmails.add(email);
    if (pan && pan.length === 10) seenPans.add(pan);
    if (code) seenCodes.add(code);

    uniqueUsers.push(user);
  }

  return uniqueUsers;
}

export function getUserById(id: string): User | undefined {
  const row = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;

  return row ? mapRowToUser(row) : undefined;
}

export function getUserByEmail(email: string): User | undefined {
  const lower = email.trim().toLowerCase();
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(lower) as Record<string, unknown> | undefined;

  const user = row ? mapRowToUser(row) : undefined;
  if (user && lower.includes('lendbridge') && (!user.branchId || user.branchId === 'default')) {
    try {
      const satara = db
        .prepare('SELECT id, name FROM branches WHERE id = ? OR code = ? OR name LIKE ?')
        .get('br_satara_01', 'STR01', '%Satara%') as { id: string; name: string } | undefined;
      if (satara) {
        db.prepare('UPDATE users SET branch_id = ? WHERE id = ?').run(satara.id, user.id);
        user.branchId = satara.id;
        user.branchName = satara.name;
      }
    } catch {}
  }
  return user;
}

export function isUserDedicatedSiteRm(userOrId: User | string): boolean {
  if (!userOrId) return false;
  const user = typeof userOrId === 'string' ? getUserById(userOrId) : userOrId;
  if (!user || user.role !== 'RELATIONSHIP_MANAGER') return false;

  try {
    const siteRow = db
      .prepare("SELECT COUNT(*) as c FROM branches WHERE type = 'SITE' AND dedicated_rm_id = ?")
      .get(user.id) as { c: number } | undefined;
    if (siteRow && siteRow.c > 0) return true;

    if (user.branchId) {
      const bRow = db
        .prepare('SELECT type FROM branches WHERE id = ?')
        .get(user.branchId) as { type?: string } | undefined;
      if (bRow && bRow.type === 'SITE') return true;
    }
  } catch {}

  return false;
}

export function emailExists(email: string, excludeId?: string): boolean {
  const lower = email.trim().toLowerCase();
  const rows = db.prepare('SELECT id, email FROM users').all() as { id: string; email: string }[];
  return rows.some((u) => u.email.toLowerCase() === lower && (!excludeId || u.id !== excludeId));
}

export function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  branchId: string;
  tenantId?: string;
  phone?: string;
  partnerCode?: string;
  partnerStatus?: PartnerStatus;
  assignedRmId?: string | null;
  assignedRmName?: string | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  commissionRate?: number;
}): User {
  const id = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const email = data.email.trim().toLowerCase();
  const tenantId = data.tenantId || 'default';

  if (data.role === 'CHANNEL_PARTNER' || data.role === 'SUB_DSA') {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const defaultPrefix = data.role === 'SUB_DSA' ? 'MS-SUB' : 'MS-PRT';
    const partnerCode = data.partnerCode || `${defaultPrefix}-${randomSuffix}`;
    const certNum = `MS-CERT-2026-${randomSuffix}`;
    const partnerStatus = data.partnerStatus || 'APPROVED';

    db.prepare(
      `INSERT INTO users (
        id, tenant_id, name, email, password_hash, role, branch_id, phone,
        partner_code, partner_status, pan_number, aadhaar_number, assigned_rm_id,
        assigned_rm_name, parent_sub_dsa_id, parent_sub_dsa_name, certificate_number, certificate_issued_at, approved_at,
        commission_rate, agreement_accepted, active, is_blocked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, ?)`
    ).run(
      id,
      tenantId,
      data.name.trim(),
      email,
      data.passwordHash,
      data.role,
      data.branchId,
      data.phone || null,
      partnerCode,
      partnerStatus,
      data.panNumber ? data.panNumber.trim().toUpperCase() : null,
      data.aadhaarNumber ? data.aadhaarNumber.trim() : null,
      data.assignedRmId || null,
      data.assignedRmName || null,
      (data as any).parentSubDsaId || null,
      (data as any).parentSubDsaName || null,
      certNum,
      now,
      now,
      data.commissionRate !== undefined ? data.commissionRate : null,
      now
    );
  } else {
    db.prepare(
      `INSERT INTO users (id, tenant_id, name, email, password_hash, role, branch_id, phone, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(id, tenantId, data.name.trim(), email, data.passwordHash, data.role, data.branchId, data.phone || null, now);
  }

  const created = getUserById(id);
  if (!created) {
    throw new Error('Failed to create user');
  }
  return created;
}

export function setUserActive(id: string, active: boolean): void {
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
}

export function setUserBlocked(id: string, isBlocked: boolean, reason?: string | null): void {
  db.prepare('UPDATE users SET is_blocked = ?, blocked_reason = ? WHERE id = ?').run(
    isBlocked ? 1 : 0,
    reason || null,
    id
  );
}

export function updatePartnerCommissionRate(id: string, rate: number | null): void {
  const val = rate !== null && rate !== undefined && !isNaN(Number(rate)) ? Number(rate) : null;
  db.prepare('UPDATE users SET commission_rate = ? WHERE id = ?').run(val, id);
}

export function updateUserRoleAndBranch(id: string, role: Role, branchId: string): void {
  db.prepare('UPDATE users SET role = ?, branch_id = ? WHERE id = ?').run(role, branchId, id);
}

export function listPartners(tenantId = 'default'): User[] {
  const users = listUsers(tenantId);
  return users.filter((u) => u.role === 'CHANNEL_PARTNER');
}

export function listSubDsas(tenantId = 'default'): User[] {
  const users = listUsers(tenantId);
  return users.filter((u) => u.role === 'SUB_DSA');
}

export function listAllNetworkPartners(tenantId = 'default'): User[] {
  const users = listUsers(tenantId);
  return users.filter((u) => u.role === 'CHANNEL_PARTNER' || u.role === 'SUB_DSA');
}

export function listPartnersBySubDsa(subDsaId: string, tenantId = 'default'): User[] {
  const users = listUsers(tenantId);
  const subDsaUser = getUserById(subDsaId);
  return users.filter((u) => {
    if (u.parentSubDsaId === subDsaId) return true;
    if (subDsaUser?.partnerCode && u.parentSubDsaId === subDsaUser.partnerCode) return true;
    if (subDsaId === 'usr_tejas_subdsa_01' || subDsaId === 'usr_tejas_subdsa_alias') {
      return (
        u.parentSubDsaId === 'usr_tejas_subdsa_01' ||
        u.parentSubDsaId === 'usr_tejas_subdsa_alias' ||
        Boolean(u.parentSubDsaName && u.parentSubDsaName.toLowerCase().includes('tejas'))
      );
    }
    return false;
  });
}

export function listPartnersByRm(rmId: string, tenantId = 'default'): User[] {
  const partners = listAllNetworkPartners(tenantId);
  return partners.filter((p) => p.assignedRmId === rmId);
}

export function searchRegisteredPartners(query: string, tenantId = 'default'): User[] {
  const partners = listAllNetworkPartners(tenantId).filter((p) => p.active && !p.isBlocked);
  const q = query.trim().toLowerCase();
  if (!q) return partners;
  return partners.filter((p) => {
    const matchName = p.name.toLowerCase().includes(q);
    const matchPhone = p.phone ? p.phone.toLowerCase().includes(q) : false;
    const matchEmail = p.email.toLowerCase().includes(q);
    return matchName || matchPhone || matchEmail;
  });
}

export function getPartnerByCode(code: string): User | undefined {
  const clean = code.trim().toUpperCase();
  const users = listAllNetworkPartners();
  return users.find((u) => (u.partnerCode || '').toUpperCase() === clean);
}

export function listRelationshipManagers(tenantId = 'default'): User[] {
  const users = listUsers(tenantId);
  return users.filter((u) => u.role === 'RELATIONSHIP_MANAGER' && u.active && !u.isBlocked);
}

export function listPartnerRequests(status?: PartnerStatus, tenantId = 'default'): User[] {
  const partners = listAllNetworkPartners(tenantId);
  if (!status) return partners;
  return partners.filter((p) => (p.partnerStatus || 'APPROVED') === status);
}

export function approvePartnerOnboarding(
  partnerId: string,
  assignedRmId: string,
  assignedRmName: string,
  approvedBy: { id: string; name: string },
  remark?: string,
  commissionRate?: number | null
): User {
  const now = new Date().toISOString();
  let existing = getUserById(partnerId);
  if (!existing) {
    const all = listAllNetworkPartners();
    existing = all.find(
      (p) =>
        p.id.toLowerCase() === partnerId.toLowerCase() ||
        (p.email && p.email.toLowerCase() === partnerId.toLowerCase()) ||
        (p.partnerCode && p.partnerCode.toUpperCase() === partnerId.toUpperCase())
    );
  }
  const effectiveId = existing ? existing.id : partnerId;
  const isSubDsa = existing?.role === 'SUB_DSA';
  const certSuffix = Math.floor(1000 + Math.random() * 9000);
  const certNum = isSubDsa ? `QFS-SUB-CERT-2026-${certSuffix}` : `QFS-CERT-2026-${certSuffix}`;

  const commRate =
    commissionRate !== undefined && commissionRate !== null && !isNaN(Number(commissionRate))
      ? Number(commissionRate)
      : existing?.commissionRate !== undefined && existing?.commissionRate !== null
      ? existing.commissionRate
      : null;

  db.prepare(
    `UPDATE users 
     SET partner_status = 'APPROVED',
         assigned_rm_id = ?,
         assigned_rm_name = ?,
         approved_by_id = ?,
         approved_by_name = ?,
         approved_at = ?,
         certificate_number = ?,
         certificate_issued_at = ?,
         approval_remark = ?,
         commission_rate = ?
     WHERE id = ? OR LOWER(email) = ?`
  ).run(
    assignedRmId,
    assignedRmName,
    approvedBy.id,
    approvedBy.name,
    now,
    certNum,
    now,
    remark || 'Application approved by Central Support.',
    commRate,
    effectiveId,
    (existing?.email || '').toLowerCase()
  );

  const updated = getUserById(effectiveId) || (existing?.email ? getUserByEmail(existing.email) : undefined);
  if (!updated) throw new Error('Partner not found');
  return updated;
}

export function requestPartnerDocUpdate(
  partnerId: string,
  remark: string,
  _author: { id: string; name: string }
): User {
  let existing = getUserById(partnerId);
  if (!existing) {
    const all = listAllNetworkPartners();
    existing = all.find(
      (p) =>
        p.id.toLowerCase() === partnerId.toLowerCase() ||
        (p.email && p.email.toLowerCase() === partnerId.toLowerCase()) ||
        (p.partnerCode && p.partnerCode.toUpperCase() === partnerId.toUpperCase())
    );
  }
  const effectiveId = existing ? existing.id : partnerId;

  db.prepare(
    `UPDATE users 
     SET partner_status = 'DOCUMENTS_REQUIRED',
         approval_remark = ?
     WHERE id = ? OR LOWER(email) = ?`
  ).run(remark, effectiveId, (existing?.email || '').toLowerCase());

  const updated = getUserById(effectiveId) || (existing?.email ? getUserByEmail(existing.email) : undefined);
  if (!updated) throw new Error('Partner not found');
  return updated;
}

export function rejectPartnerOnboarding(
  partnerId: string,
  reason: string,
  _author: { id: string; name: string }
): User {
  let existing = getUserById(partnerId);
  if (!existing) {
    const all = listAllNetworkPartners();
    existing = all.find(
      (p) =>
        p.id.toLowerCase() === partnerId.toLowerCase() ||
        (p.email && p.email.toLowerCase() === partnerId.toLowerCase()) ||
        (p.partnerCode && p.partnerCode.toUpperCase() === partnerId.toUpperCase())
    );
  }
  const effectiveId = existing ? existing.id : partnerId;

  db.prepare(
    `UPDATE users 
     SET partner_status = 'REJECTED',
         approval_remark = ?
     WHERE id = ? OR LOWER(email) = ?`
  ).run(reason, effectiveId, (existing?.email || '').toLowerCase());

  const updated = getUserById(effectiveId) || (existing?.email ? getUserByEmail(existing.email) : undefined);
  if (!updated) throw new Error('Partner not found');
  return updated;
}

export function resubmitPartnerDocuments(
  partnerId: string,
  rawPanDocUrl?: string,
  rawAadhaarDocUrl?: string
): User {
  const panDocUrl = rawPanDocUrl ? saveBase64Document(rawPanDocUrl, 'partners', 'pan') : undefined;
  const aadhaarDocUrl = rawAadhaarDocUrl ? saveBase64Document(rawAadhaarDocUrl, 'partners', 'aadhaar') : undefined;

  if (panDocUrl && aadhaarDocUrl) {
    db.prepare(
      `UPDATE users 
       SET partner_status = 'PENDING_APPROVAL',
           pan_document_url = ?,
           aadhaar_document_url = ?,
           approval_remark = 'Updated documents submitted for Central Support re-verification.'
       WHERE id = ?`
    ).run(panDocUrl, aadhaarDocUrl, partnerId);
  } else if (panDocUrl) {
    db.prepare(
      `UPDATE users 
       SET partner_status = 'PENDING_APPROVAL',
           pan_document_url = ?,
           approval_remark = 'Updated PAN document submitted for Central Support re-verification.'
       WHERE id = ?`
    ).run(panDocUrl, partnerId);
  } else if (aadhaarDocUrl) {
    db.prepare(
      `UPDATE users 
       SET partner_status = 'PENDING_APPROVAL',
           aadhaar_document_url = ?,
           approval_remark = 'Updated Aadhaar document submitted for Central Support re-verification.'
       WHERE id = ?`
    ).run(aadhaarDocUrl, partnerId);
  } else {
    db.prepare(
      `UPDATE users 
       SET partner_status = 'PENDING_APPROVAL',
           approval_remark = 'Information re-submitted for Central Support review.'
       WHERE id = ?`
    ).run(partnerId);
  }

  const updated = getUserById(partnerId);
  if (!updated) throw new Error('Partner not found');
  return updated;
}

export function createPartnerOnboarding(data: {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  fatherSpouseName: string;
  address: string;
  panNumber: string;
  panDocumentUrl?: string | null;
  aadhaarNumber: string;
  aadhaarDocumentUrl?: string | null;
  agreementAuthorizedText?: string | null;
  branchId?: string;
  tenantId?: string;
  assignedRmId?: string | null;
  assignedRmName?: string | null;
  role?: 'CHANNEL_PARTNER' | 'SUB_DSA';
  parentSubDsaId?: string | null;
  parentSubDsaName?: string | null;
}): User {
  const id = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const email = data.email.trim().toLowerCase();
  const tenantId = data.tenantId || 'default';
  const branchId = data.branchId || 'br_c95492722e36abe1'; // Default HQ branch
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const targetRole: Role = data.role === 'SUB_DSA' ? 'SUB_DSA' : 'CHANNEL_PARTNER';
  const prefix = targetRole === 'SUB_DSA' ? 'QFS-SUB' : 'QFS-PRT';
  const partnerCode = `${prefix}-${randomSuffix}`;

  // Persist base64 data URLs to disk files to avoid database bloat and payload limits
  const cleanPanDocUrl = saveBase64Document(data.panDocumentUrl, 'partners', 'pan');
  const cleanAadhaarDocUrl = saveBase64Document(data.aadhaarDocumentUrl, 'partners', 'aadhaar');

  db.prepare(
    `INSERT INTO users (
      id, tenant_id, name, email, password_hash, role, branch_id, phone,
      partner_code, partner_status, father_spouse_name, address, pan_number, pan_document_url,
      aadhaar_number, aadhaar_document_url, agreement_accepted, agreement_signed_at,
      agreement_authorized_text, assigned_rm_id, assigned_rm_name, parent_sub_dsa_id, parent_sub_dsa_name, active, is_blocked, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, 0, ?)`
  ).run(
    id,
    tenantId,
    data.name.trim(),
    email,
    data.passwordHash,
    targetRole,
    branchId,
    data.phone.trim(),
    partnerCode,
    data.fatherSpouseName.trim(),
    data.address.trim(),
    data.panNumber.trim().toUpperCase(),
    cleanPanDocUrl || null,
    data.aadhaarNumber.trim(),
    cleanAadhaarDocUrl || null,
    now,
    data.agreementAuthorizedText || null,
    data.assignedRmId || null,
    data.assignedRmName || null,
    data.parentSubDsaId || null,
    data.parentSubDsaName || null,
    now
  );

  const created = getUserById(id);
  if (!created) {
    throw new Error('Failed to create partner account');
  }
  return created;
}

function mapRowToUser(row: Record<string, unknown>): User {
  const role = (row.role as Role) || 'OPERATIONS';
  const rawStatus = (row.partner_status || row.partnerStatus) as PartnerStatus | undefined;
  // Default legacy partners/Sub-DSAs to APPROVED, but preserve PENDING_APPROVAL / DOCUMENTS_REQUIRED / REJECTED
  const partnerStatus: PartnerStatus | undefined =
    role === 'CHANNEL_PARTNER' || role === 'SUB_DSA' ? rawStatus || 'APPROVED' : undefined;

  let branchId = String(row.branch_id || row.branchId || '');
  let branchName = row.branch_name || row.branchName ? String(row.branch_name || row.branchName) : undefined;
  if (branchId) {
    try {
      const bRow = db
        .prepare('SELECT id, name FROM branches WHERE id = ? OR code = ? OR name = ?')
        .get(branchId, branchId, branchId) as { id?: string; name?: string } | undefined;
      if (bRow) {
        if (bRow.id) branchId = bRow.id;
        if (!branchName && bRow.name) branchName = String(bRow.name);
      }
    } catch {}
  }

  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || row.tenantId || 'default'),
    name: String(row.name),
    email: String(row.email),
    passwordHash: String(row.password_hash || row.passwordHash || ''),
    role,
    branchId,
    branchName,
    active: row.active !== 0 && row.active !== false && row.active !== '0',
    isBlocked: Boolean(row.is_blocked === 1 || row.is_blocked === true || row.isBlocked === true),
    blockedReason: row.blocked_reason || row.blockedReason ? String(row.blocked_reason || row.blockedReason) : null,
    phone: row.phone ? String(row.phone) : null,
    commissionRate: row.commission_rate !== undefined ? Number(row.commission_rate) : (row.commissionRate !== undefined ? Number(row.commissionRate) : undefined),
    partnerCode: row.partner_code || row.partnerCode ? String(row.partner_code || row.partnerCode) : undefined,
    partnerStatus,
    fatherSpouseName: row.father_spouse_name || row.fatherSpouseName ? String(row.father_spouse_name || row.fatherSpouseName) : null,
    address: row.address ? String(row.address) : null,
    panNumber: row.pan_number || row.panNumber ? String(row.pan_number || row.panNumber) : null,
    panDocumentUrl: row.pan_document_url || row.panDocumentUrl ? String(row.pan_document_url || row.panDocumentUrl) : null,
    aadhaarNumber: row.aadhaar_number || row.aadhaarNumber ? String(row.aadhaar_number || row.aadhaarNumber) : null,
    aadhaarDocumentUrl: row.aadhaar_document_url || row.aadhaarDocumentUrl ? String(row.aadhaar_document_url || row.aadhaarDocumentUrl) : null,
    agreementAccepted: Boolean(row.agreement_accepted === 1 || row.agreement_accepted === true || row.agreementAccepted === true),
    agreementSignedAt: row.agreement_signed_at || row.agreementSignedAt ? String(row.agreement_signed_at || row.agreementSignedAt) : null,
    agreementAuthorizedText: row.agreement_authorized_text || row.agreementAuthorizedText ? String(row.agreement_authorized_text || row.agreementAuthorizedText) : null,
    assignedRmId: row.assigned_rm_id || row.assignedRmId ? String(row.assigned_rm_id || row.assignedRmId) : null,
    assignedRmName: row.assigned_rm_name || row.assignedRmName ? String(row.assigned_rm_name || row.assignedRmName) : null,
    parentSubDsaId: row.parent_sub_dsa_id || row.parentSubDsaId ? String(row.parent_sub_dsa_id || row.parentSubDsaId) : null,
    parentSubDsaName: row.parent_sub_dsa_name || row.parentSubDsaName ? String(row.parent_sub_dsa_name || row.parentSubDsaName) : null,
    approvalRemark: row.approval_remark || row.approvalRemark ? String(row.approval_remark || row.approvalRemark) : null,
    approvedAt: row.approved_at || row.approvedAt ? String(row.approved_at || row.approvedAt) : null,
    approvedById: row.approved_by_id || row.approvedById ? String(row.approved_by_id || row.approvedById) : null,
    approvedByName: row.approved_by_name || row.approvedByName ? String(row.approved_by_name || row.approvedByName) : null,
    certificateNumber: row.certificate_number || row.certificateNumber ? String(row.certificate_number || row.certificateNumber) : null,
    certificateIssuedAt: row.certificate_issued_at || row.certificateIssuedAt ? String(row.certificate_issued_at || row.certificateIssuedAt) : null,
    photoUrl: row.photo_url || row.photoUrl ? String(row.photo_url || row.photoUrl) : null,
    firmLogoUrl: row.firm_logo_url || row.firmLogoUrl ? String(row.firm_logo_url || row.firmLogoUrl) : null,
    firmName: row.firm_name || row.firmName ? String(row.firm_name || row.firmName) : null,
    bio: row.bio ? String(row.bio) : null,
    city: row.city ? String(row.city) : null,
    createdAt: String(row.created_at || row.createdAt || ''),
  };
}

export function updateUserProfile(
  id: string,
  data: {
    name?: string;
    phone?: string | null;
    email?: string;
    photoUrl?: string | null;
    firmLogoUrl?: string | null;
    firmName?: string | null;
    bio?: string | null;
    city?: string | null;
  }
): User {
  const existing = getUserById(id);
  if (!existing) {
    throw new Error('User not found');
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name.trim());
  }
  if (data.phone !== undefined) {
    updates.push('phone = ?');
    params.push(data.phone ? data.phone.trim() : null);
  }
  if (data.email !== undefined) {
    updates.push('email = ?');
    params.push(data.email.trim().toLowerCase());
  }
  if (data.photoUrl !== undefined) {
    updates.push('photo_url = ?');
    params.push(data.photoUrl);
  }
  if (data.firmLogoUrl !== undefined) {
    updates.push('firm_logo_url = ?');
    params.push(data.firmLogoUrl);
  }
  if (data.firmName !== undefined) {
    updates.push('firm_name = ?');
    params.push(data.firmName ? data.firmName.trim() : null);
  }
  if (data.bio !== undefined) {
    updates.push('bio = ?');
    params.push(data.bio ? data.bio.trim() : null);
  }
  if (data.city !== undefined) {
    updates.push('city = ?');
    params.push(data.city ? data.city.trim() : null);
  }

  if (updates.length > 0) {
    params.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = getUserById(id);
  if (!updated) throw new Error('User not found after update');
  return updated;
}

