'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoneyShelterLogo } from '@/components/MoneyShelterLogo';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Retail Loans', href: '/retail-loans' },
    { label: 'SME Finance', href: '/sme-finance' },
    { label: 'Builder APF', href: '/builder-apf' },
    { label: 'About Us', href: '/about-us' },
    { label: 'Contact', href: '/contact' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Top Corporate Strip */}
      <div className="bg-slate-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
              Est. 2014 • Pune, Maharashtra
            </span>
            <span className="hidden md:inline text-slate-400">
              ₹2,500+ Cr Cumulative Disbursements • 30,000+ Customers Served
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="tel:+912040001100"
              className="hover:text-amber-400 transition-colors flex items-center gap-1 font-medium"
            >
              <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 4V3z" />
              </svg>
              <span>+91 20 4000 1100</span>
            </a>
            <span className="hidden sm:inline text-slate-700">|</span>
            <a
              href="mailto:info@moneyshelter.in"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1 font-medium"
            >
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span>info@moneyshelter.in</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Sticky Navbar */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-slate-950/95 backdrop-blur-md shadow-xl border-b border-cyan-900/40 py-2.5'
            : 'bg-slate-950 border-b border-slate-800 py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo with Light variant for Dark Theme Navbar */}
          <Link href="/" className="flex items-center group">
            <MoneyShelterLogo variant="light" size="md" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-[14px] font-semibold text-slate-300">
            {navLinks.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`py-1.5 transition-all relative ${
                    active
                      ? 'text-amber-400 font-bold after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-amber-400'
                      : 'hover:text-cyan-300 after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-cyan-400 after:transition-all'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/#calculator"
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
            >
              EMI Calculator
            </Link>

            <Link
              href="/contact"
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-lg shadow-md hover:shadow-amber-500/20 transition-all transform active:scale-95"
            >
              Apply Online
            </Link>

            {userSession ? (
              <Link
                href="/dashboard"
                className="px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Dashboard</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 py-2 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-800/80 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Portal Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
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

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-200 text-white">
            <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
              {navLinks.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-3 py-2.5 rounded-lg transition-colors ${
                      active
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2.5">
              <Link
                href="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm"
              >
                Apply Online
              </Link>
              <Link
                href="/#calculator"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
              >
                EMI Calculator
              </Link>
              {userSession ? (
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold text-slate-200 bg-slate-800 rounded-lg border border-slate-700"
                >
                  Go to Portal Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-800/80 rounded-lg"
                >
                  Partner / Staff Login
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
