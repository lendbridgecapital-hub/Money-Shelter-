'use client';

import React, { useState } from 'react';

export function FinancingDimensions() {
  const [activeTab, setActiveTab] = useState<'all' | 'retail' | 'sme' | 'structured' | 'wealth'>('all');

  const dimensions = [
    {
      id: 'retail',
      number: '01',
      title: 'Retail Assets',
      tagline: 'Empowering individuals and families to secure homes, assets, and milestones.',
      color: 'from-blue-600 to-cyan-600',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      services: [
        { name: 'Home Loans', desc: 'Fresh purchases, resale homes, self-construction & plot purchase loans.' },
        { name: 'Loan Against Property (LAP)', desc: 'High-ticket liquidity against residential or commercial properties.' },
        { name: 'Personal Loans', desc: 'Quick turnaround, collateral-free credit for immediate personal needs.' },
        { name: 'Auto Loans', desc: 'Competitive financing for new and pre-owned personal or commercial vehicles.' },
        { name: 'Education Loans', desc: 'Comprehensive funding for premier domestic and international higher education.' },
        { name: 'Gold Loans', desc: 'Instant liquidity against gold ornaments with minimal processing time.' },
      ],
    },
    {
      id: 'sme',
      number: '02',
      title: 'SME & Commercial',
      tagline: 'Fueling enterprise liquidity, machinery expansion, and commercial ownership.',
      color: 'from-cyan-600 to-teal-600',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      services: [
        { name: 'Working Capital (OD/CC)', desc: 'Overdraft and Cash Credit facilities aligned with cash flow cycles.' },
        { name: 'Unsecured Business Loans', desc: 'Fast business growth capital without pledging business assets.' },
        { name: 'Machinery Loans', desc: 'Asset-backed funding for plant, industrial equipment & technology upgrades.' },
        { name: 'Commercial Property Purchase', desc: 'Loans to acquire commercial offices, warehouses, and retail spaces.' },
      ],
    },
    {
      id: 'structured',
      number: '03',
      title: 'Structured Finance',
      tagline: 'Large-scale debt structuring, infrastructure capital, and cash-flow monetization.',
      color: 'from-slate-800 to-slate-900',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
      services: [
        { name: 'Debt Syndication', desc: 'Consortium funding & multi-bank debt arrangements for major corporate needs.' },
        { name: 'Project Finance', desc: 'Greenfield & brownfield funding for industrial, residential, and infrastructure sites.' },
        { name: 'Lease Rental Discounting (LRD)', desc: 'Term loans structured against long-term lease cash flows from corporate tenants.' },
      ],
    },
    {
      id: 'wealth',
      number: '04',
      title: 'Protection & Wealth',
      tagline: 'Safeguarding assets, business continuity, and family financial health.',
      color: 'from-amber-600 to-yellow-600',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      services: [
        { name: 'General Insurance', desc: 'Health, motor, fire, marine, workmen compensation, and commercial risk protection.' },
        { name: 'Life Insurance', desc: 'Term life cover, savings schemes, and corporate keyman insurance packages.' },
        { name: 'Wealth Solutions', desc: 'Tailored financial structuring to preserve capital and optimize investment yields.' },
      ],
    },
  ];

  const filteredDimensions = activeTab === 'all'
    ? dimensions
    : dimensions.filter((d) => d.id === activeTab);

  return (
    <section id="capabilities" className="py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3.5 py-1 rounded-full mb-3">
            Capabilities & Solutions
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-serif tracking-tight">
            One platform supports four financing dimensions.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
            <span className="text-cyan-800 font-bold">Breadth creates options.</span>{' '}
            <span className="text-amber-700 font-bold">Specialization creates confidence.</span>
          </p>
        </div>

        {/* Tab Filters */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Dimensions (4)
          </button>
          <button
            onClick={() => setActiveTab('retail')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'retail'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            01 Retail Assets
          </button>
          <button
            onClick={() => setActiveTab('sme')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'sme'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            02 SME & Commercial
          </button>
          <button
            onClick={() => setActiveTab('structured')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'structured'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            03 Structured Finance
          </button>
          <button
            onClick={() => setActiveTab('wealth')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'wealth'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            04 Protection & Wealth
          </button>
        </div>

        {/* Dimensions Cards Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredDimensions.map((dim) => (
            <div
              key={dim.id}
              className="bg-slate-50/70 rounded-3xl p-8 border border-slate-200 hover:border-cyan-600 hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-300 font-serif">
                    {dim.number}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${dim.badgeColor}`}>
                    {dim.title.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 font-serif">
                  {dim.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {dim.tagline}
                </p>

                <div className="mt-6 pt-6 border-t border-slate-200/80 space-y-3.5">
                  {dim.services.map((srv) => (
                    <div
                      key={srv.name}
                      className="p-3.5 rounded-xl bg-white border border-slate-200/60 hover:border-cyan-500/50 transition-colors shadow-2xs"
                    >
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
                        {srv.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 pl-3.5">
                        {srv.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4">
                <a
                  href="#apply"
                  className="inline-flex items-center gap-2 text-xs font-bold text-cyan-800 hover:text-cyan-950 uppercase tracking-wider group"
                >
                  <span>Request {dim.title} Advisory</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
