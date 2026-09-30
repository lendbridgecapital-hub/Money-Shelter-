import crypto from 'crypto';
import { db } from '@/lib/db';
import type { BankProduct, User } from '@/types/db';
import { listPartnersByRm } from '@/lib/repos/usersRepo';

export function listBankProducts(tenantId = 'default', currentUser?: User | null): BankProduct[] {
  const rows = db
    .prepare('SELECT * FROM bank_products WHERE tenant_id = ? ORDER BY created_at DESC')
    .all(tenantId) as Record<string, unknown>[];

  const products = rows.map(mapRowToBankProduct);

  // If a Channel Partner is viewing, show universal cards PLUS their dedicated cards only
  if (currentUser && currentUser.role === 'CHANNEL_PARTNER') {
    return products.filter(
      (p) => !p.dedicatedPartnerId || p.dedicatedPartnerId === currentUser.id
    );
  }

  // If an RM is viewing, show universal cards PLUS dedicated cards for their assigned partners only
  if (currentUser && currentUser.role === 'RELATIONSHIP_MANAGER') {
    const rmPartners = listPartnersByRm(currentUser.id, tenantId);
    const assignedIds = new Set(rmPartners.map((p) => p.id));
    return products.filter(
      (p) => !p.dedicatedPartnerId || assignedIds.has(p.dedicatedPartnerId)
    );
  }

  return products;
}

export function getBankProductById(id: string): BankProduct | undefined {
  const row = db
    .prepare('SELECT * FROM bank_products WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;

  return row ? mapRowToBankProduct(row) : undefined;
}

export function createBankProduct(data: {
  tenantId?: string;
  productName: string;
  banks: string[];
  baseRate: number;
  partnerRate: number;
  dedicatedPartnerId?: string | null;
  dedicatedPartnerName?: string | null;
  dedicatedPartnerMobile?: string | null;
  notes?: string | null;
}): BankProduct {
  const id = `lprod_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';
  const banksJson = JSON.stringify(data.banks || []);

  db.prepare(
    `INSERT INTO bank_products (
      id, tenant_id, product_name, banks, base_rate, partner_rate,
      dedicated_partner_id, dedicated_partner_name, dedicated_partner_mobile,
      notes, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(
    id,
    tenantId,
    data.productName.trim(),
    banksJson,
    Number(data.baseRate) || 0,
    Number(data.partnerRate) || 0,
    data.dedicatedPartnerId || null,
    data.dedicatedPartnerName || null,
    data.dedicatedPartnerMobile || null,
    data.notes || null,
    now,
    now
  );

  const created = getBankProductById(id);
  if (!created) {
    throw new Error('Failed to create bank product');
  }
  return created;
}

export function updateBankProduct(
  id: string,
  data: Partial<Omit<BankProduct, 'id' | 'createdAt'>>
): void {
  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.productName !== undefined) {
    updates.push('product_name = ?');
    params.push(data.productName.trim());
  }
  if (data.banks !== undefined) {
    updates.push('banks = ?');
    params.push(JSON.stringify(data.banks));
  }
  if (data.baseRate !== undefined) {
    updates.push('base_rate = ?');
    params.push(Number(data.baseRate));
  }
  if (data.partnerRate !== undefined) {
    updates.push('partner_rate = ?');
    params.push(Number(data.partnerRate));
  }
  if (data.dedicatedPartnerId !== undefined) {
    updates.push('dedicated_partner_id = ?');
    params.push(data.dedicatedPartnerId || null);
  }
  if (data.dedicatedPartnerName !== undefined) {
    updates.push('dedicated_partner_name = ?');
    params.push(data.dedicatedPartnerName || null);
  }
  if (data.dedicatedPartnerMobile !== undefined) {
    updates.push('dedicated_partner_mobile = ?');
    params.push(data.dedicatedPartnerMobile || null);
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?');
    params.push(data.notes || null);
  }
  if (data.active !== undefined) {
    updates.push('active = ?');
    params.push(data.active ? 1 : 0);
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());

  params.push(id);

  db.prepare(`UPDATE bank_products SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteBankProduct(id: string): void {
  db.prepare('DELETE FROM bank_products WHERE id = ?').run(id);
}

export function toggleBankProductStatus(id: string, active: boolean): void {
  db.prepare('UPDATE bank_products SET active = ?, updated_at = ? WHERE id = ?').run(
    active ? 1 : 0,
    new Date().toISOString(),
    id
  );
}

function mapRowToBankProduct(row: Record<string, unknown>): BankProduct {
  let banks: string[] = [];
  if (Array.isArray(row.banks)) {
    banks = row.banks as string[];
  } else if (typeof row.banks === 'string') {
    try {
      banks = JSON.parse(row.banks);
    } catch {
      banks = row.banks.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || row.tenantId || 'default'),
    productName: String(row.product_name || row.productName || 'Loan'),
    banks,
    baseRate: Number(row.base_rate !== undefined ? row.base_rate : (row.baseRate || 0)),
    partnerRate: Number(row.partner_rate !== undefined ? row.partner_rate : (row.partnerRate || 0)),
    dedicatedPartnerId: row.dedicated_partner_id || row.dedicatedPartnerId ? String(row.dedicated_partner_id || row.dedicatedPartnerId) : null,
    dedicatedPartnerName: row.dedicated_partner_name || row.dedicatedPartnerName ? String(row.dedicated_partner_name || row.dedicatedPartnerName) : null,
    dedicatedPartnerMobile: row.dedicated_partner_mobile || row.dedicatedPartnerMobile ? String(row.dedicated_partner_mobile || row.dedicatedPartnerMobile) : null,
    active: row.active !== 0 && row.active !== false && row.active !== '0',
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at || row.createdAt || ''),
    updatedAt: row.updated_at || row.updatedAt ? String(row.updated_at || row.updatedAt) : undefined,
  };
}
