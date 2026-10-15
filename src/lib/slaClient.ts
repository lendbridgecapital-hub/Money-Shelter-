import type { ApplicationStatus, LoanApplication } from '@/types/db';

export type TatSeverity = 'NORMAL' | 'ORANGE' | 'RED';

export interface SlaInfo {
  status: ApplicationStatus;
  elapsedMs: number;
  elapsedFormatted: string; // e.g. "15m", "2h 30m", "3d 4h"
  standardTatMs: number | null;
  standardTatFormatted: string | null;
  severity: TatSeverity;
  isBreached: boolean;
  showTimer: boolean;
  statusMessage: string;
  badgeClass: string;
  badgeDotClass: string;
  cardBorderClass: string;
  cardBgClass: string;
}

// TAT constants in milliseconds
export const SLA_TAT_MS: Partial<Record<ApplicationStatus, number>> = {
  LINK_SHARED: 7 * 24 * 60 * 60 * 1000,        // 7 days auto-expire
  DOCUMENTS_IN: 30 * 60 * 1000,               // 30 mins standard TAT (60 mins critical red)
  DOCUMENTS_REQUIRED: 12 * 60 * 60 * 1000,    // 12 hours follow-up
  SENT_TO_BANK: 48 * 60 * 60 * 1000,          // 48 hours bank follow-up
  APPROVED: 12 * 60 * 60 * 1000,              // 12 hours
  CUSTOMER_ACCEPTED: 12 * 60 * 60 * 1000,     // 12 hours
};

export const DOCUMENTS_IN_ESCALATION_MS = 60 * 60 * 1000; // 60 mins -> Red card + Admin alarm

/**
 * Format milliseconds into human-readable elapsed duration
 * e.g. "12m", "1h 45m", "2d 6h"
 */
