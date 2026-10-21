'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LendbridgeDownloadPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-900 to-slate-950 -z-10" />

      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center backdrop-blur-md">
        {/* Lendbridge Logo Card */}
        <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-white border border-slate-700 p-2.5 flex items-center justify-center shadow-xl shadow-blue-950/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lendbridge-emblem.png"
            alt="Lendbridge Capital"
            className="w-16 h-16 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/lendbridge-logo.png';
            }}
          />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30 mb-3">
          Satara Branch Official Mobile App
        </span>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 font-sans">
          Lendbridge Capital
        </h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Dedicated loan origination, pipeline tracking, and partner network application for <strong>Lendbridge Capital (Satara Branch)</strong>.
        </p>

        {/* Primary Download: Android APK */}
        <div className="space-y-3 mb-6">
          <a
            href="/Lendbridge-Capital.apk"
            download="Lendbridge-Capital.apk"
            className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-xl shadow-blue-700/25 transition-all transform active:scale-98 text-sm cursor-pointer"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
            </svg>
            <span>Download Lendbridge APK (v1.0 Native • 4.88 MB)</span>
          </a>

          {/* Optional PWA Instant Install */}
          {isInstallable && !installed && (
            <button
              type="button"
              onClick={handleInstallPwa}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
            >
              <span>📲</span>
              <span>Install Directly on Home Screen (PWA)</span>
            </button>
          )}

          {installed && (
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              ✓ Lendbridge Capital App is installed on this device!
            </div>
          )}
        </div>

        {/* Installation Instructions */}
        <div className="text-left bg-slate-900/60 rounded-2xl p-4 border border-slate-700/60 text-xs text-slate-300 space-y-2.5">
          <p className="font-bold text-white text-xs flex items-center gap-1.5">
            📱 Installation Instructions:
          </p>
          <div className="flex gap-2.5 items-start">
            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">
              1
            </span>
            <span>Tap <b>Download Lendbridge APK</b> above. If your browser asks, tap <b>Download anyway</b>.</span>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">
              2
            </span>
            <span>Open your phone&apos;s <b>Downloads</b> and tap <b>Lendbridge-Capital.apk</b>.</span>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">
              3
            </span>
            <span>Tap <b>Install</b>. Log in using your Satara branch or Lendbridge partner credentials.</span>
          </div>
        </div>

        {/* Desk Contact info */}
        <div className="mt-5 p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 text-[11px] text-slate-400 text-center">
          <span>Lendbridge Capital Desk: </span>
          <a href="tel:9049301089" className="text-white font-bold hover:underline">
            +91 9049301089
          </a>
          <span> • </span>
          <a href="mailto:lendbridgecapital@gmail.com" className="text-blue-400 font-semibold hover:underline">
            lendbridgecapital@gmail.com
          </a>
        </div>

        {/* Bottom Nav Links */}
        <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
          <Link href="/download" className="hover:text-blue-400 transition">
            &larr; Central App
          </Link>
          <Link href="/lendbridge/login" className="hover:text-blue-300 font-bold text-blue-400">
            Satara Partner Login &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
