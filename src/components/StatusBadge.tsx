import React from 'react';
import type { ApplicationStatus } from '@/types/db';
import { STATUS_LABELS } from '@/lib/format';

export default function StatusBadge({
  status,
  size = 'md',
}: {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}) {
  const styles: Record<ApplicationStatus, { bg: string; text: string; dot: string }> = {
    LINK_SHARED: {
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      dot: 'bg-emerald-500',
    },
    DOCUMENTS_IN: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
    },
    SENT_TO_BANK: {
      bg: 'bg-indigo-50 border-indigo-200',
      text: 'text-indigo-800',
      dot: 'bg-indigo-500',
    },
    DOCUMENTS_REQUIRED: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
    },
    APPROVED: {
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      dot: 'bg-emerald-500',
    },
    CUSTOMER_ACCEPTED: {
      bg: 'bg-teal-50 border-teal-200',
      text: 'text-teal-800',
      dot: 'bg-teal-500',
    },
    DISBURSED: {
      bg: 'bg-purple-50 border-purple-200',
      text: 'text-purple-800',
      dot: 'bg-purple-500',
    },
    REJECTED: {
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-800',
      dot: 'bg-rose-500',
    },
    FAILED: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      dot: 'bg-red-500',
    },
  };

  const style = styles[status] || styles.LINK_SHARED;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${style.bg} ${style.text} ${
        isSm ? 'gap-1 px-2 py-0.5 text-[11px] font-medium' : 'gap-1.5 px-2.5 py-0.5 text-xs font-semibold'
      }`}
    >
      <span className={`rounded-full ${style.dot} ${isSm ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
