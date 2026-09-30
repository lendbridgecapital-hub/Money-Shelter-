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
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  tenantId?: string;
}): Branch {
  const id = `br_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';
  const code = data.code.trim().toUpperCase();

  db.prepare(
    `INSERT INTO branches (id, tenant_id, name, code, address, phone, email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, tenantId, data.name.trim(), code, data.address || null, data.phone || null, data.email || null, now, now);

  return {
    id,
    tenantId,
    name: data.name.trim(),
    code,
    address: data.address || null,
    phone: data.phone || null,
    email: data.email || null,
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
    address: row.address ? String(row.address) : null,
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    createdAt: String(row.created_at || row.createdAt || ''),
    updatedAt: String(row.updated_at || row.updatedAt || ''),
  };
}
