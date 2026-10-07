import crypto from 'crypto';
import { db } from '@/lib/db';
import type { RewardLedgerEntry, RewardRedemption, PartnerWalletSummary } from '@/types/db';

function mapRowToLedgerEntry(r: Record<string, unknown>): RewardLedgerEntry {
  return {
    id: String(r.id),
    tenantId: String(r.tenant_id || r.tenantId || 'default'),
    partnerId: String(r.partner_id || r.partnerId),
    partnerName: r.partner_name ? String(r.partner_name) : (r.partnerName ? String(r.partnerName) : undefined),
    applicationId: r.application_id ? String(r.application_id) : (r.applicationId ? String(r.applicationId) : null),
    customerName: r.customer_name ? String(r.customer_name) : (r.customerName ? String(r.customerName) : null),
    customerMobile: r.customer_mobile ? String(r.customer_mobile) : (r.customerMobile ? String(r.customerMobile) : null),
    loanType: r.loan_type ? String(r.loan_type) : (r.loanType ? String(r.loanType) : null),
    disbursedAmount: r.disbursed_amount !== undefined && r.disbursed_amount !== null ? Number(r.disbursed_amount) : (r.disbursedAmount !== undefined ? Number(r.disbursedAmount) : null),
    commissionAmount: r.commission_amount !== undefined && r.commission_amount !== null ? Number(r.commission_amount) : (r.commissionAmount !== undefined ? Number(r.commissionAmount) : null),
    points: Number(r.points || 0),
    rateMultiplier: Number(r.rate_multiplier || r.rateMultiplier || 10),
    type: (r.type as RewardLedgerEntry['type']) || 'COMMISSION_EARNING',
    status: (r.status as RewardLedgerEntry['status']) || 'CREDITED',
    description: String(r.description || ''),
    redemptionId: r.redemption_id ? String(r.redemption_id) : (r.redemptionId ? String(r.redemptionId) : null),
    createdAt: String(r.created_at || r.createdAt || new Date().toISOString()),
  };
}

function mapRowToRedemption(r: Record<string, unknown>): RewardRedemption {
  return {
    id: String(r.id),
    tenantId: String(r.tenant_id || r.tenantId || 'default'),
    partnerId: String(r.partner_id || r.partnerId),
    partnerName: String(r.partner_name || r.partnerName || 'Partner'),
    partnerEmail: r.partner_email ? String(r.partner_email) : (r.partnerEmail ? String(r.partnerEmail) : undefined),
    partnerPhone: r.partner_phone ? String(r.partner_phone) : (r.partnerPhone ? String(r.partnerPhone) : undefined),
    points: Number(r.points || 0),
    inrAmount: Number(r.inr_amount || r.inrAmount || 0),
    payoutMethod: (r.payout_method || r.payoutMethod || 'BANK_TRANSFER') as RewardRedemption['payoutMethod'],
    payoutDetails: String(r.payout_details || r.payoutDetails || ''),
    status: (r.status as RewardRedemption['status']) || 'PENDING',
    adminNotes: r.admin_notes ? String(r.admin_notes) : (r.adminNotes ? String(r.adminNotes) : null),
    transactionRef: r.transaction_ref ? String(r.transaction_ref) : (r.transactionRef ? String(r.transactionRef) : null),
    processedById: r.processed_by_id ? String(r.processed_by_id) : (r.processedById ? String(r.processedById) : null),
    processedByName: r.processed_by_name ? String(r.processed_by_name) : (r.processedByName ? String(r.processedByName) : null),
    processedAt: r.processed_at ? String(r.processed_at) : (r.processedAt ? String(r.processedAt) : null),
    createdAt: String(r.created_at || r.createdAt || new Date().toISOString()),
  };
}

/**
 * List all CRP ledger records
 */
export function listRewardLedger(filter?: { partnerId?: string; tenantId?: string }): RewardLedgerEntry[] {
  syncExistingCommissionsToRewards();

  try {
    let rows: Record<string, unknown>[];
    if (filter?.partnerId) {
      rows = db
        .prepare('SELECT * FROM reward_ledger WHERE partner_id = ? ORDER BY created_at DESC')
        .all(filter.partnerId) as Record<string, unknown>[];
    } else {
      rows = db
        .prepare('SELECT * FROM reward_ledger ORDER BY created_at DESC')
        .all() as Record<string, unknown>[];
    }

    let entries = rows.map(mapRowToLedgerEntry);
    if (filter?.tenantId && filter.tenantId !== 'default') {
      entries = entries.filter((e) => e.tenantId === filter.tenantId);
    }
    return entries;
  } catch (err) {
    console.warn('[rewardsRepo.listRewardLedger] Error:', err);
    return [];
  }
}

/**
 * List all redemption requests (Admin / Partner bucket)
 */
