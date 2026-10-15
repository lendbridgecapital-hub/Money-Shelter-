import React from 'react';
import type { ApplicationStatus } from '@/types/db';

interface StatusTrackerProps {
  status: ApplicationStatus;
}

export default function StatusTracker({ status }: StatusTrackerProps) {
  const steps = [
    { key: 'LINK_SHARED', label: '1. Link Shared' },
    { key: 'DOCUMENTS_IN', label: '2. Documents In' },
    { key: 'SENT_TO_BANK', label: '3. Sent to Bank' },
    { key: 'APPROVED', label: '4. Bank Approved' },
    { key: 'CUSTOMER_ACCEPTED', label: '5. Customer Accepted' },
    { key: 'DISBURSED', label: '6. Disbursed' },
  ];

  const getStepIndex = (s: ApplicationStatus): number => {
    switch (s) {
      case 'LINK_SHARED':
        return 0;
      case 'DOCUMENTS_IN':
        return 1;
      case 'SENT_TO_BANK':
      case 'DOCUMENTS_REQUIRED':
        return 2;
      case 'APPROVED':
        return 3;
      case 'CUSTOMER_ACCEPTED':
        return 4;
      case 'DISBURSED':
        return 5;
      case 'REJECTED':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(status);
  const isRejected = status === 'REJECTED';
  const isFailed = status === 'FAILED';
  const isDocsRequired = status === 'DOCUMENTS_REQUIRED';

  return (
    <div className="w-full min-w-[650px] py-3">
      {isFailed && (
        <div className="mb-3 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center justify-between">
          <span>❌ This application link expired after 7 days of customer inactivity and was moved to the Rejected bucket.</span>
          <span className="uppercase text-[10px] bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded font-bold">Link Expired</span>
        </div>
      )}

      {isDocsRequired && (
        <div className="mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold flex items-center justify-between">
          <span>⚠️ Additional documents requested by Operations — Channel Partner upload window is open.</span>
          <span className="uppercase text-[10px] bg-amber-200/60 px-2 py-0.5 rounded">Action Required</span>
        </div>
      )}

      <div className="flex items-center justify-between relative">
        {/* Background Connecting Bar */}
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-slate-200 z-0" />

        {/* Dynamic Progress Bar */}
        <div
          className={`absolute top-1/2 left-6 -translate-y-1/2 h-1 z-0 transition-all duration-300 ${
            isRejected ? 'bg-rose-500' : 'bg-emerald-600'
          }`}
          style={{ width: `${(Math.min(currentIndex, 5) / 5) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          let circleStyle = 'bg-white border-2 border-slate-300 text-slate-400';
          if (isDone) {
            circleStyle = 'bg-emerald-600 border-2 border-emerald-600 text-white';
          } else if (isCurrent) {
            circleStyle = isRejected
              ? 'bg-rose-600 border-2 border-rose-600 text-white shadow-md ring-4 ring-rose-100'
              : isDocsRequired && idx === 2
              ? 'bg-amber-500 border-2 border-amber-500 text-white shadow-md ring-4 ring-amber-100'
              : 'bg-emerald-600 border-2 border-emerald-600 text-white shadow-md ring-4 ring-emerald-100';
          }

          let label = step.label;
          if (isCurrent && isRejected && idx === 3) {
            label = 'Rejected by Bank';
          } else if (isCurrent && isDocsRequired && idx === 2) {
            label = 'Docs Required';
          }

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${circleStyle}`}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[11px] mt-2 font-medium text-center whitespace-nowrap ${
                  isCurrent ? 'font-bold text-slate-900' : isDone ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
