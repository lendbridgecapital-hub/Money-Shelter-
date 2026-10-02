'use client';

import React, { useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import type { LoanApplication, LoanType } from '@/types/db';
import { formatCurrencyINR, LOAN_TYPE_LABELS, formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import { submitDirectPartnerLoanAction, createApplicationLinkAction } from '@/actions/applicationActions';

interface LoanOriginationHubProps {
  recentApplications: LoanApplication[];
  totalApplicationsCount: number;
  partnerName: string;
  partnerRole: string;
}

type PrimaryCategory = 'PERSONAL_LOAN' | 'HOME_LOAN' | 'BUSINESS_LOAN' | 'OTHER';

interface OtherSubOption {
  type: LoanType;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
}

const OTHER_SUB_OPTIONS: OtherSubOption[] = [
  {
    type: 'BALANCE_TRANSFER',
    title: 'Balance Transfer',
    subtitle: 'Transfer high-interest loans & save on monthly EMI',
    icon: '🔄',
    badge: 'Popular',
  },
  {
    type: 'EDUCATION_LOAN',
    title: 'Education Loan',
    subtitle: 'Domestic & overseas higher education funding',
    icon: '🎓',
    badge: 'Tax Benefit',
  },
  {
    type: 'GOLD_LOAN',
    title: 'Gold Loan',
    subtitle: 'Instant valuation & same-day emergency liquidity',
    icon: '🪙',
    badge: 'Instant Cash',
  },
  {
    type: 'LOAN_AGAINST_PROPERTY',
    title: 'Loan Against Property (LAP)',
    subtitle: 'Unlock high equity against residential/commercial property',
    icon: '🏢',
    badge: 'High Value',
  },
  {
    type: 'OTHERS',
    title: 'Custom / Other Loan',
    subtitle: 'Specialized machinery, working capital & tailor-made facilities',
    icon: '📑',
    badge: 'Custom',
  },
];

const PRESET_AMOUNTS = [
  { label: '+ ₹1L', value: 100000 },
  { label: '+ ₹5L', value: 500000 },
  { label: '+ ₹10L', value: 1000000 },
  { label: '+ ₹25L', value: 2500000 },
  { label: '+ ₹50L', value: 5000000 },
];

function formatIndianWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return '';
  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, '');
    return `₹${cr} Crore${Number(cr) > 1 ? 's' : ''}`;
  }
  if (num >= 100000) {
    const lk = (num / 100000).toFixed(2).replace(/\.00$/, '');
    return `₹${lk} Lakh${Number(lk) > 1 ? 's' : ''}`;
  }
  if (num >= 1000) {
    const th = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `₹${th} Thousand`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

export default function LoanOriginationHub({
  recentApplications,
  totalApplicationsCount,
  partnerName,
  partnerRole,
}: LoanOriginationHubProps) {
  // Navigation tab: Origination vs Recent Cases
  const [activeTab, setActiveTab] = useState<'ORIGINATE' | 'RECENT_CASES'>('ORIGINATE');

  // Category State
  const [primaryCategory, setPrimaryCategory] = useState<PrimaryCategory>('PERSONAL_LOAN');
  const [selectedSubLoanType, setSelectedSubLoanType] = useState<LoanType>('BALANCE_TRANSFER');
  const [isOtherModalOpen, setIsOtherModalOpen] = useState(false);

  // Mobile Application Tab State: 'CATEGORIES' (tiles only) vs 'FORM' (new tab opened for selected loan)
  const [mobileTab, setMobileTab] = useState<'CATEGORIES' | 'FORM'>('CATEGORIES');

  const handleSelectCategory = (cat: PrimaryCategory) => {
    setPrimaryCategory(cat);
    setMobileTab('FORM');
  };

  const handleSelectOtherSubOption = (subType: LoanType) => {
    setSelectedSubLoanType(subType);
    setPrimaryCategory('OTHER');
    setIsOtherModalOpen(false);
    setMobileTab('FORM');
  };

  // Active Loan Type computed
  const effectiveLoanType: LoanType =
    primaryCategory === 'OTHER' ? selectedSubLoanType : primaryCategory;

  // Form Field States
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [loanAmount, setLoanAmount] = useState<number | ''>(500000);
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');

  // File Upload States
  const [panFile, setPanFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const panInputRef = useRef<HTMLInputElement>(null);
  const aadhaarInputRef = useRef<HTMLInputElement>(null);

  // Link Generation State for Share with Customer
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [activeShareUrl, setActiveShareUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Form Submission Transitions & Feedback
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    applicationId: string;
    token: string;
    url?: string;
  } | null>(null);

  // Reset entire form
  const handleResetForm = () => {
    setFullName('');
    setMobile('');
    setEmail('');
    setLoanAmount(500000);
    setPanNumber('');
    setAadhaarNumber('');
    setPanFile(null);
    setAadhaarFile(null);
    setErrorMessage(null);
    setSuccessData(null);
    setMobileTab('CATEGORIES');
    if (panInputRef.current) panInputRef.current.value = '';
    if (aadhaarInputRef.current) aadhaarInputRef.current.value = '';
  };

  // Generate Customer Share Link for current loan category
  const handleGenerateShareLink = async () => {
    setShareLinkLoading(true);
    setCopiedLink(false);
    try {
      const res = await createApplicationLinkAction(effectiveLoanType);
      if (res.ok && res.url) {
        setActiveShareUrl(res.url);
        setShowShareModal(true);
      } else {
        const err = !res.ok ? res.error : 'Unable to generate link. Please verify account permissions.';
        alert(err || 'Unable to generate link.');
      }
    } catch {
      alert('Error communicating with server. Please try again.');
    } finally {
      setShareLinkLoading(false);
    }
  };

  // 1-Click Copy Link with Feedback Toast
  const handleCopyLink = (url: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  // Direct WhatsApp Share
  const handleShareWhatsApp = (url: string) => {
    const loanName = LOAN_TYPE_LABELS[effectiveLoanType] || effectiveLoanType;
    const msg = `Hello ${fullName.trim() || 'Sir/Madam'}, please complete your ${loanName} application with Quickfinsure securely by clicking the digital link below:\n\n${url}\n\nProcessed by: ${partnerName || 'Quickfinsure Advisor'}`;
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    const waUrl =
      cleanMobile.length === 10
        ? `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
    }
  };

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter the customer full name.');
      return;
    }
    if (!/^[0-9]{10}$/.test(mobile.trim())) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!loanAmount || Number(loanAmount) <= 0) {
      setErrorMessage('Please enter the required loan amount.');
      return;
    }

    if (panNumber.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.trim().toUpperCase())) {
      setErrorMessage('PAN format invalid. Must be 10 characters (e.g. ABCDE1234F).');
      return;
    }
    const cleanAadhaar = aadhaarNumber.replace(/\s+/g, '');
    if (cleanAadhaar && !/^[0-9]{12}$/.test(cleanAadhaar)) {
      setErrorMessage('Aadhaar format invalid. Must be 12 digits.');
      return;
    }

    const formData = new FormData();
    formData.append('fullName', fullName.trim());
    formData.append('mobile', mobile.trim());
    if (email.trim()) formData.append('email', email.trim().toLowerCase());
    formData.append('loanType', effectiveLoanType);
    formData.append('loanAmount', String(loanAmount));
    if (panNumber.trim()) formData.append('panNumber', panNumber.trim().toUpperCase());
    if (cleanAadhaar) formData.append('aadhaarNumber', cleanAadhaar);
    if (panFile) formData.append('panFile', panFile);
    if (aadhaarFile) formData.append('aadhaarFile', aadhaarFile);

    startSubmitTransition(async () => {
      try {
        const res = await submitDirectPartnerLoanAction(formData);
        if (res.ok && res.applicationId) {
          setSuccessData({
            applicationId: res.applicationId,
            token: res.token || '',
            url: res.url,
          });
        } else {
          setErrorMessage(res.error || 'Failed to submit loan requirement. Please try again.');
        }
      } catch (err) {
        setErrorMessage((err as Error).message || 'Server error while originating application.');
      }
    });
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Top Header & Mode Navigation */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            🚀
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Loan Origination Hub</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Staged to Link Shared
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Originate customer loan files or share instant self-apply links
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('ORIGINATE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ORIGINATE'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>✍️</span>
            <span>Originate Case</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RECENT_CASES')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'RECENT_CASES'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋</span>
            <span>Recent Cases ({totalApplicationsCount})</span>
          </button>
        </div>
      </div>

      {activeTab === 'RECENT_CASES' ? (
        /* View Recent Cases Table / Cards */
        <div className="p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700">Latest Active Cases</span>
            <Link
              href="/branch/requests"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition flex items-center gap-0.5"
            >
              <span>View Full Pipeline ({totalApplicationsCount})</span>
              <span>→</span>
            </Link>
          </div>

          {recentApplications.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs font-bold text-slate-700">No active applications found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Select a loan type above to originate your first case.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block md:hidden space-y-2">
                {recentApplications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/branch/requests/${app.id}`}
                    className="block p-3 rounded-xl bg-slate-50 border border-slate-200/80 active:bg-slate-100 transition shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                          {app.fullName ? app.fullName.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs truncate leading-tight">
                            {app.fullName || app.token}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {app.mobile || app.email || 'Awaiting Details'}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={app.status} size="sm" />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {app.loanAmount || app.approvedAmount
                            ? formatCurrencyINR(app.approvedAmount || app.loanAmount)
                            : '—'}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1.5">
                          {app.loanType ? LOAN_TYPE_LABELS[app.loanType] : 'General'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5">
                        Open →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <th className="px-3 py-1.5">Borrower</th>
                      <th className="px-3 py-1.5">Loan & Amount</th>
                      <th className="px-3 py-1.5">Flowchart Stage</th>
                      <th className="px-3 py-1.5">Date</th>
                      <th className="px-3 py-1.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {recentApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-2">
                          <p className="font-bold text-slate-900 leading-tight truncate max-w-[150px]">
                            {app.fullName || 'Unnamed Applicant'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {app.mobile || app.email || 'Awaiting Details'}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-800 leading-tight">
                            {app.loanAmount || app.approvedAmount
                              ? formatCurrencyINR(app.approvedAmount || app.loanAmount)
                              : '—'}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                            {app.loanType ? LOAN_TYPE_LABELS[app.loanType] : 'General Loan'}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={app.status} size="sm" />
                        </td>
                        <td className="px-3 py-2 text-[10px] text-slate-500 whitespace-nowrap">
                          {formatDate(app.createdAt)}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <Link
                            href={`/branch/requests/${app.id}`}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-0.5"
                          >
                            <span>Case File</span>
                            <span>→</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : successData ? (
        /* Success Screen */
        <div className="p-6 sm:p-8 text-center space-y-5 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
            ✓
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Staged to Link Shared Bucket
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">Loan Requirement Submitted!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Your case has been registered under reference{' '}
              <strong className="text-slate-800 font-mono">{successData.applicationId}</strong> and
              placed in the <strong>Link Shared Bucket</strong>.
            </p>
          </div>

          {/* Quick Sharing Toolbar */}
          {successData.url && (
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Customer Digital Apply Link:</span>
                {copiedLink && (
                  <span className="text-[11px] font-bold text-emerald-600 animate-pulse">
                    ✓ Copied to clipboard!
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={successData.url}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-700 font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(successData.url!)}
                  className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold shrink-0 transition"
                >
                  Copy
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(successData.url!)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <span>💬</span>
                  <span>Share on WhatsApp</span>
                </button>
                <Link
                  href={`/branch/requests/${successData.applicationId}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition text-center"
                >
                  <span>Open Case File →</span>
                </Link>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/branch/requests?status=LINK_SHARED"
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
            >
              Go to Link Shared Bucket ({totalApplicationsCount}) →
            </Link>
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              + Originate Another Loan
            </button>
          </div>
        </div>
      ) : (
        /* Origination Hub Form */
        <div className="p-3 sm:p-5 space-y-5">
          {/* 1. Loan Category Selection Grid (Only visible initially on mobile; always visible on desktop) */}
          <div className={mobileTab === 'FORM' ? 'hidden md:block' : 'block'}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                1. Select Loan Category
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">
                Active: {LOAN_TYPE_LABELS[effectiveLoanType] || effectiveLoanType}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Personal Loan */}
              <button
                type="button"
                onClick={() => handleSelectCategory('PERSONAL_LOAN')}
                className={`relative p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  primaryCategory === 'PERSONAL_LOAN'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-base">
                    👤
                  </div>
                  {primaryCategory === 'PERSONAL_LOAN' ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  ) : (
                    <span className="md:hidden text-[10px] font-bold text-emerald-600">Open →</span>
                  )}
                </div>
                <div className="mt-2.5">
                  <p className="text-xs font-bold text-slate-900 leading-tight">Personal Loan</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Instant Approval</p>
                </div>
              </button>

              {/* Home Loan */}
              <button
                type="button"
                onClick={() => handleSelectCategory('HOME_LOAN')}
                className={`relative p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  primaryCategory === 'HOME_LOAN'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-base">
                    🏠
                  </div>
                  {primaryCategory === 'HOME_LOAN' ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  ) : (
                    <span className="md:hidden text-[10px] font-bold text-emerald-600">Open →</span>
                  )}
                </div>
                <div className="mt-2.5">
                  <p className="text-xs font-bold text-slate-900 leading-tight">Home Loan</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Lowest ROI</p>
                </div>
              </button>

              {/* Business Loan */}
              <button
                type="button"
                onClick={() => handleSelectCategory('BUSINESS_LOAN')}
                className={`relative p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  primaryCategory === 'BUSINESS_LOAN'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-base">
                    🏢
                  </div>
                  {primaryCategory === 'BUSINESS_LOAN' ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  ) : (
                    <span className="md:hidden text-[10px] font-bold text-emerald-600">Open →</span>
                  )}
                </div>
                <div className="mt-2.5">
                  <p className="text-xs font-bold text-slate-900 leading-tight">Business Loan</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">High Ticket Funding</p>
                </div>
              </button>

              {/* Other Loans (Triggers Sub-Option Popup / Drawer) */}
              <button
                type="button"
                onClick={() => {
                  setPrimaryCategory('OTHER');
                  setIsOtherModalOpen(true);
                }}
                className={`relative p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  primaryCategory === 'OTHER'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-base">
                    ✨
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                    {primaryCategory === 'OTHER' ? 'Selected' : 'Options'}
                  </span>
                </div>
                <div className="mt-2.5">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {primaryCategory === 'OTHER'
                      ? LOAN_TYPE_LABELS[selectedSubLoanType] || 'Other Loans'
                      : 'Other Loans'}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    {primaryCategory === 'OTHER' ? 'Click to change ▾' : 'BT, Gold, Edu ▾'}
                  </p>
                </div>
              </button>
            </div>

            {/* Sub-Selection indicator badge when Other is active */}
            {primaryCategory === 'OTHER' && (
              <div className="mt-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📌</span>
                  <div>
                    <span className="text-[11px] font-bold text-purple-900">
                      Selected Category: {LOAN_TYPE_LABELS[selectedSubLoanType]}
                    </span>
                    <p className="text-[10px] text-purple-700">
                      {OTHER_SUB_OPTIONS.find((s) => s.type === selectedSubLoanType)?.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOtherModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 text-xs font-bold hover:bg-purple-100 transition shadow-2xs"
                  >
                    Change ▾
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileTab('FORM')}
                    className="md:hidden px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition shadow-2xs"
                  >
                    Open Form →
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Guidance Prompt */}
            <div className="md:hidden mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
              <p className="text-[11px] text-slate-600 font-medium">
                👆 Tap any loan category above to open the application form.
              </p>
            </div>
          </div>

          {/* Section 2 (Share Link) & Section 3 (Form): Hidden on mobile until category is selected, always visible on desktop */}
          <div className={mobileTab === 'CATEGORIES' ? 'hidden md:block space-y-4' : 'block space-y-4'}>
            {/* Mobile Dedicated Form Top Header Bar */}
            <div className="md:hidden flex items-center justify-between pb-3 border-b border-slate-200 bg-slate-50/70 -mx-3 -mt-3 p-3 rounded-t-2xl">
              <button
                type="button"
                onClick={() => setMobileTab('CATEGORIES')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs active:scale-95 transition"
              >
                <span>←</span>
                <span>Loan Options</span>
              </button>
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-extrabold border border-emerald-200">
                  {LOAN_TYPE_LABELS[effectiveLoanType] || effectiveLoanType}
                </span>
                {primaryCategory === 'OTHER' ? (
                  <button
                    type="button"
                    onClick={() => setIsOtherModalOpen(true)}
                    className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 text-[11px] font-bold"
                  >
                    Change ▾
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMobileTab('CATEGORIES')}
                    className="px-2 py-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold"
                  >
                    Switch
                  </button>
                )}
              </div>
            </div>

            {/* 2. Partner Action Mode & Share Link Option for Selected Loan Type */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">🔗</span>
                <p className="text-xs font-bold text-white">
                  Customer Self-Apply Link for {LOAN_TYPE_LABELS[effectiveLoanType]}
                </p>
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">
                Channel partner can fill form directly below OR share customer link via WhatsApp / Copy
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGenerateShareLink}
                disabled={shareLinkLoading}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold active:scale-95 transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {shareLinkLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span>📲 Share Link to Customer</span>
                    <span>↗</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 3. Direct Lead Entry Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                2. Applicant KYC & Loan Requirement
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                * Staged directly to Link Shared
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Customer Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">👤</span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter applicant's legal full name"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex">
                  <span className="px-2.5 py-2 text-xs font-bold text-slate-500 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">✉️</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul.sharma@example.com"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              {/* Loan Amount Required */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Loan Amount Required <span className="text-rose-500">*</span>
                  </label>
                  {typeof loanAmount === 'number' && loanAmount > 0 && (
                    <span className="text-[11px] font-extrabold text-emerald-700">
                      {formatIndianWords(loanAmount)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    required
                    min={10000}
                    step={10000}
                    value={loanAmount}
                    onChange={(e) =>
                      setLoanAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="500000"
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setLoanAmount((prev) => (Number(prev) || 0) + preset.value)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setLoanAmount(100000)}
                    className="px-1.5 py-0.5 rounded-lg text-slate-400 hover:text-slate-600 text-[10px] font-medium"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* KYC Section: PAN and Aadhaar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
              {/* PAN Card Field & Upload */}
              <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">💳</span>
                    <label className="text-xs font-bold text-slate-800">
                      PAN Card Details
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">10 Characters</span>
                </div>

                <input
                  type="text"
                  maxLength={10}
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />

                {/* PAN File Upload (Transparent Touch-Friendly Overlay) */}
                <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-2.5 text-center bg-white transition cursor-pointer">
                  <input
                    ref={panInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPanFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {panFile ? (
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-emerald-600 text-sm">📎</span>
                        <span className="font-bold text-slate-800 truncate text-[11px]">
                          {panFile.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(panFile.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPanFile(null);
                          if (panInputRef.current) panInputRef.current.value = '';
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:underline z-20 shrink-0 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="pointer-events-none flex items-center justify-center gap-1.5 text-slate-500">
                      <span className="text-sm">📷</span>
                      <span className="text-[11px] font-semibold">
                        Tap to Upload PAN Card Photo / PDF
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Aadhaar Card Field & Upload */}
              <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">🪪</span>
                    <label className="text-xs font-bold text-slate-800">
                      Aadhaar Card Details
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">12 Digits</span>
                </div>

                <input
                  type="text"
                  maxLength={14}
                  value={aadhaarNumber}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
                    setAadhaarNumber(formatted);
                  }}
                  placeholder="e.g. 1234 5678 9012"
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold tracking-wider border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />

                {/* Aadhaar File Upload (Transparent Touch-Friendly Overlay) */}
                <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-2.5 text-center bg-white transition cursor-pointer">
                  <input
                    ref={aadhaarInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAadhaarFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {aadhaarFile ? (
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-emerald-600 text-sm">📎</span>
                        <span className="font-bold text-slate-800 truncate text-[11px]">
                          {aadhaarFile.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(aadhaarFile.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAadhaarFile(null);
                          if (aadhaarInputRef.current) aadhaarInputRef.current.value = '';
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:underline z-20 shrink-0 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="pointer-events-none flex items-center justify-center gap-1.5 text-slate-500">
                      <span className="text-sm">📷</span>
                      <span className="text-[11px] font-semibold">
                        Tap to Upload Aadhaar Card Photo / PDF
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                <span>Submitting creates case in </span>
                <strong className="text-emerald-700 font-bold">Link Shared Bucket</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Staging Requirement...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application →</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Other Loan Sub-Option Popup / Modal */}
      {isOtherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Select Other Loan Sub-Category
                </h3>
                <p className="text-[11px] text-slate-500">
                  Choose specialized financing or balance transfer facility
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOtherModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {OTHER_SUB_OPTIONS.map((sub) => {
                const isSelected = selectedSubLoanType === sub.type;
                return (
                  <button
                    key={sub.type}
                    type="button"
                    onClick={() => handleSelectOtherSubOption(sub.type)}
                    className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center text-lg shrink-0">
                        {sub.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{sub.title}</p>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                            {sub.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          {sub.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white text-[10px]'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && '✓'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsOtherModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {showShareModal && activeShareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📲</span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Share Link for {LOAN_TYPE_LABELS[effectiveLoanType]}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Send to borrower for direct self-application
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Digital Apply Link</span>
                  {copiedLink && (
                    <span className="text-[11px] font-bold text-emerald-600 animate-pulse">
                      ✓ Copied!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activeShareUrl}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-700 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyLink(activeShareUrl)}
                    className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold shrink-0 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(activeShareUrl)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <span>💬</span>
                  <span>Share via WhatsApp</span>
                </button>
                <Link
                  href={activeShareUrl}
                  target="_blank"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition text-center"
                >
                  <span>Open & Preview Form ↗</span>
                </Link>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Token: {activeShareUrl.split('/apply/')[1]?.split('?')[0] || ''}</span>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="font-bold text-slate-600 hover:underline"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
