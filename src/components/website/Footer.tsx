'use client';

import React from 'react';
import Link from 'next/link';
import { MoneyShelterLogo } from '@/components/MoneyShelterLogo';

export function Footer() {
  return (
    <footer id="branches" className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      {/* Branch Network Showcase Bar */}
      <div className="border-b border-slate-800 bg-slate-950/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">
                GEOGRAPHIC REACH
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-sans mt-1">
                Maharashtra Branch & Corporate Network
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Direct institutional access across urban and regional corridors.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {/* Pune Head Office */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-800/60 shadow-sm">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-700 text-white">
                HEAD OFFICE
              </span>
              <div className="font-bold text-white text-sm font-sans mt-2">Pune (HQ)</div>
              <p className="text-slate-400 text-[11px] mt-1">
                Bavdhan & Central Corporate Hub, Pune, Maharashtra - 411021
              </p>
              <div className="mt-2 text-cyan-300 font-medium">+91 9049002010</div>
            </div>

            {/* Nashik Branch */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-700 text-white">
                BRANCH
              </span>
              <div className="font-bold text-white text-sm font-sans mt-2">Nashik</div>
              <p className="text-slate-400 text-[11px] mt-1">
                College Road Commercial Area, Nashik, Maharashtra - 422005
              </p>
              <div className="mt-2 text-cyan-300 font-medium">+91 253 2500 110</div>
            </div>

            {/* Satara Branch */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-700 text-white">
                BRANCH
              </span>
              <div className="font-bold text-white text-sm font-sans mt-2">Satara</div>
              <p className="text-slate-400 text-[11px] mt-1">
                Powai Naka Business Complex, Satara, Maharashtra - 415001
              </p>
              <div className="mt-2 text-cyan-300 font-medium">+91 2162 230 011</div>
            </div>

            {/* Mumbai Planned */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-600 text-white">
                PLANNED
              </span>
              <div className="font-bold text-white text-sm font-sans mt-2">Mumbai</div>
              <p className="text-slate-400 text-[11px] mt-1">
                BKC & Western Suburbs Corporate Syndication Desk
              </p>
              <div className="mt-2 text-amber-300 font-medium">Coming Soon</div>
            </div>

            {/* Kolhapur Planned */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-600 text-white">
                PLANNED
              </span>
              <div className="font-bold text-white text-sm font-sans mt-2">Kolhapur</div>
              <p className="text-slate-400 text-[11px] mt-1">
                Regional Commercial & Agriculture Lending Hub
              </p>
              <div className="mt-2 text-amber-300 font-medium">Coming Soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-3 bg-white inline-block rounded-2xl shadow-md border border-slate-200">
              <MoneyShelterLogo variant="dark" size="lg" />
            </div>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm mt-3">
              Money Shelter Pvt. Ltd. connects borrowers, businesses, and builders with premier banks and NBFCs across Maharashtra. Where Money Meets Trust since 2014.
            </p>
            <div className="pt-2 text-slate-500 text-xs">
              <div>CIN: Corporate Entity Registered in Maharashtra</div>
              <div>Authorized Multi-Institutional Financial Intermediary</div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Financing Solutions
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/retail-loans#home-loans" className="hover:text-cyan-400 transition-colors">Home Loans</Link></li>
              <li><Link href="/retail-loans#lap" className="hover:text-cyan-400 transition-colors">Loan Against Property</Link></li>
              <li><Link href="/sme-finance#working-capital" className="hover:text-cyan-400 transition-colors">Working Capital (OD/CC)</Link></li>
              <li><Link href="/sme-finance#business-loans" className="hover:text-cyan-400 transition-colors">Unsecured Business Loans</Link></li>
              <li><Link href="/builder-apf" className="hover:text-cyan-400 transition-colors">Builder Project Finance</Link></li>
              <li><Link href="/builder-apf#apf" className="hover:text-cyan-400 transition-colors">Master Site Approvals (APF)</Link></li>
              <li><Link href="/retail-loans" className="hover:text-cyan-400 transition-colors">All Retail Solutions</Link></li>
            </ul>
          </div>

          {/* Company & Model */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/about-us" className="hover:text-cyan-400 transition-colors">About Money Shelter</Link></li>
              <li><Link href="/about-us#leadership" className="hover:text-cyan-400 transition-colors">Leadership: Sachin Sarode</Link></li>
              <li><Link href="/#operating-model" className="hover:text-cyan-400 transition-colors">5-Step Case Journey</Link></li>
              <li><Link href="/#lenders" className="hover:text-cyan-400 transition-colors">Institutional Network</Link></li>
              <li><Link href="/#calculator" className="hover:text-cyan-400 transition-colors">Loan EMI Calculator</Link></li>
              <li><Link href="/contact" className="hover:text-cyan-400 transition-colors">Branch Locations & Contact</Link></li>
            </ul>
          </div>

          {/* Partner & Portal */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Portal & Apps
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/login" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 font-bold text-cyan-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Money Shelter Portal Login</span>
                </Link>
              </li>
              <li>
                <Link href="/partner/onboard" className="hover:text-amber-400 transition-colors flex items-center gap-1.5 font-semibold text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Become a Channel Partner</span>
                </Link>
              </li>
              <li>
                <a
                  href="/Money-Shelter.apk"
                  download="Money-Shelter.apk"
                  className="hover:text-emerald-300 transition-colors flex items-center gap-1.5 font-bold text-emerald-400"
                  title="Download Money Shelter Android APK"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                  </svg>
                  <span>Download Money Shelter App (APK)</span>
                </a>
              </li>
              <li>
                <a
                  href="/Lendbridge-Capital.apk"
                  download="Lendbridge-Capital.apk"
                  className="hover:text-blue-300 transition-colors flex items-center gap-1.5 font-bold text-blue-400"
                  title="Download Lendbridge Capital Android APK (Satara Branch)"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                  </svg>
                  <span>Download Lendbridge App (Satara APK)</span>
                </a>
              </li>
              <li>
                <a href="#apply" className="hover:text-cyan-400 transition-colors">
                  Submit Loan Application
                </a>
              </li>
              <li>
                <Link href="/partner/onboard" className="hover:text-cyan-400 transition-colors">
                  DSA Sub-Agent Registration
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-500">
          <div>
            &copy; 2014&ndash;2026 Money Shelter Pvt. Ltd. All rights reserved. Where Money Meets Trust.
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            <span>Privacy Policy</span>
            <span>&bull;</span>
            <span>Terms of Service</span>
            <span>&bull;</span>
            <span>Fair Practices Code</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
