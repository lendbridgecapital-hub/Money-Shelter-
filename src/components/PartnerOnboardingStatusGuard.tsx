'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@/types/db';
import { resubmitPartnerDocsAction } from '@/actions/partnerOnboardingActions';

interface Props {
  partner: User;
  companyName?: string;
}

export default function PartnerOnboardingStatusGuard({
  partner,
  companyName = 'Quickfinsure',
}: Props) {
  const router = useRouter();
  const [panFile, setPanFile] = useState<File | null>(null);
  const [panDocUrl, setPanDocUrl] = useState<string>('');
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [aadhaarDocUrl, setAadhaarDocUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setPanFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPanDocUrl(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      setPanDocUrl('');
    }
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setAadhaarFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setAadhaarDocUrl(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      setAadhaarDocUrl('');
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panDocUrl && !aadhaarDocUrl) {
      setFeedback({ type: 'error', message: 'Please attach at least one updated document file.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await resubmitPartnerDocsAction({
      panDocumentUrl: panDocUrl || undefined,
      aadhaarDocumentUrl: aadhaarDocUrl || undefined,
    });

    setIsSubmitting(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Documents updated successfully!' });
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to submit updated documents.' });
    }
  };

  if (partner.partnerStatus === 'DOCUMENTS_REQUIRED') {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-amber-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shrink-0">
            ⚠️
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Action Required • Document Update Requested
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              Central Support Requested an Update
            </h2>
            <p className="text-xs text-slate-500">
              Please upload the requested documents below to continue with your partner account approval.
            </p>
          </div>
        </div>

        {/* Central Support Note Box */}
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800 block">
            Central Support Manager Remark:
          </span>
          <p className="text-xs text-slate-800 font-medium">
            &ldquo;{partner.approvalRemark || 'Please provide updated, clear copies of your KYC documents.'}&rdquo;
          </p>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleResubmit} className="space-y-4 pt-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Update PAN Card Copy
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handlePanChange}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
              {panFile && (
                <span className="text-[10px] text-emerald-600 block">
                  ✓ Selected: {panFile.name} ({(panFile.size / 1024).toFixed(0)} KB)
                </span>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Update Aadhaar Card Copy
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleAadhaarChange}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
              {aadhaarFile && (
                <span className="text-[10px] text-emerald-600 block">
                  ✓ Selected: {aadhaarFile.name} ({(aadhaarFile.size / 1024).toFixed(0)} KB)
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (!panDocUrl && !aadhaarDocUrl)}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            {isSubmitting ? 'Uploading Documents…' : 'Submit Updated Documents to Central Support'}
          </button>
        </form>
      </div>
    );
  }

  if (partner.partnerStatus === 'REJECTED') {
    return (
      <div className="max-w-xl mx-auto bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm space-y-4">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
          ✕
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
            Application Not Approved
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-2">
            Partner Onboarding Rejected
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Your application was reviewed by Central Support and could not be approved at this time.
          </p>
        </div>

        {partner.approvalRemark && (
          <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl text-left text-xs text-rose-900 space-y-1">
            <span className="text-[10px] font-bold uppercase block text-rose-800">Reason / Remark:</span>
            <p>{partner.approvalRemark}</p>
          </div>
        )}

        <p className="text-xs text-slate-500">
          If you believe this is in error, please contact Central Support at{' '}
          <a href="mailto:support@quickfinsure.com" className="text-emerald-700 underline font-semibold">
            support@quickfinsure.com
          </a>
          .
        </p>
      </div>
    );
  }

  // Default: PENDING_APPROVAL
  return (
    <div className="max-w-xl mx-auto bg-white border border-amber-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm space-y-5">
      <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-2xl">
        ⏳
      </div>

      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
          Under Review by Central Support
        </span>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
          Partner Account Verification in Progress
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Welcome, {partner.name}! Your KYC documents and executed Sub-DSA agreement have landed in the Central Support desk for verification.
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs space-y-2">
        <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
          What happens before customer link sharing is enabled?
        </h4>
        <ul className="space-y-1.5 text-slate-600 text-[11px]">
          <li className="flex items-start gap-2">
            <span className="text-emerald-700 font-bold">1.</span>
            <span>Central Support verifies your PAN & Aadhaar document attachments.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-700 font-bold">2.</span>
            <span>Central Support assigns a dedicated Relationship Manager (RM) from your branch.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-700 font-bold">3.</span>
            <span>Upon approval, your customer loan referral link generator unlocks and your official <strong>Certificate of Association</strong> will be issued.</span>
          </li>
        </ul>
      </div>

      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
        <span>Partner Reference Code: </span>
        <strong className="font-mono text-sm">{partner.partnerCode || 'QFS-PRT-PENDING'}</strong>
      </div>

      <div className="pt-2">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition inline-block"
        >
          View Portal Dashboard
        </Link>
      </div>
    </div>
  );
}
