'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email address or password. Please try again.');
        setIsLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred during sign in.');
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Monogram */}
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white font-extrabold text-2xl shadow-md"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Q
        </div>

        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          QuickFinSure
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Multi-Branch Loan Origination & Partner Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-100 sm:rounded-2xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <span>✕</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@quickfinsure.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-3 px-4 rounded-xl text-sm font-bold shadow-md hover:opacity-95 disabled:opacity-50 transition-opacity"
              >
                {isLoading ? 'Signing In…' : 'Sign In to Portal'}
              </button>
            </div>
          </form>

          {/* Quick Demo Logins for All 4 Roles */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Role-Based Sign-Ins
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@quickfinsure.com')}
                className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 transition-colors text-left flex flex-col"
              >
                <span>👑 Admin</span>
                <span className="text-[10px] font-normal text-slate-400">admin@quickfinsure.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('support@quickfinsure.com')}
                className="py-2 px-2.5 bg-amber-50/60 hover:bg-amber-100/70 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 transition-colors text-left flex flex-col"
              >
                <span>🛡️ Central Support</span>
                <span className="text-[10px] font-normal text-amber-700">support@quickfinsure.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('ops@quickfinsure.com')}
                className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 transition-colors text-left flex flex-col"
              >
                <span>⚙️ Operations</span>
                <span className="text-[10px] font-normal text-slate-500">ops@quickfinsure.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('rm@quickfinsure.com')}
                className="py-2 px-2.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-900 transition-colors text-left flex flex-col"
              >
                <span>👔 Relationship Mgr</span>
                <span className="text-[10px] font-normal text-indigo-600">rm@quickfinsure.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('partner@quickfinsure.com')}
                className="col-span-2 py-2 px-2.5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900 transition-colors text-left flex flex-col"
              >
                <span>🤝 Channel Partner</span>
                <span className="text-[10px] font-normal text-emerald-600">partner@quickfinsure.com</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5 text-center">
              Universal default password: <code className="font-mono font-semibold text-slate-600">Password123!</code>
            </p>
          </div>
        </div>

        {/* Partner Onboarding Link */}
        <div className="mt-5 text-center">
          <p className="text-xs text-slate-500">
            Want to become a referral partner?{' '}
            <Link
              href="/partner/onboard"
              className="font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
            >
              Onboard & Sign Sub-DSA Agreement →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
