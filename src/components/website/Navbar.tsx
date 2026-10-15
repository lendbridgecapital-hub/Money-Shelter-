'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoneyShelterLogo } from '@/components/MoneyShelterLogo';
import { BecomePartnerModal } from './BecomePartnerModal';

interface NavbarProps {
  userSession?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

export function Navbar({ userSession }: NavbarProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnter = (menu: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenDropdown(menu);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 150);
  };

  // Structured Urban Money style navigation groupings
  const loanCategories = [
    {
      title: 'Retail Assets',
      items: [
        { name: 'Home Loans', desc: 'Starting @ 8.35% • Fresh & Resale', href: '/retail-loans#home-loan', tag: 'Popular' },
        { name: 'Loan Against Property', desc: 'Up to ₹25 Cr against property', href: '/retail-loans#lap', tag: 'High Value' },
        { name: 'Personal Loans', desc: 'Instant sanction, zero collateral', href: '/retail-loans#personal-loan' },
        { name: 'Auto & Education Loans', desc: 'Fast approvals with leading rates', href: '/retail-loans#auto-loan' },
      ],
    },
    {
      title: 'Commercial & Corporate',
      items: [
        { name: 'SME Business Loans', desc: 'Working capital & unsecured growth', href: '/sme-finance#business-loan', tag: 'Fast' },
        { name: 'Working Capital (OD / CC)', desc: 'Optimized operational cash flow', href: '/sme-finance#od-cc' },
        { name: 'Project & Structured Finance', desc: 'Consortium & syndication funding', href: '/sme-finance#project-finance' },
        { name: 'Lease Rental Discounting', desc: 'Liquidity against lease cash flows', href: '/sme-finance#lrd' },
      ],
    },
  ];

  const builderOfferings = [
    { name: 'Master Site APF Approvals', desc: 'Pre-sanctioned site code with 20+ partner banks', href: '/builder-apf', badge: 'Flagship' },
    { name: 'Builder Project Finance', desc: 'Construction & greenfield project financing', href: '/builder-apf#construction' },
    { name: 'On-Site Home Loan Desk', desc: 'Turnkey buyer sanction desk at sales gallery', href: '/builder-apf#desk' },
    { name: 'Case Journey Tracker', desc: 'Real-time disbursement milestone updates', href: '/builder-apf#tracker' },
  ];

  const calculatorLinks = [
    { name: 'Home Loan EMI Calculator', desc: 'Calculate monthly outflow & amortization', href: '/#calculator' },
    { name: 'Loan Against Property Calculator', desc: 'Check eligibility on commercial/residential value', href: '/#calculator' },
    { name: 'Business Loan Eligibility Tool', desc: 'Fast eligibility estimate for MSMEs', href: '/#calculator' },
  ];

  const companyLinks = [
    { name: 'About Money Shelter', desc: 'A decade of trust & capital execution since 2014', href: '/about-us' },
    { name: 'Leadership Profile', desc: 'Led by Sachin Sarode (Director • MBA)', href: '/about-us#leadership' },
    { name: 'Maharashtra Footprint', desc: 'Pune HQ, Chinchwad, Baramati, PCMC & Navi Mumbai', href: '/about-us#presence' },
    { name: 'Institutional Network', desc: 'Direct empanelment with 20+ top banks & NBFCs', href: '/about-us#lenders' },
  ];

