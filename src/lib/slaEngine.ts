import { db, syncDatabase } from '@/lib/db';
import type { ApplicationStatus, LoanApplication } from '@/types/db';
import { addStatusHistory } from '@/lib/repos/statusHistoryRepo';
import { createNotification } from '@/lib/repos/workflowRepo';
import { listUsers } from '@/lib/repos/usersRepo';

export * from '@/lib/slaClient';
import { calculateCaseSla, DOCUMENTS_IN_ESCALATION_MS } from '@/lib/slaClient';

/**
 * Evaluates all applications against SLA / TAT rules:
 * 1. Automatically expires LINK_SHARED cases older than 7 days -> moves to FAILED bucket.
 * 2. Triggers Admin warning alarm notification when DOCUMENTS_IN exceeds 60 mins.
 * 3. Triggers Partner notification ("Please contact customer for pending documents") when DOCUMENTS_REQUIRED exceeds 12 hours.
 * 4. Triggers Operations notification ("Please take follow up with bank") when SENT_TO_BANK exceeds 48 hours.
 */
export async function evaluateAndProcessSlaRules(apps: LoanApplication[]): Promise<{
  expiredCount: number;
  escalatedCount: number;
}> {
  let expiredCount = 0;
  let escalatedCount = 0;
  const now = new Date();
  const nowIso = now.toISOString();

  // Load all users to look up admins and ops
  const allUsers = listUsers('default');
  const admins = allUsers.filter((u) => u.role === 'ADMIN');
  const opsTeam = allUsers.filter((u) => u.role === 'OPERATIONS' || u.role === 'ADMIN');

  for (const app of apps) {
    const sla = calculateCaseSla(app, now);
    let alertsSent: Record<string, string> = {};
    if (app.tatAlertsSent) {
      try {
        alertsSent = JSON.parse(app.tatAlertsSent);
      } catch {}
    }

    let modified = false;

    // Rule A: 7-Day Auto-Expiry for LINK_SHARED -> REJECTED (Merged with Rejected bucket)
    if (app.status === 'LINK_SHARED' && sla.elapsedMs >= 7 * 24 * 60 * 60 * 1000) {
      try {
        db.prepare(
          `UPDATE loan_applications
           SET status = 'REJECTED', status_changed_at = ?, updated_at = ?
           WHERE id = ?`
        ).run(nowIso, nowIso, app.id);

        addStatusHistory({
          applicationId: app.id,
          status: 'REJECTED',
          note: 'Application link auto-expired after 7 days of customer inactivity. Moved to Rejected bucket.',
          changedById: 'SYSTEM_SLA_ENGINE',
        });

        // Notify creator / partner
        if (app.createdById || app.channelPartnerId) {
          const targetId = app.channelPartnerId || app.createdById;
          createNotification({
            tenantId: app.tenantId || 'default',
            recipientId: targetId,
            recipientRole: 'CHANNEL_PARTNER',
            applicationId: app.id,
            title: `❌ Case Link Expired: ${app.fullName || app.token}`,
            message: `The loan application link for ${app.fullName || app.token} has expired after 7 days without customer submission and has moved to the Rejected bucket.`,
          });
        }

        expiredCount++;
        modified = true;
      } catch (err) {
        console.error('[slaEngine] Failed to auto-expire application:', app.id, err);
      }
    }

    // Rule B: DOCUMENTS_IN > 60m Red Breach -> Alert notification with warning alarm triggered to Admin
    if (app.status === 'DOCUMENTS_IN' && sla.elapsedMs >= DOCUMENTS_IN_ESCALATION_MS) {
      const alertKey = 'DOCUMENTS_IN_RED';
      if (!alertsSent[alertKey]) {
        for (const admin of admins) {
          createNotification({
            tenantId: app.tenantId || 'default',
            recipientId: admin.id,
            recipientRole: 'ADMIN',
            applicationId: app.id,
            title: `🚨 Warning Alarm: Critical TAT Breach on Case ${app.fullName || app.token}`,
            message: `Case for ${app.fullName || app.token} (${app.mobile || 'Applicant'}) has been waiting in Documents In bucket for ${sla.elapsedFormatted} (exceeding standard 30m limit). Immediate administrative action is required.`,
          });
        }
        alertsSent[alertKey] = nowIso;
        escalatedCount++;
        modified = true;
      }
    }

    // Rule C: DOCUMENTS_REQUIRED > 12h -> Please contact customer for pending documents notification to partner
    if (app.status === 'DOCUMENTS_REQUIRED' && sla.elapsedMs >= 12 * 60 * 60 * 1000) {
      const alertKey = 'DOCUMENTS_REQUIRED_ORANGE';
      if (!alertsSent[alertKey]) {
        const targetPartnerId = app.channelPartnerId || app.createdById;
        if (targetPartnerId) {
          createNotification({
            tenantId: app.tenantId || 'default',
            recipientId: targetPartnerId,
            recipientRole: 'CHANNEL_PARTNER',
            applicationId: app.id,
            title: `⚠️ Action Required: Pending Documents Follow-up`,
            message: `Please contact customer ${app.fullName || 'Applicant'} (${app.mobile || 'Phone'}) for pending documents. Case has been in Docs Required bucket for over 12 hours.`,
          });
        }
        alertsSent[alertKey] = nowIso;
        escalatedCount++;
        modified = true;
      }
    }

    // Rule D: SENT_TO_BANK > 48h -> Please take follow up with bank notification to opt team
    if (app.status === 'SENT_TO_BANK' && sla.elapsedMs >= 48 * 60 * 60 * 1000) {
      const alertKey = 'SENT_TO_BANK_ORANGE';
      if (!alertsSent[alertKey]) {
        for (const op of opsTeam) {
          createNotification({
            tenantId: app.tenantId || 'default',
            recipientId: op.id,
            recipientRole: op.role,
            applicationId: app.id,
            title: `⚠️ Bank Follow-Up Required: ${app.bankName || 'Bank'}`,
            message: `Please take follow up with bank ${app.bankName || ''} for case ${app.fullName || app.token}. Case has been in Sent to Bank bucket for over 48 hours.`,
          });
        }
        alertsSent[alertKey] = nowIso;
        escalatedCount++;
        modified = true;
      }
    }

    if (modified) {
      try {
        db.prepare(
          `UPDATE loan_applications
           SET tat_alerts_sent = ?, updated_at = ?
           WHERE id = ?`
        ).run(JSON.stringify(alertsSent), nowIso, app.id);
      } catch {}
    }
  }

  if (expiredCount > 0 || escalatedCount > 0) {
    try {
      await syncDatabase();
    } catch {}
  }

  return { expiredCount, escalatedCount };
}
