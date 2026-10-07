'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { formatCurrencyINR } from '@/lib/format';

export type CalculatorLoanType = 'HOME_LOAN' | 'PERSONAL_LOAN';

interface LoanCalculatorProps {
  initialType?: CalculatorLoanType;
  onApply?: (payload: { loanType: CalculatorLoanType; loanAmount: number; tenureMonths: number; emi: number }) => void;
  onTypeChange?: (type: CalculatorLoanType) => void;
  className?: string;
  isCompact?: boolean;
}

function formatIndianShort(num: number): string {
  if (!num || isNaN(num) || num <= 0) return '₹0';
  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, '');
    return `₹${cr} Cr`;
  }
  if (num >= 100000) {
    const lk = (num / 100000).toFixed(2).replace(/\.00$/, '');
    return `₹${lk} Lakh`;
  }
  if (num >= 1000) {
    const th = (num / 1000).toFixed(0);
    return `₹${th} K`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

export default function LoanCalculator({
  initialType,
  onApply,
  onTypeChange,
  className = '',
}: LoanCalculatorProps) {
  // Only open when a tab (Home Loan or Personal Loan) is explicitly selected
  const [selectedType, setSelectedType] = useState<CalculatorLoanType | null>(initialType || null);
  const [isOpen, setIsOpen] = useState<boolean>(Boolean(initialType));

  // Sync if initialType changes from outside
  useEffect(() => {
    if (initialType === 'HOME_LOAN' || initialType === 'PERSONAL_LOAN') {
      setSelectedType(initialType);
      setIsOpen(true);
    }
  }, [initialType]);

  const loanType: CalculatorLoanType = selectedType || 'HOME_LOAN';
  const isHome = loanType === 'HOME_LOAN';

  const handleTabClick = (type: CalculatorLoanType) => {
    if (selectedType === type && isOpen) {
      // Toggle close
      setIsOpen(false);
      setSelectedType(null);
    } else {
      setSelectedType(type);
      setIsOpen(true);
      if (onTypeChange) onTypeChange(type);
    }
  };

  // Loan Amount
  const [homeLoanAmount, setHomeLoanAmount] = useState<number>(3500000);
  const [personalLoanAmount, setPersonalLoanAmount] = useState<number>(500000);

  // Interest Rates (% p.a.)
  const [homeInterestRate, setHomeInterestRate] = useState<number>(8.5);
  const [personalInterestRate, setPersonalInterestRate] = useState<number>(11.5);

  // Tenure (Years)
  const [homeTenureYears, setHomeTenureYears] = useState<number>(20);
  const [personalTenureYears, setPersonalTenureYears] = useState<number>(3);

  // Amortization Schedule View: 'YEARLY' | 'MONTHLY'
  const [scheduleView, setScheduleView] = useState<'YEARLY' | 'MONTHLY'>('YEARLY');
  const [showSchedule, setShowSchedule] = useState<boolean>(true);
  const [copiedBreakdown, setCopiedBreakdown] = useState<boolean>(false);

  // Active Variables depending on type
  const amount = isHome ? homeLoanAmount : personalLoanAmount;
  const setAmount = isHome ? setHomeLoanAmount : setPersonalLoanAmount;
  const rate = isHome ? homeInterestRate : personalInterestRate;
  const setRate = isHome ? setHomeInterestRate : setPersonalInterestRate;
  const tenureYears = isHome ? homeTenureYears : personalTenureYears;
  const setTenureYears = isHome ? setHomeTenureYears : setPersonalTenureYears;

  // Amount limits
  const minAmount = isHome ? 500000 : 50000;
  const maxAmount = isHome ? 50000000 : 4000000; // 5 Cr for Home, 40 Lakhs for Personal
  const amountStep = isHome ? 50000 : 10000;

  // Rate limits
  const minRate = isHome ? 6.5 : 9.5;
  const maxRate = isHome ? 16.0 : 26.0;
  const rateStep = 0.1;

  // Tenure limits
  const minTenure = 1;
  const maxTenure = isHome ? 30 : 7;

  // Quick Chips
  const homeAmountPresets = [
    { label: '₹20L', val: 2000000 },
    { label: '₹35L', val: 3500000 },
    { label: '₹50L', val: 5000000 },
    { label: '₹75L', val: 7500000 },
    { label: '₹1 Cr', val: 10000000 },
  ];

  const personalAmountPresets = [
    { label: '₹1L', val: 100000 },
    { label: '₹3L', val: 300000 },
    { label: '₹5L', val: 500000 },
    { label: '₹10L', val: 1000000 },
    { label: '₹20L', val: 2000000 },
  ];

  const homeTenurePresets = [10, 15, 20, 25, 30];
  const personalTenurePresets = [1, 2, 3, 4, 5];

  // Mathematical EMI Calculation
  const { emi, totalInterest, totalPayable, principalPercent, interestPercent } = useMemo(() => {
    const P = amount || 0;
    const n = Math.max(1, tenureYears * 12);
    const r = rate / 12 / 100;

    if (P <= 0) {
      return { emi: 0, totalInterest: 0, totalPayable: 0, principalPercent: 0, interestPercent: 0 };
    }

    let calculatedEmi = 0;
    if (r === 0) {
      calculatedEmi = P / n;
    } else {
      const factor = Math.pow(1 + r, n);
      calculatedEmi = (P * r * factor) / (factor - 1);
    }

    calculatedEmi = Math.round(calculatedEmi);
    const calculatedTotalPayable = Math.round(calculatedEmi * n);
    const calculatedTotalInterest = Math.max(0, calculatedTotalPayable - P);

    const pPct = calculatedTotalPayable > 0 ? (P / calculatedTotalPayable) * 100 : 0;
    const iPct = calculatedTotalPayable > 0 ? (calculatedTotalInterest / calculatedTotalPayable) * 100 : 0;

    return {
      emi: calculatedEmi,
      totalInterest: calculatedTotalInterest,
      totalPayable: calculatedTotalPayable,
      principalPercent: Math.round(pPct),
      interestPercent: Math.round(iPct),
    };
  }, [amount, rate, tenureYears]);

  // Yearly Amortization preview
  const yearlySchedule = useMemo(() => {
    if (amount <= 0 || emi <= 0) return [];
    const r = rate / 12 / 100;
    let balance = amount;
    const yearsList = [];

    for (let yr = 1; yr <= tenureYears; yr++) {
      let yearlyInterest = 0;
      let yearlyPrincipal = 0;

      for (let m = 0; m < 12; m++) {
        if (balance <= 0) break;
        const interestForMonth = balance * r;
        const principalForMonth = Math.min(balance, emi - interestForMonth);
        yearlyInterest += interestForMonth;
        yearlyPrincipal += principalForMonth;
        balance -= principalForMonth;
      }

      yearsList.push({
        year: yr,
        principalPaid: Math.round(yearlyPrincipal),
        interestPaid: Math.round(yearlyInterest),
        remainingBalance: Math.max(0, Math.round(balance)),
      });

      if (balance <= 0) break;
    }
    return yearsList;
  }, [amount, rate, tenureYears, emi]);

  // Monthly Amortization preview
  const monthlySchedule = useMemo(() => {
    if (amount <= 0 || emi <= 0) return [];
    const r = rate / 12 / 100;
    const totalMonths = tenureYears * 12;
    let balance = amount;
    const monthsList = [];

    for (let m = 1; m <= totalMonths; m++) {
      if (balance <= 0) break;
      const interestForMonth = balance * r;
      const principalForMonth = Math.min(balance, emi - interestForMonth);
      balance -= principalForMonth;

      monthsList.push({
        month: m,
        year: Math.ceil(m / 12),
        principalPaid: Math.round(principalForMonth),
        interestPaid: Math.round(interestForMonth),
        remainingBalance: Math.max(0, Math.round(balance)),
      });
    }
    return monthsList;
  }, [amount, rate, tenureYears, emi]);

  // Share text generator
  const getShareableText = () => {
    const loanName = isHome ? 'Home Loan' : 'Personal Loan';
    return `*Quickfinsure EMI Estimate Breakdown*
------------------------------------
🏦 *Loan Type:* ${loanName}
💰 *Loan Amount:* ${formatCurrencyINR(amount)}
📊 *Interest Rate:* ${rate.toFixed(1)}% p.a.
⏳ *Tenure:* ${tenureYears} Years (${tenureYears * 12} Months)
------------------------------------
💵 *Monthly EMI:* ${formatCurrencyINR(emi)} / month
📈 *Total Interest Payable:* ${formatCurrencyINR(totalInterest)}
💳 *Total Amount Payable:* ${formatCurrencyINR(totalPayable)}
------------------------------------
Calculated with Quickfinsure loan advisory tools.`;
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getShareableText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyBreakdown = () => {
    navigator.clipboard.writeText(getShareableText());
    setCopiedBreakdown(true);
    setTimeout(() => setCopiedBreakdown(false), 2500);
  };

  const handleApplyClick = () => {
    if (onApply) {
      onApply({
        loanType,
        loanAmount: amount,
        tenureMonths: tenureYears * 12,
        emi,
      });
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all ${className}`}
    >
      {/* Top Header: Clean Two Tabs for Home Loan and Personal Loan */}
      <div className="p-2 sm:p-2.5 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black shadow-inner">
            🧮
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 tracking-tight flex items-center gap-1">
              <span>EMI Calculator</span>
              {isOpen && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  {isHome ? 'Home Loan' : 'Personal Loan'} Active
                </span>
              )}
            </h3>
            <p className="text-[9px] text-slate-500 leading-none mt-0.5">
              {isOpen
                ? 'Adjust amount, tenure, and rate to review live EMI & repayment schedule'
                : 'Select Home Loan or Personal Loan to open instant EMI calculator'}
            </p>
          </div>
        </div>

        {/* The Two Distinct Tabs: Home Loan & Personal Loan */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleTabClick('HOME_LOAN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
              isOpen && isHome
                ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <span>🏠</span>
            <span>Home Loan</span>
            {isOpen && isHome && <span className="text-[10px] opacity-80">▲</span>}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('PERSONAL_LOAN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
              isOpen && !isHome
                ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <span>👤</span>
            <span>Personal Loan</span>
            {isOpen && !isHome && <span className="text-[10px] opacity-80">▲</span>}
          </button>

          {isOpen && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 px-1.5 py-1 rounded hover:bg-slate-100 ml-1"
              title="Close Calculator"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Calculator Body: ONLY rendered when a tab is selected / opened */}
      {isOpen && (
        <div className="animate-in fade-in duration-200">
          <div className="p-3 sm:p-4 bg-slate-50/50 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 border-b border-slate-200">
            {/* Left Inputs Column (7 cols on desktop) */}
            <div className="lg:col-span-7 space-y-3">
              {/* 1. Loan Amount Slider & Input */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-700">Loan Amount</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min={minAmount}
                      max={maxAmount}
                      step={amountStep}
                      value={amount}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAmount(Math.min(maxAmount, Math.max(0, v)));
                      }}
                      className="w-28 sm:w-32 px-2 py-1 text-right text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min={minAmount}
                  max={maxAmount}
                  step={amountStep}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />

                {/* Quick Presets & Min/Max */}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex flex-wrap items-center gap-1">
                    {(isHome ? homeAmountPresets : personalAmountPresets).map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setAmount(preset.val)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition ${
                          amount === preset.val
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] font-extrabold text-emerald-700">
                    {formatIndianShort(amount)}
                  </span>
                </div>
              </div>

              {/* 2. Interest Rate Slider & Input */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-700">Interest Rate (% p.a.)</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={minRate}
                      max={maxRate}
                      step={rateStep}
                      value={rate}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setRate(Math.min(maxRate, Math.max(minRate, v)));
                      }}
                      className="w-20 px-2 py-1 text-right text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-slate-500 font-bold text-xs">%</span>
                  </div>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min={minRate}
                  max={maxRate}
                  step={rateStep}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                  <span>Min {minRate}%</span>
                  <span className="text-emerald-700 font-bold">{rate.toFixed(1)}% p.a.</span>
                  <span>Max {maxRate}%</span>
                </div>
              </div>

              {/* 3. Loan Tenure (Years) */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-700">Loan Tenure</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={minTenure}
                      max={maxTenure}
                      step={1}
                      value={tenureYears}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setTenureYears(Math.min(maxTenure, Math.max(minTenure, v)));
                      }}
                      className="w-16 px-2 py-1 text-right text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-slate-500 font-bold text-xs">Years</span>
                  </div>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min={minTenure}
                  max={maxTenure}
                  step={1}
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />

                {/* Quick Tenure Buttons */}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex flex-wrap items-center gap-1">
                    {(isHome ? homeTenurePresets : personalTenurePresets).map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setTenureYears(y)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition ${
                          tenureYears === y
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {y} Yrs
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {tenureYears * 12} Months
                  </span>
                </div>
              </div>
            </div>

            {/* Right Output Column (5 cols on desktop) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
              {/* Highlighted EMI Card */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xs relative overflow-hidden">
                <div className="absolute right-0 top-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-center justify-between text-xs text-slate-300 mb-0.5">
                  <span className="font-semibold uppercase tracking-wider text-[9px]">
                    Calculated Monthly EMI
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-400/30">
                    {isHome ? 'Home' : 'Personal'}
                  </span>
                </div>

                <div className="my-1">
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight flex items-baseline gap-1">
                    <span>{formatCurrencyINR(emi)}</span>
                    <span className="text-[11px] text-slate-300 font-normal">/ month</span>
                  </div>
                </div>

                {/* Split Progress Bar */}
                <div className="space-y-1 pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between text-[9px] text-slate-300">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                      Principal ({principalPercent}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                      Interest ({interestPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-700/80 overflow-hidden flex">
                    <div
                      style={{ width: `${principalPercent}%` }}
                      className="bg-emerald-400 h-full transition-all duration-300"
                    />
                    <div
                      style={{ width: `${interestPercent}%` }}
                      className="bg-amber-400 h-full transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Summary Numbers */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10 text-xs">
                  <div>
                    <p className="text-[9px] text-slate-400">Total Interest</p>
                    <p className="text-xs sm:text-sm font-bold text-amber-300">
                      {formatCurrencyINR(totalInterest)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400">Total Payable</p>
                    <p className="text-xs sm:text-sm font-bold text-white">
                      {formatCurrencyINR(totalPayable)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Share & Apply Controls */}
              <div className="space-y-2">
                {/* Shareable Buttons (WhatsApp & Copy) */}
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-700 flex items-center gap-1">
                      <span>📤 Shareable Estimate</span>
                    </span>
                    {copiedBreakdown && (
                      <span className="text-[10px] font-bold text-emerald-600 animate-pulse">
                        ✓ Copied to clipboard!
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>💬 WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyBreakdown}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <span>📋 Copy Estimate</span>
                    </button>
                  </div>
                </div>

                {/* Apply with this estimate if onApply is provided */}
                {onApply && (
                  <button
                    type="button"
                    onClick={handleApplyClick}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold shadow-2xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>⚡ Use this Loan Amount ({formatIndianShort(amount)})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Amortization Schedule with Year & Month Tabs */}
          <div className="p-3 sm:p-4 bg-slate-50/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-extrabold text-slate-800">
                  Repayment Schedule
                </h4>
                <div className="flex items-center p-0.5 bg-slate-200/70 rounded-lg border border-slate-300/70">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleView('YEARLY');
                      setShowSchedule(true);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                      scheduleView === 'YEARLY' && showSchedule
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📅 Yearly View ({yearlySchedule.length} Yrs)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleView('MONTHLY');
                      setShowSchedule(true);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                      scheduleView === 'MONTHLY' && showSchedule
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🗓️ Monthly View ({monthlySchedule.length} Mos)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-medium">Amounts in INR (₹)</span>
                <button
                  type="button"
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="text-[10px] font-bold text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-200"
                >
                  {showSchedule ? 'Hide ▲' : 'Show ▼'}
                </button>
              </div>
            </div>

            {showSchedule && (
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                {scheduleView === 'YEARLY' ? (
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-2 px-3">Year</th>
                        <th className="py-2 px-3 text-right">Principal Paid</th>
                        <th className="py-2 px-3 text-right">Interest Paid</th>
                        <th className="py-2 px-3 text-right">Ending Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {yearlySchedule.map((row) => (
                        <tr key={row.year} className="hover:bg-slate-50 transition">
                          <td className="py-1.5 px-3 font-bold text-slate-800">Year {row.year}</td>
                          <td className="py-1.5 px-3 text-right text-emerald-700 font-semibold">
                            {formatCurrencyINR(row.principalPaid)}
                          </td>
                          <td className="py-1.5 px-3 text-right text-amber-700 font-semibold">
                            {formatCurrencyINR(row.interestPaid)}
                          </td>
                          <td className="py-1.5 px-3 text-right text-slate-700 font-mono">
                            {formatCurrencyINR(row.remainingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-2 px-3">Month</th>
                        <th className="py-2 px-3">Year</th>
                        <th className="py-2 px-3 text-right">Principal</th>
                        <th className="py-2 px-3 text-right">Interest</th>
                        <th className="py-2 px-3 text-right">Remaining Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlySchedule.map((row) => (
                        <tr key={row.month} className="hover:bg-slate-50 transition">
                          <td className="py-1.5 px-3 font-bold text-slate-800">Month {row.month}</td>
                          <td className="py-1.5 px-3 text-slate-500">Yr {row.year}</td>
                          <td className="py-1.5 px-3 text-right text-emerald-700 font-semibold">
                            {formatCurrencyINR(row.principalPaid)}
                          </td>
                          <td className="py-1.5 px-3 text-right text-amber-700 font-semibold">
                            {formatCurrencyINR(row.interestPaid)}
                          </td>
                          <td className="py-1.5 px-3 text-right text-slate-700 font-mono">
                            {formatCurrencyINR(row.remainingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
