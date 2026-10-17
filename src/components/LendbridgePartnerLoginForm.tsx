'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { CompanySettings } from '@/types/db';

interface LendbridgePartnerLoginFormProps {
  companySettings?: CompanySettings;
}

export default function LendbridgePartnerLoginForm({ companySettings }: LendbridgePartnerLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyLogo = companySettings?.logoUrl || '/money-shelter-logo.png';
  const companyName = companySettings?.companyName || 'Money Shelter Pvt. Ltd.';

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
        setError('Invalid partner email or password. Please verify your credentials or contact Lendbridge partner desk.');
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

  const handleQuickFillPartner = () => {
    setEmail('partner@moneyshelter.in');
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      {/* Background Subtle Gradient Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-slate-50 via-white to-slate-50/60 -z-10" />

      <div className="max-w-6xl w-full mx-auto">
        {/* Top Header Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Lendbridge Capital Logo */}
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lendbridge-logo.png"
              alt="Lendbridge Capital"
              className="h-10 sm:h-12 w-auto object-contain max-w-[220px]"
              onError={(e) => {
                // Graceful fallback to emblem + wordmark if full logo path changes
                (e.currentTarget as HTMLImageElement).src = '/lendbridge-emblem.png';
              }}
            />
            <div className="hidden md:block pl-3 border-l border-slate-200">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200 inline-block">
                Channel Partner Portal
              </span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                In Strategic Lending Partnership with <strong className="text-slate-800">{companyName}</strong>
              </p>
            </div>
          </div>

          {/* Right: Money Shelter Co-Branded Badge */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Powered by</span>
            <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <Image
                src={companyLogo}
                alt={companyName}
                width={130}
                height={40}
                priority
                className="h-7 w-auto object-contain"
              />
            </div>
          </div>
        </div>

        {/* Main Grid: Left Features + Right Login Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left: Value Proposition for Channel Partners */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                <span>⚡</span>
                <span>Dedicated Channel Partner & DSA Login</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Supercharge Your Loan Business with Lendbridge Capital
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Seamless multi-bank loan sourcing, live 30-minute TAT file tracking, and highest market commission slabs — all on a single unified partner dashboard.
              </p>
            </div>

            {/* 4 Feature Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-xs transition">
                <div className="text-2xl mb-1.5">🏛️</div>
                <h3 className="font-bold text-slate-900 text-sm">50+ Banks & NBFCs</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Direct login access across HDFC, ICICI, SBI, Axis, Kotak, Tata Capital, and Bajaj.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-xs transition">
                <div className="text-2xl mb-1.5">⏱️</div>
                <h3 className="font-bold text-slate-900 text-sm">Real-Time SLA Timers</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  30-min TAT monitor in document buckets with automated SMS & WhatsApp client follow-ups.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-xs transition">
                <div className="text-2xl mb-1.5">💰</div>
                <h3 className="font-bold text-slate-900 text-sm">Highest Commission Slabs</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Transparent commission ledgers and prompt payouts on every disbursed file.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-xs transition">
                <div className="text-2xl mb-1.5">📲</div>
                <h3 className="font-bold text-slate-900 text-sm">Instant Digital Links</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Share co-branded loan application links with borrowers and collect documents instantly.
                </p>
              </div>
            </div>

            {/* Support / Contact Info */}
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
              <span>Partner Desk: <strong className="text-slate-800 font-bold">+91 9049002010</strong></span>
              <span>•</span>
              <span>Email: <strong className="text-slate-800 font-bold">partners@lendbridgecapital.com</strong></span>
            </div>
          </div>

          {/* Right: Partner Login Box */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60">
              {/* Card Header with Lendbridge Logo */}
              <div className="mb-6 flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Partner Sign In</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Access your live loan pipeline, sanctions, and commissions.
                  </p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/lendbridge-emblem.png"
                  alt="LB"
                  className="h-10 w-auto object-contain shrink-0"
                />
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
                  <span className="font-bold text-rose-600 text-sm">✕</span>
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@lendbridgecapital.com"
                    className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-md hover:shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing In…</span>
                      </>
                    ) : (
                      <span>Sign In to Partner Dashboard →</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Quick Fill Button for Testing */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Testing credentials:</span>
                <button
                  type="button"
                  onClick={handleQuickFillPartner}
                  className="text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg transition"
                >
                  Fill Demo Partner Login
                </button>
              </div>

              {/* Partner Onboarding Link */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Not an authorized Lendbridge partner yet?
                </p>
                <Link
                  href="/partner/onboard?partner=lendbridge"
                  className="mt-1.5 inline-block text-xs font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4 transition"
                >
                  Register as a Lendbridge Capital Partner →
                </Link>
              </div>

              {/* HQ Operations Login Switch */}
              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition"
                >
                  Are you Central Ops or HQ Admin? Go to Money Shelter Login →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
