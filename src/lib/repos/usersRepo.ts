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
    if (a.id === 'usr_tejas_subdsa_alias') return 1;
    if (b.id === 'usr_tejas_subdsa_alias') return -1;
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
      user.email === 'tejas.subdsa@quickfinsure.com'
    ) {
      continue;
    }

    const id = user.id.toLowerCase().trim();
    const email = (user.email || '').toLowerCase().trim();

    if (id && seenIds.has(id)) continue;
    if (email && seenEmails.has(email)) continue;

    if (id) seenIds.add(id);
    if (email) seenEmails.add(email);

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

export function getUserByPhone(phone: string): User | undefined {
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
  if (!cleanPhone) return undefined;
  // Match exact phone, or last 10 digits
  const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
  
  const allUsers = listUsers();
  const matched = allUsers.find((u) => {
    if (!u.phone) return false;
    const uClean = u.phone.trim().replace(/[^0-9]/g, '');
    return uClean === cleanPhone || (uClean.length >= 10 && uClean.slice(-10) === last10);
  });
  return matched;
}

export function getUserByUsernameOrPhoneOrEmail(identifier: string): User | undefined {
  const trimmed = identifier.trim();
  if (!trimmed) return undefined;

  // 1. If it has digits and looks like a phone number (e.g. 10 digits, +91, etc.)
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  if (digitsOnly.length >= 10) {
    const byPhone = getUserByPhone(trimmed);
    if (byPhone) return byPhone;
  }

  // 2. Try email
  if (trimmed.includes('@')) {
    const byEmail = getUserByEmail(trimmed);
    if (byEmail) return byEmail;
  }

  // 3. Fallback: try by email first anyway
  const byEmail = getUserByEmail(trimmed);
  if (byEmail) return byEmail;

  // 4. Try partner code (e.g. LBC-STR-xxx, MS-PNE-xxx)
  const byCode = getPartnerByCode(trimmed);
  if (byCode) return byCode;

  // 5. Try phone lookup with any digits
  if (digitsOnly.length > 0) {
    const byPhone = getUserByPhone(digitsOnly);
    if (byPhone) return byPhone;
  }

  return undefined;
}

export function updateUserPassword(id: string, newPasswordHash: string): void {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, id);
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
    const partnerCode = data.partnerCode || generatePartnerCode(data.role, data.branchId);
    const certNum = generateCertificateNumber(data.role, data.branchId);
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

export function generatePartnerCode(
  role: 'SUB_DSA' | 'CHANNEL_PARTNER' | Role,
  branchIdOrHint?: string | null
): string {
  const isSubDsa = role === 'SUB_DSA';
  const roleTag = isSubDsa ? 'SUB' : 'PRT';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  const hint = (branchIdOrHint || '').toLowerCase().trim();

  // 1. Satara Branch -> LBC-STR
  if (
    hint === 'br_satara_01' ||
    hint === 'str01' ||
    hint.includes('satara') ||
    hint.includes('lendbridge')
  ) {
    return `LBC-STR-${roleTag}-${randomSuffix}`;
  }

  // 2. Nashik / Nasik Branch -> MS-NSK
  if (
    hint === 'br_nashik_01' ||
    hint === 'nsk01' ||
    hint.includes('nashik') ||
    hint.includes('nasik') ||
    hint.includes('nsk')
  ) {
    return `MS-NSK-${roleTag}-${randomSuffix}`;
  }

  // 3. Pune Branch -> MS-PNE
  if (
    hint === 'br_c95492722e36abe1' ||
    hint === 'pun01' ||
    hint.includes('pune') ||
    hint.includes('bavdhan')
  ) {
    return `MS-PNE-${roleTag}-${randomSuffix}`;
  }

  // 4. Mumbai Branch -> MS-MUM
  if (
    hint === 'br_3eb0a6c7ae0b095e' ||
    hint === 'mum01' ||
    hint.includes('mumbai') ||
    hint.includes('andheri')
  ) {
    return `MS-MUM-${roleTag}-${randomSuffix}`;
  }

  // 5. Default -> MS-PNE
  return `MS-PNE-${roleTag}-${randomSuffix}`;
}

