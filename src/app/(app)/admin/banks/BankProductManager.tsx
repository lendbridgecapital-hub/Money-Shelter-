'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { BankProduct, User, Role } from '@/types/db';
import {
  saveBankProductAction,
  deleteBankProductAction,
  toggleBankProductStatusAction,
  updateProductCommissionSplitsAction,
} from '@/actions/bankProductActions';
import {
  INDIAN_BANKS_AND_NBFCS,
  STANDARD_LOAN_PRODUCTS,
  CATEGORY_LABELS,
  FinancialInstitution,
} from '@/lib/constants/indianBanks';

interface Props {
  initialProducts: BankProduct[];
  registeredPartners: User[];
  currentUser: {
    id: string;
    role: Role;
    name: string;
  };
}

export default function BankProductManager({
  initialProducts,
  registeredPartners,
  currentUser,
}: Props) {
  const router = useRouter();
  const isAdmin = currentUser.role === 'ADMIN';
  const isOpsOrAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'OPERATIONS';
  const isPartner = currentUser.role === 'CHANNEL_PARTNER';

  // State
  const [products, setProducts] = useState<BankProduct[]>(initialProducts);
  const [mainViewTab, setMainViewTab] = useState<'CARTS' | 'PAYOUT_BUCKET'>('CARTS');
  const [isSavingSplits, setIsSavingSplits] = useState(false);
  const [splitFeedback, setSplitFeedback] = useState<string | null>(null);

  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<'ALL' | 'UNIVERSAL' | 'DEDICATED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Row expansion state (accordion tab)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [rowActiveTab, setRowActiveTab] = useState<Record<string, 'details' | 'configure'>>({});

  // Inline configuration form state
  const [inlineForm, setInlineForm] = useState<{
    id: string;
    productName: string;
    selectedBanks: string[];
    baseRate: number | string;
    partnerRate: number | string;
    subDsaRate: number | string;
    dedicatedPartnerId: string | null;
    dedicatedPartnerName: string | null;
    dedicatedPartnerMobile: string | null;
    notes: string;
    bankSearch: string;
    bankCategoryFilter: string;
    partnerSearch: string;
    showPartnerDropdown: boolean;
  } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [productChoice, setProductChoice] = useState<string>('Home Loan');
  const [customProductName, setCustomProductName] = useState('');
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [baseRate, setBaseRate] = useState<number | string>(8.5);
  const [partnerRate, setPartnerRate] = useState<number | string>(1.0);
  const [subDsaRate, setSubDsaRate] = useState<number | string>(0.1);
  const [notes, setNotes] = useState('');

  // Dedicated Partner Selection
  const [partnerSearch, setPartnerSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);

  // Bank Multi-select dropdown state
  const [bankSearch, setBankSearch] = useState('');
  const [bankCategoryFilter, setBankCategoryFilter] = useState<string>('ALL');
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  // Action status
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter products for display
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Product Filter
      if (selectedProductFilter !== 'ALL') {
        if (selectedProductFilter === 'CUSTOM') {
          if ((STANDARD_LOAN_PRODUCTS as readonly string[]).includes(p.productName)) return false;
        } else if (p.productName.toLowerCase() !== selectedProductFilter.toLowerCase()) {
          return false;
        }
      }

      // Scope Filter (Universal vs Dedicated)
      if (selectedScopeFilter === 'UNIVERSAL' && p.dedicatedPartnerId) return false;
      if (selectedScopeFilter === 'DEDICATED' && !p.dedicatedPartnerId) return false;

      // Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = p.productName.toLowerCase().includes(q);
        const matchBanks = p.banks.some((b) => b.toLowerCase().includes(q));
        const matchPartner = p.dedicatedPartnerName?.toLowerCase().includes(q) || false;
        const matchMobile = p.dedicatedPartnerMobile?.includes(q) || false;
        if (!matchName && !matchBanks && !matchPartner && !matchMobile) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedProductFilter, selectedScopeFilter, searchTerm]);

  // Bank list filtered by category and search
  const filteredBankList = useMemo(() => {
    return INDIAN_BANKS_AND_NBFCS.filter((item) => {
      if (bankCategoryFilter !== 'ALL' && item.category !== bankCategoryFilter) {
        return false;
      }
      if (bankSearch.trim()) {
        const q = bankSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [bankCategoryFilter, bankSearch]);

  // Partner auto-complete suggestions
  const partnerSuggestions = useMemo(() => {
    if (!partnerSearch.trim()) return registeredPartners.slice(0, 6);
    const q = partnerSearch.toLowerCase();
    return registeredPartners.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchPhone = p.phone ? p.phone.toLowerCase().includes(q) : false;
      const matchEmail = p.email.toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail;
    });
  }, [partnerSearch, registeredPartners]);

  // Inline Bank list filtered by category and search
  const inlineFilteredBankList = useMemo(() => {
    if (!inlineForm) return INDIAN_BANKS_AND_NBFCS;
    return INDIAN_BANKS_AND_NBFCS.filter((item) => {
      if (inlineForm.bankCategoryFilter !== 'ALL' && item.category !== inlineForm.bankCategoryFilter) {
        return false;
      }
      if (inlineForm.bankSearch.trim()) {
        const q = inlineForm.bankSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [inlineForm?.bankCategoryFilter, inlineForm?.bankSearch]);

  // Inline Partner auto-complete suggestions
  const inlinePartnerSuggestions = useMemo(() => {
    if (!inlineForm) return [];
    if (!inlineForm.partnerSearch.trim()) return registeredPartners.slice(0, 6);
    const q = inlineForm.partnerSearch.toLowerCase();
    return registeredPartners.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchPhone = p.phone ? p.phone.toLowerCase().includes(q) : false;
      const matchEmail = p.email.toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail;
    });
  }, [inlineForm?.partnerSearch, registeredPartners]);

  // Initialize or reset inline configuration form
  function initInlineForm(product: BankProduct) {
    setInlineForm({
      id: product.id,
      productName: product.productName,
      selectedBanks: [...product.banks],
      baseRate: product.baseRate,
      partnerRate: product.partnerRate,
      subDsaRate: product.subDsaRate !== undefined ? product.subDsaRate : 0.1,
      dedicatedPartnerId: product.dedicatedPartnerId || null,
      dedicatedPartnerName: product.dedicatedPartnerName || null,
      dedicatedPartnerMobile: product.dedicatedPartnerMobile || null,
      notes: product.notes || '',
      bankSearch: '',
      bankCategoryFilter: 'ALL',
      partnerSearch: '',
      showPartnerDropdown: false,
    });
  }

  // Toggle open row tab
  function handleToggleRow(product: BankProduct) {
    if (expandedRowId === product.id) {
      setExpandedRowId(null);
    } else {
      if (!rowActiveTab[product.id]) {
        setRowActiveTab((prev) => ({ ...prev, [product.id]: 'details' }));
      }
      initInlineForm(product);
      setExpandedRowId(product.id);
    }
  }

  // Open the configuration tab directly
  function handleOpenConfigureTab(product: BankProduct) {
    initInlineForm(product);
    setRowActiveTab((prev) => ({ ...prev, [product.id]: 'configure' }));
    setExpandedRowId(product.id);
  }

  // Inline bank selection helpers
  function toggleInlineBank(name: string) {
    if (!inlineForm) return;
    const current = inlineForm.selectedBanks;
    const next = current.includes(name)
      ? current.filter((b) => b !== name)
      : [...current, name];
    setInlineForm({ ...inlineForm, selectedBanks: next });
  }

  function selectAllFilteredInlineBanks() {
    if (!inlineForm) return;
    const namesToAdd = inlineFilteredBankList.map((b) => b.name);
    const set = new Set([...inlineForm.selectedBanks, ...namesToAdd]);
    setInlineForm({ ...inlineForm, selectedBanks: Array.from(set) });
  }

  function clearAllInlineBanks() {
    if (!inlineForm) return;
    setInlineForm({ ...inlineForm, selectedBanks: [] });
  }

  function selectInlinePartner(partner: User | null) {
    if (!inlineForm) return;
    if (!partner) {
      setInlineForm({
        ...inlineForm,
        dedicatedPartnerId: null,
        dedicatedPartnerName: null,
        dedicatedPartnerMobile: null,
        partnerSearch: '',
        showPartnerDropdown: false,
      });
    } else {
      setInlineForm({
        ...inlineForm,
        dedicatedPartnerId: partner.id,
        dedicatedPartnerName: partner.name,
        dedicatedPartnerMobile: partner.phone || null,
        partnerSearch: '',
        showPartnerDropdown: false,
      });
    }
  }

  // Save inline configuration
  async function handleInlineSave(e: React.FormEvent) {
    e.preventDefault();
    if (!inlineForm) return;

    if (inlineForm.selectedBanks.length === 0) {
      alert('Please select at least one Indian bank or NBFC.');
      return;
    }

    setLoading(true);
    const res = await saveBankProductAction({
      id: inlineForm.id,
      productName: inlineForm.productName,
      banks: inlineForm.selectedBanks,
      baseRate: Number(inlineForm.baseRate),
      partnerRate: Number(inlineForm.partnerRate),
      subDsaRate: Number(inlineForm.subDsaRate),
      dedicatedPartnerId: inlineForm.dedicatedPartnerId,
      dedicatedPartnerName: inlineForm.dedicatedPartnerName,
      dedicatedPartnerMobile: inlineForm.dedicatedPartnerMobile,
      notes: inlineForm.notes.trim() || null,
    });
    setLoading(false);

    if (res.ok) {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === inlineForm.id
            ? {
                ...item,
                banks: inlineForm.selectedBanks,
                baseRate: Number(inlineForm.baseRate),
                partnerRate: Number(inlineForm.partnerRate),
                subDsaRate: Number(inlineForm.subDsaRate),
                dedicatedPartnerId: inlineForm.dedicatedPartnerId,
                dedicatedPartnerName: inlineForm.dedicatedPartnerName,
                dedicatedPartnerMobile: inlineForm.dedicatedPartnerMobile,
                notes: inlineForm.notes.trim() || null,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
      setRowActiveTab((prev) => ({ ...prev, [inlineForm.id]: 'details' }));
      router.refresh();
    } else {
      alert(res.error || 'Failed to update product offering.');
    }
  }

  // Batch Payout Bucket Split handlers
  const handleSplitRateChange = (
    id: string,
    field: 'baseRate' | 'partnerRate' | 'subDsaRate',
    val: number
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  async function handleSaveAllSplits() {
    setIsSavingSplits(true);
    setSplitFeedback(null);

    const res = await updateProductCommissionSplitsAction(
      products.map((p) => ({
        id: p.id,
        productName: p.productName,
        baseRate: Number(p.baseRate),
        partnerRate: Number(p.partnerRate),
        subDsaRate: Number(p.subDsaRate !== undefined ? p.subDsaRate : 0.1),
      }))
    );
    setIsSavingSplits(false);

    if (res.ok) {
      setSplitFeedback(res.message || 'Product commission splits successfully updated.');
      router.refresh();
      setTimeout(() => setSplitFeedback(null), 4000);
    } else {
      alert(res.error || 'Failed to update commission splits.');
    }
  }

  // Open Create Modal
  function handleOpenCreate() {
    setEditingId(null);
    setProductChoice('Home Loan');
    setCustomProductName('');
    setSelectedBanks([]);
    setBaseRate(2.0);
    setPartnerRate(1.0);
    setSubDsaRate(0.1);
    setSelectedPartner(null);
    setPartnerSearch('');
    setNotes('');
    setBankSearch('');
    setBankCategoryFilter('ALL');
    setFeedback(null);
    setShowModal(true);
  }

  // Open Edit Modal
  function handleOpenEdit(product: BankProduct) {
    setEditingId(product.id);
    const isStandard = (STANDARD_LOAN_PRODUCTS as readonly string[]).includes(product.productName as any);
    if (isStandard) {
      setProductChoice(product.productName);
      setCustomProductName('');
    } else {
      setProductChoice('ADD_PRODUCT');
      setCustomProductName(product.productName);
    }

    setSelectedBanks(product.banks || []);
    setBaseRate(product.baseRate);
    setPartnerRate(product.partnerRate);
    setSubDsaRate(product.subDsaRate !== undefined ? product.subDsaRate : 0.1);
    setNotes(product.notes || '');

    if (product.dedicatedPartnerId) {
      const match = registeredPartners.find((p) => p.id === product.dedicatedPartnerId);
      if (match) {
        setSelectedPartner(match);
      } else {
        setSelectedPartner({
          id: product.dedicatedPartnerId,
          name: product.dedicatedPartnerName || 'Dedicated Partner',
          phone: product.dedicatedPartnerMobile || null,
          email: '',
          role: 'CHANNEL_PARTNER',
          branchId: '',
          active: true,
          passwordHash: '',
          createdAt: '',
        });
      }
    } else {
      setSelectedPartner(null);
    }

    setPartnerSearch('');
    setFeedback(null);
    setShowModal(true);
  }

  // Toggle bank selection
  function toggleBank(name: string) {
    if (selectedBanks.includes(name)) {
      setSelectedBanks(selectedBanks.filter((b) => b !== name));
    } else {
      setSelectedBanks([...selectedBanks, name]);
    }
  }

  function selectAllFilteredBanks() {
    const namesToAdd = filteredBankList.map((b) => b.name);
    const set = new Set([...selectedBanks, ...namesToAdd]);
    setSelectedBanks(Array.from(set));
  }

  function clearAllBanks() {
    setSelectedBanks([]);
  }

  // Handle Save
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalProductName =
      productChoice === 'ADD_PRODUCT' ? customProductName.trim() : productChoice;

    if (!finalProductName) {
      setFeedback({ type: 'error', message: 'Please enter a valid loan product name.' });
      return;
    }

    if (selectedBanks.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one Indian bank or NBFC.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const res = await saveBankProductAction({
      id: editingId || undefined,
      productName: finalProductName,
      banks: selectedBanks,
      baseRate: Number(baseRate),
      partnerRate: Number(partnerRate),
      subDsaRate: Number(subDsaRate),
      dedicatedPartnerId: selectedPartner ? selectedPartner.id : null,
      dedicatedPartnerName: selectedPartner ? selectedPartner.name : null,
      dedicatedPartnerMobile: selectedPartner ? selectedPartner.phone : null,
      notes: notes.trim() || null,
    });

    setLoading(false);

    if (res.ok) {
      setShowModal(false);
      router.refresh();
      // optimistic state update
      if (editingId) {
        setProducts((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  productName: finalProductName,
                  banks: selectedBanks,
                  baseRate: Number(baseRate),
                  partnerRate: Number(partnerRate),
                  subDsaRate: Number(subDsaRate),
                  dedicatedPartnerId: selectedPartner ? selectedPartner.id : null,
                  dedicatedPartnerName: selectedPartner ? selectedPartner.name : null,
                  dedicatedPartnerMobile: selectedPartner ? selectedPartner.phone : null,
                  notes: notes.trim() || null,
                  updatedAt: new Date().toISOString(),
                }
              : item
          )
        );
      } else if (res.data) {
        setProducts((prev) => [res.data as BankProduct, ...prev]);
      }
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to save product offering.' });
    }
  }

  // Handle Delete
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove the ${name} offering?`)) return;
    setLoading(true);
    const res = await deleteBankProductAction(id);
    setLoading(false);
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete product.');
    }
  }

  // Handle Status Toggle
  async function handleToggleStatus(product: BankProduct) {
    const nextStatus = !product.active;
    const res = await toggleBankProductStatusAction(product.id, nextStatus);
    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, active: nextStatus } : p))
      );
      router.refresh();
    } else {
      alert(res.error || 'Failed to update status.');
    }
  }

  // Product Icon helper
  function getProductIcon(name: string) {
    const lower = name.toLowerCase();
    if (lower.includes('home')) return '🏠';
    if (lower.includes('personal')) return '👤';
    if (lower.includes('business')) return '💼';
    if (lower.includes('education')) return '🎓';
    if (lower.includes('transfer')) return '🔄';
    if (lower.includes('property') || lower.includes('lap')) return '🏢';
    if (lower.includes('gold')) return '🪙';
    if (lower.includes('car') || lower.includes('vehicle')) return '🚗';
    return '💳';
  }

  // Summary Metrics
  const totalProducts = products.length;
  const dedicatedCount = products.filter((p) => p.dedicatedPartnerId).length;
  const universalCount = products.filter((p) => !p.dedicatedPartnerId).length;
  const totalBanksMapped = new Set(products.flatMap((p) => p.banks)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900">Partner Lending Banks & Products</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Product-Wise Matrix
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isPartner
              ? 'Browse approved lending products, tied-up banks & NBFCs, and your approved commission payout rates.'
              : 'Configure banks product-wise, manage gross bank payout commissions (e.g. 2% from bank), set partner payouts (e.g. 1% to partner), and allocate dedicated partner tranches.'}
          </p>
        </div>

        {isOpsOrAdmin && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
          >
            <span>+</span> Add Product Offering
          </button>
        )}
      </div>

      {/* View Switcher: Product Offering Carts vs Payout Bucket & Splits Matrix */}
      {isOpsOrAdmin && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setMainViewTab('CARTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              mainViewTab === 'CARTS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🛒</span>
            <span>Product Offering Carts ({products.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMainViewTab('PAYOUT_BUCKET')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              mainViewTab === 'PAYOUT_BUCKET'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>💰</span>
            <span>Payout Bucket & Splits Matrix</span>
          </button>
        </div>
      )}

      {mainViewTab === 'PAYOUT_BUCKET' && isOpsOrAdmin ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>💰 Unified Payout Bucket & Commission Splits</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    Auto-Applied on Loan Disbursals
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set Base Bank Rate (receivable), Channel Partner Commission, and Sub-DSA Override. Company net margins are calculated automatically.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAllSplits}
                  disabled={isSavingSplits}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  {isSavingSplits ? 'Saving Splits…' : '💾 Save Commission Splits'}
                </button>
              </div>
            </div>

            {splitFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center justify-between animate-fadeIn">
                <span>✓ {splitFeedback}</span>
                <button onClick={() => setSplitFeedback(null)} className="text-emerald-500 hover:text-emerald-700 font-bold ml-2">✕</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                    <th className="px-4 py-3">Loan Product</th>
                    <th className="px-4 py-3">Mapped Banks</th>
                    <th className="px-4 py-3 text-center">Base Bank Payout (%)</th>
                    <th className="px-4 py-3 text-center">Partner Commission (%)</th>
                    <th className="px-4 py-3 text-center text-indigo-700 font-black">Sub-DSA Commission (%)</th>
                    <th className="px-4 py-3 text-center">Net Team Margin (%)</th>
                    <th className="px-4 py-3 text-center">Net Direct Margin (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((prod) => {
                    const subDsaVal = prod.subDsaRate !== undefined ? prod.subDsaRate : 0.1;
                    const netTeamMargin = Number((prod.baseRate - prod.partnerRate - subDsaVal).toFixed(2));
                    const netDirectMargin = Number((prod.baseRate - prod.partnerRate).toFixed(2));
                    const isNegativeMargin = netTeamMargin < 0;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{getProductIcon(prod.productName)}</span>
                            <div>
                              <span className="font-bold text-slate-900 text-xs block">{prod.productName}</span>
                              {prod.dedicatedPartnerName && (
                                <span className="text-[10px] text-amber-700 font-semibold">⭐ Dedicated: {prod.dedicatedPartnerName}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                            {prod.banks.length} Lenders
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              value={prod.baseRate}
                              onChange={(e) => handleSplitRateChange(prod.id, 'baseRate', Number(e.target.value))}
                              className="w-16 px-2 py-1 text-xs font-bold text-center border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            <span className="ml-1 text-xs text-slate-500 font-semibold">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              value={prod.partnerRate}
                              onChange={(e) => handleSplitRateChange(prod.id, 'partnerRate', Number(e.target.value))}
                              className="w-16 px-2 py-1 text-xs font-bold text-center text-emerald-700 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            <span className="ml-1 text-xs text-slate-500 font-semibold">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              value={subDsaVal}
                              onChange={(e) => handleSplitRateChange(prod.id, 'subDsaRate', Number(e.target.value))}
                              className="w-16 px-2 py-1 text-xs font-bold text-center text-indigo-700 border border-indigo-300 bg-indigo-50/40 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <span className="ml-1 text-xs text-indigo-600 font-semibold">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`text-xs font-black font-mono px-2 py-1 rounded-md ${
                              isNegativeMargin
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {netTeamMargin}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-xs font-bold font-mono px-2 py-1 rounded-md bg-slate-100 text-slate-800">
                            {netDirectMargin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveAllSplits}
                disabled={isSavingSplits}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-2"
              >
                {isSavingSplits ? 'Saving Changes…' : '💾 Save Product Commission Splits'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Highlights / Metric Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Products</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalProducts}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Active loan categories</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Banks & NBFCs</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{totalBanksMapped}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Institutions mapped</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Dedicated Tranches</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{dedicatedCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Partner-specific offerings</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Universal Offerings</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{universalCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Applicable for all partners</p>
            </div>
          </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search product, bank/NBFC name, or partner…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Scope Filter (Universal vs Dedicated) */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <span className="text-xs text-slate-400 font-medium mr-1">Scope:</span>
            <button
              onClick={() => setSelectedScopeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedScopeFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Offerings
            </button>
            <button
              onClick={() => setSelectedScopeFilter('UNIVERSAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedScopeFilter === 'UNIVERSAL'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Universal ({universalCount})
            </button>
            <button
              onClick={() => setSelectedScopeFilter('DEDICATED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedScopeFilter === 'DEDICATED'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Dedicated ({dedicatedCount})
            </button>
          </div>
        </div>

        {/* Product Type Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-thin">
          <button
            onClick={() => setSelectedProductFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedProductFilter === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Products ({products.length})
          </button>
          {STANDARD_LOAN_PRODUCTS.map((prod) => {
            const count = products.filter((p) => p.productName.toLowerCase() === prod.toLowerCase()).length;
            return (
              <button
                key={prod}
                onClick={() => setSelectedProductFilter(prod)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedProductFilter === prod
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{getProductIcon(prod)}</span>
                <span>{prod}</span>
                {count > 0 && <span className="opacity-75 text-[10px]">({count})</span>}
              </button>
            );
          })}
          <button
            onClick={() => setSelectedProductFilter('CUSTOM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedProductFilter === 'CUSTOM'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Other Products
          </button>
        </div>
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
            🏦
          </div>
          <h3 className="text-base font-bold text-slate-800">No Product Offerings Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No bank offerings matched your selected product or scope filter. Click "+ Add Product Offering" to create one.
          </p>
          {isOpsOrAdmin && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
            >
              + Add Product Offering
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table Header */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-100/90 rounded-xl text-[11px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">
            <div className="col-span-4">Loan Product & Target Scope</div>
            <div className="col-span-3">Rates & Commission Spread</div>
            <div className="col-span-2">Institutions</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Actions / Config</div>
          </div>

          {/* Product Rows */}
          {filteredProducts.map((product) => {
            const isDedicated = Boolean(product.dedicatedPartnerId);
            const isExpanded = expandedRowId === product.id;
            const currentTab = rowActiveTab[product.id] || 'details';

            return (
              <div
                key={product.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 shadow-2xs hover:shadow-xs ${
                  !product.active
                    ? 'border-slate-200 opacity-75'
                    : isExpanded
                    ? 'border-emerald-400 ring-2 ring-emerald-500/10'
                    : isDedicated
                    ? 'border-amber-200/90'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Collapsed Row Header Bar */}
                <div
                  onClick={() => handleToggleRow(product)}
                  className={`p-3.5 sm:p-4 cursor-pointer transition select-none flex flex-col lg:grid lg:grid-cols-12 gap-3 items-start lg:items-center ${
                    isExpanded ? 'bg-slate-50/70 border-b border-slate-200' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Col 1: Product Icon, Name, Scope (col-span-4) */}
                  <div className="lg:col-span-4 flex items-center gap-3 w-full">
                    <span className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                      {getProductIcon(product.productName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {product.productName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          #{product.id.slice(-6)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {isDedicated ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-flex items-center gap-1">
                            <span>⭐</span>
                            <span className="truncate max-w-[140px]">
                              {product.dedicatedPartnerName || 'Dedicated Partner'}
                            </span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <span>🌐</span>
                            <span>Universal (All Partners)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Col 2: Rates & Commission Spread (col-span-3) */}
                  <div className="lg:col-span-3 w-full lg:w-auto">
                    {isOpsOrAdmin ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                          <span className="text-[10px] font-medium text-slate-500 block leading-tight">Bank</span>
                          <span className="text-xs font-bold text-slate-900">{product.baseRate}%</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                          <span className="text-[10px] font-medium text-emerald-700 block leading-tight">Partner</span>
                          <span className="text-xs font-bold text-emerald-800">{product.partnerRate}%</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                          +{(product.baseRate - product.partnerRate).toFixed(2)}% margin
                        </span>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 inline-block">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                          Approved Payout
                        </span>
                        <span className="text-xs font-black text-emerald-800">{product.partnerRate}%</span>
                      </div>
                    )}
                  </div>

                  {/* Col 3: Institutions count & preview (col-span-2) */}
                  <div className="lg:col-span-2 w-full lg:w-auto">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                        🏛️ {product.banks.length} Banks
                      </span>
                      {product.banks.slice(0, 1).map((b) => (
                        <span
                          key={b}
                          className="hidden sm:inline-block text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded truncate max-w-[100px]"
                        >
                          {b}
                        </span>
                      ))}
                      {product.banks.length > 1 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          +{product.banks.length - 1} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Col 4: Status (col-span-1) */}
                  <div className="lg:col-span-1 lg:text-center w-full lg:w-auto" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => isOpsOrAdmin && handleToggleStatus(product)}
                      disabled={!isOpsOrAdmin}
                      title={isOpsOrAdmin ? 'Click to toggle active status' : undefined}
                      className={`text-[10px] font-bold px-2 py-1 rounded-full transition ${
                        product.active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {product.active ? '● Active' : '○ Inactive'}
                    </button>
                  </div>

                  {/* Col 5: Actions / Tab button (col-span-2) */}
                  <div
                    className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-2 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isOpsOrAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenConfigureTab(product)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <span>⚙️</span>
                        <span>Configure</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleRow(product)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Close Tab ▴' : 'Open Tab ▾'}</span>
                    </button>
                  </div>
                </div>

                {/* THE OPEN TAB SECTION */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5 animate-fadeIn">
                    {/* Sub-tab Navigation */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRowActiveTab((prev) => ({ ...prev, [product.id]: 'details' }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            currentTab === 'details'
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>📋</span>
                          <span>Product Details & Banks</span>
                        </button>

                        {isOpsOrAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              initInlineForm(product);
                              setRowActiveTab((prev) => ({ ...prev, [product.id]: 'configure' }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                              currentTab === 'configure'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                            }`}
                          >
                            <span>⚙️</span>
                            <span>Configure Product Offering</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {isOpsOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(product)}
                            className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
                          >
                            Open in Modal ↗
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedRowId(null)}
                          className="text-xs font-semibold text-slate-400 hover:text-slate-600 ml-2"
                        >
                          ✕ Close Tab
                        </button>
                      </div>
                    </div>

                    {/* SUB-TAB 1: PRODUCT DETAILS & BANKS (VIEW) */}
                    {currentTab === 'details' && (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Financial Rates & Scope Card */}
                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Commission & Payout Structure
                            </h4>

                            {isOpsOrAdmin ? (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                    Bank Payout
                                  </span>
                                  <p className="text-base font-black text-slate-900 mt-0.5">
                                    {product.baseRate}%
                                  </p>
                                  <span className="text-[10px] text-slate-400">Receivable by QFS</span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                                    Partner Payout
                                  </span>
                                  <p className="text-base font-black text-emerald-800 mt-0.5">
                                    {product.partnerRate}%
                                  </p>
                                  <span className="text-[10px] text-emerald-600">Direct Partner share</span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                                    Sub-DSA Commission
                                  </span>
                                  <p className="text-base font-black text-indigo-800 mt-0.5">
                                    {product.subDsaRate !== undefined ? product.subDsaRate : 0.1}%
                                  </p>
                                  <span className="text-[10px] text-indigo-600">Sub-DSA override</span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                    Net Margin
                                  </span>
                                  <p className="text-base font-black text-slate-900 mt-0.5">
                                    +{(product.baseRate - product.partnerRate - (product.subDsaRate !== undefined ? product.subDsaRate : 0.1)).toFixed(2)}%
                                  </p>
                                  <span className="text-[10px] text-slate-400">Platform retain</span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                                  Your Approved Payout Commission
                                </span>
                                <p className="text-2xl font-black text-emerald-800 mt-0.5">{product.partnerRate}%</p>
                                <p className="text-[11px] text-emerald-600 mt-0.5">
                                  Credited upon successful loan closure
                                </p>
                              </div>
                            )}

                            {/* Scope Box */}
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Target Partner Allocation
                              </span>
                              {isDedicated ? (
                                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center justify-between">
                                  <div>
                                    <span className="font-bold block">⭐ Dedicated Exclusively to:</span>
                                    <span className="font-semibold">{product.dedicatedPartnerName || 'Assigned Partner'}</span>
                                    {product.dedicatedPartnerMobile && (
                                      <span className="text-amber-800 block text-[11px] font-mono mt-0.5">
                                        📱 {product.dedicatedPartnerMobile}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] px-2 py-1 bg-amber-200 font-bold rounded text-amber-900">
                                    Dedicated
                                  </span>
                                </div>
                              ) : (
                                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-1.5">
                                  <span>🌐</span>
                                  <span><strong>Universal Offering:</strong> Available to all registered channel partners.</span>
                                </div>
                              )}
                            </div>

                            {/* Underwriting Notes */}
                            {product.notes && (
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                  Underwriting / Policy Notes
                                </span>
                                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic">
                                  &ldquo;{product.notes}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Mapped Banks & Institutions List */}
                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                  Mapped Banks & NBFCs ({product.banks.length})
                                </h4>
                                <span className="text-[10px] text-slate-400">Tied-up lenders</span>
                              </div>

                              <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                                {product.banks.map((bankName) => (
                                  <span
                                    key={bankName}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-800 border border-slate-200 flex items-center gap-1"
                                  >
                                    <span className="text-slate-400 text-[10px]">🏛️</span>
                                    <span>{bankName}</span>
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Action Toolbar */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              {isOpsOrAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenConfigureTab(product)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                                >
                                  <span>⚙️ Configure Product</span>
                                </button>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  To submit leads for this product, share your branch application link.
                                </span>
                              )}

                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(product.id, product.productName)}
                                  className="text-xs font-bold text-rose-600 hover:text-rose-800 transition flex items-center gap-1"
                                >
                                  <span>🗑️ Delete Offering</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 2: CONFIGURE PRODUCT (INLINE CONFIGURATION) */}
                    {currentTab === 'configure' && isOpsOrAdmin && inlineForm && (
                      <form onSubmit={handleInlineSave} className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <span>⚙️ Configuration Options:</span>
                              <span className="text-emerald-700">{inlineForm.productName}</span>
                            </h3>
                            <p className="text-xs text-slate-500">
                              Modify payout rates, manage mapped partner banks, adjust partner scope, and update policy remarks.
                            </p>
                          </div>
                          <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                            #{inlineForm.id.slice(-6)}
                          </span>
                        </div>

                        {/* 1. RATES CONFIGURATION */}
                        <div className="space-y-2">
                          <div className="grid sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Base Rate (% Bank) <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0"
                                  max="100"
                                  value={inlineForm.baseRate}
                                  onChange={(e) => setInlineForm({ ...inlineForm, baseRate: e.target.value })}
                                  required
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                                  %
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">Receivable by QFS from bank</p>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Partner Rate (% Payout) <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0"
                                  max="100"
                                  value={inlineForm.partnerRate}
                                  onChange={(e) => setInlineForm({ ...inlineForm, partnerRate: e.target.value })}
                                  required
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                                  %
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">Commission to direct partner</p>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-700 mb-1">
                                Sub-DSA Rate (% Override) <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0"
                                  max="100"
                                  value={inlineForm.subDsaRate}
                                  onChange={(e) => setInlineForm({ ...inlineForm, subDsaRate: e.target.value })}
                                  required
                                  className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-lg text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-indigo-400 text-xs font-bold">
                                  %
                                </span>
                              </div>
                              <p className="text-[11px] text-indigo-500 mt-0.5">Override to Sub-DSA network</p>
                            </div>
                          </div>

                          {/* Net Margin indicator */}
                          {inlineForm.baseRate !== '' && inlineForm.partnerRate !== '' && (
                            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                              <span className="font-semibold">Quickfinsure Net Retained Spread:</span>
                              <span className="font-mono font-bold">
                                +{(Number(inlineForm.baseRate) - Number(inlineForm.partnerRate) - Number(inlineForm.subDsaRate || 0)).toFixed(2)}% margin
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 2. TARGET PARTNER ALLOCATION */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Partner Target (Dedicated vs. All Partners)
                          </label>

                          {inlineForm.dedicatedPartnerId ? (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 inline-block mb-0.5">
                                  ⭐ Dedicated To:
                                </span>
                                <p className="text-xs font-bold text-amber-950">{inlineForm.dedicatedPartnerName}</p>
                                {inlineForm.dedicatedPartnerMobile && (
                                  <p className="text-[11px] text-amber-800">📱 {inlineForm.dedicatedPartnerMobile}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => selectInlinePartner(null)}
                                className="text-xs text-rose-600 hover:underline font-bold"
                              >
                                Clear (Make Universal)
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Search registered partner name or mobile number to dedicate…"
                                  value={inlineForm.partnerSearch}
                                  onFocus={() => setInlineForm({ ...inlineForm, showPartnerDropdown: true })}
                                  onChange={(e) =>
                                    setInlineForm({
                                      ...inlineForm,
                                      partnerSearch: e.target.value,
                                      showPartnerDropdown: true,
                                    })
                                  }
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />

                                {inlineForm.showPartnerDropdown && (
                                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-44 overflow-y-auto divide-y divide-slate-100">
                                    <div className="p-2 bg-slate-50 text-[11px] font-semibold text-slate-500 flex justify-between">
                                      <span>Select Channel Partner</span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setInlineForm({ ...inlineForm, showPartnerDropdown: false })
                                        }
                                        className="text-slate-400 hover:text-slate-700"
                                      >
                                        Close
                                      </button>
                                    </div>
                                    {inlinePartnerSuggestions.length === 0 ? (
                                      <p className="p-3 text-xs text-slate-400 text-center">No partner matches.</p>
                                    ) : (
                                      inlinePartnerSuggestions.map((partner) => (
                                        <button
                                          key={partner.id}
                                          type="button"
                                          onClick={() => selectInlinePartner(partner)}
                                          className="w-full text-left p-2.5 hover:bg-emerald-50 transition flex items-center justify-between text-xs"
                                        >
                                          <div>
                                            <p className="font-bold text-slate-900">{partner.name}</p>
                                            <p className="text-[11px] text-slate-500">{partner.phone || partner.email}</p>
                                          </div>
                                          <span className="text-[10px] font-bold text-emerald-700">Assign →</span>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Currently: <strong>🌐 Universal (All Partners)</strong>. Leave empty to allow all partners.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 3. PARTNER BANKS & NBFCS SELECTION */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                              Mapped Institutions ({inlineForm.selectedBanks.length} Selected){' '}
                              <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex gap-2 text-xs">
                              <button
                                type="button"
                                onClick={selectAllFilteredInlineBanks}
                                className="text-emerald-700 hover:text-emerald-800 font-semibold"
                              >
                                + Select Filtered
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={clearAllInlineBanks}
                                className="text-slate-500 hover:text-slate-800 font-semibold"
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          {/* Selected Bank Badges */}
                          {inlineForm.selectedBanks.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg mb-2 max-h-24 overflow-y-auto">
                              {inlineForm.selectedBanks.map((name) => (
                                <span
                                  key={name}
                                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-800 flex items-center gap-1 shadow-2xs"
                                >
                                  <span>{name}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleInlineBank(name)}
                                    className="text-slate-400 hover:text-rose-600 font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Bank Filter Bar & Checkbox List */}
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="p-2 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                placeholder="Filter institutions…"
                                value={inlineForm.bankSearch}
                                onChange={(e) =>
                                  setInlineForm({ ...inlineForm, bankSearch: e.target.value })
                                }
                                className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <select
                                value={inlineForm.bankCategoryFilter}
                                onChange={(e) =>
                                  setInlineForm({ ...inlineForm, bankCategoryFilter: e.target.value })
                                }
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-medium focus:outline-none"
                              >
                                <option value="ALL">All Institutions ({INDIAN_BANKS_AND_NBFCS.length})</option>
                                <option value="PUBLIC_BANK">Public Banks</option>
                                <option value="PRIVATE_BANK">Private Banks</option>
                                <option value="SMALL_FINANCE_BANK">Small Finance Banks</option>
                                <option value="NBFC_HFC">NBFCs & Housing Finance</option>
                              </select>
                            </div>

                            <div className="max-h-40 overflow-y-auto p-2 divide-y divide-slate-100 bg-white">
                              {inlineFilteredBankList.map((inst) => {
                                const checked = inlineForm.selectedBanks.includes(inst.name);
                                return (
                                  <label
                                    key={inst.name}
                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition text-xs ${
                                      checked
                                        ? 'bg-emerald-50/80 font-semibold text-emerald-950'
                                        : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleInlineBank(inst.name)}
                                        className="h-3.5 w-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                      />
                                      <span className="truncate">{inst.name}</span>
                                    </div>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0 ml-2">
                                      {inst.code}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* 4. UNDERWRITING NOTES */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Policy / Tranche Notes
                          </label>
                          <textarea
                            rows={2}
                            placeholder="e.g. Applicable for Tier-1 cities, minimum CIBIL 750, express processing within 48 hours."
                            value={inlineForm.notes}
                            onChange={(e) => setInlineForm({ ...inlineForm, notes: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setRowActiveTab((prev) => ({ ...prev, [product.id]: 'details' }))}
                            className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={loading}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <span>💾</span>
                              <span>{loading ? 'Saving Changes…' : 'Save Configuration'}</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Product Offering' : 'Add Bank Product Offering'}
                </h2>
                <p className="text-xs text-slate-500">
                  Configure lending product, multi-select partner banks/NBFCs, specify rates, and set partner scope.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {feedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    feedback.type === 'error'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              {/* 1. PRODUCT SELECTION */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  1. Loan Product <span className="text-rose-500">*</span>
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={productChoice}
                      onChange={(e) => setProductChoice(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {STANDARD_LOAN_PRODUCTS.map((prod) => (
                        <option key={prod} value={prod}>
                          {prod}
                        </option>
                      ))}
                      <option value="ADD_PRODUCT">+ Add Custom Product</option>
                    </select>
                  </div>

                  {productChoice === 'ADD_PRODUCT' && (
                    <div>
                      <input
                        type="text"
                        placeholder="Enter new product name (e.g. Gold Loan)"
                        value={customProductName}
                        onChange={(e) => setCustomProductName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none animate-fadeIn"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 2. MULTI-SELECTION OF INDIAN BANKS AND NBFCS */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Select Partner Banks & NBFCs ({selectedBanks.length} selected){' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllFilteredBanks}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold"
                    >
                      + Select Filtered
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllBanks}
                      className="text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Selected Bank Badges */}
                {selectedBanks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-3 max-h-28 overflow-y-auto">
                    {selectedBanks.map((name) => (
                      <span
                        key={name}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => toggleBank(name)}
                          className="text-slate-400 hover:text-rose-600 font-bold ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Bank Search & Category Filter */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Filter bank or NBFC name…"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <select
                      value={bankCategoryFilter}
                      onChange={(e) => setBankCategoryFilter(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                    >
                      <option value="ALL">All Institutions ({INDIAN_BANKS_AND_NBFCS.length})</option>
                      <option value="PUBLIC_BANK">Public Banks</option>
                      <option value="PRIVATE_BANK">Private Banks</option>
                      <option value="SMALL_FINANCE_BANK">Small Finance Banks</option>
                      <option value="NBFC_HFC">NBFCs & Housing Finance</option>
                    </select>
                  </div>

                  {/* Multi-Select Scrollable Checkbox List */}
                  <div className="max-h-48 overflow-y-auto p-2 divide-y divide-slate-100 bg-white">
                    {filteredBankList.length === 0 ? (
                      <p className="p-3 text-center text-xs text-slate-400">No institutions found.</p>
                    ) : (
                      filteredBankList.map((inst) => {
                        const checked = selectedBanks.includes(inst.name);
                        return (
                          <label
                            key={inst.name}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition text-xs ${
                              checked ? 'bg-emerald-50/80 font-semibold text-emerald-950' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleBank(inst.name)}
                                className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                              />
                              <span className="truncate">{inst.name}</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0 ml-2">
                              {inst.code}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* 3. BASE RATE & PARTNER RATE OPTIONS */}
              <div className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      3. Base Rate (% Bank) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="100"
                        value={baseRate}
                        onChange={(e) => setBaseRate(e.target.value)}
                        required
                        placeholder="e.g. 2.00"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                        %
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Gross commission from bank.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      4. Partner Rate (% Payout) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="100"
                        value={partnerRate}
                        onChange={(e) => setPartnerRate(e.target.value)}
                        required
                        placeholder="e.g. 1.00"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                        %
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Paid to Channel Partner.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-indigo-700 mb-1">
                      5. Sub-DSA Commission (% Override) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="100"
                        value={subDsaRate}
                        onChange={(e) => setSubDsaRate(e.target.value)}
                        required
                        placeholder="e.g. 0.20"
                        className="w-full px-3.5 py-2.5 border border-indigo-200 bg-indigo-50/40 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-indigo-400 text-xs font-bold">
                        %
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-500 mt-1">
                      Override to parent Sub-DSA network.
                    </p>
                  </div>
                </div>

                {/* Live Net Retained Margin Preview */}
                {baseRate !== '' && partnerRate !== '' && !isNaN(Number(baseRate)) && !isNaN(Number(partnerRate)) && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    (Number(baseRate) - Number(partnerRate) - Number(subDsaRate || 0)) >= 0
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <div>
                      <span className="font-bold">Quickfinsure Net Retained Margin:</span>
                      <p className="text-[11px] opacity-75 mt-0.5">
                        Bank ({Number(baseRate).toFixed(2)}%) − Partner ({Number(partnerRate).toFixed(2)}%) − Sub-DSA ({Number(subDsaRate || 0).toFixed(2)}%)
                      </p>
                    </div>
                    <span className="text-base font-black">
                      {(Number(baseRate) - Number(partnerRate) - Number(subDsaRate || 0)) >= 0 ? '+' : ''}{(Number(baseRate) - Number(partnerRate) - Number(subDsaRate || 0)).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              {/* 5. SELECT PARTNER (AUTO-POPULATE NAME/MOBILE) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    5. Partner Target (Dedicated vs. All Partners)
                  </label>
                  {selectedPartner && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPartner(null);
                        setPartnerSearch('');
                      }}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Clear / Make Universal
                    </button>
                  )}
                </div>

                {selectedPartner ? (
                  /* Dedicated Partner Selected Pill */
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 inline-block mb-1">
                        ⭐ Dedicated Exclusively To:
                      </span>
                      <p className="text-sm font-bold text-amber-950">{selectedPartner.name}</p>
                      <p className="text-xs text-amber-800 mt-0.5">
                        {selectedPartner.phone && <span>Mobile: <strong>{selectedPartner.phone}</strong> · </span>}
                        {selectedPartner.email && <span>{selectedPartner.email}</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPartner(null)}
                      className="text-xs text-amber-900 hover:text-rose-700 font-bold px-2 py-1"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  /* Partner Auto-complete Search Input */
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">
                      Type a partner name or mobile number to dedicate this card. Only registered partners will appear.
                      If left unselected, this offering applies to <strong>All Partners</strong>.
                    </p>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search registered partner by name or mobile number…"
                        value={partnerSearch}
                        onFocus={() => setShowPartnerDropdown(true)}
                        onChange={(e) => {
                          setPartnerSearch(e.target.value);
                          setShowPartnerDropdown(true);
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />

                      {/* Dropdown Suggestions */}
                      {showPartnerDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                          <div className="p-2 bg-slate-50 text-[11px] font-semibold text-slate-500 flex justify-between">
                            <span>Registered Channel Partners</span>
                            <button
                              type="button"
                              onClick={() => setShowPartnerDropdown(false)}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              Close
                            </button>
                          </div>
                          {partnerSuggestions.length === 0 ? (
                            <p className="p-3 text-xs text-slate-400 text-center">
                              No registered channel partners match your search.
                            </p>
                          ) : (
                            partnerSuggestions.map((partner) => (
                              <button
                                key={partner.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPartner(partner);
                                  setShowPartnerDropdown(false);
                                  setPartnerSearch('');
                                }}
                                className="w-full text-left p-3 hover:bg-emerald-50 transition flex items-center justify-between"
                              >
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{partner.name}</p>
                                  <p className="text-[11px] text-slate-500">
                                    {partner.phone ? `📱 ${partner.phone} · ` : ''}
                                    {partner.email}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  Select →
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                      <span>🌐</span>
                      <span>Currently set as: <strong>Applicable to All Partners</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. INTERNAL NOTES */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  6. Policy / Tranche Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Applicable for Tier-1 cities, minimum CIBIL 750, express processing within 48 hours."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {loading ? 'Saving Offering…' : editingId ? 'Update Offering' : 'Create Product Offering'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
