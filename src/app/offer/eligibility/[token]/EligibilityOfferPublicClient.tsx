'use client';

import React, { useState } from 'react';
import type { CustomerEligibilityOfferData } from '@/types/policy';
import CustomerEligibilityOfferDoc from '@/components/CustomerEligibilityOfferDoc';
import { downloadElementAsPdf } from '@/lib/pdfDownloader';

interface Props {
  offerData: CustomerEligibilityOfferData;
}

export default function EligibilityOfferPublicClient({ offerData }: Props) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const cleanCustomerName = (offerData.customerName || 'Applicant').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Money_Shelter_Eligibility_Offer_${cleanCustomerName}.pdf`;
      await downloadElementAsPdf('customer-eligibility-pdf', fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      // Fallback to window.print if html2canvas/jspdf fails
      if (typeof window !== 'undefined') {
        window.print();
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const advisorPhoneClean = offerData.advisorPhone ? offerData.advisorPhone.replace(/[^0-9+]/g, '') : '';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsAppText = encodeURIComponent(
    `Hello ${offerData.advisorName || 'Money Shelter Advisor'}, I am reviewing my loan eligibility offer (${offerData.referenceNumber}) for ${offerData.customerName}. Link: ${currentUrl}`
  );
  const whatsAppUrl = advisorPhoneClean
    ? `https://wa.me/${advisorPhoneClean.replace('+', '')}?text=${whatsAppText}`
    : `https://wa.me/?text=${whatsAppText}`;

  return (
    <div className="min-h-screen bg-slate-100/90 py-4 sm:py-8 px-2 sm:px-6 lg:px-8 print:p-0 print:bg-white">
      {/* ========================================================================= */}
      {/* TOP FLOATING ACTION BAR FOR CUSTOMERS (HIDDEN IN PRINT)                   */}
      {/* ========================================================================= */}
      <div className="max-w-4xl mx-auto mb-4 sm:mb-6 sticky top-2 z-40 print:hidden">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 sm:p-4 text-white shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xl shrink-0 shadow-md">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-white">
                  Loan Eligibility Assessment
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase">
                  Tentative Offer
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Official Multi-Bank Offer Letter • Ref: <span className="text-slate-200 font-mono font-semibold">{offerData.referenceNumber}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 justify-end flex-wrap sm:flex-nowrap">
            {advisorPhoneClean && (
              <a
                href={`tel:${advisorPhoneClean}`}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 active:scale-95"
                title="Call your loan advisor"
              >
                <span>📞</span>
                <span className="hidden xs:inline">Call</span>
              </a>
            )}

            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold border border-emerald-600/50 transition flex items-center gap-1.5 active:scale-95"
              title="Chat on WhatsApp"
            >
              <span>💬</span>
              <span className="hidden xs:inline">WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="hidden md:flex px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition items-center gap-1.5 active:scale-95"
              title="Print document directly"
            >
              <span>🖨️</span>
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white text-xs font-black shadow-lg shadow-emerald-950/20 active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              {isGeneratingPdf ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Download PDF</span>
                </>
              )}
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
      <div className="max-w-4xl mx-auto mt-6 text-center text-xs text-slate-500 print:hidden pb-12">
        <p>
          Need to submit your KYC / Income documents or have questions regarding this assessment?
        </p>
        <p className="font-semibold text-slate-700 mt-1">
          Call your Advisor {offerData.advisorName} at{' '}
          <a href={`tel:${advisorPhoneClean}`} className="text-emerald-700 font-bold hover:underline">
            {offerData.advisorPhone}
          </a>{' '}
          ({offerData.branchName})
        </p>
      </div>
    </div>
  );
}
