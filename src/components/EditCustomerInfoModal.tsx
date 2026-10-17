'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { LoanApplication, LoanType } from '@/types/db';
import { LOAN_TYPE_LABELS } from '@/lib/format';
import { getMaxTenureYearsForLoanType } from '@/lib/policyEngine';
import { editCustomerInformationAction } from '@/actions/workflowActions';

interface EditCustomerInfoModalProps {
  application: LoanApplication;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function EditCustomerInfoModal({
  application,
  isOpen,
  onClose,
  onSaved,
}: EditCustomerInfoModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState(application.fullName || '');
  const [mobile, setMobile] = useState(application.mobile || '');
  const [email, setEmail] = useState(application.email || '');
  const [loanType, setLoanType] = useState<LoanType>(application.loanType || 'PERSONAL_LOAN');
  const [loanAmount, setLoanAmount] = useState<string>(
    application.loanAmount !== null && application.loanAmount !== undefined ? String(application.loanAmount) : ''
  );
  const [ongoingLoanAmount, setOngoingLoanAmount] = useState<string>(
    application.ongoingLoanAmount !== null && application.ongoingLoanAmount !== undefined ? String(application.ongoingLoanAmount) : ''
  );
  const [monthlyIncome, setMonthlyIncome] = useState<string>(
    application.monthlyIncome !== null && application.monthlyIncome !== undefined ? String(application.monthlyIncome) : ''
  );
  const [existingEmi, setExistingEmi] = useState<string>(
    application.existingEmi !== null && application.existingEmi !== undefined ? String(application.existingEmi) : ''
  );
  const [tenureYears, setTenureYears] = useState<string>(
    application.tenureMonths ? String(Math.round(application.tenureMonths / 12)) : ''
  );
  const [panNumber, setPanNumber] = useState(application.panNumber || '');
  const [aadhaarNumber, setAadhaarNumber] = useState(application.aadhaarNumber || '');

  // MANDATORY Remark
  const [remark, setRemark] = useState('');

  if (!isOpen) return null;

  const maxAllowedTenureYears = getMaxTenureYearsForLoanType(loanType);

  // Calculate modified fields count
  const modifiedCount = [
    fullName.trim() !== (application.fullName || '').trim(),
    mobile.trim() !== (application.mobile || '').trim(),
    email.trim().toLowerCase() !== (application.email || '').trim().toLowerCase(),
    loanType !== application.loanType,
    Number(loanAmount || 0) !== Number(application.loanAmount || 0),
    Number(ongoingLoanAmount || 0) !== Number(application.ongoingLoanAmount || 0),
    Number(monthlyIncome || 0) !== Number(application.monthlyIncome || 0),
    Number(existingEmi || 0) !== Number(application.existingEmi || 0),
    (tenureYears ? Number(tenureYears) * 12 : null) !== (application.tenureMonths || null),
    panNumber.trim().toUpperCase() !== (application.panNumber || '').trim().toUpperCase(),
    aadhaarNumber.trim().replace(/\s+/g, '') !== (application.aadhaarNumber || '').trim().replace(/\s+/g, ''),
  ].filter(Boolean).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 1. Mandatory remark validation
    if (!remark.trim()) {
      setError('A mandatory remark explaining the reason for modifying customer information is strictly required.');
      return;
    }

    if (remark.trim().length < 5) {
      setError('Please provide a meaningful remark explaining the change (at least 5 characters).');
      return;
    }

    // 2. Mandatory field validations
    if (!fullName.trim()) {
      setError('Applicant full name cannot be empty.');
      return;
    }

    if (!mobile.trim() || mobile.trim().replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const parsedAmount = Number(loanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid requested loan amount greater than ₹0.');
      return;
    }

    const parsedTenureYears = tenureYears ? Number(tenureYears) : null;
    if (parsedTenureYears !== null && parsedTenureYears > maxAllowedTenureYears) {
      setError(`Tenure for ${LOAN_TYPE_LABELS[loanType] || loanType} cannot exceed ${maxAllowedTenureYears} years.`);
      return;
    }

    startTransition(async () => {
      const res = await editCustomerInformationAction(application.id, {
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim() ? email.trim() : null,
        loanType,
        loanAmount: parsedAmount,
        ongoingLoanAmount: ongoingLoanAmount !== '' ? Number(ongoingLoanAmount) : null,
        monthlyIncome: monthlyIncome ? Number(monthlyIncome) : null,
        existingEmi: existingEmi !== '' ? Number(existingEmi) : null,
        tenureMonths: parsedTenureYears ? parsedTenureYears * 12 : null,
        panNumber: panNumber.trim() ? panNumber.trim().toUpperCase() : null,
        aadhaarNumber: aadhaarNumber.trim() ? aadhaarNumber.trim().replace(/\s+/g, '') : null,
        remark: remark.trim(),
      });

      if (!res.ok) {
        setError(res.error || 'Failed to save customer changes.');
      } else {
        setSuccess('Customer information successfully saved and recorded in audit log.');
        setTimeout(() => {
          onClose();
          router.refresh();
          if (onSaved) onSaved();
        }, 900);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center text-sm font-bold">
                ✏️
              </span>
              <h2 className="text-base sm:text-lg font-bold">Edit Customer Information</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Modify applicant personal, KYC, or financial figures. An audit log entry will be permanently recorded.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition"
            disabled={isPending}
          >
            ✕
          </button>
        </div>

        {/* Status / Alert Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Case: <strong>{application.fullName || application.token}</strong></span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-[11px] text-slate-500">ID: {application.id}</span>
          </div>
          <div>
            {modifiedCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                {modifiedCount} {modifiedCount === 1 ? 'field' : 'fields'} changed
              </span>
            ) : (
              <span className="text-slate-400 text-[11px]">No changes yet</span>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
          </div>
        )}

        {success && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Customer Personal Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              1. Customer Personal & Contact Details
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Applicant Full Name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Section 2: KYC & Identification */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              2. KYC Identification Numbers
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PAN Card Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="12-digit Aadhaar Number"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Loan & Financial Parameters */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              3. Loan & Financial Requirements
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loan Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={loanType}
                  onChange={(e) => {
                    const newType = e.target.value as LoanType;
                    setLoanType(newType);
                    const maxAllowed = getMaxTenureYearsForLoanType(newType);
                    if (tenureYears && Number(tenureYears) > maxAllowed) {
                      setTenureYears(String(maxAllowed));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition font-medium"
                >
                  {(Object.keys(LOAN_TYPE_LABELS) as LoanType[]).map((type) => (
                    <option key={type} value={type}>
                      {LOAN_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {loanType === 'BALANCE_TRANSFER' ? 'Target Transfer / Top-Up Loan Amount (₹)' : 'Requested Loan Amount (₹)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={5000}
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition font-semibold"
                />
              </div>

              {loanType === 'BALANCE_TRANSFER' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ongoing Loan Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={10000}
                    step={5000}
                    value={ongoingLoanAmount}
                    onChange={(e) => setOngoingLoanAmount(e.target.value)}
                    placeholder="e.g. 1850000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Existing outstanding balance</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tenure (Years)
                  <span className="text-[10px] text-slate-500 font-normal ml-1">
                    ({loanType === 'HOME_LOAN' ? 'Max 30 yrs' : loanType === 'PERSONAL_LOAN' ? 'Max 7 yrs' : `Max ${maxAllowedTenureYears} yrs`})
                  </span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={maxAllowedTenureYears}
                  value={tenureYears}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setTenureYears('');
                    } else {
                      const num = Math.min(maxAllowedTenureYears, Math.max(1, Number(val)));
                      setTenureYears(String(num));
                    }
                  }}
                  placeholder={loanType === 'HOME_LOAN' ? 'e.g. 20' : 'e.g. 5'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition font-mono"
                />
                {tenureYears && Number(tenureYears) > 0 && (
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{Number(tenureYears) * 12} Months</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Net Monthly Income (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="e.g. 65000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Existing Monthly EMI(s) (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={existingEmi}
                  onChange={(e) => setExistingEmi(e.target.value)}
                  placeholder="e.g. 12000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Section 4: MANDATORY Audit Remark Box */}
          <div className="pt-2 border-t border-slate-100">
            <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-amber-950">
                  Mandatory Operational Remark / Reason for Change <span className="text-rose-600">*</span>
                </label>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-200/80 text-amber-900">
                  Mandatory Audit Trail
                </span>
              </div>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                Describe why customer details are being updated (e.g. verified income from 3 months bank statements, corrected PAN typo, or revised requested amount per borrower request). This remark will be permanently logged in the lifecycle history.
              </p>
              <textarea
                required
                rows={3}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Enter mandatory reason for update (e.g., Verified payslips; corrected net monthly salary to ₹72,000 and updated PAN as per uploaded card)..."
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !remark.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Saving & Recording Audit...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Save Changes & Record in Audit Log</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
