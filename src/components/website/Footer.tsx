'use client';

import React from 'react';
import Link from 'next/link';
import { MoneyShelterLogo } from '@/components/MoneyShelterLogo';

export function Footer() {
  return (
    <footer id="branches" className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800">
      {/* Branch Network Showcase Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">
                GEOGRAPHIC REACH
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-serif mt-1">
                Maharashtra Branch & Corporate Network
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Direct institutional access across urban and regional corridors.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {/* Pune Head Office */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-800/60">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-700 text-white">
                HEAD OFFICE
              </span>
              <div className="font-bold text-white text-sm font-serif mt-2">Pune (HQ)</div>
              <p className="text-slate-400 text-[11px] mt-1">
                Bavdhan & Central Corporate Hub, Pune, Maharashtra - 411021
              </p>
              <div className="mt-2 text-cyan-300 font-medium">+91 20 4000 1100</div>
            </div>

            {/* Nashik Branch */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-700 text-white">
                BRANCH
              </span>
              <div className="font-bold text-white text-sm font-serif mt-2">Nashik</div>
              <p className="text-slate-400 text-[11px] mt-1">
                College Road Commercial Area, Nashik, Maharashtra - 422005
              </p>
              <div className="mt-2 text-cyan-300 font-medium">+91 253 2500 110</div>
            </div>

            {/* Satara Branch */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-700 text-white">
                BRANCH
              </span>
              <div className="font-bold text-white text-sm font-serif mt-2">Satara</div>
              <p className="text-slate-400 text-[11px] mt-1">
                Powai Naka Business Complex, Satara, Maharashtra - 415001
              </p>
              <div className="mt-2 text-cyan-300 font-medium">+91 2162 230 011</div>
            </div>

            {/* Mumbai Planned */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-600 text-white">
                PLANNED
              </span>
              <div className="font-bold text-white text-sm font-serif mt-2">Mumbai</div>
              <p className="text-slate-400 text-[11px] mt-1">
                BKC & Western Suburbs Corporate Syndication Desk
              </p>
              <div className="mt-2 text-amber-300 font-medium">Coming Soon</div>
            </div>

            {/* Kolhapur Planned */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-600 text-white">
                PLANNED
              </span>
              <div className="font-bold text-white text-sm font-serif mt-2">Kolhapur</div>
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
            <MoneyShelterLogo variant="light" size="lg" />
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
            <h4 className="text-white font-bold text-sm font-serif uppercase tracking-wider mb-4">
              Financing
            </h4>
            <ul className="space-y-2.5">
              <li><a href="#capabilities" className="hover:text-cyan-400 transition-colors">Home Loans</a></li>
              <li><a href="#capabilities" className="hover:text-cyan-400 transition-colors">Loan Against Property</a></li>
              <li><a href="#capabilities" className="hover:text-cyan-400 transition-colors">Working Capital (OD/CC)</a></li>
              <li><a href="#capabilities" className="hover:text-cyan-400 transition-colors">Unsecured Business Loans</a></li>
              <li><a href="#builder-apf" className="hover:text-cyan-400 transition-colors">Builder Project Finance</a></li>
              <li><a href="#builder-apf" className="hover:text-cyan-400 transition-colors">Master Site Approvals (APF)</a></li>
              <li><a href="#capabilities" className="hover:text-cyan-400 transition-colors">General & Life Insurance</a></li>
            </ul>
          </div>

          {/* Company & Model */}
          <div>
            <h4 className="text-white font-bold text-sm font-serif uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li><a href="#about" className="hover:text-cyan-400 transition-colors">Company At A Glance</a></li>
              <li><a href="#operating-model" className="hover:text-cyan-400 transition-colors">5-Step Case Journey</a></li>
              <li><a href="#lenders" className="hover:text-cyan-400 transition-colors">Banking Network</a></li>
              <li><a href="#leadership" className="hover:text-cyan-400 transition-colors">Leadership: Sachin Sarode</a></li>
              <li><a href="#calculator" className="hover:text-cyan-400 transition-colors">Loan EMI Calculator</a></li>
              <li><a href="#branches" className="hover:text-cyan-400 transition-colors">Branch Locations</a></li>
            </ul>
          </div>

          {/* Partner & Portal */}
          <div>
            <h4 className="text-white font-bold text-sm font-serif uppercase tracking-wider mb-4">
              Portal Access
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/login" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Partner & Staff Login</span>
                </Link>
              </li>
              <li>
                <Link href="/partner/register" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Become a Channel Partner</span>
                </Link>
              </li>
              <li>
                <a href="#apply" className="hover:text-cyan-400 transition-colors">
                  Submit Loan Application
                </a>
              </li>
              <li>
                <a href="tel:+912040001100" className="hover:text-cyan-400 transition-colors">
                  Support: +91 20 4000 1100
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimers */}
        <div className="mt-14 pt-8 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed">
          <p>
            <strong>Disclaimer:</strong> Money Shelter Pvt. Ltd. acts as an authorized marketing, distribution, and corporate financial syndication partner connecting loan applicants and project developers with RBI-regulated banks, HFCs, and NBFCs. Credit approval, sanction terms, interest rates, and loan disbursal are at the sole discretion of the respective lending institutions. We strictly adhere to standard DSA codes of conduct and do not charge upfront borrower processing fees on behalf of banks.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-slate-400">
            <div>
              © 2014–2026 Money Shelter Pvt. Ltd. All rights reserved. Where Money Meets Trust.
            </div>
            <div className="flex items-center gap-4">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>DSA Ethics</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
