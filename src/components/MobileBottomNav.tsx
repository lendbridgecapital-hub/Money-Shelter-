'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/types/db';
import MobileDrawer from './MobileDrawer';

interface Props {
  role: Role;
  userId?: string;
  userName?: string;
  companyName?: string;
  logoUrl?: string | null;
  branchName?: string;
  isDedicatedSiteRm?: boolean;
}

export default function MobileBottomNav({
  role,
  userId,
  userName = 'Operator',
  companyName = 'Quickfinsure',
  logoUrl,
  branchName,
  isDedicatedSiteRm = false,
}: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdmin = role === 'ADMIN';
  const isOps = role === 'OPERATIONS';
  const isRM = role === 'RELATIONSHIP_MANAGER';
  const isPartner = role === 'CHANNEL_PARTNER';
  const isSubDsa = role === 'SUB_DSA';

  const isHomeActive = pathname === '/dashboard';
  const isCasesActive = pathname.startsWith('/branch/requests');
  const isCreateActive = pathname === '/branch/create-link';
  const isPartnerActive = pathname.startsWith('/admin/partners') || pathname.startsWith('/admin/partner-requests');
  const isCertificateActive = pathname === '/partner/certificate';
  const isProfileActive = pathname === '/profile';
  const isEligibilityActive = pathname.startsWith('/ops/eligibility');

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-3 pt-2.5 pb-[max(20px,calc(env(safe-area-inset-bottom,0px)+16px))]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Tab 1: Home */}
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-3 rounded-xl transition active:scale-95 ${
              isHomeActive ? 'text-emerald-600 font-extrabold bg-emerald-50/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg
              className={`w-5 h-5 ${isHomeActive ? 'stroke-emerald-600' : 'stroke-slate-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isHomeActive ? 2.6 : 2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-[11px] font-semibold mt-0.5 tracking-tight">Home</span>
            {isHomeActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />}
          </Link>

          {/* Tab 2: Cases / Pipeline */}
          <Link
            href="/branch/requests"
            className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-3 rounded-xl transition active:scale-95 ${
              isCasesActive ? 'text-emerald-600 font-extrabold bg-emerald-50/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg
              className={`w-5 h-5 ${isCasesActive ? 'stroke-emerald-600' : 'stroke-slate-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isCasesActive ? 2.6 : 2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-[11px] font-semibold mt-0.5 tracking-tight">Cases</span>
            {isCasesActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />}
          </Link>

          {/* Tab 3 (CENTER): Elevated Action Button (+ New Lead) */}
          <Link
            href="/branch/create-link"
            className="flex flex-col items-center justify-center -mt-6 active:scale-95 transition group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/35 border-4 border-white transition-transform group-hover:scale-105">
              <svg className="w-6 h-6 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-slate-800 mt-0.5">New Lead</span>
          </Link>

          {/* Tab 4: Role-specific action */}
          {isPartner ? (
            <Link
              href="/partner/certificate"
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-2.5 rounded-xl transition active:scale-95 ${
                isCertificateActive ? 'text-emerald-600 font-extrabold bg-emerald-50/80' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg
                className={`w-5 h-5 ${isCertificateActive ? 'stroke-emerald-600' : 'stroke-slate-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={isCertificateActive ? 2.6 : 2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span className="text-[11px] font-semibold mt-0.5 tracking-tight">Certificate</span>
              {isCertificateActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />}
            </Link>
          ) : isAdmin || isSubDsa || (isRM && !isDedicatedSiteRm) ? (
            <Link
              href="/admin/partners"
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-2.5 rounded-xl transition active:scale-95 ${
                isPartnerActive ? 'text-emerald-600 font-extrabold bg-emerald-50/80' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg
                className={`w-5 h-5 ${isPartnerActive ? 'stroke-emerald-600' : 'stroke-slate-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={isPartnerActive ? 2.6 : 2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="text-[11px] font-semibold mt-0.5 tracking-tight">
                {isSubDsa ? 'My Team' : 'Partners'}
              </span>
              {isPartnerActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />}
            </Link>
          ) : isOps ? (
            <Link
              href="/ops/eligibility"
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-2.5 rounded-xl transition active:scale-95 ${
                isEligibilityActive ? 'text-emerald-600 font-extrabold bg-emerald-50/80' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="text-base leading-none">⚡</span>
              <span className="text-[11px] font-semibold mt-0.5 tracking-tight">Eligibility</span>
              {isEligibilityActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />}
            </Link>
          ) : (
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-2.5 rounded-xl transition active:scale-95 ${
                isProfileActive ? 'text-emerald-600 font-extrabold bg-emerald-50/80' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg
                className={`w-5 h-5 ${isProfileActive ? 'stroke-emerald-600' : 'stroke-slate-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={isProfileActive ? 2.6 : 2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-[11px] font-semibold mt-0.5 tracking-tight">Profile</span>
              {isProfileActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />}
            </Link>
          )}

          {/* Tab 5: Menu Drawer */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center min-h-[44px] py-1 px-3 rounded-xl text-slate-500 hover:text-slate-800 transition active:scale-95"
          >
            <svg className="w-5 h-5 stroke-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-[11px] font-semibold mt-0.5 tracking-tight">Menu</span>
          </button>
        </div>
      </nav>

      {/* Slide-in Mobile Drawer */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        role={role}
        userId={userId}
        userName={userName}
        companyName={companyName}
        logoUrl={logoUrl}
        branchName={branchName}
        isDedicatedSiteRm={isDedicatedSiteRm}
      />
    </>
  );
}
