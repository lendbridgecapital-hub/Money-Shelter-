'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Role, Branch } from '@/types/db';
import { blockPartnerAction } from '@/actions/workflowActions';
import {
  directAdminOnboardPartnerAction,
  approvePartnerAction,
  updatePartnerCommissionRateAction,
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

  // Sub-DSA Modal State
  const [showSubDsaModal, setShowSubDsaModal] = useState(false);
  const [copiedSubDsaLink, setCopiedSubDsaLink] = useState(false);
  const [selectedOnboardRole, setSelectedOnboardRole] = useState<'CHANNEL_PARTNER' | 'SUB_DSA'>('CHANNEL_PARTNER');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUB_DSA' | 'CHANNEL_PARTNER' | 'PENDING'>('ALL');

  // Direct Onboard Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Sub-DSA Team Size Map
  const teamSizeMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const p of partners) {
      if (p.parentSubDsaId) {
        map.set(p.parentSubDsaId, (map.get(p.parentSubDsaId) || 0) + 1);
      }
    }
    return map;
  }, [partners]);

  // Onboarding Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [assignedRmId, setAssignedRmId] = useState(isRM && currentUserId ? currentUserId : '');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [password, setPassword] = useState('Quickfin@123');
  const [onboardStatus, setOnboardStatus] = useState<'PENDING_APPROVAL' | 'APPROVED'>('PENDING_APPROVAL');
  const [onboardCommissionRate, setOnboardCommissionRate] = useState<string>('');

  // Set Commission Modal State
  const [editingCommissionPartner, setEditingCommissionPartner] = useState<User | null>(null);
  const [editCommissionInput, setEditCommissionInput] = useState<string>('');
  const [commissionModalLoading, setCommissionModalLoading] = useState(false);
  const [commissionModalError, setCommissionModalError] = useState<string | null>(null);
  const [commissionModalSuccess, setCommissionModalSuccess] = useState<string | null>(null);

  const getOnboardingUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (isRM && currentUserId) {
      return `${origin}/partner/onboard?rmId=${currentUserId}`;
    }
    return `${origin}/partner/onboard`;
  };

  const getSubDsaOnboardingUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const refParam = currentUserId ? `&ref=${currentUserId}` : '';
    return `${origin}/partner/onboard?role=SUB_DSA${refParam}`;
  };

  const copyOnboardingLink = () => {
    const link = getOnboardingUrl();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copySubDsaLink = () => {
    const link = getSubDsaOnboardingUrl();
    navigator.clipboard.writeText(link);
    setCopiedSubDsaLink(true);
    setTimeout(() => setCopiedSubDsaLink(false), 2500);
  };

  const shareViaWhatsApp = () => {
    const link = getOnboardingUrl();
    const text = encodeURIComponent(
      `Hello! Register as an authorized Channel Partner with Quickfinsure using my direct onboarding link: ${link}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareSubDsaViaWhatsApp = () => {
    const link = getSubDsaOnboardingUrl();
    const text = encodeURIComponent(
      `Hello! We invite you to join Quickfinsure as an authorized Sub-DSA. Build your own agent team, earn override commissions on your network's business, and access direct loan disbursements: ${link}`
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
      role: selectedOnboardRole,
      partnerStatus: onboardStatus,
      commissionRate: onboardCommissionRate.trim() ? Number(onboardCommissionRate) : null,
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
        setOnboardCommissionRate('');
        setOnboardStatus('PENDING_APPROVAL');
        router.refresh();
      }, 1200);
    } else {
      setOnboardError(res.error || 'Failed to onboard partner.');
    }
  }

  function openCommissionModal(partner: User) {
    setEditingCommissionPartner(partner);
    setEditCommissionInput(
      partner.commissionRate !== undefined && partner.commissionRate !== null
        ? String(partner.commissionRate)
        : ''
    );
    setCommissionModalError(null);
    setCommissionModalSuccess(null);
  }

  async function handleSaveCommissionRate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCommissionPartner) return;
    setCommissionModalLoading(true);
    setCommissionModalError(null);
    setCommissionModalSuccess(null);

    const rate = editCommissionInput.trim() ? Number(editCommissionInput) : null;
    if (rate !== null && (isNaN(rate) || rate < 0 || rate > 100)) {
      setCommissionModalError('Please enter a valid commission rate percentage between 0 and 100.');
      setCommissionModalLoading(false);
      return;
    }

    const res = await updatePartnerCommissionRateAction({
      partnerId: editingCommissionPartner.id,
      commissionRate: rate,
    });

    setCommissionModalLoading(false);
    if (res.ok) {
      setCommissionModalSuccess(res.message || 'Commission rate updated successfully!');
      setTimeout(() => {
        setEditingCommissionPartner(null);
        setCommissionModalSuccess(null);
        router.refresh();
      }, 1000);
    } else {
      setCommissionModalError(res.error || 'Failed to update commission rate.');
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

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {(isAdmin || isSupport || isRM) && (
            <button
              type="button"
              onClick={() => setShowSubDsaModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 active:scale-95"
            >
              <span>🏢 Appoint Sub-DSA</span>
            </button>
          )}

          {(isAdmin || isSupport || isRM) && (
            <button
              type="button"
              onClick={() => {
                setSelectedOnboardRole('CHANNEL_PARTNER');
                setOnboardError(null);
                setOnboardSuccess(null);
                setShowOnboardModal(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 active:scale-95"
            >
              <span>➕ Onboard New Partner</span>
            </button>
          )}
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'ALL', label: `All Network Partners (${partners.length})` },
          { id: 'SUB_DSA', label: `Sub-DSAs (${partners.filter((p) => p.role === 'SUB_DSA').length})` },
          { id: 'CHANNEL_PARTNER', label: `Channel Partners (${partners.filter((p) => p.role === 'CHANNEL_PARTNER').length})` },
          { id: 'PENDING', label: `Pending KYC (${partners.filter((p) => p.partnerStatus === 'PENDING_APPROVAL').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setRoleFilter(tab.id as any)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              roleFilter === tab.id
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Partners Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                <th className="px-4 py-3">Partner / Organization</th>
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
                partners
                  .filter((p) => {
                    if (roleFilter === 'SUB_DSA') return p.role === 'SUB_DSA';
                    if (roleFilter === 'CHANNEL_PARTNER') return p.role === 'CHANNEL_PARTNER';
                    if (roleFilter === 'PENDING') return p.partnerStatus === 'PENDING_APPROVAL';
                    return true;
                  })
                  .map((p) => {
                    const isBlocked = Boolean(p.isBlocked);
                    const status = p.partnerStatus || 'APPROVED';
                    const isPending = status === 'PENDING_APPROVAL';
                    const isSubDsa = p.role === 'SUB_DSA';
                    const teamCount = teamSizeMap.get(p.id) || 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900">{p.name}</p>
                            {p.partnerCode && (
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                  isSubDsa
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                                }`}
                              >
                                {p.partnerCode}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isSubDsa
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isSubDsa ? '🏢 Sub-DSA' : '👤 Agent'}
                            </span>
                            {isSubDsa && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                👥 {teamCount} Mapped Agents
                              </span>
                            )}
                            {p.parentSubDsaName && (
                              <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                Mapped to: 🏢 {p.parentSubDsaName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{p.email}</p>
                          {p.panNumber && (
                            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                              PAN: {p.panNumber} • Aadhaar: •••• {p.aadhaarNumber?.slice(-4) || 'Verified'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          <p className="font-medium text-slate-800">
                            {branches.find((b) => b.id === p.branchId)?.name || p.branchName || 'Head Office'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            RM: {p.assignedRmName || 'Not Assigned'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                          {p.phone || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-emerald-700">
                              {p.commissionRate !== undefined && p.commissionRate !== null
                                ? `${p.commissionRate}%`
                                : 'Standard Slab'}
                            </span>
                            {(isAdmin || isSupport) && (
                              <button
                                type="button"
                                onClick={() => openCommissionModal(p)}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded border border-slate-200 transition inline-flex items-center gap-1"
                                title="Set / Edit Partner Commission Percentage"
                              >
                                <span>✏️ Set Rate</span>
                              </button>
                            )}
                          </div>
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Appointment Role & Network Tier <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedOnboardRole}
                  onChange={(e) => setSelectedOnboardRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                >
                  <option value="CHANNEL_PARTNER">Channel Partner (Agent) — Direct Origination Tier</option>
                  <option value="SUB_DSA">Sub-DSA (Master Tier) — Team Recruitment & Override Engine</option>
                </select>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {selectedOnboardRole === 'SUB_DSA'
                    ? 'Generates a QFS-SUB-XXXX code. Sub-DSA can recruit agents and earn override commissions.'
                    : 'Generates a QFS-PRT-XXXX code for direct customer sourcing.'}
                </span>
              </div>

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

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard Commission Rate (%) (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g. 1.50 (Leave blank for default)"
                      value={onboardCommissionRate}
                      onChange={(e) => setOnboardCommissionRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono pr-7"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Agreed payout percentage for disbursed loan cases.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Onboarding Routing / Approval Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={onboardStatus}
                    onChange={(e) => setOnboardStatus(e.target.value as 'PENDING_APPROVAL' | 'APPROVED')}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="PENDING_APPROVAL">
                      ⏳ Send to Partner Requests / Approval Bucket (Pending Verification)
                    </option>
                    <option value="APPROVED">
                      ⚡ Direct Instant Approval (Active Immediately in Directory)
                    </option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Choose whether this partner lands in review queue or activates directly.
                  </span>
                </div>
              </div>

              <div className={`p-3 rounded-xl text-[11px] border ${
                onboardStatus === 'PENDING_APPROVAL'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
              }`}>
                {onboardStatus === 'PENDING_APPROVAL' ? (
                  <>⏳ <strong>Review Pipeline:</strong> Partner will be registered and placed in the <strong>Partner Onboarding Approvals</strong> bucket. Central Support / Admin can verify KYC and assign an RM before issuing credentials.</>
                ) : (
                  <>⚡ <strong>Instant Setup:</strong> Official Reference Code (e.g. {selectedOnboardRole === 'SUB_DSA' ? 'QFS-SUB-XXXX' : 'QFS-PRT-XXXX'}) is generated immediately. The partner can log in and originate loans right away.</>
                )}
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
                  className={`px-5 py-2 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 inline-flex items-center gap-1.5 ${
                    onboardStatus === 'PENDING_APPROVAL'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {onboardLoading
                    ? 'Submitting…'
                    : onboardStatus === 'PENDING_APPROVAL'
                    ? '⏳ Register & Send to Approval Bucket'
                    : '✓ Create & Approve Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Partner Commission Rate Modal */}
      {editingCommissionPartner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl font-bold shadow-xs">
                  💰
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Configure Commission Rate</h3>
                  <p className="text-xs text-slate-500">
                    {editingCommissionPartner.name} • {editingCommissionPartner.partnerCode || 'No Code'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCommissionPartner(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {commissionModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {commissionModalError}
              </div>
            )}

            {commissionModalSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
                {commissionModalSuccess}
              </div>
            )}

            <form onSubmit={handleSaveCommissionRate} className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Network Role:</span>
                  <span className="font-bold text-slate-800">
                    {editingCommissionPartner.role === 'SUB_DSA' ? '🏢 Sub-DSA Master Partner' : '👤 Channel Partner'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Operating Branch:</span>
                  <span className="font-semibold text-slate-800">
                    {branches.find((b) => b.id === editingCommissionPartner.branchId)?.name || editingCommissionPartner.branchName || 'Head Office'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current Payout Slab:</span>
                  <span className="font-bold text-emerald-700">
                    {editingCommissionPartner.commissionRate !== undefined && editingCommissionPartner.commissionRate !== null
                      ? `${editingCommissionPartner.commissionRate}%`
                      : 'Standard Product Slab (Default)'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agreed Commission Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 1.50 (Leave blank to use default bank slab)"
                    value={editCommissionInput}
                    onChange={(e) => setEditCommissionInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {editingCommissionPartner.role === 'SUB_DSA'
                    ? 'Sets the primary commission for direct loans closed by this Sub-DSA. (Override commissions on team downline volume are separately configured in Admin Commission Settings).'
                    : 'Sets the standard commission percentage earned by this Channel Partner for all closed loan files.'}
                </p>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditCommissionInput('')}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Reset to Standard Slab
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCommissionPartner(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={commissionModalLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {commissionModalLoading ? 'Saving…' : '✓ Save Commission'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appoint Sub-DSA Invitation Link Modal */}
      {showSubDsaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-xs">
                  🏢
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Appoint Sub-DSA (Master Partner)</h3>
                  <p className="text-xs text-slate-500">Automated link-based onboarding for franchise networks.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSubDsaModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                <span>🌟</span>
                <span>Sub-DSA Capabilities & Commission Structure</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                When a broker registers using this link, they are designated as a <strong>Sub-DSA</strong>. They can:
              </p>
              <ul className="text-[11px] space-y-1 text-slate-600 list-disc list-inside">
                <li>Generate agent referral links to recruit their own team of Channel Partners.</li>
                <li>Earn <strong>Override Commissions</strong> (e.g. 0.1% PL) on all loans disbursed by their agents.</li>
                <li>Originate direct customer loans and earn the full standard Partner commission.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Sub-DSA Unique Registration Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getSubDsaOnboardingUrl()}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
                <button
                  type="button"
                  onClick={copySubDsaLink}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition whitespace-nowrap"
                >
                  {copiedSubDsaLink ? '✓ Copied' : '📋 Copy Link'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <a
                href={getSubDsaOnboardingUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Preview Registration Portal</span>
                <span>↗</span>
              </a>
              <button
                type="button"
                onClick={shareSubDsaViaWhatsApp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1.5"
              >
                <span>Share via WhatsApp</span>
              </button>
            </div>
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
