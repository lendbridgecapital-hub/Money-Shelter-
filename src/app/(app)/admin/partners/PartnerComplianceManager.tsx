'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Role, Branch } from '@/types/db';
import { blockPartnerAction } from '@/actions/workflowActions';
import {
  directAdminOnboardPartnerAction,
  approvePartnerAction,
} from '@/actions/partnerOnboardingActions';
import { formatDate } from '@/lib/format';

interface Props {
  partners: User[];
  branches?: Branch[];
  relationshipManagers?: User[];
  currentUserRole: Role;
  currentUserId?: string;
}

export default function PartnerComplianceManager({
  partners,
  branches = [],
  relationshipManagers = [],
  currentUserRole,
  currentUserId,
}: Props) {
  const router = useRouter();
  const isAdmin = currentUserRole === 'ADMIN';
  const isRM = currentUserRole === 'RELATIONSHIP_MANAGER';
  const isSupport = currentUserRole === 'CENTRAL_SUPPORT';

  // Selection & Modals
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Direct Onboard Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Onboarding Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [assignedRmId, setAssignedRmId] = useState(isRM && currentUserId ? currentUserId : '');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [password, setPassword] = useState('Quickfin@123');

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

  async function handleDirectOnboard(e: React.FormEvent) {
    e.preventDefault();
    setOnboardError(null);
    setOnboardSuccess(null);

    if (!fullName.trim()) return setOnboardError('Full legal name is required.');
    if (!email.trim()) return setOnboardError('Email address is required.');
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) return setOnboardError('Please enter a valid 10-digit mobile number.');
    if (!selectedBranchId) return setOnboardError('Please select an operating branch.');

    setOnboardLoading(true);
    const res = await directAdminOnboardPartnerAction({
      fullName,
      email,
      mobile: cleanMobile,
      password: password || 'Quickfin@123',
      branchId: selectedBranchId,
      assignedRmId: isRM ? currentUserId : assignedRmId || null,
      panNumber: panNumber ? panNumber.toUpperCase() : null,
      aadhaarNumber: aadhaarNumber || null,
    });
    setOnboardLoading(false);

    if (res.ok) {
      setOnboardSuccess(res.message || 'Partner onboarded successfully!');
      setTimeout(() => {
        setShowOnboardModal(false);
        setOnboardSuccess(null);
        setFullName('');
        setEmail('');
        setMobile('');
        setPanNumber('');
        setAadhaarNumber('');
        router.refresh();
      }, 1200);
    } else {
      setOnboardError(res.error || 'Failed to onboard partner.');
    }
  }

  async function handleQuickApprove(partner: User) {
    setApprovingId(partner.id);
    const rmIdToAssign = partner.assignedRmId || (isRM && currentUserId ? currentUserId : relationshipManagers[0]?.id || '');
    const res = await approvePartnerAction({
      partnerId: partner.id,
      assignedRmId: rmIdToAssign,
      remark: 'Directly verified & approved by Partner Management.',
    });
    setApprovingId(null);
    if (res.ok) {
      router.refresh();
    } else {
      alert(res.error || 'Could not approve partner.');
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
              : 'Monitor Channel Partner originations, onboard new partners with instant approval, and manage network compliance.'}
          </p>
        </div>

        {(isAdmin || isSupport || isRM) && (
          <button
            type="button"
            onClick={() => {
              setOnboardError(null);
              setOnboardSuccess(null);
              setShowOnboardModal(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 self-start sm:self-auto active:scale-95"
          >
            <span>➕ Onboard New Partner</span>
          </button>
        )}
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
                {isRM ? 'My Partner Onboarding Link (Auto-Assign)' : 'Public Partner Self-Registration Link'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {isRM ? '⚡ Auto-Assigns To You' : 'Self-Registration & Sub-DSA'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isRM
                ? 'Share this link with prospective partners. Any partner who registers through this link will be automatically assigned to you.'
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

      {/* Partners Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                <th className="px-4 py-3">Channel Partner</th>
                <th className="px-4 py-3">Branch / Assigned RM</th>
                <th className="px-4 py-3">Phone / Contact</th>
                <th className="px-4 py-3">Commission Slab</th>
                <th className="px-4 py-3">Approval & Compliance</th>
                <th className="px-4 py-3">Registered</th>
                {(isAdmin || isSupport) && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin || isSupport ? 7 : 6} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No Channel Partners registered yet. Click &ldquo;➕ Onboard New Partner&rdquo; above to add your first partner.
                  </td>
                </tr>
              ) : (
                partners.map((p) => {
                  const isBlocked = Boolean(p.isBlocked);
                  const status = p.partnerStatus || 'APPROVED';
                  const isPending = status === 'PENDING_APPROVAL';

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
                        <p className="font-medium text-slate-800">{p.branchName || 'Head Office'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          RM: {p.assignedRmName || 'Not Assigned'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
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
                        ) : isPending ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              PENDING APPROVAL
                            </span>
                            {(isAdmin || isSupport) && (
                              <button
                                type="button"
                                onClick={() => handleQuickApprove(p)}
                                disabled={approvingId === p.id}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-2xs transition disabled:opacity-50"
                              >
                                {approvingId === p.id ? 'Approving…' : 'Approve Now'}
                              </button>
                            )}
                          </div>
                        ) : status === 'DOCUMENTS_REQUIRED' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                            DOCS REQUIRED
                          </span>
                        ) : status === 'REJECTED' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            REJECTED
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            APPROVED & ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">
                        {formatDate(p.createdAt)}
                      </td>
                      {(isAdmin || isSupport) && (
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
                              Block
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

      {/* Direct Onboard Channel Partner Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Onboard Channel Partner</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct registration. Partner will be auto-approved and issued an official Partner Code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {onboardError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {onboardError}
              </div>
            )}

            {onboardSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-1.5">
                <span>✓</span>
                <span>{onboardSuccess}</span>
              </div>
            )}

            <form onSubmit={handleDirectOnboard} className="space-y-3.5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Partner Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Verma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    10-Digit Mobile <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9820011223"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address (Login ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned RM
                  </label>
                  {isRM ? (
                    <input
                      type="text"
                      disabled
                      value="Mapped to you (Self)"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-medium"
                    />
                  ) : (
                    <select
                      value={assignedRmId}
                      onChange={(e) => setAssignedRmId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      <option value="">No RM Assigned (Head Office)</option>
                      {relationshipManagers.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name} ({rm.branchName || 'HQ'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PAN Card (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aadhaar Number (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="12-digit number"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-[11px] text-emerald-800">
                ⚡ <strong>Instant Setup:</strong> Partner Code (e.g. QFS-PRT-XXXX) & Certificate of Association are generated immediately. The partner can log in and originate loans right away.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {onboardLoading ? 'Onboarding…' : '✓ Create & Approve Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

            <p className="text-xs text-slate-600">
              Blocking disables link creation, commissions, and origination for this partner immediately.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Compliance Block *
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Coercive bundling, fake documentation, high early default rate…"
                rows={3}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
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
