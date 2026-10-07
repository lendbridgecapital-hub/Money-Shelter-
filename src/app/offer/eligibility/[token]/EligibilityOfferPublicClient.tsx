'use client';

import React from 'react';
import Link from 'next/link';
import type { CustomerEligibilityOfferData } from '@/types/policy';
import CustomerEligibilityOfferDoc from '@/components/CustomerEligibilityOfferDoc';

interface Props {
  offerData: CustomerEligibilityOfferData;
}

export default function EligibilityOfferPublicClient({ offerData }: Props) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 py-6 px-3 sm:px-6 lg:px-8 print:p-0 print:bg-white">
      {/* ========================================================================= */}
      {/* TOP STICKY CUSTOMER ACTION BAR (HIDDEN IN PRINT)                          */}
      {/* ========================================================================= */}
      <div className="max-w-4xl mx-auto mb-5 print:hidden">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xl shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white">
                  Your Loan Eligibility Assessment
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase">
                  Tentative Offer
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official institutional multi-bank offer letter issued by {offerData.companyName}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {offerData.advisorPhone && (
              <a
                href={`tel:${offerData.advisorPhone.replace(/[^0-9+]/g, '')}`}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
              >
                <span>📞</span>
                <span>Call Advisor</span>
              </a>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md active:scale-95 transition flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THE OFFICIAL OFFER DOCUMENT CANVAS                                        */}
      {/* ========================================================================= */}
      <div className="max-w-4xl mx-auto print:max-w-none">
        <CustomerEligibilityOfferDoc data={offerData} />
      </div>

      {/* ========================================================================= */}
      {/* FOOTER HELP STRIP (HIDDEN IN PRINT)                                       */}
      {/* ========================================================================= */}
      <div className="max-w-4xl mx-auto mt-6 text-center text-xs text-slate-500 print:hidden pb-10">
        <p>
          Need to submit your documents or have questions regarding this assessment?
        </p>
        <p className="font-semibold text-slate-700 mt-1">
          Call your Advisor {offerData.advisorName} at <span className="text-emerald-700 font-bold">{offerData.advisorPhone}</span> ({offerData.branchName})
        </p>
      </div>
    </div>
  );
}
