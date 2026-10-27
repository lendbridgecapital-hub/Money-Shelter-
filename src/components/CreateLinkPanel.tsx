'use client';

import React, { useState, useTransition } from 'react';
import { createApplicationLinkAction } from '@/actions/applicationActions';
import type { Branch, LoanType } from '@/types/db';
import { LOAN_TYPE_LABELS } from '@/lib/format';

export const LOAN_OPTIONS: { id: LoanType; label: string; icon: string; description: string }[] = [
  { id: 'HOME_LOAN', label: 'Home Loan', icon: '🏠', description: 'Purchase, construction, plot & flat' },
  { id: 'PERSONAL_LOAN', label: 'Personal Loan', icon: '👤', description: 'Quick unsecured cash & personal needs' },
  { id: 'CAR_LOAN', label: 'New / Used Car Loan', icon: '🚗', description: 'New car quotation & pre-owned 4-wheeler auto finance' },
  { id: 'BUSINESS_LOAN', label: 'Business Loan', icon: '🏢', description: 'SME, working capital & machinery' },
  { id: 'LOAN_AGAINST_PROPERTY', label: 'Loan Against Property (LAP)', icon: '🏦', description: 'Mortgage against residential or commercial asset' },
  { id: 'EDUCATION_LOAN', label: 'Education Loan', icon: '🎓', description: 'Higher studies in India or abroad' },
  { id: 'GOLD_LOAN', label: 'Gold Loan', icon: '🪙', description: 'Instant liquidity against physical gold jewelry' },
  { id: 'BALANCE_TRANSFER', label: 'Balance Transfer', icon: '🔄', description: 'Refinance existing loans at lower interest rate' },
  { id: 'OTHERS', label: 'Other / Custom Loan', icon: '📋', description: 'General requirement or custom financing' },
];

interface CreateLinkPanelProps {
  companyName: string;
  partnerName?: string;
  userRole?: string;
  userBranch?: Branch | null;
  branches?: Branch[];
}

