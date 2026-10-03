'use client';

import React, { useState, useTransition } from 'react';
import type {
  BankPolicyCard,
  CustomerEvaluationInput,
  PolicyEvaluationResult,
  RankingCriterion,
  RecommendationSummary,
  EmploymentType,
} from '@/types/policy';
import type { LoanType } from '@/types/db';
import { LOAN_TYPE_LABELS, formatCurrencyINR } from '@/lib/format';
import { getSalarySlabFoirCap } from '@/lib/policyEngine';
import { evaluateCustomerEligibilityAction, attachRecommendationToApplicationAction } from '@/actions/policyActions';

interface ActiveAppSummary {
  id: string;
  fullName: string;
  mobile: string;
  loanType: LoanType;
  loanAmount: number;
  monthlyIncome: number;
  existingEmi: number;
}

interface EligibilityCalculatorClientProps {
  availableCards: BankPolicyCard[];
  activeApplications: ActiveAppSummary[];
}

const ALL_LOAN_TYPES: { type: LoanType; label: string; icon: string }[] = [
  { type: 'HOME_LOAN', label: 'Home Loan', icon: '🏠' },
  { type: 'PERSONAL_LOAN', label: 'Personal Loan', icon: '👤' },
  { type: 'BUSINESS_LOAN', label: 'Business Loan', icon: '💼' },
  { type: 'LOAN_AGAINST_PROPERTY', label: 'Loan Against Property', icon: '🏢' },
  { type: 'EDUCATION_LOAN', label: 'Education Loan', icon: '🎓' },
  { type: 'GOLD_LOAN', label: 'Gold Loan', icon: '🥇' },
];

