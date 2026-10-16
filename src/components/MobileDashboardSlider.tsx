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

      {/* 2. Financial Performance Summary Bar (Executive Business Snapshot) */}
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
    </div>
  );
}
