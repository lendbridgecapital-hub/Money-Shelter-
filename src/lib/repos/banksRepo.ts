import crypto from 'crypto';
import { db } from '@/lib/db';
import type { Bank } from '@/types/db';

export function listBanks(tenantId = 'default'): Bank[] {
  const rows = db
    .prepare('SELECT * FROM banks WHERE tenant_id = ? ORDER BY name ASC')
    .all(tenantId) as Record<string, unknown>[];

  return rows.map(mapRowToBank);
}

export function getBankById(id: string): Bank | undefined {
  const row = db
    .prepare('SELECT * FROM banks WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;

  return row ? mapRowToBank(row) : undefined;
}

export function createBank(data: {
  name: string;
  code: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  commissionPct?: number;
  tenantId?: string;
}): Bank {
  const id = `bnk_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';
  const commission = data.commissionPct !== undefined ? data.commissionPct : 1.0; // default 1%

  db.prepare(
    `INSERT INTO banks (id, tenant_id, name, code, contact_person, email, phone, commission_pct, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(
    id,
    tenantId,
    data.name.trim(),
    data.code.trim().toUpperCase(),
    data.contactPerson || null,
    data.email || null,
    data.phone || null,
    commission,
    now,
    now
  );

  return {
    id,
    tenantId,
    name: data.name.trim(),
    code: data.code.trim().toUpperCase(),
    contactPerson: data.contactPerson || null,
    email: data.email || null,
    phone: data.phone || null,
    commissionPct: commission,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateBank(id: string, data: Partial<Bank>): void {
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
  if (data.contactPerson !== undefined) {
    updates.push('contact_person = ?');
    params.push(data.contactPerson || null);
  }
  if (data.email !== undefined) {
    updates.push('email = ?');
    params.push(data.email || null);
  }
  if (data.phone !== undefined) {
    updates.push('phone = ?');
    params.push(data.phone || null);
  }
  if (data.commissionPct !== undefined) {
    updates.push('commission_pct = ?');
    params.push(data.commissionPct);
  }
  if (data.active !== undefined) {
    updates.push('active = ?');
    params.push(data.active ? 1 : 0);
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());

  params.push(id);

  db.prepare(`UPDATE banks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteBank(id: string): void {
  db.prepare('DELETE FROM banks WHERE id = ?').run(id);
}

function mapRowToBank(row: Record<string, unknown>): Bank {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || row.tenantId || 'default'),
    name: String(row.name),
    code: String(row.code),
    contactPerson: row.contact_person || row.contactPerson ? String(row.contact_person || row.contactPerson) : null,
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    commissionPct: row.commission_pct !== undefined ? Number(row.commission_pct) : 1.0,
    active: row.active !== 0 && row.active !== false && row.active !== '0',
    createdAt: String(row.created_at || row.createdAt || ''),
    updatedAt: String(row.updated_at || row.updatedAt || ''),
  };
}
