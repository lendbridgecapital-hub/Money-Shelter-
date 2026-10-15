'use client';

import React, { useState, useTransition } from 'react';
import { submitGeneralWebsiteInquiryAction } from '@/actions/publicActions';

export function LeadInquirySection() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setResult(null);

    startTransition(async () => {
      const res = await submitGeneralWebsiteInquiryAction(formData);
      setResult(res);
      if (res.ok) {
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <section id="apply" className="py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Context & Guarantees */}
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3.5 py-1 rounded-full mb-3">
              Direct Advisory Desk
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif tracking-tight leading-tight">
              Ready to structure your next loan or project?
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed text-sm sm:text-base">
              Submit your requirement for institutional-grade evaluation. Whether you are an individual purchasing a home, an enterprise expanding working capital, or a builder seeking master site approvals (APF), our senior advisory team will reach out promptly.
            </p>

            {/* Value Guarantees */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Multi-Bank Sanction Assessment</h4>
                  <p className="text-xs text-slate-500 mt-0.5">We simultaneously run comparisons across 20+ partner institutions for optimum ROI and tenor.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Zero Upfront Advisory Fee</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Transparent consultation with complete data privacy and institutional confidentiality.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">2-Hour Rapid Response SLA</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Our Pune and regional branch executives respond within 2 business hours.</p>
                </div>
              </div>
            </div>

            {/* Quick Contact Box */}
            <div className="mt-8 p-5 rounded-2xl bg-cyan-950 text-white text-xs">
              <div className="font-bold text-amber-300 text-sm">Prefer direct phone contact?</div>
              <div className="mt-1 text-slate-300">Call our central desk: <strong className="text-white">+91 9049002010</strong></div>
              <div className="mt-0.5 text-slate-300">Or email: <strong className="text-white">info@moneyshelter.in</strong></div>
            </div>
          </div>

          {/* Right Column: Lead Form */}
          <div className="lg:col-span-7 bg-slate-50/80 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-lg">
            <h3 className="text-2xl font-bold text-slate-900 font-serif mb-2">
              Request Financial Consultation
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Fill in your details below. All submitted information is strictly confidential.
            </p>

            {result && (
              <div
                className={`p-4 rounded-2xl mb-6 text-sm font-semibold border ${
                  result.ok
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                {result.ok ? (
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{result.message}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold">⚠</span>
                    <span>{result.error}</span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="e.g. Ramesh Patil / ABC Builders"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    10-Digit Mobile <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    required
                    maxLength={10}
                    placeholder="e.g. 9822012345"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="e.g. contact@domain.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Location / City
                  </label>
                  <select
                    name="city"
                    defaultValue="Pune"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600"
                  >
                    <option value="Pune">Pune (Head Office)</option>
                    <option value="Nashik">Nashik (Branch)</option>
                    <option value="Satara">Satara (Branch)</option>
                    <option value="Mumbai">Mumbai (Planned Hub)</option>
                    <option value="Kolhapur">Kolhapur (Planned Hub)</option>
                    <option value="Other Maharashtra">Other Maharashtra</option>
                    <option value="Other India">Other Location in India</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Financing Dimension */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Financing Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="loanType"
                    defaultValue="HOME_LOAN"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600"
                  >
                    <option value="HOME_LOAN">Home Loan (Retail)</option>
                    <option value="LOAN_AGAINST_PROPERTY">Loan Against Property (LAP)</option>
                    <option value="BUSINESS_LOAN">Unsecured Business Loan</option>
                    <option value="BUSINESS_LOAN">Working Capital (OD / CC)</option>
                    <option value="BUSINESS_LOAN">Builder Project Finance / APF</option>
                    <option value="BUSINESS_LOAN">Debt Syndication / LRD</option>
                    <option value="PERSONAL_LOAN">Personal Loan</option>
                    <option value="EDUCATION_LOAN">Education Loan</option>
                    <option value="GOLD_LOAN">Gold Loan</option>
                    <option value="OTHERS">General or Life Insurance</option>
                  </select>
                </div>

                {/* Loan Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Estimated Amount (₹)
                  </label>
                  <input
                    id="inquiry-loan-amount"
                    type="number"
                    name="loanAmount"
                    placeholder="e.g. 5000000"
                    defaultValue="5000000"
                    step="50000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600"
                  />
                </div>
              </div>

              {/* Requirement Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Brief Requirement / Property / Project Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Tell us about the property details, business turnover, or project APF requirements..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600"
                ></textarea>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-700 to-cyan-600 hover:from-cyan-800 hover:to-cyan-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Consultation Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Inquiry for Immediate Review</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center mt-3">
                By submitting, you agree to be contacted by an authorized Money Shelter Pvt. Ltd. credit advisor.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
