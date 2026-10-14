import React from 'react';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/website/Navbar';
import { Footer } from '@/components/website/Footer';
import { LeadInquirySection } from '@/components/website/LeadInquirySection';
import Link from 'next/link';

export const metadata = {
  title: 'SME & Commercial Finance — Money Shelter Pvt. Ltd.',
  description:
    'Working Capital (OD/CC), Unsecured Business Loans, Machinery Loans, and Commercial Property Purchase by Money Shelter Pvt. Ltd. Pune, Maharashtra.',
};

export default async function SmeFinancePage() {
  const session = await auth();

  const smeSolutions = [
    {
      id: 'working-capital',
      title: 'Working Capital (OD / CC)',
      badge: 'Liquidity Lines',
      amount: 'Up to ₹25 Crore',
      rates: 'From 8.85% p.a.',
      desc: 'Cash Credit (CC) and Overdraft (OD) credit lines engineered to fund inventory, receivables, and day-to-day operating cycles.',
      points: [
        'Pay interest strictly on the utilized amount, not the sanctioned limit',
        'Assessment based on working capital turnover matrix and stock auditing',
        'Includes Letter of Credit (LC) and Bank Guarantee (BG) sub-limits',
        'Annual renewal with automated enhancement reviews',
      ],
    },
    {
      id: 'business-loans',
      title: 'Unsecured Business Loans',
      badge: 'Zero Collateral',
      amount: 'Up to ₹1 Crore',
      rates: 'From 12.5% p.a.',
      desc: 'Rapid collateral-free business loans for immediate procurement, seasonal stock piling, staff expansion, or contract execution.',
      points: [
        'Zero physical property or land collateral required',
        'Evaluation based on GST returns, turnover, and banking balance habits',
        'Sanction and disbursal within 48 to 72 business hours',
        'Flexible tenures ranging from 12 to 48 months',
      ],
    },
    {
      id: 'machinery-loans',
      title: 'Machinery & Equipment Finance',
      badge: 'Asset Expansion',
      amount: 'Up to ₹10 Crore',
      rates: 'From 9.25% p.a.',
      desc: 'Dedicated term loans to acquire new or imported industrial machinery, manufacturing tooling, medical equipment, and commercial IT infrastructure.',
      points: [
        'Up to 85% equipment invoice value funded',
        'Hypothecation of the machinery itself acts as the primary security',
        'Moratorium period during machine delivery and factory commissioning',
        'Tax depreciation benefits under the Income Tax Act',
      ],
    },
    {
      id: 'commercial-property',
      title: 'Commercial Property Purchase',
      badge: 'Office & Retail',
      amount: 'Up to ₹50 Crore',
      rates: 'From 8.95% p.a.',
      desc: 'Term loans tailored to purchase ready or under-construction corporate office spaces, retail showrooms, logistics warehouses, and industrial sheds.',
      points: [
        'Higher loan quantum with tenures extending up to 15 years',
        'Available for proprietary firms, partnerships, LLPs, and Private Limited companies',
        'Can be combined with Lease Rental Discounting (LRD) upon tenant occupancy',
        'Step-up EMI structures to match enterprise revenue ramp-up',
      ],
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
              <span>DIMENSION 02 • SME & COMMERCIAL CAPITAL</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-serif text-white leading-tight">
              Fueling Enterprise Growth & Liquidity
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto">
              Customized corporate debt structures, working capital lines, and equipment loans designed for manufacturers, traders, and service enterprises across Maharashtra.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <a
                href="#solutions"
                className="px-6 py-3 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md"
              >
                View Commercial Solutions &darr;
              </a>
              <Link
                href="/contact"
                className="px-6 py-3 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
              >
                Schedule Corporate Consultation
              </Link>
            </div>
          </div>
        </section>

        {/* Commercial Solutions Grid */}
        <section id="solutions" className="py-24 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3.5 py-1 rounded-full">
                COMMERCIAL CREDIT PLATFORM
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif mt-3">
                Capital Architecture for Scaling Enterprises
              </h2>
              <p className="text-slate-600 mt-2 text-sm sm:text-base">
                Whether you need short-term operational liquidity or long-term machinery financing, we syndicate with premier institutional desks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {smeSolutions.map((sol) => (
                <div
                  key={sol.id}
                  id={sol.id}
                  className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 hover:border-cyan-600 hover:shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                        {sol.badge}
                      </span>
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-amber-600 font-serif">{sol.rates}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{sol.amount}</div>
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 font-serif">{sol.title}</h3>
                    <p className="text-sm text-slate-600 mt-3 leading-relaxed">{sol.desc}</p>

                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-2.5">
                      {sol.points.map((pt) => (
                        <div key={pt} className="flex items-start gap-2 text-xs text-slate-700">
                          <span className="text-cyan-700 font-bold mt-0.5">✓</span>
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <Link
                      href={`/contact?service=${sol.id}#inquiry`}
                      className="w-full py-3 text-xs font-bold text-cyan-800 hover:text-white bg-cyan-50 hover:bg-cyan-700 rounded-xl transition-all text-center block"
                    >
                      Request Appraisal for {sol.title} &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enterprise Evaluation Matrix */}
        <section className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 to-cyan-950 text-white rounded-3xl p-8 sm:p-12 border border-slate-800">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                CREDIT BENCHMARKS
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
                SME Eligibility Criteria
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2">
                Standard institutional parameters verified during commercial loan appraisals.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-center">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-amber-400 text-2xl font-bold font-serif mb-1">3+ Years</div>
                  <div className="font-bold text-white text-sm">Business Vintage</div>
                  <p className="text-slate-400 text-[11px] mt-1">Active continuous commercial operation with steady revenue track record.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-cyan-400 text-2xl font-bold font-serif mb-1">₹50L+</div>
                  <div className="font-bold text-white text-sm">Annual Turnover</div>
                  <p className="text-slate-400 text-[11px] mt-1">Verified via audited financial balance sheets and regular GST filings.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-amber-400 text-2xl font-bold font-serif mb-1">700+</div>
                  <div className="font-bold text-white text-sm">CIBIL / Credit Score</div>
                  <p className="text-slate-400 text-[11px] mt-1">Clean repayment history of promoters and business entities.</p>
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
