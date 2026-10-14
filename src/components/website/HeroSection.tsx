'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export function HeroSection() {
  const [activeTab, setActiveTab] = useState<'home' | 'lap' | 'business' | 'builder' | 'personal'>('home');
  const [loanAmount, setLoanAmount] = useState<number>(5000000); // 50 Lakhs default
  const [tenureYears, setTenureYears] = useState<number>(20);

  // Tab configurations
  const tabConfigs = {
    home: {
      title: 'Home Loan',
      rate: '8.35% p.a.*',
      maxTenure: 30,
      defaultAmount: 5000000,
      amountLabel: 'Desired Loan Amount',
      tagline: 'Lowest rates from 20+ partner banks with end-to-end doorstep paperwork.',
    },
    lap: {
      title: 'Loan Against Property',
      rate: '9.25% p.a.*',
      maxTenure: 20,
      defaultAmount: 10000000,
      amountLabel: 'Estimated Property Value',
      tagline: 'High-ticket liquidity up to ₹25 Cr against residential or commercial properties.',
    },
    business: {
      title: 'Business Loan',
      rate: '11.50% p.a.*',
      maxTenure: 7,
      defaultAmount: 2500000,
      amountLabel: 'Required Growth Capital',
      tagline: 'Unsecured working capital & term finance without asset hypothecation.',
    },
    builder: {
      title: 'Builder APF & Project',
      rate: 'Custom Pricing',
      maxTenure: 5,
      defaultAmount: 50000000,
      amountLabel: 'Project Realization / Value',
      tagline: 'Pre-approved site clearances across 20+ banks for swift buyer unit disbursal.',
    },
    personal: {
      title: 'Personal Loan',
      rate: '10.49% p.a.*',
      maxTenure: 5,
      defaultAmount: 500000,
      amountLabel: 'Instant Cash Requirement',
      tagline: 'Fast sanction within 24 hours for emergency, medical, or travel needs.',
    },
  };

  const currentConfig = tabConfigs[activeTab];

  // Quick EMI calculation preview
  const monthlyRate = (parseFloat(currentConfig.rate) || 9.5) / (12 * 100);
  const totalMonths = tenureYears * 12;
  const quickEmi = Math.round(
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );

  return (
    <section className="relative bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 pt-10 pb-20 md:pt-16 md:pb-28 border-b border-slate-200 overflow-hidden">
      {/* Subtle modern background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Value Proposition & Institutional Trust (Urban Money Clean Style) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-cyan-50 border border-cyan-200/80 text-cyan-900 text-xs sm:text-sm font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse"></span>
              <span>10+ Years of Mortgage & Project Lending</span>
              <span className="text-cyan-300">|</span>
              <span className="text-amber-700 font-extrabold">Pune HQ</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 font-sans leading-[1.12]">
              Simplifying Loans. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-700 via-teal-700 to-amber-600">
                Where Money Meets Trust.
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
              Empowering homebuyers, entrepreneurs, and real estate developers with transparent debt structuring. Direct empanelment with 20+ leading banks & NBFCs.
            </p>

            {/* Key Value Badges */}
            <div className="grid grid-cols-3 gap-3 pt-2 max-w-xl">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="text-xl sm:text-2xl font-extrabold text-cyan-800 font-sans">
                  ₹2,500<span className="text-sm font-semibold text-slate-500"> Cr+</span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Disbursed</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="text-xl sm:text-2xl font-extrabold text-amber-700 font-sans">
                  30,000<span className="text-sm font-semibold text-slate-500">+</span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Customers</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-sans">
                  20<span className="text-sm font-semibold text-slate-500">+ Banks</span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Direct Lenders</div>
              </div>
            </div>

            {/* Partner Bank Logos Ribbon */}
            <div className="pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Trusted Banking Partners & Lenders
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-700 text-xs font-bold">
                {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Kotak Mahindra', 'Axis Bank', 'Tata Capital', 'Bajaj Finserv'].map((bank, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 hover:bg-slate-200/70 transition-colors"
                  >
                    {bank}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Urban Money Style Quick Loan Selector & Rate Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-7 relative">
              {/* Card Header with Product Tabs */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider">Quick Eligibility Checker</span>
                  <h3 className="text-lg font-bold text-slate-900">Find Your Best Loan Offer</h3>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                  {currentConfig.rate}
                </span>
              </div>

              {/* Product Tabs */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5">
                {(['home', 'lap', 'business', 'builder', 'personal'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setLoanAmount(tabConfigs[tab].defaultAmount);
                    }}
                    className={`py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${
                      activeTab === tab
                        ? 'bg-white text-cyan-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'home' && 'Home'}
                    {tab === 'lap' && 'LAP'}
                    {tab === 'business' && 'Business'}
                    {tab === 'builder' && 'APF'}
                    {tab === 'personal' && 'Personal'}
                  </button>
                ))}
              </div>

              {/* Tab Description */}
              <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {currentConfig.tagline}
              </p>

              {/* Form Controls */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>{currentConfig.amountLabel}</span>
                    <span className="text-cyan-800 font-extrabold text-sm">
                      ₹ {(loanAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={activeTab === 'personal' ? 100000 : activeTab === 'builder' ? 5000000 : 500000}
                    max={activeTab === 'personal' ? 4000000 : activeTab === 'builder' ? 200000000 : 50000000}
                    step={activeTab === 'personal' ? 50000 : 500000}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-700"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Min</span>
                    <span>Max</span>
                  </div>
                </div>

                {activeTab !== 'builder' && (
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span>Tenure</span>
                      <span className="text-slate-900 font-bold">{tenureYears} Years</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={currentConfig.maxTenure}
                      value={tenureYears}
                      onChange={(e) => setTenureYears(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-700"
                    />
                  </div>
                )}

                {/* Estimated EMI Box */}
                {activeTab !== 'builder' && (
                  <div className="bg-gradient-to-r from-cyan-900 to-slate-900 text-white rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-cyan-200 font-medium">Estimated Monthly EMI</div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400">
                        ₹ {isNaN(quickEmi) ? '0' : quickEmi.toLocaleString('en-IN')} <span className="text-xs text-white font-normal">/mo</span>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-300">
                      <div>Subject to CIBIL &</div>
                      <div>Bank Credit Norms</div>
                    </div>
                  </div>
                )}

                {/* Instant Application Action Button */}
                <Link
                  href={`/contact?product=${activeTab}&amount=${loanAmount}`}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg hover:shadow-amber-500/20 text-center block transition-all transform active:scale-98"
                >
                  Apply & Check Best Bank Offers →
                </Link>

                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Zero Upfront Advisory Fee
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Doorstep Documentation
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
