'use client';

import React from 'react';
import Link from 'next/link';

export function PartnerCtaSection() {
  const benefits = [
    { title: 'Access 20+ Lenders', desc: 'Single onboarding allows you to file cases across top public & private banks plus NBFCs.' },
    { title: 'Dedicated RM Support', desc: 'Direct relationship manager support for structuring, credit queries, and documentation.' },
    { title: 'Live Pipeline Tracking', desc: 'Digital portal with real-time status updates from Documents In to Bank Sanction & Disbursal.' },
    { title: 'Transparent Payouts', desc: 'Timely milestone-based commission settlements with automated digital reporting.' },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-cyan-900 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12 lg:p-16 backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-7">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-3">
                Join 500+ Active Partners
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-serif text-white tracking-tight leading-tight">
                Partner with Maharashtra&apos;s Leading Financial Distribution Network
              </h2>
              <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
                Are you a Direct Selling Agent (DSA), Chartered Accountant (CA), Real Estate Consultant, or Tax Advisor? Monetize your client relationships with institution-ready loan delivery and master APF support.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((b) => (
                  <div key={b.title} className="p-4 rounded-xl bg-slate-900/60 border border-white/10">
                    <div className="font-bold text-amber-300 text-sm">{b.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{b.desc}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/partner/register"
                  className="px-6 py-3.5 text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-xl shadow-lg transition-all"
                >
                  Register as Channel Partner &rarr;
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3.5 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all"
                >
                  Partner Portal Login
                </Link>
              </div>
            </div>

            {/* Right Stat Callout Box */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm p-8 rounded-3xl bg-slate-950/90 border border-cyan-500/30 shadow-2xl text-center">
                <div className="text-xs uppercase tracking-widest text-cyan-400 font-bold mb-2">
                  Institutional Trust
                </div>
                <div className="text-5xl font-extrabold text-amber-400 font-serif">
                  500+
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  Active Distribution Partners
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Collaborating across Pune, Nashik, Satara, and upcoming metros to originate and disburse high-quality retail and developer finance.
                </p>

                <div className="mt-6 pt-6 border-t border-slate-800 text-left space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">✓</span> Instant DSA Code Issuance
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">✓</span> Dedicated Customer Link Sharing
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">✓</span> Digital Business Card Generation
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
