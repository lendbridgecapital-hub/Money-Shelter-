'use client';

import React from 'react';

export function BuilderSolutions() {
  const pillars = [
    {
      num: '01',
      title: 'Multiple Bank Approvals',
      desc: 'One site coordinated seamlessly across all major nationalised, private banks and housing finance corporations.',
      impact: 'Unlocks maximum eligibility for diverse customer segments buying in your project.',
    },
    {
      num: '02',
      title: 'One Point of Contact',
      desc: 'A dedicated institutional relationship desk eliminates administrative friction and paperwork fatigue for sales desks.',
      impact: 'Zero distraction for builder sales managers — our team handles the end-to-end banking pipeline.',
    },
    {
      num: '03',
      title: 'Seamless Homebuyer Loans',
      desc: 'Dedicated on-site sanction camps, pre-approved buyer files, accelerated credit assessment, and prompt disbursements.',
      impact: 'Faster cash-flow collections and quicker sales-to-registration velocity for the builder.',
    },
  ];

  return (
    <section id="builder-apf" className="py-24 bg-slate-50 text-slate-900 border-b border-slate-200 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-widest bg-amber-100 border border-amber-300 px-3.5 py-1 rounded-full mb-3">
            Our Core Specialization
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-950 font-sans tracking-tight leading-tight">
            Exclusive Builder & Real Estate Solutions
          </h2>
          <p className="mt-4 text-base sm:text-lg text-cyan-800 font-semibold">
            Builder Project Finance • Master Site Approvals (APF)
          </p>
        </div>

        {/* Central APF Architectural Diagram */}
        <div className="mt-16 bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center">
            {/* Left Node */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-cyan-200 hover:border-cyan-600 transition-colors shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-800">One Project Site</span>
              <div className="text-xl sm:text-2xl font-bold font-sans text-slate-950 mt-2">
                Multiple Bank Approvals
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Synchronized technical, legal, and financial clearance across 20+ partner banks in a single sweep.
              </p>
            </div>

            {/* Central Master APF Hub */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-cyan-600 via-cyan-700 to-teal-800 p-2 shadow-2xl flex flex-col items-center justify-center">
                <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center text-center px-2 shadow-inner">
                  <span className="text-2xl sm:text-3xl font-black text-amber-600 font-sans tracking-tight">
                    APF
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-widest mt-1">
                    MASTER SITE
                  </span>
                  <span className="text-[9px] font-bold text-cyan-700 uppercase">
                    APPROVALS
                  </span>
                </div>
              </div>
            </div>

            {/* Right Node */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-amber-200 hover:border-amber-600 transition-colors shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Builder Finance</span>
              <div className="text-xl sm:text-2xl font-bold font-sans text-slate-950 mt-2">
                Coordinated Lender Readiness
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Construction finance, greenfield debt structuring, and on-site buyer sanction desk support.
              </p>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center max-w-3xl mx-auto">
            <blockquote className="text-base sm:text-lg font-medium text-slate-700 italic leading-relaxed">
              &ldquo;A single point of contact removes operational bottlenecks for builders while giving homebuyers broader lender choice and faster, customized processing.&rdquo;
            </blockquote>
          </div>
        </div>

        {/* 3 Value Pillars */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div
              key={p.num}
              className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-cyan-600 transition-all shadow-sm hover:shadow-lg flex flex-col justify-between"
            >
              <div>
                <span className="text-3xl font-black text-amber-600 font-sans">{p.num}</span>
                <h3 className="text-xl font-bold text-slate-900 font-sans mt-3">{p.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{p.desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider">Builder Impact</div>
                <div className="text-xs text-slate-600 mt-1 font-medium">{p.impact}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
