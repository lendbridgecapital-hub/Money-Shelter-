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
}): Commission {
  const id = `comm_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';
  const commissionAmount = Math.round((data.disbursedAmount * data.commissionRate) / 100);

  db.prepare(
    `INSERT INTO commissions (
      id, tenant_id, application_id, channel_partner_id, channel_partner_name,
      bank_id, bank_name, disbursed_amount, commission_rate, commission_amount,
      status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`
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
