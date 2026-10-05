'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Bank, LoanApplication, OperationalRemark, RequiredDocumentItem, User } from '@/types/db';
import {
  sendToBankAction,
  submitRemarkAction,
  partnerUploadRequiredDocAction,
  uploadRequiredDocumentFileAction,
  approveCaseAction,
  disburseCaseAction,
} from '@/actions/workflowActions';
import { formatCurrencyINR, formatDateTime } from '@/lib/format';
import LoanEligibilityMatchModal from '@/components/LoanEligibilityMatchModal';
import EditCustomerInfoModal from '@/components/EditCustomerInfoModal';

interface Props {
  application: LoanApplication;
  currentUser: User;
  banks: Bank[];
  requiredDocs: RequiredDocumentItem[];
  remarks: OperationalRemark[];
  baseUrl: string;
}

export default function OperationalWorkflowPanel({
  application,
  currentUser,
  banks,
  requiredDocs,
  remarks,
  baseUrl,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ACTIONS' | 'REMARKS' | 'REQUIRED_DOCS'>('ACTIONS');

  // Modal / Form States
  const [showSendToBank, setShowSendToBank] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.id || '');
  const [bankNote, setBankNote] = useState('');

  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [remarkStatus, setRemarkStatus] = useState<string>(application.status);
  const [remarkText, setRemarkText] = useState('');
  const [selectedDocsList, setSelectedDocsList] = useState<string[]>([]);
  const [customDocInput, setCustomDocInput] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState(application.loanAmount || 1000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureMonths, setTenureMonths] = useState(60);
  const [approveBankId, setApproveBankId] = useState(application.bankId || banks[0]?.id || '');
  const [approveNote, setApproveNote] = useState('');

  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [disbursedAmount, setDisbursedAmount] = useState(application.approvedAmount || application.loanAmount || 1000000);
  const [disburseNote, setDisburseNote] = useState('');

  // Loan Eligibility Match Modal State
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);

  // Edit Customer Info Modal State
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);

  // Document Upload Window / Modal States
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [targetDocItem, setTargetDocItem] = useState<RequiredDocumentItem | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadDocNote, setUploadDocNote] = useState('');
  const [uploadModalError, setUploadModalError] = useState<string | null>(null);
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // General Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<'apply' | 'offer' | null>(null);

  const isOpsOrAdmin =
    currentUser.role === 'OPERATIONS' ||
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'CENTRAL_SUPPORT';
  const isPartner = currentUser.role === 'CHANNEL_PARTNER';
  const isRM = currentUser.role === 'RELATIONSHIP_MANAGER';
  const canUpload = isPartner || isOpsOrAdmin || isRM;

  const rawOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : (baseUrl || '');
  const isLocal = !rawOrigin || rawOrigin.includes('localhost') || rawOrigin.startsWith('capacitor:');
  const origin = isLocal ? 'https://quicfinsure.onrender.com' : rawOrigin;
  const applyUrl = `${origin}/apply/${application.token}`;
  const offerUrl = `${origin}/offer/${application.token}`;

  function copyToClipboard(url: string, type: 'apply' | 'offer') {
    navigator.clipboard.writeText(url);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2500);
  }

  // Handle Send to Bank
  async function handleSendToBank() {
    setLoading(true);
    setFeedback(null);
    const res = await sendToBankAction(application.id, selectedBankId, bankNote);
    setLoading(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Details sent to bank.' });
      setShowSendToBank(false);
      router.refresh();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to send to bank.' });
    }
  }

  // Handle Submit Remark & Docs
  async function handleSubmitRemark() {
    if (!remarkText.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a remark text.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    const res = await submitRemarkAction(
      application.id,
      remarkStatus as any,
      remarkText,
      selectedDocsList
    );
    setLoading(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Remark submitted.' });
      setShowRemarkModal(false);
      setRemarkText('');
      setSelectedDocsList([]);
      router.refresh();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to submit remark.' });
    }
  }

  // Handle Approve Case
  async function handleApproveCase() {
    setLoading(true);
    setFeedback(null);
    const res = await approveCaseAction(
      application.id,
      Number(approvedAmount),
      Number(interestRate),
      Number(tenureMonths),
      approveBankId,
      approveNote
    );
    setLoading(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Loan case approved!' });
      setShowApproveModal(false);
      router.refresh();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to approve case.' });
    }
  }

  // Handle Disburse Case
  async function handleDisburseCase() {
    setLoading(true);
    setFeedback(null);
    const res = await disburseCaseAction(application.id, Number(disbursedAmount), disburseNote);
    setLoading(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Disbursement logged!' });
      setShowDisburseModal(false);
      router.refresh();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to record disbursement.' });
    }
  }

  // Partner / Operator Document Upload Modal Handlers
  function openUploadDocModal(doc: RequiredDocumentItem) {
    setTargetDocItem(doc);
    setSelectedUploadFile(null);
    setUploadDocNote('');
    setUploadModalError(null);
    setShowUploadDocModal(true);
  }

  function closeUploadDocModal() {
    if (isSubmittingDoc) return;
    setShowUploadDocModal(false);
    setTargetDocItem(null);
    setSelectedUploadFile(null);
    setUploadDocNote('');
    setUploadModalError(null);
  }

  function handleFilePick(file: File | null) {
    if (!file) {
      setSelectedUploadFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadModalError('Selected file exceeds 10MB limit. Please choose a smaller file.');
      return;
    }
    setUploadModalError(null);
    setSelectedUploadFile(file);
  }

  async function handleConfirmUploadDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!targetDocItem) return;
    if (!selectedUploadFile) {
      setUploadModalError('Please choose or drag-and-drop a document file to attach.');
      return;
    }

    setIsSubmittingDoc(true);
    setUploadModalError(null);
    setFeedback(null);

    const formData = new FormData();
    formData.append('applicationId', application.id);
    formData.append('requiredDocId', targetDocItem.id);
    formData.append('file', selectedUploadFile);
    formData.append('note', uploadDocNote.trim());

    const res = await uploadRequiredDocumentFileAction(formData);
    setIsSubmittingDoc(false);

    if (res.ok) {
      setShowUploadDocModal(false);
      setSelectedUploadFile(null);
      setUploadDocNote('');
      setFeedback({
        type: 'success',
        message: res.message || `Uploaded ${targetDocItem.documentTitle} successfully!`,
      });
      router.refresh();
    } else {
      setUploadModalError(res.error || 'Failed to upload document file. Please try again.');
    }
  }

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

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
      {/* Header Tabs */}
      <div className="border-b border-slate-200 px-5 pt-3 flex items-center justify-between bg-slate-50/50">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ACTIONS')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'ACTIONS'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ⚡ Operational Workflow
          </button>
          <button
            onClick={() => setActiveTab('REQUIRED_DOCS')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'REQUIRED_DOCS'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📂 Required Docs
            {requiredDocs.filter((d) => d.status === 'PENDING').length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {requiredDocs.filter((d) => d.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('REMARKS')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'REMARKS'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            💬 Remarks & Audit Log
            <span className="text-[10px] text-slate-400 font-semibold">({remarks.length})</span>
          </button>
        </div>

        {/* Role Badge & Quick Edit Button */}
        <div className="flex items-center gap-2 pb-2">
          {isOpsOrAdmin && (
            <button
              type="button"
              onClick={() => setShowEditCustomerModal(true)}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-2xs active:scale-95"
              title="Edit customer information with mandatory audit remark"
            >
              <span>✏️</span>
              <span className="hidden sm:inline">Edit Customer Info</span>
              <span className="sm:hidden">Edit</span>
            </button>
          )}
          <span className="text-[11px] font-semibold text-slate-500">
            Role: <strong className="text-slate-800">{currentUser.role}</strong>
          </span>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`px-5 py-2.5 text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
              : 'bg-rose-50 text-rose-800 border-b border-rose-100'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-3">
            ×
          </button>
        </div>
      )}

      {/* TAB 1: ACTIONS */}
      {activeTab === 'ACTIONS' && (
        <div className="p-5 space-y-5">
          {/* Quick Links for Customer */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-950">Customer Application Link</p>
              <p className="text-xs text-slate-500 font-mono truncate max-w-sm mt-0.5">{applyUrl}</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button
                type="button"
                onClick={() => copyToClipboard(applyUrl, 'apply')}
                className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold rounded-lg shadow-xs transition"
              >
                {copiedLink === 'apply' ? '✓ Copied Link' : 'Copy Link'}
              </button>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Hello! I am your financial advisor ${application.channelPartnerName || currentUser.name || 'Financial Advisor'}, Please complete your loan application with Quickfinsure by uploading your documents here:\n\n${applyUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition inline-flex items-center gap-1.5"
              >
                <span>WhatsApp</span>
              </a>
              <a
                href={applyUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-lg shadow-xs transition"
              >
                Open Form ↗
              </a>
            </div>
          </div>

          {/* Documents Required Banner (Alerts RM, Partner, and Ops) */}
          {application.status === 'DOCUMENTS_REQUIRED' && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
              <div>
                <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-ping" />
                  Action Required: Operations Requested Additional Documents
                </p>
                <p className="text-xs text-amber-900 mt-1">
                  Bank sanction requires supplementary documentation. You or the customer can upload the requested files directly.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('REQUIRED_DOCS')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 shrink-0"
                >
                  📂 View & Upload Documents ({requiredDocs.filter((d) => d.status === 'PENDING').length} Pending) ➔
                </button>
              </div>
            </div>
          )}

          {/* If Approved or Customer Accepted: Show Offer Link */}
          {(application.status === 'APPROVED' ||
            application.status === 'CUSTOMER_ACCEPTED' ||
            application.status === 'DISBURSED') && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                  className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 text-xs font-semibold rounded-lg shadow-xs transition"
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

          {/* Sanction Letter Acceptance Banner (For Ops to submit to Bank) */}
          {application.status === 'CUSTOMER_ACCEPTED' && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

          {/* Disbursed Commission Summary */}
          {application.status === 'DISBURSED' && (
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

          {/* Documents In Bucket Matchmaking Banner */}
          {application.status === 'DOCUMENTS_IN' && isOpsOrAdmin && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 shadow-sm border border-indigo-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                    📂 Documents In Bucket
                  </span>
                  <span className="text-xs text-indigo-300 font-semibold">Underwriting & Matchmaking Ready</span>
                </div>
                <p className="text-xs text-slate-200 mt-1">
                  Applicant KYC & financial documents are in. Enter applicant CIBIL score to immediately evaluate live bank cards & find best interest rates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEligibilityModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <span>⚡</span>
                <span>Match Loan Eligibility & Rates</span>
              </button>
            </div>
          )}

          {/* ACTION BUTTONS TOOLBAR */}
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Flowchart Action Controls</h4>

            <div className="flex flex-wrap gap-2.5">
              {/* Operations & Admin: Loan Eligibility Match (Only in Documents In bucket) */}
              {isOpsOrAdmin && application.status === 'DOCUMENTS_IN' && (
                <button
                  type="button"
                  onClick={() => setShowEligibilityModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  ⚡ Loan Eligibility Match & Rates
                </button>
              )}

              {/* Operations & Admin: Send to Bank */}
              {isOpsOrAdmin && (
                <button
                  type="button"
                  onClick={() => setShowSendToBank(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  🏦 Send Details to Bank
                </button>
              )}

              {/* Operations & Admin: Edit Customer Information (Mandatory Remark Audit) */}
              {isOpsOrAdmin && (
                <button
                  type="button"
                  onClick={() => setShowEditCustomerModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 active:scale-95"
                >
                  ✏️ Edit Customer Information
                </button>
              )}

              {/* Operations, Admin, RM: Submit Remark */}
              {(isOpsOrAdmin || isRM) && (
                <button
                  type="button"
                  onClick={() => setShowRemarkModal(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  💬 Submit Remark & Query
                </button>
              )}

              {/* Operations & Admin: Approve Loan Case */}
              {isOpsOrAdmin && (
                <button
                  type="button"
                  onClick={() => setShowApproveModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  ✓ Approve Case (Bank Terms)
                </button>
              )}

              {/* Operations & Admin: Disburse Loan */}
              {isOpsOrAdmin && (
                <button
                  type="button"
                  onClick={() => setShowDisburseModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  💰 Record Final Disbursement
                </button>
              )}

              {/* Channel Partner & RM: Upload Required Documents */}
              {canUpload && (
                <button
                  type="button"
                  onClick={() => setActiveTab('REQUIRED_DOCS')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  📂 Upload Requested Documents
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REQUIRED DOCUMENTS (CHANNEL PARTNER UPLOAD WINDOW) */}
      {activeTab === 'REQUIRED_DOCS' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Required Documents Checklist</h3>
              <p className="text-xs text-slate-500">
                Documents requested by the Operations team for bank sanction approval.
              </p>
            </div>
            {isOpsOrAdmin && (
              <button
                type="button"
                onClick={() => {
                  setRemarkStatus('DOCUMENTS_REQUIRED');
                  setShowRemarkModal(true);
                }}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg transition"
              >
                + Request More Docs
              </button>
            )}
          </div>

          {requiredDocs.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200/80">
              <p className="text-xs text-slate-500">No additional documents are currently requested for this case.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {requiredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4"
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
                        onClick={() => openUploadDocModal(doc)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
                      >
                        Upload Document ⤒
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Waiting on Partner / RM</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REMARKS & AUDIT LOG */}
      {activeTab === 'REMARKS' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Operational Remarks & Queries</h3>
            {(isOpsOrAdmin || isRM) && (
              <button
                type="button"
                onClick={() => setShowRemarkModal(true)}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition"
              >
                + New Remark
              </button>
            )}
          </div>

          {remarks.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200/80">
              <p className="text-xs text-slate-500">No remarks logged yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {remarks.map((r) => (
                <div key={r.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {r.authorName}{' '}
                      <span className="text-[10px] font-normal text-slate-500">({r.authorRole})</span>
                    </span>
                    <span className="text-[11px] text-slate-400">{formatDateTime(r.createdAt)}</span>
                  </div>
                  {r.statusChangedTo && (
                    <div className="text-[11px] text-emerald-700 font-semibold">
                      Updated Status: <span className="bg-emerald-100 px-1.5 py-0.5 rounded">{r.statusChangedTo}</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{r.remark}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: SEND TO BANK */}
      {showSendToBank && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Send Details to Bank</h3>
              <button onClick={() => setShowSendToBank(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Lending Bank</label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.commissionPct}% base commission)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loan File / Submission Remarks</label>
              <textarea
                value={bankNote}
                onChange={(e) => setBankNote(e.target.value)}
                placeholder="e.g. Sent full KYC, income documents and property title documents via bank portal/email."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSendToBank(false)}
                className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendToBank}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {loading ? 'Submitting…' : 'Confirm & Dispatch to Bank'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT REMARK & REQUIRED DOCUMENTS */}
      {showRemarkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Submit Operational Remark</h3>
              <button onClick={() => setShowRemarkModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Dropdown</label>
              <select
                value={remarkStatus}
                onChange={(e) => setRemarkStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="DOCUMENTS_IN">Documents In</option>
                <option value="SENT_TO_BANK">Details Sent to Bank</option>
                <option value="DOCUMENTS_REQUIRED">Documents Required (Opens Upload Window for Partner)</option>
                <option value="APPROVED">Bank Approved</option>
                <option value="CUSTOMER_ACCEPTED">Customer Accepted</option>
                <option value="DISBURSED">Disbursed</option>
                <option value="REJECTED">Bank Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remark / Query Note (Will notify Partner & RM)
              </label>
              <textarea
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="Enter details of bank query, missing papers, or operational updates…"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* If DOCUMENTS_REQUIRED: Render required docs checklist */}
            {remarkStatus === 'DOCUMENTS_REQUIRED' && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-3">
                <span className="text-xs font-bold text-amber-900 block">
                  Select Required Documents from Partner:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {commonDocSuggestions.map((item) => (
                    <label key={item} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDocsList.includes(item)}
                        onChange={() => toggleDocSelection(item)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customDocInput}
                    onChange={(e) => setCustomDocInput(e.target.value)}
                    placeholder="Other specific document title…"
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={addCustomDoc}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRemarkModal(false)}
                className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRemark}
                disabled={loading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {loading ? 'Submitting…' : 'Submit & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: APPROVE CASE (BANK SANCTION TERMS) */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Approve Loan Case</h3>
                <p className="text-xs text-slate-500">Record bank approval terms and generate customer offer.</p>
              </div>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Approving Partner Bank</label>
              <select
                value={approveBankId}
                onChange={(e) => setApproveBankId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Amount (₹)</label>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Tenure (Months)</label>
              <input
                type="number"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sanction Remarks / Conditions</label>
              <textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="e.g. Sanction letter issued subject to title clear certificate."
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveCase}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {loading ? 'Approving…' : 'Approve & Issue Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RECORD FINAL DISBURSEMENT */}
      {showDisburseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Final Disbursement</h3>
                <p className="text-xs text-slate-500">Calculate partner commission and close file.</p>
              </div>
              <button onClick={() => setShowDisburseModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursed Loan Amount (₹)</label>
              <input
                type="number"
                value={disbursedAmount}
                onChange={(e) => setDisbursedAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-black focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-semibold text-slate-700">Commission Preview:</p>
              <p className="text-slate-600">
                Partner: <strong>{application.channelPartnerName || 'Assigned Partner'}</strong>
              </p>
              <p className="text-emerald-700 font-bold">
                Approx. Commission Payout: ~{formatCurrencyINR(Math.round((disbursedAmount * 1.0) / 100))} (at 1% slab)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Reference / Notes</label>
              <textarea
                value={disburseNote}
                onChange={(e) => setDisburseNote(e.target.value)}
                placeholder="UTR Number / Disbursal date / Bank reference"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDisburseModal(false)}
                className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisburseCase}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {loading ? 'Recording…' : 'Confirm Disbursement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: INTERACTIVE UPLOAD DOCUMENT WINDOW */}
      {showUploadDocModal && targetDocItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Document Upload Window
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                  <span>📎</span> Attach & Upload Document
                </h3>
              </div>
              <button
                type="button"
                onClick={closeUploadDocModal}
                disabled={isSubmittingDoc}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-md text-base leading-none transition"
              >
                ✕
              </button>
            </div>

            {/* Target Document Highlight */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Requested Document:
              </span>
              <p className="text-sm font-bold text-slate-900">{targetDocItem.documentTitle}</p>
              <p className="text-[11px] text-slate-500">
                This document will be saved directly to the loan file and immediately accessible to Central Support & Operations teams.
              </p>
            </div>

            {/* Error Notification inside modal */}
            {uploadModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>{uploadModalError}</span>
              </div>
            )}

            {/* File Dropzone Area */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Document File <span className="text-rose-500">*</span>
              </label>

              {!selectedUploadFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const f = e.dataTransfer.files?.[0] || null;
                    handleFilePick(f);
                  }}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer overflow-hidden ${
                    isDragOver
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    id="target-doc-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      handleFilePick(f);
                    }}
                  />
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl pointer-events-none">
                    ⤒
                  </div>
                  <p className="text-xs font-bold text-slate-800 pointer-events-none">
                    Tap to browse or select document file here
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 pointer-events-none">
                    Supports PDF, JPG, PNG, DOC, DOCX up to 10 MB
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {selectedUploadFile.name.split('.').pop()?.toUpperCase() || 'FILE'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {selectedUploadFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(selectedUploadFile.size / 1024).toFixed(1)} KB · Ready to upload
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUploadFile(null)}
                    disabled={isSubmittingDoc}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
                  >
                    Change File
                  </button>
                </div>
              )}
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks / Details for Central Support (Optional)
              </label>
              <textarea
                value={uploadDocNote}
                onChange={(e) => setUploadDocNote(e.target.value)}
                placeholder="e.g. Attached certified copy with bank seal for AY 2024-25"
                rows={2}
                disabled={isSubmittingDoc}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeUploadDocModal}
                disabled={isSubmittingDoc}
                className="px-3.5 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUploadDoc}
                disabled={!selectedUploadFile || isSubmittingDoc}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {isSubmittingDoc ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Uploading Document…</span>
                  </>
                ) : (
                  <>
                    <span>⤒</span>
                    <span>Upload & Submit Document</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Pre-filled Loan Eligibility Match Modal */}
      <LoanEligibilityMatchModal
        application={application}
        isOpen={showEligibilityModal}
        onClose={() => setShowEligibilityModal(false)}
        onAssigned={() => {
          router.refresh();
        }}
      />

      {/* Edit Customer Information Modal with Mandatory Remark */}
      <EditCustomerInfoModal
        application={application}
        isOpen={showEditCustomerModal}
        onClose={() => setShowEditCustomerModal(false)}
        onSaved={() => {
          setFeedback({
            type: 'success',
            message: 'Customer information updated and recorded in log history.',
          });
          setActiveTab('REMARKS');
          router.refresh();
        }}
      />
    </div>
  );
}
