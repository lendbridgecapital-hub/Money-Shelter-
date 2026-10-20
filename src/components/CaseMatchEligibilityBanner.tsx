'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LoanApplication } from '@/types/db';
import type { CustomerEligibilityOfferData } from '@/types/policy';
import LoanEligibilityMatchModal from '@/components/LoanEligibilityMatchModal';
import CustomerEligibilityOfferModal from '@/components/CustomerEligibilityOfferModal';
import { generateWhatsAppShareUrl } from '@/lib/offerPdfHelper';
import { formatCurrencyINR } from '@/lib/format';

interface Props {
  application: LoanApplication;
  isOpsOrAdmin: boolean;
}

export default function CaseMatchEligibilityBanner({ application, isOpsOrAdmin }: Props) {
  const router = useRouter();
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [showOfferReportModal, setShowOfferReportModal] = useState(false);

  let savedOffer: CustomerEligibilityOfferData | null = null;
  if (application.eligibilityOfferJson) {
    try {
      savedOffer = JSON.parse(application.eligibilityOfferJson);
    } catch {}
  }

  // Only show if user is authorized and case is in DOCUMENTS_IN or already has an eligibility offer
  if (!isOpsOrAdmin && !savedOffer) {
    return null;
  }

  if (!savedOffer && application.status !== 'DOCUMENTS_IN') {
    return null;
  }

  const bestBank = savedOffer?.bankOffers?.[0];
  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const origin = !rawOrigin || rawOrigin.includes('localhost') || rawOrigin.includes('onrender.com') || rawOrigin.includes('render.com')
    ? 'https://money-shelter.vercel.app'
    : rawOrigin;
  const publicShareUrl = `${origin}/offer/eligibility/${application.token}`;
  const whatsAppUrl = savedOffer ? generateWhatsAppShareUrl(savedOffer, publicShareUrl) : '';

  return (
    <>
      {savedOffer ? (
        /* SAVED ELIGIBILITY REPORT READY BANNER */
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-5 shadow-md border border-emerald-500/30 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <span>✓</span>
                  <span>Eligibility Report Ready</span>
                </span>
                <span className="font-mono text-[11px] text-slate-300">
                  Ref: {savedOffer.referenceNumber}
                </span>
                <span className="text-[11px] text-teal-300/80">
                  • Evaluated {new Date(savedOffer.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Multi-Bank Loan Eligibility Assessment</span>
                {bestBank && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-600/30 text-emerald-300 border border-emerald-400/30 font-semibold hidden sm:inline-block">
                    Top Match: {bestBank.bankName} @ {bestBank.interestRate}% p.a.
                  </span>
                )}
              </h3>

              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-300 pt-1">
                {bestBank && (
                  <>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Recommended Sanction</span>
                      <strong className="text-emerald-400 text-sm font-black">{formatCurrencyINR(bestBank.recommendedAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Proposed Rate</span>
                      <strong className="text-teal-300 text-sm font-black">{bestBank.interestRate}% p.a.</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Indicative EMI</span>
                      <strong className="text-white text-sm font-black">{formatCurrencyINR(bestBank.proposedEmi)}/mo</strong>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Options</span>
                  <span className="font-bold text-slate-200">{savedOffer.bankOffers?.length || 0} Banks Evaluated</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
              <button
                type="button"
                onClick={() => setShowOfferReportModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
              >
                <span>🖨️</span>
                <span>View & Download Offer PDF</span>
              </button>

              {whatsAppUrl && (
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 active:scale-95 border border-emerald-500/30"
                  title="Share official offer report with customer via WhatsApp"
                >
                  <span>📲</span>
                  <span>WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setShowEligibilityModal(true)}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 active:scale-95 border border-slate-700"
                title="Adjust CIBIL score or requested loan parameters and re-match"
              >
                <span>⚡</span>
                <span>Adjust / Re-match</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* PENDING INITIAL MATCHMAKING BANNER */
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-indigo-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                📂 Documents In Bucket
              </span>
              <span className="text-xs text-indigo-300 font-semibold">Underwriting & Matchmaking Ready</span>
            </div>
            <h3 className="text-base font-black text-white mt-1">Case-Wise Eligibility Assessment & Bank Match</h3>
            <p className="text-xs text-slate-200 mt-0.5">
              Applicant KYC & financial documents are in. Click below to immediately evaluate live bank cards, FOIR headroom, and generate the tentative multi-bank sanction offer report.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowEligibilityModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto active:scale-95"
          >
            <span>⚡</span>
            <span>Match Loan Eligibility & Rates</span>
          </button>
        </div>
      )}

      {/* Matchmaking Modal */}
      <LoanEligibilityMatchModal
        application={application}
        isOpen={showEligibilityModal}
        onClose={() => setShowEligibilityModal(false)}
        onAssigned={() => {
          router.refresh();
        }}
      />

      {/* Official Offer Letter PDF Modal */}
      {savedOffer && (
        <CustomerEligibilityOfferModal
          isOpen={showOfferReportModal}
          onClose={() => setShowOfferReportModal(false)}
          initialData={savedOffer}
          applicationId={application.id}
          applicationToken={application.token}
        />
      )}
    </>
  );
}
