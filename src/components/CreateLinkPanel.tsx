'use client';

import React, { useState, useTransition } from 'react';
import { createApplicationLinkAction } from '@/actions/applicationActions';

interface CreateLinkPanelProps {
  companyName: string;
  partnerName?: string;
  userRole?: string;
}

export default function CreateLinkPanel({
  companyName,
  partnerName,
  userRole,
}: CreateLinkPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    setCopied(false);

    startTransition(async () => {
      try {
        const res = await createApplicationLinkAction();
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
  const whatsappMessage = `Hello! I am your financial advisor ${advisorName}, Please complete your loan application with ${companyName || 'Quickfinsure'} by uploading your documents here:

${shareUrl}`;

  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  const emailSubject = `Loan Application Link — ${companyName || 'Quickfinsure'}`;
  const emailBody = `Hello! I am your financial advisor ${advisorName}.

Please complete your loan application with ${companyName || 'Quickfinsure'} by uploading your documents here:

${shareUrl}

Warm regards,
${advisorName}
${companyName || 'Quickfinsure'}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  return (
    <div className="max-w-2xl bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs">
      <div className="text-center py-2 sm:py-4">
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-sm mb-3.5 bg-emerald-600"
        >
          <svg className="w-7 h-7 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Single-Use Customer Application Link</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Generate an encrypted single-use link for your customer. Once submitted with KYC docs, it auto-expires and notifies your branch.
        </p>

        <div className="mt-5">
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs disabled:opacity-50 transition-all flex items-center justify-center gap-2 mx-auto"
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
        <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-center gap-2">
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      {generatedUrl && (
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-3.5">
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
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <svg className="w-4 h-4 stroke-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email</span>
            </a>

            {token && (
              <a
                href={`/apply/${token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2.5 border border-slate-200 hover:border-slate-300 active:scale-95 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <svg className="w-4 h-4 stroke-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Preview Form</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
