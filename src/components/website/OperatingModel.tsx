'use client';

import React from 'react';

export function OperatingModel() {
  const steps = [
    {
      step: '1',
      title: 'UNDERSTAND',
      desc: 'Deep-dive into borrower profile, income streams, balance sheets, or project feasibility needs.',
      badge: 'Needs Assessment',
    },
    {
      step: '2',
      title: 'MATCH',
      desc: 'Intelligent multi-bank evaluation against credit policy matrices to secure best-in-market rates and loan limits.',
      badge: 'Lender Optimization',
    },
    {
      step: '3',
      title: 'PREPARE',
      desc: 'Complete documentation readiness, legal checks, KYC verification, and bank-grade credit memo compilation.',
      badge: 'File Readiness',
    },
    {
      step: '4',
      title: 'COORDINATE',
      desc: 'Active follow-through across bank credit underwriters, valuation engineers, and committee sanction journeys.',
      badge: 'Sanction Desk',
    },
    {
      step: '5',
      title: 'DISBURSE',
      desc: 'Fulfillment of sanction conditions, execution of loan agreements, property stamping, and timely fund release.',
      badge: 'Closure & Payout',
    },
  ];

  return (
    <section id="operating-model" className="py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3.5 py-1 rounded-full mb-3">
            Operating Model
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-serif tracking-tight">
            Two core engines. One disciplined journey.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            A battle-tested institutional process ensuring zero friction from initial consultation to final disbursement.
          </p>
        </div>

        {/* Two Core Engines Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Engine 1 */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-cyan-600 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                  Engine 01
                </span>
                <span className="text-xs font-semibold text-slate-400">Individuals & Families</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">
                Home Loans Engine
              </h3>
              <p className="text-slate-600 mt-4 leading-relaxed text-sm sm:text-base">
                Lender choice, documentation and sanction support. Designed for salaried professionals, self-employed entrepreneurs, and NRI homebuyers seeking personalized guidance and maximum eligibility.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-cyan-900">
                <span className="px-3 py-1 bg-slate-100 rounded-lg">Multi-Lender Comparison</span>
                <span className="px-3 py-1 bg-slate-100 rounded-lg">Doorstep Document Pickup</span>
                <span className="px-3 py-1 bg-slate-100 rounded-lg">Dedicated Case Manager</span>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100">
              <a href="#calculator" className="text-xs font-bold text-cyan-700 hover:text-cyan-900 uppercase tracking-wider flex items-center gap-1.5">
                Calculate Home Loan EMI &rarr;
              </a>
            </div>
          </div>

          {/* Engine 2 */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-sm flex flex-col justify-between hover:border-amber-400/50 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Engine 02
                </span>
                <span className="text-xs font-semibold text-slate-400">Projects & Institutions</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-serif">
                Project Finance Engine
              </h3>
              <p className="text-slate-300 mt-4 leading-relaxed text-sm sm:text-base">
                Debt structuring through a diverse institutional network. We handle large-ticket syndication, construction debt, working capital enhancements, and lease rental discounting for corporate developers.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-amber-300">
                <span className="px-3 py-1 bg-slate-800 rounded-lg">Consortium Syndication</span>
                <span className="px-3 py-1 bg-slate-800 rounded-lg">Master APF Clearance</span>
                <span className="px-3 py-1 bg-slate-800 rounded-lg">Credit Rating Advisory</span>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-800">
              <a href="#apply" className="text-xs font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                Submit Project Debt Query &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* 5-Step Case Journey */}
        <div className="mt-16 bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm">
          <div className="mb-10 text-center sm:text-left">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              CASE JOURNEY
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif mt-1">
              Five Disciplined Steps from Inquiry to Disbursement
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {steps.map((st, i) => (
              <div
                key={st.step}
                className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-cyan-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-9 h-9 rounded-full bg-cyan-700 text-white font-extrabold text-sm flex items-center justify-center font-serif shadow-sm">
                      {st.step}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
                      Step 0{i + 1}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 tracking-wide font-serif">
                    {st.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-bold text-cyan-800">
                  {st.badge}
                </div>
              </div>
            ))}
          </div>

          {/* Operational Pillars Strip */}
          <div className="mt-10 p-5 rounded-2xl bg-cyan-950 text-white flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Structured Tracking</span>
            </div>
            <div className="hidden sm:block text-slate-600">•</div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Digital Document Coordination</span>
            </div>
            <div className="hidden sm:block text-slate-600">•</div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Proactive Stakeholder Communication</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