export default function CreateLinkPanel({
  companyName,
  partnerName,
  userRole,
  userBranch,
  branches = [],
}: CreateLinkPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedLoanType, setSelectedLoanType] = useState<LoanType>('HOME_LOAN');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (userBranch?.id) return userBranch.id;
    if (companyName?.toLowerCase().includes('lendbridge')) {
      const satara = branches.find((b) => b.id === 'br_satara_01' || b.name.toLowerCase().includes('satara'));
      if (satara) return satara.id;
      return 'br_satara_01';
    }
    return '';
  });
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active selected branch/site details
  const activeBranch = branches.find((b) => b.id === selectedBranchId) || userBranch;
  const isSite = activeBranch?.type === 'SITE';

  const isSatara = Boolean(
    activeBranch?.id === 'br_satara_01' ||
    activeBranch?.code === 'STR01' ||
    activeBranch?.isCoBranded ||
    activeBranch?.name?.toLowerCase().includes('satara') ||
    userBranch?.id === 'br_satara_01' ||
    userBranch?.code === 'STR01' ||
    userBranch?.isCoBranded ||
    userBranch?.name?.toLowerCase().includes('satara') ||
    companyName?.toLowerCase().includes('lendbridge') ||
    (typeof window !== 'undefined' && (
      window.location.search.toLowerCase().includes('satara') ||
      window.location.search.toLowerCase().includes('lendbridge') ||
      window.location.pathname.toLowerCase().includes('satara') ||
      window.location.pathname.toLowerCase().includes('lendbridge')
    ))
  );

  const canSelectBranch = userRole === 'ADMIN' || userRole === 'CENTRAL_SUPPORT' || userRole === 'OPERATIONS' || userRole === 'RELATIONSHIP_MANAGER';

  const handleGenerate = () => {
    setError(null);
    setCopied(false);

    startTransition(async () => {
      try {
        const branchToUse = selectedBranchId || (isSatara ? 'br_satara_01' : undefined);
        const res = await createApplicationLinkAction(selectedLoanType, branchToUse, undefined);
        if (!res || !res.ok) {
          setError((res && res.error) || 'Could not generate application link. Your session may have expired. Please refresh or log in.');
        } else if (res.url) {
          // Resolve public origin: always prioritize production Vercel domain; never use onrender.com, localhost, or capacitor
          const productionHost = 'https://money-shelter.vercel.app';
          const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
          const isInvalidOrigin =
            !rawOrigin ||
            rawOrigin.includes('localhost') ||
            rawOrigin.startsWith('capacitor:') ||
            rawOrigin.includes('onrender.com') ||
            rawOrigin.includes('render.com');
          const publicBase = isInvalidOrigin ? productionHost : rawOrigin;

          let queryString = `?loanType=${encodeURIComponent(selectedLoanType)}`;
          if (res.url) {
            try {
              const parsedUrl = new URL(res.url, productionHost);
              if (parsedUrl.search) {
                queryString = parsedUrl.search;
              }
            } catch {}
          }
          if (isSatara && !queryString.includes('branch=br_satara_01')) {
            queryString += queryString.includes('?') ? '&branch=br_satara_01' : '?branch=br_satara_01';
          }

          const finalUrl = res.token ? `${publicBase}/apply/${res.token}${queryString}` : `${publicBase}/apply/${queryString}`;
          setGeneratedUrl(finalUrl);
          setToken(res.token || null);
        }
      } catch (err) {
        setError((err as Error).message || 'Server error generating application link. Please try again.');
      }
    });
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const advisorName = partnerName || 'Financial Advisor';
  const shareUrl = generatedUrl || '';
  const loanLabel = LOAN_TYPE_LABELS[selectedLoanType] || 'Loan';

  const displayBrandName = isSatara
    ? (activeBranch?.coBrandName || userBranch?.coBrandName || 'Lendbridge Capital')
    : (companyName || 'Money Shelter');

  // WhatsApp message: Advisor name, brand name, and link on a separate line for 100% clickability
  const siteTagText = isSite && activeBranch ? ` for ${activeBranch.name}` : (isSatara ? ' (Satara Branch)' : '');
  const whatsappMessage = `Hello! I am your financial advisor ${advisorName}. Please complete your ${loanLabel} application with ${displayBrandName}${siteTagText} by uploading your documents here:

${shareUrl}

(Note: You can review and modify your loan type directly on the form if needed).`;

  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  const emailSubject = `${loanLabel} Application Link — ${displayBrandName}${siteTagText}`;
  const emailBody = `Hello! I am your financial advisor ${advisorName}.

Please complete your ${loanLabel} application with ${displayBrandName}${siteTagText} by uploading your documents here:

${shareUrl}

(Note: You can review and modify your loan type directly on the form if needed).

Warm regards,
${advisorName}
${displayBrandName}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  return (
    <div className="max-w-2xl bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Site / Branch Association Notice */}
      {isSite && activeBranch && (
        <div className="p-3.5 bg-gradient-to-r from-amber-50 via-orange-50/50 to-white border border-amber-200 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-2xs">
            🏗️
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-amber-950">
                Direct Construction Project: {activeBranch.name}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">
                Company Site Desk
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Dedicated manpower link. All customer submissions via this link are automatically tagged under <strong>{activeBranch.name}</strong> and dedicated RM <strong>{activeBranch.dedicatedRmName || 'Central Desk'}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Admin/Manager Location Switcher */}
      {canSelectBranch && branches.length > 0 && (
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Assign Originating Location / Construction Site
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {userBranch && (
              <option value={userBranch.id}>
                Default: {userBranch.name} ({userBranch.code}){userBranch.type === 'SITE' ? ' — 🏗️ Construction Site' : ''}
              </option>
            )}
            <optgroup label="🏗️ Construction Sites (Direct Company Projects)">
              {branches
                .filter((b) => b.type === 'SITE' && b.id !== userBranch?.id)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    🏗️ {b.name} ({b.code}){b.dedicatedRmName ? ` — RM: ${b.dedicatedRmName}` : ''}
                  </option>
                ))}
            </optgroup>
            <optgroup label="🏢 Regional Branches / Offices">
              {branches
                .filter((b) => b.type !== 'SITE' && b.id !== userBranch?.id)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    🏢 {b.name} ({b.code})
                  </option>
                ))}
            </optgroup>
          </select>
          <p className="text-[10px] text-slate-400 mt-1">
            Choose whether to originate this link for a specific construction site or general branch office.
          </p>
        </div>
      )}

      {/* 1. Required Loan Type Selector (Asked First) */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50/90 via-indigo-50/20 to-white border border-slate-200/90 rounded-2xl space-y-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏷️</span>
              <span>Step 1: Select Desired Loan Type</span>
              <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Choose the loan product for your direct lead. This will be automatically pre-filled in the customer&apos;s application form.
            </p>
          </div>
          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto shrink-0 flex items-center gap-1">
            <span>✓</span>
            <span>Pre-fills form • Customer can modify</span>
          </span>
        </div>

        {/* Visual Pill / Card Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
          {LOAN_OPTIONS.map((opt) => {
            const isSelected = selectedLoanType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedLoanType(opt.id);
                  if (generatedUrl) {
                    setGeneratedUrl(null);
                    setToken(null);
                  }
                }}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all active:scale-95 ${
                  isSelected
                    ? isSite
                      ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/30 text-amber-950 shadow-xs font-bold'
                      : 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 shadow-xs font-bold'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700'
                }`}
              >
                <span className="text-xl sm:text-2xl shrink-0 mt-0.5">{opt.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate flex items-center gap-1">
                    <span>{opt.label}</span>
                    {isSelected && <span className="text-emerald-600 font-extrabold text-[11px]">✓</span>}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Alternative Quick Select Dropdown */}
        <div className="pt-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Or select from dropdown:
          </label>
          <select
            value={selectedLoanType}
            onChange={(e) => {
              setSelectedLoanType(e.target.value as LoanType);
              if (generatedUrl) {
                setGeneratedUrl(null);
                setToken(null);
              }
            }}
            className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {LOAN_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.icon} {opt.label} — {opt.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-center py-2 sm:py-4">
        <div
          className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-sm mb-3.5 ${
            isSite ? 'bg-amber-600' : 'bg-emerald-600'
          }`}
        >
          {isSite ? (
            <span className="text-2xl">🏗️</span>
          ) : (
            <svg className="w-7 h-7 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
        </div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
          {isSite ? `Direct Project ${loanLabel} Application Link` : `Single-Use ${loanLabel} Application Link`}
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Generate an encrypted single-use link for your customer for <strong>{loanLabel}</strong>. The loan type will be pre-filled on their form, and customer can adjust if needed.
        </p>

        <div className="mt-5">
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs disabled:opacity-50 transition-all flex items-center justify-center gap-2 mx-auto ${
              isSite ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating {loanLabel} Link…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Generate {loanLabel} Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-center gap-2">
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      {generatedUrl && (
        <div className="pt-4 border-t border-slate-100 space-y-3.5">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            Your Customer Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={generatedUrl}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-mono text-slate-800 focus:outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
              </svg>
              <span>WhatsApp</span>
            </a>

            <a
              href={emailHref}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>✉️</span>
              <span>Email Link</span>
            </a>

            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>↗</span>
              <span>Open Form</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
