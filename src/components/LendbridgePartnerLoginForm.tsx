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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-600 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl w-full mx-auto">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {/* Lendbridge Logo Monogram */}
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-amber-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center font-black text-amber-400 text-lg tracking-wider">
                LB
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">Lendbridge Capital</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400/10 text-amber-300 border border-amber-400/30">
                  Partner Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                In Strategic Lending Partnership with <strong className="text-slate-200">{companyName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Powered by</span>
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <Image
                src={companyLogo}
                alt={companyName}
                width={120}
                height={35}
                priority
                className="h-6 w-auto object-contain brightness-110"
              />
            </div>
          </div>
        </div>

        {/* Main Grid: Left Features + Right Login Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Value Proposition for Partners */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                <span>⚡</span>
                <span>Dedicated Channel Partner & DSA Login</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Supercharge Your Loan Business with Lendbridge Capital
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Seamless multi-bank loan sourcing, live 30-minute TAT file tracking, and highest market commission slabs — all on a single unified partner dashboard.
              </p>
            </div>

            {/* 4 Feature Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/40 transition">
                <div className="text-xl mb-1.5">🏛️</div>
                <h3 className="font-bold text-white text-sm">50+ Banks & NBFCs</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct login access across HDFC, ICICI, SBI, Axis, Kotak, Tata Capital, and Bajaj.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/40 transition">
                <div className="text-xl mb-1.5">⏱️</div>
                <h3 className="font-bold text-white text-sm">Real-Time SLA Timers</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  30-min TAT monitor in document buckets with automated SMS & WhatsApp client follow-ups.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/40 transition">
                <div className="text-xl mb-1.5">💰</div>
                <h3 className="font-bold text-white text-sm">Highest Commission Slabs</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Transparent commission ledgers and prompt payouts on every disbursed file.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/40 transition">
                <div className="text-xl mb-1.5">📲</div>
                <h3 className="font-bold text-white text-sm">Instant Digital Links</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Share co-branded loan application links with borrowers and collect documents instantly.
                </p>
              </div>
            </div>

            {/* Support / Contact info */}
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span>Partner Desk: <strong className="text-slate-200">+91 9049002010</strong></span>
              <span>•</span>
              <span>Email: <strong className="text-slate-200">partners@lendbridgecapital.com</strong></span>
            </div>
          </div>

          {/* Right: Partner Login Box */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50">
              <div className="mb-6">
                <h2 className="text-xl font-black text-white tracking-tight">Partner Sign In</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Access your active loan pipeline, sanction letters, and commission reports.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2.5">
                  <span className="font-bold text-rose-400 text-sm">✕</span>
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@lendbridgecapital.com"
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition"
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
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Testing credentials:</span>
                <button
                  type="button"
                  onClick={handleQuickFillPartner}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-2.5 py-1 rounded-lg transition"
                >
                  Fill Demo Partner Login
                </button>
              </div>

              {/* Partner Onboarding Link */}
              <div className="mt-6 pt-5 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  Not an authorized Lendbridge partner yet?
                </p>
                <Link
                  href="/partner/onboard?partner=lendbridge"
                  className="mt-1.5 inline-block text-xs font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition"
                >
                  Register as a Lendbridge Capital Partner →
                </Link>
              </div>

              {/* HQ Operations Login Switch */}
              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-400 transition"
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
