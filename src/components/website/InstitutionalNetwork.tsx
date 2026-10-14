'use client';

import React from 'react';

export function InstitutionalNetwork() {
  const nationalised = [
    'Bank of Maharashtra',
    'State Bank of India (SBI)',
    'Bank of Baroda',
    'Indian Overseas Bank',
    'IDBI Bank',
  ];

  const privateBanks = [
    'ICICI Bank',
    'HDFC Bank',
    'Kotak Mahindra Bank',
    'Federal Bank',
    'Axis Bank',
    'Bandhan Bank',
    'RBL Bank',
  ];

  const nbfcs = [
    'Tata Capital',
    'Bajaj Finance',
    'L&T Finance',
    'Can Fin Homes',
    'Repco Home Finance',
    'Aditya Birla Capital',
    'IIFL Finance',
  ];

  return (
    <section id="lenders" className="py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3.5 py-1 rounded-full mb-3">
            Institutional Network
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-serif tracking-tight">
            A broad lender network expands financing choice.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            From opportunity sourcing to lender coordination and customer support across public, private, and institutional credit institutions.
          </p>
        </div>

        {/* 3 Metrics Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-4xl font-extrabold text-cyan-700 font-serif">30+</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Builder Relationships</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-4xl font-extrabold text-amber-600 font-serif">500</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Channel Partners</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-4xl font-extrabold text-slate-900 font-serif">30,000+</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Customers Served</div>
          </div>
        </div>

        {/* 3 Banking Categories Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Nationalised Banks */}
          <div className="rounded-3xl p-8 bg-slate-50 border border-slate-200 hover:border-cyan-600 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-cyan-900 uppercase tracking-wider bg-cyan-100/80 px-3 py-1 rounded-full">
                  Public Sector
                </span>
                <span className="text-xs font-bold text-slate-400">5 Partners</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-serif">
                Nationalised Banks
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                Preferred for lower interest benchmarks, government schemes, and reliable mortgage underwriting.
              </p>
              <ul className="space-y-2.5">
                {nationalised.map((bank) => (
                  <li key={bank} className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 text-sm font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-cyan-700 flex-shrink-0" />
                    <span>{bank}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200/80 text-[11px] text-slate-400">
              Direct institutional tie-ups & branch manager liaisons.
            </div>
          </div>

          {/* Private Banks */}
          <div className="rounded-3xl p-8 bg-slate-50 border border-slate-200 hover:border-cyan-600 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider bg-blue-100/80 px-3 py-1 rounded-full">
                  Private Sector
                </span>
                <span className="text-xs font-bold text-slate-400">7 Partners</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-serif">
                Private Banks
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                Rapid turnaround, flexible income assessments, working capital overdrafts, and high-ticket lending.
              </p>
              <ul className="space-y-2.5">
                {privateBanks.map((bank) => (
                  <li key={bank} className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 text-sm font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                    <span>{bank}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200/80 text-[11px] text-slate-400">
              API-assisted credit assessment & fast-track digital approval.
            </div>
          </div>

          {/* NBFCs & HFCs */}
          <div className="rounded-3xl p-8 bg-slate-50 border border-slate-200 hover:border-amber-500 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider bg-amber-100/80 px-3 py-1 rounded-full">
                  Specialized Credit
                </span>
                <span className="text-xs font-bold text-slate-400">7 Partners</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-serif">
                NBFCs & HFCs
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                Specialized housing finance, unstructured cash-flow loans, builder finance, and custom property loans.
              </p>
              <ul className="space-y-2.5">
                {nbfcs.map((bank) => (
                  <li key={bank} className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 text-sm font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <span>{bank}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200/80 text-[11px] text-slate-400">
              Customized credit norms & flexible collateral appraisal.
            </div>
          </div>
        </div>

        {/* Bottom Disclaimer & Callout */}
        <div className="mt-12 p-6 rounded-2xl bg-cyan-50/60 border border-cyan-100 text-center text-xs text-slate-600 max-w-3xl mx-auto">
          <div className="font-bold text-cyan-900 text-sm mb-1">
            One Connected Financial Ecosystem
          </div>
          From opportunity sourcing to lender coordination and customer support across Maharashtra and beyond.
          <div className="text-[11px] text-slate-400 mt-2">
            Partnership names supplied by company management. All trademarks belong to their respective institutions.
          </div>
        </div>
      </div>
    </section>
  );
}
