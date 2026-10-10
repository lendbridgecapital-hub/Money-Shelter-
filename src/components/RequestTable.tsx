'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LoanApplication, ApplicationStatus } from '@/types/db';
import { LOAN_TYPE_LABELS, formatCurrencyINR, formatDate, formatDateTime } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';

interface RequestTableProps {
  applications: LoanApplication[];
  showBranchColumn?: boolean;
  canMatchEligibility?: boolean;
}

export default function RequestTable({
  applications,
  showBranchColumn = false,
  canMatchEligibility = false,
}: RequestTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('LINK_SHARED');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('status');
      if (s) setStatusFilter(s);
    }
  }, []);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (statusFilter !== 'ALL' && app.status !== statusFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (app.fullName || '').toLowerCase().includes(q);
        const matchesMobile = (app.mobile || '').includes(q);
        const matchesEmail = (app.email || '').toLowerCase().includes(q);
        const matchesToken = (app.token || '').toLowerCase().includes(q);
        const matchesBranch = (app.branchName || '').toLowerCase().includes(q);
        const matchesPartner = (app.channelPartnerName || app.createdByName || '').toLowerCase().includes(q);
        const matchesPartnerPhone = (app.channelPartnerMobile || app.channelPartnerPhone || '').includes(q);
        const matchesBank = (app.bankName || '').toLowerCase().includes(q);
        if (
          !matchesName &&
          !matchesMobile &&
          !matchesEmail &&
          !matchesToken &&
          !matchesBranch &&
          !matchesPartner &&
          !matchesPartnerPhone &&
          !matchesBank
        ) {
          return false;
        }
      }

      return true;
    });
  }, [applications, searchTerm, statusFilter]);

  const tabs: { key: string; label: string; count?: number }[] = [
    {
      key: 'LINK_SHARED',
      label: 'Link Shared',
      count: applications.filter((a) => a.status === 'LINK_SHARED').length,
    },
    {
      key: 'DOCUMENTS_IN',
      label: 'Documents In',
      count: applications.filter((a) => a.status === 'DOCUMENTS_IN').length,
    },
    {
      key: 'SENT_TO_BANK',
      label: 'Sent to Bank',
      count: applications.filter((a) => a.status === 'SENT_TO_BANK').length,
    },
    {
      key: 'DOCUMENTS_REQUIRED',
      label: 'Docs Required',
      count: applications.filter((a) => a.status === 'DOCUMENTS_REQUIRED').length,
    },
    {
      key: 'APPROVED',
      label: 'Approved',
      count: applications.filter((a) => a.status === 'APPROVED').length,
    },
    {
      key: 'CUSTOMER_ACCEPTED',
      label: 'Accepted',
      count: applications.filter((a) => a.status === 'CUSTOMER_ACCEPTED').length,
    },
    {
      key: 'DISBURSED',
      label: 'Disbursed',
      count: applications.filter((a) => a.status === 'DISBURSED').length,
    },
    {
      key: 'REJECTED',
      label: 'Rejected',
      count: applications.filter((a) => a.status === 'REJECTED').length,
    },
  ];

  return (
    <div className="space-y-3 min-w-0 max-w-full">
      {/* Search & Tabs Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-2.5 min-w-0 max-w-full">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4 stroke-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search borrower name, mobile, bank, token…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs hover:bg-slate-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips Pill Bar (Smooth Horizontal Scroll) */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar scroll-smooth max-w-full">
          {tabs.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>


      {/* Mobile Card List View (Visible on mobile, hidden on desktop) */}
      <div className="block md:hidden space-y-2.5">
        {filtered.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs font-bold text-slate-800">No loan requests found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try selecting another filter or adjusting your search keyword.</p>
          </div>
        ) : (
          filtered.map((app) => (
            <Link
              key={app.id}
              href={`/branch/requests/${app.id}`}
              className="block bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs active:bg-slate-50 active:scale-[0.99] transition-all"
            >
              {/* Header: Avatar, Name & Status */}
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/90 font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                    {app.fullName ? app.fullName.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate leading-tight">
                      {app.fullName || app.token}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                      <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="truncate">{app.mobile || app.email || 'Awaiting Details'}</span>
                    </div>
                    {app.branchType === 'SITE' && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 mt-1 max-w-fit">
                        <span>🏗️ {app.branchName}</span>
                        {app.mappedBranchName && <span className="text-blue-700 font-semibold">· Ops: {app.mappedBranchName}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <StatusBadge status={app.status as ApplicationStatus} size="sm" />
                </div>
              </div>

              {/* Amount & Loan Type Tile */}
              <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-100 flex items-center justify-between mb-2.5">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                    Requested Amount
                  </span>
                  <p className="text-sm font-black text-slate-900">
                    {app.approvedAmount
                      ? formatCurrencyINR(app.approvedAmount)
                      : app.loanAmount
                      ? formatCurrencyINR(app.loanAmount)
                      : '—'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                    Loan Type
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-block">
                    {app.loanType ? LOAN_TYPE_LABELS[app.loanType] : 'General Loan'}
                  </span>
                </div>
              </div>

              {/* Footer: Bank, Partner & Action */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <div className="flex items-center gap-2 truncate max-w-[170px]">
                  <div className="flex items-center gap-1 truncate">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate">{app.bankName || 'Awaiting Bank'}</span>
                  </div>
                  <span>•</span>
                  <span className="truncate">{app.channelPartnerName || app.createdByName || 'Direct'}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-emerald-700 text-xs flex items-center gap-0.5">
                    Case File →
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop Table View (Hidden on mobile, visible on desktop) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm min-w-0 max-w-full">
        <table className="w-full text-xs lg:text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] lg:text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <th className="px-3 lg:px-4 py-2.5 lg:py-3 whitespace-nowrap">Created</th>
              <th className="px-3 lg:px-4 py-2.5 lg:py-3 whitespace-nowrap">Applicant / Customer</th>
              <th className="px-2.5 lg:px-4 py-2.5 lg:py-3 whitespace-nowrap">Loan Product & Amount</th>
              <th className="px-2.5 lg:px-4 py-2.5 lg:py-3 whitespace-nowrap">Partner / Bank</th>
              <th className="px-2.5 lg:px-4 py-2.5 lg:py-3 whitespace-nowrap">Branch & Status</th>
              <th className="px-3 lg:px-4 py-2.5 lg:py-3 text-right whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                  No loan requests found matching the current filter.
                </td>
              </tr>
            ) : (
              filtered.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* 1. Created (Timestamp shifted to first before Applicant) */}
                  <td className="px-3 lg:px-4 py-2.5 lg:py-3 whitespace-nowrap">
                    <p className="font-semibold text-slate-800 text-xs">
                      {formatDate(app.createdAt)}
                    </p>
                    <p className="text-[10px] lg:text-[11px] text-slate-400 mt-0.5">
                      {formatDateTime(app.createdAt).split(',')[1]?.trim() || ''}
                    </p>
                  </td>

                  {/* 2. Applicant / Customer */}
                  <td className="px-3 lg:px-4 py-2.5 lg:py-3">
                    {app.fullName ? (
                      <div>
                        <p className="font-semibold text-slate-900 truncate max-w-[130px] xl:max-w-none">{app.fullName}</p>
                        <p className="text-[11px] lg:text-xs text-slate-400 truncate max-w-[130px] xl:max-w-none">{app.mobile || app.email}</p>
                      </div>
                    ) : (
                      <div>
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {app.token}
                        </span>
                        <p className="text-[11px] text-amber-600 mt-0.5">Link Shared · Waiting KYC</p>
                      </div>
                    )}
                  </td>

                  {/* 3. Loan Product & Amount (Merged) */}
                  <td className="px-2.5 lg:px-4 py-2.5 lg:py-3 text-[11px] lg:text-xs whitespace-nowrap">
                    <p className="font-semibold text-slate-900">
                      {app.approvedAmount
                        ? formatCurrencyINR(app.approvedAmount)
                        : app.loanAmount
                        ? formatCurrencyINR(app.loanAmount)
                        : '—'}
                    </p>
                    <p className="text-[10px] lg:text-[11px] text-slate-500 font-medium mt-0.5">
                      {app.loanType ? LOAN_TYPE_LABELS[app.loanType] : 'General Loan'}
                    </p>
                  </td>

                  {/* 4. Partner / Bank (With Partner Mobile Number) */}
                  <td className="px-2.5 lg:px-4 py-2.5 lg:py-3 text-[11px] lg:text-xs">
                    <div>
                      <p className="font-semibold text-slate-800 truncate max-w-[140px] xl:max-w-none">
                        {app.channelPartnerName || app.createdByName || 'Direct'}
                      </p>
                      {(app.channelPartnerMobile || app.channelPartnerPhone) && (
                        <p className="text-[11px] text-emerald-700 font-medium font-mono flex items-center gap-1 mt-0.5">
                          <span>📞</span>
                          <span>{app.channelPartnerMobile || app.channelPartnerPhone}</span>
                        </p>
                      )}
                      <p className="text-[10px] lg:text-[11px] text-slate-400 truncate max-w-[140px] xl:max-w-none mt-0.5">
                        Bank: <strong className="text-slate-600">{app.bankName || 'Not assigned'}</strong>
                      </p>
                    </div>
                  </td>

                  {/* 5. Branch & Status (Merged) */}
                  <td className="px-2.5 lg:px-4 py-2.5 lg:py-3 text-[11px] lg:text-xs whitespace-nowrap space-y-1.5">
                    <div>
                      <StatusBadge status={app.status as ApplicationStatus} size="sm" />
                    </div>
                    {app.branchType === 'SITE' ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-900 border border-amber-200 text-[10px]">
                          <span>🏗️</span>
                          <span className="truncate max-w-[130px]">{app.branchName || 'Site Project'}</span>
                        </span>
                        {app.mappedBranchName && (
                          <p className="text-[10px] text-blue-700 font-semibold mt-0.5 truncate max-w-[130px]" title={`Handling Ops Branch: ${app.mappedBranchName}`}>
                            Ops: {app.mappedBranchName}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-600 text-[11px]">
                        <span>🏢</span>
                        <span className="truncate max-w-[130px]">{app.branchName || 'Head Office'}</span>
                      </span>
                    )}
                  </td>

                  {/* 6. Action */}
                  <td className="px-3 lg:px-4 py-2.5 lg:py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/branch/requests/${app.id}`}
                      className="inline-flex items-center text-[11px] lg:text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-md transition-colors"
                    >
                      Case File →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
