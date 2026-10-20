'use client';

import React, { useState, useEffect, useTransition } from 'react';
import type { LoanApplication, LoanType } from '@/types/db';
import type {
  CustomerEvaluationInput,
  PolicyEvaluationResult,
  RankingCriterion,
  RecommendationSummary,
  EmploymentType,
} from '@/types/policy';
import { LOAN_TYPE_LABELS, formatCurrencyINR } from '@/lib/format';
import {
  getSalarySlabFoirCap,
  getSalarySlabDescription,
  getMaxTenureYearsForLoanType,
  getDefaultTenureYearsForLoanType,
} from '@/lib/policyEngine';
import {
  evaluateCustomerEligibilityAction,
  attachRecommendationToApplicationAction,
  saveApplicationEligibilityOfferAction,
} from '@/actions/policyActions';
import CustomerEligibilityOfferModal from '@/components/CustomerEligibilityOfferModal';
import { buildCustomerEligibilityOfferData, generateWhatsAppShareUrl } from '@/lib/offerPdfHelper';

interface LoanEligibilityMatchModalProps {
  application: LoanApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: (bankName: string, rate: number, amount: number) => void;
}

export default function LoanEligibilityMatchModal({
  application,
  isOpen,
  onClose,
  onAssigned,
}: LoanEligibilityMatchModalProps) {
  const [isPending, startTransition] = useTransition();

  // Pre-filled form state from application
  const [loanType, setLoanType] = useState<LoanType>('HOME_LOAN');
  const [requestedAmount, setRequestedAmount] = useState<number>(1000000);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(50000);
  const [existingEmi, setExistingEmi] = useState<number>(0);
  const [requestedTenureYears, setRequestedTenureYears] = useState<number>(20);
  const [employmentType, setEmploymentType] = useState<EmploymentType>('SALARIED');

  // The primary single input requested by user
  const [cibilScore, setCibilScore] = useState<number>(750);

  // Results & UI State
  const [summary, setSummary] = useState<RecommendationSummary | null>(null);
  const [rankBy, setRankBy] = useState<RankingCriterion>('LOWEST_RATE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [assigningCardId, setAssigningCardId] = useState<string | null>(null);
  const [showAllDetails, setShowAllDetails] = useState<boolean>(false);
  const [isOfferPdfModalOpen, setIsOfferPdfModalOpen] = useState<boolean>(false);

  // Initialize and auto-evaluate fields whenever modal opens with an application
  useEffect(() => {
    if (application && isOpen) {
      const initialType = application.loanType || 'HOME_LOAN';
      setLoanType(initialType);
      const reqAmt = Number(application.loanAmount || 1000000);
      setRequestedAmount(reqAmt);
      const mIncome = Number(application.monthlyIncome || 50000);
      setMonthlyIncome(mIncome);
      const exEmi = Number(application.existingEmi || 0);
      setExistingEmi(exEmi);
      const maxYears = getMaxTenureYearsForLoanType(initialType);
      const defaultYears = getDefaultTenureYearsForLoanType(initialType);
      const years = application.tenureMonths ? Math.round(application.tenureMonths / 12) : defaultYears;
      const tenureY = Math.min(maxYears, Math.max(1, years));
      setRequestedTenureYears(tenureY);

      let initialCibil = 750;
      if (application.eligibilityOfferJson) {
        try {
          const parsed = JSON.parse(application.eligibilityOfferJson);
          if (parsed.cibilScore) initialCibil = parsed.cibilScore;
        } catch {}
      }
      setCibilScore(initialCibil);
      setErrorMessage(null);
      setSuccessMessage(null);
      setAssigningCardId(null);
      setIsOfferPdfModalOpen(false);

      // Auto-evaluate immediately so report is visible without requiring an extra click
      const input: CustomerEvaluationInput = {
        loanType: initialType,
        cibilScore: initialCibil,
        monthlyIncome: mIncome,
        existingEmi: exEmi,
        requestedAmount: reqAmt,
        requestedTenureMonths: tenureY * 12,
        employmentType: 'SALARIED',
      };

      startTransition(async () => {
        const res = await evaluateCustomerEligibilityAction(input, rankBy);
        if (res.ok && res.summary) {
          setSummary(res.summary);
          if (application?.id) {
            try {
              const autoOffer = buildCustomerEligibilityOfferData({
                application,
                input,
                summary: res.summary,
                advisor: {
                  name: application.relationshipManagerName || application.channelPartnerName || 'Money Shelter Senior Credit Advisor',
                  role: application.relationshipManagerName ? 'Relationship Manager' : 'Financial Advisor',
                  phone: '+91 98765 43210',
                  branchName: application.branchName || 'Pune Bavdhan HQ',
                },
              });
              saveApplicationEligibilityOfferAction(application.id, autoOffer).catch(() => {});
            } catch {}
          }
        }
      });
    }
  }, [application, isOpen, rankBy]);

  // Build the rich shareable customer offer report
  const offerData = summary && application
    ? buildCustomerEligibilityOfferData({
        application,
        input: {
          customerName: application.fullName || undefined,
          loanType,
          cibilScore: Number(cibilScore),
          monthlyIncome: Number(monthlyIncome),
          existingEmi: Number(existingEmi),
          requestedAmount: Number(requestedAmount),
          requestedTenureMonths: requestedTenureYears * 12,
          employmentType,
        },
        summary,
        advisor: {
          name: application.relationshipManagerName || application.channelPartnerName || 'Money Shelter Senior Credit Advisor',
          role: application.relationshipManagerName ? 'Relationship Manager' : 'Financial Advisor',
          phone: '+91 98765 43210',
          branchName: application.branchName || 'Pune Bavdhan HQ',
        },
      })
    : null;

  if (!isOpen || !application) return null;

  const maxAllowedTenureYears = getMaxTenureYearsForLoanType(loanType);

  // Auto-calculated FOIR Cap based on Net Monthly Salary Slab
  const autoFoirCap = getSalarySlabFoirCap(monthlyIncome);
  const maxPermissibleObligations = (monthlyIncome * autoFoirCap) / 100;
  const availableEmiHeadroom = Math.max(0, maxPermissibleObligations - existingEmi);
  const currentFoir = monthlyIncome > 0 ? ((existingEmi / monthlyIncome) * 100).toFixed(1) : '0';

  // Find eligible banks and rates
  const handleFindEligibility = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const input: CustomerEvaluationInput = {
      loanType,
      cibilScore: Number(cibilScore),
      monthlyIncome: Number(monthlyIncome),
      existingEmi: Number(existingEmi),
      requestedAmount: Number(requestedAmount),
      requestedTenureMonths: requestedTenureYears * 12,
      employmentType,
    };

    startTransition(async () => {
      const res = await evaluateCustomerEligibilityAction(input, rankBy);
      if (res.ok && res.summary) {
        setSummary(res.summary);
        if (application?.id) {
          try {
            const autoOffer = buildCustomerEligibilityOfferData({
              application,
              input,
              summary: res.summary,
              advisor: {
                name: application.relationshipManagerName || application.channelPartnerName || 'Money Shelter Senior Credit Advisor',
                role: application.relationshipManagerName ? 'Relationship Manager' : 'Financial Advisor',
                phone: '+91 98765 43210',
                branchName: application.branchName || 'Pune Bavdhan HQ',
              },
            });
            saveApplicationEligibilityOfferAction(application.id, autoOffer).catch(() => {});
          } catch {}
        }
      } else {
        setErrorMessage(res.error || 'Failed to match bank policies. Please check inputs.');
      }
    });
  };

  // Re-rank results
  const handleRankChange = (criterion: RankingCriterion) => {
    setRankBy(criterion);
    if (summary) {
      const input: CustomerEvaluationInput = {
        loanType,
        cibilScore: Number(cibilScore),
        monthlyIncome: Number(monthlyIncome),
        existingEmi: Number(existingEmi),
        requestedAmount: Number(requestedAmount),
        requestedTenureMonths: requestedTenureYears * 12,
        employmentType,
      };
      startTransition(async () => {
        const res = await evaluateCustomerEligibilityAction(input, criterion);
        if (res.ok && res.summary) {
          setSummary(res.summary);
          if (application?.id) {
            try {
              const autoOffer = buildCustomerEligibilityOfferData({
                application,
                input,
                summary: res.summary,
                advisor: {
                  name: application.relationshipManagerName || application.channelPartnerName || 'Money Shelter Senior Credit Advisor',
                  role: application.relationshipManagerName ? 'Relationship Manager' : 'Financial Advisor',
                  phone: '+91 98765 43210',
                  branchName: application.branchName || 'Pune Bavdhan HQ',
                },
              });
              saveApplicationEligibilityOfferAction(application.id, autoOffer).catch(() => {});
            } catch {}
          }
        }
      });
    }
  };

  // 1-Click Attach & Select Bank for Application
  const handleAttachBank = (result: PolicyEvaluationResult) => {
    if (!application?.id) return;
    setAssigningCardId(result.cardId);
    setErrorMessage(null);

    startTransition(async () => {
      const res = await attachRecommendationToApplicationAction(application.id, result);
      setAssigningCardId(null);
      if (res.ok) {
        setSuccessMessage(
          `✓ Successfully assigned ${result.bankName} (${result.mappedInterestRate}% p.a.) to ${application.fullName || 'applicant'}!`
        );
        if (onAssigned) {
          onAssigned(result.bankName, result.mappedInterestRate, result.approvedOrRecommendedAmount);
        }
        setTimeout(() => {
          onClose();
        }, 1600);
      } else {
        setErrorMessage(res.error || 'Failed to attach bank to application.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                📂 Documents In Bucket
              </span>
              <span className="text-xs text-indigo-300 font-mono">Case #{application.token}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black mt-1 tracking-tight text-white flex items-center gap-2">
              <span>⚡</span>
              <span>Loan Eligibility & Bank Match</span>
              <span className="text-indigo-300 font-normal text-sm sm:text-base">— {application.fullName || 'Customer File'}</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Dedicated pre-filled underwriting intake. Enter CIBIL score to immediately evaluate live bank cards & rates.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-2.5 text-xs text-rose-800 font-bold flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 font-bold ml-2">✕</button>
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-800 font-bold flex items-center justify-between">
            <span>{successMessage}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TOP SECTION: The CIBIL Score Prominent Input (The primary action) */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-white to-emerald-50/50 p-4 sm:p-5 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span className="text-indigo-600">🎯</span>
                  <span>Enter Applicant CIBIL Score *</span>
                  <span className="text-[11px] font-normal text-slate-500">(Required to match bank policy cards)</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input customer verified credit score or click a quick benchmark below.
                </p>
              </div>

              {/* Live Score Tag & Number Input */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                    cibilScore >= 750
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : cibilScore >= 700
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                      : cibilScore >= 650
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {cibilScore >= 750
                    ? '● Excellent / Prime'
                    : cibilScore >= 700
                    ? '● Good'
                    : cibilScore >= 650
                    ? '● Average'
                    : '● Poor'}
                </span>
                <input
                  type="number"
                  min={300}
                  max={900}
                  value={cibilScore}
                  onChange={(e) => setCibilScore(Number(e.target.value))}
                  className="w-24 p-2 text-center text-lg font-black font-mono rounded-xl border-2 border-indigo-500 bg-white text-indigo-950 shadow-inner focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={550}
              max={900}
              step={5}
              value={cibilScore}
              onChange={(e) => setCibilScore(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />

            {/* Quick Presets */}
            <div className="flex items-center justify-between gap-1 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-slate-500">Quick Presets:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { score: 650, label: '650 (Entry)' },
                  { score: 700, label: '700 (Threshold)' },
                  { score: 750, label: '750 (Prime)' },
                  { score: 800, label: '800 (Super Prime)' },
                ].map((item) => (
                  <button
                    key={item.score}
                    type="button"
                    onClick={() => setCibilScore(item.score)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      cibilScore === item.score
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PRE-FILLED FORM DETAILS & SALARY SLAB FOIR PREVIEW */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <span>📋</span>
                <span>Pre-Filled Case Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAllDetails(!showAllDetails)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                {showAllDetails ? 'Hide Editable Inputs ▲' : 'Edit Pre-Filled Fields ▼'}
              </button>
            </div>

            {/* Read-Only Glance Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Loan Product</span>
                <strong className="text-slate-900 font-extrabold">{LOAN_TYPE_LABELS[loanType]}</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Requested Loan</span>
                <strong className="text-indigo-900 font-extrabold">{formatCurrencyINR(requestedAmount)}</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly Income</span>
                <strong className="text-emerald-900 font-extrabold">{formatCurrencyINR(monthlyIncome)}</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Existing EMIs</span>
                <strong className="text-slate-800 font-extrabold">{formatCurrencyINR(existingEmi)}</strong>
              </div>
            </div>

            {/* Editable Fields (Visible when toggled) */}
            {showAllDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Loan Product</label>
                  <select
                    value={loanType}
                    onChange={(e) => {
                      const newType = e.target.value as LoanType;
                      setLoanType(newType);
                      const maxAllowed = getMaxTenureYearsForLoanType(newType);
                      if (requestedTenureYears > maxAllowed) {
                        setRequestedTenureYears(maxAllowed);
                      }
                    }}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="HOME_LOAN">Home Loan</option>
                    <option value="PERSONAL_LOAN">Personal Loan</option>
                    <option value="BUSINESS_LOAN">Business Loan</option>
                    <option value="LOAN_AGAINST_PROPERTY">Loan Against Property</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Requested Loan (₹)</label>
                  <input
                    type="number"
                    step={25000}
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Monthly In-Hand (₹)</label>
                  <input
                    type="number"
                    step={1000}
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Existing EMIs (₹)</label>
                  <input
                    type="number"
                    step={500}
                    value={existingEmi}
                    onChange={(e) => setExistingEmi(Number(e.target.value))}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Tenure (Years)
                    <span className="text-[10px] text-slate-500 font-normal ml-1">
                      ({loanType === 'HOME_LOAN' ? 'Max 30 yrs' : loanType === 'PERSONAL_LOAN' ? 'Max 7 yrs' : `Max ${maxAllowedTenureYears} yrs`})
                    </span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={maxAllowedTenureYears}
                    value={requestedTenureYears}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRequestedTenureYears(Math.min(maxAllowedTenureYears, Math.max(1, val)));
                    }}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{requestedTenureYears * 12} Months</span>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="SALARIED">Salaried</option>
                    <option value="SELF_EMPLOYED_PROFESSIONAL">Self-Employed Professional</option>
                    <option value="SELF_EMPLOYED_BUSINESS">Self-Employed Business</option>
                  </select>
                </div>
              </div>
            )}

            {/* Salary Slab FOIR Indicator Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-600 font-medium">
                  Auto FOIR Cap: <strong className="text-slate-900">{autoFoirCap}%</strong> ({getSalarySlabDescription(monthlyIncome)})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">
                  Current FOIR: <strong>{currentFoir}%</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-700 font-bold">
                  EMI Headroom: ₹{Math.round(availableEmiHeadroom).toLocaleString('en-IN')}/mo
                </span>
              </div>
            </div>
          </div>

          {/* THE BIG ACTION BUTTON: "Find Eligible Banks & Rates" */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleFindEligibility}
              disabled={isPending}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-black text-sm sm:text-base shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2.5"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Running Bank Policy Match...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">⚡</span>
                  <span>Find Eligible Banks & Rates</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-mono">
                    CIBIL: {cibilScore}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* RESULTS DISPLAY MATRIX */}
          {summary && (
            <div className="space-y-4 pt-3 border-t border-slate-200 animate-in fade-in duration-300">
              {/* Shareable Customer Offer PDF Banner */}
              {offerData && (
                <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md border border-emerald-500/30">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xl shrink-0 border border-emerald-400/30">
                      📄
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white">Shareable Customer Offer PDF Report</h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                          Ready to Send
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Download official letter with bank comparison, eligibility remarks, obligation headroom & mandatory disclaimers.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsOfferPdfModalOpen(true)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
                    >
                      <span>🖨️</span>
                      <span>Preview & Download PDF</span>
                    </button>

                    <a
                      href={generateWhatsAppShareUrl(
                        offerData,
                        typeof window !== 'undefined' && !window.location.origin.includes('onrender.com') && !window.location.origin.includes('localhost')
                          ? `${window.location.origin}/offer/eligibility/${application.token}`
                          : `https://money-shelter.vercel.app/offer/eligibility/${application.token}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 active:scale-95"
                      title="Share directly to customer via WhatsApp"
                    >
                      <span>📲</span>
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Summary Stats Header */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Matchmaking Output
                  </span>
                  <h4 className="text-sm sm:text-base font-black">
                    {summary.eligibleCount} Eligible Banks Found (Evaluated {summary.totalBanksEvaluated} Policies)
                  </h4>
                </div>

                {/* Ranking Sort Filter */}
                <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
                  <span className="text-slate-400 text-[10px] pl-1.5 uppercase">Rank:</span>
                  <button
                    type="button"
                    onClick={() => handleRankChange('LOWEST_RATE')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      rankBy === 'LOWEST_RATE' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Lowest Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRankChange('HIGHEST_AMOUNT')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      rankBy === 'HIGHEST_AMOUNT' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Highest Sanction
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRankChange('LOWEST_EMI')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      rankBy === 'LOWEST_EMI' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Lowest EMI
                  </button>
                </div>
              </div>

              {/* Bank Cards Result List */}
              {summary.results.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-sm font-bold text-slate-700">No active bank policies match this criteria.</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting the CIBIL score or requested tenure.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.results.map((res, idx) => (
                    <div
                      key={res.cardId}
                      className={`p-4 rounded-2xl border transition-all ${
                        res.isEligible
                          ? idx === 0
                            ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-200/60 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                            {res.bankCode ? res.bankCode.substring(0, 3) : 'BNK'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-black text-slate-900 text-base">{res.bankName}</h5>
                              {idx === 0 && res.isEligible && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                                  ★ Best Recommendation
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              TAT: ~{res.tatDays} Days · Likelihood Score: {res.approvalLikelihoodScore}%
                            </span>
                          </div>
                        </div>

                        {/* Status Tag */}
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-black self-start sm:self-auto ${
                            res.status === 'ELIGIBLE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : res.status === 'PARTIALLY_ELIGIBLE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {res.status === 'ELIGIBLE' ? '✓ Eligible' : res.status === 'PARTIALLY_ELIGIBLE' ? '⚠ Partially Eligible' : '✕ Ineligible'}
                        </span>
                      </div>

                      {/* 4 Core Financial Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100 mb-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Interest Rate</span>
                          <strong className="text-emerald-700 font-black text-base">{res.mappedInterestRate.toFixed(2)}%</strong>
                          <span className="text-[10px] text-slate-400 block">p.a. floating</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Sanction Cap</span>
                          <strong className="text-slate-900 font-black text-base">{formatCurrencyINR(res.approvedOrRecommendedAmount)}</strong>
                          <span className="text-[10px] text-slate-400 block">Max Approved</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Monthly EMI</span>
                          <strong className="text-indigo-950 font-black text-base">₹{Math.round(res.proposedEmi).toLocaleString('en-IN')}</strong>
                          <span className="text-[10px] text-slate-400 block">{res.tenureMonths} Months</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">FOIR Status</span>
                          <strong className={`font-black text-base ${res.actualFoirPct > res.maxPermissibleFoirPct ? 'text-amber-700' : 'text-slate-900'}`}>
                            {res.actualFoirPct}%
                          </strong>
                          <span className="text-[10px] text-slate-500 block">Bank Cap: {res.maxPermissibleFoirPct}%</span>
                        </div>
                      </div>

                      {/* Pass Checklist */}
                      {res.passReasons.length > 0 && (
                        <div className="space-y-0.5 mb-2.5">
                          {res.passReasons.slice(0, 3).map((r, rIdx) => (
                            <div key={rIdx} className="text-[11px] text-emerald-800 flex items-start gap-1.5">
                              <span className="text-emerald-500 font-bold shrink-0">✓</span>
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Breach Alert */}
                      {res.breachReasons.length > 0 && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 font-medium mb-3">
                          {res.breachReasons.join(' ')}
                        </div>
                      )}

                      {/* Action Button: Attach to Case */}
                      {res.isEligible && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleAttachBank(res)}
                            disabled={assigningCardId === res.cardId || isPending}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5"
                          >
                            {assigningCardId === res.cardId ? (
                              <span>Assigning to Case...</span>
                            ) : (
                              <>
                                <span>✓</span>
                                <span>Select & Assign {res.bankName} to Loan File</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Money Shelter Sourcing Intelligence & Risk Underwriting
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Close Window
          </button>
        </div>
      </div>

      {/* Customer Shareable Offer PDF Modal */}
      {offerData && (
        <CustomerEligibilityOfferModal
          isOpen={isOfferPdfModalOpen}
          onClose={() => setIsOfferPdfModalOpen(false)}
          initialData={offerData}
          applicationId={application.id}
          applicationToken={application.token}
        />
      )}
    </div>
  );
}
