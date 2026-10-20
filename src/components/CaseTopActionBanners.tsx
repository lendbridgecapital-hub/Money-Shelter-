'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LoanApplication, RequiredDocumentItem, User } from '@/types/db';
import { formatCurrencyINR, formatDateTime } from '@/lib/format';
import {
  uploadRequiredDocumentFileAction,
  submitRemarkAction,
} from '@/actions/workflowActions';

interface Props {
  application: LoanApplication;
  currentUser: User;
  requiredDocs: RequiredDocumentItem[];
  baseUrl: string;
}

export default function CaseTopActionBanners({
  application,
  currentUser,
  requiredDocs,
  baseUrl,
}: Props) {
  const router = useRouter();

  const isOpsOrAdmin =
    currentUser.role === 'OPERATIONS' ||
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'CENTRAL_SUPPORT';
  const isPartner = currentUser.role === 'CHANNEL_PARTNER';
  const isRM = currentUser.role === 'RELATIONSHIP_MANAGER';
  const canUpload = isPartner || isOpsOrAdmin || isRM;

  // Upload Document Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [targetDoc, setTargetDoc] = useState<RequiredDocumentItem | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Request More Docs Modal State (For Ops/Admin)
  const [showRequestDocsModal, setShowRequestDocsModal] = useState(false);
  const [selectedDocsList, setSelectedDocsList] = useState<string[]>([]);
  const [customDocInput, setCustomDocInput] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Link copy state
  const [copiedLink, setCopiedLink] = useState<'offer' | null>(null);
  const [bannerFeedback, setBannerFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const rawOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : baseUrl || '';
  const isInvalid =
    !rawOrigin ||
    rawOrigin.includes('localhost') ||
    rawOrigin.startsWith('capacitor:') ||
    rawOrigin.includes('onrender.com') ||
    rawOrigin.includes('render.com');
  const origin = isInvalid ? 'https://money-shelter.vercel.app' : rawOrigin;
  const offerUrl = `${origin}/offer/${application.token}`;

  function copyToClipboard(url: string, type: 'offer') {
    navigator.clipboard.writeText(url);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2500);
  }

  // Handle Document Upload
  function openUploadModal(doc: RequiredDocumentItem) {
    setTargetDoc(doc);
    setUploadFile(null);
    setUploadNote('');
    setUploadError(null);
    setShowUploadModal(true);
  }

  async function handleConfirmUpload() {
    if (!targetDoc || !uploadFile) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('applicationId', application.id);
    formData.append('requiredDocId', targetDoc.id);
    formData.append('file', uploadFile);
    formData.append('note', uploadNote.trim());

    const res = await uploadRequiredDocumentFileAction(formData);
    setIsUploading(false);

    if (res.ok) {
      setShowUploadModal(false);
      setTargetDoc(null);
      setUploadFile(null);
      setUploadNote('');
      setBannerFeedback({
        type: 'success',
        message: res.message || `Uploaded ${targetDoc.documentTitle} successfully!`,
      });
      router.refresh();
    } else {
      setUploadError(res.error || 'Failed to upload document file. Please try again.');
    }
  }

  // Handle Request More Docs (Ops/Admin)
  const commonDocSuggestions = [
    'Latest 3 Months Salary Slips',
    'Bank Statement for Last 6 Months',
    'Form 16 / ITR of Assessment Year 2024-25',
    'Property Sale Agreement / Index II',
    'Electricity / Utility Bill for Residence Proof',
    'Co-applicant PAN & Aadhaar KYC',
    'Business GST Returns / Udhyam Aadhar',
  ];

  function toggleDocSelection(doc: string) {
    if (selectedDocsList.includes(doc)) {
      setSelectedDocsList(selectedDocsList.filter((d) => d !== doc));
    } else {
      setSelectedDocsList([...selectedDocsList, doc]);
    }
  }

  function addCustomDoc() {
    if (customDocInput.trim() && !selectedDocsList.includes(customDocInput.trim())) {
      setSelectedDocsList([...selectedDocsList, customDocInput.trim()]);
      setCustomDocInput('');
    }
  }

  async function handleSendDocRequest() {
    if (selectedDocsList.length === 0 && !requestNote.trim()) {
      alert('Please specify at least one required document or write an operational note.');
      return;
    }

    setIsSubmittingRequest(true);
    const res = await submitRemarkAction(
      application.id,
      'DOCUMENTS_REQUIRED',
      requestNote.trim() || 'Additional documents requested by Operations.',
      selectedDocsList
    );
    setIsSubmittingRequest(false);

    if (res.ok) {
      setShowRequestDocsModal(false);
      setSelectedDocsList([]);
      setRequestNote('');
      setBannerFeedback({
        type: 'success',
        message: 'Document request sent to applicant & partner.',
      });
      router.refresh();
    } else {
      alert(res.error || 'Failed to send document request.');
    }
  }

  // Check which sections need to render
  const showDocsRequiredSection =
    application.status === 'DOCUMENTS_REQUIRED' || requiredDocs.length > 0;
  const showOfferSection =
    application.status === 'APPROVED' ||
    application.status === 'CUSTOMER_ACCEPTED' ||
    application.status === 'DISBURSED';
  const showSanctionAcceptedSection = application.status === 'CUSTOMER_ACCEPTED';
  const showDisbursedSection = application.status === 'DISBURSED';

  const hasAnyBanner =
    showDocsRequiredSection ||
    showOfferSection ||
    showSanctionAcceptedSection ||
    showDisbursedSection ||
    bannerFeedback;

  if (!hasAnyBanner) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Banner Feedback */}
      {bannerFeedback && (
        <div
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs ${
            bannerFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{bannerFeedback.message}</span>
          <button
            type="button"
            onClick={() => setBannerFeedback(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-3"
          >
            ×
          </button>
        </div>
      )}

      {/* 1. DOCUMENTS REQUIRED SECTION ON TOP */}
      {showDocsRequiredSection && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-ping" />
                Action Required: Additional Documents Requested
              </p>
              <p className="text-xs text-amber-900 mt-1">
                Bank underwriting requires supplementary documentation. Upload the requested files
                below to resume processing.
              </p>
            </div>
            {isOpsOrAdmin && (
              <button
                type="button"
                onClick={() => setShowRequestDocsModal(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <span>+ Request More Docs</span>
              </button>
            )}
          </div>

          {/* Checklist Cards */}
          {requiredDocs.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-amber-200/80">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                Requested Documents Checklist ({requiredDocs.filter((d) => d.status === 'PENDING').length} Pending):
              </h4>
              <div className="grid gap-2">
                {requiredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-white border border-amber-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{doc.documentTitle}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            doc.status === 'UPLOADED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                      {doc.uploadedAt && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Uploaded on {formatDateTime(doc.uploadedAt)}
                        </p>
                      )}
                    </div>

                    <div>
                      {doc.status === 'UPLOADED' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <span>✓</span> Uploaded
                          </span>
                          <a
                            href={doc.uploadedFileUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition"
                          >
                            View File ↗
                          </a>
                        </div>
                      ) : canUpload ? (
                        <button
                          type="button"
                          onClick={() => openUploadModal(doc)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Upload Document ⤒</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Waiting on Partner / RM</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. SANCTION ACCEPTANCE BANNER */}
      {showSanctionAcceptedSection && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div>
            <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Customer Has Accepted Sanction Letter!
            </p>
            <p className="text-xs text-indigo-800 mt-1">
              Reference: <strong>{application.acceptanceLetterRef || 'QFS-SANCT-VERIFIED'}</strong>.
              Operations team can now forward this signed acceptance to the bank for loan disbursement.
            </p>
          </div>
          <Link
            href={`/offer/${application.token}`}
            target="_blank"
            className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            📄 View Acceptance Letter
          </Link>
        </div>
      )}

      {/* 3. CUSTOMER OFFER PORTAL LINK */}
      {showOfferSection && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-200/60 text-emerald-800 rounded">
              Customer Offer Portal
            </span>
            <p className="text-xs font-bold text-emerald-950 mt-1">Sanction Acceptance Link</p>
            <p className="text-xs text-slate-500 font-mono truncate max-w-sm">{offerUrl}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(offerUrl, 'offer')}
              className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
            >
              {copiedLink === 'offer' ? '✓ Copied Offer Link' : 'Copy Offer Link'}
            </button>
            <Link
              href={`/offer/${application.token}`}
              target="_blank"
              className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-xs transition"
            >
              Open Offer & Letter ↗
            </Link>
          </div>
        </div>
      )}

      {/* 4. DISBURSED COMMISSION SUMMARY */}
      {showDisbursedSection && (
        <div className="bg-emerald-600 text-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs uppercase font-medium text-emerald-100 tracking-wider">Loan Disbursed</p>
              <p className="text-2xl font-black mt-0.5">
                {formatCurrencyINR(application.disbursedAmount || application.approvedAmount || 0)}
              </p>
            </div>
            {application.commissionAmount !== undefined && application.commissionAmount !== null && (
              <div className="text-right">
                <p className="text-xs uppercase font-medium text-emerald-100 tracking-wider">Partner Commission</p>
                <p className="text-xl font-bold text-emerald-100 mt-0.5">
                  {formatCurrencyINR(application.commissionAmount)}
                </p>
                <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded text-emerald-200">
                  Status: {application.commissionStatus || 'PENDING'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && targetDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upload Required Document</h3>
                <p className="text-xs text-slate-500">{targetDoc.documentTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {uploadError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Choose Document File (PDF, PNG, JPG, JPEG):
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setUploadFile(f);
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Remarks / Reference Note:
                </label>
                <textarea
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  placeholder="e.g. Certified bank statement copy with seal"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="px-3.5 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={!uploadFile || isUploading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                {isUploading ? 'Uploading Document…' : '⤒ Upload & Submit Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST MORE DOCS MODAL (OPS/ADMIN) */}
      {showRequestDocsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Request Additional Documents</h3>
                <p className="text-xs text-slate-500">
                  Select required documents and notify applicant & channel partner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestDocsModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Quick Suggestions Checklist */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Check Requested Documents:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                {commonDocSuggestions.map((doc) => (
                  <label
                    key={doc}
                    className="flex items-center gap-2 text-xs text-slate-700 p-1.5 hover:bg-white rounded cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocsList.includes(doc)}
                      onChange={() => toggleDocSelection(doc)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                    />
                    <span className="text-[11px] font-medium leading-tight">{doc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Document Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Add Custom Document:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customDocInput}
                  onChange={(e) => setCustomDocInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomDoc();
                    }
                  }}
                  placeholder="e.g. Rental Agreement / Form 26AS"
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomDoc}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Currently Selected Badges */}
            {selectedDocsList.length > 0 && (
              <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1.5">
                  Selected Items ({selectedDocsList.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDocsList.map((doc) => (
                    <span
                      key={doc}
                      className="px-2 py-0.5 bg-white border border-amber-300 text-amber-900 text-[11px] font-semibold rounded-md flex items-center gap-1 shadow-2xs"
                    >
                      <span>{doc}</span>
                      <button
                        type="button"
                        onClick={() => toggleDocSelection(doc)}
                        className="text-amber-700 hover:text-amber-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Remarks / Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operational Query / Instructions for Partner:
              </label>
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Explain why these documents are required by underwriting..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRequestDocsModal(false)}
                disabled={isSubmittingRequest}
                className="px-3.5 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendDocRequest}
                disabled={isSubmittingRequest || (selectedDocsList.length === 0 && !requestNote.trim())}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 transition cursor-pointer"
              >
                {isSubmittingRequest ? 'Sending Request…' : 'Send Document Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
