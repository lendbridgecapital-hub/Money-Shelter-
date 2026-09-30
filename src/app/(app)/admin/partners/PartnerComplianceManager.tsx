'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Role } from '@/types/db';
import { blockPartnerAction } from '@/actions/workflowActions';
import { formatDate } from '@/lib/format';

interface Props {
  partners: User[];
  currentUserRole: Role;
  currentUserId?: string;
}

export default function PartnerComplianceManager({ partners, currentUserRole, currentUserId }: Props) {
  const router = useRouter();
  const isAdmin = currentUserRole === 'ADMIN';
  const isRM = currentUserRole === 'RELATIONSHIP_MANAGER';

  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const getOnboardingUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (isRM && currentUserId) {
      return `${origin}/partner/onboard?rmId=${currentUserId}`;
    }
    return `${origin}/partner/onboard`;
  };

  const copyOnboardingLink = () => {
    const link = getOnboardingUrl();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareViaWhatsApp = () => {
    const link = getOnboardingUrl();
    const text = encodeURIComponent(
      `Hello! Register as an authorized Channel Partner with Quickfinsure using my direct onboarding link: ${link}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  function openBlockModal(partner: User) {
    setSelectedPartner(partner);
    setBlockReason(partner.blockedReason || '');
    setError(null);
    setShowBlockModal(true);
  }

  async function handleToggleBlock(partner: User, shouldBlock: boolean) {
    setLoading(true);
    setError(null);

    const res = await blockPartnerAction(
      partner.id,
      shouldBlock,
      shouldBlock ? blockReason : undefined
    );

    setLoading(false);
    if (res.ok) {
      setShowBlockModal(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to update partner compliance status.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isRM ? `My Assigned Channel Partners (${partners.length})` : 'Channel Partner Compliance & Network'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRM
              ? 'Directory of Channel Partners mapped to your RM portfolio. Monitor their performance, codes, and activities.'
              : 'Monitor Channel Partner originations, enforce compliance, and onboard new referral partners with digital Sub-DSA agreements.'}
          </p>
        </div>
      </div>

      {/* Partner Onboarding Link Banner */}
      <div className="bg-gradient-to-r from-emerald-50/70 via-white to-slate-50/50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
            🤝
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                {isRM ? 'My Partner Onboarding Link (Auto-Assign)' : 'Public Partner Onboarding Link'}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isRM ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {isRM ? '⚡ Auto-Assigns To You' : 'Self-Registration & Sub-DSA'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isRM
                ? 'Share this link with prospective partners. Any partner who registers through this link will be automatically assigned to you upon registration.'
                : 'Share this link with prospective partners to submit PAN & Aadhaar KYC, review the Sub-DSA agreement, and complete mobile OTP verification.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={copyOnboardingLink}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1.5"
          >
            <span>{copiedLink ? '✓ Copied Link' : isRM ? '📋 Copy My Link' : '📋 Copy Link'}</span>
          </button>
          <a
            href={isRM && currentUserId ? `/partner/onboard?rmId=${currentUserId}` : '/partner/onboard'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1"
          >
            <span>Preview Form</span>
            <span>↗</span>
          </a>
          {isRM && (
            <button
              type="button"
              onClick={shareViaWhatsApp}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1"
            >
              <span>WhatsApp</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                <th className="px-4 py-3">Channel Partner</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Phone / Contact</th>
                <th className="px-4 py-3">Commission Slab</th>
                <th className="px-4 py-3">Compliance Status</th>
                <th className="px-4 py-3">Registered</th>
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No Channel Partners registered yet. Register new partners via the Users & Team page.
                  </td>
                </tr>
              ) : (
                partners.map((p) => {
                  const isBlocked = Boolean(p.isBlocked);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{p.name}</p>
                          {p.partnerCode && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              {p.partnerCode}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{p.email}</p>
                        {p.panNumber && (
                          <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                            PAN: {p.panNumber} • Aadhaar: •••• {p.aadhaarNumber?.slice(-4) || 'Verified'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {p.branchName || 'Head Office'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {p.phone || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-emerald-700">
                        {p.commissionRate !== undefined ? `${p.commissionRate}%` : 'Standard Bank Slab'}
                      </td>
                      <td className="px-4 py-3.5">
                        {isBlocked ? (
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              BLOCKED / FRAUD
                            </span>
                            {p.blockedReason && (
                              <p className="text-[11px] text-rose-600 max-w-xs mt-0.5 font-medium truncate" title={p.blockedReason}>
                                {p.blockedReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            COMPLIANT / ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">
                        {formatDate(p.createdAt)}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3.5 text-right">
                          {isBlocked ? (
                            <button
                              type="button"
                              onClick={() => handleToggleBlock(p, false)}
                              disabled={loading}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition"
                            >
                              Unblock Partner
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openBlockModal(p)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition"
                            >
                              Block for Fraud
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block Partner Modal */}
      {showBlockModal && selectedPartner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-rose-900">Block Channel Partner</h3>
                <p className="text-xs text-slate-500">
                  {selectedPartner.name} ({selectedPartner.email})
                </p>
              </div>
              <button onClick={() => setShowBlockModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs text-rose-800">
              ⚠️ Blocking this partner will instantly revoke their ability to generate new customer loan links and freeze pending commission payouts.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Blocking / Compliance Infraction
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Fabricated bank statement / Fake salary slips submitted / Regulatory violation."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleBlock(selectedPartner, true)}
                disabled={loading || !blockReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {loading ? 'Blocking…' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
