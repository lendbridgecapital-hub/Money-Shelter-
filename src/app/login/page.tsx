'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for branch query param (e.g., /login?branch=SAT01) and redirect to co-branded route
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const branchParam = params.get('branch') || params.get('b');
        if (branchParam) {
          router.replace(`/login/${encodeURIComponent(branchParam)}`);
          return;
        }
      }
    } catch {
      // ignore
    }
  }, [router]);

  // Auto-redirect if already signed in on mobile app or web
  useEffect(() => {
    getSession().then((session) => {
      if (session?.user) {
        router.replace('/dashboard');
      }
    }).catch(() => {});
  }, [router]);

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
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Official Money Shelter Logo */}
        <div className="inline-block mb-2">
          <Image
            src="/money-shelter-logo.png"
            alt="Money Shelter Pvt. Ltd. — Where Money Meets Trust"
            width={220}
            height={135}
            priority
            className="mx-auto h-20 w-auto object-contain"
          />
        </div>

        <h2 className="mt-2 text-center text-2xl font-black text-slate-900 tracking-tight">
          Money Shelter Portal Login
        </h2>
        <p className="mt-1 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                placeholder="admin@moneyshelter.in"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
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
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 via-cyan-700 to-teal-700 hover:from-cyan-500 hover:to-teal-600 shadow-md hover:shadow-cyan-600/20 disabled:opacity-50 transition-all"
              >
                {isLoading ? 'Signing In…' : 'Sign In to Portal'}
              </button>
            </div>
          </form>

          {/* Quick Demo Logins for All Roles */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Role-Based Sign-Ins
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@moneyshelter.in')}
                className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 transition-colors text-left flex flex-col"
              >
                <span>👑 Admin</span>
                <span className="text-[10px] font-normal text-slate-400">admin@moneyshelter.in</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('support@moneyshelter.in')}
                className="py-2 px-2.5 bg-amber-50/60 hover:bg-amber-100/70 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 transition-colors text-left flex flex-col"
              >
                <span>🛡️ Support Desk</span>
                <span className="text-[10px] font-normal text-amber-700">support@moneyshelter.in</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('ops@moneyshelter.in')}
                className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 transition-colors text-left flex flex-col"
              >
                <span>⚙️ Operations</span>
                <span className="text-[10px] font-normal text-slate-500">ops@moneyshelter.in</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('rm@moneyshelter.in')}
                className="py-2 px-2.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-900 transition-colors text-left flex flex-col"
              >
                <span>👔 Relationship Mgr</span>
                <span className="text-[10px] font-normal text-indigo-600">rm@moneyshelter.in</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('partner@moneyshelter.in')}
                className="col-span-2 py-2 px-2.5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900 transition-colors text-left flex flex-col"
              >
                <span>🤝 Channel Partner</span>
                <span className="text-[10px] font-normal text-emerald-600">partner@moneyshelter.in</span>
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
            Want to become a Money Shelter partner?{' '}
            <Link
              href="/partner/onboard"
              className="font-bold text-cyan-700 hover:text-cyan-900 transition-colors"
            >
              Onboard & Sign Partner Agreement →
            </Link>
          </p>
        </div>

        {/* Dedicated Lendbridge Capital Partner Portal Link */}
        <div className="mt-3.5 text-center">
          <Link
            href="/lendbridge/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-3.5 py-1.5 rounded-xl shadow-2xs transition"
          >
            <span>🤝</span>
            <span>Lendbridge Capital Partner Portal Login →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
