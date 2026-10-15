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
    <div id="customer-eligibility-pdf" className="space-y-6 print:space-y-0">
      {/* ========================================================================= */}
      {/* ============================== PAGE 1 =================================== */}
      {/* ========================================================================= */}
      <div
        id="pdf-page-1"
        className="pdf-page bg-white text-slate-900 font-sans p-5 sm:p-9 max-w-4xl mx-auto border border-slate-200/90 rounded-2xl shadow-xl text-[12.5px] leading-relaxed relative flex flex-col justify-between print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none"
        style={{
          boxShadow: '0 12px 36px -10px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div>
          {/* ========================================================================= */}
          {/* 1. OFFICIAL CORPORATE LETTERHEAD (HEADER)                                 */}
          {/* ========================================================================= */}
          <div className="border-b-2 border-emerald-600 pb-3 sm:pb-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Logo & Company Title */}
              <div className="flex items-center">
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #065f46 0%, #0f766e 60%, #0f172a 100%)',
                    color: '#ffffff',
                    fontSize: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    flexShrink: 0,
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                >
                  <span style={{ color: '#fbbf24', lineHeight: 1 }}>⚡</span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase leading-none">
                    {data.companyName || 'MONEY SHELTER PVT. LTD.'}
                  </h1>
                  <p className="text-[10px] font-bold text-emerald-800 tracking-wider uppercase mt-1">
                    {data.companyTagline || 'WHERE MONEY MEETS TRUST • MULTI-BANK SYNDICATION NETWORK'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Email: {data.officialEmail || 'info@moneyshelter.in'} • Helpdesk: {data.supportPhone || '+91 9049002010'}
                  </p>
                </div>
              </div>

              {/* Offer Reference Badge Box */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  textAlign: 'left',
                }}
                className="w-full sm:w-auto"
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  OFFER REFERENCE
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '13px', color: '#0f172a', letterSpacing: '0.05em', lineHeight: '1.2' }}>
                  {data.referenceNumber}
                </div>
                <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', lineHeight: '1.2' }}>
                  Dated: <strong style={{ color: '#0f172a' }}>{generatedDateFormatted}</strong> · Valid Until: <strong style={{ color: '#0f172a' }}>{validUntilFormatted}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. DOCUMENT SUB-HEADER & CENTERED PILL BADGE                              */}
          {/* ========================================================================= */}
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <svg
                width="360"
                height="24"
                viewBox="0 0 360 24"
                style={{
                  display: 'inline-block',
                  maxWidth: '100%',
                  height: 'auto',
                  verticalAlign: 'middle',
                }}
              >
                <rect
                  x="0.75"
                  y="0.75"
                  width="358.5"
                  height="22.5"
                  rx="11.25"
                  fill="#ecfdf5"
                  stroke="#6ee7b7"
                  strokeWidth="1.5"
                />
                <text
                  x="180"
                  y="12"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#065f46"
                  fontSize="9.5"
                  fontWeight="800"
                  letterSpacing="0.08em"
                  fontFamily="Arial, Helvetica, sans-serif"
                >
                  OFFICIAL IN-PRINCIPLE ELIGIBILITY ASSESSMENT
                </text>
              </svg>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase leading-snug">
              TENTATIVE LOAN ELIGIBILITY & MULTI-BANK OFFER REPORT
            </h2>
            <p className="text-[11px] text-slate-500 max-w-lg mx-auto mt-0.5">
              Prepared exclusively for <strong className="text-slate-900">{data.customerName}</strong> following institutional policy matrix evaluation.
            </p>
          </div>

          {/* ========================================================================= */}
          {/* 3. APPLICANT PROFILE & FINANCIAL SNAPSHOT (ZERO OVERLAPPING TEXT)         */}
          {/* ========================================================================= */}
          <div className="mb-4 bg-slate-50/90 border border-slate-200 rounded-2xl p-3 sm:p-4">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1.5 mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>📋</span>
                <span>Applicant Profile & Financial Snapshot</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Verified Inputs</span>
            </div>

            {/* Row 1: Basic Information */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* Applicant Name */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  minHeight: '66px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px', lineHeight: '1' }}>
                  Applicant Name
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', lineHeight: '1.2', wordBreak: 'break-word' }}>
                  {data.customerName}
                </div>
                {data.customerMobile && (
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginTop: '3px', lineHeight: '1' }}>
                    {data.customerMobile}
                  </div>
                )}
              </div>

              {/* Loan Facility */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  minHeight: '66px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px', lineHeight: '1' }}>
                  Loan Facility
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#1e1b4b', lineHeight: '1.2' }}>
                  {loanLabel}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginTop: '3px', lineHeight: '1', textTransform: 'capitalize' }}>
                  {data.employmentType.replace(/_/g, ' ').toLowerCase()}
                </div>
              </div>

              {/* Requested Loan */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  minHeight: '66px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px', lineHeight: '1' }}>
                  Requested Loan
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#047857', lineHeight: '1.2' }}>
                  {formatCurrencyINR(data.requestedAmount)}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px', lineHeight: '1' }}>
                  Requested Amount
                </div>
              </div>

              {/* Requested Tenure */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  minHeight: '66px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px', lineHeight: '1' }}>
                  Requested Tenure
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', lineHeight: '1.2' }}>
                  {data.requestedTenureYears} Years
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px', lineHeight: '1' }}>
                  ({data.requestedTenureMonths} Months)
                </div>
              </div>
            </div>

            {/* Row 2: Financial Criteria */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 mt-2 border-t border-slate-200/80 text-xs">
              {/* Monthly Income */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  minHeight: '66px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px', lineHeight: '1' }}>
                  Monthly Income
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', lineHeight: '1.2' }}>
                  ₹{data.monthlyIncome.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px', lineHeight: '1' }}>
                  Net In-Hand
                </div>
              </div>

              {/* Active Obligations */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  minHeight: '66px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px', lineHeight: '1' }}>
                  Active Obligations
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: data.existingEmi > 0 ? '#b45309' : '#047857', lineHeight: '1.2' }}>
                  ₹{data.existingEmi.toLocaleString('en-IN')}/mo
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px', lineHeight: '1' }}>
                  Current EMIs
                </div>
              </div>

              {/* Assessed CIBIL */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  minHeight: '66px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px', lineHeight: '1' }}>
                  Assessed CIBIL
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#4338ca', lineHeight: '1.2' }}>
                  {data.cibilScore ? `${data.cibilScore} / 900` : '750+ (Prime)'}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px', lineHeight: '1' }}>
                  Credit Rating
                </div>
              </div>

              {/* Permissible FOIR */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  minHeight: '66px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px', lineHeight: '1' }}>
                  Permissible FOIR
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', lineHeight: '1.2' }}>
                  {data.autoFoirCap}% Cap
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#047857', marginTop: '3px', lineHeight: '1' }}>
                  ₹{data.availableEmiHeadroom.toLocaleString('en-IN')} Headroom
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. OBLIGATIONS & DISPOSABLE INCOME ANALYSIS                                */}
          {/* ========================================================================= */}
          <div className="mb-4 p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs">
            <div className="flex items-center gap-1.5 mb-1 font-black text-blue-900 text-xs">
              <span>📊</span>
              <span>Obligations & Repayment Capacity Evaluation:</span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed">
              {data.obligationRemarks}
            </p>
            {data.bankOffers.some((b) => b.status === 'PARTIALLY_ELIGIBLE' || (b.specialRemarks && b.specialRemarks.length > 0)) && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '9px 16px',
                  backgroundColor: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#9f1239',
                  lineHeight: '1.5',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '13px', marginRight: '5px', verticalAlign: '-1px' }}>⚠️</span>
                <strong>FOIR Cap Policy Notice:</strong> Select institutional lenders (such as {data.bankOffers.filter((b) => b.status === 'PARTIALLY_ELIGIBLE').map((b) => b.bankName).join(', ') || 'certain banks'}) have capped loan sanctions to comply with their strict 60% FOIR threshold on declared monthly income. The recommended amount reflects the maximum permissible borrowing limit to guarantee debt servicing safety.
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 5. MATCHED BANK OPTIONS (COMPARISON TABLE + DETAILED CARDS)               */}
          {/* ========================================================================= */}
          <div className="mb-3 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>🏦</span>
                <span>Matched Institutional Bank Offers ({data.bankOffers.length} Options)</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">Ranked by Competitive Interest Rate</span>
            </div>

            {/* COMPARISON TABLE */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
                    <th className="p-2 font-bold">Lending Bank</th>
                    <th className="p-2 font-bold">Indicative Rate</th>
                    <th className="p-2 font-bold">Sanction Limit</th>
                    <th className="p-2 font-bold">Monthly EMI</th>
                    <th className="p-2 font-bold">Tenure</th>
                    <th className="p-2 font-bold">Proc. Fee</th>
                    <th className="p-2 font-bold">TAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {data.bankOffers.map((b, idx) => (
                    <tr
                      key={b.cardId}
                      className={b.isBestMatch ? 'bg-emerald-50/70 font-semibold' : idx % 2 === 1 ? 'bg-slate-50/50' : ''}
                    >
                      <td className="p-2">
                        <div className="flex items-center flex-wrap gap-1">
                          <strong className="text-slate-900">{b.bankName}</strong>
                          {b.isBestMatch && (
                            <svg
                              width="72"
                              height="18"
                              viewBox="0 0 72 18"
                              style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                marginLeft: '6px',
                                flexShrink: 0,
                              }}
                            >
                              <rect x="0" y="0" width="72" height="18" rx="9" fill="#059669" />
                              <text
                                x="36"
                                y="9"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#ffffff"
                                fontSize="8.5"
                                fontWeight="800"
                                letterSpacing="0.04em"
                                fontFamily="Arial, Helvetica, sans-serif"
                              >
                                ★ BEST
                              </text>
                            </svg>
                          )}
                          {b.status === 'PARTIALLY_ELIGIBLE' && (
                            <svg
                              width="84"
                              height="18"
                              viewBox="0 0 84 18"
                              style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                marginLeft: '6px',
                                flexShrink: 0,
                              }}
                            >
                              <rect x="0.5" y="0.5" width="83" height="17" rx="8.5" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1" />
                              <text
                                x="42"
                                y="9"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#b45309"
                                fontSize="8"
                                fontWeight="800"
                                letterSpacing="0.04em"
                                fontFamily="Arial, Helvetica, sans-serif"
                              >
                                ⚠ PARTIAL
                              </text>
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-emerald-700 font-black">
                        {b.interestRate.toFixed(2)}% p.a.
                      </td>
                      <td className="p-2 font-black text-slate-900">
                        <div>{formatCurrencyINR(b.recommendedAmount)}</div>
                        {b.status === 'PARTIALLY_ELIGIBLE' && (
                          <div style={{ fontSize: '9px', fontWeight: 700, color: '#b45309', lineHeight: 1, marginTop: '2px' }}>
                            (FOIR Adjusted Cap)
                          </div>
                        )}
                      </td>
                      <td className="p-2 font-black text-indigo-950">
                        ₹{Math.round(b.proposedEmi).toLocaleString('en-IN')}/m
                      </td>
                      <td className="p-2 text-slate-600">
                        {b.tenureYears} Yrs ({b.tenureMonths}m)
                      </td>
                      <td className="p-2 text-slate-600">
                        {b.processingFeeText}
                      </td>
                      <td className="p-2 text-slate-600">
                        ~{b.tatDays} Days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* DETAILED BANK CARDS (VERTICALLY CENTERED LOGOS & TITLES) */}
            <div className="space-y-2.5 pt-1">
              {data.bankOffers.map((b) => (
                <div
                  key={b.cardId}
                  className={`p-3 rounded-2xl border ${
                    b.isBestMatch
                      ? 'border-emerald-400 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-300'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    {/* Bank Logo & Title aligned */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <svg
                        width="38"
                        height="38"
                        viewBox="0 0 38 38"
                        style={{ display: 'block', marginRight: '10px', flexShrink: 0 }}
                      >
                        <rect width="38" height="38" rx="10" fill="#0f172a" />
                        <text
                          x="19"
                          y="19"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          fontSize="12"
                          fontWeight="900"
                          letterSpacing="0.04em"
                          fontFamily="Arial, Helvetica, sans-serif"
                        >
                          {b.bankCode.slice(0, 3)}
                        </text>
                      </svg>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', lineHeight: '1.2' }}>
                            {b.bankName}
                          </span>
                          {b.isBestMatch && (
                            <svg
                              width="176"
                              height="22"
                              viewBox="0 0 176 22"
                              style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                flexShrink: 0,
                              }}
                            >
                              <rect x="0" y="0" width="176" height="22" rx="11" fill="#059669" />
                              <text
                                x="88"
                                y="11"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#ffffff"
                                fontSize="8.5"
                                fontWeight="800"
                                letterSpacing="0.05em"
                                fontFamily="Arial, Helvetica, sans-serif"
                              >
                                PRIMARY RECOMMENDATION
                              </text>
                            </svg>
                          )}
                          {b.status === 'PARTIALLY_ELIGIBLE' && (
                            <svg
                              width="160"
                              height="22"
                              viewBox="0 0 160 22"
                              style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                flexShrink: 0,
                              }}
                            >
                              <rect x="0.5" y="0.5" width="159" height="21" rx="10.5" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1" />
                              <text
                                x="80"
                                y="11"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#b45309"
                                fontSize="8.5"
                                fontWeight="800"
                                letterSpacing="0.04em"
                                fontFamily="Arial, Helvetica, sans-serif"
                              >
                                ⚠ PARTIALLY ELIGIBLE
                              </text>
                            </svg>
                          )}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', lineHeight: '1.2' }}>
                          Product: {loanLabel} • Turnaround Time: ~{b.tatDays} Working Days
                        </div>
                      </div>
                    </div>

                    {/* Interest Rate */}
                    <div className="text-left sm:text-right bg-emerald-50/60 sm:bg-transparent p-1.5 sm:p-0 rounded-xl sm:rounded-none">
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Indicative Interest Rate</span>
                      <span className="text-sm sm:text-base font-black text-emerald-700 leading-tight">
                        {b.interestRate.toFixed(2)}% p.a.
                      </span>
                    </div>
                  </div>

                  {/* 4 Core Financial Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/90 p-2.5 rounded-xl border border-slate-100 text-xs mb-2 text-center">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Interest Rate</span>
                      <strong className="text-emerald-700 font-black text-xs sm:text-sm block">
                        {b.interestRate.toFixed(2)}%
                      </strong>
                      <span className="text-[9px] text-slate-400 block">p.a. floating</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Sanction Cap</span>
                      <strong className="text-slate-900 font-black text-xs sm:text-sm block">
                        {formatCurrencyINR(b.recommendedAmount)}
                      </strong>
                      <span
                        className={`text-[9px] block font-bold ${
                          b.status === 'PARTIALLY_ELIGIBLE' ? 'text-amber-700' : 'text-slate-400'
                        }`}
                      >
                        {b.status === 'PARTIALLY_ELIGIBLE' ? 'FOIR Adjusted Cap' : 'Max Approved'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Monthly EMI</span>
                      <strong className="text-indigo-950 font-black text-xs sm:text-sm block">
                        ₹{Math.round(b.proposedEmi).toLocaleString('en-IN')}/m
                      </strong>
                      <span className="text-[9px] text-slate-400 block">
                        {b.tenureMonths} Months ({b.tenureYears} Yrs)
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">FOIR Status</span>
                      <strong
                        className={`text-xs sm:text-sm block font-black ${
                          b.foirPct > b.maxFoirPct ? 'text-amber-700' : 'text-slate-900'
                        }`}
                      >
                        {b.foirPct}%
                      </strong>
                      <span className="text-[9px] text-slate-500 block">
                        Bank Cap: {b.maxFoirPct}%
                      </span>
                    </div>
                  </div>

                  {/* Underwriting Eligibility Remarks */}
                  {b.passRemarks && b.passRemarks.length > 0 && (
                    <div className="space-y-1 mb-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Underwriting Eligibility Remarks:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10.5px] text-emerald-800">
                        {b.passRemarks.map((remark, rIdx) => (
                          <div key={rIdx} className="flex items-start gap-1">
                            <span className="text-emerald-600 font-bold shrink-0">✓</span>
                            <span>{remark}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Red/Rose Breach & Caution Alert Box */}
                  {((b.specialRemarks && b.specialRemarks.length > 0) || b.status === 'PARTIALLY_ELIGIBLE') && (
                    <div
                      style={{
                        backgroundColor: '#fff1f2',
                        border: '1px solid #fecdd3',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '11px',
                        color: '#9f1239',
                        fontWeight: 600,
                        lineHeight: '1.45',
                        marginBottom: '8px',
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ fontSize: '13px', marginRight: '5px', verticalAlign: '-1px' }}>⚠️</span>
                      <span>
                        {b.specialRemarks && b.specialRemarks.length > 0
                          ? b.specialRemarks.join(' ')
                          : `Requested loan of ${formatCurrencyINR(data.requestedAmount)} pushes FOIR to ${b.foirPct}% (Max permissible: ${b.maxFoirPct}%). Sanctionable up to ${formatCurrencyINR(b.recommendedAmount)}.`}
                      </span>
                    </div>
                  )}

                  {/* Special Features & USPs */}
                  {b.specialFeatures && b.specialFeatures.length > 0 && (
                    <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-100 flex flex-wrap gap-1.5">
                      <span className="font-bold text-slate-700">Bank USPs:</span>
                      {b.specialFeatures.map((feat, fIdx) => (
                        <span key={fIdx} className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[9.5px] font-semibold">
                          • {feat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OFFICIAL RUNNING FOOTER FOR PAGE 1                                        */}
        {/* ========================================================================= */}
        <div className="border-t-2 border-emerald-600/80 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            <strong className="text-slate-800">{data.companyName || 'Money Shelter Pvt. Ltd.'}</strong> • Multi-Bank Syndication Network
          </div>
          <div className="font-bold text-slate-700 uppercase tracking-wider">
            TENTATIVE OFFER REPORT • Page 1 of 2
          </div>
          <div className="font-mono text-slate-600">
            Ref: {data.referenceNumber}
          </div>
        </div>
      </div>

      {/* Screen Page Break Separator (Hidden in Print) */}
      <div className="text-center py-1 print:hidden text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
        <span className="h-px bg-slate-300 w-16"></span>
        <span>Page 2: Documentation & Institutional Terms</span>
        <span className="h-px bg-slate-300 w-16"></span>
      </div>

      {/* ========================================================================= */}
      {/* ============================== PAGE 2 =================================== */}
      {/* ========================================================================= */}
      <div
        id="pdf-page-2"
        className="pdf-page bg-white text-slate-900 font-sans p-5 sm:p-9 max-w-4xl mx-auto border border-slate-200/90 rounded-2xl shadow-xl text-[12.5px] leading-relaxed relative flex flex-col justify-between print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none"
        style={{
          boxShadow: '0 12px 36px -10px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div>
          {/* ========================================================================= */}
          {/* 1. CORPORATE RUNNING HEADER FOR PAGE 2                                    */}
          {/* ========================================================================= */}
          <div className="border-b-2 border-emerald-600 pb-3 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center">
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #065f46 0%, #0f766e 60%, #0f172a 100%)',
                    color: '#ffffff',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '10px',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: '#fbbf24', lineHeight: 1 }}>⚡</span>
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-slate-900 uppercase leading-none">
                    {data.companyName || 'MONEY SHELTER PVT. LTD.'}
                  </h2>
                  <p className="text-[10px] font-bold text-emerald-800 tracking-wider uppercase mt-0.5">
                    INSTITUTIONAL SYNDICATION & SANCTION GUIDELINES
                  </p>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  textAlign: 'left',
                }}
                className="w-full sm:w-auto"
              >
                <div style={{ fontSize: '10px', color: '#475569' }}>
                  Offer Ref: <strong className="font-mono text-slate-900">{data.referenceNumber}</strong> • Applicant: <strong className="text-slate-900">{data.customerName}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. PRE-SANCTION VERIFICATION & DOCUMENTATION CHECKLIST                    */}
          {/* ========================================================================= */}
          <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <h4 className="font-black text-slate-900 mb-2.5 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <span>📁</span>
              <span>Required Verification Checklist for Final Bank Sanction:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
              <div className="flex items-start">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', flexShrink: 0, marginTop: '1px' }}
                >
                  <circle cx="9" cy="9" r="8.5" fill="#059669" />
                  <text
                    x="9"
                    y="9.5"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="800"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    1
                  </text>
                </svg>
                <span>Latest 3 months Salary Slips (or 2 years ITR with computation & audit report for business entities).</span>
              </div>
              <div className="flex items-start">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', flexShrink: 0, marginTop: '1px' }}
                >
                  <circle cx="9" cy="9" r="8.5" fill="#059669" />
                  <text
                    x="9"
                    y="9.5"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="800"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    2
                  </text>
                </svg>
                <span>Latest 6 months Bank Account Statements where primary salary or revenues are credited.</span>
              </div>
              <div className="flex items-start">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', flexShrink: 0, marginTop: '1px' }}
                >
                  <circle cx="9" cy="9" r="8.5" fill="#059669" />
                  <text
                    x="9"
                    y="9.5"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="800"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    3
                  </text>
                </svg>
                <span>PAN Card, Aadhaar Card, and Current Residence Proof (Utility bill / Valid registered Rent agreement).</span>
              </div>
              <div className="flex items-start">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', flexShrink: 0, marginTop: '1px' }}
                >
                  <circle cx="9" cy="9" r="8.5" fill="#059669" />
                  <text
                    x="9"
                    y="9.5"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="800"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    4
                  </text>
                </svg>
                <span>Existing loan sanction letters & repayment track records (if balance transfer or FOIR deduction requested).</span>
              </div>
            </div>
            {data.specialRemarks && (
              <p className="mt-2.5 pt-2 border-t border-slate-200 text-[11px] text-slate-600 italic">
                <strong>Advisor Remark:</strong> {data.specialRemarks}
              </p>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. MULTI-BANK SYNDICATION & SANCTION PROCESS TIMELINE                     */}
          {/* ========================================================================= */}
          <div className="mb-4 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs">
            <h4 className="font-black text-slate-800 mb-2.5 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <span>🚀</span>
              <span>Next Steps Toward Final Bank Sanction Letter:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Step 1 • Completed</span>
                <strong className="text-slate-900 block text-xs">In-Principle Eligibility Match</strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">Automated Multi-Bank Matrix Evaluation</span>
              </div>
              <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">Step 2 • Current Stage</span>
                <strong className="text-slate-900 block text-xs">Document Collection & Verification</strong>
                <span className="text-[10px] text-emerald-700 block mt-0.5">Assigned Advisor Assist & Direct Bank Login</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Step 3 • Final Step</span>
                <strong className="text-slate-900 block text-xs">Credit Appraisal & Sanction</strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">Official Bank Sanction Letter & Disbursal</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. MANDATORY IMPORTANT NOTE & SANCTION DISCLAIMER (PROMINENT HIGHLIGHT)   */}
          {/* ========================================================================= */}
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '2px solid #fcd34d',
              borderRadius: '16px',
              padding: '16px 18px',
              color: '#78350f',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '11.5px',
                fontWeight: 900,
                color: '#92400e',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontSize: '15px', marginRight: '6px' }}>⚠️</span>
              <span>IMPORTANT NOTE & SANCTION DISCLAIMER</span>
            </div>
            <p
              style={{
                fontSize: '12px',
                lineHeight: '1.5',
                fontWeight: 600,
                color: '#78350f',
                margin: 0,
              }}
            >
              &ldquo;{data.importantNote}&rdquo;
            </p>
          </div>

          {/* ========================================================================= */}
          {/* 5. FINANCIAL ADVISOR SIGN-OFF & CRISP DIGITAL VERIFICATION BADGE          */}
          {/* ========================================================================= */}
          <div className="border-t-2 border-slate-200 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Your Dedicated Financial Advisor</span>
              <strong className="text-slate-900 text-sm font-black block">{data.advisorName}</strong>
              <span className="text-slate-600 block">{data.advisorRole} • {data.branchName}</span>
              <span className="text-emerald-700 font-bold block mt-0.5">Direct Contact: {data.advisorPhone}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              {/* Digitally Verified Badge - rendered as bulletproof HTML table for 100% reliable canvas & print rendering */}
              <table
                style={{
                  borderCollapse: 'separate',
                  backgroundColor: '#ecfdf5',
                  border: '1.5px solid #10b981',
                  borderRadius: '12px',
                  padding: '6px 14px',
                  margin: 0,
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '8px' }}>
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                        style={{ display: 'block' }}
                      >
                        <circle cx="11" cy="11" r="10" fill="#059669" />
                        <path
                          d="M6.5 11.5L9.5 14.5L15.5 8.5"
                          stroke="#ffffff"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'left' }}>
                      <div
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: '#065f46',
                          lineHeight: '1.2',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        DIGITALLY VERIFIED
                      </div>
                      <div
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: '#047857',
                          lineHeight: '1.2',
                          whiteSpace: 'nowrap',
                          marginTop: '1px',
                        }}
                      >
                        Money Shelter Sourcing Engine
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div
                style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  marginTop: '5px',
                  textAlign: 'right',
                  lineHeight: '1.2',
                }}
              >
                Generated on {generatedDateFormatted} • System Case ID #{data.referenceNumber}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OFFICIAL RUNNING FOOTER FOR PAGE 2                                        */}
        {/* ========================================================================= */}
        <div className="border-t-2 border-emerald-600/80 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            <strong className="text-slate-800">{data.companyName || 'Money Shelter Pvt. Ltd.'}</strong> • Multi-Bank Syndication Network
          </div>
          <div className="font-bold text-slate-700 uppercase tracking-wider">
            TENTATIVE OFFER REPORT • Page 2 of 2
          </div>
          <div className="font-mono text-slate-600">
            Ref: {data.referenceNumber}
          </div>
        </div>
      </div>
    </div>
  );
}
