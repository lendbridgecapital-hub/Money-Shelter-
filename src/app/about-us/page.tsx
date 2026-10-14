import React from 'react';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/website/Navbar';
import { Footer } from '@/components/website/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'About Us & Leadership — Money Shelter Pvt. Ltd.',
  description:
    'Learn about Money Shelter Pvt. Ltd. Founded in 2014 in Pune by Sachin Sarode (Director • MBA). Over ₹2,500+ Cr disbursed across Maharashtra.',
};

export default async function AboutUsPage() {
  const session = await auth();

  const milestones = [
    { year: '2014', title: 'Founded in Pune', desc: 'Established Money Shelter with a mission to bridge borrowers and premier institutional lenders with integrity.' },
    { year: '2017', title: 'APF & Builder Specialization', desc: 'Pioneered Master Site Approvals (APF) and institutional syndication for developers across Western Maharashtra.' },
    { year: '2020', title: 'Regional Footprint Expansion', desc: 'Expanded branches to Nashik and Satara, establishing on-ground sanction hubs.' },
    { year: '2023', title: '₹2,000+ Cr Milestone', desc: 'Surpassed ₹2,000 Cr in cumulative disbursements with 25,000+ satisfied borrowers.' },
    { year: '2026+', title: '₹500 Cr Ambition & Metro Expansion', desc: 'Launching strategic hubs in Mumbai & Kolhapur targeting an annual run rate of ₹500 Cr.' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-cyan-600 selection:text-white flex flex-col font-sans">
      <Navbar userSession={session?.user} />

      <main className="flex-grow">
        {/* Page Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm font-semibold tracking-wide mb-6">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>ESTABLISHED 2014 • PUNE, MAHARASHTRA</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-serif text-white leading-tight">
              A Decade of Delivery, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
                Rooted in Maharashtra
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto">
              Money Shelter Pvt. Ltd. connects borrowers, businesses, and builders with premier banks and NBFCs. Where personal relationships meet institutional execution.
            </p>
          </div>
        </section>

        {/* Core Metrics Strip */}
        <section className="bg-slate-900 py-10 border-y border-slate-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-serif">₹2,500+ Cr</div>
                <div className="text-xs uppercase tracking-wider text-slate-400 mt-1 font-semibold">Cumulative Disbursement</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-cyan-400 font-serif">30,000+</div>
                <div className="text-xs uppercase tracking-wider text-slate-400 mt-1 font-semibold">Customers Served</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-serif">10+ Years</div>
                <div className="text-xs uppercase tracking-wider text-slate-400 mt-1 font-semibold">Operating Track Record</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-serif">₹500 Cr</div>
                <div className="text-xs uppercase tracking-wider text-slate-400 mt-1 font-semibold">FY Growth Ambition</div>
              </div>
            </div>
          </div>
        </section>

        {/* Leadership Spotlight Section */}
        <section id="leadership" className="py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Profile Card */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative group max-w-md w-full">
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-400 to-cyan-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
                  <div className="relative rounded-3xl bg-slate-950 p-6 border border-slate-800 shadow-2xl overflow-hidden">
                    <div className="relative aspect-[4/4.5] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-end p-6 border border-slate-700/60">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-36 h-36 rounded-full bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center">
                          <span className="text-5xl font-black text-amber-400 font-serif">SS</span>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                      <div className="relative z-10 text-center w-full">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-1">
                          DIRECTOR • MBA
                        </span>
                        <h3 className="text-2xl font-bold font-serif text-white">Sachin Sarode</h3>
                        <p className="text-xs text-cyan-300 font-medium mt-0.5">Founder & Managing Director</p>
                      </div>
                    </div>

                    <div className="mt-4 px-2 text-center text-xs text-slate-400">
                      Visionary leader shaping Maharashtra&apos;s financial and builder ecosystem since 2014.
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio & Details */}
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3.5 py-1 rounded-full mb-3">
                  Executive Leadership
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-serif tracking-tight leading-tight">
                  Leadership built on relationships and delivery.
                </h2>
                <div className="mt-6 space-y-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                  <p>
                    <strong className="text-slate-900 font-serif text-xl block mb-2">Sachin Sarode</strong>
                    Finance leadership shaped by deep experience across insurance, banking and the builder ecosystem. With over two decades of immersion in credit appraisal, corporate syndication, and retail mortgage structuring, he established Money Shelter Pvt. Ltd. to eliminate operational bottlenecks between borrowers and banking institutions.
                  </p>
                </div>

                <div className="mt-8 p-6 rounded-2xl bg-cyan-950 text-white border-l-4 border-amber-400">
                  <div className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">
                    Leadership Philosophy
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-serif italic text-white">
                    &ldquo;Relationship-led guidance. Institution-ready execution.&rdquo;
                  </div>
                  <p className="text-xs text-slate-300 mt-2">
                    Nurturing long-term trust with homebuyers and developer partners while strictly enforcing institutional banking rigour.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-2xl sm:text-3xl font-black text-cyan-800 font-serif">20 yrs</div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">Insurance & Banking</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 font-serif">30+</div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">Builder Relationships</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 font-serif">500</div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">Channel Partners</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline & Growth Ambition */}
        <section className="py-24 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3.5 py-1 rounded-full">
                JOURNEY & GROWTH HORIZON
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif mt-3">
                A Decade of Proven Delivery (2014 – 2026)
              </h2>
              <p className="text-slate-600 mt-2 text-sm sm:text-base">
                Milestones achieved through consistent stakeholder communication and rigorous credit execution.
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {milestones.map((m, idx) => (
                <div
                  key={m.year}
                  className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 hover:border-cyan-600 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center gap-6"
                >
                  <div className="w-20 sm:w-24 flex-shrink-0 text-2xl sm:text-3xl font-black text-amber-500 font-serif">
                    {m.year}
                  </div>
                  <div className="border-l-2 border-slate-200 pl-6 flex-grow">
                    <h3 className="text-lg font-bold text-slate-900 font-serif">{m.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{m.desc}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    Phase 0{idx + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Growth Ambition Box */}
            <div className="mt-16 max-w-4xl mx-auto p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-cyan-950 text-white border border-cyan-800/60 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  GROWTH HORIZON (2026–2027)
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
                  ₹500 Crore FY Disbursement Ambition
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md">
                  Scaling corporate and retail capacity across Mumbai, Pune, Nashik, Satara, and Kolhapur.
                </p>
              </div>
              <Link
                href="/contact"
                className="px-6 py-3 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md flex-shrink-0"
              >
                Connect With Our Team &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
