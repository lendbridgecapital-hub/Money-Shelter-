'use client';

import React from 'react';
import Link from 'next/link';
import { MoneyShelterLogo } from '@/components/MoneyShelterLogo';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        {/* Logo Card */}
        <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-white border border-slate-100 p-2 flex items-center justify-center shadow-lg shadow-cyan-900/5">
          <MoneyShelterLogo variant="dark" size="lg" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
          Official Android APK (v1.0)
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 mb-2 font-sans">
          Money Shelter App
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Real-time loan origination, pipeline tracking, and DSA management app directly connected to Money Shelter Cloud.
        </p>

        {/* Download Button */}
        <a
          href="/Money-Shelter.apk"
          download="Money-Shelter.apk"
          className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:to-cyan-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-xl shadow-emerald-700/20 transition-all transform active:scale-98 text-base mb-6"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
          </svg>
          Download APK (4.89 MB)
        </a>

        {/* Step-by-Step Instructions */}
        <div className="text-left bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 space-y-3">
          <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            📱 Quick Installation Guide:
          </p>
          <div className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">1</span>
            <span>Tap <b>Download APK</b> above. If Chrome warns <i>&quot;File might be harmful&quot;</i>, tap <b>Download anyway</b>.</span>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">2</span>
            <span>Once downloaded, open your phone&apos;s <b>Files</b> or <b>Downloads</b> folder and tap <b>Money-Shelter.apk</b>.</span>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">3</span>
            <span>If prompted <i>&quot;Allow from this source&quot;</i>, tap <b>Settings</b> &rarr; enable <b>Allow</b> &rarr; tap <b>Install</b>.</span>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link href="/" className="hover:text-cyan-700 font-semibold">
            &larr; Back to Website
          </Link>
          <Link href="/login" className="hover:text-cyan-700 font-bold text-cyan-800">
            Partner Portal &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
