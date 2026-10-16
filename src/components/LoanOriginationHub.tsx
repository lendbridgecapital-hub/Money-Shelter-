'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { LoanApplication, LoanType } from '@/types/db';
import { formatCurrencyINR, LOAN_TYPE_LABELS, formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import LoanCalculator, { CalculatorLoanType } from '@/components/LoanCalculator';

interface LoanOriginationHubProps {
  recentApplications: LoanApplication[];
  totalApplicationsCount: number;
  partnerName?: string;
  partnerRole?: string;
  userId?: string;
  userEmail?: string;
}

type PrimaryCategory = 'PERSONAL_LOAN' | 'HOME_LOAN' | 'BUSINESS_LOAN' | 'OTHER';

interface OtherSubOption {
  type: LoanType;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
}

const OTHER_SUB_OPTIONS: OtherSubOption[] = [
  {
    type: 'BALANCE_TRANSFER',
    title: 'Balance Transfer',
    subtitle: 'Transfer high-interest loans & save on monthly EMI',
    icon: '🔄',
    badge: 'Popular',
  },
  {
    type: 'EDUCATION_LOAN',
    title: 'Education Loan',
    subtitle: 'Domestic & overseas higher education funding',
    icon: '🎓',
    badge: 'Tax Benefit',
  },
  {
    type: 'GOLD_LOAN',
    title: 'Gold Loan',
    subtitle: 'Instant valuation & same-day emergency liquidity',
    icon: '🪙',
    badge: 'Instant Cash',
  },
  {
    type: 'LOAN_AGAINST_PROPERTY',
    title: 'Loan Against Property (LAP)',
    subtitle: 'Unlock high equity against residential/commercial property',
    icon: '🏢',
    badge: 'High Value',
  },
  {
    type: 'OTHERS',
    title: 'Custom / Other Loan',
    subtitle: 'Specialized machinery, working capital & tailor-made facilities',
    icon: '📑',
    badge: 'Custom',
  },
];

export default function LoanOriginationHub({
  recentApplications = [],
  totalApplicationsCount = 0,
}: LoanOriginationHubProps) {
  // Category State
  const [primaryCategory, setPrimaryCategory] = useState<PrimaryCategory>('HOME_LOAN');
  const [selectedSubLoanType, setSelectedSubLoanType] = useState<LoanType>('BALANCE_TRANSFER');
  const [isOtherModalOpen, setIsOtherModalOpen] = useState(false);

  // Active Calculator Loan Type ('HOME_LOAN' | 'PERSONAL_LOAN') - null by default so it stays closed until clicked
  const [calculatorType, setCalculatorType] = useState<CalculatorLoanType | null>(null);

  const handleSelectCategory = (cat: PrimaryCategory) => {
    setPrimaryCategory(cat);
  };

  const handleSelectOtherSubOption = (subType: LoanType) => {
    setSelectedSubLoanType(subType);
    setPrimaryCategory('OTHER');
    setIsOtherModalOpen(false);
  };

  const handleCalculatorTypeChange = (type: CalculatorLoanType) => {
    setCalculatorType(type);
    setPrimaryCategory(type);
  };

  const effectiveLoanType: LoanType =
    primaryCategory === 'OTHER' ? selectedSubLoanType : primaryCategory;

  // Filter out LINK_SHARED and FAILED cases from recent applications overview on dashboard
  const displayApplications = recentApplications.filter(
    (app) => app.status !== 'LINK_SHARED' && app.status !== 'FAILED'
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden space-y-3 p-3 sm:p-3.5">
      {/* 1. Loan Category Tabs Header */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Loan Categories
          </span>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold truncate max-w-[170px]">
            Selected: {LOAN_TYPE_LABELS[effectiveLoanType] || effectiveLoanType}
          </span>
        </div>

        {/* 4 Loan Option Tabs: Compact, 1 Frame, grid-cols-4 */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {/* Home Loan */}
          <button
            type="button"
            onClick={() => handleSelectCategory('HOME_LOAN')}
            className={`relative p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center min-h-[58px] sm:min-h-[66px] active:scale-95 ${
              primaryCategory === 'HOME_LOAN'
                ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs font-bold'
                : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            {primaryCategory === 'HOME_LOAN' && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            )}
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100/90 text-emerald-700 flex items-center justify-center text-xs sm:text-sm mb-0.5 shrink-0">
              🏠
            </div>
            <p className="text-[10px] sm:text-xs font-bold leading-tight truncate w-full">
              <span className="sm:hidden">Home</span>
              <span className="hidden sm:inline">Home Loan</span>
            </p>
            <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium leading-none mt-0.5 truncate block">
              Loan
            </span>
          </button>

          {/* Personal Loan */}
          <button
            type="button"
            onClick={() => handleSelectCategory('PERSONAL_LOAN')}
            className={`relative p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center min-h-[58px] sm:min-h-[66px] active:scale-95 ${
              primaryCategory === 'PERSONAL_LOAN'
                ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs font-bold'
                : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            {primaryCategory === 'PERSONAL_LOAN' && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            )}
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-100/90 text-blue-700 flex items-center justify-center text-xs sm:text-sm mb-0.5 shrink-0">
              👤
            </div>
            <p className="text-[10px] sm:text-xs font-bold leading-tight truncate w-full">
              <span className="sm:hidden">Personal</span>
              <span className="hidden sm:inline">Personal Loan</span>
            </p>
            <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium leading-none mt-0.5 truncate block">
              Loan
            </span>
          </button>

          {/* Business Loan */}
          <button
            type="button"
            onClick={() => handleSelectCategory('BUSINESS_LOAN')}
            className={`relative p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center min-h-[58px] sm:min-h-[66px] active:scale-95 ${
              primaryCategory === 'BUSINESS_LOAN'
                ? 'border-amber-600 bg-amber-50/90 text-amber-950 ring-2 ring-amber-500/30 shadow-xs font-bold'
                : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            {primaryCategory === 'BUSINESS_LOAN' && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            )}
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-100/90 text-amber-700 flex items-center justify-center text-xs sm:text-sm mb-0.5 shrink-0">
              💼
            </div>
            <p className="text-[10px] sm:text-xs font-bold leading-tight truncate w-full">
              <span className="sm:hidden">Business</span>
              <span className="hidden sm:inline">Business Loan</span>
            </p>
            <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium leading-none mt-0.5 truncate block">
              Loan
            </span>
          </button>

          {/* Other Loans / Balance Transfer */}
          <button
            type="button"
            onClick={() => setIsOtherModalOpen(true)}
            className={`relative p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center min-h-[58px] sm:min-h-[66px] active:scale-95 ${
              primaryCategory === 'OTHER'
                ? 'border-purple-600 bg-purple-50/90 text-purple-950 ring-2 ring-purple-500/30 shadow-xs font-bold'
                : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            {primaryCategory === 'OTHER' && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-600"></span>
            )}
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-100/90 text-purple-700 flex items-center justify-center text-xs sm:text-sm mb-0.5 shrink-0">
              🔄
            </div>
            <p className="text-[10px] sm:text-xs font-bold leading-tight truncate w-full">
              {primaryCategory === 'OTHER' ? (
                <span>{LOAN_TYPE_LABELS[selectedSubLoanType] || 'Other'}</span>
              ) : (
                <>
                  <span className="sm:hidden">Other</span>
                  <span className="hidden sm:inline">Other Loans</span>
                </>
              )}
            </p>
            <span className="text-[8px] sm:text-[9px] text-purple-700 font-semibold leading-none mt-0.5 truncate block">
              {primaryCategory === 'OTHER' ? 'Change ▾' : 'BT, Gold ▾'}
            </span>
          </button>
        </div>

        {/* Sub-Selection indicator badge when Other is active */}
        {primaryCategory === 'OTHER' && (
          <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-purple-50/80 border border-purple-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs">📌</span>
              <span className="text-[11px] font-bold text-purple-900 truncate">
                Selected: {LOAN_TYPE_LABELS[selectedSubLoanType]}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOtherModalOpen(true)}
              className="px-2 py-0.5 rounded bg-white border border-purple-200 text-purple-700 text-[10px] font-bold hover:bg-purple-100 transition shadow-2xs"
            >
              Change ▾
            </button>
          </div>
        )}
      </div>

      {/* 2. EMI Calculator Component: Home Loan & Personal Loan tabs that only open on selection */}
      <LoanCalculator
        initialType={calculatorType || undefined}
        onTypeChange={handleCalculatorTypeChange}
      />

      {/* 4. Recent Applications Overview (Clean list of cases, no messy forms) */}
      <div className="border border-slate-200/90 rounded-xl overflow-hidden">
        <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Recent Applications
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
              {totalApplicationsCount}
            </span>
          </div>
          <Link
            href="/branch/requests"
            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            View All Pipeline →
          </Link>
        </div>

        {displayApplications.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No active loan applications recorded yet. All pipeline and link-shared cases can be tracked in the{' '}
            <Link href="/branch/requests" className="text-emerald-700 font-bold hover:underline">
              Loan Pipeline
            </Link>.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayApplications.map((app) => (
              <div
                key={app.id}
                className="p-2.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/branch/requests/${app.id}`}
                      className="font-bold text-slate-900 hover:text-emerald-700 truncate"
                    >
                      {app.fullName}
                    </Link>
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{app.id.slice(-6)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {(app.loanType && LOAN_TYPE_LABELS[app.loanType]) || app.loanType || 'Loan'} • {formatDate(app.createdAt)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-extrabold text-slate-900 text-xs">
                    {formatCurrencyINR(app.approvedAmount || app.loanAmount)}
                  </p>
                  <div className="mt-0.5">
                    <StatusBadge status={app.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Other Loan Sub-Option Popup / Modal */}
      {isOtherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Select Other Loan Sub-Category
                </h3>
                <p className="text-[11px] text-slate-500">
                  Choose specialized financing or balance transfer facility
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOtherModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {OTHER_SUB_OPTIONS.map((sub) => {
                const isSelected = selectedSubLoanType === sub.type;
                return (
                  <button
                    key={sub.type}
                    type="button"
                    onClick={() => handleSelectOtherSubOption(sub.type)}
                    className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center text-lg shrink-0">
                        {sub.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{sub.title}</p>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                            {sub.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          {sub.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white text-[10px]'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && '✓'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsOtherModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
