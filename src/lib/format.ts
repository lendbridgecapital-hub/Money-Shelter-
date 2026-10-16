import type { ApplicationStatus, LoanType, Role, PartnerStatus } from '@/types/db';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  CENTRAL_SUPPORT: 'Central Support',
  OPERATIONS: 'Operations Desk',
  RELATIONSHIP_MANAGER: 'Relationship Manager',
  SUB_DSA: 'Sub-DSA Partner',
  CHANNEL_PARTNER: 'Channel Partner',
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  APPROVED: {
    label: 'Approved & Active',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  DOCUMENTS_REQUIRED: {
    label: 'Update Required',
    color: 'text-indigo-800',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
};

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  HOME_LOAN: 'Home Loan',
  PERSONAL_LOAN: 'Personal Loan',
  BUSINESS_LOAN: 'Business Loan',
  LOAN_AGAINST_PROPERTY: 'Loan Against Property (LAP)',
  EDUCATION_LOAN: 'Education Loan',
  GOLD_LOAN: 'Gold Loan',
  BALANCE_TRANSFER: 'Balance Transfer',
  OTHERS: 'Other / Custom Loan',
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  LINK_SHARED: 'Link Shared',
  DOCUMENTS_IN: 'Documents In',
  SENT_TO_BANK: 'Details Sent to Bank',
  DOCUMENTS_REQUIRED: 'Documents Required',
  APPROVED: 'Bank Approved',
  CUSTOMER_ACCEPTED: 'Customer Accepted',
  DISBURSED: 'Loan Disbursed',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
};

export function formatCurrencyINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const val = Math.round(Number(amount));
  return '₹' + val.toLocaleString('en-IN');
}

export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}