export function listRedemptions(filter?: { partnerId?: string; status?: string; tenantId?: string }): RewardRedemption[] {
  try {
    let rows: Record<string, unknown>[];
    if (filter?.partnerId) {
      rows = db
        .prepare('SELECT * FROM reward_redemptions WHERE partner_id = ? ORDER BY created_at DESC')
        .all(filter.partnerId) as Record<string, unknown>[];
    } else {
      rows = db
        .prepare('SELECT * FROM reward_redemptions ORDER BY created_at DESC')
        .all() as Record<string, unknown>[];
    }

    let entries = rows.map(mapRowToRedemption);
    if (filter?.status && filter.status !== 'ALL') {
      entries = entries.filter((e) => e.status === filter.status);
    }
    if (filter?.tenantId && filter.tenantId !== 'default') {
      entries = entries.filter((e) => e.tenantId === filter.tenantId);
    }
    return entries;
  } catch (err) {
    console.warn('[rewardsRepo.listRedemptions] Error:', err);
    return [];
  }
}

/**
 * Calculate partner wallet balance and statistics
 * Definition: 1 CRP = ₹10
 * Formula: Commission / 10 = CRP
 */
export function getPartnerWalletSummary(partnerId?: string | null, tenantId: string = 'default'): PartnerWalletSummary {
  syncExistingCommissionsToRewards();

  try {
    const ledger = listRewardLedger({ partnerId: partnerId || undefined, tenantId });
    const redemptions = listRedemptions({ partnerId: partnerId || undefined, tenantId });

    // Sum credited earnings
    let totalCrpEarned = 0;
    for (const e of ledger) {
      if (e.type === 'COMMISSION_EARNING' && e.status === 'CREDITED') {
        totalCrpEarned += e.points;
      }
    }

    // Sum approved and pending redemptions
    let totalCrpRedeemed = 0;
    let pendingCrpRedemption = 0;
    for (const r of redemptions) {
      if (r.status === 'APPROVED') {
        totalCrpRedeemed += r.points;
      } else if (r.status === 'PENDING') {
        pendingCrpRedemption += r.points;
      }
    }

    const availableCrp = Math.max(0, Math.round((totalCrpEarned - totalCrpRedeemed - pendingCrpRedemption) * 100) / 100);

    return {
      partnerId: partnerId || '',
      totalCrpEarned: Math.round(totalCrpEarned * 100) / 100,
      totalCrpRedeemed: Math.round(totalCrpRedeemed * 100) / 100,
      pendingCrpRedemption: Math.round(pendingCrpRedemption * 100) / 100,
      availableCrp,
      availableInr: Math.round(availableCrp * 10),
      totalEarnedInr: Math.round(totalCrpEarned * 10),
      totalRedeemedInr: Math.round(totalCrpRedeemed * 10),
    };
  } catch (err) {
    console.warn('[rewardsRepo.getPartnerWalletSummary] Error:', err);
    return {
      partnerId: partnerId || '',
      totalCrpEarned: 0,
      totalCrpRedeemed: 0,
      pendingCrpRedemption: 0,
      availableCrp: 0,
      availableInr: 0,
      totalEarnedInr: 0,
      totalRedeemedInr: 0,
    };
  }
}

/**
 * Credit CRP to partner wallet upon loan disbursement
 * Formula: Commission Amount / 10 = CRP (1 CRP = ₹10)
 */
export function creditCommissionReward(data: {
  tenantId?: string | null;
  partnerId: string;
  partnerName?: string | null;
  applicationId?: string | null;
  customerName?: string | null;
  customerMobile?: string | null;
  loanType?: string | null;
  disbursedAmount?: number | null;
  commissionAmount: number;
  earningType?: 'DIRECT' | 'OVERRIDE';
  sourcePartnerName?: string | null;
}): RewardLedgerEntry {
  const id = `crp_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';

  // 1 CRP = 10 Rupees -> Total Commission / 10 = CRP
  const points = Math.round((data.commissionAmount / 10) * 100) / 100;

  let description = `Commission Earning: ₹${data.commissionAmount.toLocaleString('en-IN')}`;
  if (data.customerName) {
    description += ` on ${data.customerName}'s file`;
  }
  if (data.earningType === 'OVERRIDE' && data.sourcePartnerName) {
    description += ` (Sub-DSA Override via ${data.sourcePartnerName})`;
  }

  db.prepare(
    `INSERT INTO reward_ledger (
      id, tenant_id, partner_id, partner_name, application_id, customer_name,
      customer_mobile, loan_type, disbursed_amount, commission_amount, points,
      rate_multiplier, type, status, description, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, 'COMMISSION_EARNING', 'CREDITED', ?, ?)`
  ).run(
    id,
    tenantId,
    data.partnerId,
    data.partnerName || 'Partner',
    data.applicationId || null,
    data.customerName || null,
    data.customerMobile || null,
    data.loanType || null,
    data.disbursedAmount,
    data.commissionAmount,
    points,
    description,
    now
  );

  return {
    id,
    tenantId,
    partnerId: data.partnerId,
    partnerName: data.partnerName,
    applicationId: data.applicationId || null,
    customerName: data.customerName || null,
    customerMobile: data.customerMobile || null,
    loanType: data.loanType || null,
    disbursedAmount: data.disbursedAmount ?? null,
    commissionAmount: data.commissionAmount,
    points,
    rateMultiplier: 10,
    type: 'COMMISSION_EARNING',
    status: 'CREDITED',
    description,
    createdAt: now,
  };
}

