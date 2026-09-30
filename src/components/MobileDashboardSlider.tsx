'use client';

import React, { useState } from 'react';
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
  const [currentSlide, setCurrentSlide] = useState<0 | 1>(0);

  const pipelineStages = [
    { label: 'All Cases', count: stats.total, href: '/branch/requests', dot: 'bg-emerald-400' },
    { label: 'Link Shared', count: stats.linkShared, href: '/branch/requests?status=LINK_SHARED', dot: 'bg-teal-400' },
    { label: 'Docs In', count: stats.documentsIn, href: '/branch/requests?status=DOCUMENTS_IN', dot: 'bg-cyan-400' },
    { label: 'Sent to Bank', count: stats.sentToBank, href: '/branch/requests?status=SENT_TO_BANK', dot: 'bg-indigo-400' },
    { label: 'Docs Req.', count: stats.documentsRequired, href: '/branch/requests?status=DOCUMENTS_REQUIRED', dot: 'bg-amber-400' },
    { label: 'Approved', count: stats.approved, href: '/branch/requests?status=APPROVED', dot: 'bg-emerald-400' },
    { label: 'Disbursed', count: stats.disbursed, href: '/branch/requests?status=DISBURSED', dot: 'bg-emerald-300' },
  ];

  return (
    <div className="block md:hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white border border-emerald-500/25 rounded-3xl p-4 shadow-xl overflow-hidden mb-3">
      {/* 1. Integrated Executive Header (matching user screenshot) */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/10">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider truncate">
              {firmName || branchName || role.replace('_', ' ')}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          </div>
          <h1 className="text-base font-extrabold text-white truncate mt-0.5">
            Hello, {userName}
          </h1>
        </div>

        <Link
          href="/profile"
          className="relative w-11 h-11 rounded-full border-2 border-emerald-400/50 shadow-md overflow-hidden shrink-0 active:scale-95 transition"
          title="View / Edit Profile & Visiting Card"
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-emerald-700/60 text-emerald-200 font-black flex items-center justify-center text-sm">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
        </Link>
      </div>

      {/* 2. Slider Controls & View Switcher */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-1 p-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setCurrentSlide(0)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
              currentSlide === 0
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            📁 Case Pipeline
          </button>
          <button
            type="button"
            onClick={() => setCurrentSlide(1)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
              currentSlide === 1
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            💼 Business Stats
          </button>
        </div>

        <Link
          href={currentSlide === 0 ? '/branch/requests' : `/card/${userId}`}
          className="text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 transition"
        >
          <span>{currentSlide === 0 ? 'All Cases' : 'My Card'}</span>
          <span>→</span>
        </Link>
      </div>

      {/* 3. Slider Content Area (~ 1/3 of Mobile Screen) */}
      <div className="relative min-h-[160px]">
        {/* SLIDE 0: CURRENT CASES STATUS (PIPELINE BUCKETS) */}
        {currentSlide === 0 ? (
          <div className="space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold px-0.5">
              <span>Dedicated Pipeline Buckets</span>
              <span className="text-emerald-400 font-bold font-mono">{stats.total} Active Cases</span>
            </div>

            {/* 4-column compact micro-grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {pipelineStages.slice(0, 4).map((stage) => (
                <Link
                  key={stage.label}
                  href={stage.href}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-center active:scale-95 transition-all shadow-2xs flex flex-col justify-between backdrop-blur-xs"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight truncate">
                      {stage.label}
                    </span>
                  </div>
                  <p className="text-base font-black text-white mt-1 leading-none">
                    {stage.count}
                  </p>
                </Link>
              ))}
            </div>

            {/* Bottom 3 stages row */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {pipelineStages.slice(4).map((stage) => (
                <Link
                  key={stage.label}
                  href={stage.href}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-center active:scale-95 transition-all shadow-2xs flex flex-col justify-between backdrop-blur-xs"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight truncate">
                      {stage.label}
                    </span>
                  </div>
                  <p className="text-base font-black text-white mt-1 leading-none">
                    {stage.count}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          /* SLIDE 1: OPERATOR BUSINESS STATS (FINANCIAL METRICS) */
          <div className="space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold px-0.5">
              <span>Dedicated Financial Performance</span>
              <span className="text-emerald-400 font-bold">{metrics.disbursementRate}% Disbursed</span>
            </div>

            {/* 2-column Financial Highlights */}
            <div className="grid grid-cols-2 gap-2">
              {/* Card 1: Total Disbursed */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-slate-900/90 border border-emerald-500/40 text-white shadow-2xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Total Disbursed
                </span>
                <p className="text-base font-black text-white mt-0.5 leading-tight">
                  {formatCurrencyINR(metrics.totalDisbursedAmount)}
                </p>
                <p className="text-[10px] text-emerald-300 font-semibold mt-1">
                  {metrics.totalDisbursedCases} loans completed
                </p>
              </div>

              {/* Card 2: Requested Pipeline Volume */}
              <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-white shadow-2xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 block">
                  Pipeline Volume
                </span>
                <p className="text-base font-black text-white mt-0.5 leading-tight">
                  {formatCurrencyINR(metrics.totalRequestedAmount)}
                </p>
                <p className="text-[10px] text-slate-300 font-semibold mt-1">
                  {stats.total} total files
                </p>
              </div>
            </div>

            {/* Performance Strip */}
            <div className="p-2 px-3 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between text-xs text-white">
              <span className="text-slate-300 text-[11px]">Sanction Rate:</span>
              <span className="font-extrabold text-emerald-400">{metrics.approvalRate}%</span>
              <span className="text-white/20">•</span>
              <span className="text-slate-300 text-[11px]">Active Pipeline:</span>
              <span className="font-extrabold text-white">{stats.total - stats.disbursed - stats.rejected} Cases</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Slider Pagination Indicator Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-2.5 border-t border-white/10 mt-2">
        <button
          type="button"
          onClick={() => setCurrentSlide(0)}
          className={`h-1.5 rounded-full transition-all duration-200 ${
            currentSlide === 0 ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/30'
          }`}
          aria-label="Slide 1: Case Pipeline"
        />
        <button
          type="button"
          onClick={() => setCurrentSlide(1)}
          className={`h-1.5 rounded-full transition-all duration-200 ${
            currentSlide === 1 ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/30'
          }`}
          aria-label="Slide 2: Business Stats"
        />
      </div>
    </div>
  );
}
