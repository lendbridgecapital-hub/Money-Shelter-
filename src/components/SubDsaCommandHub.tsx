'use client';

import React, { useState } from 'react';
import type { User } from '@/types/db';

interface Props {
  user: User;
  mappedAgents?: User[];
  earnings?: {
    directEarnings: number;
    overrideEarnings: number;
    totalEarnings: number;
    pendingEarnings: number;
    directDisbursed: number;
    teamDisbursed: number;
    totalDisbursed: number;
    directCount: number;
    overrideCount: number;
  };
}

export default function SubDsaCommandHub({ user }: Props) {
  // Only open when a tab is clicked by the partner
  const [activeTab, setActiveTab] = useState<'BUILD_TEAM' | 'BUILD_BUSINESS' | null>(null);
  const [copiedAgentLink, setCopiedAgentLink] = useState(false);
  const [copiedCustomerLink, setCopiedCustomerLink] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const agentReferralLink = `${origin}/partner/onboard?subDsaId=${user.id}&code=${user.partnerCode || ''}`;
  const directCustomerLink = `${origin}/apply?ref=${user.partnerCode || user.id}`;

  const copyAgentLink = () => {
    navigator.clipboard.writeText(agentReferralLink);
    setCopiedAgentLink(true);
    setTimeout(() => setCopiedAgentLink(false), 2500);
  };

  const copyCustomerLink = () => {
    navigator.clipboard.writeText(directCustomerLink);
    setCopiedCustomerLink(true);
    setTimeout(() => setCopiedCustomerLink(false), 2500);
  };

  const shareAgentLinkWhatsApp = () => {
    const text = encodeURIComponent(
      `Hi! Join my agency network at Quickfinsure as an authorized Channel Partner (Agent). Submit retail loans digitally, get instant bank approvals, and earn top commission slabs on every disbursement. Register directly using my link: ${agentReferralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareCustomerLinkWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello! Need a Personal, Home, or Business Loan with lowest interest rates and fast approval? Apply securely online through Quickfinsure here: ${directCustomerLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const toggleTab = (tab: 'BUILD_TEAM' | 'BUILD_BUSINESS') => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs space-y-2">
      {/* Referral Links Tab Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🔗</span>
          <div>
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
              Referral Links
            </span>
            <span className="hidden sm:inline text-[10px] text-slate-400 ml-1.5 font-normal">
              (Select tab to generate & share link)
            </span>
          </div>
        </div>

        {/* The two clean tabs: Build Team | Build Business */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleTab('BUILD_TEAM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
              activeTab === 'BUILD_TEAM'
                ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-500'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70'
            }`}
          >
            <span>👥</span>
            <span>Build Team</span>
            {activeTab === 'BUILD_TEAM' && <span className="text-[10px] opacity-80">▲</span>}
          </button>

          <button
            type="button"
            onClick={() => toggleTab('BUILD_BUSINESS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
              activeTab === 'BUILD_BUSINESS'
                ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/70'
            }`}
          >
            <span>💼</span>
            <span>Build Business</span>
            {activeTab === 'BUILD_BUSINESS' && <span className="text-[10px] opacity-80">▲</span>}
          </button>
        </div>
      </div>

      {/* When Build Team is clicked: Agent Referral & Onboarding Card opens */}
      {activeTab === 'BUILD_TEAM' && (
        <div className="p-3 bg-gradient-to-br from-indigo-50/60 to-white border-2 border-indigo-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-indigo-900">
                  Agent Referral & Onboarding Link
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                  0.1% Team Override
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Share with agents. Anyone registering maps under your Sub-DSA code ({user.partnerCode || 'QFS-SUB'}).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={agentReferralLink}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-indigo-200 rounded-lg text-slate-800 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={copyAgentLink}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition active:scale-95"
              >
                {copiedAgentLink ? '✓ Copied' : '📋 Copy'}
              </button>
              <button
                type="button"
                onClick={shareAgentLinkWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1 active:scale-95"
              >
                <span>WhatsApp</span>
              </button>
              <a
                href={agentReferralLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-0.5"
              >
                <span>Preview</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* When Build Business is clicked: Customer Loan Application Card opens */}
      {activeTab === 'BUILD_BUSINESS' && (
        <div className="p-3 bg-gradient-to-br from-emerald-50/60 to-white border-2 border-emerald-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-emerald-950">
                  Customer Loan Application Link
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                  Full Commission Payout
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Share directly with borrowers. Direct cases earn full commission with zero override deductions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={directCustomerLink}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-emerald-200 rounded-lg text-slate-800 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={copyCustomerLink}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition active:scale-95"
              >
                {copiedCustomerLink ? '✓ Copied' : '📋 Copy'}
              </button>
              <button
                type="button"
                onClick={shareCustomerLinkWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1 active:scale-95"
              >
                <span>WhatsApp</span>
              </button>
              <a
                href={directCustomerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-0.5"
              >
                <span>Preview</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
