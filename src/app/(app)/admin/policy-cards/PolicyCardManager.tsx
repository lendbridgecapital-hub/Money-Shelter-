'use client';

import React, { useState, useTransition } from 'react';
import type { BankPolicyCard, DynamicCriteriaFieldDef, RateMatrixTier, EmploymentType } from '@/types/policy';
import type { LoanType } from '@/types/db';
import { LOAN_TYPE_LABELS, formatCurrencyINR } from '@/lib/format';
import { getSalarySlabFoirCap } from '@/lib/policyEngine';
import {
  saveBankPolicyCardAction,
  deleteBankPolicyCardAction,
  toggleBankPolicyCardStatusAction,
} from '@/actions/policyActions';

interface PolicyCardManagerProps {
  initialCards: BankPolicyCard[];
  dynamicDefs: DynamicCriteriaFieldDef[];
}

const ALL_LOAN_TYPES: { type: LoanType; label: string; icon: string }[] = [
  { type: 'HOME_LOAN', label: 'Home Loan', icon: '🏠' },
  { type: 'PERSONAL_LOAN', label: 'Personal Loan', icon: '👤' },
  { type: 'BUSINESS_LOAN', label: 'Business Loan', icon: '💼' },
  { type: 'LOAN_AGAINST_PROPERTY', label: 'Loan Against Property', icon: '🏢' },
  { type: 'EDUCATION_LOAN', label: 'Education Loan', icon: '🎓' },
  { type: 'GOLD_LOAN', label: 'Gold Loan', icon: '🥇' },
];

const ALL_EMPLOYMENT_TYPES: { id: EmploymentType; label: string }[] = [
  { id: 'SALARIED', label: 'Salaried' },
  { id: 'SELF_EMPLOYED_PROFESSIONAL', label: 'Self-Employed Professional (SEP)' },
  { id: 'SELF_EMPLOYED_BUSINESS', label: 'Self-Employed Business (SENP)' },
  { id: 'CASH_SALARY', label: 'Cash Salary' },
];

