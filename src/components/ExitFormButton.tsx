'use client';

import React, { useState } from 'react';

interface ExitFormButtonProps {
  label?: string;
  className?: string;
  variant?: 'header' | 'primary' | 'secondary' | 'outline';
  fallbackUrl?: string;
  formTitle?: string;
}

export default function ExitFormButton({
  label = 'Exit Form ✕',
  className = '',
  variant = 'header',
  fallbackUrl = '/dashboard',
  formTitle = 'Exit Loan Application',
}: ExitFormButtonProps) {
  const [showExitModal, setShowExitModal] = useState(false);

  const handleExitClick = () => {
    // Attempt window.close() first (works if opened via script or target=_blank)
    try {
      window.close();
    } catch {}

    // Show modal for fallback choices in case browser prevents direct window closure
    setTimeout(() => {
      setShowExitModal(true);
    }, 100);
  };

  const handleNavigateOut = (targetUrl: string = fallbackUrl) => {
    try {
      window.close();
    } catch {}

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = targetUrl;
        }
      }
    }, 150);
  };

  const getVariantClass = () => {
    switch (variant) {
      case 'header':
        return 'inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 text-xs font-bold active:scale-95 transition border border-slate-200 shadow-2xs cursor-pointer';
      case 'primary':
        return 'inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition shadow-sm cursor-pointer';
      case 'secondary':
        return 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer';
      case 'outline':
      default:
        return 'inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-700 hover:bg-rose-50 border border-slate-300 hover:border-rose-200 transition shadow-2xs cursor-pointer';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleExitClick}
        className={className || getVariantClass()}
        title="Exit application form"
      >
        <span>{label}</span>
      </button>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto mb-3 shadow-inner">
              🚪
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">{formTitle}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              You can close this tab or return to the main portal. Where would you like to go?
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/dashboard';
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Go to Sign In
              </button>
              <button
                type="button"
                onClick={() => handleNavigateOut(fallbackUrl)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Close Tab / Window
              </button>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full py-1.5 text-slate-400 hover:text-slate-600 text-xs font-medium transition cursor-pointer"
              >
                Stay on Form
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
