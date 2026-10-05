'use client';

import React, { useState } from 'react';

interface ExitFormButtonProps {
  label?: string;
  className?: string;
  variant?: 'header' | 'primary' | 'secondary' | 'outline';
}

export default function ExitFormButton({
  label = 'Exit Form ✕',
  className = '',
  variant = 'header',
}: ExitFormButtonProps) {
  const [showExitModal, setShowExitModal] = useState(false);

  const handleExit = () => {
    // Attempt to close tab or window directly
    try {
      window.close();
    } catch {
      // browser may block window.close if not opened via script
    }

    // In case browser prevents automatic tab closure, prompt user with clean modal
    setTimeout(() => {
      setShowExitModal(true);
    }, 150);
  };

  const getVariantClass = () => {
    switch (variant) {
      case 'header':
        return 'inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 text-xs font-bold active:scale-95 transition border border-slate-200 shadow-2xs';
      case 'primary':
        return 'inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition shadow-sm';
      case 'secondary':
        return 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition';
      case 'outline':
      default:
        return 'inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-700 hover:bg-rose-50 border border-slate-300 hover:border-rose-200 transition shadow-2xs';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleExit}
        className={className || getVariantClass()}
        title="Exit application form"
      >
        <span>{label}</span>
      </button>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center text-2xl mx-auto mb-3 shadow-inner">
              🚪
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Exit Loan Application</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              You can safely close this browser window or tab. If you wish to complete or review your loan application later, simply reopen the link provided by your financial advisor.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    window.close();
                  } catch {
                    // ignore
                  }
                  setShowExitModal(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
              >
                Close Tab / Window
              </button>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Return to Form
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
