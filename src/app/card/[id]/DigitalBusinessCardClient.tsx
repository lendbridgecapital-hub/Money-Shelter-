'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { User, CompanySettings, LoanType } from '@/types/db';
import { LOAN_TYPE_LABELS, formatCurrencyINR } from '@/lib/format';
import { submitDigitalCardInquiryAction } from '@/actions/publicActions';

interface Props {
  advisor: User;
  companySettings: CompanySettings;
}

export default function DigitalBusinessCardClient({ advisor, companySettings }: Props) {
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('HOME_LOAN');
  const [loanAmount, setLoanAmount] = useState('');
  const [city, setCity] = useState(advisor.city || '');
  const [notes, setNotes] = useState('');

  const companyName = companySettings.companyName || 'Money Shelter';
  const advisorPhoto = advisor.photoUrl || advisor.firmLogoUrl;
  const advisorTitle =
    advisor.role === 'CHANNEL_PARTNER'
      ? 'Authorized Financial Advisor & DSA Partner'
      : advisor.role === 'RELATIONSHIP_MANAGER'
      ? 'Relationship Manager'
      : 'Loan Consultant';

  // 1-Click vCard Generator (.vcf)
  function downloadVCard() {
    const vCardContent = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${advisor.name}`,
      `N:${advisor.name};;;;`,
      `ORG:${advisor.firmName ? `${advisor.firmName};` : ''}${companyName}`,
      `TITLE:${advisorTitle}`,
      advisor.phone ? `TEL;TYPE=CELL,VOICE:${advisor.phone}` : '',
      `EMAIL;TYPE=INTERNET:${advisor.email}`,
      companySettings.websiteUrl ? `URL:${companySettings.websiteUrl}` : '',
      `NOTE:${advisor.bio ? `${advisor.bio} - ` : ''}${companyName} Certified Financial Partner`,
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\r\n');

    const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${advisor.name.replace(/\s+/g, '_')}_MoneyShelter.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function getPublicCardUrl() {
    if (typeof window === 'undefined') return `https://money-shelter.onrender.com/card/${advisor.id}`;
    const origin = window.location.origin;
    if (!origin || origin.includes('localhost') || origin.startsWith('capacitor:')) {
      return `https://money-shelter.onrender.com/card/${advisor.id}`;
    }
    return `${origin}/card/${advisor.id}`;
  }

  function handleCopyCardLink() {
    if (typeof window !== 'undefined') {
      const url = getPublicCardUrl();
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }

  function handleShareWhatsApp() {
    if (typeof window !== 'undefined') {
      const cardUrl = getPublicCardUrl();
      const text = encodeURIComponent(
        `Hello! Here is the official Digital Visiting Card of ${advisor.name} (${advisor.firmName || companyName}). Click the link to view financial services, save contact details directly to your phone, or apply for a loan:\n\n${cardUrl}`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
  }

  function handleSubmitInquiry(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('advisorId', advisor.id);
    formData.append('fullName', fullName);
    formData.append('mobile', mobile);
    formData.append('email', email);
    formData.append('loanType', loanType);
    formData.append('loanAmount', loanAmount);
    formData.append('city', city);
    formData.append('notes', notes);

    startTransition(async () => {
      try {
        const res = await submitDigitalCardInquiryAction(formData);
        if (!res || !res.ok) {
          setErrorMessage((res && res.error) || 'Failed to submit inquiry. Please try again.');
        } else {
          setSuccessMessage(res.message || 'Inquiry submitted successfully!');
          setFullName('');
          setMobile('');
          setEmail('');
          setLoanAmount('');
          setNotes('');
        }
      } catch (err) {
        setErrorMessage((err as Error).message || 'Server error submitting inquiry.');
      }
    });
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pb-8 px-3 sm:px-4"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 32px)',
      }}
    >
      <div className="max-w-md mx-auto space-y-4">
        {/* Top Sticky Navigation Bar (Provides 1-tap Return to App / Dashboard) */}
        <div className="sticky top-2 z-50 bg-slate-900/90 backdrop-blur-md border border-white/15 px-3 py-2.5 rounded-2xl flex items-center justify-between shadow-xl">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = '/dashboard';
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition border border-white/10"
          >
            <svg className="w-3.5 h-3.5 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>

          <span className="text-[11px] font-bold text-slate-300 truncate max-w-[130px]">
            {advisor.name}
          </span>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition shadow-xs"
          >
            <svg className="w-3.5 h-3.5 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home</span>
          </Link>
        </div>

        {/* Main Digital Visiting Card Frame */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl shadow-2xl border border-emerald-500/25 overflow-hidden">
          {/* Card Top Banner with Emerald Gradient */}
          <div className="p-6 text-white text-center relative border-b border-white/10">
            {/* Money Shelter Brand Watermark */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Verified DSA Partner
              </span>
              <span className="text-xs font-bold text-slate-300 tracking-tight">
                {companyName}
              </span>
            </div>

            {/* Avatar / Photo with Glowing Ring */}
            <div className="relative inline-block mb-3">
              {advisorPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={advisorPhoto}
                  alt={advisor.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-emerald-400/60 shadow-xl mx-auto"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black text-3xl flex items-center justify-center border-4 border-emerald-400/60 shadow-xl mx-auto">
                  {advisor.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-400 text-slate-950 font-black rounded-full border-2 border-slate-900 flex items-center justify-center text-xs shadow-sm">
                ✓
              </div>
            </div>

            {/* Advisor Name & Firm */}
            <h1 className="text-xl font-black text-white tracking-tight">{advisor.name}</h1>
            <p className="text-xs text-emerald-400 font-bold mt-0.5">{advisorTitle}</p>
            {advisor.firmName && (
              <p className="text-sm font-semibold text-slate-200 mt-1">🏛️ {advisor.firmName}</p>
            )}
            {advisor.city && (
              <p className="text-xs text-slate-400 mt-0.5">📍 {advisor.city}</p>
            )}

            {advisor.bio && (
              <p className="text-xs text-slate-300/90 italic mt-2.5 max-w-xs mx-auto leading-relaxed border-t border-white/10 pt-2">
                &ldquo;{advisor.bio}&rdquo;
              </p>
            )}
          </div>

          {/* Quick Action Buttons (Save Contact, Call, WhatsApp, Email) */}
          <div className="p-4 sm:p-5 space-y-3 bg-white/5 border-b border-white/10">
            {/* Primary Action: 1-Click Save Contact to Phone Address Book */}
            <button
              onClick={downloadVCard}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
            >
              <svg className="w-5 h-5 stroke-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Save Contact to Phone (vCard)</span>
            </button>

            {/* Secondary Action Grid */}
            <div className="grid grid-cols-3 gap-2">
              {advisor.phone ? (
                <a
                  href={`tel:${advisor.phone}`}
                  className="py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white active:scale-95 text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-2xs transition backdrop-blur-xs"
                >
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Call</span>
                </a>
              ) : (
                <div />
              )}

              {advisor.phone ? (
                <a
                  href={`https://api.whatsapp.com/send?phone=${advisor.phone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(`Hello ${advisor.name}, I visited your Digital Visiting Card and would like assistance with a loan.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white active:scale-95 text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-2xs transition backdrop-blur-xs"
                >
                  <svg className="w-4 h-4 fill-emerald-400" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
              ) : (
                <div />
              )}

              <a
                href={`mailto:${advisor.email}?subject=${encodeURIComponent(`Loan Consultation Request`)}`}
                className="py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white active:scale-95 text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-2xs transition backdrop-blur-xs"
              >
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Email</span>
              </a>
            </div>
          </div>

          {/* Contact Details List */}
          <div className="p-4 sm:p-5 space-y-2.5 text-xs text-slate-300">
            <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1">
              Direct Contact Channels
            </p>

            {advisor.phone && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/10 border border-white/10">
                <span className="text-slate-300 font-medium">Mobile Phone</span>
                <span className="font-bold text-white font-mono">{advisor.phone}</span>
              </div>
            )}

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/10 border border-white/10">
              <span className="text-slate-300 font-medium">Official Email</span>
              <span className="font-bold text-white font-mono truncate max-w-[180px]">{advisor.email}</span>
            </div>

            {advisor.partnerCode && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/10 border border-white/10">
                <span className="text-slate-300 font-medium">Partner Code</span>
                <span className="font-bold text-emerald-300 font-mono bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded">
                  {advisor.partnerCode}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lead Capture / Instant Loan Inquiry Form */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl shadow-xl border border-emerald-500/25 p-5 sm:p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">📝</span>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                Request a Loan or Financial Advice
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Submit your details below. {advisor.name} will immediately receive your request and guide your loan application.
            </p>
          </div>

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-white text-xs sm:text-sm font-semibold space-y-1">
              <p className="font-bold text-emerald-300">✓ Request Received!</p>
              <p className="text-xs text-emerald-100 leading-relaxed">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold">
              ✕ {errorMessage}
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmitInquiry} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900/70 border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900/70 border border-white/15 rounded-xl text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900/70 border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                    Loan Product Needed
                  </label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value as LoanType)}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  >
                    <option value="HOME_LOAN" className="bg-slate-900 text-white">Home Loan</option>
                    <option value="PERSONAL_LOAN" className="bg-slate-900 text-white">Personal Loan</option>
                    <option value="BUSINESS_LOAN" className="bg-slate-900 text-white">Business Loan</option>
                    <option value="LOAN_AGAINST_PROPERTY" className="bg-slate-900 text-white">Loan Against Property (LAP)</option>
                    <option value="EDUCATION_LOAN" className="bg-slate-900 text-white">Education Loan</option>
                    <option value="GOLD_LOAN" className="bg-slate-900 text-white">Gold Loan</option>
                    <option value="OTHERS" className="bg-slate-900 text-white">Other Loans</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                    Required Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900/70 border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Delhi, Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900/70 border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                  Message / Special Requirements
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell us about your requirement..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900/70 border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>Submitting to {advisor.name}…</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Request Call Back →</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Share Card Bar */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-white flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-white">Share This Business Card</p>
            <p className="text-[10px] text-slate-300">Share with prospective loan clients</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
            >
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handleCopyCardLink}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white text-xs font-bold transition"
            >
              {copiedLink ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="text-center text-[11px] text-slate-400 pt-2 pb-2">
          <p>Powered by <strong>{companyName}</strong> Loan Origination & Partner Platform</p>
        </div>

        {/* Bottom Return to Main Dashboard Action */}
        <div className="text-center pb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white font-bold text-xs active:scale-95 transition shadow-sm"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Return to Main Dashboard Screen</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
