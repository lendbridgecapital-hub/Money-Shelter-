'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { publicWebsiteOnboardPartnerAction } from '@/actions/partnerOnboardingActions';
import { MoneyShelterLogo } from '@/components/MoneyShelterLogo';

interface BecomePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BecomePartnerModal({ isOpen, onClose }: BecomePartnerModalProps) {
  const [selectedRole, setSelectedRole] = useState<'CHANNEL_PARTNER' | 'SUB_DSA'>('CHANNEL_PARTNER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [branchId, setBranchId] = useState('br_c95492722e36abe1'); // Default Pune Bavdhan HQ
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [password, setPassword] = useState('MoneyShelter@123');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    partnerCode?: string;
    message?: string;
  } | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError('Please enter your full legal name.');
    if (!email.trim() || !email.includes('@')) return setError('Please enter a valid email address.');
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length !== 10) return setError('Please enter a valid 10-digit mobile number.');

    setLoading(true);
    const res = await publicWebsiteOnboardPartnerAction({
      fullName,
      email,
      mobile: cleanMobile,
      role: selectedRole,
      branchId,
      panNumber: panNumber ? panNumber.toUpperCase() : null,
      aadhaarNumber: aadhaarNumber || null,
      password,
    });
    setLoading(false);

    if (res.ok) {
      setSuccessResult({
        partnerCode: res.partnerCode,
        message: res.message,
      });
    } else {
      setError(res.error || 'Failed to complete partner onboarding. Please try again.');
    }
  }

  function handleReset() {
    setSuccessResult(null);
    setFullName('');
    setEmail('');
    setMobile('');
    setPanNumber('');
    setAadhaarNumber('');
    setPassword('MoneyShelter@123');
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleReset}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors text-sm font-bold"
          aria-label="Close modal"
        >
          ✕
        </button>

        {successResult ? (
          /* Celebratory Success State */
          <div className="text-center py-4 space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-3xl shadow-sm">
              ✓
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
                Onboarding Approved
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Welcome to Money Shelter!
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You have been registered into Maharashtra&apos;s leading lending distribution network.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500">Official Partner Code:</span>
                <span className="text-base font-extrabold text-cyan-800 font-mono bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200">
                  {successResult.partnerCode || 'MS-PRT-0000'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Login ID:</span>
                <span className="font-semibold text-slate-800">{email}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Default Password:</span>
                <span className="font-mono font-semibold text-slate-800">{password}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/login"
                onClick={handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs sm:text-sm text-center shadow-md transition-all"
              >
                Go to Partner Login &rarr;
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form Content (Exact Channel Partner Compliance & Network fields) */
          <div>
            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center p-1">
                  <MoneyShelterLogo variant="dark" size="sm" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">
                  Channel Partner Compliance & Network
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Onboard New Partner
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct registration. Partner will be auto-approved and issued an official Money Shelter Partner Code.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Appointment Role & Network Tier <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600 font-bold text-slate-800"
                >
                  <option value="CHANNEL_PARTNER">Channel Partner (Agent) — Direct Origination Tier</option>
                  <option value="SUB_DSA">Sub-DSA (Master Tier) — Team Recruitment & Override Engine</option>
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {selectedRole === 'SUB_DSA'
                    ? 'Generates a MS-SUB-XXXX code. Sub-DSA can recruit sub-agents and earn override commission.'
                    : 'Generates a MS-PRT-XXXX code for direct retail and commercial loan originations.'}
                </span>
              </div>

              {/* Full Name & Mobile */}
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
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600 font-medium"
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
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600 font-mono"
                  />
                </div>
              </div>

              {/* Email & Branch */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600 font-medium"
                  >
                    <option value="br_c95492722e36abe1">Pune - Bavdhan HQ</option>
                    <option value="br_3eb0a6c7ae0b095e">Mumbai - Andheri West</option>
                    <option value="br_satara_01">Satara Branch</option>
                    <option value="br_678e5ec4115c5a50">Bengaluru - Indiranagar</option>
                  </select>
                </div>
              </div>

              {/* PAN & Aadhaar */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PAN Number (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aadhaar (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="12-digit UID"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600 font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Portal Login Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  You can change this password after your first login into the Money Shelter portal.
                </span>
              </div>

              {/* Link to Full Digital KYC Form */}
              <div className="p-2.5 rounded-xl bg-cyan-50/70 border border-cyan-100 flex items-center justify-between text-[11px] text-cyan-900">
                <span>Want to upload documents & sign agreement now?</span>
                <Link
                  href="/partner/onboard"
                  onClick={onClose}
                  className="font-bold underline hover:text-cyan-700 ml-2"
                >
                  Full KYC Form &rarr;
                </Link>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Onboarding...</span>
                    </>
                  ) : (
                    <span>➕ Onboard Partner &amp; Generate Code</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