export default function EligibilityCalculatorClient({
  availableCards = [],
  activeApplications = [],
}: EligibilityCalculatorClientProps) {
  // Input State
  const [customerName, setCustomerName] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('HOME_LOAN');
  const [cibilScore, setCibilScore] = useState<number>(755);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(75000);
  const [existingEmi, setExistingEmi] = useState<number>(15000);
  const [employmentType, setEmploymentType] = useState<EmploymentType>('SALARIED');
  const [requestedAmount, setRequestedAmount] = useState<number>(3500000);
  const [requestedTenureYears, setRequestedTenureYears] = useState<number>(20);
  const [rankBy, setRankBy] = useState<RankingCriterion>('LOWEST_RATE');

  // Dynamic Criteria State
  const [applicantAge, setApplicantAge] = useState<number>(32);
  const [companyCategory, setCompanyCategory] = useState<
    'SUPER_CAT_A' | 'CAT_A' | 'CAT_B' | 'CAT_C' | 'GOVT' | 'OTHER'
  >('CAT_A');
  const [salaryMode, setSalaryMode] = useState<'BANK_TRANSFER' | 'CHEQUE' | 'CASH'>('BANK_TRANSFER');
  const [locationTier, setLocationTier] = useState<'METRO' | 'TIER_1' | 'TIER_2' | 'TIER_3'>('METRO');
  const [workExperienceMonths, setWorkExperienceMonths] = useState<number>(36);
  const [showDynamicFields, setShowDynamicFields] = useState(false);

  // Link to Application Modal State
  const [selectedResultToAttach, setSelectedResultToAttach] = useState<PolicyEvaluationResult | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [attachSuccess, setAttachSuccess] = useState<string | null>(null);

  // Results State
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<RecommendationSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultFilterTab, setResultFilterTab] = useState<'ELIGIBLE' | 'PARTIAL' | 'INELIGIBLE'>('ELIGIBLE');

  // Quick fill from existing lead
  const handleSelectLead = (appId: string) => {
    if (!activeApplications || activeApplications.length === 0) return;
    const app = activeApplications.find((a) => a && a.id === appId);
    if (!app) return;
    setCustomerName(app.fullName || '');
    if (app.loanType) setLoanType(app.loanType);
    if (app.loanAmount) setRequestedAmount(Number(app.loanAmount));
    if (app.monthlyIncome) setMonthlyIncome(Number(app.monthlyIncome));
    if (app.existingEmi !== undefined && app.existingEmi !== null) setExistingEmi(Number(app.existingEmi));
  };

  // Run evaluation
  const handleEvaluate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setAttachSuccess(null);

    const tenureMonths = requestedTenureYears * 12;

    const input: CustomerEvaluationInput = {
      customerName: customerName.trim() || undefined,
      loanType,
      cibilScore: Number(cibilScore),
      monthlyIncome: Number(monthlyIncome),
      existingEmi: Number(existingEmi),
      employmentType,
      requestedAmount: Number(requestedAmount),
      requestedTenureMonths: tenureMonths,
      applicantAge: Number(applicantAge),
      companyCategory,
      salaryMode,
      locationTier,
      workExperienceMonths: Number(workExperienceMonths),
    };

    startTransition(async () => {
      const res = await evaluateCustomerEligibilityAction(input, rankBy);
      if (res.ok && res.summary) {
        setSummary(res.summary);
      } else {
        setErrorMessage(res.error || 'Evaluation failed. Please review inputs.');
      }
    });
  };

  // Re-rank results when criteria changes
  const handleRankByChange = (newRankBy: RankingCriterion) => {
    setRankBy(newRankBy);
    if (summary) {
      handleEvaluate();
    }
  };

  // Attach recommendation to an application
  const handleAttachRecommendation = () => {
    if (!selectedResultToAttach || !selectedAppId) return;
    startTransition(async () => {
      const res = await attachRecommendationToApplicationAction(selectedAppId, selectedResultToAttach);
      if (res.ok) {
        setAttachSuccess(
          `Successfully assigned ${selectedResultToAttach.bankName} policy to application ${selectedAppId}.`
        );
        setSelectedResultToAttach(null);
      } else {
        setErrorMessage(res.error || 'Failed to attach recommendation to case.');
      }
    });
  };

  // Current FOIR indicator & Auto-Set FOIR Cap by Salary Slab:
  // Under ₹50,000 -> 50%
  // below 75000 -> 60%
  // above 75000 -> 65%
  // 100000 and above -> 70%
  const autoFoirCap = getSalarySlabFoirCap(monthlyIncome);
  const currentFoir = monthlyIncome > 0 ? ((existingEmi / monthlyIncome) * 100).toFixed(1) : '0';
  const maxAllowedObligations = (monthlyIncome * autoFoirCap) / 100;
  const availableEmiHeadroom = Math.max(0, maxAllowedObligations - existingEmi);

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <span>⚠️ {errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {attachSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <span>✓ {attachSuccess}</span>
          <button type="button" onClick={() => setAttachSuccess(null)} className="text-emerald-500 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Left Intake Form (5 cols), Right Recommendation Matrix (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Customer Intake & Policy Parameters Form */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>📋</span>
                <span>Applicant Financial Profile</span>
              </h2>
              {activeApplications && activeApplications.length > 0 && (
                <div className="relative">
                  <select
                    onChange={(e) => handleSelectLead(e.target.value)}
                    defaultValue=""
                    className="text-[11px] font-bold text-indigo-700 bg-indigo-50/70 border border-indigo-200 rounded-lg px-2 py-1 cursor-pointer hover:bg-indigo-100/70 transition"
                  >
                    <option value="" disabled>
                      ⚡ Autofill from Active Lead...
                    </option>
                    {(activeApplications || []).map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.fullName} ({formatCurrencyINR(app.loanAmount)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Input customer financial obligations and credit parameters to run matchmaking against all active bank cards.
            </p>
          </div>

          <form onSubmit={handleEvaluate} className="space-y-3.5 text-xs">
            {/* Customer Name */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Applicant Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kulkarni"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            {/* Loan Category */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Loan Category *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {ALL_LOAN_TYPES.map((lt) => (
                  <button
                    type="button"
                    key={lt.type}
                    onClick={() => {
                      setLoanType(lt.type);
                      if (lt.type === 'PERSONAL_LOAN' && requestedTenureYears > 5) setRequestedTenureYears(5);
                    }}
                    className={`p-2 rounded-xl border text-left font-bold text-xs transition flex items-center gap-1.5 ${
                      loanType === lt.type
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{lt.icon}</span>
                    <span className="truncate">{lt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CIBIL Score */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">CIBIL Credit Score *</label>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      cibilScore >= 750
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : cibilScore >= 700
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                        : cibilScore >= 650
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                    }`}
                  >
                    {cibilScore >= 750
                      ? '● Excellent'
                      : cibilScore >= 700
                      ? '● Good'
                      : cibilScore >= 650
                      ? '● Average'
                      : '● Poor'}
                  </span>
                  <span className="font-mono font-black text-sm text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                    {cibilScore}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={550}
                max={900}
                step={5}
                value={cibilScore}
                onChange={(e) => setCibilScore(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>550 (Risk)</span>
                <span>700 (Threshold)</span>
                <span>750+ (Prime)</span>
                <span>900</span>
              </div>
            </div>

            {/* Income & Existing EMIs */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Monthly In-Hand (₹) *</label>
                <input
                  type="number"
                  required
                  step={1000}
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">Auto FOIR Cap:</span>
                  <span className="px-1.5 py-0.5 rounded font-black bg-indigo-50 border border-indigo-200 text-indigo-700">
                    {autoFoirCap}% ({monthlyIncome < 50000 ? '< ₹50k' : monthlyIncome < 75000 ? '< ₹75k' : monthlyIncome < 100000 ? '≥ ₹75k' : '≥ ₹100k'})
                  </span>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Existing Monthly EMIs (₹)</label>
                <input
                  type="number"
                  step={500}
                  value={existingEmi}
                  onChange={(e) => setExistingEmi(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">Available Headroom:</span>
                  <span className={`font-mono font-bold ${availableEmiHeadroom > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ₹{Math.round(availableEmiHeadroom).toLocaleString('en-IN')}/mo
                  </span>
                </div>
              </div>
            </div>

            {/* FOIR Affordability Analysis & Salary Slab Matrix */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-bold flex items-center gap-1.5">
                  <span>📊</span>
                  <span>FOIR Affordability Analysis</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200">
                  Auto FOIR Cap: {autoFoirCap}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">
                    Existing EMIs: ₹{existingEmi.toLocaleString('en-IN')} ({currentFoir}%)
                  </span>
                  <span className="font-bold text-slate-700">
                    Max Permitted: {autoFoirCap}% (₹{Math.round(maxAllowedObligations).toLocaleString('en-IN')})
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                  <div
                    className={`h-2 transition-all ${
                      Number(currentFoir) > autoFoirCap
                        ? 'bg-rose-500'
                        : Number(currentFoir) > autoFoirCap - 15
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (Number(currentFoir) / autoFoirCap) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Salary Slab Reference Grid */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Salary Slab FOIR Grid (Net Monthly)
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold">
                    Current: {autoFoirCap}% Cap
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-[10px] text-center font-mono">
                  <div
                    onClick={() => setMonthlyIncome(45000)}
                    className={`p-1.5 rounded-xl border cursor-pointer transition ${
                      monthlyIncome < 50000
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold ring-2 ring-indigo-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[9px] opacity-80">&lt; ₹50,000</span>
                    <strong className="text-xs">50%</strong>
                  </div>
                  <div
                    onClick={() => setMonthlyIncome(60000)}
                    className={`p-1.5 rounded-xl border cursor-pointer transition ${
                      monthlyIncome >= 50000 && monthlyIncome < 75000
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold ring-2 ring-indigo-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[9px] opacity-80">below 75k</span>
                    <strong className="text-xs">60%</strong>
                  </div>
                  <div
                    onClick={() => setMonthlyIncome(85000)}
                    className={`p-1.5 rounded-xl border cursor-pointer transition ${
                      monthlyIncome >= 75000 && monthlyIncome < 100000
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold ring-2 ring-indigo-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[9px] opacity-80">above 75k</span>
                    <strong className="text-xs">65%</strong>
                  </div>
                  <div
                    onClick={() => setMonthlyIncome(120000)}
                    className={`p-1.5 rounded-xl border cursor-pointer transition ${
                      monthlyIncome >= 100000
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold ring-2 ring-indigo-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[9px] opacity-80">&ge; 100k</span>
                    <strong className="text-xs">70%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Requested Loan Amount & Tenure */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Requested Loan (₹) *</label>
                <input
                  type="number"
                  required
                  step={25000}
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-950"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">{formatCurrencyINR(requestedAmount)}</span>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tenure (Years) *</label>
                <input
                  type="number"
                  min={1}
                  max={loanType === 'PERSONAL_LOAN' ? 5 : 30}
                  value={requestedTenureYears}
                  onChange={(e) => setRequestedTenureYears(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">{requestedTenureYears * 12} Months</span>
              </div>
            </div>

            {/* Employment Type */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Employment / Business Type *</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold bg-white"
              >
                <option value="SALARIED">Salaried Employee</option>
                <option value="SELF_EMPLOYED_PROFESSIONAL">Self-Employed Professional (Doctor, CA, Architect)</option>
                <option value="SELF_EMPLOYED_BUSINESS">Self-Employed Business / Trader (SENP)</option>
                <option value="CASH_SALARY">Cash Salary / Unorganized</option>
              </select>
            </div>

            {/* Dynamic Criteria Toggle */}
            <div className="border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => setShowDynamicFields(!showDynamicFields)}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center justify-between w-full py-1"
              >
                <span>⚙️ Dynamic Criteria (Age, Company Tier, Salary Mode)</span>
                <span>{showDynamicFields ? '▲ Hide' : '▼ Expand'}</span>
              </button>

              {showDynamicFields && (
                <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Age (Years)</label>
                      <input
                        type="number"
                        min={18}
                        max={75}
                        value={applicantAge}
                        onChange={(e) => setApplicantAge(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Employer Category</label>
                      <select
                        value={companyCategory}
                        onChange={(e) => setCompanyCategory(e.target.value as any)}
                        className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="SUPER_CAT_A">Super Cat A (MNCs / Fortune 500)</option>
                        <option value="CAT_A">Cat A (Top Tier Corporates)</option>
                        <option value="CAT_B">Cat B (Mid-sized Corporates)</option>
                        <option value="CAT_C">Cat C (Small Private Entities)</option>
                        <option value="GOVT">Govt / PSU</option>
                        <option value="OTHER">Other / Proprietorship</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Salary Credit Mode</label>
                      <select
                        value={salaryMode}
                        onChange={(e) => setSalaryMode(e.target.value as any)}
                        className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                        <option value="CHEQUE">Company Cheque</option>
                        <option value="CASH">Cash in Hand</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Location Tier</label>
                      <select
                        value={locationTier}
                        onChange={(e) => setLocationTier(e.target.value as any)}
                        className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="METRO">Metro (Mumbai, Delhi, Blr, etc.)</option>
                        <option value="TIER_1">Tier 1 (Pune, Ahmedabad, etc.)</option>
                        <option value="TIER_2">Tier 2 Cities</option>
                        <option value="TIER_3">Tier 3 / Rural</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Total Work Vintage (Months)</label>
                    <input
                      type="number"
                      min={0}
                      value={workExperienceMonths}
                      onChange={(e) => setWorkExperienceMonths(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Matchmaking */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md active:scale-98 transition flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Running Bank Policy Matchmaking...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Find Eligible Banks & Rates</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Recommendation Engine Results Matrix */}
        <div className="lg:col-span-7 space-y-3.5">
          {summary ? (
            <div className="space-y-3.5">
              {/* Summary Stats Header */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏆</span>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Recommendation Matrix ({summary.totalBanksEvaluated} Policies Evaluated)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Evaluated for <strong>{LOAN_TYPE_LABELS[summary.input.loanType] || summary.input.loanType}</strong> (CIBIL: {summary.input.cibilScore}, Income: {formatCurrencyINR(summary.input.monthlyIncome)}/m)
                    </p>
                  </div>

                  {/* Ranking Criteria Selector */}
                  <div className="flex items-center gap-1.5 self-start sm:self-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Rank By:</span>
                    <select
                      value={rankBy}
                      onChange={(e) => handleRankByChange(e.target.value as RankingCriterion)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden"
                    >
                      <option value="LOWEST_RATE">📉 Lowest Interest Rate</option>
                      <option value="HIGHEST_AMOUNT">💰 Highest Sanction Amount</option>
                      <option value="LOWEST_EMI">🏷️ Lowest Monthly EMI</option>
                      <option value="BEST_MATCH">🎯 Approval Likelihood Score</option>
                    </select>
                  </div>
                </div>

                {/* Score Pill Counters */}
                <div className="grid grid-cols-3 gap-2 pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setResultFilterTab('ELIGIBLE')}
                    className={`p-2 rounded-xl border transition ${
                      resultFilterTab === 'ELIGIBLE'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs block text-slate-500 font-semibold">Fully Eligible</span>
                    <strong className="text-base text-emerald-700">{summary.eligibleCount} Banks</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResultFilterTab('PARTIAL')}
                    className={`p-2 rounded-xl border transition ${
                      resultFilterTab === 'PARTIAL'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs block text-slate-500 font-semibold">Partially Eligible</span>
                    <strong className="text-base text-amber-700">{summary.partiallyEligibleCount} Banks</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResultFilterTab('INELIGIBLE')}
                    className={`p-2 rounded-xl border transition ${
                      resultFilterTab === 'INELIGIBLE'
                        ? 'bg-rose-50 border-rose-400 text-rose-950 font-bold shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs block text-slate-500 font-semibold">Policy Breached</span>
                    <strong className="text-base text-rose-700">{summary.ineligibleCount} Banks</strong>
                  </button>
                </div>
              </div>

              {/* Filtered Results Stream */}
              <div className="space-y-3">
                {summary.results
                  .filter((r) => {
                    if (resultFilterTab === 'ELIGIBLE') return r.status === 'ELIGIBLE';
                    if (resultFilterTab === 'PARTIAL') return r.status === 'PARTIALLY_ELIGIBLE';
                    if (resultFilterTab === 'INELIGIBLE') return r.status === 'INELIGIBLE';
                    return true;
                  })
                  .map((res, idx) => {
                    const isTopPick = idx === 0 && res.status === 'ELIGIBLE';
                    return (
                      <div
                        key={res.cardId}
                        className={`bg-white border rounded-2xl p-4 shadow-2xs transition relative overflow-hidden ${
                          isTopPick
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                            : res.status === 'ELIGIBLE'
                            ? 'border-slate-200/90 hover:border-indigo-400'
                            : res.status === 'PARTIALLY_ELIGIBLE'
                            ? 'border-amber-200 bg-amber-50/20'
                            : 'border-slate-200 bg-slate-50/40 opacity-75'
                        }`}
                      >
                        {isTopPick && (
                          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider shadow-xs">
                            ★ Top Recommendation
                          </div>
                        )}

                        {/* Top Bank Info Bar */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shrink-0">
                              {res.bankCode}
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900">{res.bankName}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-500">TAT: ~{res.tatDays} days</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-[10px] font-bold text-indigo-700">
                                  Approval Likelihood: {res.approvalLikelihoodScore}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Interest Rate</span>
                            <strong className="text-lg font-black text-emerald-700 leading-tight">
                              {res.mappedInterestRate.toFixed(2)}%
                            </strong>
                            <span className="text-[10px] text-slate-500 block">p.a.</span>
                          </div>
                        </div>

                        {/* Metrics Bar */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 text-xs mb-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Monthly EMI</span>
                            <strong className="text-slate-900 font-extrabold text-sm">
                              {formatCurrencyINR(res.proposedEmi)}
                            </strong>
                            <span className="text-[10px] text-slate-400 block">for {res.tenureMonths}m</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Sanction Cap</span>
                            <strong className="text-slate-900 font-extrabold text-sm">
                              {formatCurrencyINR(res.approvedOrRecommendedAmount)}
                            </strong>
                            <span className="text-[10px] text-slate-400 block">
                              {res.approvedOrRecommendedAmount < res.requestedAmount ? 'Adjusted for FOIR' : 'Full Request'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total FOIR</span>
                            <strong
                              className={`font-extrabold text-sm ${
                                res.actualFoirPct > res.maxPermissibleFoirPct ? 'text-amber-700' : 'text-slate-900'
                              }`}
                            >
                              {res.actualFoirPct}%
                            </strong>
                            <span className="text-[10px] text-slate-400 block">Max: {res.maxPermissibleFoirPct}%</span>
                          </div>
                        </div>

                        {/* Passed Reasons Checklist */}
                        {res.passReasons.length > 0 && (
                          <div className="space-y-1 mb-2.5">
                            {res.passReasons.map((p, pIdx) => (
                              <div key={pIdx} className="flex items-start gap-1.5 text-[11px] text-emerald-800">
                                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                <span>{p}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Breach / Alert Warnings */}
                        {res.breachReasons.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 space-y-1 mb-3">
                            <span className="text-[10px] font-bold text-rose-800 uppercase block">
                              Policy Threshold Breaches:
                            </span>
                            {res.breachReasons.map((b, bIdx) => (
                              <div key={bIdx} className="flex items-start gap-1.5 text-[11px] text-rose-700 font-medium">
                                <span className="text-rose-500 font-bold shrink-0">✕</span>
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Financial Cost Breakdown Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                          <div>
                            Proc. Fee: <strong className="text-slate-700">₹{res.processingFeeAmount.toLocaleString('en-IN')}</strong> | Total Repayment: <strong className="text-slate-700">{formatCurrencyINR(res.totalRepaymentAmount)}</strong>
                          </div>

                          {/* Action Button: Assign or Share */}
                          {res.isEligible && activeApplications && activeApplications.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedResultToAttach(res);
                                setSelectedAppId(activeApplications[0]?.id || '');
                              }}
                              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs active:scale-95 transition"
                            >
                              Assign to Lead →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {summary.results.filter((r) => {
                  if (resultFilterTab === 'ELIGIBLE') return r.status === 'ELIGIBLE';
                  if (resultFilterTab === 'PARTIAL') return r.status === 'PARTIALLY_ELIGIBLE';
                  if (resultFilterTab === 'INELIGIBLE') return r.status === 'INELIGIBLE';
                  return true;
                }).length === 0 && (
                  <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
                    <p className="text-slate-500 text-xs">No banks under the &ldquo;{resultFilterTab}&rdquo; category.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State Placeholder */
            <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center shadow-2xs flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-3xl mb-3 shadow-inner">
                ⚡
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Ready to Evaluate Applicant</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Fill out the customer financial profile on the left and click &ldquo;Find Eligible Banks & Rates&rdquo; to execute the automated policy rules engine.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                <span>{(availableCards?.length || 0)} Institutional Bank Cards Active</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ASSIGN RECOMMENDATION TO CASE */}
      {selectedResultToAttach && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Assign Bank Sourcing Recommendation</h3>
              <button
                type="button"
                onClick={() => setSelectedResultToAttach(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 space-y-1">
              <p>
                <strong>Bank:</strong> {selectedResultToAttach.bankName}
              </p>
              <p>
                <strong>Recommended Rate:</strong> {selectedResultToAttach.mappedInterestRate}% p.a.
              </p>
              <p>
                <strong>Sanction Cap:</strong> {formatCurrencyINR(selectedResultToAttach.approvedOrRecommendedAmount)}
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">Select Target Loan Application *</label>
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
              >
                {(activeApplications || []).map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.fullName} ({app.id}) — {formatCurrencyINR(app.loanAmount)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedResultToAttach(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAttachRecommendation}
                disabled={isPending}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                {isPending && <span className="animate-spin text-xs">⏳</span>}
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
