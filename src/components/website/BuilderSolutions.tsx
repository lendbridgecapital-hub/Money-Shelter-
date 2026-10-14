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
    <section id="builder-apf" className="py-24 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950 text-white relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-widest bg-amber-500/20 border border-amber-500/30 px-3.5 py-1 rounded-full mb-3">
            Our Core Specialization
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white font-serif tracking-tight leading-tight">
            Exclusive Builder & Real Estate Solutions
          </h2>
          <p className="mt-4 text-base sm:text-lg text-cyan-200/90 font-medium">
            Builder Project Finance • Master Site Approvals (APF)
          </p>
        </div>

        {/* Central APF Architectural Diagram */}
        <div className="mt-16 bg-white/5 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-white/10 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center">
            {/* Left Node */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-400 transition-colors">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">One Project Site</span>
              <div className="text-xl sm:text-2xl font-bold font-serif text-white mt-2">
                Multiple Bank Approvals
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Synchronized technical, legal, and financial clearance across 15+ banks in a single sweep.
              </p>
            </div>

            {/* Central Master Circle Node */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-cyan-600 to-cyan-900 p-2 shadow-2xl shadow-cyan-500/30 border-4 border-cyan-400/40 flex flex-col items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-950/80 flex flex-col items-center justify-center text-center px-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 font-serif tracking-wide">
                    APF
                  </span>
                  <span className="text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-widest mt-1">
                    Master Site Approvals
                  </span>
                </div>
              </div>
              <div className="text-xs font-semibold text-cyan-300 mt-4 max-w-[220px]">
                The single clearinghouse between project site & financial institutions
              </div>
            </div>

            {/* Right Node */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-400 transition-colors">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Builder Finance</span>
              <div className="text-xl sm:text-2xl font-bold font-serif text-white mt-2">
                Coordinated Lender Readiness
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Structured construction funding, debt syndication, inventory funding, and milestone drawdown tracking.
              </p>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10 text-center max-w-3xl mx-auto">
            <blockquote className="text-base sm:text-lg font-medium text-slate-200 italic leading-relaxed">
              &ldquo;A single point of contact removes operational bottlenecks for builders while giving homebuyers broader lender choice and faster, customized processing.&rdquo;
            </blockquote>
          </div>
        </div>

        {/* The 3 Pillars */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div
              key={p.num}
              className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-3xl font-black text-amber-400 font-serif">{p.num}</span>
                <h3 className="text-xl font-bold text-white font-serif mt-3">{p.title}</h3>
                <p className="text-sm text-slate-300 mt-3 leading-relaxed">{p.desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs font-semibold text-cyan-300">
                ✨ {p.impact}
              </div>
            </div>
          ))}
        </div>

        {/* Builder Desk CTA Banner */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
            <span className="text-sm font-semibold text-white">
              Are you a Real Estate Builder or Developer in Maharashtra?
            </span>
            <a
              href="#apply"
              className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all"
            >
              Connect with Builder Project Desk
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
