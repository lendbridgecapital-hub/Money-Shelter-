'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User, Role, PartnerStatus } from '@/types/db';
import { PARTNER_STATUS_LABELS, formatDate, formatDateTime } from '@/lib/format';
import {
  approvePartnerAction,
  requestPartnerDocsAction,
  rejectPartnerAction,
} from '@/actions/partnerOnboardingActions';

interface Props {
  initialPartners: User[];
  relationshipManagers: User[];
  currentUserRole: Role;
  currentUserName: string;
}

export default function PartnerRequestsClient({
  initialPartners,
  relationshipManagers,
  currentUserRole,
  currentUserName,
}: Props) {
  const router = useRouter();

  // State
  const [selectedStatus, setSelectedStatus] = useState<PartnerStatus | 'ALL'>('PENDING_APPROVAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);

  // Review modal form states
  const [assignedRmId, setAssignedRmId] = useState<string>('');
  const [reviewRemark, setReviewRemark] = useState('');
  const [actionType, setActionType] = useState<'APPROVE' | 'REQUEST_DOCS' | 'REJECT' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Preview Modal for Document Images / PDFs
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  // Filter partners
  const filteredPartners = initialPartners.filter((p) => {
    const status = p.partnerStatus || 'APPROVED';
    if (selectedStatus !== 'ALL' && status !== selectedStatus) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = (p.name || '').toLowerCase().includes(q);
    const matchEmail = (p.email || '').toLowerCase().includes(q);
    const matchPhone = (p.phone || '').toLowerCase().includes(q);
    const matchPan = (p.panNumber || '').toLowerCase().includes(q);
    const matchCode = (p.partnerCode || '').toLowerCase().includes(q);
    return matchName || matchEmail || matchPhone || matchPan || matchCode;
  });

  // Status counts for badge tabs
  const countPending = initialPartners.filter((p) => (p.partnerStatus || 'APPROVED') === 'PENDING_APPROVAL').length;
  const countDocsReq = initialPartners.filter((p) => p.partnerStatus === 'DOCUMENTS_REQUIRED').length;
  const countApproved = initialPartners.filter((p) => (p.partnerStatus || 'APPROVED') === 'APPROVED').length;
  const countRejected = initialPartners.filter((p) => p.partnerStatus === 'REJECTED').length;

  const openReviewModal = (partner: User) => {
    setSelectedPartner(partner);
    setAssignedRmId(partner.assignedRmId || (relationshipManagers[0] ? relationshipManagers[0].id : ''));
    setReviewRemark('');
    setActionType(null);
    setFeedback(null);
  };

  const closeReviewModal = () => {
    setSelectedPartner(null);
    setActionType(null);
    setFeedback(null);
  };

  // Execution Handlers
  const handleApprove = async () => {
    if (!selectedPartner) return;
    if (!assignedRmId) {
      setFeedback({ type: 'error', message: 'Please select a Relationship Manager to assign.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await approvePartnerAction({
      partnerId: selectedPartner.id,
      assignedRmId,
      remark: reviewRemark.trim() || 'Verified and approved by Central Support.',
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
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              🛡️
            </span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              Central Support — Partner Onboarding Desk
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              {currentUserRole === 'CENTRAL_SUPPORT' ? 'Central Support Manager' : 'Executive Admin'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Verify submitted Sub-DSA applications, inspect PAN & Aadhaar documents, review authorized partner agreements, assign Branch Relationship Managers, and issue Certificates of Association.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/partner/onboard"
            target="_blank"
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5"
          >
            <span>🔗</span>
            <span>Public Onboard Form</span>
            <span>↗</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Strip */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedStatus('PENDING_APPROVAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              selectedStatus === 'ALL'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Requests ({initialPartners.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search partner, phone, PAN…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
            🔍
          </span>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        {filteredPartners.length === 0 ? (
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
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {partner.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {partner.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {partner.phone || 'No Phone'} • {partner.email}
                            </p>
                            {partner.partnerCode && (
                              <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1 rounded border border-emerald-200/60">
                                {partner.partnerCode}
                              </span>
                            )}
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
                    <strong className="text-slate-900">{selectedPartner.branchName || 'Head Office Pune'}</strong>
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