export function generateCertificateNumber(
  role: 'SUB_DSA' | 'CHANNEL_PARTNER' | Role,
  branchIdOrHint?: string | null
): string {
  const isSubDsa = role === 'SUB_DSA';
  const roleTag = isSubDsa ? 'SUB-CERT' : 'CERT';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  const hint = (branchIdOrHint || '').toLowerCase().trim();

  if (
    hint === 'br_satara_01' ||
    hint === 'str01' ||
    hint.includes('satara') ||
    hint.includes('lendbridge')
  ) {
    return `LBC-STR-${roleTag}-2026-${randomSuffix}`;
  }

  if (
    hint === 'br_nashik_01' ||
    hint === 'nsk01' ||
    hint.includes('nashik') ||
    hint.includes('nasik') ||
    hint.includes('nsk')
  ) {
    return `MS-NSK-${roleTag}-2026-${randomSuffix}`;
  }

  if (
    hint === 'br_c95492722e36abe1' ||
    hint === 'pun01' ||
    hint.includes('pune') ||
    hint.includes('bavdhan')
  ) {
    return `MS-PNE-${roleTag}-2026-${randomSuffix}`;
  }

  return `MS-PNE-${roleTag}-2026-${randomSuffix}`;
}

export function getPartnerByCode(code: string): User | undefined {
  if (!code) return undefined;
  const clean = code.trim().toUpperCase();
  const users = listAllNetworkPartners();

  // Direct exact match
  const direct = users.find((u) => (u.partnerCode || '').toUpperCase() === clean);
  if (direct) return direct;

  // Cross-compatibility for Tejas Ghorpade
  if (
    clean === 'QFS-SUB-9796' ||
    clean === 'LBC-STR-SUB-9796' ||
    clean === 'LBC-STR-9796' ||
    clean === '9796' ||
    clean.includes('9796') ||
    clean.includes('GHORPADE')
  ) {
    const tejas = users.find(
      (u) =>
        u.id === 'usr_tejas_ghorpade_satara_01' ||
        (u.partnerCode && (u.partnerCode.includes('9796') || u.partnerCode.includes('LBC-STR') || u.partnerCode.includes('QFS-SUB'))) ||
        (u.email && u.email.toLowerCase() === 'ghorpadets@gmail.com') ||
        (u.name && u.name.toLowerCase().includes('ghorpade'))
    );
    if (tejas) return tejas;
  }

  // Suffix matching (e.g. 4-digit code matching)
  const numMatch = clean.match(/(\d{4})$/);
  if (numMatch) {
    const num = numMatch[1];
    const match = users.find((u) => u.partnerCode && u.partnerCode.endsWith(num));
    if (match) return match;
  }

  return undefined;
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
  const certNum = generateCertificateNumber(existing?.role || 'CHANNEL_PARTNER', existing?.branchId || existing?.branchName);

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

export function updatePartnerKycDocuments(
  partnerId: string,
  rawPanDocUrl?: string,
  rawAadhaarDocUrl?: string
): User {
  const panDocUrl = rawPanDocUrl ? saveBase64Document(rawPanDocUrl, 'partners', 'pan') : undefined;
  const aadhaarDocUrl = rawAadhaarDocUrl ? saveBase64Document(rawAadhaarDocUrl, 'partners', 'aadhaar') : undefined;

  if (panDocUrl && aadhaarDocUrl) {
    db.prepare('UPDATE users SET pan_document_url = ?, aadhaar_document_url = ? WHERE id = ?').run(panDocUrl, aadhaarDocUrl, partnerId);
  } else if (panDocUrl) {
    db.prepare('UPDATE users SET pan_document_url = ? WHERE id = ?').run(panDocUrl, partnerId);
  } else if (aadhaarDocUrl) {
    db.prepare('UPDATE users SET aadhaar_document_url = ? WHERE id = ?').run(aadhaarDocUrl, partnerId);
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
  let branchId = data.branchId || 'br_c95492722e36abe1'; // Default HQ branch
  const isLendbridgeSatara = Boolean(
    data.branchId === 'br_satara_01' ||
    data.branchId?.toLowerCase().includes('satara') ||
    data.branchId?.toLowerCase().includes('lendbridge') ||
    data.branchId?.toUpperCase() === 'STR01' ||
    data.agreementAuthorizedText?.toLowerCase().includes('lendbridge') ||
    data.agreementAuthorizedText?.toLowerCase().includes('satara') ||
    data.email.toLowerCase().includes('satara') ||
    data.email.toLowerCase().includes('lendbridge')
  );

  if (isLendbridgeSatara) {
    branchId = 'br_satara_01';
  }
  const targetRole: Role = data.role === 'SUB_DSA' ? 'SUB_DSA' : 'CHANNEL_PARTNER';
  const partnerCode = generatePartnerCode(targetRole, branchId || data.address);

  // Persist base64 data URLs to disk files to avoid database bloat and payload limits
  const cleanPanDocUrl = saveBase64Document(data.panDocumentUrl, 'partners', 'pan');
  const cleanAadhaarDocUrl = saveBase64Document(data.aadhaarDocumentUrl, 'partners', 'aadhaar');

  const existingPending = getUserByEmail(email);
  if (existingPending && (existingPending.partnerStatus === 'PENDING_APPROVAL' || existingPending.role === targetRole)) {
    try {
      db.prepare(
        `UPDATE users SET
          name = ?,
          password_hash = ?,
          role = ?,
          branch_id = ?,
          phone = ?,
          father_spouse_name = ?,
          address = ?,
          pan_number = ?,
          pan_document_url = COALESCE(?, pan_document_url),
          aadhaar_number = ?,
          aadhaar_document_url = COALESCE(?, aadhaar_document_url),
          agreement_accepted = 1,
          agreement_signed_at = ?,
          agreement_authorized_text = ?,
          assigned_rm_id = ?,
          assigned_rm_name = ?,
          parent_sub_dsa_id = ?,
          parent_sub_dsa_name = ?,
          created_at = COALESCE(created_at, ?),
          updated_at = ?
        WHERE id = ?`
      ).run(
        data.name.trim(),
        data.passwordHash,
        targetRole,
        branchId,
        data.phone.trim(),
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
        now,
        now,
        existingPending.id
      );
    } catch (updateErr) {
      console.warn('[usersRepo] UPDATE pending user failed, proceeding with object:', updateErr);
    }

    const updated = getUserById(existingPending.id);
    return updated || {
      ...existingPending,
      name: data.name.trim(),
      phone: data.phone.trim(),
      partnerCode: existingPending.partnerCode || partnerCode,
      partnerStatus: 'PENDING_APPROVAL',
      agreementAccepted: true,
      agreementSignedAt: now,
      agreementAuthorizedText: data.agreementAuthorizedText || null,
      createdAt: existingPending.createdAt || now,
      updatedAt: now,
    };
  }

  try {
    db.prepare(
      `INSERT INTO users (
        id, tenant_id, name, email, password_hash, role, branch_id, phone,
        partner_code, partner_status, father_spouse_name, address, pan_number, pan_document_url,
        aadhaar_number, aadhaar_document_url, agreement_accepted, agreement_signed_at,
        agreement_authorized_text, assigned_rm_id, assigned_rm_name, parent_sub_dsa_id, parent_sub_dsa_name, active, is_blocked, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`
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
      now,
      now
    );
  } catch (dbErr) {
    console.error('[usersRepo] INSERT INTO users failed:', dbErr);
    throw new Error(dbErr instanceof Error ? dbErr.message : 'Database error while saving partner record');
  }

  const created = getUserById(id);
  if (created) {
    return created;
  }

  // Guaranteed fallback: return newly constructed user record if immediate read was un-synced
  return {
    id,
    tenantId,
    name: data.name.trim(),
    email,
    passwordHash: data.passwordHash,
    role: targetRole,
    branchId,
    phone: data.phone.trim(),
    partnerCode,
    partnerStatus: 'PENDING_APPROVAL',
    fatherSpouseName: data.fatherSpouseName.trim(),
    address: data.address.trim(),
    panNumber: data.panNumber.trim().toUpperCase(),
    panDocumentUrl: cleanPanDocUrl || null,
    aadhaarNumber: data.aadhaarNumber.trim(),
    aadhaarDocumentUrl: cleanAadhaarDocUrl || null,
    agreementAccepted: true,
    agreementSignedAt: now,
    agreementAuthorizedText: data.agreementAuthorizedText || null,
    assignedRmId: data.assignedRmId || null,
    assignedRmName: data.assignedRmName || null,
    parentSubDsaId: data.parentSubDsaId || null,
    parentSubDsaName: data.parentSubDsaName || null,
    active: true,
    isBlocked: false,
    createdAt: now,
    updatedAt: now,
  };
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
    createdAt: String(row.created_at || row.createdAt || row.agreement_signed_at || row.agreementSignedAt || new Date().toISOString()),
    updatedAt: row.updated_at || row.updatedAt ? String(row.updated_at || row.updatedAt) : null,
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

