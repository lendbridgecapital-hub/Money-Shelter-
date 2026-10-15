'use client';

import React, { useState, useTransition } from 'react';
import { createApplicationLinkAction } from '@/actions/applicationActions';
import type { Branch } from '@/types/db';

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
  const [selectedBranchId, setSelectedBranchId] = useState<string>(userBranch?.id || '');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active selected branch/site details
  const activeBranch = branches.find((b) => b.id === selectedBranchId) || userBranch;
  const isSite = activeBranch?.type === 'SITE';

  const canSelectBranch = userRole === 'ADMIN' || userRole === 'CENTRAL_SUPPORT' || userRole === 'OPERATIONS' || userRole === 'RELATIONSHIP_MANAGER';

  const handleGenerate = () => {
    setError(null);
    setCopied(false);

    startTransition(async () => {
      try {
        const res = await createApplicationLinkAction(undefined, selectedBranchId || undefined);
        if (!res || !res.ok) {
          setError((res && res.error) || 'Could not generate application link. Your session may have expired. Please refresh or log in.');
        } else if (res.url) {
          // Resolve public origin: never generate localhost or capacitor:// links for clients
          const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
          const isLocal = !rawOrigin || rawOrigin.includes('localhost') || rawOrigin.startsWith('capacitor:');
          const productionHost = 'https://quicfinsure.onrender.com';
          const publicBase = isLocal ? productionHost : rawOrigin;
          const finalUrl = res.token ? `${publicBase}/apply/${res.token}` : res.url;
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

  // WhatsApp message: Advisor name, company name, and link on a separate line for 100% clickability
  const siteTagText = isSite && activeBranch ? ` for ${activeBranch.name}` : '';
  const whatsappMessage = `Hello! I am your financial advisor ${advisorName}. Please complete your loan application with ${companyName || 'Money Shelter'}${siteTagText} by uploading your documents here:

${shareUrl}`;

  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  const emailSubject = `Loan Application Link — ${companyName || 'Money Shelter'}${siteTagText}`;
  const emailBody = `Hello! I am your financial advisor ${advisorName}.

Please complete your loan application with ${companyName || 'Money Shelter'}${siteTagText} by uploading your documents here:

${shareUrl}

Warm regards,
${advisorName}
${companyName || 'Money Shelter'}`;
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
          {isSite ? 'Direct Project Customer Application Link' : 'Single-Use Customer Application Link'}
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Generate an encrypted single-use link for your customer. Once submitted with KYC docs, it auto-expires and notifies your assigned desk and dedicated RM.
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
                <span>Generating Secure Link…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Generate Application Link</span>
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
