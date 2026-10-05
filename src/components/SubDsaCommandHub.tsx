'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { User } from '@/types/db';
import { formatCurrencyINR, formatDate } from '@/lib/format';

interface Props {
  user: User;
  mappedAgents: User[];
  earnings: {
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

export default function SubDsaCommandHub({
  user,
  mappedAgents,
  earnings,
}: Props) {
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

  return (
    <div className="space-y-4">
      {/* Sub-DSA Master Identity Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/90 text-white font-black text-xl flex items-center justify-center shadow-md border border-indigo-400/40 shrink-0">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-400/30">
                  Sub-DSA Franchise Network
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  Code: {user.partnerCode || 'QFS-SUB'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                {user.name}&apos;s Sub-DSA Command Hub
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage your agent network, earn override commissions on team loans, and originate direct clients.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Link
              href="/admin/commissions"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition shadow-2xs"
            >
              📊 Full Ledger
            </Link>
            <Link
              href="/partner/certificate"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-md"
            >
              🎓 Certificate
            </Link>
          </div>
        </div>
      </div>

      {/* Dual Referral Link Generator Card (Recruit Agents vs Direct Customer) */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Card 1: Recruit Agents Link */}
        <div className="bg-white border-2 border-indigo-300 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                👥 Team Business • Override Engine
              </span>
              <span className="text-[11px] font-bold text-indigo-600">
                Earn 0.1% Override
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Agent Referral & Onboarding Link
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Share this link with potential agents. Anyone signing up is automatically mapped under your Sub-DSA franchise.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={agentReferralLink}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={copyAgentLink}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition whitespace-nowrap"
              >
                {copiedAgentLink ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <a
                href={agentReferralLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Preview Agent Form</span>
                <span>↗</span>
              </a>
              <button
                type="button"
                onClick={shareAgentLinkWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1"
              >
                <span>Share via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Direct Customer Link */}
        <div className="bg-white border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                👤 Direct Business • 100% Payout
              </span>
              <span className="text-[11px] font-bold text-emerald-700">
                Earn Full Partner Rate (e.g. 1.5%)
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Customer Loan Application Link
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Share directly with borrowers. You act as the primary agent, earning full commissions with zero deduction above you.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={directCustomerLink}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={copyCustomerLink}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition whitespace-nowrap"
              >
                {copiedCustomerLink ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <a
                href={directCustomerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
              >
                <span>Preview Customer Form</span>
                <span>↗</span>
              </a>
              <button
                type="button"
                onClick={shareCustomerLinkWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1"
              >
                <span>Share via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Tier Earnings Breakdown Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Direct Business Earnings
          </p>
          <p className="text-xl font-black text-emerald-600 mt-1">
            {formatCurrencyINR(earnings.directEarnings)}
          </p>
          <span className="text-[10px] text-slate-500 font-medium">
            {earnings.directCount} direct loan{earnings.directCount === 1 ? '' : 's'} closed
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Team Override Earnings
          </p>
          <p className="text-xl font-black text-indigo-600 mt-1">
            {formatCurrencyINR(earnings.overrideEarnings)}
          </p>
          <span className="text-[10px] text-indigo-600 font-medium">
            {earnings.overrideCount} override{earnings.overrideCount === 1 ? '' : 's'} from {mappedAgents.length} agents
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Total Combined Income
          </p>
          <p className="text-xl font-black text-slate-900 mt-1">
            {formatCurrencyINR(earnings.totalEarnings)}
          </p>
          <span className="text-[10px] text-emerald-700 font-bold">
            All-time network earnings
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Active Agent Team
          </p>
          <p className="text-xl font-black text-purple-600 mt-1">
            {mappedAgents.length}
          </p>
          <span className="text-[10px] text-purple-700 font-medium">
            Mapped under your code
          </span>
        </div>
      </div>

      {/* Mapped Agent Network Directory */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              My Mapped Channel Partner (Agent) Network ({mappedAgents.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Agents registered through your referral link. Disbursed loans generate automated override payouts to you.
            </p>
          </div>
          <button
            type="button"
            onClick={shareAgentLinkWhatsApp}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1.5"
          >
            <span>➕ Invite More Agents</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                <th className="px-4 py-3">Agent Name</th>
                <th className="px-4 py-3">Agent Code</th>
                <th className="px-4 py-3">Contact Details</th>
                <th className="px-4 py-3">Branch / Location</th>
                <th className="px-4 py-3">KYC & Compliance</th>
                <th className="px-4 py-3">Joined Date</th>
                <th className="px-4 py-3 text-right">Connect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappedAgents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-xs">
                    You haven&apos;t appointed any agents yet. Share your Agent Referral Link above to recruit your first partner!
                  </td>
                </tr>
              ) : (
                mappedAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900 text-xs">{agent.name}</p>
                      <p className="text-[10px] text-slate-400">{agent.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                        {agent.partnerCode || 'QFS-PRT'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                      {agent.phone || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {agent.branchName || 'Head Office'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          agent.partnerStatus === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {agent.partnerStatus || 'APPROVED'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(agent.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {agent.phone && (
                        <a
                          href={`https://api.whatsapp.com/send?phone=91${agent.phone.replace(/[^0-9]/g, '').slice(-10)}&text=Hi%20${encodeURIComponent(agent.name)},%20checking%20in%20on%20your%20active%20loan%20cases!`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition inline-flex items-center gap-1"
                        >
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