/**
 * Partner Submits a Partial or Total CRP Redemption Request
 */
export function requestRedemption(data: {
  tenantId?: string | null;
  partnerId: string;
  partnerName: string;
  partnerEmail?: string | null;
  partnerPhone?: string | null;
  points: number;
  payoutMethod: 'BANK_TRANSFER' | 'UPI';
  payoutDetails: string;
}): { ok: boolean; error?: string; redemption?: RewardRedemption } {
  if (!data.points || data.points <= 0) {
    return { ok: false, error: 'Please enter a valid CRP point amount to redeem.' };
  }

  const wallet = getPartnerWalletSummary(data.partnerId, data.tenantId || 'default');
  if (data.points > wallet.availableCrp) {
    return {
      ok: false,
      error: `Insufficient CRP balance. You have ${wallet.availableCrp.toLocaleString('en-IN')} CRP available, but requested ${data.points.toLocaleString('en-IN')} CRP.`,
    };
  }

  const id = `redm_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';
  const inrAmount = Math.round(data.points * 10);

  // 1. Create redemption record
  db.prepare(
    `INSERT INTO reward_redemptions (
      id, tenant_id, partner_id, partner_name, partner_email, partner_phone,
      points, inr_amount, payout_method, payout_details, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`
  ).run(
    id,
    tenantId,
    data.partnerId,
    data.partnerName,
    data.partnerEmail || null,
    data.partnerPhone || null,
    data.points,
    inrAmount,
    data.payoutMethod,
    data.payoutDetails,
    now
  );

  // 2. Create pending debit entry in ledger to record redemption attempt
  const ledgerId = `crp_deb_${crypto.randomBytes(8).toString('hex')}`;
  db.prepare(
    `INSERT INTO reward_ledger (
      id, tenant_id, partner_id, partner_name, points, rate_multiplier,
      type, status, description, redemption_id, created_at
    ) VALUES (?, ?, ?, ?, ?, 10, 'REDEMPTION', 'PENDING', ?, ?, ?)`
  ).run(
    ledgerId,
    tenantId,
    data.partnerId,
    data.partnerName,
    -data.points,
    `Redemption Request Submitted: ${data.points.toLocaleString('en-IN')} CRP (₹${inrAmount.toLocaleString('en-IN')}) via ${data.payoutMethod}`,
    id,
    now
  );

  const redemption: RewardRedemption = {
    id,
    tenantId,
    partnerId: data.partnerId,
    partnerName: data.partnerName,
    partnerEmail: data.partnerEmail,
    partnerPhone: data.partnerPhone,
    points: data.points,
    inrAmount,
    payoutMethod: data.payoutMethod,
    payoutDetails: data.payoutDetails,
    status: 'PENDING',
    createdAt: now,
  };

  return { ok: true, redemption };
}

/**
 * Admin Approves and Marks Redemption as Paid
 */
export function approveRedemption(
  redemptionId: string,
  adminUser: { id: string; name: string },
  transactionRef?: string,
  adminNotes?: string
): { ok: boolean; error?: string; redemption?: RewardRedemption } {
  try {
    const row = db.prepare('SELECT * FROM reward_redemptions WHERE id = ?').get(redemptionId) as Record<string, unknown> | undefined;
    if (!row) {
      return { ok: false, error: 'Redemption request not found.' };
    }

    if (row.status !== 'PENDING') {
      return { ok: false, error: `This request is already ${row.status}.` };
    }

    const now = new Date().toISOString();

    db.prepare(
      `UPDATE reward_redemptions SET
        status = 'APPROVED',
        transaction_ref = ?,
        admin_notes = ?,
        processed_by_id = ?,
        processed_by_name = ?,
        processed_at = ?
       WHERE id = ?`
    ).run(
      transactionRef || null,
      adminNotes || null,
      adminUser.id,
      adminUser.name,
      now,
      redemptionId
    );

    // Update corresponding ledger entry to REDEEMED
    db.prepare(
      `UPDATE reward_ledger SET status = 'REDEEMED' WHERE redemption_id = ?`
    ).run(redemptionId);

    const updated = db.prepare('SELECT * FROM reward_redemptions WHERE id = ?').get(redemptionId) as Record<string, unknown>;
    return { ok: true, redemption: mapRowToRedemption(updated) };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to approve redemption.' };
  }
}

/**
 * Admin Rejects Redemption Request (Reverses Held Points)
 */
export function rejectRedemption(
  redemptionId: string,
  adminUser: { id: string; name: string },
  rejectionReason: string
): { ok: boolean; error?: string; redemption?: RewardRedemption } {
  try {
    const row = db.prepare('SELECT * FROM reward_redemptions WHERE id = ?').get(redemptionId) as Record<string, unknown> | undefined;
    if (!row) {
      return { ok: false, error: 'Redemption request not found.' };
    }

    if (row.status !== 'PENDING') {
      return { ok: false, error: `This request is already ${row.status}.` };
    }

    const now = new Date().toISOString();

    db.prepare(
      `UPDATE reward_redemptions SET
        status = 'REJECTED',
        admin_notes = ?,
        processed_by_id = ?,
        processed_by_name = ?,
        processed_at = ?
       WHERE id = ?`
    ).run(
      rejectionReason || 'Rejected by Admin',
      adminUser.id,
      adminUser.name,
      now,
      redemptionId
    );

    // Mark corresponding ledger entry as CANCELLED (which restores available points)
    db.prepare(
      `UPDATE reward_ledger SET status = 'CANCELLED' WHERE redemption_id = ?`
    ).run(redemptionId);

    const updated = db.prepare('SELECT * FROM reward_redemptions WHERE id = ?').get(redemptionId) as Record<string, unknown>;
    return { ok: true, redemption: mapRowToRedemption(updated) };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to reject redemption.' };
  }
}

/**
 * Backfill existing historical commissions into CRP ledger
 * Ensures partners immediately see CRP from loans disbursed prior to this feature
 */
let hasRunBackfill = false;
export function syncExistingCommissionsToRewards(): void {
  if (hasRunBackfill) return;
  hasRunBackfill = true;

  try {
    const commRows = db.prepare('SELECT * FROM commissions').all() as Record<string, unknown>[];
    if (!commRows || commRows.length === 0) return;

    const existingLedger = db.prepare('SELECT application_id, partner_id, commission_amount FROM reward_ledger').all() as Record<string, unknown>[];
    const existingKeys = new Set(
      existingLedger.map((l) => `${l.application_id || l.applicationId}_${l.partner_id || l.partnerId}_${l.commission_amount || l.commissionAmount}`)
    );

    // Fetch applications map for customer details
    const appRows = db.prepare('SELECT id, full_name, mobile, loan_type, token FROM loan_applications').all() as Record<string, unknown>[];
    const appMap = new Map<string, { fullName?: string; mobile?: string; loanType?: string; token?: string }>();
    for (const a of appRows) {
      appMap.set(String(a.id), {
        fullName: a.full_name ? String(a.full_name) : undefined,
        mobile: a.mobile ? String(a.mobile) : undefined,
        loanType: a.loan_type ? String(a.loan_type) : undefined,
        token: a.token ? String(a.token) : undefined,
      });
    }

    for (const c of commRows) {
      const appId = String(c.application_id || c.applicationId || '');
      const partnerId = String(c.channel_partner_id || c.channelPartnerId || c.partner_id || c.partnerId || '');
      const commAmount = Number(c.commission_amount || c.commissionAmount || c.amount || 0);

      if (!appId || !partnerId || commAmount <= 0) continue;

      const key = `${appId}_${partnerId}_${commAmount}`;
      if (!existingKeys.has(key)) {
        const appInfo = appMap.get(appId);
        const partnerName = String(c.channel_partner_name || c.channelPartnerName || 'Partner');
        const disbursedAmount = Number(c.disbursed_amount || c.disbursedAmount || 0);
        const earningType = (c.earning_type || c.earningType || 'DIRECT') as 'DIRECT' | 'OVERRIDE';
        const sourcePartnerName = c.source_partner_name ? String(c.source_partner_name) : undefined;

        creditCommissionReward({
          tenantId: String(c.tenant_id || c.tenantId || 'default'),
          partnerId,
          partnerName,
          applicationId: appId,
          customerName: appInfo?.fullName,
          customerMobile: appInfo?.mobile,
          loanType: appInfo?.loanType,
          disbursedAmount,
          commissionAmount: commAmount,
          earningType,
          sourcePartnerName,
        });

        existingKeys.add(key);
      }
    }
  } catch (err) {
    console.warn('[rewardsRepo.syncExistingCommissionsToRewards] Backfill error:', err);
  }
}
