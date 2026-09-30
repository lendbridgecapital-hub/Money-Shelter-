'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { Role } from '@/types/db';
import MobileDrawer from './MobileDrawer';

interface MobileAppHeaderProps {
  role: Role;
  userId?: string;
  userName: string;
  companyName: string;
  logoUrl?: string | null;
  branchName?: string;
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/branch/requests/') && pathname !== '/branch/requests') return 'Case Details';
  if (pathname === '/branch/requests') return 'Cases Pipeline';
  if (pathname === '/branch/create-link') return 'New Lead';
  if (pathname === '/profile') return 'My Profile';
  if (pathname === '/partner/certificate') return 'Partner Certificate';
  if (pathname.startsWith('/admin/partners')) return 'Channel Partners';
  if (pathname.startsWith('/admin/banks')) return 'Bank Rules';
  if (pathname.startsWith('/admin/users')) return 'User Management';
  if (pathname.startsWith('/admin/company')) return 'Company Settings';
  if (pathname.startsWith('/admin/tenants')) return 'Tenants';
  if (pathname.startsWith('/admin/branches')) return 'Branches';
  if (pathname.startsWith('/admin/commissions')) return 'Commissions';
  if (pathname.startsWith('/admin/email-settings')) return 'Email Settings';
  if (pathname.startsWith('/admin/partner-requests')) return 'Partner Requests';
  return 'Dashboard';
}

export default function MobileAppHeader({
  role,
  userId,
  userName,
  companyName,
  logoUrl,
  branchName,
}: MobileAppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isHome = pathname === '/dashboard';
  const pageTitle = getPageTitle(pathname);

  function handleSync() {
    setIsSyncing(true);
    router.refresh();
    setTimeout(() => setIsSyncing(false), 800);
  }

  return (
    <>
      <header
        className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 pb-2.5 flex items-center justify-between shadow-2xs"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 32px)',
        }}
      >
        {/* Left Side Navigation */}
        {isHome ? (
          /* Home Screen: Show Brand Logo & Name */
          <div className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={companyName || 'QuickFinSure'}
                className="h-7 max-h-7.5 w-auto max-w-[150px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  {companyName ? companyName.charAt(0).toUpperCase() : 'Q'}
                </div>
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                  {companyName || 'QuickFinSure'}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Sub-Pages & Cases: Prominent HOME & BACK Buttons */
          <div className="flex items-center gap-1.5">
            {/* 1. Dedicated HOME Button */}
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition"
              title="Return to Home Dashboard"
            >
              <svg className="w-4 h-4 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.4}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span>Home</span>
            </Link>

            {/* 2. Direct BACK Button */}
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition border border-slate-200"
              title="Go back to previous screen"
            >
              <svg className="w-3.5 h-3.5 stroke-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          </div>
        )}

        {/* Center: Current Screen Title on sub-pages */}
        {!isHome && (
          <div className="hidden sm:block text-xs font-bold text-slate-700 truncate max-w-[120px]">
            {pageTitle}
          </div>
        )}

        {/* Right Side: Sync Button & Profile Avatar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSync}
            title="Tap to sync with system"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold active:scale-95 transition"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            <span className="text-[10px] text-slate-600">{isSyncing ? 'Syncing…' : 'Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open Mobile Menu"
            className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs active:scale-95 transition ring-2 ring-emerald-100"
          >
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </button>
        </div>
      </header>

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
      />
    </>
  );
}
