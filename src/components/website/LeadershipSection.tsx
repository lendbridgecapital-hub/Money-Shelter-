'use client';

import React from 'react';

export function LeadershipSection() {
  return (
    <section id="leadership" className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Image / Profile Visual */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative group max-w-md w-full">
              {/* Outer Glow Ring */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-400 to-cyan-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
              
              <div className="relative rounded-3xl bg-slate-950 p-6 border border-slate-800 shadow-2xl overflow-hidden">
                {/* Director Avatar / Photo Representation */}
                <div className="relative aspect-[4/4.5] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-end p-6 border border-slate-700/60">
                  {/* Decorative Silhouette / Initials Emblem */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center">
                      <span className="text-5xl font-black text-amber-400 font-serif">SS</span>
                    </div>
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                  {/* Bottom Plate on Card */}
                  <div className="relative z-10 text-center w-full">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-1">
                      DIRECTOR • MBA
                    </span>
                    <h3 className="text-2xl font-bold font-serif text-white">Sachin Sarode</h3>
                    <p className="text-xs text-cyan-300 font-medium mt-0.5">Founder & Managing Director</p>
                  </div>
                </div>

                <div className="mt-4 px-2 text-center text-xs text-slate-400">
                  Shaping Maharashtra&apos;s builder & mortgage ecosystem for over two decades.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Bio & Core Philosophy */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/80 border border-cyan-800/80 px-3.5 py-1 rounded-full mb-3">
              Leadership Spotlight
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white font-serif tracking-tight leading-tight">
              Leadership built on relationships and delivery.
            </h2>

            <div className="mt-6 space-y-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              <p>
                <strong className="text-white font-serif text-xl block mb-2">Sachin Sarode</strong>
                Finance leadership shaped by deep experience across insurance, banking, and the builder ecosystem. Having worked closely with leading private and public banking institutions as well as prominent real estate developers, he brings a unique, holistic view to credit structuring and risk evaluation.
              </p>
            </div>

            {/* Core Principle Quote Card */}
            <div className="mt-8 p-6 rounded-2xl bg-white/5 border-l-4 border-amber-400 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">
                Founding Philosophy
              </div>
              <div className="text-xl sm:text-2xl font-bold font-serif text-white italic">
                &ldquo;Relationship-led guidance. Institution-ready execution.&rdquo;
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Combining personal trust and advisory with rigorous institutional banking discipline.
              </p>
            </div>

            {/* Leadership Metric Pillars */}
            <div className="mt-8 grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-serif">20 yrs</div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Insurance & Banking</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-serif">30+</div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Builder Relationships</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-2xl sm:text-3xl font-black text-white font-serif">500</div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Partners</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
