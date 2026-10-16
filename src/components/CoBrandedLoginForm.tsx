'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Branch, CompanySettings } from '@/types/db';

interface CoBrandedLoginFormProps {
  branch: Branch;
  companySettings: CompanySettings;
}

export default function CoBrandedLoginForm({ branch, companySettings }: CoBrandedLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = branch.coBrandName || branch.name;
  const companyName = companySettings.companyName || 'Money Shelter';
  const companyLogo = companySettings.logoUrl || '/money-shelter-logo.png';

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
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email address or password. Please verify your credentials or contact your branch administrator.');
        setIsLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred during sign in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        {/* Dual Co-Branding Header */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 inline-flex flex-col items-center max-w-full">
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            {/* 1. Partner Entity / Branch Logo or Badge */}
            {branch.coBrandLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branch.coBrandLogoUrl}
                alt={displayName}
                className="h-10 sm:h-12 w-auto max-w-[150px] object-contain"
              />
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-extrabold text-xs sm:text-sm tracking-tight shadow-2xs">
                🤝 {displayName}
              </div>
            )}

            {/* Partnership Divider */}
            <span className="text-slate-400 font-bold text-xs sm:text-sm">×</span>

            {/* 2. Official Money Shelter Logo */}
            <Image
              src={companyLogo}
              alt={companyName}
              width={160}
              height={55}
              priority
              className="h-9 sm:h-11 w-auto object-contain"
            />
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 w-full text-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] font-bold">
              <span>🤝</span>
              <span>Co-Branded Partner & Employee Desk</span>
            </span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {displayName} Portal
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-600">
          {branch.coBrandTagline || `In strategic loan distribution partnership with ${companyName}`}
        </p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">
          Branch: <strong className="text-slate-700">{branch.name} ({branch.code})</strong> • Single Sign-On for Staff & Channel Partners
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-200 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <span className="shrink-0 font-bold">✕</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee or Partner Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@partner.com or name@branch.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 hover:from-indigo-500 hover:to-slate-800 shadow-md hover:shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In…</span>
                  </>
                ) : (
                  <span>Sign In to {displayName} Desk →</span>
                )}
              </button>
            </div>
          </form>

          {/* Branch Contact / Helpdesk */}
          {(branch.phone || branch.email) && (
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Branch Support Desk
              </p>
              <div className="flex items-center justify-center gap-3 text-xs text-slate-600 flex-wrap">
                {branch.phone && (
                  <span className="flex items-center gap-1">
                    <span>📞</span>
                    <a href={`tel:${branch.phone}`} className="hover:underline font-semibold">{branch.phone}</a>
                  </span>
                )}
                {branch.email && (
                  <span className="flex items-center gap-1">
                    <span>✉️</span>
                    <a href={`mailto:${branch.email}`} className="hover:underline font-semibold">{branch.email}</a>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Partner Onboarding Link */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Not registered as a partner yet?{' '}
              <Link
                href={`/partner/onboard?branch=${encodeURIComponent(branch.code)}`}
                className="font-bold text-indigo-700 hover:text-indigo-900 transition-colors inline-block"
              >
                Register as a Channel Partner →
              </Link>
            </p>
          </div>
        </div>

        {/* Fallback to Standard Money Shelter Login */}
        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition"
          >
            ← Switch to Standard {companyName} Login
          </Link>
        </div>
      </div>
    </div>
  );
}
