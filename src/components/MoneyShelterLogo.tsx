import React from 'react';

interface MoneyShelterLogoProps {
  variant?: 'dark' | 'light' | 'colored';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function MoneyShelterLogo({
  variant = 'dark',
  className = '',
  size = 'md',
}: MoneyShelterLogoProps) {
  const isLight = variant === 'light';

  // Sizing definitions for high-definition rendering
  const dimensions = {
    sm: { icon: 'w-9 h-9', textMain: 'text-lg', subText: 'text-[9px]', badge: 'text-[8px] px-1.5 py-0.5' },
    md: { icon: 'w-11 h-11', textMain: 'text-xl sm:text-2xl', subText: 'text-[10px]', badge: 'text-[9px] px-2 py-0.5' },
    lg: { icon: 'w-14 h-14', textMain: 'text-2xl sm:text-3xl', subText: 'text-xs', badge: 'text-[10px] px-2.5 py-1' },
    xl: { icon: 'w-16 h-16', textMain: 'text-3xl sm:text-4xl', subText: 'text-sm', badge: 'text-xs px-3 py-1' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* High-visibility Brand Emblem: Premium Indigo/Navy Shield + Gold Roof Shelter + Glowing ₹ Rupee Symbol */}
      <div className={`relative flex-shrink-0 ${dimensions.icon} rounded-xl shadow-md flex items-center justify-center p-1.5 transition-transform hover:scale-105 duration-200 ${
        isLight
          ? 'bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 shadow-slate-950/40'
          : 'bg-gradient-to-br from-[#0c1a30] via-[#0f294d] to-[#0a4d68] border border-cyan-800/40 shadow-cyan-900/20'
      }`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
        >
          <defs>
            <linearGradient id="msGoldRidge" x1="10" y1="15" x2="90" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
            <linearGradient id="msRupeeGradient" x1="30" y1="40" x2="70" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
            <filter id="msGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#F59E0B" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Roof Ridge - Shelter Canopy */}
          <path
            d="M 50 12 L 88 42 L 80 48 L 50 24 L 20 48 L 12 42 Z"
            fill="url(#msGoldRidge)"
            filter="url(#msGlow)"
          />
          {/* Top Overhang Peak Accent */}
          <circle cx="50" cy="12" r="3.5" fill="#FEF08A" />

          {/* Sturdy Pillars / Framing */}
          <line x1="22" y1="48" x2="22" y2="82" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <line x1="78" y1="48" x2="78" y2="82" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" opacity="0.8" />

          {/* Base Foundation Beam */}
          <path
            d="M 16 83 L 84 83"
            stroke="url(#msGoldRidge)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Bold Central Indian Rupee (₹) Symbol */}
          {/* Bar 1 */}
          <rect x="36" y="38" width="28" height="4" rx="2" fill="#FFFFFF" />
          {/* Bar 2 */}
          <rect x="36" y="46" width="24" height="3.5" rx="1.75" fill="#FFFFFF" />
          {/* Loop & Stem */}
          <path
            d="M 44 38 L 44 68 M 44 46 C 56 46 60 56 48 61 L 63 76"
            stroke="url(#msRupeeGradient)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black tracking-tight font-sans ${dimensions.textMain} ${
              isLight ? 'text-white' : 'text-slate-900'
            }`}
          >
            Money<span className="text-cyan-600 font-extrabold">Shelter</span>
          </span>
          <span
            className={`font-bold uppercase tracking-wider rounded-md font-sans ${dimensions.badge} ${
              isLight
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                : 'bg-amber-500/15 text-amber-800 border border-amber-500/30'
            }`}
          >
            Pvt Ltd
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`font-bold tracking-[0.14em] uppercase ${dimensions.subText} ${
              isLight ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Where Money Meets Trust
          </span>
          <span className="w-1 h-1 rounded-full bg-amber-500 hidden sm:inline-block"></span>
          <span className={`text-[9px] font-semibold tracking-wide hidden sm:inline-block ${
            isLight ? 'text-cyan-400' : 'text-cyan-700'
          }`}>
            Est. 2014
          </span>
        </div>
      </div>
    </div>
  );
}
