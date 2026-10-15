'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatCurrencyINR } from '@/lib/format';
import type { Role } from '@/types/db';
import type {
  OrganisationReportData,
  RmTerritoryReportData,
  SupportOperationalReportData,
  PartnerPersonalReportData,
} from '@/lib/repos/reportsRepo';

interface ActiveReportsSectionProps {
  role: Role;
  currentUserId?: string;
  orgReport?: OrganisationReportData | null;
  rmReport?: RmTerritoryReportData | null;
  supportReport?: SupportOperationalReportData | null;
  partnerReport?: PartnerPersonalReportData | null;
}

export default function ActiveReportsSection({
  role,
  currentUserId,
  orgReport,
  rmReport,
  supportReport,
  partnerReport,
}: ActiveReportsSectionProps) {
  const isAdmin = role === 'ADMIN';
  const isSupport = role === 'CENTRAL_SUPPORT';
  const isRM = role === 'RELATIONSHIP_MANAGER';
  const isPartner = role === 'CHANNEL_PARTNER';

  // Admin Active Tab State
  type AdminTab = 'branches' | 'rms' | 'partners' | 'banks' | 'loantypes';
  const [adminTab, setAdminTab] = useState<AdminTab>('branches');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRmLink, setCopiedRmLink] = useState(false);

  const getRmOnboardUrl = (id?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return id ? `${origin}/partner/onboard?rmId=${id}` : `${origin}/partner/onboard`;
  };

  const copyRmOnboardingLink = (id?: string) => {
    const link = getRmOnboardUrl(id);
    navigator.clipboard.writeText(link);
    setCopiedRmLink(true);
    setTimeout(() => setCopiedRmLink(false), 2500);
  };

  const shareRmLinkWhatsApp = (id?: string, rmName?: string) => {
    const link = getRmOnboardUrl(id);
    const text = encodeURIComponent(
      `Hello! Onboard as an authorized Channel Partner with Money Shelter via my direct referral link: ${link}. Once registered, you will be auto-assigned to me (${rmName || 'Relationship Manager'}) for fast-track loan processing and dedicated partner support.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
      {/* 1. Header Bar */}
      <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-slate-50/80 via-white to-emerald-50/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
            📊
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
              {isAdmin
                ? 'Total Organisation Active Reports'
                : isSupport
                ? 'Central Support Operational & Partner Reports'
                : isRM
                ? 'My Assigned Territory & Partner Reports'
                : 'My Business Portfolio & Performance Report'}
            </h2>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">
              {isAdmin
                ? 'Master multi-branch intelligence, partner distribution, RM velocity, and lender analytics'
                : isSupport
                ? 'Onboarding KYC verification pipeline, RM mapping coverage, and branch inflow'
                : isRM
                ? 'Dedicated performance metrics of your mapped Channel Partners and active loan cases'
                : 'Live status of your submitted loan files, sanctioned volume, and loan clearance rate'}
            </p>
          </div>
        </div>

        {/* Quick Report Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {isAdmin && orgReport && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Org Sync</span>
            </div>
          )}
          {isSupport && supportReport && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
              <span>⏳ {supportReport.pendingPartnerRequests} Pending Requests</span>
            </div>
          )}
          {isRM && rmReport && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
              <span>👔 {rmReport.assignedPartnersCount} Partners Assigned</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Content Body based on Access */}
      <div className="p-3 space-y-3">
        {/* ========================================================================= */}
        {/* ADMIN VIEW: TOTAL REPORT OF ORGANISATION                                 */}
        {/* ========================================================================= */}
        {isAdmin && orgReport && (
          <div className="space-y-3">
            {/* Top 3 Executive KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Metric 1: Total Volume */}
              <div className="p-2.5 rounded-lg border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Disbursed</span>
                  <span className="text-xs">💼</span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {formatCurrencyINR(orgReport.metrics.totalDisbursedAmount)}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>{orgReport.metrics.totalDisbursedCases} cases disbursed</span>
                  <span className="font-semibold text-emerald-600">
                    {orgReport.metrics.disbursementRate}% conv.
                  </span>
                </div>
              </div>

              {/* Metric 2: Organization Leads & Velocity */}
              <div className="p-2.5 rounded-lg border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Requested Volume</span>
                  <span className="text-xs">📋</span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {formatCurrencyINR(orgReport.metrics.totalRequestedAmount)}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>{orgReport.metrics.totalLeads} total leads</span>
                  <span className="font-semibold text-emerald-700">
                    {orgReport.metrics.approvalRate}% sanctioned
                  </span>
                </div>
              </div>

              {/* Metric 3: Partner Network */}
              <div className="p-2.5 rounded-lg border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Partner Network</span>
                  <span className="text-xs">🤝</span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {orgReport.metrics.totalPartnersCount} <span className="text-xs font-normal text-slate-500">Partners</span>
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span className="text-emerald-700 font-semibold">{orgReport.metrics.activePartnersCount} Active</span>
                  <span className="text-amber-700 font-semibold">{orgReport.metrics.pendingPartnersCount} Pending</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs for Active Reports */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex flex-wrap items-center gap-1 py-0.5">
                <button
                  type="button"
                  onClick={() => { setAdminTab('branches'); setSearchQuery(''); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    adminTab === 'branches'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🏢 Branch-Wise Report ({orgReport.branches.length})
                </button>

                <button
                  type="button"
                  onClick={() => { setAdminTab('rms'); setSearchQuery(''); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    adminTab === 'rms'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  👔 RM Performance Matrix ({orgReport.rms.length})
                </button>

                <button
                  type="button"
                  onClick={() => { setAdminTab('partners'); setSearchQuery(''); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    adminTab === 'partners'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🤝 Channel Partner Leaderboard ({orgReport.partners.length})
                </button>

                <button
                  type="button"
                  onClick={() => { setAdminTab('banks'); setSearchQuery(''); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    adminTab === 'banks'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🏦 Lending Bank Distribution ({orgReport.banks.length})
                </button>

                <button
                  type="button"
                  onClick={() => { setAdminTab('loantypes'); setSearchQuery(''); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    adminTab === 'loantypes'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  📑 Loan Product Mix ({orgReport.loanTypes.length})
                </button>
              </div>

              {/* Instant Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter report records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-2.5 py-1 pl-7 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 sm:w-56"
                />
                <span className="absolute left-2 top-1.5 text-xs text-slate-400">🔍</span>
              </div>
            </div>

            {/* TAB 1: Branch-Wise Report */}
            {adminTab === 'branches' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <th className="px-3 py-1.5">Branch Name & Code</th>
                      <th className="px-3 py-1.5 text-center">Total Cases</th>
                      <th className="px-3 py-1.5 text-center">Disbursed Cases</th>
                      <th className="px-3 py-1.5">Disbursed Volume</th>
                      <th className="px-3 py-1.5 text-center">Conversion</th>
                      <th className="px-3 py-1.5 text-right">Staff Users</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {orgReport.branches
                      .filter(
                        (b) =>
                          !searchQuery ||
                          b.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.branchCode.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((b) => (
                        <tr key={b.branchId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-2">
                            <p className="font-bold text-slate-900 leading-tight">{b.branchName}</p>
                            <span className="text-[10px] font-mono text-slate-400">{b.branchCode}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-700">
                            {b.totalCases}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-teal-700">
                            {b.disbursedCases}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {formatCurrencyINR(b.disbursedVolume)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              {b.conversionRate}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-500 font-medium">
                            {b.userCount} staff
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: RM Performance Matrix */}
            {adminTab === 'rms' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <th className="px-3 py-1.5">Relationship Manager</th>
                      <th className="px-3 py-1.5">Branch</th>
                      <th className="px-3 py-1.5 text-center">Assigned Partners</th>
                      <th className="px-3 py-1.5 text-center">Handled Cases</th>
                      <th className="px-3 py-1.5">Disbursed Volume</th>
                      <th className="px-3 py-1.5 text-center">Sanction Velocity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {orgReport.rms
                      .filter(
                        (r) =>
                          !searchQuery ||
                          r.rmName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.rmEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.branchName.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((rm) => (
                        <tr key={rm.rmId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-2">
                            <p className="font-bold text-slate-900 leading-tight">{rm.rmName}</p>
                            <p className="text-[10px] text-slate-400">{rm.rmEmail} • {rm.rmPhone}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-700 font-medium">
                            {rm.branchName}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded text-[11px] font-bold">
                              {rm.assignedPartnersCount}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-700">
                            {rm.totalCases} ({rm.disbursedCases} disbursed)
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {formatCurrencyINR(rm.disbursedVolume)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              {rm.conversionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: Channel Partner Leaderboard */}
            {adminTab === 'partners' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <th className="px-3 py-1.5">Channel Partner</th>
                      <th className="px-3 py-1.5">Assigned RM & Branch</th>
                      <th className="px-3 py-1.5 text-center">Leads Submitted</th>
                      <th className="px-3 py-1.5 text-center">Disbursed Cases</th>
                      <th className="px-3 py-1.5">Disbursed Volume</th>
                      <th className="px-3 py-1.5 text-center">Conversion</th>
                      <th className="px-3 py-1.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {orgReport.partners
                      .filter(
                        (p) =>
                          !searchQuery ||
                          p.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.partnerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.assignedRmName.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((p) => (
                        <tr key={p.partnerId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-2">
                            <p className="font-bold text-slate-900 leading-tight">{p.partnerName}</p>
                            <span className="text-[10px] font-mono text-slate-400">{p.partnerCode}</span>
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-slate-800 font-semibold leading-tight">{p.assignedRmName}</p>
                            <p className="text-[10px] text-slate-400">{p.branchName}</p>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-700">
                            {p.totalCases}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-teal-700">
                            {p.disbursedCases}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {formatCurrencyINR(p.disbursedVolume)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              {p.totalCases > 0 ? Math.round((p.disbursedCases / p.totalCases) * 100) : 0}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                p.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: Lending Bank Distribution */}
            {adminTab === 'banks' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <th className="px-3 py-1.5">Lending Bank / Institution</th>
                      <th className="px-3 py-1.5 text-center">Cases Logged</th>
                      <th className="px-3 py-1.5 text-center">Sanctioned</th>
                      <th className="px-3 py-1.5 text-center">Disbursed</th>
                      <th className="px-3 py-1.5">Disbursed Volume</th>
                      <th className="px-3 py-1.5 text-right">Volume Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {orgReport.banks
                      .filter(
                        (b) =>
                          !searchQuery ||
                          b.bankName.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((b) => (
                        <tr key={b.bankName} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {b.bankName}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-700">
                            {b.casesSent}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-800">
                            {b.casesApproved}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-teal-700">
                            {b.casesDisbursed}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {formatCurrencyINR(b.disbursedVolume)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-bold text-slate-800">
                              {b.sharePercentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 5: Loan Product Mix */}
            {adminTab === 'loantypes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {orgReport.loanTypes.map((lt) => (
                  <div key={lt.loanType} className="p-3 bg-slate-50/60 border border-slate-200/80 rounded-lg">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {lt.label}
                    </p>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">
                      {lt.casesCount} <span className="text-xs font-normal text-slate-500">cases</span>
                    </p>
                    <p className="text-xs font-bold text-emerald-700 mt-1">
                      {formatCurrencyINR(lt.disbursedVolume)} disbursed
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CENTRAL SUPPORT VIEW: OPERATIONAL & COMPLIANCE REPORT                     */}
        {/* ========================================================================= */}
        {isSupport && supportReport && (
          <div className="space-y-3">
            {/* Operational Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Pending Approvals
                </span>
                <span className="text-lg font-black text-amber-900">
                  {supportReport.pendingPartnerRequests}
                </span>
                <span className="block text-[10px] text-amber-700 mt-0.5">Sub-DSA awaiting review</span>
              </div>

              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                  RM Assignment Rate
                </span>
                <span className="text-lg font-black text-blue-900">
                  {supportReport.rmAssignmentCoverage}%
                </span>
                <span className="block text-[10px] text-blue-700 mt-0.5">
                  {supportReport.unassignedPartnersCount} unassigned partners
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block">
                  Sent to Bank
                </span>
                <span className="text-lg font-black text-indigo-900">
                  {supportReport.casesSentToBank}
                </span>
                <span className="block text-[10px] text-indigo-700 mt-0.5">Underwriter processing</span>
              </div>

              <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                  Docs Required
                </span>
                <span className="text-lg font-black text-rose-900">
                  {supportReport.casesDocumentsRequired}
                </span>
                <span className="block text-[10px] text-rose-700 mt-0.5">Awaiting borrower uploads</span>
              </div>
            </div>

            {/* Quick Action: Pending Partner Requests Queue */}
            <div className="border border-slate-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-800">
                  Recent Partner Onboarding Action Queue ({supportReport.partnerQueue.length})
                </h3>
                <Link
                  href="/admin/partner-requests"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                >
                  Manage Approvals →
                </Link>
              </div>

              {supportReport.partnerQueue.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 text-center font-medium">
                  🎉 No pending partner onboarding requests. All caught up!
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {supportReport.partnerQueue.map((item) => (
                    <div key={item.id} className="py-1.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.phone} • Assigned RM: {item.assignedRmName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {item.partnerStatus}
                        </span>
                        <Link
                          href="/admin/partner-requests"
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition"
                        >
                          Verify & Assign RM
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RELATIONSHIP MANAGER VIEW: MY ASSIGNED TERRITORY & PARTNERS REPORT        */}
        {/* ========================================================================= */}
        {isRM && rmReport && (
          <div className="space-y-3">
            {/* Dedicated RM Partner Onboarding Link Card */}
            <div className="bg-gradient-to-r from-emerald-50/70 via-white to-slate-50/80 border border-emerald-200/90 rounded-xl p-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs">
                    🤝
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        My Partner Onboarding Link (Auto-Assign)
                      </h4>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ⚡ Auto-Assigns To You
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Prospective Channel Partners who register using this link will be automatically assigned to your RM portfolio upon registration.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => copyRmOnboardingLink(currentUserId)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                  >
                    <span>{copiedRmLink ? '✓ Copied Link' : '📋 Copy My Link'}</span>
                  </button>

                  <a
                    href={`/partner/onboard?rmId=${currentUserId || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1"
                  >
                    <span>Preview Form</span>
                    <span>↗</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => shareRmLinkWhatsApp(currentUserId, rmReport.rmName)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                  >
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RM Performance Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg border border-slate-200/90 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Assigned Partners
                </span>
                <span className="text-lg font-black text-slate-900">
                  {rmReport.assignedPartnersCount}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">Active referral network</span>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200/90 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Disbursed Volume
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {formatCurrencyINR(rmReport.disbursedVolume)}
                </span>
                <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
                  {rmReport.disbursedCases} cases disbursed
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200/90 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Sanction Conversion
                </span>
                <span className="text-lg font-black text-emerald-700">
                  {rmReport.conversionRate}%
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">Across {rmReport.totalLeads} total leads</span>
              </div>
            </div>

            {/* Assigned Partner Directory */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                    <th className="px-3 py-1.5">Channel Partner</th>
                    <th className="px-3 py-1.5 text-center">Cases Logged</th>
                    <th className="px-3 py-1.5 text-center">Disbursed Cases</th>
                    <th className="px-3 py-1.5">Disbursed Volume</th>
                    <th className="px-3 py-1.5 text-right">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rmReport.partners.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                        No partners mapped to your profile yet. Central Support assigns partners upon onboarding.
                      </td>
                    </tr>
                  ) : (
                    rmReport.partners.map((p) => (
                      <tr key={p.partnerId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-2">
                          <p className="font-bold text-slate-900 leading-tight">{p.partnerName}</p>
                          <span className="text-[10px] font-mono text-slate-400">{p.partnerCode} • {p.phone}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-700">
                          {p.totalCases}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-teal-700">
                          {p.disbursedCases}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">
                          {formatCurrencyINR(p.disbursedVolume)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                            {p.totalCases > 0 ? Math.round((p.disbursedCases / p.totalCases) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CHANNEL PARTNER VIEW: MY BUSINESS & PAYOUTS REPORT                       */}
        {/* ========================================================================= */}
        {isPartner && partnerReport && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg border border-slate-200/90 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  My Disbursed Volume
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {formatCurrencyINR(partnerReport.disbursedVolume)}
                </span>
                <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
                  {partnerReport.disbursedCases} loans closed
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200/90 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Leads Submitted
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {partnerReport.totalLeads}
                </span>
                <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">Direct customer files</span>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200/90 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Disbursed Loans
                </span>
                <span className="text-base sm:text-lg font-black text-teal-700 leading-tight">
                  {partnerReport.disbursedCases}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">Disbursed by lending bank</span>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200/90 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Conversion Rate
                </span>
                <span className="text-lg font-black text-emerald-700 leading-tight">
                  {partnerReport.conversionRate}%
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">Across all submitted leads</span>
              </div>
            </div>

            {/* Association & RM Card */}
            <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎓</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Certified Channel Partner • {partnerReport.partnerCode}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Dedicated RM: <span className="font-semibold text-slate-900">{partnerReport.assignedRmName}</span> • Account Status: <span className="font-semibold text-emerald-700">Verified Partner</span>
                  </p>
                </div>
              </div>
              <Link
                href="/partner/certificate"
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition"
              >
                View Certificate →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