export default function PolicyCardManager({ initialCards, dynamicDefs }: PolicyCardManagerProps) {
  const [cards, setCards] = useState<BankPolicyCard[]>(initialCards);
  const [selectedLoanType, setSelectedLoanType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State for Create / Edit
  const [editingCard, setEditingCard] = useState<BankPolicyCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'CORE' | 'RATE_MATRIX' | 'DYNAMIC' | 'FEATURES'>('CORE');

  // Form State
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('HOME_LOAN');
  const [minCibil, setMinCibil] = useState<number>(700);
  const [maxCibil, setMaxCibil] = useState<number>(900);
  const [minMonthlyIncome, setMinMonthlyIncome] = useState<number>(30000);
  const [maxFoirPct, setMaxFoirPct] = useState<number>(50);
  const [allowedIncomeTypes, setAllowedIncomeTypes] = useState<EmploymentType[]>(['SALARIED']);
  const [minTenureMonths, setMinTenureMonths] = useState<number>(12);
  const [maxTenureMonths, setMaxTenureMonths] = useState<number>(240);
  const [minLoanAmount, setMinLoanAmount] = useState<number>(100000);
  const [maxLoanAmount, setMaxLoanAmount] = useState<number>(50000000);
  const [baseInterestRate, setBaseInterestRate] = useState<number>(8.5);
  const [processingFeePct, setProcessingFeePct] = useState<number>(0.5);
  const [processingFeeFlat, setProcessingFeeFlat] = useState<string>('');
  const [tatDays, setTatDays] = useState<number>(3);
  const [specialFeaturesText, setSpecialFeaturesText] = useState('');
  const [rateMatrix, setRateMatrix] = useState<RateMatrixTier[]>([]);

  // Dynamic Criteria Form State
  const [minAge, setMinAge] = useState<number>(21);
  const [maxAge, setMaxAge] = useState<number>(65);
  const [minWorkExp, setMinWorkExp] = useState<number>(24);
  const [companyCategories, setCompanyCategories] = useState<string[]>([
    'SUPER_CAT_A',
    'CAT_A',
    'CAT_B',
    'GOVT',
  ]);
  const [salaryModes, setSalaryModes] = useState<string[]>(['BANK_TRANSFER']);
  const [locationTiers, setLocationTiers] = useState<string[]>(['METRO', 'TIER_1', 'TIER_2']);
  const [customJsonCriteria, setCustomJsonCriteria] = useState<string>('{}');

  const openCreateModal = () => {
    setEditingCard(null);
    setBankName('');
    setBankCode('');
    setLogoUrl('');
    setLoanType('HOME_LOAN');
    setMinCibil(700);
    setMaxCibil(900);
    setMinMonthlyIncome(30000);
    setMaxFoirPct(50);
    setAllowedIncomeTypes(['SALARIED']);
    setMinTenureMonths(12);
    setMaxTenureMonths(240);
    setMinLoanAmount(100000);
    setMaxLoanAmount(50000000);
    setBaseInterestRate(8.5);
    setProcessingFeePct(0.5);
    setProcessingFeeFlat('');
    setTatDays(3);
    setSpecialFeaturesText('Instant In-Principle Sanction\nZero Prepayment Penalty on Floating Rate');
    setRateMatrix([
      { cibilMin: 750, cibilMax: 900, interestRate: 8.4, maxFoirPct: 65, description: 'Prime Band (750+ CIBIL)' },
      { cibilMin: 700, cibilMax: 749, interestRate: 8.8, maxFoirPct: 55, description: 'Standard Band (700-749 CIBIL)' },
    ]);
    setMinAge(21);
    setMaxAge(65);
    setMinWorkExp(24);
    setCompanyCategories(['SUPER_CAT_A', 'CAT_A', 'CAT_B', 'GOVT']);
    setSalaryModes(['BANK_TRANSFER']);
    setLocationTiers(['METRO', 'TIER_1', 'TIER_2']);
    setCustomJsonCriteria('{}');
    setActiveModalTab('CORE');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (card: BankPolicyCard) => {
    setEditingCard(card);
    setBankName(card.bankName);
    setBankCode(card.bankCode);
    setLogoUrl(card.logoUrl || '');
    setLoanType(card.loanType);
    setMinCibil(card.minCibil);
    setMaxCibil(card.maxCibil);
    setMinMonthlyIncome(card.minMonthlyIncome);
    setMaxFoirPct(card.maxFoirPct);
    setAllowedIncomeTypes(card.allowedIncomeTypes || ['SALARIED']);
    setMinTenureMonths(card.minTenureMonths);
    setMaxTenureMonths(card.maxTenureMonths);
    setMinLoanAmount(card.minLoanAmount);
    setMaxLoanAmount(card.maxLoanAmount);
    setBaseInterestRate(card.baseInterestRate);
    setProcessingFeePct(card.processingFeePct);
    setProcessingFeeFlat(card.processingFeeFlat ? String(card.processingFeeFlat) : '');
    setTatDays(card.tatDays || 3);
    setSpecialFeaturesText((card.specialFeatures || []).join('\n'));
    setRateMatrix(card.rateMatrix || []);

    const dyn = card.dynamicCriteria || {};
    setMinAge(typeof dyn.minAge === 'number' ? dyn.minAge : 21);
    setMaxAge(typeof dyn.maxAge === 'number' ? dyn.maxAge : 65);
    setMinWorkExp(typeof dyn.minWorkExperienceMonths === 'number' ? dyn.minWorkExperienceMonths : 24);
    setCompanyCategories(Array.isArray(dyn.allowedCompanyCategories) ? dyn.allowedCompanyCategories : ['ALL']);
    setSalaryModes(Array.isArray(dyn.allowedSalaryModes) ? dyn.allowedSalaryModes : ['BANK_TRANSFER']);
    setLocationTiers(Array.isArray(dyn.locationTiers) ? dyn.locationTiers : ['METRO', 'TIER_1']);
    setCustomJsonCriteria(JSON.stringify(dyn, null, 2));

    setActiveModalTab('CORE');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    let parsedCustomJson: Record<string, unknown> = {};
    try {
      parsedCustomJson = JSON.parse(customJsonCriteria || '{}');
    } catch {
      setErrorMessage('Dynamic Criteria custom JSON is invalid. Please check syntax.');
      return;
    }

    const compiledDynamicCriteria: Record<string, unknown> = {
      ...parsedCustomJson,
      minAge: Number(minAge),
      maxAge: Number(maxAge),
      minWorkExperienceMonths: Number(minWorkExp),
      allowedCompanyCategories: companyCategories,
      allowedSalaryModes: salaryModes,
      locationTiers,
    };

    const featuresList = specialFeaturesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      const res = await saveBankPolicyCardAction({
        id: editingCard?.id,
        bankName,
        bankCode,
        logoUrl: logoUrl.trim() || undefined,
        loanType,
        minCibil: Number(minCibil),
        maxCibil: Number(maxCibil),
        minMonthlyIncome: Number(minMonthlyIncome),
        maxFoirPct: Number(maxFoirPct),
        allowedIncomeTypes,
        minTenureMonths: Number(minTenureMonths),
        maxTenureMonths: Number(maxTenureMonths),
        minLoanAmount: Number(minLoanAmount),
        maxLoanAmount: Number(maxLoanAmount),
        baseInterestRate: Number(baseInterestRate),
        processingFeePct: Number(processingFeePct),
        processingFeeFlat: processingFeeFlat ? Number(processingFeeFlat) : undefined,
        rateMatrix,
        dynamicCriteria: compiledDynamicCriteria,
        tatDays: Number(tatDays),
        specialFeatures: featuresList,
        active: editingCard ? editingCard.active : true,
      });

      if (res.ok && res.card) {
        setSuccessMessage(`Bank Policy Card for ${res.card.bankName} (${res.card.loanType}) saved successfully.`);
        if (editingCard) {
          setCards((prev) => prev.map((c) => (c.id === res.card!.id ? res.card! : c)));
        } else {
          setCards((prev) => [res.card!, ...prev]);
        }
        setIsModalOpen(false);
      } else {
        setErrorMessage(res.error || 'Failed to save card.');
      }
    });
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      const res = await toggleBankPolicyCardStatusAction(id, !currentActive);
      if (res.ok) {
        setCards((prev) => prev.map((c) => (c.id === id ? { ...c, active: !currentActive } : c)));
      } else {
        setErrorMessage(res.error || 'Failed to update status.');
      }
    });
  };

  const handleDeleteCard = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the policy card for ${name}?`)) return;
    startTransition(async () => {
      const res = await deleteBankPolicyCardAction(id);
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== id));
        setSuccessMessage(`Policy card deleted.`);
      } else {
        setErrorMessage(res.error || 'Failed to delete card.');
      }
    });
  };

  // Add / remove Rate Matrix tiers
  const addRateTier = () => {
    setRateMatrix((prev) => [
      ...prev,
      {
        cibilMin: 700,
        cibilMax: 749,
        interestRate: baseInterestRate,
        maxFoirPct,
        description: 'New CIBIL Tier',
      },
    ]);
  };

  const updateRateTier = (index: number, updates: Partial<RateMatrixTier>) => {
    setRateMatrix((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const removeRateTier = (index: number) => {
    setRateMatrix((prev) => prev.filter((_, i) => i !== index));
  };

  // Filtered Cards
  const filteredCards = cards.filter((c) => {
    if (selectedLoanType !== 'ALL' && c.loanType !== selectedLoanType) return false;
    if (activeFilter === 'ACTIVE' && !c.active) return false;
    if (activeFilter === 'INACTIVE' && c.active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.bankName.toLowerCase().includes(q);
      const matchCode = c.bankCode.toLowerCase().includes(q);
      const matchType = (LOAN_TYPE_LABELS[c.loanType] || c.loanType).toLowerCase().includes(q);
      return matchName || matchCode || matchType;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 font-bold ml-2">
            ✕
          </button>
        </div>
      )}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>✓ {successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search bank name, code (e.g. HDFC, SBI)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions & Filters */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Status Filter */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeFilter === 'ALL' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({cards.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('ACTIVE')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeFilter === 'ACTIVE'
                    ? 'bg-white shadow-2xs text-emerald-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Active ({cards.filter((c) => c.active).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('INACTIVE')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeFilter === 'INACTIVE'
                    ? 'bg-white shadow-2xs text-slate-800'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Inactive ({cards.filter((c) => !c.active).length})
              </button>
            </div>

            {/* Create Card Button */}
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1.5 shrink-0"
            >
              <span>+</span>
              <span>New Bank Card</span>
            </button>
          </div>
        </div>

        {/* Loan Type Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => setSelectedLoanType('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap ${
              selectedLoanType === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Categories
          </button>
          {ALL_LOAN_TYPES.map((lt) => (
            <button
              type="button"
              key={lt.type}
              onClick={() => setSelectedLoanType(lt.type)}
              className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                selectedLoanType === lt.type
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{lt.icon}</span>
              <span>{lt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredCards.map((card) => {
          const typeObj = ALL_LOAN_TYPES.find((t) => t.type === card.loanType);
          return (
            <div
              key={card.id}
              className={`bg-white border rounded-2xl p-4 shadow-2xs transition-all relative flex flex-col justify-between ${
                card.active ? 'border-slate-200/90 hover:border-emerald-500/50' : 'border-slate-200 opacity-65 bg-slate-50/50'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shrink-0 shadow-2xs">
                      {card.bankCode}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 leading-tight">{card.bankName}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          {typeObj?.icon} {LOAN_TYPE_LABELS[card.loanType] || card.loanType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">TAT: {card.tatDays || 3}d</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(card.id, card.active)}
                    title={card.active ? 'Click to deactivate' : 'Click to activate'}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition ${
                      card.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {card.active ? '● Active' : '○ Inactive'}
                  </button>
                </div>

                {/* Core Parameters Matrix */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 border border-slate-200/70 rounded-xl p-2.5 text-xs mb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Base Rate / Grid</span>
                    <strong className="text-emerald-700 font-extrabold text-sm">
                      {card.baseInterestRate.toFixed(2)}%
                    </strong>
                    {card.rateMatrix?.length > 0 && (
                      <span className="text-[10px] text-slate-500 block">({card.rateMatrix.length} CIBIL tiers)</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Max FOIR Ratio</span>
                    <strong className="text-slate-900 font-extrabold text-sm">{card.maxFoirPct}%</strong>
                    <span className="text-[10px] text-slate-400 block">EMI to Income</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">CIBIL Requirement</span>
                    <strong className="text-slate-800 font-bold text-xs">
                      {card.minCibil} - {card.maxCibil}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Min. Income</span>
                    <strong className="text-slate-800 font-bold text-xs">
                      ₹{card.minMonthlyIncome.toLocaleString('en-IN')}/m
                    </strong>
                  </div>
                </div>

                {/* Secondary Specifications */}
                <div className="space-y-1.5 text-xs text-slate-600 mb-3 border-t border-slate-100 pt-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Max Sanction Cap:</span>
                    <strong className="text-slate-800">{formatCurrencyINR(card.maxLoanAmount)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Max Loan Tenure:</span>
                    <strong className="text-slate-800">{card.maxTenureMonths} months ({Math.round(card.maxTenureMonths / 12)} yrs)</strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Processing Fee:</span>
                    <strong className="text-slate-800">{card.processingFeePct}% {card.processingFeeFlat ? `(Min ₹${card.processingFeeFlat})` : ''}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Allowed Profiles:</span>
                    <span className="text-slate-700 font-bold text-[10px] truncate max-w-[150px]">
                      {card.allowedIncomeTypes.map((t) => t.replace(/_/g, ' ')).join(', ')}
                    </span>
                  </div>
                </div>

                {/* Special Highlights / Features */}
                {card.specialFeatures && card.specialFeatures.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {card.specialFeatures.slice(0, 2).map((feat, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold"
                      >
                        ★ {feat}
                      </span>
                    ))}
                    {card.specialFeatures.length > 2 && (
                      <span className="text-[10px] text-slate-400 self-center">
                        +{card.specialFeatures.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                <button
                  type="button"
                  onClick={() => openEditModal(card)}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                >
                  Edit Policy
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCard(card.id, card.bankName)}
                  className="px-2.5 py-1 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-bold transition"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-4xl block mb-2">💳</span>
          <h3 className="text-base font-bold text-slate-800">No Bank Policy Cards Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No bank policy matches your active filter. Click &ldquo;New Bank Card&rdquo; above to set up institutional lending criteria.
          </p>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-extrabold">
                  {editingCard ? `Edit Policy Card: ${editingCard.bankName}` : 'Create New Bank Policy Card'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Institutional lending criteria, FOIR thresholds, and interest rate grid.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 shrink-0 text-xs font-bold gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveModalTab('CORE')}
                className={`pb-2.5 px-3 border-b-2 transition ${
                  activeModalTab === 'CORE'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Core Lending Criteria
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('RATE_MATRIX')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
                  activeModalTab === 'RATE_MATRIX'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>2. CIBIL Rate Matrix</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                  {rateMatrix.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('DYNAMIC')}
                className={`pb-2.5 px-3 border-b-2 transition ${
                  activeModalTab === 'DYNAMIC'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. Dynamic Criteria (JSONB)
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('FEATURES')}
                className={`pb-2.5 px-3 border-b-2 transition ${
                  activeModalTab === 'FEATURES'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                4. Turnaround & Highlights
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveCard} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* TAB 1: CORE CRITERIA */}
              {activeModalTab === 'CORE' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Bank Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. HDFC Bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Bank Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. HDFC"
                        value={bankCode}
                        onChange={(e) => setBankCode(e.target.value.toUpperCase())}
                        className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 uppercase font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Loan Category *</label>
                      <select
                        value={loanType}
                        onChange={(e) => setLoanType(e.target.value as LoanType)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold bg-white"
                      >
                        {ALL_LOAN_TYPES.map((t) => (
                          <option key={t.type} value={t.type}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Min CIBIL *</label>
                      <input
                        type="number"
                        required
                        min={300}
                        max={900}
                        value={minCibil}
                        onChange={(e) => setMinCibil(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Max CIBIL *</label>
                      <input
                        type="number"
                        required
                        min={300}
                        max={900}
                        value={maxCibil}
                        onChange={(e) => setMaxCibil(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 block">Min Monthly Income (₹) *</label>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Slab: {getSalarySlabFoirCap(minMonthlyIncome)}% FOIR
                        </span>
                      </div>
                      <input
                        type="number"
                        required
                        min={5000}
                        step={1000}
                        value={minMonthlyIncome}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMinMonthlyIncome(val);
                          setMaxFoirPct(getSalarySlabFoirCap(val));
                        }}
                        className="w-full p-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 block">Max FOIR Ratio (%) *</label>
                        <span className="text-[10px] text-slate-400">Total EMIs/Income</span>
                      </div>
                      <input
                        type="number"
                        required
                        min={10}
                        max={100}
                        step={1}
                        value={maxFoirPct}
                        onChange={(e) => setMaxFoirPct(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                      />
                      {/* Auto-set quick preset pills */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <button
                          type="button"
                          onClick={() => setMaxFoirPct(50)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                            maxFoirPct === 50 ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          &lt; ₹50k (50%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaxFoirPct(60)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                            maxFoirPct === 60 ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          below 75k (60%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaxFoirPct(65)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                            maxFoirPct === 65 ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          above 75k (65%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaxFoirPct(70)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                            maxFoirPct === 70 ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          100k+ (70%)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Allowed Income Types */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">Permissible Employment / Income Types *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ALL_EMPLOYMENT_TYPES.map((emp) => {
                        const isChecked = allowedIncomeTypes.includes(emp.id);
                        return (
                          <label
                            key={emp.id}
                            className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 text-xs font-semibold ${
                              isChecked
                                ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAllowedIncomeTypes([...allowedIncomeTypes, emp.id]);
                                } else {
                                  setAllowedIncomeTypes(allowedIncomeTypes.filter((t) => t !== emp.id));
                                }
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{emp.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Amounts & Tenures */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Min Loan (₹)</label>
                      <input
                        type="number"
                        value={minLoanAmount}
                        onChange={(e) => setMinLoanAmount(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Max Loan Cap (₹) *</label>
                      <input
                        type="number"
                        required
                        value={maxLoanAmount}
                        onChange={(e) => setMaxLoanAmount(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Min Tenure (m)</label>
                      <input
                        type="number"
                        value={minTenureMonths}
                        onChange={(e) => setMinTenureMonths(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Max Tenure (m) *</label>
                      <input
                        type="number"
                        required
                        value={maxTenureMonths}
                        onChange={(e) => setMaxTenureMonths(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs font-bold"
                      />
                      <span className="text-[10px] text-slate-500 font-medium">
                        {maxTenureMonths ? `${Math.round(maxTenureMonths / 12)} yrs (${maxTenureMonths}m)` : ''} · Home: 360m (30y) | PL: 84m (7y)
                      </span>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-3 gap-3 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200/60">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Base Interest Rate (% p.a.) *</label>
                      <input
                        type="number"
                        step={0.05}
                        required
                        value={baseInterestRate}
                        onChange={(e) => setBaseInterestRate(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-emerald-300 font-mono font-bold text-emerald-800"
                      />
                      <span className="text-[10px] text-slate-500">Default rate if outside tiered matrix</span>
                    </div>
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Processing Fee (% of Loan)</label>
                      <input
                        type="number"
                        step={0.05}
                        value={processingFeePct}
                        onChange={(e) => setProcessingFeePct(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Min Flat Processing Fee (₹)</label>
                      <input
                        type="number"
                        placeholder="Optional"
                        value={processingFeeFlat}
                        onChange={(e) => setProcessingFeeFlat(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CIBIL RATE MATRIX */}
              {activeModalTab === 'RATE_MATRIX' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Tiered CIBIL Interest Rate Matrix</h4>
                      <p className="text-slate-500 text-[11px]">
                        Map specific CIBIL score bands to lower interest rates and custom FOIR allowances.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addRateTier}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                    >
                      + Add CIBIL Band
                    </button>
                  </div>

                  <div className="space-y-2">
                    {rateMatrix.map((tier, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                      >
                        <div className="sm:col-span-3">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block">Tier Description</label>
                          <input
                            type="text"
                            placeholder="e.g. Super Prime Band"
                            value={tier.description || ''}
                            onChange={(e) => updateRateTier(idx, { description: e.target.value })}
                            className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block">CIBIL Range</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={tier.cibilMin}
                              onChange={(e) => updateRateTier(idx, { cibilMin: Number(e.target.value) })}
                              className="w-14 p-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                            />
                            <span>-</span>
                            <input
                              type="number"
                              value={tier.cibilMax}
                              onChange={(e) => updateRateTier(idx, { cibilMax: Number(e.target.value) })}
                              className="w-14 p-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block">Interest Rate (% p.a.)</label>
                          <input
                            type="number"
                            step={0.05}
                            value={tier.interestRate}
                            onChange={(e) => updateRateTier(idx, { interestRate: Number(e.target.value) })}
                            className="w-full p-1.5 rounded-lg border border-emerald-300 text-xs font-mono font-bold text-emerald-800"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block">Custom Max FOIR %</label>
                          <input
                            type="number"
                            placeholder={`${maxFoirPct}%`}
                            value={tier.maxFoirPct || ''}
                            onChange={(e) => updateRateTier(idx, { maxFoirPct: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block">Min Loan (₹)</label>
                          <input
                            type="number"
                            placeholder="Optional"
                            value={tier.loanAmountMin || ''}
                            onChange={(e) =>
                              updateRateTier(idx, {
                                loanAmountMin: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div className="sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => removeRateTier(idx)}
                            className="text-rose-600 hover:text-rose-800 text-sm font-bold p-1"
                            title="Remove tier"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}

                    {rateMatrix.length === 0 && (
                      <p className="text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No tiered rates specified. Card will use base interest rate ({baseInterestRate}% p.a.) for all CIBIL scores.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: DYNAMIC CRITERIA (JSONB) */}
              {activeModalTab === 'DYNAMIC' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
                    💡 <strong>Flexible Policy Architecture:</strong> Add dynamic criteria without database schema modifications. These fields are checked by the matchmaking rules engine.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Min Age (Years)</label>
                      <input
                        type="number"
                        value={minAge}
                        onChange={(e) => setMinAge(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Max Age at Maturity (Years)</label>
                      <input
                        type="number"
                        value={maxAge}
                        onChange={(e) => setMaxAge(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Min Total Experience / Vintage (m)</label>
                      <input
                        type="number"
                        value={minWorkExp}
                        onChange={(e) => setMinWorkExp(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Company Categories */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">Approved Employer Categories</label>
                    <div className="flex flex-wrap gap-2">
                      {['SUPER_CAT_A', 'CAT_A', 'CAT_B', 'CAT_C', 'GOVT', 'ALL'].map((cat) => {
                        const isChecked = companyCategories.includes(cat);
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => {
                              if (isChecked) {
                                setCompanyCategories(companyCategories.filter((c) => c !== cat));
                              } else {
                                setCompanyCategories([...companyCategories, cat]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                              isChecked
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Salary Modes */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">Mandatory Salary Credit Modes</label>
                    <div className="flex flex-wrap gap-2">
                      {['BANK_TRANSFER', 'CHEQUE', 'CASH'].map((mode) => {
                        const isChecked = salaryModes.includes(mode);
                        return (
                          <button
                            type="button"
                            key={mode}
                            onClick={() => {
                              if (isChecked) {
                                setSalaryModes(salaryModes.filter((m) => m !== mode));
                              } else {
                                setSalaryModes([...salaryModes, mode]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                              isChecked
                                ? 'bg-slate-900 text-white border-slate-950 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {mode.replace(/_/g, ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Dynamic Criteria JSON Editor */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Custom Extensible JSON Attributes (Dynamic JSONB)
                    </label>
                    <textarea
                      rows={4}
                      value={customJsonCriteria}
                      onChange={(e) => setCustomJsonCriteria(e.target.value)}
                      placeholder='{ "minPropertyAreaSqFt": 450, "acceptedPinCodeZones": ["411001", "400001"] }'
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] bg-slate-950 text-emerald-400 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">
                      Admins can add any arbitrary key-value pairing to test against customer attributes.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 4: TURNAROUND & HIGHLIGHTS */}
              {activeModalTab === 'FEATURES' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Turnaround Time (Days)</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={tatDays}
                        onChange={(e) => setTatDays(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs font-bold"
                      />
                      <span className="text-[10px] text-slate-400">Average sanction and in-principle verification window</span>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Bank Logo / Badge URL</label>
                      <input
                        type="text"
                        placeholder="https://.../hdfc.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Bank Policy USPs & Highlights (One per line)
                    </label>
                    <textarea
                      rows={5}
                      value={specialFeaturesText}
                      onChange={(e) => setSpecialFeaturesText(e.target.value)}
                      placeholder="e.g.&#10;Zero Prepayment Penalty on Floating Rates&#10;In-Principle Digital Sanction within 24 Hours&#10;Highest FOIR Allowance (up to 65%)"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs active:scale-95 transition flex items-center gap-1.5"
                >
                  {isPending && <span className="animate-spin text-xs">⏳</span>}
                  <span>{editingCard ? 'Update Policy Card' : 'Create Policy Card'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
