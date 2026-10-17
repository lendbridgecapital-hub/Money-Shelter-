'use client';

import React from 'react';
import Link from 'next/link';
import type { User } from '@/types/db';
import { formatDate } from '@/lib/format';

interface Props {
  partner: User;
  companyName?: string;
}

export default function PartnerCertificateView({
  partner,
  companyName = 'Money Shelter',
}: Props) {
  const issueDateFormatted = formatDate(partner.certificateIssuedAt || partner.approvedAt || partner.createdAt);
  const certNumber = partner.certificateNumber || `MS-CERT-2026-${partner.id.slice(-4).toUpperCase()}`;

  const isSatara = Boolean(
    partner.branchId === 'br_satara_01' ||
    partner.branchName?.toLowerCase().includes('satara') ||
    partner.branchName?.toLowerCase().includes('lendbridge') ||
    partner.email?.toLowerCase().includes('lendbridge')
  );

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Action Strip (hidden during print) */}
      <div className="flex items-center justify-between gap-3 print:hidden bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl shadow-xs active:scale-95 transition"
          >
            <svg className="w-3.5 h-3.5 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home Dashboard</span>
          </Link>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-bold text-slate-800">
            {isSatara ? 'Official Channel Partner Certificate • Lendbridge Capital (Satara)' : 'Official Channel Partner Certificate'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL CERTIFICATE CANVAS (Elegantly styled for screen & print)         */}
      {/* ========================================================================= */}
      <div
        id="certificate-print-area"
        className="bg-white border-8 border-double border-amber-600/60 rounded-3xl p-6 sm:p-12 shadow-xl relative overflow-hidden text-slate-900 font-serif"
        style={{
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Subtle Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <span className="text-[140px] font-black tracking-widest text-slate-900 uppercase">
            {isSatara ? 'LENDBRIDGE CAPITAL' : 'MONEY SHELTER'}
          </span>
        </div>

        {/* Ornate Gold Corner Borders */}
        <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-amber-600/70" />
        <div className="absolute top-3 right-3 w-10 h-10 border-t-2 border-r-2 border-amber-600/70" />
        <div className="absolute bottom-3 left-3 w-10 h-10 border-b-2 border-l-2 border-amber-600/70" />
        <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-amber-600/70" />

        {/* Certificate Header */}
        <div className="text-center space-y-2 relative z-10">
          {isSatara ? (
            <div className="inline-flex items-center justify-center mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/lendbridge-logo.png"
                alt="Lendbridge Capital"
                className="h-16 w-auto max-w-[200px] object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-600 text-white font-sans font-black text-xl shadow-md mb-1">
              M
            </div>
          )}
          <h2 className="text-base sm:text-lg font-bold font-sans uppercase tracking-[0.25em] text-slate-700">
            {isSatara ? 'Lendbridge Capital' : `${companyName} Solutions Private Limited`}
          </h2>
          <p className="text-[10px] font-sans text-slate-400 max-w-md mx-auto uppercase tracking-wider">
            {isSatara
              ? 'Licensed Direct Selling Agency (DSA) & Loan Syndication Network • Satara Branch (Powai Naka, Satara - 415001)'
              : 'Licensed Direct Selling Agency (DSA) & Loan Syndication Network • Pune HQ'}
          </p>

          <div className="pt-3">
            <span className="text-[11px] font-sans font-bold uppercase tracking-[0.3em] text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-300">
              Official Certification of Appointment
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-wide mt-3 font-serif">
              CERTIFICATE OF ASSOCIATION
            </h1>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto mt-2" />
          </div>
        </div>

        {/* Certificate Body Text */}
        <div className="text-center my-8 max-w-2xl mx-auto space-y-4 relative z-10">
          <p className="text-xs sm:text-sm text-slate-600 font-sans italic">
            This is to formally certify that
          </p>

          <div className="py-2 border-b-2 border-slate-300/80 max-w-lg mx-auto">
            <h3 className="text-xl sm:text-3xl font-bold text-slate-950 font-serif tracking-tight">
              {partner.name}
            </h3>
            {partner.fatherSpouseName && (
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                (S/o / D/o / W/o {partner.fatherSpouseName})
              </p>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-700 font-sans leading-relaxed pt-1">
            has been duly vetted, compliance-cleared, and appointed as an authorized{' '}
            <strong className="text-emerald-950 font-semibold">Channel Partner & Sub-DSA</strong> of {isSatara ? 'Lendbridge Capital (Satara Branch)' : `${companyName} Solutions`}.
            The associate is authorized to originate, verify, and transmit retail and commercial loan applications across our partner banking and NBFC network.
          </p>
        </div>

        {/* Association Identity Credentials Grid */}
        <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 max-w-2xl mx-auto font-sans text-xs relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Partner DSA Code</span>
              <strong className="font-mono text-sm text-slate-900">{partner.partnerCode || 'QFS-PRT-ACTIVE'}</strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Permanent Account No.</span>
              <strong className="font-mono text-sm text-slate-900">{partner.panNumber || '—'}</strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Registered Branch</span>
              <strong className="text-slate-900 text-xs truncate block">
                {isSatara ? 'Lendbridge Capital (Satara Branch)' : (partner.branchName || 'Operating Branch Office')}
              </strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Branch RM</span>
              <strong className="text-slate-900 text-xs truncate block">{partner.assignedRmName || 'Branch Desk'}</strong>
            </div>
          </div>
        </div>

        {/* Verification Seals & Signatures */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-6 max-w-2xl mx-auto font-sans relative z-10">
          {/* Certificate Metadata */}
          <div className="text-center sm:text-left space-y-1">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Certificate Number</p>
            <p className="font-mono font-bold text-xs text-slate-800">{certNumber}</p>
            <p className="text-[10px] text-slate-500">
              Date of Association: <strong>{issueDateFormatted}</strong>
            </p>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
              {isSatara ? '✓ Verified by Lendbridge Capital Satara Desk' : '✓ Verified by Central Support Desk'}
            </span>
          </div>

          {/* Golden Seal Emblem */}
          <div className="w-20 h-20 rounded-full border-4 border-amber-500/80 bg-gradient-to-tr from-amber-100 to-amber-50 flex flex-col items-center justify-center shadow-inner text-center shrink-0">
            <span className="text-amber-800 text-[8px] font-extrabold uppercase tracking-widest leading-none">
              {isSatara ? 'LENDBRIDGE' : 'MONEY SHELTER'}
            </span>
            <span className="text-base my-0.5">🎖️</span>
            <span className="text-amber-900 text-[7px] font-bold uppercase tracking-wider leading-none">
              VERIFIED DSA
            </span>
          </div>

          {/* Authorized Signatory */}
          <div className="text-center sm:text-right space-y-1">
            <div className="font-serif italic text-base text-slate-800 font-bold mb-0.5">
              {isSatara ? 'Branch Operations Desk' : 'Central Support Desk'}
            </div>
            <div className="w-36 h-0.5 bg-slate-300 ml-auto mr-auto sm:mr-0" />
            <p className="text-[10px] font-bold text-slate-800 uppercase">Authorized Signatory</p>
            <p className="text-[9px] text-slate-400">
              {isSatara ? 'Lendbridge Capital (Satara Branch)' : `${companyName} Solutions Pvt Ltd`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
