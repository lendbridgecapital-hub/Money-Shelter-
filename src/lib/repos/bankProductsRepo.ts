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
  subDsaRate?: number;
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
      id, tenant_id, product_name, banks, base_rate, partner_rate, sub_dsa_rate,
      dedicated_partner_id, dedicated_partner_name, dedicated_partner_mobile,
      notes, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(
    id,
    tenantId,
    data.productName.trim(),
    banksJson,
    Number(data.baseRate) || 0,
    Number(data.partnerRate) || 0,
    Number(data.subDsaRate !== undefined ? data.subDsaRate : 0.1),
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
  if (data.subDsaRate !== undefined) {
    updates.push('sub_dsa_rate = ?');
    params.push(Number(data.subDsaRate));
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

/**
 * Resolves product-wise commission split rates for a loan category.
 * Bank Payout (baseRate), Partner Earning (partnerRate), Sub-DSA Override (subDsaRate), and Net Margin.
 */
export function getProductCommissionSplit(
  loanTypeOrName: string,
  tenantId = 'default'
): {
  productName: string;
  baseRate: number;
  partnerRate: number;
  subDsaRate: number;
  netCompanyMargin: number;
} {
  const products = listBankProducts(tenantId).filter((p) => p.active && !p.dedicatedPartnerId);
  const normalized = (loanTypeOrName || '').toLowerCase().replace(/_/g, ' ').trim();

  // Try matching by product name or common loan aliases
  const matched = products.find((p) => {
    const pn = p.productName.toLowerCase();
    if (pn === normalized) return true;
    if (normalized.includes('personal') && pn.includes('personal')) return true;
    if (normalized.includes('home') && pn.includes('home')) return true;
    if (normalized.includes('business') && pn.includes('business')) return true;
    if ((normalized.includes('property') || normalized.includes('lap')) && (pn.includes('property') || pn.includes('lap'))) return true;
    if (normalized.includes('education') && pn.includes('education')) return true;
    if (normalized.includes('gold') && pn.includes('gold')) return true;
    if (normalized.includes('balance') && pn.includes('balance')) return true;
    return false;
  });

  if (matched) {
    const baseRate = Number(matched.baseRate) || 2.0;
    const partnerRate = Number(matched.partnerRate) || 1.5;
    const subDsaRate = Number(matched.subDsaRate !== undefined ? matched.subDsaRate : 0.1);
    const netCompanyMargin = Math.max(0, Number((baseRate - partnerRate - subDsaRate).toFixed(2)));
    return {
      productName: matched.productName,
      baseRate,
      partnerRate,
      subDsaRate,
      netCompanyMargin,
    };
  }

  // Standard industry defaults if product record is not in database
  if (normalized.includes('personal')) {
    return { productName: 'Personal Loan', baseRate: 2.5, partnerRate: 1.5, subDsaRate: 0.1, netCompanyMargin: 0.9 };
  }
  if (normalized.includes('home')) {
    return { productName: 'Home Loan', baseRate: 2.0, partnerRate: 1.2, subDsaRate: 0.1, netCompanyMargin: 0.7 };
  }
  if (normalized.includes('business')) {
    return { productName: 'Business Loan', baseRate: 2.75, partnerRate: 1.65, subDsaRate: 0.1, netCompanyMargin: 1.0 };
  }
  if (normalized.includes('property') || normalized.includes('lap')) {
    return { productName: 'Loan Against Property', baseRate: 2.0, partnerRate: 1.2, subDsaRate: 0.1, netCompanyMargin: 0.7 };
  }
  if (normalized.includes('education')) {
    return { productName: 'Education Loan', baseRate: 1.8, partnerRate: 1.1, subDsaRate: 0.1, netCompanyMargin: 0.6 };
  }
  if (normalized.includes('gold')) {
    return { productName: 'Gold Loan', baseRate: 1.0, partnerRate: 0.6, subDsaRate: 0.1, netCompanyMargin: 0.3 };
  }

  return {
    productName: loanTypeOrName || 'Loan',
    baseRate: 2.0,
    partnerRate: 1.5,
    subDsaRate: 0.1,
    netCompanyMargin: 0.4,
  };
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
    subDsaRate: Number(row.sub_dsa_rate !== undefined ? row.sub_dsa_rate : (row.subDsaRate !== undefined ? row.subDsaRate : 0.1)),
    dedicatedPartnerId: row.dedicated_partner_id || row.dedicatedPartnerId ? String(row.dedicated_partner_id || row.dedicatedPartnerId) : null,
    dedicatedPartnerName: row.dedicated_partner_name || row.dedicatedPartnerName ? String(row.dedicated_partner_name || row.dedicatedPartnerName) : null,
    dedicatedPartnerMobile: row.dedicated_partner_mobile || row.dedicatedPartnerMobile ? String(row.dedicated_partner_mobile || row.dedicatedPartnerMobile) : null,
    active: row.active !== 0 && row.active !== false && row.active !== '0',
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at || row.createdAt || ''),
    updatedAt: row.updated_at || row.updatedAt ? String(row.updated_at || row.updatedAt) : undefined,
  };
}
