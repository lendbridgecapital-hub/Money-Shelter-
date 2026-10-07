'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import * as rewardsRepo from '@/lib/repos/rewardsRepo';
import * as workflowRepo from '@/lib/repos/workflowRepo';
import * as usersRepo from '@/lib/repos/usersRepo';
import { syncDatabase } from '@/lib/db';
import type { ActionResult } from '@/actions/settingsActions';

/**
 * Partner Submits a Partial or Total CRP Redemption Request
 */
export async function submitRedemptionRequestAction(data: {
  points: number;
  payoutMethod: 'BANK_TRANSFER' | 'UPI';
  payoutDetails: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();

    if (!data.points || data.points <= 0) {
      return { ok: false, error: 'Please enter a valid CRP amount to redeem (e.g. 50 CRP = ₹500).' };
    }

    if (!data.payoutDetails || !data.payoutDetails.trim()) {
      return { ok: false, error: 'Please enter your bank account or UPI payout details.' };
    }

    const tenantId = user.tenantId || 'default';
    const res = rewardsRepo.requestRedemption({
      tenantId,
      partnerId: user.id,
      partnerName: user.name,
      partnerEmail: user.email || undefined,
      partnerPhone: user.phone || undefined,
      points: Number(data.points),
      payoutMethod: data.payoutMethod,
      payoutDetails: data.payoutDetails.trim(),
    });

    if (!res.ok || !res.redemption) {
      return { ok: false, error: res.error || 'Failed to submit redemption request.' };
    }

    const inrAmount = Math.round(data.points * 10);

    // 1. In-App Notification to the Partner
    workflowRepo.createNotification({
      recipientId: user.id,
      recipientRole: user.role,
      applicationId: 'reward-redemption',
      title: `CRP Redeem Request Submitted! 🪙`,
      message: `You have submitted a request to redeem ${data.points.toLocaleString('en-IN')} CRP (₹${inrAmount.toLocaleString('en-IN')}) via ${data.payoutMethod}. Your request is under review by Central Operations.`,
    });

    // 2. In-App Notification to Admin & Operations Staff
    try {
      const allUsers = usersRepo.listUsers(tenantId);
      const opsAndAdmins = allUsers.filter(
        (u) => u.active && !u.isBlocked && (u.role === 'ADMIN' || u.role === 'OPERATIONS' || u.role === 'CENTRAL_SUPPORT')
      );

      for (const admin of opsAndAdmins) {
        workflowRepo.createNotification({
          recipientId: admin.id,
          recipientRole: admin.role,
          applicationId: 'reward-redemption',
          title: `🪙 New CRP Redeem Request: ${user.name} (${data.points} CRP)`,
          message: `Partner ${user.name} has requested to redeem ${data.points.toLocaleString('en-IN')} CRP (₹${inrAmount.toLocaleString('en-IN')}) to ${data.payoutMethod}: "${data.payoutDetails.trim()}". Review in Redeem Request Bucket.`,
        });
      }
    } catch (e) {
      console.warn('[submitRedemptionRequestAction] Admin notification warning:', e);
    }

    revalidatePath('/admin/rewards');
    revalidatePath('/partner/rewards');
    await syncDatabase();

    return {
      ok: true,
      message: `Redemption request for ${data.points.toLocaleString('en-IN')} CRP (₹${inrAmount.toLocaleString('en-IN')}) submitted successfully!`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit redemption request.';
    return { ok: false, error: msg };
  }
}

/**
 * Admin Approves Redemption Request and Records Payout
 */
export async function approveRedemptionAction(
  redemptionId: string,
  transactionRef?: string,
  adminNotes?: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'ADMIN' && user.role !== 'OPERATIONS' && user.role !== 'CENTRAL_SUPPORT') {
      return { ok: false, error: 'Only Admin or Central Operations can approve reward redemptions.' };
    }

    const res = rewardsRepo.approveRedemption(
      redemptionId,
      { id: user.id, name: user.name },
      transactionRef,
      adminNotes
    );

    if (!res.ok || !res.redemption) {
      return { ok: false, error: res.error || 'Failed to approve redemption.' };
    }

    const red = res.redemption;

    // Trigger Notification to Partner
    workflowRepo.createNotification({
      recipientId: red.partnerId,
      recipientRole: 'CHANNEL_PARTNER',
      applicationId: 'reward-redemption',
      title: `Reward Redemption Approved! 🎉 ₹${red.inrAmount.toLocaleString('en-IN')} Paid`,
      message: `Your redemption of ${red.points.toLocaleString('en-IN')} CRP (₹${red.inrAmount.toLocaleString('en-IN')}) has been approved and paid by ${user.name}.${transactionRef ? ` UTR / Txn Reference: ${transactionRef}.` : ''}`,
    });

    revalidatePath('/admin/rewards');
    revalidatePath('/partner/rewards');
    await syncDatabase();

    return {
      ok: true,
      message: `Redemption request for ${red.partnerName} (${red.points} CRP = ₹${red.inrAmount}) approved and marked paid!`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to approve redemption.';
    return { ok: false, error: msg };
  }
}

/**
 * Admin Rejects Redemption Request and Restores Points to Partner Wallet
 */
export async function rejectRedemptionAction(
  redemptionId: string,
  rejectionReason: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'ADMIN' && user.role !== 'OPERATIONS' && user.role !== 'CENTRAL_SUPPORT') {
      return { ok: false, error: 'Only Admin or Central Operations can reject reward redemptions.' };
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      return { ok: false, error: 'Please provide a reason for rejecting this redemption request.' };
    }

    const res = rewardsRepo.rejectRedemption(
      redemptionId,
      { id: user.id, name: user.name },
      rejectionReason.trim()
    );

    if (!res.ok || !res.redemption) {
      return { ok: false, error: res.error || 'Failed to reject redemption.' };
    }

    const red = res.redemption;

    // Trigger Notification to Partner
    workflowRepo.createNotification({
      recipientId: red.partnerId,
      recipientRole: 'CHANNEL_PARTNER',
      applicationId: 'reward-redemption',
      title: `Reward Redemption Request Update ⚠️`,
      message: `Your redemption request for ${red.points.toLocaleString('en-IN')} CRP was rejected. Reason: "${rejectionReason.trim()}". Points have been restored back to your wallet.`,
    });

    revalidatePath('/admin/rewards');
    revalidatePath('/partner/rewards');
    await syncDatabase();

    return {
      ok: true,
      message: `Redemption request for ${red.partnerName} rejected. ${red.points} CRP restored to their wallet.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reject redemption.';
    return { ok: false, error: msg };
  }
}
