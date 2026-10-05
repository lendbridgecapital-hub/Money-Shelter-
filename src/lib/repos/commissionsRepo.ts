import crypto from 'crypto';
import { db } from '@/lib/db';
import type { Commission, Clawback } from '@/types/db';

export function listCommissions(tenantId = 'default'): Commission[] {
  const rows = db
    .prepare('SELECT * FROM commissions WHERE tenant_id = ? ORDER BY created_at DESC')
    .all(tenantId) as Record<string, unknown>[];

  return rows.map(mapRowToCommission);
}

export function listCommissionsByPartner(partnerId: string): Commission[] {
  const rows = db
    .prepare('SELECT * FROM commissions WHERE channel_partner_id = ? ORDER BY created_at DESC')
    .all(partnerId) as Record<string, unknown>[];

  return rows.map(mapRowToCommission);
}

export function recordCommission(data: {
  tenantId?: string;
  applicationId: string;
  channelPartnerId: string;
  channelPartnerName?: string;
  bankId: string;
  bankName?: string;
  disbursedAmount: number;
  commissionRate: number;
  commissionAmount?: number;
  earningType?: 'DIRECT' | 'OVERRIDE';
  sourcePartnerId?: string | null;
  sourcePartnerName?: string | null;
  productName?: string | null;
  bankPayoutRate?: number | null;
  subDsaOverrideRate?: number | null;
  netCompanyMargin?: number | null;
}): Commission {
  const id = `comm_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';
  const commissionAmount = data.commissionAmount !== undefined
    ? data.commissionAmount
    : Math.round((data.disbursedAmount * data.commissionRate) / 100);
  const earningType = data.earningType || 'DIRECT';

  db.prepare(
    `INSERT INTO commissions (
      id, tenant_id, application_id, channel_partner_id, channel_partner_name,
      bank_id, bank_name, disbursed_amount, commission_rate, commission_amount,
      status, earning_type, source_partner_id, source_partner_name, product_name,
      bank_payout_rate, sub_dsa_override_rate, net_company_margin, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tenantId,
    data.applicationId,
    data.channelPartnerId,
    data.channelPartnerName || 'Channel Partner',
    data.bankId,
    data.bankName || 'Bank',
    data.disbursedAmount,
    data.commissionRate,
    commissionAmount,
    earningType,
    data.sourcePartnerId || null,
    data.sourcePartnerName || null,
    data.productName || null,
    data.bankPayoutRate !== undefined ? data.bankPayoutRate : null,
    data.subDsaOverrideRate !== undefined ? data.subDsaOverrideRate : null,
    data.netCompanyMargin !== undefined ? data.netCompanyMargin : null,
    now
  );

  return {
    id,
    tenantId,
    applicationId: data.applicationId,
    channelPartnerId: data.channelPartnerId,
    channelPartnerName: data.channelPartnerName,
    bankId: data.bankId,
    bankName: data.bankName,
    disbursedAmount: data.disbursedAmount,
    commissionRate: data.commissionRate,
    commissionAmount,
    status: 'PENDING',
    earningType,
    sourcePartnerId: data.sourcePartnerId || null,
    sourcePartnerName: data.sourcePartnerName || null,
    productName: data.productName || null,
    bankPayoutRate: data.bankPayoutRate || null,
    subDsaOverrideRate: data.subDsaOverrideRate || null,
    netCompanyMargin: data.netCompanyMargin || null,
    createdAt: now,
  };
}

export function updateCommissionStatus(id: string, status: 'PENDING' | 'APPROVED' | 'PAID' | 'CLAWBACK'): void {
  const now = new Date().toISOString();
  db.prepare('UPDATE commissions SET status = ?, paid_at = ? WHERE id = ?').run(
    status,
    status === 'PAID' ? now : null,
    id
  );
}

// Clawback management
export function listClawbacks(tenantId = 'default'): Clawback[] {
  const rows = db
    .prepare('SELECT * FROM clawbacks WHERE tenant_id = ? ORDER BY created_at DESC')
    .all(tenantId) as Record<string, unknown>[];

  return rows.map(mapRowToClawback);
}

export function recordClawback(data: {
  tenantId?: string;
  channelPartnerId: string;
  channelPartnerName?: string;
  applicationId?: string | null;
  amount: number;
  reason: string;
}): Clawback {
  const id = `claw_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';

  db.prepare(
    `INSERT INTO clawbacks (id, tenant_id, channel_partner_id, channel_partner_name, application_id, amount, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tenantId,
    data.channelPartnerId,
    data.channelPartnerName || 'Channel Partner',
    data.applicationId || null,
    data.amount,
    data.reason.trim(),
    now
  );

  return {
    id,
    tenantId,
    channelPartnerId: data.channelPartnerId,
    channelPartnerName: data.channelPartnerName,
    applicationId: data.applicationId,
    amount: data.amount,
    reason: data.reason.trim(),
    createdAt: now,
  };
}

