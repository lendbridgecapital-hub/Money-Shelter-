'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { submitCustomerApplication } from '@/actions/publicActions';
import { getDocumentGroupsForApplication, RESIDENCE_PROOF_OPTIONS, PROPERTY_PAPER_OPTIONS } from '@/lib/documentChecklist';
import { getMaxTenureYearsForLoanType } from '@/lib/policyEngine';
import type { CompanySettings, Branch, LoanType, IncomeType } from '@/types/db';

interface CustomerApplicationFormProps {
  token: string;
  settings: CompanySettings;
  branch?: Branch | null;
  initialLoanType?: LoanType;
  initialIncomeType?: IncomeType;
}

export default function CustomerApplicationForm({
  token,
  settings,
  branch,
  initialLoanType,
  initialIncomeType,
}: CustomerApplicationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [residenceProofType, setResidenceProofType] = useState('');
  const [propertyPaperType, setPropertyPaperType] = useState('');
  const [selectedLoanType, setSelectedLoanType] = useState<string>(initialLoanType || 'HOME_LOAN');
  const [selectedIncomeType, setSelectedIncomeType] = useState<IncomeType>(
    initialIncomeType || (initialLoanType === 'BUSINESS_LOAN' ? 'SELF_EMPLOYED_BUSINESS' : 'SALARIED')
  );
  const [tenureYears, setTenureYears] = useState<number | ''>(
    initialLoanType === 'PERSONAL_LOAN' ? 5 : 20
  );
  const maxAllowedTenureYears = getMaxTenureYearsForLoanType(selectedLoanType);

  const documentGroups = useMemo(
    () => getDocumentGroupsForApplication(selectedLoanType, selectedIncomeType),
    [selectedLoanType, selectedIncomeType]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await submitCustomerApplication(token, formData);
        if (res && !res.ok) {
          setError(res.error || 'Submission failed. Please check the required fields.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (err) {
        // Next.js redirect throws, which is normal for successful navigation
        if ((err as Error)?.message?.includes('NEXT_REDIRECT')) {
          return;
        }
        setError('Something went wrong during submission. Please try again.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Basic Applicant Details */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: settings.primaryColor }}
          >
            1
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">Personal & Loan Details</h2>
            <p className="text-xs text-slate-500">Enter your primary contact and desired loan requirements.</p>
          </div>
        </div>

        {branch?.type === 'SITE' && (
          <div className="mb-5 p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🏗️</span>
              <div>
                <span className="font-bold">Direct Construction Project: {branch.name}</span>
                {branch.dedicatedRmName && (
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Assigned Relationship Manager: <strong>{branch.dedicatedRmName}</strong>
                  </p>
                )}
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase self-start sm:self-auto">
              Company Site Desk
            </span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Legal Name (as per PAN Card) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="e.g. Rahul Anant Deshmukh"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              10-Digit Mobile Number <span className="text-rose-500">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 text-xs font-medium text-slate-500 bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl">
                +91
              </span>
              <input
                type="tel"
                name="mobile"
                required
                maxLength={10}
                pattern="[0-9]{10}"
                placeholder="9876543210"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="rahul.deshmukh@example.com"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Loan Type Required <span className="text-rose-500">*</span>
            </label>
            <select
              name="loanType"
              required
              value={selectedLoanType}
              onChange={(e) => {
                const newType = e.target.value;
                setSelectedLoanType(newType);
                if (newType === 'BUSINESS_LOAN' && selectedIncomeType === 'SALARIED') {
                  setSelectedIncomeType('SELF_EMPLOYED_BUSINESS');
                }
                const maxAllowed = getMaxTenureYearsForLoanType(newType);
                if (tenureYears !== '' && Number(tenureYears) > maxAllowed) {
                  setTenureYears(maxAllowed);
                }
              }}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="HOME_LOAN">Home Loan</option>
              <option value="PERSONAL_LOAN">Personal Loan</option>
              <option value="BUSINESS_LOAN">Business Loan</option>
              <option value="BALANCE_TRANSFER">Balance Transfer</option>
              <option value="LOAN_AGAINST_PROPERTY">Loan Against Property (LAP)</option>
              <option value="EDUCATION_LOAN">Education Loan</option>
              <option value="GOLD_LOAN">Gold Loan</option>
              <option value="OTHERS">Other / Custom Requirement</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Customer Income Type <span className="text-rose-500">*</span>
            </label>
            <select
              name="incomeType"
              required
              value={selectedIncomeType}
              onChange={(e) => setSelectedIncomeType(e.target.value as IncomeType)}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {selectedLoanType !== 'BUSINESS_LOAN' && (
                <option value="SALARIED">Salaried</option>
              )}
              <option value="SELF_EMPLOYED_BUSINESS">Self Employed (Business)</option>
              <option value="SELF_EMPLOYED_PROFESSIONAL">Self Employed (Professional)</option>
            </select>
            {selectedLoanType === 'BUSINESS_LOAN' && (
              <p className="text-[11px] text-amber-700 mt-1">
                * Note: Business loans are exclusively for business entities / self-employed applicants.
              </p>
            )}
          </div>

          {selectedLoanType === 'BALANCE_TRANSFER' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ongoing Loan Amount (Current Outstanding in ₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  name="ongoingLoanAmount"
                  required
                  min={10000}
                  step={5000}
                  placeholder="e.g. 1850000"
                  className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Existing principal outstanding to be transferred</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {selectedLoanType === 'BALANCE_TRANSFER' ? 'Target Transfer / Top-Up Loan Amount (in INR ₹)' : 'Loan Amount Desired (in INR ₹)'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              name="loanAmount"
              required
              min={10000}
              step={5000}
              placeholder="e.g. 2500000"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Loan Tenure Required (in Years) <span className="text-rose-500">*</span>
              <span className="text-[11px] text-slate-400 font-normal ml-1">
                ({selectedLoanType === 'HOME_LOAN' ? 'Max 30 years' : selectedLoanType === 'PERSONAL_LOAN' ? 'Max 7 years' : `Max ${maxAllowedTenureYears} years`})
              </span>
            </label>
            <input
              type="number"
              name="tenureYears"
              required
              min={1}
              max={maxAllowedTenureYears}
              value={tenureYears}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setTenureYears('');
                } else {
                  const num = Math.min(maxAllowedTenureYears, Math.max(1, Number(val)));
                  setTenureYears(num);
                }
              }}
              placeholder={selectedLoanType === 'HOME_LOAN' ? 'e.g. 20' : 'e.g. 5'}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            {tenureYears && Number(tenureYears) > 0 && (
              <p className="text-[11px] text-slate-400 mt-1">
                Equivalent to {Number(tenureYears) * 12} monthly installments
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Monthly Net Income (in INR ₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                name="monthlyIncome"
                min={0}
                step={1000}
                placeholder="e.g. 75000"
                className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Net take-home salary or monthly business income</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Other Existing Monthly EMI (in INR ₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                name="existingEmi"
                min={0}
                step={500}
                placeholder="e.g. 15000 (or 0 if none)"
                className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total ongoing monthly EMI across all active loans</p>
          </div>
        </div>
      </section>

      {/* Section 2: Document Upload Checklist */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: settings.primaryColor }}
          >
            2
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">Document Upload Checklist</h2>
            <p className="text-xs text-slate-500">
              Please upload clear, self-attested copies (PDF, JPG, PNG up to 10MB per file).
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {documentGroups.map((group) => (
            <div key={group.category} className="border border-slate-100 bg-slate-50/60 rounded-xl p-5">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {group.title} {group.required && <span className="text-rose-500">*</span>}
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">
                  {group.required ? 'Mandatory' : 'Optional'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">{group.description}</p>

              {/* Special Residence Proof dropdown */}
              {group.category === 'RESIDENCE_PROOF' && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Residence Proof Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="residence_proof_type"
                    value={residenceProofType}
                    onChange={(e) => setResidenceProofType(e.target.value)}
                    className="w-full sm:max-w-md px-3.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">-- Choose document type --</option>
                    {RESIDENCE_PROOF_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Special Property Paper dropdown for LAP */}
              {group.category === 'PROPERTY_PAPERS' && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Property Document Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="property_paper_type"
                    required
                    value={propertyPaperType}
                    onChange={(e) => setPropertyPaperType(e.target.value)}
                    className="w-full sm:max-w-md px-3.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">-- Choose property document type --</option>
                    {PROPERTY_PAPER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Choose Agreement / Sale deed, Builder Project File, Completion Certificate, Society Registration, Share Certificate, or Conveyance deed
                  </p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {group.fields.map((field) => (
                  <div key={field.name} className="bg-white p-3.5 rounded-lg border border-slate-200/80">
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      {field.label} {group.required && <span className="text-rose-500 font-bold">* Mandatory</span>}
                    </label>
                    <input
                      type="file"
                      name={field.name}
                      required={group.required}
                      accept={field.accept || '.pdf,image/*'}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 hover:file:bg-slate-200 cursor-pointer"
                    />
                    {field.helperText && <p className="text-[11px] text-slate-400 mt-1">{field.helperText}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Self-Attestation & Submission */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: settings.primaryColor }}
          >
            3
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">Declaration & Self-Attestation</h2>
            <p className="text-xs text-slate-500">Legal confirmation for partner bank submission.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed mb-6">
          <p className="font-semibold text-slate-900 mb-1">Self-Attestation Undertaking:</p>
          I hereby declare that all information and uploaded documents submitted by me are true, correct, and complete
          to the best of my knowledge. I authorize <strong>{branch?.id === 'br_satara_01' || branch?.code === 'STR01' || branch?.isCoBranded || branch?.name?.toLowerCase().includes('satara') ? 'Lendbridge Capital' : settings.companyName}</strong> and its partner financial
          institutions to verify my details, fetch my credit bureau report (CIBIL / Experian), and process my loan
          application in accordance with applicable banking and RBI regulations.
        </div>

        <div className="flex items-start gap-3 mb-6">
          <input
            type="checkbox"
            id="selfAttested"
            name="selfAttested"
            required
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="selfAttested" className="text-xs font-medium text-slate-800 cursor-pointer">
            I confirm that all uploaded documents are self-attested by me, and I accept the terms of loan processing.
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50"
            style={{ backgroundColor: settings.primaryColor }}
          >
            {isPending ? 'Submitting Application & Uploading Documents…' : '✓ Submit Complete Loan Application'}
          </button>
        </div>

        {branch && (
          <p className="text-[11px] text-slate-400 mt-4">
            Assigned Branch: {branch.name} ({branch.code}) · {branch.phone || branch.email || ''}
          </p>
        )}
      </section>
    </form>
  );
}