export function formatElapsedDuration(ms: number): string {
  if (ms < 0) return '0m';
  const totalMinutes = Math.floor(ms / (60 * 1000));
  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Calculates live SLA / TAT metrics for a given loan application
 */
export function calculateCaseSla(app: LoanApplication, referenceTime = new Date()): SlaInfo {
  const status = app.status;
  const standardTatMs = SLA_TAT_MS[status] || null;

  // Determine starting time when this case entered the current status
  const startTimestampStr = app.statusChangedAt || app.updatedAt || app.submittedAt || app.createdAt;
  const startTime = startTimestampStr ? new Date(startTimestampStr).getTime() : referenceTime.getTime();
  const elapsedMs = Math.max(0, referenceTime.getTime() - startTime);
  const elapsedFormatted = formatElapsedDuration(elapsedMs);

  let standardTatFormatted: string | null = null;
  if (standardTatMs) {
    standardTatFormatted = formatElapsedDuration(standardTatMs);
  }

  // Terminal states: closed, no TAT breach, NO TIMER in Disbursed, Rejected, or Expired bucket
  if (status === 'DISBURSED' || status === 'REJECTED' || status === 'FAILED') {
    return {
      status,
      elapsedMs,
      elapsedFormatted,
      standardTatMs: null,
      standardTatFormatted: null,
      severity: 'NORMAL',
      isBreached: false,
      showTimer: false,
      statusMessage:
        status === 'DISBURSED'
          ? 'Disbursed (Completed)'
          : status === 'FAILED'
          ? 'Rejected (Expired link)'
          : 'Rejected',
      badgeClass:
        status === 'DISBURSED'
          ? 'bg-purple-50 text-purple-800 border-purple-200'
          : 'bg-rose-50 text-rose-800 border-rose-200',
      badgeDotClass:
        status === 'DISBURSED'
          ? 'bg-purple-500'
          : 'bg-rose-500',
      cardBorderClass: 'border-slate-200/90',
      cardBgClass: 'bg-white',
    };
  }

  // 1. LINK_SHARED: 7 days auto-expiry
  if (status === 'LINK_SHARED') {
    const isExpired = elapsedMs >= 7 * 24 * 60 * 60 * 1000;
    const isNearExpiry = elapsedMs >= 5 * 24 * 60 * 60 * 1000;

    if (isExpired) {
      return {
        status,
        elapsedMs,
        elapsedFormatted,
        standardTatMs,
        standardTatFormatted: '7d',
        severity: 'RED',
        isBreached: true,
        showTimer: true,
        statusMessage: 'Expired (>7d in Link Shared) — Moving to Rejected bucket',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
        badgeDotClass: 'bg-rose-600 animate-pulse',
        cardBorderClass: 'border-rose-400 ring-1 ring-rose-300',
        cardBgClass: 'bg-rose-50/50',
      };
    }

    if (isNearExpiry) {
      return {
        status,
        elapsedMs,
        elapsedFormatted,
        standardTatMs,
        standardTatFormatted: '7d',
        severity: 'ORANGE',
        isBreached: false,
        showTimer: true,
        statusMessage: `Expiring soon (${elapsedFormatted} in Link Shared)`,
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
        badgeDotClass: 'bg-amber-500',
        cardBorderClass: 'border-amber-400',
        cardBgClass: 'bg-amber-50/30',
      };
    }

    return {
      status,
      elapsedMs,
      elapsedFormatted,
      standardTatMs,
      standardTatFormatted: '7d',
      severity: 'NORMAL',
      isBreached: false,
      showTimer: true,
      statusMessage: `Active in Link Shared (${elapsedFormatted})`,
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeDotClass: 'bg-emerald-500',
      cardBorderClass: 'border-slate-200/90',
      cardBgClass: 'bg-white',
    };
  }

  // 2. DOCUMENTS_IN: 30m standard TAT -> Orange, 60m escalation -> Red + Admin Alarm
  if (status === 'DOCUMENTS_IN') {
    if (elapsedMs >= DOCUMENTS_IN_ESCALATION_MS) {
      return {
        status,
        elapsedMs,
        elapsedFormatted,
        standardTatMs,
        standardTatFormatted: '30m',
        severity: 'RED',
        isBreached: true,
        showTimer: true,
        statusMessage: `🚨 Critical TAT Breach: >60m in Docs In (${elapsedFormatted}) — Escalated to Admin`,
        badgeClass: 'bg-rose-600 text-white border-rose-700 font-bold shadow-xs animate-pulse',
        badgeDotClass: 'bg-white animate-ping',
        cardBorderClass: 'border-rose-500 ring-2 ring-rose-400/80 shadow-md',
        cardBgClass: 'bg-rose-50/80',
      };
    }

    if (elapsedMs >= 30 * 60 * 1000) {
      return {
        status,
        elapsedMs,
        elapsedFormatted,
        standardTatMs,
        standardTatFormatted: '30m',
        severity: 'ORANGE',
        isBreached: true,
        showTimer: true,
        statusMessage: `⚠️ Standard 30m TAT Exceeded (${elapsedFormatted}) — Ops Action Required`,
        badgeClass: 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs',
        badgeDotClass: 'bg-white',
        cardBorderClass: 'border-amber-500 ring-1 ring-amber-400 shadow-xs',
        cardBgClass: 'bg-amber-50/70',
      };
    }

    const remainingMins = Math.max(1, Math.round((30 * 60 * 1000 - elapsedMs) / (60 * 1000)));
    return {
      status,
      elapsedMs,
      elapsedFormatted,
      standardTatMs,
      standardTatFormatted: '30m',
      severity: 'NORMAL',
      isBreached: false,
      showTimer: true,
      statusMessage: `Within 30m TAT (${remainingMins}m remaining)`,
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      badgeDotClass: 'bg-blue-500',
      cardBorderClass: 'border-slate-200/90',
      cardBgClass: 'bg-white',
    };
  }

  // 3. DOCUMENTS_REQUIRED: 12h standard TAT -> Orange + Partner Notification
  if (status === 'DOCUMENTS_REQUIRED') {
    const isExceeded = elapsedMs >= 12 * 60 * 60 * 1000;
    if (isExceeded) {
      return {
        status,
        elapsedMs,
        elapsedFormatted,
        standardTatMs,
        standardTatFormatted: '12h',
        severity: 'ORANGE',
        isBreached: true,
        showTimer: true,
        statusMessage: `⚠️ Follow-up Needed: >12h in Docs Required (${elapsedFormatted})`,
        badgeClass: 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs',
        badgeDotClass: 'bg-white',
        cardBorderClass: 'border-amber-500 ring-1 ring-amber-400 shadow-xs',
        cardBgClass: 'bg-amber-50/70',
      };
    }

    return {
      status,
      elapsedMs,
      elapsedFormatted,
      standardTatMs,
      standardTatFormatted: '12h',
      severity: 'NORMAL',
      isBreached: false,
      showTimer: true,
      statusMessage: `Docs Requested (${elapsedFormatted} in bucket)`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      badgeDotClass: 'bg-amber-500',
      cardBorderClass: 'border-slate-200/90',
      cardBgClass: 'bg-white',
    };
  }

  // 4. SENT_TO_BANK: 48h standard TAT -> Orange + Ops Notification
  if (status === 'SENT_TO_BANK') {
    const isExceeded = elapsedMs >= 48 * 60 * 60 * 1000;
    if (isExceeded) {
      return {
        status,
        elapsedMs,
        elapsedFormatted,
        standardTatMs,
        standardTatFormatted: '48h',
        severity: 'ORANGE',
        isBreached: true,
        showTimer: true,
        statusMessage: `⚠️ Bank Follow-Up Required: >48h at Bank (${elapsedFormatted})`,
        badgeClass: 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs',
        badgeDotClass: 'bg-white',
        cardBorderClass: 'border-amber-500 ring-1 ring-amber-400 shadow-xs',
        cardBgClass: 'bg-amber-50/70',
      };
    }

    return {
      status,
      elapsedMs,
      elapsedFormatted,
      standardTatMs,
      standardTatFormatted: '48h',
      severity: 'NORMAL',
      isBreached: false,
      showTimer: true,
      statusMessage: `Under Bank Review (${elapsedFormatted})`,
      badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      badgeDotClass: 'bg-indigo-500',
      cardBorderClass: 'border-slate-200/90',
      cardBgClass: 'bg-white',
    };
  }

  // 5. Subsequent Active Buckets (APPROVED, CUSTOMER_ACCEPTED, etc.): 12h standard TAT
  const defaultTatMs = 12 * 60 * 60 * 1000;
  const isExceeded = elapsedMs >= defaultTatMs;

  if (isExceeded) {
    return {
      status,
      elapsedMs,
      elapsedFormatted,
      standardTatMs: defaultTatMs,
      standardTatFormatted: '12h',
      severity: 'ORANGE',
      isBreached: true,
      showTimer: true,
      statusMessage: `⚠️ Standard 12h TAT Exceeded (${elapsedFormatted})`,
      badgeClass: 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs',
      badgeDotClass: 'bg-white',
      cardBorderClass: 'border-amber-500 ring-1 ring-amber-400 shadow-xs',
      cardBgClass: 'bg-amber-50/70',
    };
  }

  return {
    status,
    elapsedMs,
    elapsedFormatted,
    standardTatMs: defaultTatMs,
    standardTatFormatted: '12h',
    severity: 'NORMAL',
    isBreached: false,
    showTimer: true,
    statusMessage: `In stage: ${elapsedFormatted}`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeDotClass: 'bg-emerald-500',
    cardBorderClass: 'border-slate-200/90',
    cardBgClass: 'bg-white',
  };
}
