'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        email: identifier.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid mobile number / email or password. Please try again.');
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username / Mobile Number (or Email)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or your email"
                  autoComplete="username"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    /* Eye Off */
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    /* Eye */
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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

        {/* Android App Download Banner */}
        <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50/80 via-teal-50/70 to-cyan-50/80 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📱</span>
            <div>
              <p className="text-xs font-bold text-slate-900">Money Shelter Android App</p>
              <p className="text-[11px] text-slate-500">Official Mobile APK for Partners & RMs</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href="/Money-Shelter.apk"
              download="Money-Shelter.apk"
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-2xs transition whitespace-nowrap"
            >
              Download APK ↓
            </a>
            <Link
              href="/download"
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition whitespace-nowrap"
            >
              Guide
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
