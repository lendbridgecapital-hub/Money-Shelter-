'use client';

import React, { useState, useEffect } from 'react';
import type { CustomerEligibilityOfferData } from '@/types/policy';
import CustomerEligibilityOfferDoc from './CustomerEligibilityOfferDoc';
import { generateWhatsAppShareUrl } from '@/lib/offerPdfHelper';
import { saveApplicationEligibilityOfferAction } from '@/actions/policyActions';
import { downloadElementAsPdf } from '@/lib/pdfDownloader';

interface CustomerEligibilityOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: CustomerEligibilityOfferData;
  applicationId?: string;
  applicationToken?: string;
}

export default function CustomerEligibilityOfferModal({
  isOpen,
  onClose,
  initialData,
  applicationId,
  applicationToken,
}: CustomerEligibilityOfferModalProps) {
  const [data, setData] = useState<CustomerEligibilityOfferData>(initialData);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEditRemarks, setShowEditRemarks] = useState(false);
  const [customObligationRemark, setCustomObligationRemark] = useState(initialData.obligationRemarks || '');
  const [customSpecialRemark, setCustomSpecialRemark] = useState(initialData.specialRemarks || '');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    setData(initialData);
    setCustomObligationRemark(initialData.obligationRemarks || '');
    setCustomSpecialRemark(initialData.specialRemarks || '');
  }, [initialData]);

  // Automatically persist offer report to application if applicationId is present
  useEffect(() => {
    if (applicationId && isOpen) {
      saveApplicationEligibilityOfferAction(applicationId, data).catch(() => {});
    }
  }, [applicationId, isOpen, data]);

  if (!isOpen) return null;

  const publicShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/offer/eligibility/${applicationToken || initialData.applicationToken || 'sample'}`
    : `https://money-shelter.onrender.com/offer/eligibility/${applicationToken || initialData.applicationToken || 'sample'}`;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const cleanCustomerName = (data.customerName || 'Applicant').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Money_Shelter_Eligibility_Offer_${cleanCustomerName}.pdf`;
    await downloadElementAsPdf('customer-eligibility-pdf', fileName);
    setIsGeneratingPdf(false);
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(publicShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleApplyRemarks = () => {
    const updated = {
      ...data,
      obligationRemarks: customObligationRemark,
      specialRemarks: customSpecialRemark,
    };
    setData(updated);
    setShowEditRemarks(false);
    if (applicationId) {
      saveApplicationEligibilityOfferAction(applicationId, updated).catch(() => {});
    }
  };

  const whatsAppUrl = generateWhatsAppShareUrl(data, publicShareUrl);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-4 max-h-[96vh] flex flex-col print:max-h-none print:border-none print:shadow-none print:m-0 print:rounded-none">
        {/* ========================================================================= */}
        {/* MODAL CONTROL HEADER (HIDDEN IN PRINT)                                    */}
        {/* ========================================================================= */}
        <div className="bg-slate-900 p-4 sm:p-5 text-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-lg border border-emerald-500/30">
              📄
            </span>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Customer Shareable Eligibility Offer PDF</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-600/30 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono">
                  {data.referenceNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Official Multi-Bank Tentative Offer with Eligibility Remarks & Mandatory Disclaimers
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {/* Customize remarks toggle */}
            <button
              type="button"
              onClick={() => setShowEditRemarks(!showEditRemarks)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
            >
              <span>✏️</span>
              <span>{showEditRemarks ? 'Hide Edit' : 'Edit Remarks'}</span>
            </button>

            {/* WhatsApp Share */}
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1.5"
              title="Share formatted offer breakdown directly to customer via WhatsApp"
            >
              <span>📲</span>
              <span>Share WhatsApp</span>
            </a>

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
              title="Copy customer online share link"
            >
              <span>{copiedLink ? '✓ Copied' : '🔗 Link'}</span>
            </button>

            {/* Direct PDF File Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md active:scale-95 transition flex items-center gap-1.5 disabled:opacity-60"
              title="Download official high-resolution A4 PDF letter directly"
            >
              <span>{isGeneratingPdf ? '⏳' : '📥'}</span>
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            {/* Print / Save as PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
              title="Print letter via browser print dialog"
            >
              <span>🖨️</span>
              <span>Print</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold transition ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OPTIONAL REMARKS EDITOR BAR (HIDDEN IN PRINT)                             */}
        {/* ========================================================================= */}
        {showEditRemarks && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 space-y-3 print:hidden animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                <span>✏️</span>
                <span>Customize Remarks on this Customer Document</span>
              </span>
              <button
                type="button"
                onClick={handleApplyRemarks}
                className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-lg transition"
              >
                Apply to Report
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Obligations & Headroom Analysis Remark:
                </label>
                <textarea
                  rows={2}
                  value={customObligationRemark}
                  onChange={(e) => setCustomObligationRemark(e.target.value)}
                  className="w-full p-2 rounded-lg border border-amber-300 text-xs bg-white"
                  placeholder="Enter custom obligation or FOIR remark..."
                />
              </div>
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Special Underwriting Conditions / Advisor Remark:
                </label>
                <textarea
                  rows={2}
                  value={customSpecialRemark}
                  onChange={(e) => setCustomSpecialRemark(e.target.value)}
                  className="w-full p-2 rounded-lg border border-amber-300 text-xs bg-white"
                  placeholder="Enter special documentation or processing remarks..."
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCROLLABLE DOCUMENT CANVAS                                                */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70 print:p-0 print:bg-white print:overflow-visible">
          <CustomerEligibilityOfferDoc data={data} />
        </div>

        {/* ========================================================================= */}
        {/* FOOTER BAR (HIDDEN IN PRINT)                                              */}
        {/* ========================================================================= */}
        <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span>💡 <strong>Tip:</strong> In the print dialog, select <strong>&quot;Save as PDF&quot;</strong> and enable <strong>&quot;Background graphics&quot;</strong> for full color formatting.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
