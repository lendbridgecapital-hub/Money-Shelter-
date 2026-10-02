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
  initialType = 'HOME_LOAN',
  onApply,
  onTypeChange,
  className = '',
  isCompact = false,
}: LoanCalculatorProps) {
  const [loanType, setLoanType] = useState<CalculatorLoanType>(initialType);

  // Sync if initialType changes from outside
  useEffect(() => {
    if (initialType === 'HOME_LOAN' || initialType === 'PERSONAL_LOAN') {
      setLoanType(initialType);
    }
  }, [initialType]);

  const handleTypeSelect = (type: CalculatorLoanType) => {
    setLoanType(type);
    if (onTypeChange) onTypeChange(type);
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

  // View Amortization Schedule
  const [showAmortization, setShowAmortization] = useState(false);

  // Active Variables depending on type
  const isHome = loanType === 'HOME_LOAN';
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
  const amortizationSchedule = useMemo(() => {
    if (!showAmortization || amount <= 0) return [];
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
  }, [showAmortization, amount, rate, tenureYears, emi]);

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
      className={`bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all ${className}`}
    >
      {/* Top Header & Dual Mode Switcher */}
      <div className="p-3 sm:p-4 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-black shadow-inner">
            🧮
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>{isHome ? 'Home Loan' : 'Personal Loan'} EMI Calculator</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Live Estimates
              </span>
            </h3>
            <p className="text-[10px] text-slate-500">
              Calculate instant monthly installment & interest breakdown
            </p>
          </div>
        </div>

        {/* Dual Tab Switcher Pill */}
        <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleTypeSelect('HOME_LOAN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              isHome
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🏠</span>
            <span>Home Loan</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeSelect('PERSONAL_LOAN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              !isHome
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👤</span>
            <span>Personal Loan</span>
          </button>
        </div>
      </div>

      <div className="p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left Inputs Column (7 cols on desktop, full width on mobile) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. Loan Amount Slider & Input */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
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
                  className="w-28 sm:w-32 px-2.5 py-1 text-right text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            <div className="flex items-center justify-between pt-1">
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
              <span className="text-[10px] font-extrabold text-emerald-700">
                {formatIndianShort(amount)}
              </span>
            </div>
          </div>

          {/* 2. Interest Rate Slider & Input */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
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

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Min {minRate}%</span>
              <span className="text-emerald-700 font-bold">{rate.toFixed(1)}% p.a.</span>
              <span>Max {maxRate}%</span>
            </div>
          </div>

          {/* 3. Loan Tenure (Years) */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
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
            <div className="flex items-center justify-between pt-1">
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

        {/* Right Output Column (5 cols on desktop, full width on mobile) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3.5">
          {/* Highlighted EMI Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Calculated Monthly Installment
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                EMI
              </span>
            </div>

            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight flex items-baseline gap-1">
                <span>{formatCurrencyINR(emi)}</span>
                <span className="text-xs text-slate-300 font-normal">/ month</span>
              </div>
            </div>

            {/* Split Progress Bar */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] text-slate-300">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                  Principal ({principalPercent}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                  Interest ({interestPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-700/80 overflow-hidden flex">
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
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/10 text-xs">
              <div>
                <p className="text-[10px] text-slate-400">Total Interest</p>
                <p className="text-xs sm:text-sm font-bold text-amber-300">
                  {formatCurrencyINR(totalInterest)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Total Payable</p>
                <p className="text-xs sm:text-sm font-bold text-white">
                  {formatCurrencyINR(totalPayable)}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button: Apply with this Loan */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleApplyClick}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-2"
            >
              <span>⚡ Apply for {isHome ? 'Home Loan' : 'Personal Loan'}</span>
              <span>({formatIndianShort(amount)}) →</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAmortization(!showAmortization)}
              className="w-full py-1.5 px-3 rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 text-[11px] font-bold transition flex items-center justify-center gap-1"
            >
              <span>📅 {showAmortization ? 'Hide' : 'View'} Yearly Amortization Schedule</span>
              <span>{showAmortization ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Amortization Schedule Accordion */}
      {showAmortization && (
        <div className="p-3 sm:p-5 border-t border-slate-200 bg-slate-50 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800">
              Year-by-Year Repayment Schedule ({tenureYears} Years)
            </h4>
            <span className="text-[10px] text-slate-500">Amounts in INR (₹)</span>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-100/80 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Year</th>
                  <th className="py-2 px-3 text-right">Principal</th>
                  <th className="py-2 px-3 text-right">Interest</th>
                  <th className="py-2 px-3 text-right">Ending Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {amortizationSchedule.map((row) => (
                  <tr key={row.year} className="hover:bg-slate-50 transition">
                    <td className="py-1.5 px-3 font-semibold text-slate-800">Year {row.year}</td>
                    <td className="py-1.5 px-3 text-right text-emerald-700 font-medium">
                      {formatCurrencyINR(row.principalPaid)}
                    </td>
                    <td className="py-1.5 px-3 text-right text-amber-700 font-medium">
                      {formatCurrencyINR(row.interestPaid)}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-700 font-mono">
                      {formatCurrencyINR(row.remainingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
