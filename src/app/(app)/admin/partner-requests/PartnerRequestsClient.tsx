'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User, Role, PartnerStatus, Branch } from '@/types/db';
import { PARTNER_STATUS_LABELS, formatDate, formatDateTime } from '@/lib/format';
import {
  approvePartnerAction,
  requestPartnerDocsAction,
  rejectPartnerAction,
} from '@/actions/partnerOnboardingActions';
import {
  approveSiteAction,
  rejectSiteAction,
  createSiteForBranchAction,
  updateBranchAction,
} from '@/actions/branchActions';

interface Props {
  initialPartners: User[];
  relationshipManagers: User[];
  branches?: Branch[];
  branchSites?: Branch[];
  userBranch?: Branch;
  isRegionalBranchOps?: boolean;
  currentUserRole: Role;
  currentUserName: string;
  currentUserId?: string;
}

export default function PartnerRequestsClient({
  initialPartners,
  relationshipManagers,
  branches = [],
  branchSites = [],
  userBranch,
  isRegionalBranchOps = false,
  currentUserRole,
  currentUserName,
  currentUserId,
}: Props) {
  const router = useRouter();

  // State
  const [selectedStatus, setSelectedStatus] = useState<PartnerStatus | 'ALL'>('PENDING_APPROVAL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'SUB_DSA' | 'CHANNEL_PARTNER' | 'SITE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);

  // Review modal form states
  const [assignedRmId, setAssignedRmId] = useState<string>('');
  const [commissionRateInput, setCommissionRateInput] = useState<string>('');
  const [reviewRemark, setReviewRemark] = useState('');
  const [actionType, setActionType] = useState<'APPROVE' | 'REQUEST_DOCS' | 'REJECT' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Preview Modal for Document Images / PDFs
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  // Site Onboard & Edit States
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [siteDeveloper, setSiteDeveloper] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [sitePhone, setSitePhone] = useState('');
  const [siteEmail, setSiteEmail] = useState('');
  const [siteDedicatedRmId, setSiteDedicatedRmId] = useState('');
  const [siteLoading, setSiteLoading] = useState(false);
  const [siteFeedback, setSiteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [editingSite, setEditingSite] = useState<Branch | null>(null);
  const [editSiteName, setEditSiteName] = useState('');
  const [editSiteCode, setEditSiteCode] = useState('');
  const [editSiteDeveloper, setEditSiteDeveloper] = useState('');
  const [editSiteAddress, setEditSiteAddress] = useState('');
  const [editSitePhone, setEditSitePhone] = useState('');
  const [editSiteEmail, setEditSiteEmail] = useState('');
  const [editSiteDedicatedRmId, setEditSiteDedicatedRmId] = useState('');

  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const getOrigin = () => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return 'https://money-shelter.onrender.com';
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Deduplicate initial partners list (guaranteeing uniqueness across ID, email, PAN, and partnerCode)
  const cleanPartners = useMemo(() => {
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    const seenPans = new Set<string>();
    const seenCodes = new Set<string>();
    const seenPhones = new Set<string>();
    return initialPartners.filter((p) => {
      if (p.id === 'usr_tejas_subdsa_alias' || p.email === 'tejas.subdsa@quickfinsure.com') {
        return false;
      }
      const id = (p.id || '').toLowerCase().trim();
      const email = (p.email || '').toLowerCase().trim();
      const pan = (p.panNumber || '').toUpperCase().trim();
      const code = (p.partnerCode || '').toUpperCase().trim();
      const phone = (p.phone || '').replace(/\D/g, '').slice(-10);

      if (id && seenIds.has(id)) return false;
      if (email && seenEmails.has(email)) return false;
      if (pan && pan.length === 10 && seenPans.has(pan)) return false;
      if (code && seenCodes.has(code)) return false;
      if (phone && phone.length === 10 && seenPhones.has(phone)) return false;

      if (id) seenIds.add(id);
      if (email) seenEmails.add(email);
      if (pan && pan.length === 10) seenPans.add(pan);
      if (code) seenCodes.add(code);
      if (phone && phone.length === 10) seenPhones.add(phone);

      return true;
    });
  }, [initialPartners]);

  // Filter partners
  const filteredPartners = cleanPartners.filter((p) => {
    const status = p.partnerStatus || 'APPROVED';
    if (selectedStatus !== 'ALL' && status !== selectedStatus) return false;
    if (selectedRoleFilter === 'SUB_DSA' && p.role !== 'SUB_DSA') return false;
    if (selectedRoleFilter === 'CHANNEL_PARTNER' && p.role !== 'CHANNEL_PARTNER') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = (p.name || '').toLowerCase().includes(q);
    const matchEmail = (p.email || '').toLowerCase().includes(q);
    const matchPhone = (p.phone || '').toLowerCase().includes(q);
    const matchPan = (p.panNumber || '').toLowerCase().includes(q);
    const matchCode = (p.partnerCode || '').toLowerCase().includes(q);
    return matchName || matchEmail || matchPhone || matchPan || matchCode;
  });

  // Filter sites
  const filteredSites = branchSites.filter((s) => {
    const status = s.status || 'APPROVED';
    if (selectedStatus !== 'ALL' && status !== selectedStatus) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = (s.name || '').toLowerCase().includes(q);
    const matchCode = (s.code || '').toLowerCase().includes(q);
    const matchDev = (s.developerName || '').toLowerCase().includes(q);
    const matchAddr = (s.address || '').toLowerCase().includes(q);
    const matchRm = (s.dedicatedRmName || '').toLowerCase().includes(q);
    return matchName || matchCode || matchDev || matchAddr || matchRm;
  });

  // Status counts for badge tabs
  const countPending =
    cleanPartners.filter((p) => (p.partnerStatus || 'APPROVED') === 'PENDING_APPROVAL').length +
    branchSites.filter((s) => s.status === 'PENDING_APPROVAL').length;
  const countDocsReq = cleanPartners.filter((p) => p.partnerStatus === 'DOCUMENTS_REQUIRED').length;
  const countApproved =
    cleanPartners.filter((p) => (p.partnerStatus || 'APPROVED') === 'APPROVED').length +
    branchSites.filter((s) => (s.status || 'APPROVED') === 'APPROVED').length;
  const countRejected =
    cleanPartners.filter((p) => p.partnerStatus === 'REJECTED').length +
    branchSites.filter((s) => s.status === 'REJECTED').length;
  const countSubDsas = cleanPartners.filter((p) => p.role === 'SUB_DSA').length;
  const countAgents = cleanPartners.filter((p) => p.role === 'CHANNEL_PARTNER').length;
  const countSites = branchSites.length;

  const openReviewModal = (partner: User) => {
    setSelectedPartner(partner);
    setAssignedRmId(
      partner.assignedRmId || (relationshipManagers[0] ? relationshipManagers[0].id : (currentUserId || ''))
    );
    setCommissionRateInput(
      partner.commissionRate !== undefined && partner.commissionRate !== null ? String(partner.commissionRate) : ''
    );
    setReviewRemark('');
    setActionType(null);
    setFeedback(null);
  };

  const closeReviewModal = () => {
    setSelectedPartner(null);
    setActionType(null);
    setFeedback(null);
  };

  const openEditSiteModal = (site: Branch) => {
    setEditingSite(site);
    setEditSiteName(site.name || '');
    setEditSiteCode(site.code || '');
    setEditSiteDeveloper(site.developerName || '');
    setEditSiteAddress(site.address || '');
    setEditSitePhone(site.phone || '');
    setEditSiteEmail(site.email || '');
    setEditSiteDedicatedRmId(site.dedicatedRmId || '');
    setSiteFeedback(null);
  };

  // Execution Handlers
  const handleApprove = async () => {
    if (!selectedPartner) return;
    const effectiveRmId = assignedRmId || (relationshipManagers[0] ? relationshipManagers[0].id : (currentUserId || ''));

    setIsSubmitting(true);
    setFeedback(null);

    const res = await approvePartnerAction({
      partnerId: selectedPartner.id,
      partnerEmail: selectedPartner.email,
      partnerCode: selectedPartner.partnerCode,
      assignedRmId: effectiveRmId,
      remark: reviewRemark.trim() || `Verified and approved by ${currentUserName || 'Operations'}.`,
      commissionRate: commissionRateInput.trim() ? Number(commissionRateInput) : null,
    });

    setIsSubmitting(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Partner approved successfully!' });
      setTimeout(() => {
        closeReviewModal();
        router.refresh();
      }, 1800);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to approve partner.' });
    }
  };

  const handleApproveSite = async (siteId: string) => {
    setIsSubmitting(true);
    const res = await approveSiteAction(siteId);
    setIsSubmitting(false);
    if (res.ok) {
      alert(res.message || 'Project site approved successfully!');
      router.refresh();
    } else {
      alert(res.error || 'Failed to approve project site.');
    }
  };

  const handleRejectSite = async (siteId: string) => {
    const reason = prompt('Please enter the reason for rejecting this project site:');
    if (reason === null) return;
    setIsSubmitting(true);
    const res = await rejectSiteAction(siteId, reason);
    setIsSubmitting(false);
    if (res.ok) {
      alert(res.message || 'Project site rejected.');
      router.refresh();
    } else {
      alert(res.error || 'Failed to reject site.');
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) {
      setSiteFeedback({ type: 'error', message: 'Project site name is required.' });
      return;
    }
    setSiteLoading(true);
    setSiteFeedback(null);

    const fd = new FormData();
    fd.append('name', siteName.trim());
    if (siteCode.trim()) fd.append('code', siteCode.trim());
    if (siteDeveloper.trim()) fd.append('developerName', siteDeveloper.trim());
    if (siteAddress.trim()) fd.append('address', siteAddress.trim());
    if (sitePhone.trim()) fd.append('phone', sitePhone.trim());
    if (siteEmail.trim()) fd.append('email', siteEmail.trim());
    if (siteDedicatedRmId) fd.append('dedicatedRmId', siteDedicatedRmId);
    if (userBranch?.id) fd.append('mappedBranchId', userBranch.id);

    const res = await createSiteForBranchAction(fd);
    setSiteLoading(false);

    if (res.ok) {
      setSiteFeedback({ type: 'success', message: res.message || 'Project site created and approved successfully!' });
      setTimeout(() => {
        setShowAddSiteModal(false);
        setSiteName('');
        setSiteCode('');
        setSiteDeveloper('');
        setSiteAddress('');
        setSitePhone('');
        setSiteEmail('');
        setSiteDedicatedRmId('');
        setSiteFeedback(null);
        router.refresh();
      }, 1200);
    } else {
      setSiteFeedback({ type: 'error', message: res.error || 'Failed to create project site.' });
    }
  };

  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;
    setSiteLoading(true);
    setSiteFeedback(null);

    const fd = new FormData();
    fd.append('name', editSiteName.trim());
    fd.append('code', editSiteCode.trim());
    fd.append('developerName', editSiteDeveloper.trim());
    fd.append('address', editSiteAddress.trim());
    fd.append('phone', editSitePhone.trim());
    fd.append('email', editSiteEmail.trim());
    fd.append('dedicatedRmId', editSiteDedicatedRmId || '');

    const res = await updateBranchAction(editingSite.id, fd);
    setSiteLoading(false);

    if (res.ok) {
      setSiteFeedback({ type: 'success', message: res.message || 'Project site updated successfully!' });
      setTimeout(() => {
        setEditingSite(null);
        setSiteFeedback(null);
        router.refresh();
      }, 1000);
    } else {
      setSiteFeedback({ type: 'error', message: res.error || 'Failed to update project site.' });
    }
  };

  const handleRequestDocs = async () => {
    if (!selectedPartner) return;
    if (!reviewRemark.trim()) {
      setFeedback({ type: 'error', message: 'Please write specific instructions on what documents or info need updating.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await requestPartnerDocsAction({
      partnerId: selectedPartner.id,
      partnerEmail: selectedPartner.email,
      partnerCode: selectedPartner.partnerCode,
      remark: reviewRemark.trim(),
    });

    setIsSubmitting(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Update request dispatched to partner.' });
      setTimeout(() => {
        closeReviewModal();
        router.refresh();
      }, 1800);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to send update request.' });
    }
  };

  const handleReject = async () => {
    if (!selectedPartner) return;
    if (!reviewRemark.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a justification/reason for rejection.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await rejectPartnerAction({
      partnerId: selectedPartner.id,
      partnerEmail: selectedPartner.email,
      partnerCode: selectedPartner.partnerCode,
      reason: reviewRemark.trim(),
    });

    setIsSubmitting(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Partner application rejected.' });
      setTimeout(() => {
        closeReviewModal();
        router.refresh();
      }, 1800);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to reject application.' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              🛡️
            </span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              {currentUserRole === 'OPERATIONS'
                ? isRegionalBranchOps
                  ? `${userBranch?.name || 'Branch'} Operations — Onboarding & Approvals Desk`
                  : 'Pune HQ Operations — Central Onboarding Desk'
                : 'Central Support — Partner Onboarding Desk'}
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              {currentUserRole === 'OPERATIONS'
                ? isRegionalBranchOps
                  ? `${userBranch?.name || 'Regional Branch'} Operations`
                  : 'Pune HQ Central Hub'
                : currentUserRole === 'CENTRAL_SUPPORT'
                ? 'Central Support Manager'
                : 'Executive Admin'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {currentUserRole === 'OPERATIONS'
              ? 'Review and approve Channel Partners, Sub-DSAs, and Construction Sites for your branch. Verify KYC documents, assign Relationship Managers, configure commission slabs, and issue Certificates of Association.'
              : 'Verify submitted Sub-DSA applications, inspect PAN & Aadhaar documents, review authorized partner agreements, assign Branch Relationship Managers, and issue Certificates of Association.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {userBranch && (
            <Link
              href={`/partner/onboard?branchId=${encodeURIComponent(userBranch.id)}`}
              target="_blank"
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5"
            >
              <span>🔗</span>
              <span>Branch Onboard Form</span>
              <span>↗</span>
            </Link>
          )}
          <Link
            href="/partner/onboard"
            target="_blank"
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5"
          >
            <span>🔗</span>
            <span>Public Form</span>
            <span>↗</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Strip */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-2.5">
        {/* Row 1: Status Workflow Buckets (Compact, all in one frame, no horizontal slider) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedStatus('PENDING_APPROVAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedStatus === 'PENDING_APPROVAL'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>⏳ Pending Review</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
              {countPending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('DOCUMENTS_REQUIRED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedStatus === 'DOCUMENTS_REQUIRED'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>⚠️ Update Required</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
              {countDocsReq}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedStatus === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>✓ Approved Partners</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
              {countApproved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedStatus === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>✕ Rejected</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
              {countRejected}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedStatus === 'ALL'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Statuses ({initialPartners.length})
          </button>
        </div>

        {/* Row 2: Shifted Search Panel & Role Filter */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* Expanded Search Panel for Better View */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search partner by name, phone, PAN, city…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                selectedRoleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Roles
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('SUB_DSA')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                selectedRoleFilter === 'SUB_DSA' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              <span>🏢 Sub-DSAs</span>
              <span className="px-1 py-0.2 rounded-full text-[9px] bg-black/20 font-mono">{countSubDsas}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('CHANNEL_PARTNER')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                selectedRoleFilter === 'CHANNEL_PARTNER' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span>👤 Partners</span>
              <span className="px-1 py-0.2 rounded-full text-[9px] bg-black/20 font-mono">{countAgents}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('SITE')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                selectedRoleFilter === 'SITE' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <span>🏗️ Project Sites</span>
              <span className="px-1 py-0.2 rounded-full text-[9px] bg-black/20 font-mono">{countSites}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        {selectedRoleFilter === 'SITE' ? (
          <div>
            <div className="p-3.5 bg-slate-50 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">🏗️</span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Direct Company Construction Project Sites (APF)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Verify & approve builder projects mapped to {userBranch?.name || 'your branch'}. Deploy dedicated RMs and share project-coded application links.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSiteFeedback(null);
                  setShowAddSiteModal(true);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <span>+</span>
                <span>Onboard / Add Project Site</span>
              </button>
            </div>

            {filteredSites.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <span className="text-3xl block">🏗️</span>
                <h3 className="text-sm font-bold text-slate-800">No project sites found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  There are currently no construction project sites under this filter queue.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSiteFeedback(null);
                    setShowAddSiteModal(true);
                  }}
                  className="mt-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                >
                  <span>+ Add Project Site Now</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <th className="px-3.5 py-2">Project Site & APF Code</th>
                      <th className="px-3.5 py-2">Developer / Builder</th>
                      <th className="px-3.5 py-2">Dedicated Site RM</th>
                      <th className="px-3.5 py-2">Direct Origination Links</th>
                      <th className="px-3.5 py-2">Status</th>
                      <th className="px-3.5 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredSites.map((site) => {
                      const isPending = site.status === 'PENDING_APPROVAL';
                      const isRejected = site.status === 'REJECTED';

                      const customerApplyUrl = `${getOrigin()}/apply?site=${encodeURIComponent(site.code)}`;
                      const partnerOnboardUrl = `${getOrigin()}/partner/onboard?siteCode=${encodeURIComponent(site.code)}`;

                      return (
                        <tr key={site.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300 shadow-2xs">
                                🏗️
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">{site.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                    APF: {site.code}
                                  </span>
                                  {site.address && (
                                    <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                      {site.address}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-3.5 py-2.5 text-slate-700">
                            <strong>{site.developerName || 'Direct Developer'}</strong>
                            <span className="text-[10px] text-slate-400 block">
                              {site.mappedBranchName ? `Mapped to ${site.mappedBranchName}` : 'Company Direct'}
                            </span>
                          </td>

                          <td className="px-3.5 py-2.5">
                            {site.dedicatedRmName ? (
                              <div>
                                <span className="font-semibold text-slate-900 block">{site.dedicatedRmName}</span>
                                <span className="text-[10px] text-slate-400">Dedicated RM</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                            )}
                          </td>

                          <td className="px-3.5 py-2.5">
                            <div className="flex flex-col gap-1 max-w-[200px]">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(customerApplyUrl, `site-apply-${site.id}`)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded text-[10px] font-semibold text-left transition flex items-center justify-between"
                              >
                                <span className="truncate">🔗 Customer Link</span>
                                <span className="font-bold ml-1 text-emerald-600">
                                  {copiedLink === `site-apply-${site.id}` ? '✓ Copied' : 'Copy'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(partnerOnboardUrl, `site-onboard-${site.id}`)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded text-[10px] font-semibold text-left transition flex items-center justify-between"
                              >
                                <span className="truncate">🤝 Partner Link</span>
                                <span className="font-bold ml-1 text-indigo-600">
                                  {copiedLink === `site-onboard-${site.id}` ? '✓ Copied' : 'Copy'}
                                </span>
                              </button>
                            </div>
                          </td>

                          <td className="px-3.5 py-2.5">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-amber-50 text-amber-800 border-amber-200">
                                ⏳ Pending Approval
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-rose-50 text-rose-800 border-rose-200">
                                ✕ Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
                                ✓ Active APF
                              </span>
                            )}
                          </td>

                          <td className="px-3.5 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveSite(site.id)}
                                    disabled={isSubmitting}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition shadow-2xs"
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectSite(site.id)}
                                    disabled={isSubmitting}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded text-[11px] font-bold transition"
                                  >
                                    ✕
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditSiteModal(site)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <span className="text-3xl block">📭</span>
            <h3 className="text-sm font-bold text-slate-800">No partner requests found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no Channel Partner onboarding applications in this filter queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <th className="px-3.5 py-2">Channel Partner</th>
                  <th className="px-3.5 py-2">Identity & PAN</th>
                  <th className="px-3.5 py-2">Assigned RM</th>
                  <th className="px-3.5 py-2">Submitted</th>
                  <th className="px-3.5 py-2">Verification Status</th>
                  <th className="px-3.5 py-2 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPartners.map((partner) => {
                  const status = partner.partnerStatus || 'APPROVED';
                  const statusMeta = PARTNER_STATUS_LABELS[status] || PARTNER_STATUS_LABELS.PENDING_APPROVAL;
                  const hasPanDoc = Boolean(partner.panDocumentUrl);
                  const hasAadhaarDoc = Boolean(partner.aadhaarDocumentUrl);

                  return (
                    <tr key={partner.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Contact */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                              partner.role === 'SUB_DSA'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {partner.role === 'SUB_DSA' ? '🏢' : partner.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-900 leading-tight">
                                {partner.name}
                              </p>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                  partner.role === 'SUB_DSA'
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {partner.role === 'SUB_DSA' ? '🏢 Sub-DSA' : '👤 Partner'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {partner.phone || 'No Phone'} • {partner.email}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {partner.partnerCode && (
                                <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1 rounded border border-emerald-200/60">
                                  {partner.partnerCode}
                                </span>
                              )}
                              <span className="text-[9px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                                📍 {partner.branchName || (branches.find((b) => b.id === partner.branchId)?.name) || 'Head Office'}
                              </span>
                              {partner.commissionRate !== undefined && partner.commissionRate !== null && (
                                <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                  Rate: {partner.commissionRate}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* PAN & Docs info */}
                      <td className="px-3.5 py-2.5">
                        <p className="font-mono text-xs font-bold text-slate-800">
                          {partner.panNumber || '—'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[9px] font-semibold px-1 rounded ${
                              hasPanDoc ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {hasPanDoc ? '✓ PAN Copy' : 'No PAN File'}
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-1 rounded ${
                              hasAadhaarDoc ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {hasAadhaarDoc ? '✓ Aadhaar Copy' : 'No Aadhaar File'}
                          </span>
                        </div>
                      </td>

                      {/* Assigned RM */}
                      <td className="px-3.5 py-2.5">
                        {partner.assignedRmName ? (
                          <div>
                            <p className="font-bold text-slate-800 text-xs flex items-center gap-1">
                              <span>👔</span>
                              <span>{partner.assignedRmName}</span>
                            </p>
                            <span className="inline-block mt-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">
                              ⚡ Auto-Assigned via RM Link
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Unassigned RM
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-3.5 py-2.5 text-[11px] text-slate-500">
                        {formatDate(partner.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}
                        >
                          <span>{status === 'APPROVED' ? '✓' : status === 'PENDING_APPROVAL' ? '⏳' : status === 'DOCUMENTS_REQUIRED' ? '⚠️' : '✕'}</span>
                          <span>{statusMeta.label}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-3.5 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => openReviewModal(partner)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition inline-flex items-center gap-1 shadow-2xs"
                        >
                          <span>Review Request</span>
                          <span>→</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* COMPREHENSIVE CENTRAL SUPPORT REVIEW MODAL                                 */}
      {/* ========================================================================= */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                  🛡️
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Review Onboarding: {selectedPartner.name}
                  </h2>
                  <p className="text-[10px] text-slate-400">
                    Application ID: <code className="font-mono text-slate-600">{selectedPartner.id}</code> • Submitted: {formatDateTime(selectedPartner.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    (PARTNER_STATUS_LABELS[selectedPartner.partnerStatus || 'APPROVED'] || PARTNER_STATUS_LABELS.PENDING_APPROVAL).bg
                  } ${
                    (PARTNER_STATUS_LABELS[selectedPartner.partnerStatus || 'APPROVED'] || PARTNER_STATUS_LABELS.PENDING_APPROVAL).color
                  }`}
                >
                  {(PARTNER_STATUS_LABELS[selectedPartner.partnerStatus || 'APPROVED'] || PARTNER_STATUS_LABELS.PENDING_APPROVAL).label}
                </span>
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center text-sm font-bold transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <span>{feedback.message}</span>
                  <button type="button" onClick={() => setFeedback(null)} className="text-sm font-bold">
                    ✕
                  </button>
                </div>
              )}

              {/* 1. Partner Profile Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                  <span>👤</span>
                  <span>Applicant Personal & Contact Details</span>
                </h3>
                <div className="grid sm:grid-cols-3 gap-2.5 text-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Full Legal Name</span>
                    <strong className="text-slate-900">{selectedPartner.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Father / Spouse Name</span>
                    <strong className="text-slate-900">{selectedPartner.fatherSpouseName || 'Not specified'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Operating Branch</span>
                    <strong className="text-slate-900">
                      {selectedPartner.branchName || (branches.find((b) => b.id === selectedPartner.branchId)?.name) || 'Head Office'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Network Role</span>
                    <span
                      className={`inline-block font-bold text-xs px-2 py-0.5 rounded border ${
                        selectedPartner.role === 'SUB_DSA'
                          ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      }`}
                    >
                      {selectedPartner.role === 'SUB_DSA' ? '🏢 Sub-DSA Master Partner' : '👤 Channel Partner'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Current Commission Rate</span>
                    <strong className="text-emerald-700 font-mono text-xs">
                      {selectedPartner.commissionRate !== undefined && selectedPartner.commissionRate !== null
                        ? `${selectedPartner.commissionRate}%`
                        : 'Standard Bank Slab'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Mobile Phone</span>
                    <a href={`tel:${selectedPartner.phone}`} className="text-emerald-700 font-mono font-bold hover:underline">
                      +91 {selectedPartner.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Registered Email</span>
                    <a href={`mailto:${selectedPartner.email}`} className="text-emerald-700 font-medium hover:underline">
                      {selectedPartner.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Partner DSA Code</span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {selectedPartner.partnerCode || 'Generated Upon Approval'}
                    </span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Registered Postal Address</span>
                    <p className="text-slate-800 font-medium">{selectedPartner.address || '—'}</p>
                  </div>
                </div>
              </div>

              {/* 2. KYC Identity & Attached Documents (PAN + Aadhaar) */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                    <span>🪪</span>
                    <span>KYC Credentials & Attached Documents</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">Click to view attached document copy</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {/* PAN Card Box */}
                  <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">PAN Card</span>
                      <span className="text-[10px] font-mono font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {selectedPartner.panNumber || '—'}
                      </span>
                    </div>

                    {selectedPartner.panDocumentUrl ? (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-emerald-700 font-medium">✓ Document Attached</span>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ title: `PAN Card Copy — ${selectedPartner.name}`, url: selectedPartner.panDocumentUrl! })}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-emerald-700 text-xs font-bold rounded shadow-2xs transition"
                        >
                          👁️ View PAN Copy
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-50/50 border border-dashed border-amber-200 rounded text-[11px] text-amber-800">
                        ⚠️ No PAN document file attached at submission.
                      </div>
                    )}
                  </div>

                  {/* Aadhaar Card Box */}
                  <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Aadhaar Card</span>
                      <span className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {selectedPartner.aadhaarNumber
                          ? `•••• •••• ${selectedPartner.aadhaarNumber.slice(-4)}`
                          : '—'}
                      </span>
                    </div>

                    {selectedPartner.aadhaarDocumentUrl ? (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-emerald-700 font-medium">✓ Document Attached</span>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ title: `Aadhaar Card Copy — ${selectedPartner.name}`, url: selectedPartner.aadhaarDocumentUrl! })}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-emerald-700 text-xs font-bold rounded shadow-2xs transition"
                        >
                          👁️ View Aadhaar Copy
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-50/50 border border-dashed border-amber-200 rounded text-[11px] text-amber-800">
                        ⚠️ No Aadhaar document file attached at submission.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Authorized Sub-DSA Agreement & Digital Signature Audit */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                    <span>📜</span>
                    <span>Executed Sub-DSA Agreement & Legal Authorization</span>
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Digitally Authorized via OTP
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3 max-h-44 overflow-y-auto font-mono text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedPartner.agreementAuthorizedText ||
                    `SUB-DSA / REFERRAL PARTNER AGREEMENT\nExecuted electronically by ${selectedPartner.name} on ${selectedPartner.agreementSignedAt || selectedPartner.createdAt}.\n\nTerms & Undertakings:\n- Appointed as Referral Partner for loan lead sourcing.\n- Strict No-Cash collection policy accepted.\n- Consent & DPDP Act 2023 customer data privacy undertaking acknowledged.\n- Disbursed commission clawback and TDS 194H terms approved.`}
                </div>
                <p className="text-[10px] text-slate-400">
                  Audit Timestamp: <strong>{formatDateTime(selectedPartner.agreementSignedAt || selectedPartner.createdAt)}</strong> • DPDP 2023 Digital Execution Record
                </p>
              </div>

              {/* 4. Relationship Manager Assignment & Central Support Decision */}
              <div className="bg-gradient-to-br from-emerald-50/60 to-slate-50/60 border border-emerald-200/80 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <span>👔</span>
                  <span>Relationship Manager Assignment (Required for Approval)</span>
                </h3>

                {selectedPartner.assignedRmName && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                    <span className="text-base shrink-0">⚡</span>
                    <p className="text-[11px] text-emerald-950 leading-snug">
                      <strong>Auto-Assigned:</strong> This partner onboarded through the dedicated referral link of Relationship Manager <strong>{selectedPartner.assignedRmName}</strong>. Their profile has been pre-selected below.
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Select Assigned Relationship Manager (RM):
                    </label>
                    <Link
                      href="/admin/users"
                      target="_blank"
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-0.5"
                    >
                      <span>⚡ Bulk Create RMs</span>
                      <span>↗</span>
                    </Link>
                  </div>
                  <select
                    value={assignedRmId}
                    onChange={(e) => setAssignedRmId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Choose Relationship Manager --</option>
                    {currentUserId && (
                      <option value={currentUserId}>
                        {currentUserName} (Direct Branch Operations Desk)
                      </option>
                    )}
                    {relationshipManagers.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name} ({rm.branchName || 'Head Office'} • {rm.phone || rm.email})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    This RM will be officially appointed to manage this partner&apos;s cases, bank queries, and approvals.
                  </span>
                </div>

                {/* 4B. Commission Rate Configuration */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                  <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <span>💰</span>
                    <span>Agreed Commission Rate (%)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g. 1.50 (Leave empty to use system product defaults)"
                      value={commissionRateInput}
                      onChange={(e) => setCommissionRateInput(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none pr-8"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Configures standard payout commission rate for loans disbursed through this partner.
                  </span>
                </div>

                {/* If approved already, show Certificate of Association button */}
                {selectedPartner.partnerStatus === 'APPROVED' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">Certificate of Association</span>
                      <strong className="text-xs text-emerald-950">
                        {selectedPartner.certificateNumber || 'QFS-CERT-ACTIVE'}
                      </strong>
                      <span className="text-[10px] text-emerald-700 block">
                        Issued on {formatDate(selectedPartner.certificateIssuedAt || selectedPartner.approvedAt)}
                      </span>
                    </div>

                    <Link
                      href={`/partner/certificate?partnerId=${selectedPartner.id}`}
                      target="_blank"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                    >
                      <span>🎓 View Certificate</span>
                      <span>↗</span>
                    </Link>
                  </div>
                )}

                {/* Action Remark Textarea (when rejecting or requesting update) */}
                {actionType && (
                  <div className="pt-2 border-t border-emerald-100 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      {actionType === 'REQUEST_DOCS'
                        ? 'Specify Document Updates Required (Sent to Partner):'
                        : actionType === 'REJECT'
                        ? 'Reason for Application Rejection (Sent to Partner):'
                        : 'Optional Approval Remark:'}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={
                        actionType === 'REQUEST_DOCS'
                          ? 'e.g., Aadhaar card copy is blurry. Please upload a clear color scanned copy of front and back.'
                          : actionType === 'REJECT'
                          ? 'e.g., PAN and Aadhaar details mismatch with national records.'
                          : 'e.g., Verified against NSDL & UIDAI records. Approved.'
                      }
                      value={reviewRemark}
                      onChange={(e) => setReviewRemark(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={closeReviewModal}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {/* Mode 1: Confirmation triggers */}
                {actionType === 'APPROVE' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActionType(null)}
                      className="px-3 py-1.5 border border-slate-200 text-xs text-slate-600 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleApprove}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
                    >
                      {isSubmitting ? 'Approving…' : 'Confirm Approval & Issue Certificate ✓'}
                    </button>
                  </div>
                ) : actionType === 'REQUEST_DOCS' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActionType(null)}
                      className="px-3 py-1.5 border border-slate-200 text-xs text-slate-600 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleRequestDocs}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting…' : 'Send Update Request to Partner'}
                    </button>
                  </div>
                ) : actionType === 'REJECT' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActionType(null)}
                      className="px-3 py-1.5 border border-slate-200 text-xs text-slate-600 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleReject}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
                    >
                      {isSubmitting ? 'Rejecting…' : 'Confirm Rejection'}
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActionType('REJECT')}
                      className="px-3 py-2 border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-lg transition"
                    >
                      ✕ Reject Request
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionType('REQUEST_DOCS')}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold rounded-lg transition"
                    >
                      ⚠️ Request Update / Docs
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionType('APPROVE')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                    >
                      ✓ Approve Partner & Issue Certificate
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONBOARD DIRECT PROJECT SITE MODAL                                         */}
      {/* ========================================================================= */}
      {showAddSiteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <span className="text-base">🏗️</span>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Onboard & Approve Construction Site (APF)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSiteModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSite} className="p-5 space-y-3.5 text-xs">
              {siteFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    siteFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {siteFeedback.message}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Project / Construction Site Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Acres Residency"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Developer / Builder Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Prestige Group"
                    value={siteDeveloper}
                    onChange={(e) => setSiteDeveloper(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Site Code (Leave blank to auto-gen)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STR-ST-101"
                    value={siteCode}
                    onChange={(e) => setSiteCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Site Location Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Survey No. 42, Powai Naka, Satara"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Site Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={sitePhone}
                    onChange={(e) => setSitePhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Site Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="sales@project.com"
                    value={siteEmail}
                    onChange={(e) => setSiteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Assign Dedicated Site Relationship Manager (RM)
                </label>
                <select
                  value={siteDedicatedRmId}
                  onChange={(e) => setSiteDedicatedRmId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- No Dedicated RM (Can assign later) --</option>
                  {currentUserId && (
                    <option value={currentUserId}>
                      {currentUserName} (Direct Branch Operations Desk)
                    </option>
                  )}
                  {relationshipManagers.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.name} ({rm.phone || rm.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSiteModal(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={siteLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-2xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {siteLoading ? 'Onboarding Site…' : '✓ Onboard & Approve Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT PROJECT SITE MODAL                                                   */}
      {/* ========================================================================= */}
      {editingSite && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <span className="text-base">✏️</span>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Edit Construction Site: {editingSite.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingSite(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSite} className="p-5 space-y-3.5 text-xs">
              {siteFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    siteFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {siteFeedback.message}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Project / Construction Site Name *
                </label>
                <input
                  type="text"
                  required
                  value={editSiteName}
                  onChange={(e) => setEditSiteName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Developer / Builder Name
                  </label>
                  <input
                    type="text"
                    value={editSiteDeveloper}
                    onChange={(e) => setEditSiteDeveloper(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Site Code
                  </label>
                  <input
                    type="text"
                    value={editSiteCode}
                    onChange={(e) => setEditSiteCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Site Location Address
                </label>
                <input
                  type="text"
                  value={editSiteAddress}
                  onChange={(e) => setEditSiteAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Site Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={editSitePhone}
                    onChange={(e) => setEditSitePhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Site Contact Email
                  </label>
                  <input
                    type="email"
                    value={editSiteEmail}
                    onChange={(e) => setEditSiteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Dedicated Site Relationship Manager (RM)
                </label>
                <select
                  value={editSiteDedicatedRmId}
                  onChange={(e) => setEditSiteDedicatedRmId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- No Dedicated RM --</option>
                  {currentUserId && (
                    <option value={currentUserId}>
                      {currentUserName} (Direct Branch Operations Desk)
                    </option>
                  )}
                  {relationshipManagers.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.name} ({rm.phone || rm.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSite(null)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={siteLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {siteLoading ? 'Saving Changes…' : '✓ Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT PREVIEW LIGHTBOX                                                 */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900">{previewDoc.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="w-6 h-6 rounded text-slate-400 hover:text-slate-700 text-sm font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-100 min-h-[300px]">
              {previewDoc.url.startsWith('data:image') || previewDoc.url.includes('.png') || previewDoc.url.includes('.jpg') || previewDoc.url.includes('.jpeg') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-[500px] w-auto object-contain rounded border border-slate-300 shadow-sm"
                />
              ) : (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  className="w-full h-[500px] border-0"
                />
              )}
            </div>
            <div className="p-2.5 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
