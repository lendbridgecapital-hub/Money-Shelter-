import crypto from 'crypto';
import { db } from '@/lib/db';
import type { Branch, BranchWithCounts } from '@/types/db';

export function listBranches(tenantId = 'default'): Branch[] {
  const rows = db
    .prepare('SELECT * FROM branches WHERE tenant_id = ? ORDER BY name ASC')
    .all(tenantId) as Record<string, unknown>[];

  return rows.map(mapRowToBranch);
}

export function listBranchesWithCounts(tenantId = 'default'): BranchWithCounts[] {
  const branches = listBranches(tenantId);
  return branches.map((b) => {
    const userCountRow = db
      .prepare('SELECT COUNT(*) as c FROM users WHERE branch_id = ?')
      .get(b.id) as { c: number } | undefined;

    const appCountRow = db
      .prepare('SELECT COUNT(*) as c FROM loan_applications WHERE branch_id = ?')
      .get(b.id) as { c: number } | undefined;

    return {
      ...b,
      userCount: userCountRow ? Number(userCountRow.c) : 0,
      applicationCount: appCountRow ? Number(appCountRow.c) : 0,
    };
  });
}

export function getBranchById(id: string): Branch | undefined {
  const row = db
    .prepare('SELECT * FROM branches WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;

  return row ? mapRowToBranch(row) : undefined;
}

export function getBranchByCodeOrSlug(identifier: string, tenantId = 'default'): Branch | undefined {
  if (!identifier) return undefined;
  const clean = identifier.trim().toLowerCase();
  const branches = listBranches(tenantId);
  return branches.find((b) =>
    b.code.toLowerCase() === clean ||
    b.id.toLowerCase() === clean ||
    b.name.toLowerCase() === clean ||
    b.name.toLowerCase().replace(/\s+/g, '-') === clean ||
    (b.coBrandName && b.coBrandName.toLowerCase() === clean) ||
    (b.coBrandName && b.coBrandName.toLowerCase().replace(/\s+/g, '-') === clean)
  );
}

export function branchCodeExists(code: string, excludeId?: string): boolean {
  const upper = code.trim().toUpperCase();
  const rows = db
    .prepare('SELECT id, code FROM branches')
    .all() as { id: string; code: string }[];

  return rows.some(
    (r) => r.code.toUpperCase() === upper && (!excludeId || r.id !== excludeId)
  );
}

export function createBranch(data: {
  name: string;
  code: string;
  type?: Branch['type'];
  mappedBranchId?: string | null;
  mappedBranchName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  dedicatedRmId?: string | null;
  dedicatedRmName?: string | null;
  developerName?: string | null;
  isCoBranded?: boolean;
  coBrandName?: string | null;
  coBrandLogoUrl?: string | null;
  coBrandTagline?: string | null;
  tenantId?: string;
}): Branch {
  const isSite = data.type === 'SITE';
  const id = isSite ? `site_${crypto.randomBytes(8).toString('hex')}` : `br_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';
  const code = data.code.trim().toUpperCase();
  const type = data.type || 'BRANCH';
  const isCoBranded = Boolean(data.isCoBranded);
  const coBrandName = data.coBrandName ? data.coBrandName.trim() : null;
  const coBrandLogoUrl = data.coBrandLogoUrl ? data.coBrandLogoUrl.trim() : null;
  const coBrandTagline = data.coBrandTagline ? data.coBrandTagline.trim() : null;

  let mappedBranchId = data.mappedBranchId || null;
  let mappedBranchName = data.mappedBranchName || null;
  if (mappedBranchId && !mappedBranchName) {
    const parentBranch = getBranchById(mappedBranchId);
    if (parentBranch) {
      mappedBranchName = parentBranch.name;
    }
  }

  db.prepare(
    `INSERT INTO branches (
      id, tenant_id, name, code, type, mapped_branch_id, mapped_branch_name, address, phone, email,
      dedicated_rm_id, dedicated_rm_name, developer_name, is_co_branded, co_brand_name, co_brand_logo_url, co_brand_tagline, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tenantId,
    data.name.trim(),
    code,
    type,
    mappedBranchId,
    mappedBranchName,
    data.address || null,
    data.phone || null,
    data.email || null,
    data.dedicatedRmId || null,
    data.dedicatedRmName || null,
    data.developerName || null,
    isCoBranded ? 1 : 0,
    coBrandName,
    coBrandLogoUrl,
    coBrandTagline,
    now,
    now
  );

  return {
    id,
    tenantId,
    name: data.name.trim(),
    code,
    type,
    mappedBranchId,
    mappedBranchName,
    address: data.address || null,
    phone: data.phone || null,
    email: data.email || null,
    dedicatedRmId: data.dedicatedRmId || null,
    dedicatedRmName: data.dedicatedRmName || null,
    developerName: data.developerName || null,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateBranch(id: string, data: Partial<Branch>): void {
  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name.trim());
  }
  if (data.code !== undefined) {
    updates.push('code = ?');
    params.push(data.code.trim().toUpperCase());
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    params.push(data.type);
  }
  if (data.mappedBranchId !== undefined) {
    updates.push('mapped_branch_id = ?');
    params.push(data.mappedBranchId || null);

    if (data.mappedBranchName !== undefined) {
      updates.push('mapped_branch_name = ?');
      params.push(data.mappedBranchName || null);
    } else if (data.mappedBranchId) {
      const parentBranch = getBranchById(data.mappedBranchId);
      updates.push('mapped_branch_name = ?');
      params.push(parentBranch?.name || null);
    } else {
      updates.push('mapped_branch_name = ?');
      params.push(null);
    }
  }
  if (data.address !== undefined) {
    updates.push('address = ?');
    params.push(data.address || null);
  }
  if (data.phone !== undefined) {
    updates.push('phone = ?');
    params.push(data.phone || null);
  }
  if (data.email !== undefined) {
    updates.push('email = ?');
    params.push(data.email || null);
  }
  if (data.dedicatedRmId !== undefined) {
    updates.push('dedicated_rm_id = ?');
    params.push(data.dedicatedRmId || null);
  }
  if (data.dedicatedRmName !== undefined) {
    updates.push('dedicated_rm_name = ?');
    params.push(data.dedicatedRmName || null);
  }
  if (data.developerName !== undefined) {
    updates.push('developer_name = ?');
    params.push(data.developerName || null);
  }
  if (data.isCoBranded !== undefined) {
    updates.push('is_co_branded = ?');
    params.push(data.isCoBranded ? 1 : 0);
  }
  if (data.coBrandName !== undefined) {
    updates.push('co_brand_name = ?');
    params.push(data.coBrandName ? data.coBrandName.trim() : null);
  }
  if (data.coBrandLogoUrl !== undefined) {
    updates.push('co_brand_logo_url = ?');
    params.push(data.coBrandLogoUrl ? data.coBrandLogoUrl.trim() : null);
  }
  if (data.coBrandTagline !== undefined) {
    updates.push('co_brand_tagline = ?');
    params.push(data.coBrandTagline ? data.coBrandTagline.trim() : null);
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());

  params.push(id);

  db.prepare(`UPDATE branches SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteBranch(id: string): void {
  // Check if branch has users or applications
  const users = db.prepare('SELECT COUNT(*) as c FROM users WHERE branch_id = ?').get(id) as { c: number };
  if (users && users.c > 0) {
    throw new Error('BRANCH_IN_USE');
  }

  const apps = db.prepare('SELECT COUNT(*) as c FROM loan_applications WHERE branch_id = ?').get(id) as { c: number };
  if (apps && apps.c > 0) {
    throw new Error('BRANCH_IN_USE');
  }

  db.prepare('DELETE FROM branches WHERE id = ?').run(id);
}

function mapRowToBranch(row: Record<string, unknown>): Branch {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || row.tenantId || 'default'),
    name: String(row.name),
    code: String(row.code),
    type: (row.type as Branch['type']) || 'BRANCH',
    mappedBranchId: row.mapped_branch_id || row.mappedBranchId ? String(row.mapped_branch_id || row.mappedBranchId) : null,
    mappedBranchName: row.mapped_branch_name || row.mappedBranchName ? String(row.mapped_branch_name || row.mappedBranchName) : null,
    address: row.address ? String(row.address) : null,
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    dedicatedRmId: row.dedicated_rm_id || row.dedicatedRmId ? String(row.dedicated_rm_id || row.dedicatedRmId) : null,
    dedicatedRmName: row.dedicated_rm_name || row.dedicatedRmName ? String(row.dedicated_rm_name || row.dedicatedRmName) : null,
    developerName: row.developer_name || row.developerName ? String(row.developer_name || row.developerName) : null,
    isCoBranded: Boolean(row.is_co_branded || row.isCoBranded),
    coBrandName: row.co_brand_name || row.coBrandName ? String(row.co_brand_name || row.coBrandName) : null,
    coBrandLogoUrl: row.co_brand_logo_url || row.coBrandLogoUrl ? String(row.co_brand_logo_url || row.coBrandLogoUrl) : null,
    coBrandTagline: row.co_brand_tagline || row.coBrandTagline ? String(row.co_brand_tagline || row.coBrandTagline) : null,
    createdAt: String(row.created_at || row.createdAt || ''),
    updatedAt: String(row.updated_at || row.updatedAt || ''),
  };
}
