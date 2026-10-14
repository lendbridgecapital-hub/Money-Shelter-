'use client';

import React, { useState, useMemo } from 'react';

export function EmiCalculatorSection() {
  const [loanAmount, setLoanAmount] = useState<number>(5000000); // 50 Lakhs default
  const [interestRate, setInterestRate] = useState<number>(8.5); // 8.5% default
  const [tenureYears, setTenureYears] = useState<number>(20); // 20 years default

  // Calculate Monthly EMI using standard formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
  const calculation = useMemo(() => {
    const P = loanAmount;
    const r = interestRate / 12 / 100;
    const n = tenureYears * 12;

    if (r === 0) {
      const emi = P / n;
      return {
        monthlyEmi: Math.round(emi),
        totalInterest: 0,
        totalPayment: P,
        principalPercent: 100,
        interestPercent: 0,
      };
    }

    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - P;

    const principalPercent = Math.round((P / totalPayment) * 100);
    const interestPercent = 100 - principalPercent;

    return {
      monthlyEmi: Math.round(emi),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment),
      principalPercent,
      interestPercent,
    };
  }, [loanAmount, interestRate, tenureYears]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleApplyClick = () => {
    const applySection = document.getElementById('apply');
    if (applySection) {
      applySection.scrollIntoView({ behavior: 'smooth' });
      // Dispatch an event or focus on input
      const amountInput = document.getElementById('inquiry-loan-amount') as HTMLInputElement | null;
      if (amountInput) {
        amountInput.value = loanAmount.toString();
        amountInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  return (
    <section id="calculator" className="py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3.5 py-1 rounded-full mb-3">
            Financial Planning Tool
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-serif tracking-tight">
            Interactive Loan EMI Calculator
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Estimate your monthly installments, total interest commitments, and repayment milestones across different loan structures.
          </p>
        </div>

        <div className="mt-14 max-w-5xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-7">
            {/* Loan Amount Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-700">Loan Amount</label>
                <div className="px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-900 font-extrabold font-serif text-base sm:text-lg">
                  {formatINR(loanAmount)}
                </div>
              </div>
              <input
                type="range"
                min={100000}
                max={50000000}
                step={50000}
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-700"
              />
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-1.5">
                <span>₹1 Lakh</span>
                <span>₹50 Lakhs</span>
                <span>₹5 Crore</span>
              </div>
            </div>

            {/* Interest Rate Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-700">Interest Rate (% p.a.)</label>
                <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-extrabold font-serif text-base sm:text-lg">
                  {interestRate}%
                </div>
              </div>
              <input
                type="range"
                min={6.5}
                max={18.0}
                step={0.1}
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-1.5">
                <span>6.5% (Prime Home)</span>
                <span>10.5% (Commercial)</span>
                <span>18.0% (Personal)</span>
              </div>
            </div>

            {/* Tenure Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-700">Loan Tenure</label>
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 font-extrabold font-serif text-base sm:text-lg">
                  {tenureYears} Years ({tenureYears * 12} Months)
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
              />
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-1.5">
                <span>1 Year</span>
                <span>15 Years</span>
                <span>30 Years</span>
              </div>
            </div>
          </div>

          {/* Result Card Column */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-inner flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest block mb-1">
                Estimated Monthly EMI
              </span>
              <div className="text-3xl sm:text-4xl font-black text-amber-400 font-serif tracking-tight">
                {formatINR(calculation.monthlyEmi)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Per month for {tenureYears} years @ {interestRate}%
              </p>

              {/* Breakdown */}
              <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Principal Amount:</span>
                  <span className="font-bold text-white">{formatINR(loanAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Total Interest Payable:</span>
                  <span className="font-bold text-amber-300">{formatINR(calculation.totalInterest)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-slate-800/80">
                  <span className="text-slate-300">Total Repayment:</span>
                  <span className="text-cyan-300 font-serif text-sm">{formatINR(calculation.totalPayment)}</span>
                </div>
              </div>

              {/* Progress Bar Distribution */}
              <div className="mt-6">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  <span className="text-cyan-400">Principal ({calculation.principalPercent}%)</span>
                  <span className="text-amber-400">Interest ({calculation.interestPercent}%)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    style={{ width: `${calculation.principalPercent}%` }}
                    className="bg-cyan-500 h-full transition-all duration-300"
                  />
                  <div
                    style={{ width: `${calculation.interestPercent}%` }}
                    className="bg-amber-500 h-full transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={handleApplyClick}
                className="w-full py-3 text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Apply for {formatINR(loanAmount)}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
