'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { customerAcceptOfferAction } from '@/actions/workflowActions';
import type { LoanApplication, CompanySettings } from '@/types/db';
import { LOAN_TYPE_LABELS, formatCurrencyINR } from '@/lib/format';

interface Props {
  application: LoanApplication;
  token: string;
  settings: CompanySettings;
}

export default function OfferClient({ application, token, settings }: Props) {
  const [isAccepted, setIsAccepted] = useState(
    application.status === 'CUSTOMER_ACCEPTED' || application.status === 'DISBURSED'
  );
  const [acceptanceRef, setAcceptanceRef] = useState(application.acceptanceLetterRef || '');
  const [acceptedAt, setAcceptedAt] = useState(application.customerAcceptedAt || '');
  const [confirmName, setConfirmName] = useState(application.fullName || '');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // EMI Calculation: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
  const principal = application.approvedAmount || application.loanAmount || 0;
  const annualRate = application.interestRate || 9.5;
  const tenureMonths = application.tenureMonths || 60;
  const monthlyRate = annualRate / (12 * 100);

  const calculatedEmi = Math.round(
    monthlyRate > 0 && tenureMonths > 0
      ? (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
          (Math.pow(1 + monthlyRate, tenureMonths) - 1)
      : 0
  );

  async function handleAccept() {
    if (!agreedTerms) {
      setError('Please agree to the loan terms and conditions to proceed.');
      return;
    }
    if (!confirmName.trim()) {
      setError('Please confirm your full legal name.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await customerAcceptOfferAction(token, confirmName.trim());
      if (!res.ok) {
        setError(res.error || 'Failed to accept loan offer.');
      } else {
        setIsAccepted(true);
        if (res.acceptanceRef) {
          setAcceptanceRef(res.acceptanceRef);
        }
        setAcceptedAt(new Date().toISOString());
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold text-2xl shadow-md mb-3">
            {settings.companyName.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{settings.companyName}</h1>
          <p className="text-sm text-slate-500 mt-1">Official Digital Loan Sanction & Offer Acceptance</p>
        </div>

        {/* If already accepted or just accepted -> Display Acceptance Letter */}
        {isAccepted ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
            {/* Sanction Letter Head */}
            <div className="bg-gradient-to-r from-emerald-600 to-slate-900 p-6 text-white text-center sm:text-left sm:flex sm:items-center sm:justify-between">
              <div>
                <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                  ✓ Officially Accepted Offer
                </span>
                <h2 className="text-2xl font-bold">Loan Sanction Acceptance Letter</h2>
                <p className="text-emerald-100 text-sm mt-0.5">
                  Reference: <span className="font-mono font-bold">{acceptanceRef || 'QFS-SANCT-VERIFIED'}</span>
                </p>
              </div>
              <div className="mt-4 sm:mt-0 text-center sm:text-right">
                <span className="text-xs text-emerald-200 block">Accepted On</span>
                <span className="text-sm font-semibold">
                  {acceptedAt ? new Date(acceptedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
                </span>
              </div>
            </div>

            {/* Letter Body */}
            <div className="p-6 sm:p-8 space-y-6 text-slate-800">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs uppercase text-slate-400 font-medium">Lending Partner Bank</p>
                  <p className="text-lg font-bold text-slate-900">{application.bankName || 'Partner Bank'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-slate-400 font-medium">Applicant Name</p>
                  <p className="text-lg font-bold text-slate-900">{confirmName || application.fullName || 'Applicant'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Dear <strong>{confirmName || application.fullName || 'Customer'}</strong>,
                </p>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                  We are pleased to confirm that your loan application has been formally sanctioned by{' '}
                  <strong>{application.bankName || 'our lending partner bank'}</strong> through {settings.companyName}.
                  By accepting this sanction letter, you have affirmed the key financial parameters outlined below:
                </p>
              </div>

              {/* Sanction Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Approved Amount</span>
                  <span className="text-lg font-extrabold text-emerald-700 block mt-1">
                    {formatCurrencyINR(principal)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Interest Rate</span>
                  <span className="text-lg font-extrabold text-emerald-600 block mt-1">
                    {annualRate}% <span className="text-xs font-normal text-slate-500">p.a.</span>
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Tenure</span>
                  <span className="text-lg font-bold text-slate-800 block mt-1">
                    {tenureMonths} <span className="text-xs font-normal text-slate-500">Months</span>
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Est. Monthly EMI</span>
                  <span className="text-lg font-extrabold text-indigo-700 block mt-1">
                    {formatCurrencyINR(calculatedEmi)}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-950 space-y-1">
                <p className="font-semibold text-emerald-950">Next Steps & Disbursement Notice:</p>
                <p>
                  • This signed Acceptance Letter has been sent automatically to {settings.companyName} Operations.
                </p>
                <p>
                  • The Operations team will submit this letter along with your loan file to {application.bankName || 'the Bank'} to disburse your funds.
                </p>
                <p>
                  • You will receive SMS & WhatsApp confirmation once the funds are credited to your registered bank account.
                </p>
              </div>

              {/* Digital Signature Badge */}
              <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Digitally Verified & Accepted</p>
                    <p className="text-xs text-slate-500">Signer: {confirmName || application.fullName} • IP & Timestamp Logged</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 print:hidden">
                  <button
                    onClick={() => window.print()}
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Acceptance Letter
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : application.status === 'APPROVED' ? (
          /* Offer Review & Acceptance Form */
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-slate-900 p-6 text-white text-center">
              <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                Sanction Letter Ready
              </span>
              <h2 className="text-2xl font-bold">Review Your Loan Sanction Offer</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Offered by <strong>{application.bankName || 'Partner Bank'}</strong>
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Applicant & Loan Profile */}
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 block">Applicant</span>
                  <span className="text-sm font-bold text-slate-800">{application.fullName || 'Applicant'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Facility Type</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {application.loanType ? LOAN_TYPE_LABELS[application.loanType] : 'Loan'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Application ID</span>
                  <span className="text-xs font-mono font-bold text-slate-600">#{application.id.slice(-6)}</span>
                </div>
              </div>

              {/* Sanction Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-xl">
                  <span className="text-xs text-emerald-800 font-semibold block">Sanction Amount</span>
                  <span className="text-xl font-black text-emerald-700 block mt-1">
                    {formatCurrencyINR(principal)}
                  </span>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-xl">
                  <span className="text-xs text-emerald-800 font-semibold block">Interest Rate</span>
                  <span className="text-xl font-black text-emerald-600 block mt-1">
                    {annualRate}% <span className="text-xs font-normal">p.a.</span>
                  </span>
                </div>
                <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-xl">
                  <span className="text-xs text-indigo-800 font-semibold block">Loan Tenure</span>
                  <span className="text-xl font-black text-indigo-700 block mt-1">
                    {tenureMonths} <span className="text-xs font-normal">Mo</span>
                  </span>
                </div>
                <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-xl">
                  <span className="text-xs text-purple-800 font-semibold block">Monthly EMI</span>
                  <span className="text-xl font-black text-purple-700 block mt-1">
                    {formatCurrencyINR(calculatedEmi)}
                  </span>
                </div>
              </div>

              {/* Confirmation and Acceptance Controls */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Confirm Your Full Legal Name (As in Aadhaar/PAN)
                  </label>
                  <input
                    type="text"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Enter full legal name"
                  />
                </div>

                <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                  />
                  <span className="text-xs text-slate-600 leading-normal">
                    I confirm that I have reviewed the sanctioned loan terms (amount: {formatCurrencyINR(principal)}, rate: {annualRate}%, EMI: {formatCurrencyINR(calculatedEmi)}), and I give my express consent to accept this offer and authorize {settings.companyName} to generate the Sanction Acceptance Letter to disburse the funds into my bank account.
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleAccept}
                disabled={loading || !agreedTerms}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating Acceptance Letter…
                  </>
                ) : (
                  'Accept Sanction Offer & Generate Acceptance Letter'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Application is under review or in another stage */
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              📋
            </div>
            <h2 className="text-xl font-bold text-slate-900">Application Under Process</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Your loan application is currently with our processing team and partner bank. Once your sanction terms are finalized, your official offer letter and acceptance button will appear on this page.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
              Current Stage: <span className="font-bold">{application.status}</span>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-slate-400">
          <p>{settings.footerText || `© 2026 ${settings.companyName}. All rights reserved.`}</p>
        </div>
      </div>
    </div>
  );
}
