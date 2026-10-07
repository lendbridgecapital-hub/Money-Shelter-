'use client';

import React from 'react';
import type { CustomerEligibilityOfferData } from '@/types/policy';
import { LOAN_TYPE_LABELS, formatCurrencyINR } from '@/lib/format';

interface CustomerEligibilityOfferDocProps {
  data: CustomerEligibilityOfferData;
}

export default function CustomerEligibilityOfferDoc({ data }: CustomerEligibilityOfferDocProps) {
  const loanLabel = LOAN_TYPE_LABELS[data.loanType] || data.loanType;
  const generatedDateFormatted = new Date(data.generatedAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const validUntilFormatted = new Date(data.validUntil).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      id="customer-eligibility-pdf"
      className="bg-white text-slate-900 font-sans p-4 sm:p-10 max-w-4xl mx-auto border border-slate-200/90 rounded-2xl shadow-xl text-[12.5px] sm:text-[13px] leading-relaxed relative print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none"
      style={{
        boxShadow: '0 12px 36px -10px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. OFFICIAL CORPORATE LETTERHEAD (MATCHES USER SPEC EXACTLY)             */}
      {/* ========================================================================= */}
      <div className="border-b-2 border-emerald-600 pb-4 sm:pb-5 mb-5 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          {/* Logo & Company Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 via-teal-700 to-slate-900 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0 border border-emerald-600/30">
              <span className="text-amber-400 drop-shadow-xs">⚡</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 uppercase leading-tight">
                {data.companyName || 'QUICKFINSURE SOLUTIONS'}
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold text-emerald-800 tracking-wider uppercase mt-0.5">
                {data.companyTagline || 'LICENSED DSA PARTNER & MULTI-BANK SYNDICATION NETWORK'}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                Email: {data.officialEmail || 'support@quickfinsure.com'} • Helpdesk: {data.supportPhone || '+91 98765 43210'}
              </p>
            </div>
          </div>

          {/* Offer Reference Badge Box */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 text-left sm:text-right w-full sm:w-auto shadow-2xs">
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              OFFER REFERENCE
            </div>
            <div className="font-mono font-black text-slate-900 text-xs sm:text-sm tracking-wider">
              {data.referenceNumber}
            </div>
            <div className="text-slate-600 text-[10px] sm:text-[11px] mt-0.5">
              Dated: <strong className="text-slate-900">{generatedDateFormatted}</strong> · Valid Until: <strong className="text-slate-900">{validUntilFormatted}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DOCUMENT SUB-HEADER & ASSESSMENT TITLE                                 */}
      {/* ========================================================================= */}
      <div className="text-center mb-5 sm:mb-6">
        <div className="inline-block px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest mb-1.5 shadow-2xs">
          OFFICIAL IN-PRINCIPLE ELIGIBILITY ASSESSMENT
        </div>
        <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight uppercase">
          TENTATIVE LOAN ELIGIBILITY & MULTI-BANK OFFER REPORT
        </h2>
        <p className="text-[11px] sm:text-xs text-slate-500 max-w-lg mx-auto mt-0.5">
          Prepared exclusively for <strong className="text-slate-900">{data.customerName}</strong> following institutional policy matrix evaluation.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 3. APPLICANT PROFILE & BORROWING PARAMETERS                               */}
      {/* ========================================================================= */}
      <div className="mb-5 sm:mb-6 bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 sm:p-5">
        <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span>📋</span>
            <span>Applicant Profile & Financial Snapshot</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">Verified Inputs</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Applicant Name</span>
            <strong className="text-slate-900 font-black text-xs sm:text-sm block truncate">{data.customerName}</strong>
            {data.customerMobile && (
              <span className="text-[10px] text-slate-500 block truncate">{data.customerMobile}</span>
            )}
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Loan Facility</span>
            <strong className="text-indigo-950 font-black text-xs sm:text-sm block">{loanLabel}</strong>
            <span className="text-[10px] text-slate-500 block truncate">{data.employmentType.replace(/_/g, ' ')}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Requested Loan</span>
            <strong className="text-emerald-700 font-black text-xs sm:text-sm block">{formatCurrencyINR(data.requestedAmount)}</strong>
            <span className="text-[10px] text-slate-500 block">Requested Amount</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Requested Tenure</span>
            <strong className="text-slate-900 font-black text-xs sm:text-sm block">{data.requestedTenureYears} Years</strong>
            <span className="text-[10px] text-slate-500 block">({data.requestedTenureMonths} Months)</span>
          </div>
        </div>

        {/* Second Row: Financial Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2.5 mt-2.5 border-t border-slate-200/80 text-xs">
          <div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Monthly Income</span>
            <strong className="text-slate-900 font-black">₹{data.monthlyIncome.toLocaleString('en-IN')}</strong>
            <span className="text-[10px] text-slate-500 block">Net In-Hand</span>
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Active Obligations</span>
            <strong className={`font-black ${data.existingEmi > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              ₹{data.existingEmi.toLocaleString('en-IN')}/mo
            </strong>
            <span className="text-[10px] text-slate-500 block">Current EMIs</span>
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Assessed CIBIL</span>
            <strong className="text-indigo-700 font-black">
              {data.cibilScore ? `${data.cibilScore} / 900` : '750+ (Prime)'}
            </strong>
            <span className="text-[10px] text-slate-500 block">Credit Rating</span>
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Permissible FOIR</span>
            <strong className="text-slate-900 font-black">{data.autoFoirCap}% Cap</strong>
            <span className="text-[10px] text-emerald-700 block font-bold">
              ₹{data.availableEmiHeadroom.toLocaleString('en-IN')} Headroom
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. OBLIGATIONS & DISPOSABLE INCOME ANALYSIS                                */}
      {/* ========================================================================= */}
      <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs">
        <div className="flex items-center gap-2 mb-1.5 font-black text-blue-900 text-xs">
          <span>📊</span>
          <span>Obligations & Repayment Capacity Evaluation:</span>
        </div>
        <p className="text-slate-700 text-xs leading-relaxed">
          {data.obligationRemarks}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 5. MATCHED BANK OPTIONS OFFERED (COMPARISON TABLE + CARDS)                */}
      {/* ========================================================================= */}
      <div className="mb-5 sm:mb-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <span>🏦</span>
            <span>Matched Institutional Bank Offers ({data.bankOffers.length} Options)</span>
          </h3>
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Ranked by Competitive Interest Rate</span>
        </div>

        {/* COMPARISON TABLE */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] sm:text-[11px] uppercase tracking-wider">
                <th className="p-2 sm:p-2.5 font-bold">Lending Bank</th>
                <th className="p-2 sm:p-2.5 font-bold">Indicative Rate</th>
                <th className="p-2 sm:p-2.5 font-bold">Sanction Limit</th>
                <th className="p-2 sm:p-2.5 font-bold">Monthly EMI</th>
                <th className="p-2 sm:p-2.5 font-bold">Tenure</th>
                <th className="p-2 sm:p-2.5 font-bold">Proc. Fee</th>
                <th className="p-2 sm:p-2.5 font-bold">TAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data.bankOffers.map((b, idx) => (
                <tr
                  key={b.cardId}
                  className={b.isBestMatch ? 'bg-emerald-50/70 font-semibold' : idx % 2 === 1 ? 'bg-slate-50/50' : ''}
                >
                  <td className="p-2 sm:p-2.5">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-900">{b.bankName}</strong>
                      {b.isBestMatch && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase">
                          ★ Best
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 sm:p-2.5 text-emerald-700 font-black">
                    {b.interestRate.toFixed(2)}% p.a.
                  </td>
                  <td className="p-2 sm:p-2.5 font-black text-slate-900">
                    {formatCurrencyINR(b.recommendedAmount)}
                  </td>
                  <td className="p-2 sm:p-2.5 font-black text-indigo-950">
                    ₹{Math.round(b.proposedEmi).toLocaleString('en-IN')}/m
                  </td>
                  <td className="p-2 sm:p-2.5 text-slate-600">
                    {b.tenureYears} Yrs ({b.tenureMonths}m)
                  </td>
                  <td className="p-2 sm:p-2.5 text-slate-600">
                    {b.processingFeeText}
                  </td>
                  <td className="p-2 sm:p-2.5 text-slate-600">
                    ~{b.tatDays} Days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* DETAILED BANK CARDS WITH ELIGIBILITY REMARKS */}
        <div className="space-y-3 pt-1">
          {data.bankOffers.map((b) => (
            <div
              key={b.cardId}
              className={`p-3.5 sm:p-4 rounded-2xl border ${
                b.isBestMatch
                  ? 'border-emerald-400 bg-emerald-50/25 shadow-xs ring-1 ring-emerald-300'
                  : 'border-slate-200 bg-white'
              } break-inside-avoid`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                    {b.bankCode.slice(0, 3)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <span>{b.bankName}</span>
                      {b.isBestMatch && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider">
                          Primary Recommendation
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] text-slate-500 block">
                      Product: {loanLabel} • Turnaround Time: ~{b.tatDays} Working Days
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right bg-emerald-50/60 sm:bg-transparent p-2 sm:p-0 rounded-xl sm:rounded-none">
                  <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold block">Indicative Interest Rate</span>
                  <span className="text-sm sm:text-base font-black text-emerald-700 leading-tight">
                    {b.interestRate.toFixed(2)}% p.a.
                  </span>
                </div>
              </div>

              {/* 3 Core Metrics Tile */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50/90 p-2 sm:p-2.5 rounded-xl border border-slate-100 text-xs mb-2.5 text-center">
                <div>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold">Sanction Capacity</span>
                  <strong className="text-slate-900 font-black text-xs sm:text-sm">{formatCurrencyINR(b.recommendedAmount)}</strong>
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold">Estimated EMI</span>
                  <strong className="text-indigo-950 font-black text-xs sm:text-sm">₹{Math.round(b.proposedEmi).toLocaleString('en-IN')}/m</strong>
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold">Approved Tenure</span>
                  <strong className="text-slate-900 font-black text-xs sm:text-sm">{b.tenureYears} Years ({b.tenureMonths}m)</strong>
                </div>
              </div>

              {/* Underwriting Eligibility Remarks */}
              {b.passRemarks && b.passRemarks.length > 0 && (
                <div className="space-y-1 mb-2">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase block">Underwriting Eligibility Remarks:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-emerald-800">
                    {b.passRemarks.map((remark, rIdx) => (
                      <div key={rIdx} className="flex items-start gap-1">
                        <span className="text-emerald-600 font-bold shrink-0">✓</span>
                        <span>{remark}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Features & USPs */}
              {b.specialFeatures && b.specialFeatures.length > 0 && (
                <div className="text-[10px] sm:text-[11px] text-slate-600 pt-1.5 border-t border-slate-100 flex flex-wrap gap-1.5 sm:gap-2">
                  <span className="font-bold text-slate-700">Bank USPs:</span>
                  {b.specialFeatures.map((feat, fIdx) => (
                    <span key={fIdx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      • {feat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. PRE-SANCTION VERIFICATION & DOCUMENTATION CHECKLIST                     */}
      {/* ========================================================================= */}
      <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs break-inside-avoid">
        <h4 className="font-black text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
          <span>📁</span>
          <span>Required Verification Checklist for Final Bank Sanction:</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
          <div className="flex items-start gap-1.5">
            <span className="text-emerald-600 font-bold">1.</span>
            <span>Latest 3 months Salary Slips (or 2 years ITR with computation & audit report for business).</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-emerald-600 font-bold">2.</span>
            <span>Latest 6 months Bank Account Statements where salary/business revenues are credited.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-emerald-600 font-bold">3.</span>
            <span>PAN Card, Aadhaar Card, and Current Residence Proof (Utility bill / Rent agreement).</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-emerald-600 font-bold">4.</span>
            <span>Existing loan sanction letters & track records (if balance transfer or FOIR deduction needed).</span>
          </div>
        </div>
        {data.specialRemarks && (
          <p className="mt-2.5 pt-2 border-t border-slate-200 text-[11px] text-slate-600 italic">
            <strong>Advisor Remark:</strong> {data.specialRemarks}
          </p>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7. MANDATORY IMPORTANT NOTE & SANCTION DISCLAIMER (PROMINENT HIGHLIGHT)   */}
      {/* ========================================================================= */}
      <div className="mb-5 sm:mb-6 p-4 sm:p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 shadow-2xs text-amber-950 break-inside-avoid">
        <div className="flex items-center gap-2 mb-1.5 font-black text-amber-900 text-xs uppercase tracking-wider">
          <span className="text-base">⚠️</span>
          <span>IMPORTANT NOTE & SANCTION DISCLAIMER</span>
        </div>
        <p className="text-xs sm:text-[13px] leading-relaxed font-semibold text-amber-950">
          &ldquo;{data.importantNote}&rdquo;
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 8. FINANCIAL ADVISOR SIGN-OFF & BRANCH CONTACT DETAILS                    */}
      {/* ========================================================================= */}
      <div className="border-t-2 border-slate-200 pt-4 sm:pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs break-inside-avoid">
        <div>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">Your Dedicated Financial Advisor</span>
          <strong className="text-slate-900 text-sm font-black block">{data.advisorName}</strong>
          <span className="text-slate-600 block">{data.advisorRole} • {data.branchName}</span>
          <span className="text-emerald-700 font-bold block mt-0.5">Contact: {data.advisorPhone}</span>
        </div>

        <div className="text-left sm:text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
            <span>🛡️</span>
            <span>Digitally Verified by Quickfinsure Sourcing Engine</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Generated on {generatedDateFormatted} • System Case ID #{data.referenceNumber}
          </p>
        </div>
      </div>
    </div>
  );
}
