'use client';

import React from 'react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white pt-16 pb-24 md:pt-24 md:pb-32">
      {/* Decorative Background Glows & Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm font-semibold tracking-wide mb-6 shadow-inner backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>ESTABLISHED 2014 • PUNE, MAHARASHTRA</span>
            <span className="text-cyan-500">•</span>
            <span className="text-amber-300">10+ YEARS OF EXCELLENCE</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight font-serif text-white leading-tight">
            Where Money Meets <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">Trust</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl md:text-2xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto">
            Comprehensive financial solutions for individuals, businesses, builders, and large-scale real estate projects. Rooted in Maharashtra, trusted across India.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap justify-center items-center gap-4">
            <a
              href="#apply"
              className="px-8 py-4 text-base font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-xl shadow-lg hover:shadow-amber-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              Apply for Loan / Solution
            </a>
            <a
              href="#calculator"
              className="px-7 py-4 text-base font-semibold text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 rounded-xl backdrop-blur-sm transition-all"
            >
              Loan EMI Calculator
            </a>
            <a
              href="/partner/register"
              className="px-6 py-4 text-base font-semibold text-cyan-300 hover:text-white hover:bg-cyan-900/40 border border-cyan-700/60 rounded-xl transition-all flex items-center gap-2"
            >
              <span>Partner With Us</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

          {/* Key Metrics Highlight Grid */}
          <div className="mt-16 sm:mt-20 pt-10 border-t border-slate-800/80">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-8">
              A DECADE OF INSTITUTIONAL DELIVERY & CAPITAL EXECUTION
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6 text-left">
              {/* Stat 1 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-colors backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-serif">
                  ₹2,500+ <span className="text-lg font-sans font-bold">Cr</span>
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  Cumulative Disbursement
                </div>
              </div>

              {/* Stat 2 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-colors backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-cyan-400 font-serif">
                  30,000+
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  Customers Served
                </div>
              </div>

              {/* Stat 3 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-colors backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-serif">
                  ₹350+ <span className="text-lg font-sans font-bold">Cr</span>
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  Annual Run Rate
                </div>
              </div>

              {/* Stat 4 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-colors backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-serif">
                  10+ <span className="text-lg font-sans font-bold">Yrs</span>
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  Operating Track Record
                </div>
              </div>

              {/* Stat 5 */}
              <div className="col-span-2 md:col-span-1 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-700/50 hover:border-cyan-400 transition-colors backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-cyan-300 font-serif">
                  ₹500 <span className="text-lg font-sans font-bold">Cr</span>
                </div>
                <div className="text-xs font-semibold text-cyan-200/80 mt-1 uppercase tracking-wider">
                  FY Disbursement Ambition
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
