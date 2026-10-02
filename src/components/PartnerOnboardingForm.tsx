'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  requestPartnerOtpAction,
  completePartnerOnboardingAction,
} from '@/actions/partnerOnboardingActions';
import type { Branch } from '@/types/db';

export interface ReferralRm {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  branchId?: string;
  branchName?: string;
}

interface Props {
  branches: Branch[];
  companyName?: string;
  referralRm?: ReferralRm | null;
}

function compressAndReadDoc(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(String(e.target?.result || ''));
        }
      };
      img.onerror = () => resolve(String(e.target?.result || ''));
      img.src = String(e.target?.result);
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export default function PartnerOnboardingForm({
  branches,
  companyName = 'Quickfinsure',
  referralRm,
}: Props) {
  // Stepper state: 1 = Profile, 2 = KYC & Docs, 3 = Agreement, 4 = OTP Confirmation, 5 = Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [fatherSpouseName, setFatherSpouseName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(referralRm?.branchId || branches[0]?.id || '');

  // KYC Fields
  const [panNumber, setPanNumber] = useState('');
  const [panFile, setPanFile] = useState<File | null>(null);
  const [panDocUrl, setPanDocUrl] = useState<string>('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [aadhaarDocUrl, setAadhaarDocUrl] = useState<string>('');

  // Agreement State
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  // OTP State
  const [otp, setOtp] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    partnerCode: string;
    partnerName: string;
    email: string;
    mobile: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Formatting helpers
  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setPanNumber(val);
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
    setAadhaarNumber(raw);
  };

  const formatAadhaarDisplay = (val: string) => {
    return val.replace(/(\d{4})(\d{4})?(\d{4})?/, (_, p1, p2, p3) => {
      let res = p1;
      if (p2) res += ' ' + p2;
      if (p3) res += ' ' + p3;
      return res;
    });
  };

  const maskedAadhaar = () => {
    if (aadhaarNumber.length >= 4) {
      return `•••• •••• ${aadhaarNumber.slice(-4)}`;
    }
    return '•••• •••• ••••';
  };

  // Step 1 -> Step 2 validation
  const handleProceedToKyc = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError('Please enter your full legal name.');
    if (!fatherSpouseName.trim()) return setError("Please enter your father's or spouse's name.");
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) return setError('Please enter a valid 10-digit mobile number.');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email address.');
    if (!address.trim() || address.trim().length < 10) {
      return setError('Please provide your complete residential or business address (minimum 10 characters).');
    }
    if (!password || password.length < 6) {
      return setError('Please choose a secure password (at least 6 characters).');
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2 -> Step 3 validation
  const handleProceedToAgreement = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
      return setError('Please enter a valid 10-digit PAN format (e.g. ABCDE1234F).');
    }
    if (aadhaarNumber.length !== 12) {
      return setError('Please enter a valid 12-digit Aadhaar number.');
    }

    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3 -> Step 4: Request OTP & move to confirmation
  const handleRequestOtp = async () => {
    setError(null);
    if (!agreementAccepted) {
      return setError('You must read and tick the box agreeing to the Sub-DSA / Referral Partner Agreement.');
    }

    setIsSendingOtp(true);
    const res = await requestPartnerOtpAction({
      email,
      mobile,
    });
    setIsSendingOtp(false);

    if (!res.ok) {
      setError(res.error || 'Failed to dispatch verification OTP. Please try again.');
      return;
    }

    setDemoOtpHint(res.demoOtp || '123456');
    setOtp(res.demoOtp || '123456');
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 4: Verify OTP & complete onboarding
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim()) {
      return setError('Please enter the 6-digit confirmation OTP.');
    }

    setIsVerifying(true);
    const agreementAuthorizedText = `SUB-DSA / REFERRAL PARTNER AGREEMENT
Executed on: ${currentDateFormatted}
First Party: Quickfinsure Solutions (Galore Tech IT Park, Bavdhan, Pune HQ)
Second Party (Referral Partner / Sub-DSA): ${fullName}
Father's/Spouse's Name: ${fatherSpouseName}
Registered Address: ${address}
Permanent Account Number (PAN): ${panNumber}
Aadhaar Number: ${maskedAadhaar()}
Digital Verification Audit: Authorized via 6-digit confirmation OTP dispatched to +91 ${mobile.slice(-10)} and ${email}.
Compliance Undertaking: DPDP Act 2023 compliant, Zero-Cash Collection policy, non-exclusive referral appointment, and commission clawback provisions acknowledged and executed.`;

    const res = await completePartnerOnboardingAction({
      fullName,
      fatherSpouseName,
      mobile,
      email,
      address,
      panNumber,
      panDocumentUrl: panDocUrl || null,
      aadhaarNumber,
      aadhaarDocumentUrl: aadhaarDocUrl || null,
      agreementAuthorizedText,
      password,
      otp: otp.trim(),
      branchId: selectedBranchId,
      assignedRmId: referralRm?.id || null,
      assignedRmName: referralRm?.name || null,
      agreementAccepted: true,
    });
    setIsVerifying(false);

    if (!res.ok) {
      setError(res.error || 'OTP verification failed. Please check the code and try again.');
      return;
    }

    setSuccessData({
      partnerCode: res.partnerCode || 'QFS-PRT-0000',
      partnerName: res.partnerName || fullName,
      email: res.email || email,
      mobile: res.mobile || mobile,
    });
    setCurrentStep(5);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const currentDateFormatted = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Brand Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white font-extrabold text-xl shadow-md mb-3">
          Q
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Channel Partner & Sub-DSA Onboarding
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
          Join {companyName} as an authorized loan referral associate. Sourced digital leads, transparent slabs, and real-time bank payouts.
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-200 -z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-600 -z-0 transition-all duration-300"
            style={{
              width:
                currentStep === 1
                  ? '0%'
                  : currentStep === 2
                  ? '25%'
                  : currentStep === 3
                  ? '50%'
                  : currentStep === 4
                  ? '75%'
                  : '100%',
            }}
          />

          {[
            { step: 1, label: 'Profile' },
            { step: 2, label: 'KYC & ID' },
            { step: 3, label: 'Agreement' },
            { step: 4, label: 'OTP' },
            { step: 5, label: 'Code' },
          ].map((item) => {
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <div key={item.step} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : 'bg-white border-2 border-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓' : item.step}
                </div>
                <span
                  className={`text-[10px] font-semibold mt-1 uppercase tracking-wider ${
                    isCurrent ? 'text-emerald-700 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Card Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Error Banner */}
        {error && (
          <div className="p-3.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-rose-600 font-bold">⚠️</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* ================= STEP 1: CREATE PROFILE FORM ================= */}
        {currentStep === 1 && (
          <form onSubmit={handleProceedToKyc} className="p-5 sm:p-7 space-y-4">
            {/* RM Referral Invitation Banner */}
            {referralRm && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-slate-50/60 border border-emerald-200/90 rounded-xl flex items-start gap-3 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  👔
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded">
                      RM Referral Invitation
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Referred by {referralRm.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    You have been invited by Relationship Manager <strong>{referralRm.name}</strong>{referralRm.branchName ? ` (${referralRm.branchName} Branch)` : ''}. Upon completing this registration, you will be <strong>automatically assigned</strong> to their portfolio for priority partner support and fast-track disbursements.
                  </p>
                </div>
              </div>
            )}

            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Step 1: Partner Personal & Contact Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your official identity details for DSA appointment and commission disbursements.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar Verma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">As printed on your PAN card</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father&apos;s / Spouse&apos;s Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar Verma"
                  value={fatherSpouseName}
                  onChange={(e) => setFatherSpouseName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Required for official referral agreement</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number (WhatsApp Enabled) <span className="text-rose-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-2.5 bg-slate-50 border border-r-0 border-slate-200 rounded-l-lg text-xs font-semibold text-slate-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98765 43210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-r-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">OTP confirmation will be sent here</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="ramesh.verma@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Used for login and digital payout vouchers</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Residential / Business Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Flat / Office No, Building Name, Street / Landmark, City, State, PIN Code"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              />
              <span className="text-[10px] text-slate-400">Full registered postal address for agreement execution</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Portal Login Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Create secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400">Minimum 6 characters for portal access</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nearest Operating Branch
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400">Your relationship manager desk</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Step 1 of 4</span>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
              >
                <span>Continue to KYC & Identity</span>
                <span>→</span>
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 2: KYC & ID SUBMISSION ================= */}
        {currentStep === 2 && (
          <form onSubmit={handleProceedToAgreement} className="p-5 sm:p-7 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Step 2: KYC Identity & Document Entry</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submit valid PAN and Aadhaar details as mandated by RBI Sub-DSA compliance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                ← Back to Profile
              </button>
            </div>

            {/* PAN Card Section */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🪪</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Permanent Account Number (PAN Card)
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Mandatory for TDS 194H
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    PAN Number (10 Characters) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABCDE1234F"
                    value={panNumber}
                    onChange={handlePanChange}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase font-bold text-slate-800 tracking-wider focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Format: 5 letters, 4 digits, 1 letter</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Upload PAN Card Copy (PDF or Image)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={async (e) => {
                      const f = e.target.files?.[0] || null;
                      setPanFile(f);
                      if (f) {
                        const url = await compressAndReadDoc(f);
                        setPanDocUrl(url);
                      } else {
                        setPanDocUrl('');
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {panFile && (
                    <span className="text-[10px] text-emerald-600 block mt-0.5">
                      ✓ Attached: {panFile.name} ({(panFile.size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Aadhaar Card Section */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🆔</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Aadhaar Identity Card
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  DPDP Masked
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Aadhaar Number (12 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1234 5678 9012"
                    value={formatAadhaarDisplay(aadhaarNumber)}
                    onChange={handleAadhaarChange}
                    maxLength={14}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 tracking-wider focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">
                    Masked preview on agreement: <strong className="font-mono text-slate-600">{maskedAadhaar()}</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Upload Aadhaar Copy (PDF or Image)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={async (e) => {
                      const f = e.target.files?.[0] || null;
                      setAadhaarFile(f);
                      if (f) {
                        const url = await compressAndReadDoc(f);
                        setAadhaarDocUrl(url);
                      } else {
                        setAadhaarDocUrl('');
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {aadhaarFile && (
                    <span className="text-[10px] text-emerald-600 block mt-0.5">
                      ✓ Attached: {aadhaarFile.name} ({(aadhaarFile.size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                ← Back
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
              >
                <span>Review Sub-DSA Agreement</span>
                <span>→</span>
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: SUB-DSA REFERRAL AGREEMENT ================= */}
        {currentStep === 3 && (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Step 3: Sub-DSA / Referral Partner Agreement</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review your electronic partner agreement populated with your KYC credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                ← Edit KYC
              </button>
            </div>

            {/* Scrollable Legal Contract Box */}
            <div className="border-2 border-slate-200 rounded-xl bg-slate-50/50 p-4 sm:p-6 max-h-[380px] overflow-y-auto text-xs leading-relaxed space-y-4 text-slate-800 font-sans shadow-inner">
              <div className="text-center pb-3 border-b border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Legal Instrument</span>
                <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">SUB-DSA / REFERRAL PARTNER AGREEMENT</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  This Agreement is executed on this <strong>{currentDateFormatted}</strong> by and between:
                </p>
              </div>

              {/* First Party */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] text-emerald-800 mb-1">
                  First Party (Company):
                </h4>
                <p>
                  <strong>Quickfinsure Private Limited</strong>, an incorporated entity having its office at Galore Tech IT Park, Fifth Floor L M D Square, Lane No. 2, Bavdhan, Pune, Maharashtra 411021 (hereinafter referred to as the &quot;Company&quot;).
                </p>
              </div>

              {/* Second Party Populated */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] text-indigo-800 mb-1">
                  Second Party (Referral Partner / Sub-DSA):
                </h4>
                <div className="grid sm:grid-cols-2 gap-2 mt-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-500">Mr./Ms./M/s:</span>{' '}
                    <strong className="text-slate-900">{fullName || '[Partner Full Name]'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Father&apos;s/Spouse&apos;s Name:</span>{' '}
                    <strong className="text-slate-900">{fatherSpouseName || '[Name]'}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Residential/Business Address:</span>{' '}
                    <strong className="text-slate-900">{address || '[Address]'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">PAN:</span>{' '}
                    <strong className="font-mono text-slate-900">{panNumber || '[PAN Number]'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Identity Proof:</span>{' '}
                    <strong className="font-mono text-slate-900">{maskedAadhaar()}</strong>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 italic">
                  (hereinafter referred to as the &quot;Referral Partner&quot;).
                </p>
              </div>

              {/* Key Terms */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-700">
                  Key Terms and Conditions:
                </h4>

                <div className="space-y-2.5">
                  <div className="border-l-2 border-emerald-500 pl-3">
                    <p className="font-bold text-slate-900">1. Scope of Engagement:</p>
                    <p className="text-slate-600 mt-0.5">
                      The Referral Partner is appointed on a non-exclusive, principal-to-principal basis solely to refer potential retail/commercial loan leads and collect basic documentation. Sourcing does not guarantee loan approval; sanction and interest rates remain at the sole discretion of the lending Bank/NBFC.
                    </p>
                  </div>

                  <div className="border-l-2 border-rose-500 pl-3">
                    <p className="font-bold text-slate-900">2. Strict No-Cash Collection Policy:</p>
                    <p className="text-slate-600 mt-0.5">
                      The Referral Partner is strictly prohibited from demanding or collecting cash from any applicant under any pretext (including file fees, processing charges, or loan amounts). All statutory processing fees must be paid directly by the borrower to the lending institution via official digital links or account-payee cheques. Any violation results in immediate termination and criminal reporting.
                    </p>
                  </div>

                  <div className="border-l-2 border-blue-500 pl-3">
                    <p className="font-bold text-slate-900">3. Data Privacy & Explicit Customer Consent:</p>
                    <p className="text-slate-600 mt-0.5">
                      In compliance with the Digital Personal Data Protection (DPDP) Act and RBI guidelines, the Referral Partner must obtain explicit, documented consent from the borrower before collecting financial documents (PAN, bank statements, ITR). Data shall not be misused, copied, or transferred to third parties.
                    </p>
                  </div>

                  <div className="border-l-2 border-slate-500 pl-3">
                    <p className="font-bold text-slate-900">4. Independent Contractor Status:</p>
                    <p className="text-slate-600 mt-0.5">
                      The Referral Partner is an independent business associate, not an employee of the Company. No claims for salary, provident fund, gratuity, or statutory employee benefits shall apply.
                    </p>
                  </div>

                  <div className="border-l-2 border-emerald-500 pl-3">
                    <p className="font-bold text-slate-900">5. Payouts & Clawback Clause:</p>
                    <p className="text-slate-600 mt-0.5">
                      Commissions will be settled as per the active payout grid strictly upon successful loan disbursement. If an account is foreclosed within [3 to 6] months or encounters early defaults leading to lender deductions, the Company reserves the absolute right to claw back or adjust the disbursed commission from future earnings. All payouts are subject to applicable TDS under Section 194H of the Income Tax Act.
                    </p>
                  </div>

                  <div className="border-l-2 border-amber-500 pl-3">
                    <p className="font-bold text-slate-900">6. Anti-Fraud & Zero Coercive Bundling:</p>
                    <p className="text-slate-600 mt-0.5">
                      Submission of forged financials, fake salary slips, or falsified identity proofs will attract immediate blacklisting and personal legal liability. The Referral Partner shall never coercively bundle insurance or any other product with loan applications.
                    </p>
                  </div>

                  <div className="border-l-2 border-indigo-500 pl-3">
                    <p className="font-bold text-slate-900">7. Governing Law & Jurisdiction:</p>
                    <p className="text-slate-600 mt-0.5">
                      This Agreement is governed by Indian law, subject to the exclusive jurisdiction of the competent courts in Pune, Maharashtra.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Agreement Confirmation Checkbox */}
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreementAccepted}
                  onChange={(e) => setAgreementAccepted(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 mt-0.5 shrink-0"
                />
                <span className="text-xs text-slate-800 font-medium">
                  I, <strong>{fullName || 'the undersigned'}</strong>, have carefully read and unconditionally agree to all terms and conditions of this Sub-DSA / Referral Partner Agreement. I understand that an OTP will be verified to create my authorized Partner Code.
                </span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!agreementAccepted || isSendingOtp}
                onClick={handleRequestOtp}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
              >
                {isSendingOtp ? 'Dispatching OTP…' : 'Agree & Request OTP Verification →'}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: OTP CONFIRMATION FOR CODE CREATION ================= */}
        {currentStep === 4 && (
          <form onSubmit={handleVerifyOtp} className="p-5 sm:p-7 space-y-5">
            <div className="text-center max-w-sm mx-auto">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl mb-2">
                📱
              </div>
              <h2 className="text-base font-bold text-slate-900">OTP Confirmation for Code Creation</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter the 6-digit confirmation OTP dispatched to your mobile{' '}
                <strong className="text-slate-800 font-mono">+91 {mobile.slice(-10)}</strong> and email{' '}
                <strong className="text-slate-800">{email}</strong>.
              </p>
            </div>

            {/* Test Helper Pill */}
            {demoOtpHint && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-900 font-medium">
                <span>🔑 <strong>Test / Demo OTP:</strong> Use </span>
                <button
                  type="button"
                  onClick={() => setOtp(demoOtpHint)}
                  className="font-mono font-bold underline bg-white px-2 py-0.5 rounded border border-amber-300 ml-1 hover:bg-amber-100"
                >
                  {demoOtpHint}
                </button>
                <span className="text-[11px] text-amber-700 ml-1.5">(or enter 123456)</span>
              </div>
            )}

            <div className="max-w-xs mx-auto space-y-3">
              <div>
                <label className="block text-center text-xs font-semibold text-slate-700 mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  className="w-full px-3 py-3 border-2 border-slate-300 text-center font-mono text-xl font-extrabold tracking-widest text-slate-900 rounded-xl focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || otp.length < 6}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                {isVerifying ? (
                  <span>Creating Partner Code & Account…</span>
                ) : (
                  <span>Verify OTP & Generate Partner Code</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={isSendingOtp}
                  className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-50"
                >
                  {isSendingOtp ? 'Resending…' : "Didn't receive code? Resend OTP"}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                ← Back to Agreement
              </button>
              <span className="text-[11px] text-slate-400">Step 4 of 4</span>
            </div>
          </form>
        )}

        {/* ================= STEP 5: ONBOARDING SUCCESS & CODE ISSUED ================= */}
        {currentStep === 5 && successData && (
          <div className="p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm">
              🤝
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                ⏳ Submitted • Pending Central Support Approval
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
                Onboarding Submitted, {successData.partnerName}!
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Your KYC documents and authorized Sub-DSA Agreement have been submitted to Central Support for verification.
              </p>
            </div>

            {/* Official Reference Code Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-slate-50 border-2 border-emerald-300 rounded-2xl p-5 max-w-md mx-auto shadow-sm">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                Your Channel Partner (DSA) Reference Code
              </span>
              <div className="flex items-center justify-center gap-3 my-2">
                <span className="font-mono text-3xl font-black text-slate-900 tracking-wider">
                  {successData.partnerCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(successData.partnerCode)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg shadow-2xs transition"
                >
                  {copiedCode ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Quote this code for all bank approvals, Central Support verification, and commission tracking.
              </p>
            </div>

            {/* Verification Process Notice */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                Next Steps for Account Activation:
              </h4>
              <ul className="space-y-1.5 text-slate-600 text-[11px]">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">1.</span>
                  <span><strong>Central Support Review:</strong> The Central Support manager is reviewing your submitted PAN & Aadhaar documents and executed agreement.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">2.</span>
                  <span><strong>Relationship Manager Assignment:</strong> Central Support will assign a dedicated Relationship Manager (RM) from your branch to guide you.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">3.</span>
                  <span><strong>Activation & Certificate:</strong> Once approved, customer loan link sharing will be unlocked and your official <strong>Certificate of Association</strong> will be issued.</span>
                </li>
              </ul>
            </div>

            {/* Profile Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-1.5">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Auto-Assigned Role:</span>
                <strong className="text-emerald-700">Channel Partner (Auto-Assigned)</strong>
              </div>
              {referralRm && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Auto-Assigned RM:</span>
                  <strong className="text-indigo-700">👔 {referralRm.name}</strong>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Registered Email:</span>
                <strong className="text-slate-800">{successData.email}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Registered Mobile:</span>
                <strong className="text-slate-800">+91 {successData.mobile}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Agreement Status:</span>
                <strong className="text-emerald-700">Digitally Authorized via OTP (DPDP Compliant)</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition text-center"
              >
                Sign In to Partner Portal →
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition text-center"
              >
                Return to Home
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Support Footer */}
      <div className="mt-8 text-center text-xs text-slate-400 space-y-1">
        <p>
          Need onboarding assistance? Contact the DSA Desk at{' '}
          <a href="mailto:contact@quickfinsure.com" className="text-emerald-600 hover:underline">
            contact@quickfinsure.com
          </a>{' '}
          or call <strong>+91 98765 43210</strong>.
        </p>
        <p className="text-[11px]">
          Galore Tech IT Park, Fifth Floor L M D Square, Lane No. 2, Bavdhan, Pune, Maharashtra 411021.
        </p>
      </div>
    </div>
  );
}
