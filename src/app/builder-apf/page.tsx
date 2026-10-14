import React from 'react';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/website/Navbar';
import { Footer } from '@/components/website/Footer';
import { BuilderSolutions } from '@/components/website/BuilderSolutions';
import { LeadInquirySection } from '@/components/website/LeadInquirySection';
import Link from 'next/link';

export const metadata = {
  title: 'Builder Solutions & Master Site Approvals (APF) — Money Shelter Pvt. Ltd.',
  description:
    'Exclusive Builder & Real Estate Solutions by Money Shelter Pvt. Ltd. Master Site Approvals (APF), Project Finance, and Debt Syndication in Maharashtra.',
};

export default async function BuilderApfPage() {
  const session = await auth();

  const developerServices = [
    {
      title: 'Master Site Approvals (APF)',
      desc: 'We clear technical, legal, and title appraisal across 15+ premier banks and HFCs, establishing master APF codes before marketing launch.',
      impact: 'Enables every prospective buyer to choose their own preferred bank with zero processing delays.',
    },
    {
      title: 'Builder Project Construction Debt',
      desc: 'Syndicated debt funding for residential, commercial, township, and industrial developments with milestone-linked construction drawdowns.',
      impact: 'Competitive interest rates, customized moratorium periods, and structured cash-flow amortization.',
    },
    {
      title: 'Lease Rental Discounting (LRD)',
      desc: 'Term funding structured against long-term rental cash flows from marquee corporate, retail, or logistics tenants.',
      impact: 'Immediate high-quantum liquidity unlocking trapped equity in stabilized commercial assets.',
    },
    {
      title: 'On-Site Homebuyer Sanction Camps',
      desc: 'Dedicated credit managers stationed at your site sales lounge during launch weekends to evaluate buyers and issue instant in-principle sanctions.',
      impact: 'Significantly enhances booking-to-agreement conversion rates and accelerates initial token collections.',
    },
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
              <span>OUR CORE SPECIALIZATION • BUILDER & REAL ESTATE</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-serif text-white leading-tight">
              Exclusive Builder & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
                Real Estate Solutions
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto">
              Builder Project Finance • Master Site Approvals (APF) • Dedicated Homebuyer Sanction Desks. Serving over 30+ leading real estate developers across Maharashtra.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <a
                href="#developer-suite"
                className="px-6 py-3 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md"
              >
                Explore Developer Suite &darr;
              </a>
              <Link
                href="/contact?service=builder-apf#inquiry"
                className="px-6 py-3 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
              >
                Connect with Builder Desk
              </Link>
            </div>
          </div>
        </section>

        {/* Existing APF Interactive Showcase */}
        <BuilderSolutions />

        {/* Comprehensive Developer Suite */}
        <section id="developer-suite" className="py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3.5 py-1 rounded-full">
                INSTITUTIONAL DEVELOPER DESK
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif mt-3">
                Complete Capital & Sanction Solutions
              </h2>
              <p className="text-slate-600 mt-2 text-sm sm:text-base">
                From project inception, land vetting, and multi-bank approvals to consumer retail mortgage collections.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {developerServices.map((srv, idx) => (
                <div
                  key={srv.title}
                  className="p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-cyan-600 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="w-10 h-10 rounded-full bg-cyan-900 text-amber-400 font-black font-serif text-sm flex items-center justify-center">
                        0{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-cyan-800 bg-cyan-100/80 px-3 py-1 rounded-full">
                        Developer Advantage
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 font-serif">{srv.title}</h3>
                    <p className="text-sm text-slate-600 mt-3 leading-relaxed">{srv.desc}</p>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-200 text-xs font-semibold text-cyan-900">
                    🚀 <span className="font-bold">Business Outcome:</span> {srv.impact}
                  </div>
                </div>
              ))}
            </div>

            {/* Builder Relationship Metric Callout */}
            <div className="mt-16 p-8 sm:p-12 rounded-3xl bg-slate-900 text-white border border-slate-800 text-center">
              <div className="max-w-3xl mx-auto">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  DEVELOPER TRUST
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold font-serif text-white mt-1">
                  Trusted by 30+ Leading Real Estate Developers
                </h3>
                <p className="text-slate-300 text-sm mt-3 leading-relaxed">
                  Money Shelter has successfully coordinated and secured APF approvals across hundreds of residential towers and plotted layouts in Pune, Nashik, Satara, and surrounding corridors.
                </p>

                <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-xs font-semibold text-cyan-300">
                  <span className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700">✓ Zero Sales Bottlenecks</span>
                  <span className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700">✓ 15+ Banks Synchronized</span>
                  <span className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700">✓ Rapid Buyer Sanctions</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lead Inquiry Form */}
        <LeadInquirySection />
      </main>

      <Footer />
    </div>
  );
}
