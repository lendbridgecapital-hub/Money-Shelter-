'use client';

import React from 'react';

export function CompanyAtAGlance() {
  const footprint = [
    { city: 'Pune', role: 'Head Office', status: 'ACTIVE', desc: 'Central Underwriting, Debt Syndication & Executive HQ', badge: 'bg-cyan-700 text-white' },
    { city: 'Nashik', role: 'Branch Office', status: 'ACTIVE', desc: 'Retail Mortgages, SME Lending & Builder Desks', badge: 'bg-cyan-700 text-white' },
    { city: 'Satara', role: 'Branch Office', status: 'ACTIVE', desc: 'Western Maharashtra Regional Partner Hub & Retail Loans', badge: 'bg-cyan-700 text-white' },
    { city: 'Mumbai', role: 'Planned Expansion', status: 'EXPANDING', desc: 'Strategic Metro Real Estate & Corporate Debt Syndication Hub', badge: 'bg-amber-600 text-white' },
    { city: 'Kolhapur', role: 'Planned Expansion', status: 'EXPANDING', desc: 'Commercial Capital, Agro-Industrial & Retail Network', badge: 'bg-amber-600 text-white' },
  ];

  return (
    <section id="about" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3 py-1 rounded-full mb-3">
            Company At A Glance
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-serif tracking-tight leading-tight">
            A decade of delivery, rooted in Maharashtra.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Established in <strong>2014</strong>, Money Shelter Pvt. Ltd. has built an institutional bridge connecting borrowers, businesses, and builders directly with premier nationalised banks, private lenders, and NBFCs.
          </p>
        </div>

        {/* Narrative & Ambition Grid */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Narrative Box */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
                Institutional Credibility Meets Relationship-Driven Finance
              </h3>
              <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                For over a decade, Money Shelter has operated on the bedrock principle that financing is not a mere transaction — it is an architecture of trust. We navigate complex credit guidelines, syndicate substantial institutional lines, and champion everyday retail borrowers with equal vigor.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-100">
                  <div className="font-bold text-cyan-900 text-sm">Borrower First Approach</div>
                  <div className="text-xs text-slate-600 mt-1">Multi-lender comparison ensuring the best loan terms, tenures, and competitive interest rates.</div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
                  <div className="font-bold text-amber-900 text-sm">Institution-Ready Files</div>
                  <div className="text-xs text-slate-600 mt-1">Comprehensive credit appraisal and rigorous documentation for quick committee sanctions.</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5 text-cyan-800">
                <svg className="w-4 h-4 text-cyan-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Registered Private Limited Entity
              </span>
              <span className="flex items-center gap-1.5 text-cyan-800">
                <svg className="w-4 h-4 text-cyan-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Authorized Multi-Bank DSA Partner
              </span>
              <span className="flex items-center gap-1.5 text-cyan-800">
                <svg className="w-4 h-4 text-cyan-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                RERA & Bank APF Specialist
              </span>
            </div>
          </div>

          {/* Right Growth Horizon Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 text-white rounded-3xl p-8 sm:p-10 border border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-2">
                Growth Horizon
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-serif text-white">
                Built for the next phase of responsible growth.
              </h3>
              <p className="mt-3 text-slate-300 text-sm leading-relaxed">
                With a robust foundation across Western Maharashtra, Money Shelter is scaling operations to accelerate financial inclusion and institutional syndication.
              </p>

              <div className="mt-8 space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Current Run Rate</div>
                    <div className="text-xl font-bold text-white font-serif">₹350+ Crore / Year</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Active
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-amber-300 uppercase tracking-wider">FY Disbursement Ambition</div>
                    <div className="text-2xl font-black text-amber-400 font-serif">₹500 Crore</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Target
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400">
              Company-reported ambition, verified performance metrics & continuous multi-city expansion.
            </div>
          </div>
        </div>

        {/* Maharashtra Footprint Roadmap */}
        <div className="mt-16 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
                Maharashtra Footprint & Growth Line
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Strategic network hubs serving developers, entrepreneurs, and families across key urban corridors.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded-full bg-cyan-700"></span> Active Hub
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span> Planned Expansion
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {footprint.map((item, idx) => (
              <div
                key={item.city}
                className="relative p-5 rounded-2xl border border-slate-200 hover:border-cyan-600 transition-all bg-slate-50/50 hover:bg-white group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400">0{idx + 1}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${item.badge}`}>
                    {item.status}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 font-serif group-hover:text-cyan-800 transition-colors">
                  {item.city}
                </div>
                <div className="text-xs font-semibold text-cyan-700 mt-0.5">
                  {item.role}
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
