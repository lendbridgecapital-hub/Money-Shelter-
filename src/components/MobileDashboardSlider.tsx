'use client';

import React from 'react';
import Link from 'next/link';
import type { PipelineStats, Role } from '@/types/db';
import { formatCurrencyINR } from '@/lib/format';

interface BusinessMetrics {
  totalDisbursedAmount: number;
  totalDisbursedCases: number;
  totalRequestedAmount: number;
  approvalRate: number;
  disbursementRate: number;
}

interface Props {
  stats: PipelineStats;
  metrics: BusinessMetrics;
  userName: string;
  role: Role;
  userId: string;
  firmName?: string | null;
  branchName?: string | null;
  photoUrl?: string | null;
}

export default function MobileDashboardSlider({
  stats,
  metrics,
  userName,
  role,
  userId,
  firmName,
  branchName,
  photoUrl,
}: Props) {
  const pipelineStages = [
    { label: 'All Cases', count: stats.total, href: '/branch/requests', dot: 'bg-emerald-400' },
    { label: 'Link Shared', count: stats.linkShared, href: '/branch/requests?status=LINK_SHARED', dot: 'bg-teal-400' },
    { label: 'Docs In', count: stats.documentsIn, href: '/branch/requests?status=DOCUMENTS_IN', dot: 'bg-cyan-400' },
    { label: 'Sent to Bank', count: stats.sentToBank, href: '/branch/requests?status=SENT_TO_BANK', dot: 'bg-indigo-400' },
    { label: 'Docs Req.', count: stats.documentsRequired, href: '/branch/requests?status=DOCUMENTS_REQUIRED', dot: 'bg-amber-400' },
    { label: 'Approved', count: stats.approved, href: '/branch/requests?status=APPROVED', dot: 'bg-emerald-400' },
    { label: 'Disbursed', count: stats.disbursed, href: '/branch/requests?status=DISBURSED', dot: 'bg-emerald-300' },
    { label: 'Rejected', count: stats.rejected, href: '/branch/requests?status=REJECTED', dot: 'bg-rose-400' },
  ];

  return (
    <div className="block md:hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white border border-emerald-500/25 rounded-2xl p-3 shadow-lg overflow-hidden mb-2.5">
      {/* 1. Compact Integrated Executive Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider truncate">
              {firmName || branchName || role.replace('_', ' ')}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          </div>
          <h1 className="text-sm font-extrabold text-white truncate mt-0.5">
            Hello, {userName}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/branch/requests"
            className="text-[10px] font-bold text-emerald-300 hover:text-emerald-200 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/10 transition"
          >
            All Cases →
          </Link>
          <Link
            href="/profile"
            className="relative w-8 h-8 rounded-full border border-emerald-400/50 shadow-xs overflow-hidden shrink-0 active:scale-95 transition"
            title="View / Edit Profile"
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-700/60 text-emerald-200 font-black flex items-center justify-center text-xs">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border border-slate-900" />
          </Link>
        </div>
      </div>

      {/* 2. Unified Content: All in One Look (No slider) */}
      <div className="space-y-2">
        {/* Row A: Financial Performance Summary Bar */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-white">
            <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400 block">
              Total Disbursed
            </span>
            <p className="text-xs sm:text-sm font-black text-white mt-0.5 leading-tight">
              {formatCurrencyINR(metrics.totalDisbursedAmount)}
            </p>
            <p className="text-[9px] text-emerald-300 font-semibold mt-0.5">
              {metrics.totalDisbursedCases} loans ({metrics.disbursementRate}%)
            </p>
          </div>

          <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white">
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-300 block">
              Pipeline Volume
            </span>
            <p className="text-xs sm:text-sm font-black text-white mt-0.5 leading-tight">
              {formatCurrencyINR(metrics.totalRequestedAmount)}
            </p>
            <p className="text-[9px] text-slate-300 font-semibold mt-0.5">
              {stats.total} leads ({metrics.approvalRate}% sanctioned)
            </p>
          </div>
        </div>

        {/* Row B: Compact 7-Stage Pipeline Grid (4 top, 3 bottom) in Single View */}
        <div>
          <div className="flex items-center justify-between text-[9px] text-slate-300 font-semibold px-0.5 mb-1">
            <span>Case Pipeline Stages</span>
            <span className="text-emerald-400 font-bold font-mono">{stats.total} Active</span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {pipelineStages.slice(0, 4).map((stage) => (
              <Link
                key={stage.label}
                href={stage.href}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-center active:scale-95 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tight truncate">
                    {stage.label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-black text-white mt-0.5 leading-none">
                  {stage.count}
                </p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1 pt-1">
            {pipelineStages.slice(4).map((stage) => (
              <Link
                key={stage.label}
                href={stage.href}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-center active:scale-95 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tight truncate">
                    {stage.label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-black text-white mt-0.5 leading-none">
                  {stage.count}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
