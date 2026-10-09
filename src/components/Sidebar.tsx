'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import type { Role } from '@/types/db';
import { ROLE_LABELS } from '@/lib/format';
import NotificationBell from './NotificationBell';

interface SidebarProps {
  role: Role;
  userId?: string;
  companyName: string;
  logoUrl?: string | null;
  userName: string;
  branchName?: string;
  isDedicatedSiteRm?: boolean;
}

export default function Sidebar({
  role,
  userId,
  companyName,
  logoUrl,
  userName,
  branchName,
  isDedicatedSiteRm = false,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapsed state across page navigations in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qfs_sidebar_collapsed');
      if (saved !== null) {
        setCollapsed(saved === 'true');
      } else if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setCollapsed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('qfs_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isAdmin = role === 'ADMIN';
  const isSupport = role === 'CENTRAL_SUPPORT';
  const isOps = role === 'OPERATIONS';
  const isRM = role === 'RELATIONSHIP_MANAGER';
  const isPartner = role === 'CHANNEL_PARTNER';
  const isSubDsa = role === 'SUB_DSA';

  // Partner-related sub-items grouped into the collapsible "Partners" drawer
  const partnerSubItems = [
    {
      label: 'Partner Approvals',
      href: '/admin/partner-requests',
      icon: '🤝',
      description: 'Review requests & assign RMs',
      show: isAdmin || isSupport,
      external: false,
    },
    {
      label: isSubDsa ? 'My Team' : isRM ? 'My Channel Partners' : isSupport ? 'Partner Directory' : 'Partner Compliance',
      href: '/admin/partners',
      icon: '🛡️',
      description: isSubDsa ? 'Mapped agents in your franchise' : 'Active partners & records',
      show: isAdmin || isSupport || (isRM && !isDedicatedSiteRm) || isSubDsa,
      external: false,
    },
    {
      label: isSubDsa
        ? 'Bank-wise Receivables & CRP'
        : isPartner
        ? 'My Receivables & CRP'
        : 'Partner Rewards & CRP',
      href: '/admin/rewards',
      icon: '🪙',
      description: isSubDsa
        ? 'Your franchise & partner payouts bank-wise'
        : isPartner
        ? 'Your bank receivables & commission ledger'
        : '1 CRP = ₹10 commission ledger & redemption',
      show: !isDedicatedSiteRm,
      external: false,
    },
    {
      label: isSubDsa
        ? 'Sub-DSA Certificate'
        : isPartner
        ? 'My Certificate'
        : 'Certificate of Association',
      href: '/partner/certificate',
      icon: '🎓',
      description: 'Official partner certificate',
      show: isPartner || isSubDsa,
      external: false,
    },
    {
      label: isSubDsa ? 'Recruit Agents Link' : isRM ? 'Share Onboarding Link' : 'Public Onboard Link',
      href: isSubDsa && userId
        ? `/partner/onboard?subDsaId=${userId}`
        : isRM && userId
        ? `/partner/onboard?rmId=${userId}`
        : '/partner/onboard',
      icon: '🔗',
      description: isSubDsa
        ? 'Invite agents under your Sub-DSA network'
        : isRM
        ? 'Auto-assigns partners to your RM portfolio'
        : 'External partner onboard form',
      show: isAdmin || isSupport || (isRM && !isDedicatedSiteRm) || isSubDsa,
      external: true,
    },
  ].filter((item) => item.show);

  // Check if current route is within Partners section
  const isPartnerActive = partnerSubItems.some(
    (sub) => !sub.external && (pathname === sub.href || (sub.href !== '/dashboard' && pathname.startsWith(sub.href)))
  );

  // Sub-drawer open/close state
  const [partnersOpen, setPartnersOpen] = useState(isPartnerActive);

  // Keep open when navigating into any partner route
  useEffect(() => {
    if (isPartnerActive) {
      setPartnersOpen(true);
    }
  }, [isPartnerActive]);

  // Handle clicking on Partners accordion parent
  const handlePartnersClick = () => {
    if (collapsed) {
      setCollapsed(false);
      setPartnersOpen(true);
      try {
        localStorage.setItem('qfs_sidebar_collapsed', 'false');
      } catch {
        // ignore
      }
    } else {
      setPartnersOpen((prev) => !prev);
    }
  };

  // Core operational items before Partners
  const primaryNavItems = [
    {
      label: 'Performance Overview',
      href: '/dashboard',
      icon: '📊',
      show: true,
    },
    {
      label: isPartner || isSubDsa ? 'My Leads & Pipeline' : isOps ? 'Loan Pipeline' : 'Loan Requests',
      href: '/branch/requests',
      icon: '📋',
      show: true,
    },
    {
      label: 'My Team',
      href: '/admin/partners',
      icon: '👥',
      show: isSubDsa,
    },
    {
      label: 'Loan Eligibility Match',
      href: '/ops/eligibility',
      icon: '⚡',
      show: isAdmin || isOps,
    },
    {
      label: 'Create Custom Link',
      href: '/branch/create-link',
      icon: '🔗',
      show: !isSupport,
    },
  ];

  // Secondary operational items after Partners
  const secondaryNavItems = [
    {
      label: isPartner || isSubDsa ? 'Bank Products & Rates' : 'Partner Banks & Products',
      href: '/admin/banks',
      icon: '🏦',
      show: isAdmin,
    },
  ];

  // Role-specific operational & management links
  const managementItems = [
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
      label: 'Team & Staff Users',
      href: '/admin/users',
      icon: '👥',
      show: isAdmin || isSupport,
    },
    {
      label: 'Company Setup',
      href: '/admin/company',
      icon: '🎨',
      show: isAdmin,
    },
    {
      label: 'White-Label Tenants',
      href: '/admin/tenants',
      icon: '🌐',
      show: isAdmin,
    },
    {
      label: 'Email / SMTP Config',
      href: '/admin/email-settings',
      icon: '✉️',
      show: isAdmin,
    },
  ];

  const visibleManagementItems = managementItems.filter((i) => i.show);

  return (
    <aside
      className={`h-screen sticky top-0 bg-white border-r border-slate-200/90 hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out z-20 overflow-hidden shadow-2xs ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`px-2.5 py-2 border-b border-slate-100 flex items-center justify-between transition-all ${
          collapsed ? 'flex-col gap-2 justify-center py-2' : 'gap-2'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={companyName}
              className={`h-7.5 max-h-8 object-contain transition-all ${
                collapsed ? 'w-6 max-h-7 mx-auto' : 'w-auto max-w-[165px]'
              }`}
            />
          ) : (
            <>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-2xs shrink-0"
                style={{ backgroundColor: 'var(--color-primary, #16a34a)' }}
                title={companyName}
              >
                {companyName ? companyName.charAt(0).toUpperCase() : 'Q'}
              </div>

              {/* Only show written company name & role when NO custom logo is uploaded */}
              {!collapsed && (
                <div className="overflow-hidden min-w-0">
                  <h2 className="font-bold text-slate-900 text-xs truncate leading-tight">{companyName}</h2>
                  <span className="block text-[10px] font-medium text-slate-400 truncate leading-none mt-0.5">
                    {ROLE_LABELS[role] || 'Loan Desk'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions: Notification Bell & Collapse Toggle */}
        <div className="flex items-center gap-0.5 shrink-0">
          <NotificationBell align="left" />
          <button
            type="button"
            onClick={toggleCollapse}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            {collapsed ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-1.5 py-2 flex-1 space-y-3 overflow-y-auto scrollbar-none">
        <div>
          {!collapsed ? (
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
              {isPartner ? 'Partner Desk' : 'Loan Operations'}
            </p>
          ) : (
            <div className="h-px bg-slate-100 mx-1 mb-1.5" />
          )}
          <ul className="space-y-0.5">
            {/* Primary Nav Items */}
            {primaryNavItems
              .filter((i) => i.show)
              .map((item) => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg text-xs transition-all ${
                        collapsed
                          ? 'justify-center p-2'
                          : 'gap-2 px-2.5 py-1.5'
                      } ${
                        active
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <span className="text-xs shrink-0 w-4 h-4 flex items-center justify-center">{item.icon}</span>
                      {!collapsed && <span className="truncate leading-none">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}

            {/* Collapsible Partners Drawer */}
            {partnerSubItems.length > 0 && (
              <li>
                <button
                  type="button"
                  onClick={handlePartnersClick}
                  title={collapsed ? 'Partners (click to open)' : undefined}
                  className={`w-full flex items-center rounded-lg text-xs transition-all ${
                    collapsed
                      ? 'justify-center p-2'
                      : 'justify-between px-2.5 py-1.5'
                  } ${
                    isPartnerActive
                      ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/90 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden min-w-0">
                    <span className="text-xs shrink-0 w-4 h-4 flex items-center justify-center">🤝</span>
                    {!collapsed && <span className="truncate leading-none">Partners</span>}
                  </div>

                  {!collapsed && (
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.2 font-semibold">
                        {partnerSubItems.length}
                      </span>
                      <svg
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          partnersOpen ? 'rotate-90 text-emerald-600' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Sub-drawer items */}
                {!collapsed && (
                  <div
                    className={`transition-all duration-200 ease-in-out overflow-hidden ${
                      partnersOpen ? 'max-h-72 opacity-100 mt-1 mb-1' : 'max-h-0 opacity-0 pointer-events-none'
                    }`}
                  >
                    <ul className="ml-3 pl-2.5 border-l-2 border-emerald-100 space-y-0.5">
                      {partnerSubItems.map((subItem) => {
                        const active =
                          !subItem.external &&
                          (pathname === subItem.href || (subItem.href !== '/dashboard' && pathname.startsWith(subItem.href)));

                        return (
                          <li key={subItem.href}>
                            {subItem.external ? (
                              <a
                                href={subItem.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={subItem.description}
                                className="flex items-center justify-between gap-1 px-2 py-1 rounded-md text-[11px] text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/70 font-medium transition-colors group"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs shrink-0">{subItem.icon}</span>
                                  <span className="truncate">{subItem.label}</span>
                                </div>
                                <svg
                                  className="w-2.5 h-2.5 text-slate-400 group-hover:text-emerald-600 shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            ) : (
                              <Link
                                href={subItem.href}
                                title={subItem.description}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all ${
                                  active
                                    ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                                }`}
                              >
                                <span className="text-xs shrink-0">{subItem.icon}</span>
                                <span className="truncate">{subItem.label}</span>
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            )}

            {/* Secondary Nav Items (Banks & Products) */}
            {secondaryNavItems
              .filter((i) => i.show)
              .map((item) => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg text-xs transition-all ${
                        collapsed
                          ? 'justify-center p-2'
                          : 'gap-2 px-2.5 py-1.5'
                      } ${
                        active
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <span className="text-xs shrink-0 w-4 h-4 flex items-center justify-center">{item.icon}</span>
                      {!collapsed && <span className="truncate leading-none">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>

        {visibleManagementItems.length > 0 && (
          <div>
            {!collapsed ? (
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                {isAdmin ? 'System Administration' : 'Management'}
              </p>
            ) : (
              <div className="h-px bg-slate-100 mx-1 mb-1.5" />
            )}
            <ul className="space-y-0.5">
              {visibleManagementItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg text-xs transition-all ${
                        collapsed
                          ? 'justify-center p-2'
                          : 'gap-2 px-2.5 py-1.5'
                      } ${
                        active
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <span className="text-xs shrink-0 w-4 h-4 flex items-center justify-center">{item.icon}</span>
                      {!collapsed && <span className="truncate leading-none">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* User Footer & Logout */}
      <div className={`px-2.5 py-2 border-t border-slate-100 bg-slate-50/60 ${collapsed ? 'text-center' : ''}`}>
        {!collapsed ? (
          <div className="flex items-center justify-between gap-1.5">
            <div className="overflow-hidden min-w-0 pr-1">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">
                {branchName || 'Head Office'} · <span className="font-semibold text-slate-700">{ROLE_LABELS[role] || role}</span>
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center"
              title={`${userName} (${ROLE_LABELS[role] || role})`}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
