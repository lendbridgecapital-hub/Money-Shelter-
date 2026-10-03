'use client';

import React, { useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import type { LoanApplication, LoanType, ApplicationStatus } from '@/types/db';
import { formatCurrencyINR, LOAN_TYPE_LABELS, formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import { submitDirectPartnerLoanAction, createApplicationLinkAction } from '@/actions/applicationActions';
import LoanCalculator, { CalculatorLoanType } from '@/components/LoanCalculator';

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
  // Category State
  const [primaryCategory, setPrimaryCategory] = useState<PrimaryCategory>('PERSONAL_LOAN');
  const [selectedSubLoanType, setSelectedSubLoanType] = useState<LoanType>('BALANCE_TRANSFER');
  const [isOtherModalOpen, setIsOtherModalOpen] = useState(false);

  // Active Calculator Loan Type ('HOME_LOAN' | 'PERSONAL_LOAN')
  const [calculatorType, setCalculatorType] = useState<CalculatorLoanType>('PERSONAL_LOAN');
  const formRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<HTMLDivElement>(null);

  const handleSelectCategory = (cat: PrimaryCategory) => {
    setPrimaryCategory(cat);
    if (cat === 'HOME_LOAN' || cat === 'PERSONAL_LOAN') {
      setCalculatorType(cat);
    }
  };

  const handleSelectOtherSubOption = (subType: LoanType) => {
    setSelectedSubLoanType(subType);
    setPrimaryCategory('OTHER');
    setIsOtherModalOpen(false);
  };

  const handleCalculatorApply = (payload: {
    loanType: CalculatorLoanType;
    loanAmount: number;
    tenureMonths: number;
    emi: number;
  }) => {
    setPrimaryCategory(payload.loanType);
    setCalculatorType(payload.loanType);
    setLoanAmount(payload.loanAmount);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCalculatorTypeChange = (type: CalculatorLoanType) => {
    setCalculatorType(type);
    setPrimaryCategory(type);
  };

  // Active Loan Type computed
  const effectiveLoanType: LoanType =
    primaryCategory === 'OTHER' ? selectedSubLoanType : primaryCategory;

  // Form Field States
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [loanAmount, setLoanAmount] = useState<number | ''>(500000);
  const [monthlyIncome, setMonthlyIncome] = useState<number | ''>('');
  const [existingEmi, setExistingEmi] = useState<number | ''>('');
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
    status?: ApplicationStatus;
    emailSent?: boolean;
    customerEmail?: string;
  } | null>(null);

  // Reset entire form
  const handleResetForm = () => {
    setFullName('');
    setMobile('');
    setEmail('');
    setLoanAmount(500000);
    setMonthlyIncome('');
    setExistingEmi('');
    setPanNumber('');
    setAadhaarNumber('');
    setPanFile(null);
    setAadhaarFile(null);
    setErrorMessage(null);
    setSuccessData(null);
    if (panInputRef.current) panInputRef.current.value = '';
    if (aadhaarInputRef.current) aadhaarInputRef.current.value = '';
  };

  // Generate Customer Share Link for current loan category
  const handleGenerateShareLink = async () => {
    setShareLinkLoading(true);
    setCopiedLink(false);
    try {
      const res = await createApplicationLinkAction(effectiveLoanType);
      if (res && res.ok && res.url) {
        setActiveShareUrl(res.url);
        setShowShareModal(true);
      } else {
        const err = (res && !res.ok ? res.error : null) || 'Unable to generate link. Your session may have expired. Please refresh or sign in again.';
        alert(err);
      }
    } catch (e) {
      alert((e as Error)?.message || 'Error communicating with server. Please try again.');
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

  // Helper to compress oversized mobile camera photos before upload
  const compressImageIfNeeded = async (file: File): Promise<File> => {
    if (typeof window === 'undefined' || !file.type.startsWith('image/') || file.size <= 1.5 * 1024 * 1024) {
      return file;
    }
    try {
      return await new Promise<File>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1600;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(file);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (blob && blob.size < file.size) {
                  resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                } else {
                  resolve(file);
                }
              },
              'image/jpeg',
              0.82
            );
          };
          img.onerror = () => resolve(file);
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
      });
    } catch {
      return file;
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

    startSubmitTransition(async () => {
      try {
        const finalPan = panFile ? await compressImageIfNeeded(panFile) : null;
        const finalAadhaar = aadhaarFile ? await compressImageIfNeeded(aadhaarFile) : null;

        const formData = new FormData();
        formData.append('fullName', fullName.trim());
        formData.append('mobile', mobile.trim());
        if (email.trim()) formData.append('email', email.trim().toLowerCase());
        formData.append('loanType', effectiveLoanType);
        formData.append('loanAmount', String(loanAmount));
        if (monthlyIncome !== '') formData.append('monthlyIncome', String(monthlyIncome));
        if (existingEmi !== '') formData.append('existingEmi', String(existingEmi));
        if (panNumber.trim()) formData.append('panNumber', panNumber.trim().toUpperCase());
        if (cleanAadhaar) formData.append('aadhaarNumber', cleanAadhaar);
        if (finalPan) formData.append('panFile', finalPan);
        if (finalAadhaar) formData.append('aadhaarFile', finalAadhaar);

        const res = await submitDirectPartnerLoanAction(formData);
        if (res && res.ok && res.applicationId) {
          setSuccessData({
            applicationId: res.applicationId,
            token: res.token || '',
            url: res.url,
            status: res.status,
            emailSent: res.emailSent,
            customerEmail: email.trim() || undefined,
          });
        } else {
          const errText = (res && res.error) || 'Unable to submit loan requirement. Please check your network connection or try again.';
          console.error('[LoanOriginationHub] Submission rejected:', res);
          setErrorMessage(errText);
        }
      } catch (err) {
        console.error('[LoanOriginationHub] Submission error:', err);
        setErrorMessage((err as Error).message || 'Server error while originating application.');
      }
    });
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {successData ? (
        /* Success Screen */
        <div className="p-5 sm:p-8 text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
            ✓
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {successData.status === 'DOCUMENTS_IN' ? 'Stored in System — Documents In' : 'Stored in System — Lead Registered'}
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">Customer Request Registered!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Your case has been registered under ID{' '}
              <strong className="text-slate-800 font-mono">{successData.applicationId}</strong> and stored permanently on the Quickfinsure platform.
            </p>
          </div>

          {/* Mail & Database Status Card */}
          <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 text-left space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <span className="text-sm">🗄️</span>
              <span>Main System & Database:</span>
              <span className="ml-auto text-emerald-700 font-extrabold">✓ Stored & Synced</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <span className="text-sm">📧</span>
              <span>Mail & Notification System:</span>
              <span className="ml-auto text-emerald-700 font-extrabold">
                {successData.emailSent ? '✓ Dispatched via SMTP' : '✓ Stored in Outbox'}
              </span>
            </div>
            {successData.customerEmail && (
              <p className="text-[11px] text-slate-600 pt-1 border-t border-emerald-200/60">
                Customer confirmation email directed to: <strong className="text-slate-800">{successData.customerEmail}</strong>
              </p>
            )}
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
              href="/branch/requests"
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <span>📁</span>
              <span>View in Loan Pipeline / Cases →</span>
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
        <div className="p-2.5 sm:p-4 space-y-3.5 sm:space-y-4">
          {/* 1. Compact Loan Category Tabs (All 4 visible in 1 frame) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-600">
                1. Select Loan Category
              </span>
              <span className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold truncate max-w-[170px]">
                Active: {LOAN_TYPE_LABELS[effectiveLoanType] || effectiveLoanType}
              </span>
            </div>

            {/* 4 Loan Option Tabs: Compact, 1 Frame, grid-cols-4 */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {/* Personal Loan */}
              <button
                type="button"
                onClick={() => handleSelectCategory('PERSONAL_LOAN')}
                className={`relative p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center min-h-[58px] sm:min-h-[66px] active:scale-95 ${
                  primaryCategory === 'PERSONAL_LOAN'
                    ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs font-bold'
                    : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                {primaryCategory === 'PERSONAL_LOAN' && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                )}
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-100/90 text-blue-700 flex items-center justify-center text-xs sm:text-sm mb-0.5 shrink-0">
                  👤
                </div>
                <p className="text-[10px] sm:text-xs font-bold leading-tight truncate w-full">
                  <span className="sm:hidden">Personal</span>
                  <span className="hidden sm:inline">Personal Loan</span>
                </p>
                <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium leading-none mt-0.5 truncate block">
                  Loan
                </span>
              </button>

              {/* Home Loan */}
              <button
                type="button"
                onClick={() => handleSelectCategory('HOME_LOAN')}
                className={`relative p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center min-h-[58px] sm:min-h-[66px] active:scale-95 ${
                  primaryCategory === 'HOME_LOAN'
                    ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs font-bold'
                    : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                {primaryCategory === 'HOME_LOAN' && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                )}
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100/90 text-emerald-700 flex items-center justify-center text-xs sm:text-sm mb-0.5 shrink-0">
                  🏠
                </div>
                <p className="text-[10px] sm:text-xs font-bold leading-tight truncate w-full">
                  <span className="sm:hidden">Home</span>
                  <span className="hidden sm:inline">Home Loan</span>
                </p>
                <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium leading-none mt-0.5 truncate block">
                  Loan
                </span>
              </button>

              {/* Business Loan */}
              <button
                type="button"
                onClick={() => handleSelectCategory('BUSINESS_LOAN')}
                className={`relative p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center min-h-[58px] sm:min-h-[66px] active:scale-95 ${
                  primaryCategory === 'BUSINESS_LOAN'
                    ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs font-bold'
                    : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                {primaryCategory === 'BUSINESS_LOAN' && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                )}
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-100/90 text-amber-700 flex items-center justify-center text-xs sm:text-sm mb-0.5 shrink-0">
                  🏢
                </div>
                <p className="text-[10px] sm:text-xs font-bold leading-tight truncate w-full">
                  <span className="sm:hidden">Business</span>
                  <span className="hidden sm:inline">Business Loan</span>
                </p>
                <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium leading-none mt-0.5 truncate block">
                  Loan
                </span>
              </button>

              {/* Other Loans */}
              <button
                type="button"
                onClick={() => {
                  setPrimaryCategory('OTHER');
                  setIsOtherModalOpen(true);
                }}
                className={`relative p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center min-h-[58px] sm:min-h-[66px] active:scale-95 ${
                  primaryCategory === 'OTHER'
                    ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs font-bold'
                    : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                {primaryCategory === 'OTHER' && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                )}
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-100/90 text-purple-700 flex items-center justify-center text-xs sm:text-sm mb-0.5 shrink-0">
                  ✨
                </div>
                <p className="text-[10px] sm:text-xs font-bold leading-tight truncate w-full">
                  {primaryCategory === 'OTHER' ? (
                    <span>{LOAN_TYPE_LABELS[selectedSubLoanType] || 'Other'}</span>
                  ) : (
                    <>
                      <span className="sm:hidden">Other</span>
                      <span className="hidden sm:inline">Other Loans</span>
                    </>
                  )}
                </p>
                <span className="text-[8px] sm:text-[9px] text-purple-700 font-semibold leading-none mt-0.5 truncate block">
                  {primaryCategory === 'OTHER' ? 'Change ▾' : 'BT, Gold ▾'}
                </span>
              </button>
            </div>

            {/* Sub-Selection indicator badge when Other is active */}
            {primaryCategory === 'OTHER' && (
              <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-purple-50/80 border border-purple-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-xs">📌</span>
                  <span className="text-[11px] font-bold text-purple-900 truncate">
                    Selected: {LOAN_TYPE_LABELS[selectedSubLoanType]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsOtherModalOpen(true)}
                    className="px-2 py-0.5 rounded bg-white border border-purple-200 text-purple-700 text-[10px] font-bold hover:bg-purple-100 transition shadow-2xs"
                  >
                    Change ▾
                  </button>
                  <button
                    type="button"
                    onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="md:hidden px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold"
                  >
                    Form ↓
                  </button>
                </div>
              </div>
            )}

            {/* Quick jump anchor links on mobile */}
            <div className="md:hidden mt-2.5 flex items-center justify-between gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/70 text-xs">
              <button
                type="button"
                onClick={() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="flex-1 py-1.5 px-2 rounded-lg font-bold bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200 text-center flex items-center justify-center gap-1"
              >
                <span>🧮</span>
                <span>EMI Calculator</span>
              </button>
              <button
                type="button"
                onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="flex-1 py-1.5 px-2 rounded-lg font-bold text-slate-700 hover:text-slate-900 bg-white/70 hover:bg-white text-center flex items-center justify-center gap-1"
              >
                <span>📝</span>
                <span>Apply / Form ↓</span>
              </button>
            </div>

            {/* 2. Home Loan & Personal Loan Calculator: Always visible directly below the loan products */}
            <div ref={calculatorRef} className="mt-3">
              <LoanCalculator
                initialType={calculatorType}
                onTypeChange={handleCalculatorTypeChange}
                onApply={handleCalculatorApply}
              />
            </div>
          </div>

          {/* Section 2 (Share Link) & Section 3 (Form): Directly below the calculator */}
          <div ref={formRef} className="space-y-4 pt-1">
            {/* Mobile Form Active Header */}
            <div className="md:hidden flex items-center justify-between py-1.5 px-2.5 bg-slate-100 rounded-xl text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-extrabold text-slate-800">
                  {LOAN_TYPE_LABELS[effectiveLoanType] || effectiveLoanType} Application Form
                </span>
              </div>
              <button
                type="button"
                onClick={() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-2xs active:scale-95 transition flex items-center gap-1"
              >
                <span>🧮</span>
                <span>Calculator ↑</span>
              </button>
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

              {/* Monthly Net Income */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Monthly Net Income <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  {typeof monthlyIncome === 'number' && monthlyIncome > 0 && (
                    <span className="text-[11px] font-extrabold text-emerald-700">
                      ₹{monthlyIncome.toLocaleString('en-IN')}/mo
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={monthlyIncome}
                    onChange={(e) =>
                      setMonthlyIncome(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="e.g. 75000"
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Take-home salary or net monthly profit</p>
              </div>

              {/* Other Existing EMI */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Other Existing EMI <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  {typeof existingEmi === 'number' && existingEmi > 0 && (
                    <span className="text-[11px] font-extrabold text-amber-700">
                      ₹{existingEmi.toLocaleString('en-IN')}/mo
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={existingEmi}
                    onChange={(e) =>
                      setExistingEmi(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="e.g. 15000 (0 if none)"
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Total existing monthly EMI obligations</p>
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
