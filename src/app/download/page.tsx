'use client';

import React from 'react';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        {/* Logo / Badge */}
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <span className="text-4xl">⚡</span>
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-400 mb-3">
          Android APK Build
        </span>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Quickfinsure App
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Direct real-time mobile app for advisors & operators with dual sync.
        </p>

        {/* Download Button */}
        <a
          href="/Quickfinsure.apk"
          download="Quickfinsure.apk"
          className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl shadow-sky-600/30 transition-all transform active:scale-98 text-base mb-6"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
          </svg>
          Download APK (4.3 MB)
        </a>

        {/* Step-by-Step Instructions */}
        <div className="text-left bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 text-xs text-slate-300 space-y-3">
          <p className="font-semibold text-sky-400 text-sm flex items-center gap-1.5">
            📱 Installation Guide:
          </p>
          <div className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">1</span>
            <span>Tap <b>Download APK</b> above. If Chrome warns <i>"File might be harmful"</i>, tap <b>Download anyway</b>.</span>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">2</span>
            <span>If tapping the notification says <b>"Can't open file"</b>: Open your phone&apos;s <b>Files</b> or <b>Downloads</b> app, find <b>Quickfinsure.apk</b> and tap it.</span>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">3</span>
            <span>If prompted <i>"Allow from this source"</i>, tap <b>Settings</b> &rarr; toggle <b>Allow</b> &rarr; tap <b>Install</b>.</span>
          </div>
        </div>

        <div className="mt-5 text-[11px] text-slate-500">
          Live Cloud Production: <span className="font-mono text-sky-400">https://quicfinsure.onrender.com</span>
        </div>
      </div>
    </div>
  );
}
