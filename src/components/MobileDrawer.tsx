'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import type { Role } from '@/types/db';
import { ROLE_LABELS } from '@/lib/format';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  userId?: string;
  userName: string;
  companyName: string;
  logoUrl?: string | null;
  branchName?: string;
  branchId?: string;
  isDedicatedSiteRm?: boolean;
  isCoBranded?: boolean;
  coBrandName?: string | null;
  coBrandLogoUrl?: string | null;
  coBrandTagline?: string | null;
}

export default function MobileDrawer({
  isOpen,
  onClose,
  role,
  userId,
  userName,
  companyName,
  logoUrl,
  branchName,
  branchId,
  isDedicatedSiteRm = false,
  isCoBranded = false,
  coBrandName = null,
  coBrandLogoUrl = null,
  coBrandTagline = null,
}: MobileDrawerProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  const isAdmin = role === 'ADMIN';
  const isSupport = role === 'CENTRAL_SUPPORT';
  const isOps = role === 'OPERATIONS';
  const isRM = role === 'RELATIONSHIP_MANAGER';
  const isPartner = role === 'CHANNEL_PARTNER';
  const isSubDsa = role === 'SUB_DSA';

  const isSatara = Boolean(
    isCoBranded ||
    branchId === 'br_satara_01' ||
    branchName?.toLowerCase().includes('satara') ||
    coBrandName?.toLowerCase().includes('lendbridge')
  );

  const menuItems = [
    {
      label: 'My Profile & Business Details',
      href: '/profile',
      icon: '👤',
      show: true,
    },
    {
      label: 'Digital Business Card',
      href: userId ? `/card/${userId}` : '/profile',
      icon: '📇',
      show: true,
    },
    {
      label: 'Dashboard Overview',
      href: '/dashboard',
      icon: '📊',
      show: true,
    },
    {
      label: isPartner ? 'My Submitted Files' : isRM ? 'My Portfolio Cases' : 'Loan Case Files',
      href: '/branch/requests',
      icon: '📁',
      show: true,
    },
    {
      label: 'Loan Eligibility Match',
      href: '/ops/eligibility',
      icon: '⚡',
      show: isAdmin || isOps,
    },
    {
      label: isPartner ? 'Apply / Share Form' : 'Generate Customer Link',
      href: '/branch/create-link',
      icon: '🔗',
      show: !isSupport,
    },
    {
      label: isOps ? 'Onboarding Approvals' : 'Partner Approvals',
      href: '/admin/partner-requests',
      icon: '🤝',
      show: isAdmin || isSupport || isOps,
    },
    {
      label: isOps
        ? 'Branch Partners & Network'
        : isSubDsa
        ? 'My Team'
        : isRM
        ? 'My Channel Partners'
        : isSupport
        ? 'Partner Directory'
        : 'Partner Compliance',
      href: '/admin/partners',
      icon: '👥',
      show: isAdmin || isSupport || (isRM && !isDedicatedSiteRm) || isSubDsa || isOps,
    },
    {
      label: isOps
        ? 'Share Branch Onboard Link'
        : isSubDsa
        ? 'Recruit Agents Link'
        : isRM
        ? 'Share Onboarding Link'
        : 'Partner Onboard Form',
      href: isOps && branchId
        ? `/partner/onboard?branchId=${encodeURIComponent(branchId)}`
        : isSubDsa && userId
        ? `/partner/onboard?subDsaId=${userId}${isSatara ? '&branchId=br_satara_01' : ''}`
        : isRM && userId
        ? `/partner/onboard?rmId=${userId}${isSatara ? '&branchId=br_satara_01' : ''}`
        : isSatara
        ? '/partner/onboard?branchId=br_satara_01'
        : '/partner/onboard',
      icon: '🔗',
      show: isAdmin || isSupport || (isRM && !isDedicatedSiteRm) || isSubDsa || isOps,
    },
    {
      label: isPartner ? 'My Approved Certificate' : 'Partner Certificate',
      href: '/partner/certificate',
      icon: '🎓',
      show: isPartner || isSubDsa,
    },
    {
      label: isSubDsa
        ? 'Bank-wise Receivables & CRP'
        : isPartner
        ? 'My Receivables & CRP'
        : 'Rewards & CRP Ledger',
      href: '/admin/rewards',
      icon: '🪙',
      show: !isDedicatedSiteRm,
    },
    {
      label: 'Partner Lending Banks',
      href: '/admin/banks',
      icon: '🏦',
      show: isAdmin,
    },
    {
      label: 'Bank Policy Cards',
      href: '/admin/policy-cards',
      icon: '💳',
      show: isAdmin,
    },
    {
      label: 'Branches & Sites',
      href: '/admin/branches',
      icon: '🏢',
      show: isAdmin || isSupport,
    },
    {
      label: 'User & RM Management',
      href: '/admin/users',
      icon: '👥',
      show: isAdmin,
    },
    {
      label: 'Email / SMTP Config',
      href: '/admin/email-settings',
      icon: '✉️',
      show: isAdmin,
    },
  ].filter((item) => item.show);

  return (
    <div className="fixed inset-0 z-50 flex justify-end md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-slideInRight">
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              {isCoBranded && coBrandName ? (
                coBrandLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coBrandLogoUrl}
                    alt={coBrandName}
                    className="h-7 w-auto object-contain bg-white rounded-lg px-1.5 py-0.5"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                    {coBrandName.charAt(0).toUpperCase()}
                  </div>
                )
              ) : logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={companyName} className="h-6 w-auto object-contain brightness-0 invert" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                  {companyName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-bold text-xs tracking-tight truncate">
                {isCoBranded && coBrandName ? coBrandName : companyName}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition"
            >
              ✕
            </button>
          </div>

          {/* User Card linking to Profile */}
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center justify-between p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-98 transition group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 font-bold flex items-center justify-center text-sm shadow-inner shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-white truncate leading-tight group-hover:text-emerald-300 transition">
                  {userName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {ROLE_LABELS[role] || role}
                  </span>
                  <span className="text-[10px] text-emerald-300 font-semibold">Edit Profile ⚙️</span>
                </div>
              </div>
            </div>
            <span className="text-slate-400 text-xs font-bold">→</span>
          </Link>
        </div>

        {/* Navigation List */}
        <div className="p-3 flex-1 overflow-y-auto divide-y divide-slate-100 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1">
            Application Menu
          </p>
          <div className="space-y-0.5 pt-1">
            {menuItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    active
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 shadow-2xs font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Quick External Onboarding Link */}
          {(isAdmin || isSupport || isRM) && (
            <div className="pt-2 px-1">
              <a
                href={isRM && userId ? `/partner/onboard?rmId=${userId}` : '/partner/onboard'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-100 transition"
              >
                <span>🔗</span>
                <span>Partner Onboard Page ↗</span>
              </a>
            </div>
          )}
        </div>

        {/* Support Help Center */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 text-[11px] text-slate-500">
          <p className="font-bold text-slate-700 mb-1">
            {isCoBranded ? `${coBrandName || 'Lendbridge Capital'} Desk` : 'Need Help & Support?'}
          </p>
          <div className="flex items-center justify-between text-xs">
            <a
              href={isCoBranded ? 'tel:9049301089' : 'tel:9049002010'}
              className="font-bold text-slate-800 hover:text-blue-600 flex items-center gap-1"
            >
              <span>📞</span>
              <span>{isCoBranded ? '+91 9049301089' : '+91 9049002010'}</span>
            </a>
            <a
              href={isCoBranded ? 'mailto:lendbridgecapital@gmail.com' : 'mailto:info@moneyshelter.in'}
              className="text-blue-600 font-semibold hover:underline truncate max-w-[140px]"
            >
              {isCoBranded ? 'lendbridgecapital@gmail.com' : 'info@moneyshelter.in'}
            </a>
          </div>
        </div>

        {/* Footer: Sign Out */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: isCoBranded ? '/lendbridge/login' : '/login' })}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            {isCoBranded ? `${coBrandName || 'Lendbridge Capital'} Partner App v1.0` : `${companyName} Mobile Platform v1.0`}
          </p>
        </div>
      </div>
    </div>
  );
}
