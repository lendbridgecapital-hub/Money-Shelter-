'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LoanApplication } from '@/types/db';
import LoanEligibilityMatchModal from '@/components/LoanEligibilityMatchModal';

interface Props {
  application: LoanApplication;
  isOpsOrAdmin: boolean;
}

export default function CaseMatchEligibilityBanner({ application, isOpsOrAdmin }: Props) {
  const router = useRouter();
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);

  if (application.status !== 'DOCUMENTS_IN' || !isOpsOrAdmin) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 shadow-sm border border-indigo-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
              📂 Documents In Bucket
            </span>
            <span className="text-xs text-indigo-300 font-semibold">Underwriting & Matchmaking Ready</span>
          </div>
          <p className="text-xs text-slate-200 mt-1">
            Applicant KYC & financial documents are in. Enter applicant CIBIL score to immediately evaluate live bank cards & find best interest rates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowEligibilityModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto active:scale-95"
        >
          <span>⚡</span>
          <span>Match Loan Eligibility & Rates</span>
        </button>
      </div>

      <LoanEligibilityMatchModal
        application={application}
        isOpen={showEligibilityModal}
        onClose={() => setShowEligibilityModal(false)}
        onAssigned={() => {
          router.refresh();
        }}
      />
    </>
  );
}
