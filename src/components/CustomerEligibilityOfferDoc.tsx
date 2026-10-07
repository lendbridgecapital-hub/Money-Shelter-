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
      className="bg-white text-slate-900 font-sans p-6 sm:p-10 max-w-4xl mx-auto border border-slate-200/90 rounded-2xl shadow-xl print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-[13px] leading-relaxed relative"
      style={{
        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. CORPORATE LETTERHEAD & DOCUMENT HEADER                                 */}
      {/* ========================================================================= */}
      <div className="border-b-2 border-emerald-600 pb-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-700 via-teal-700 to-slate-900 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
            ⚡
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
              {data.companyName}
            </h1>
            <p className="text-[11px] font-semibold text-emerald-800 tracking-wide uppercase">
              {data.companyTagline}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Email: {data.officialEmail} • Helpdesk: {data.supportPhone}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-[11px] w-full sm:w-auto">
          <div className="text-[10px] uppercase font-bold text-slate-400">Offer Reference</div>
          <div className="font-mono font-black text-slate-900 text-sm tracking-wider">{data.referenceNumber}</div>
          <div className="text-slate-500 mt-0.5">
            Dated: <strong>{generatedDateFormatted}</strong> · Valid Until: <strong>{validUntilFormatted}</strong>
          </div>
        </div>
      </div>

      {/* DOCUMENT TITLE BADGE */}
      <div className="text-center mb-6">
        <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-extrabold uppercase tracking-widest mb-1.5">
          Official In-Principle Eligibility Assessment
        </div>
        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
          TENTATIVE LOAN ELIGIBILITY & MULTI-BANK OFFER REPORT
        </h2>
        <p className="text-xs text-slate-500 max-w-lg mx-auto mt-0.5">
          Prepared exclusively for <strong>{data.customerName}</strong> following institutional policy matrix evaluation.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 2. CUSTOMER FINANCIAL PROFILE & BORROWING PARAMETERS                       */}
      {/* ========================================================================= */}
      <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
          <span>📋 Applicant Profile & Borrowing Parameters</span>
          <span className="text-[10px] text-slate-500 font-normal">Assessed Profile</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Applicant Name</span>
            <strong className="text-slate-900 font-extrabold text-sm">{data.customerName}</strong>
            {data.customerMobile && (
              <span className="text-[11px] text-slate-500 block">{data.customerMobile}</span>
            )}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Loan Category</span>
            <strong className="text-indigo-950 font-extrabold text-sm">{loanLabel}</strong>
            <span className="text-[11px] text-slate-500 block">{data.employmentType.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Requested Loan</span>
            <strong className="text-emerald-700 font-black text-sm">{formatCurrencyINR(data.requestedAmount)}</strong>
            <span className="text-[11px] text-slate-500 block">Requested Amount</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Requested Tenure</span>
            <strong className="text-slate-900 font-extrabold text-sm">{data.requestedTenureYears} Years</strong>
            <span className="text-[11px] text-slate-500 block">({data.requestedTenureMonths} Months)</span>
          </div>
        </div>

        {/* Financial Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 mt-3 border-t border-slate-200/80 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly In-Hand</span>
            <strong className="text-slate-900 font-extrabold">₹{data.monthlyIncome.toLocaleString('en-IN')}</strong>
            <span className="text-[10px] text-slate-500 block">Verified Net Salary</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Obligations</span>
            <strong className={`font-extrabold ${data.existingEmi > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              ₹{data.existingEmi.toLocaleString('en-IN')}/mo
            </strong>
            <span className="text-[10px] text-slate-500 block">Current Ongoing EMIs</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">CIBIL Credit Score</span>
            <strong className="text-indigo-700 font-black">
              {data.cibilScore ? `${data.cibilScore} / 900` : '750+ (Benchmark)'}
            </strong>
            <span className="text-[10px] text-slate-500 block">Prime Rating Band</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Permissible FOIR</span>
            <strong className="text-slate-900 font-extrabold">{data.autoFoirCap}% Cap</strong>
            <span className="text-[10px] text-emerald-700 block font-semibold">
              ₹{data.availableEmiHeadroom.toLocaleString('en-IN')} Headroom
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. OBLIGATION ASSESSMENT & DISPOSABLE INCOME ANALYSIS                     */}
      {/* ========================================================================= */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
        <div className="flex items-center gap-2 mb-1.5 font-extrabold text-blue-900 text-xs">
          <span>📊</span>
          <span>Obligations & Repayment Capacity Evaluation:</span>
        </div>
        <p className="text-slate-700 text-xs leading-relaxed">
          {data.obligationRemarks}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 4. BANK OPTIONS OFFERED FOR YOUR LOAN REQUIREMENT                        */}
      {/* ========================================================================= */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <span>🏦</span>
            <span>Matched Institutional Bank Offers ({data.bankOffers.length} Options Available)</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Ranked by Competitive Interest Rate</span>
        </div>

        {/* COMPARISON TABLE */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                <th className="p-2.5 font-bold">Lending Bank</th>
                <th className="p-2.5 font-bold">Indicative Rate</th>
                <th className="p-2.5 font-bold">Eligible Sanction</th>
                <th className="p-2.5 font-bold">Monthly EMI</th>
                <th className="p-2.5 font-bold">Tenure</th>
                <th className="p-2.5 font-bold">Proc. Fee</th>
                <th className="p-2.5 font-bold">Est. TAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data.bankOffers.map((b, idx) => (
                <tr
                  key={b.cardId}
                  className={b.isBestMatch ? 'bg-emerald-50/60 font-medium' : idx % 2 === 1 ? 'bg-slate-50/50' : ''}
                >
                  <td className="p-2.5">
                    <div className="flex items-center gap-1.5">
                      <strong>{b.bankName}</strong>
                      {b.isBestMatch && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase">
                          ★ Best
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-emerald-700 font-black">
                    {b.interestRate.toFixed(2)}% p.a.
                  </td>
                  <td className="p-2.5 font-bold text-slate-900">
                    {formatCurrencyINR(b.recommendedAmount)}
                  </td>
                  <td className="p-2.5 font-extrabold text-indigo-950">
                    ₹{Math.round(b.proposedEmi).toLocaleString('en-IN')}/m
                  </td>
                  <td className="p-2.5 text-slate-600">
                    {b.tenureYears} Yrs ({b.tenureMonths}m)
                  </td>
                  <td className="p-2.5 text-slate-600">
                    {b.processingFeeText}
                  </td>
                  <td className="p-2.5 text-slate-600">
                    ~{b.tatDays} Days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* DETAILED BANK OFFER CARDS WITH ELIGIBILITY REMARKS */}
        <div className="space-y-3 pt-2">
          {data.bankOffers.map((b, idx) => (
            <div
              key={b.cardId}
              className={`p-4 rounded-xl border ${
                b.isBestMatch
                  ? 'border-emerald-400 bg-emerald-50/20 shadow-xs'
                  : 'border-slate-200 bg-white'
              } break-inside-avoid`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                    {b.bankCode.slice(0, 3)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <span>{b.bankName}</span>
                      {b.isBestMatch && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase">
                          Primary Recommendation
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Product: {loanLabel} • Turnaround Time: ~{b.tatDays} Working Days
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Indicative Rate</span>
                  <span className="text-base font-black text-emerald-700 leading-tight">
                    {b.interestRate.toFixed(2)}% p.a.
                  </span>
                </div>
              </div>

              {/* 3 Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs mb-2.5 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Sanction Capacity</span>
                  <strong className="text-slate-900 font-black">{formatCurrencyINR(b.recommendedAmount)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Estimated EMI</span>
                  <strong className="text-indigo-950 font-black">₹{Math.round(b.proposedEmi).toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Approved Tenure</span>
                  <strong className="text-slate-900 font-bold">{b.tenureYears} Years ({b.tenureMonths}m)</strong>
                </div>
              </div>

              {/* Eligibility Passed Remarks */}
              {b.passRemarks && b.passRemarks.length > 0 && (
                <div className="space-y-1 mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Underwriting Eligibility Remarks:</span>
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
                <div className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-100 flex flex-wrap gap-2">
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
      {/* 5. PRE-SANCTION VERIFICATION & DOCUMENTATION CHECKLIST                     */}
      {/* ========================================================================= */}
      <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs break-inside-avoid">
        <h4 className="font-extrabold text-slate-900 mb-2 flex items-center gap-1.5">
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
          <p className="mt-2.5 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 italic">
            <strong>Advisor Remark:</strong> {data.specialRemarks}
          </p>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. MANDATORY IMPORTANT NOTE & SANCTION DISCLAIMER (PROMINENT HIGHLIGHT)   */}
      {/* ========================================================================= */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 shadow-xs text-amber-950 break-inside-avoid">
        <div className="flex items-center gap-2 mb-2 font-black text-amber-900 text-xs uppercase tracking-wider">
          <span className="text-base">⚠️</span>
          <span>IMPORTANT NOTE & SANCTION DISCLAIMER</span>
        </div>
        <p className="text-xs sm:text-[13px] leading-relaxed font-semibold text-amber-950">
          &ldquo;{data.importantNote}&rdquo;
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 7. FINANCIAL ADVISOR SIGN-OFF & BRANCH CONTACT DETAILS                    */}
      {/* ========================================================================= */}
      <div className="border-t-2 border-slate-200 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs break-inside-avoid">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Your Dedicated Financial Advisor</span>
          <strong className="text-slate-900 text-sm font-extrabold block">{data.advisorName}</strong>
          <span className="text-slate-600 block">{data.advisorRole} • {data.branchName}</span>
          <span className="text-emerald-700 font-bold block mt-0.5">Contact: {data.advisorPhone}</span>
        </div>

        <div className="text-left sm:text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
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