export function listCommissionsForSubDsa(subDsaId: string, tenantId = 'default'): Commission[] {
  const all = listCommissions(tenantId);
  return all.filter((c) => c.channelPartnerId === subDsaId);
}

export function getSubDsaEarningsSummary(subDsaId: string, tenantId = 'default'): {
  directEarnings: number;
  overrideEarnings: number;
  totalEarnings: number;
  pendingEarnings: number;
  directDisbursed: number;
  teamDisbursed: number;
  totalDisbursed: number;
  directCount: number;
  overrideCount: number;
} {
  const commissions = listCommissionsForSubDsa(subDsaId, tenantId);

  let directEarnings = 0;
  let overrideEarnings = 0;
  let pendingEarnings = 0;
  let directDisbursed = 0;
  let teamDisbursed = 0;
  let directCount = 0;
  let overrideCount = 0;

  for (const c of commissions) {
    if (c.earningType === 'OVERRIDE') {
      overrideEarnings += c.commissionAmount || 0;
      teamDisbursed += c.disbursedAmount || 0;
      overrideCount += 1;
    } else {
      directEarnings += c.commissionAmount || 0;
      directDisbursed += c.disbursedAmount || 0;
      directCount += 1;
    }

    if (c.status === 'PENDING') {
      pendingEarnings += c.commissionAmount || 0;
    }
  }

  return {
    directEarnings,
    overrideEarnings,
    totalEarnings: directEarnings + overrideEarnings,
    pendingEarnings,
    directDisbursed,
    teamDisbursed,
    totalDisbursed: directDisbursed + teamDisbursed,
    directCount,
    overrideCount,
  };
}

function mapRowToCommission(row: Record<string, unknown>): Commission {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || row.tenantId || 'default'),
    applicationId: String(row.application_id || row.applicationId),
    channelPartnerId: String(row.channel_partner_id || row.channelPartnerId),
    channelPartnerName: String(row.channel_partner_name || row.channelPartnerName || ''),
    bankId: String(row.bank_id || row.bankId),
    bankName: String(row.bank_name || row.bankName || ''),
    disbursedAmount: Number(row.disbursed_amount || row.disbursedAmount || 0),
    commissionRate: Number(row.commission_rate || row.commissionRate || 0),
    commissionAmount: Number(row.commission_amount || row.commissionAmount || 0),
    status: (row.status as 'PENDING' | 'APPROVED' | 'PAID' | 'CLAWBACK') || 'PENDING',
    earningType: (row.earning_type as 'DIRECT' | 'OVERRIDE') || (row.earningType as 'DIRECT' | 'OVERRIDE') || 'DIRECT',
    sourcePartnerId: row.source_partner_id || row.sourcePartnerId ? String(row.source_partner_id || row.sourcePartnerId) : null,
    sourcePartnerName: row.source_partner_name || row.sourcePartnerName ? String(row.source_partner_name || row.sourcePartnerName) : null,
    productName: row.product_name || row.productName ? String(row.product_name || row.productName) : null,
    bankPayoutRate: row.bank_payout_rate !== undefined ? Number(row.bank_payout_rate) : (row.bankPayoutRate !== undefined ? Number(row.bankPayoutRate) : null),
    subDsaOverrideRate: row.sub_dsa_override_rate !== undefined ? Number(row.sub_dsa_override_rate) : (row.subDsaOverrideRate !== undefined ? Number(row.subDsaOverrideRate) : null),
    netCompanyMargin: row.net_company_margin !== undefined ? Number(row.net_company_margin) : (row.netCompanyMargin !== undefined ? Number(row.netCompanyMargin) : null),
    paidAt: row.paid_at || row.paidAt ? String(row.paid_at || row.paidAt) : null,
    createdAt: String(row.created_at || row.createdAt || ''),
  };
}

function mapRowToClawback(row: Record<string, unknown>): Clawback {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || row.tenantId || 'default'),
    channelPartnerId: String(row.channel_partner_id || row.channelPartnerId),
    channelPartnerName: String(row.channel_partner_name || row.channelPartnerName || ''),
    applicationId: row.application_id || row.applicationId ? String(row.application_id || row.applicationId) : null,
    amount: Number(row.amount || 0),
    reason: String(row.reason || ''),
    createdAt: String(row.created_at || row.createdAt || ''),
  };
}
