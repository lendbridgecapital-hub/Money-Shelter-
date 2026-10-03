'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function AdminPolicyCardsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AdminPolicyCardsError] Error caught:', error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 bg-white border border-slate-200/90 rounded-3xl shadow-sm text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
        💳
      </div>
      <div>
        <h2 className="text-lg font-black text-slate-900">Bank Policy Studio Refresh Required</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          We encountered an issue loading bank policy cards. Please ensure you are logged in with an authorized Administrator account.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition"
        >
          🔄 Retry Loading
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
