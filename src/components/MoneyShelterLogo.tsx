import React from 'react';

interface MoneyShelterLogoProps {
  variant?: 'full' | 'compact' | 'light';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function MoneyShelterLogo({
  variant = 'full',
  className = '',
  size = 'md',
}: MoneyShelterLogoProps) {
  const isLight = variant === 'light';
  const isCompact = variant === 'compact';

  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-20',
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Roof Gable + Rupee Icon Emblem */}
      <div className={`relative flex-shrink-0 ${sizeClasses} aspect-[1.15/1]`}>
        <svg
          viewBox="0 0 120 105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          <defs>
            <linearGradient id="goldRoofGrad" x1="10" y1="10" x2="110" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EAB308" />
              <stop offset="50%" stopColor="#CA8A04" />
              <stop offset="100%" stopColor="#A16207" />
            </linearGradient>
            <linearGradient id="rupeeGrad" x1="45" y1="35" x2="75" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>

          {/* Roof Ridge Silhouette */}
          <path
            d="M 60 8 L 112 48 L 102 56 L 60 24 L 18 56 L 8 48 Z"
            fill="url(#goldRoofGrad)"
          />
          {/* Outer Shelter Canopy Line */}
          <path
            d="M 60 2 L 118 46 L 114 51 L 60 10 L 6 51 L 2 46 Z"
            fill="#D97706"
            opacity="0.8"
          />
          {/* Chimney / Pillar Accent */}
          <rect x="88" y="16" width="9" height="18" fill="url(#goldRoofGrad)" rx="1.5" />
          
          {/* Base Horizontal Threshold */}
          <path
            d="M 24 72 L 96 72 L 92 76 L 28 76 Z"
            fill="url(#goldRoofGrad)"
            opacity="0.85"
          />

          {/* Indian Rupee Symbol (₹) inside shelter */}
          {/* Top Bar 1 */}
          <rect x="42" y="32" width="36" height="4.5" rx="1.5" fill="url(#rupeeGrad)" />
          {/* Top Bar 2 */}
          <rect x="42" y="41" width="30" height="4" rx="1.5" fill="url(#rupeeGrad)" />
          {/* Stem */}
          <path
            d="M 52 32 L 52 62 M 52 41 C 65 41 68 53 54 57 L 72 73"
            stroke="url(#rupeeGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Typography */}
      {!isCompact && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-black tracking-tight text-lg sm:text-xl md:text-2xl font-serif ${
                isLight ? 'text-white' : 'text-slate-900'
              }`}
            >
              Money Shelter
            </span>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-0.5">
            <span
              className={`text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase ${
                isLight ? 'text-cyan-300' : 'text-cyan-700'
              }`}
            >
              PVT. LTD.
            </span>
            <span
              className={`text-[7.5px] sm:text-[8.5px] font-semibold tracking-[0.16em] uppercase ${
                isLight ? 'text-amber-300' : 'text-amber-700'
              }`}
            >
              WHERE MONEY MEETS TRUST
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
