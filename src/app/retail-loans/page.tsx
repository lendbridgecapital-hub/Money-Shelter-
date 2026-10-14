import React from 'react';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/website/Navbar';
import { Footer } from '@/components/website/Footer';
import { EmiCalculatorSection } from '@/components/website/EmiCalculatorSection';
import { LeadInquirySection } from '@/components/website/LeadInquirySection';
import Link from 'next/link';

export const metadata = {
  title: 'Retail Loans & Home Mortgages — Money Shelter Pvt. Ltd.',
  description:
    'Explore Home Loans, Loan Against Property (LAP), Personal Loans, Auto Loans, and Education Loans with Money Shelter Pvt. Ltd. Pune, Maharashtra.',
};

export default async function RetailLoansPage() {
  const session = await auth();

  const retailProducts = [
    {
      id: 'home-loans',
      title: 'Home Loans',
      badge: 'Most Popular',
      rates: 'From 8.35% p.a.',
      tenure: 'Up to 30 Years',
      desc: 'Complete financing solutions for purchasing new builder apartments, resale homes, plots, or undertaking self-construction.',
      features: [
        'Exclusive Master APF approvals for fast-tracked sanction',
        'Minimal paperwork for salaried and self-employed applicants',
        'Balance transfer facility with attractive top-up loans',
        'Co-applicant flexibility for maximum loan eligibility',
      ],
    },
    {
      id: 'lap',
      title: 'Loan Against Property (LAP)',
      badge: 'High Ticket',
      rates: 'From 9.25% p.a.',
      tenure: 'Up to 15 Years',
      desc: 'Unlock substantial long-term liquidity by mortgaging your existing residential, commercial, or industrial freehold property.',
      features: [
        'High LTV (Loan-to-Value) up to 75% of market valuation',
        'Ideal for business capital expansion, debt consolidation, or emergency reserves',
        'Flexible structured repayment and customized EMI choices',
        'Overdraft (OD against property) option available',
      ],
    },
    {
      id: 'personal-loans',
      title: 'Personal Loans',
      badge: 'Instant Disbursal',
      rates: 'From 10.49% p.a.',
      tenure: 'Up to 5 Years',
      desc: 'Unsecured, collateral-free personal financing for weddings, medical emergencies, travel, or immediate cash needs.',
      features: [
        'Zero collateral or guarantor required',
        'Sanction and disbursal within 24 to 48 hours',
        '100% digital verification & minimal physical documentation',
        'Flexible tenure options from 12 to 60 months',
      ],
    },
    {
      id: 'auto-loans',
      title: 'Auto Loans',
      badge: 'Vehicle Finance',
      rates: 'From 8.75% p.a.',
      tenure: 'Up to 7 Years',
      desc: 'Seamless financing for new four-wheelers, luxury cars, commercial transport vehicles, or certified pre-owned automobiles.',
      features: [
        'Up to 90% on-road price funding',
        'Fast-track digital sanction with dealer coordination',
        'Tailored seasonal payment options for commercial operators',
        'Competitive interest benchmarks with minimal processing fee',
      ],
    },
    {
      id: 'education-loans',
      title: 'Education Loans',
      badge: 'Higher Studies',
      rates: 'From 9.50% p.a.',
      tenure: 'Up to 15 Years',
      desc: 'Comprehensive financial backing for premier undergraduate and postgraduate programs across India, USA, UK, Canada, and Europe.',
      features: [
        'Covers tuition fees, living expenses, travel, and laptops',
        'Moratorium period (course duration + 6 to 12 months grace)',
        'Collateral and non-collateral loan options available',
        'Tax deduction benefits under Section 80E',
      ],
    },
    {
      id: 'gold-loans',
      title: 'Gold Loans',
      badge: 'Rapid Liquidity',
      rates: 'From 0.75% / month',
      tenure: 'Up to 3 Years',
      desc: 'Instant cash liquidity by pledging physical gold ornaments with bank-grade high-security vault protection.',
      features: [
        'Disbursal in under 45 minutes directly to bank account',
        'Highest per-gram valuation as per RBI guidelines',
        'Zero income proof or credit score prerequisite',
        'Bullet repayment or monthly interest servicing models',
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
              <span>DIMENSION 01 • RETAIL ASSETS</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-serif text-white leading-tight">
              Retail Loans & Mortgages
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto">
              Empowering families and individuals across Maharashtra with optimal interest rates, maximum loan eligibility, and transparent doorstep guidance.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <a
                href="#products"
                className="px-6 py-3 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md"
              >
                Explore Loan Options &darr;
              </a>
              <Link
                href="/contact"
                className="px-6 py-3 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
              >
                Apply Online Now
              </Link>
            </div>
          </div>
        </section>

        {/* Product Cards Grid */}
        <section id="products" className="py-24 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3.5 py-1 rounded-full">
                COMPLETE RETAIL SUITE
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif mt-3">
                Tailored Lending for Every Milestone
              </h2>
              <p className="text-slate-600 mt-2 text-sm sm:text-base">
                We compare rates across 20+ nationalised, private, and housing finance institutions to secure your best offer.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {retailProducts.map((p) => (
                <div
                  key={p.id}
                  id={p.id}
                  className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-cyan-600 hover:shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                        {p.badge}
                      </span>
                      <span className="text-xs font-extrabold text-amber-600">{p.rates}</span>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 font-serif">{p.title}</h3>
                    <div className="text-xs text-slate-400 font-semibold mt-0.5">Tenure: {p.tenure}</div>
                    <p className="text-sm text-slate-600 mt-3 leading-relaxed">{p.desc}</p>

                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-2.5">
                      {p.features.map((feat) => (
                        <div key={feat} className="flex items-start gap-2 text-xs text-slate-700">
                          <span className="text-cyan-700 font-bold mt-0.5">✓</span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100">
                    <Link
                      href={`/contact?service=${p.id}#inquiry`}
                      className="w-full py-2.5 text-xs font-bold text-cyan-800 hover:text-white bg-cyan-50 hover:bg-cyan-700 rounded-xl transition-all text-center block"
                    >
                      Apply for {p.title} &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Documentation Checklist Section */}
        <section className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 to-cyan-950 text-white rounded-3xl p-8 sm:p-12 border border-slate-800">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                FAST-TRACK DOCUMENTATION
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
                Standard Documents Required
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2">
                Keep these documents ready for same-day digital processing and swift credit assessment.
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="font-bold text-amber-300 text-sm mb-3">For Salaried Individuals:</div>
                  <ul className="space-y-2 text-slate-300">
                    <li>• PAN Card & Aadhaar Card (KYC)</li>
                    <li>• Latest 3 Months Salary Slips</li>
                    <li>• Last 6 Months Bank Statement (Salary account)</li>
                    <li>• Form 16 / ITR of the last 2 financial years</li>
                    <li>• Property chain deeds / Agreement to Sale (for Mortgages)</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="font-bold text-cyan-300 text-sm mb-3">For Self-Employed / Business:</div>
                  <ul className="space-y-2 text-slate-300">
                    <li>• PAN Card, Aadhaar & Business Address Proof</li>
                    <li>• Last 2 to 3 Years Audited Financials & ITR with computation</li>
                    <li>• Last 12 Months Current Bank Account Statements</li>
                    <li>• GST Registration & Returns (GSTR-3B)</li>
                    <li>• Sanction letters of existing running loans (if any)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Embedded Interactive EMI Calculator */}
        <EmiCalculatorSection />

        {/* Lead Application Form */}
        <LeadInquirySection />
      </main>

      <Footer />
    </div>
  );
}
