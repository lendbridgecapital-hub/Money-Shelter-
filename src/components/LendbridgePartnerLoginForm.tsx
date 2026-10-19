'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { CompanySettings } from '@/types/db';

interface LendbridgePartnerLoginFormProps {
  companySettings?: CompanySettings;
}

export default function LendbridgePartnerLoginForm({}: LendbridgePartnerLoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect if already signed in
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
        setError('Invalid mobile number / email or password. Please verify your credentials or contact Lendbridge partner desk.');
        setIsLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected network error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Official Lendbridge Capital Logo */}
        <div className="inline-block mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lendbridge-logo.png"
            alt="Lendbridge Capital — Satara Branch"
            className="mx-auto h-20 sm:h-24 w-auto object-contain max-w-[280px]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/lendbridge-emblem.png';
            }}
          />
        </div>

        <h2 className="mt-2 text-center text-2xl font-black text-slate-900 tracking-tight">
          Lendbridge Capital Portal Login
        </h2>
        <p className="mt-1 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Satara Branch Loan Origination &amp; Partner Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-100 sm:rounded-2xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <span className="shrink-0 font-bold">✕</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username / Mobile Number (or Email)
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 9876543210 or partner@lendbridgecapital.com"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
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
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-md hover:shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In…</span>
                  </>
                ) : (
                  <span>Sign In to Portal</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Partner Onboarding Link */}
        <div className="mt-5 text-center">
          <p className="text-xs text-slate-500">
            Want to become a Lendbridge Capital partner?{' '}
            <Link
              href="/lendbridge/onboard"
              className="font-bold text-blue-700 hover:text-blue-900 transition-colors"
            >
              Onboard &amp; Sign Partner Agreement →
            </Link>
          </p>
        </div>

        {/* Contact Info Footer for Satara Branch */}
        <div className="mt-4 pt-3 border-t border-slate-200/70 max-w-sm mx-auto text-center flex items-center justify-center gap-4 text-xs font-medium text-slate-500">
          <a
            href="tel:9049301089"
            className="hover:text-blue-600 transition flex items-center gap-1 font-semibold text-slate-700"
          >
            <span>📞</span>
            <span>+91 9049301089</span>
          </a>
          <span className="text-slate-300">•</span>
          <a
            href="mailto:lendbridgecapital@gmail.com"
            className="hover:text-blue-600 transition flex items-center gap-1 font-semibold text-slate-700"
          >
            <span>✉️</span>
            <span>lendbridgecapital@gmail.com</span>
          </a>
        </div>
      </div>
    </div>
  );
}