  return (
    <>
      {/* Top Utility Announcement Bar (Urban Money clean aesthetic - Pure White / Light) */}
      <div className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex justify-between items-center text-[11px] sm:text-xs">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 font-bold border border-cyan-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Pune HQ • Maharashtra
            </span>
            <span className="hidden md:inline text-slate-500 font-medium">
              <strong className="text-slate-900 font-bold">₹2,500+ Cr</strong> Disbursed • <strong className="text-slate-900 font-bold">30,000+</strong> Happy Customers
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            <a
              href="tel:+919049002010"
              className="hover:text-amber-600 transition-colors flex items-center gap-1 font-bold text-slate-800"
            >
              <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 4V3z" />
              </svg>
              <span>+91 9049002010</span>
            </a>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <a
              href="/Money-Shelter.apk"
              download="Money-Shelter.apk"
              className="hover:text-emerald-700 transition-colors flex items-center gap-1 font-bold text-slate-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]"
              title="Download Money Shelter Android App (APK)"
            >
              <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
              </svg>
              <span>Download App (APK)</span>
            </a>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <button
              type="button"
              onClick={() => setIsPartnerModalOpen(true)}
              className="hover:text-emerald-700 font-bold text-slate-700 hidden sm:inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="text-emerald-600 font-black">✦</span>
              <span>Become a Partner</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Clean Modern Navbar (Urban Money Pure White Background) */}
      <header
        className={`sticky top-0 z-50 bg-white transition-all duration-200 border-b ${
          isScrolled ? 'shadow-md border-slate-200/80 py-2.5' : 'border-slate-100 py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo - Crisp & High Contrast */}
          <Link href="/" className="flex items-center group flex-shrink-0">
            <MoneyShelterLogo variant="dark" size="md" />
          </Link>

          {/* Desktop Navigation Links with Clean Dropdowns */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {/* LOANS MEGA DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('loans')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className={`px-3.5 py-2 text-[14px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  openDropdown === 'loans'
                    ? 'text-cyan-700 bg-cyan-50'
                    : 'text-slate-700 hover:text-cyan-700 hover:bg-slate-50'
                }`}
              >
                <span>Loans</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    openDropdown === 'loans' ? 'rotate-180 text-cyan-700' : 'text-slate-400'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {openDropdown === 'loans' && (
                <div className="absolute top-full left-0 w-[580px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 grid grid-cols-2 gap-6 animate-in fade-in-50 slide-in-from-top-2 duration-150 z-50">
                  {loanCategories.map((cat, idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md inline-block">
                        {cat.title}
                      </div>
                      <div className="space-y-1">
                        {cat.items.map((item, i) => (
                          <Link
                            key={i}
                            href={item.href}
                            onClick={() => setOpenDropdown(null)}
                            className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors block group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-800 group-hover:text-cyan-700 transition-colors">
                                {item.name}
                              </span>
                              {item.tag && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                  {item.tag}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BUILDER SOLUTIONS DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('builder')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className={`px-3.5 py-2 text-[14px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  openDropdown === 'builder'
                    ? 'text-cyan-700 bg-cyan-50'
                    : 'text-slate-700 hover:text-cyan-700 hover:bg-slate-50'
                }`}
              >
                <span>Builder APF</span>
                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30 px-1.5 py-0.2 rounded">
                  Specialist
                </span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    openDropdown === 'builder' ? 'rotate-180 text-cyan-700' : 'text-slate-400'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {openDropdown === 'builder' && (
                <div className="absolute top-full left-0 w-[360px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 space-y-1 animate-in fade-in-50 slide-in-from-top-2 duration-150 z-50">
                  <div className="p-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-900 block">Real Estate Developer Suite</span>
                    <span className="text-[11px] text-slate-500">Accelerating project clearances & retail buyer loans</span>
                  </div>
                  {builderOfferings.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.href}
                      onClick={() => setOpenDropdown(null)}
                      className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors block group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800 group-hover:text-cyan-700 transition-colors">
                          {item.name}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* CALCULATORS DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('calculators')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className={`px-3.5 py-2 text-[14px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  openDropdown === 'calculators'
                    ? 'text-cyan-700 bg-cyan-50'
                    : 'text-slate-700 hover:text-cyan-700 hover:bg-slate-50'
                }`}
              >
                <span>Calculators</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    openDropdown === 'calculators' ? 'rotate-180 text-cyan-700' : 'text-slate-400'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {openDropdown === 'calculators' && (
                <div className="absolute top-full left-0 w-[340px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 space-y-1 animate-in fade-in-50 slide-in-from-top-2 duration-150 z-50">
                  {calculatorLinks.map((calc, idx) => (
                    <Link
                      key={idx}
                      href={calc.href}
                      onClick={() => setOpenDropdown(null)}
                      className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors block group"
                    >
                      <div className="text-sm font-bold text-slate-800 group-hover:text-cyan-700 transition-colors">
                        {calc.name}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{calc.desc}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* COMPANY DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('company')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className={`px-3.5 py-2 text-[14px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  openDropdown === 'company'
                    ? 'text-cyan-700 bg-cyan-50'
                    : 'text-slate-700 hover:text-cyan-700 hover:bg-slate-50'
                }`}
              >
                <span>Company</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    openDropdown === 'company' ? 'rotate-180 text-cyan-700' : 'text-slate-400'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {openDropdown === 'company' && (
                <div className="absolute top-full left-0 w-[350px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 space-y-1 animate-in fade-in-50 slide-in-from-top-2 duration-150 z-50">
                  {companyLinks.map((comp, idx) => (
                    <Link
                      key={idx}
                      href={comp.href}
                      onClick={() => setOpenDropdown(null)}
                      className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors block group"
                    >
                      <div className="text-sm font-bold text-slate-800 group-hover:text-cyan-700 transition-colors">
                        {comp.name}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{comp.desc}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* CONTACT LINK */}
            <Link
              href="/contact"
              className="px-3.5 py-2 text-[14px] font-semibold text-slate-700 hover:text-cyan-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Contact Us
            </Link>
          </nav>

          {/* Right High-Conversion Action Buttons (Urban Money Style) */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/#apply"
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-600 via-cyan-700 to-teal-700 hover:from-cyan-500 hover:to-teal-600 rounded-xl shadow-md hover:shadow-cyan-600/25 transition-all transform hover:-translate-y-0.5"
            >
              Apply for Loan
            </Link>

            {userSession ? (
              <Link
                href="/dashboard"
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Dashboard</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-cyan-700 border border-slate-300 hover:border-cyan-600 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Partner Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <Link
                href="/retail-loans"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-bold text-slate-800 hover:bg-cyan-50 hover:text-cyan-700"
              >
                Retail Loans (Home, LAP, Personal)
              </Link>
              <Link
                href="/sme-finance"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-bold text-slate-800 hover:bg-cyan-50 hover:text-cyan-700"
              >
                SME & Business Finance
              </Link>
              <Link
                href="/builder-apf"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-bold text-cyan-800 bg-cyan-50/50"
              >
                Builder APF & Project Solutions
              </Link>
              <Link
                href="/#calculator"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                EMI & Eligibility Calculators
              </Link>
              <Link
                href="/about-us"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                About Money Shelter
              </Link>
              <Link
                href="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Contact & Branches
              </Link>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              {/* Mobile Download APK Button */}
              <a
                href="/Money-Shelter.apk"
                download="Money-Shelter.apk"
                className="w-full text-center py-2.5 text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                </svg>
                <span>Download App (Android APK)</span>
              </a>

              {/* Mobile Become a Partner Button */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsPartnerModalOpen(true);
                }}
                className="w-full text-center py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="text-amber-300 font-black">✦</span>
                <span>Become a Partner (Onboard Form)</span>
              </button>

              <Link
                href="/#apply"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-3 text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-md"
              >
                Apply for Loan
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Partner / Staff Login
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Interactive Channel Partner Compliance Onboarding Modal */}
      <BecomePartnerModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
      />
    </>
  );
}
