'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Commission, Clawback, Role, User, BankProduct } from '@/types/db';
import { recordClawbackAction } from '@/actions/workflowActions';
import { updateProductCommissionSplitsAction } from '@/actions/bankProductActions';
import { formatCurrencyINR, formatDate } from '@/lib/format';

interface Props {
  commissions: Commission[];
  clawbacks: Clawback[];
  currentUser: User;
  partners: User[];
  bankProducts?: BankProduct[];
}

export default function CommissionManager({
  commissions,
  clawbacks,
  currentUser,
  partners,
  bankProducts = [],
}: Props) {
  const router = useRouter();
  const isAdmin = currentUser.role === 'ADMIN';
  const isOperations = currentUser.role === 'OPERATIONS';
  const isPartner = currentUser.role === 'CHANNEL_PARTNER';
  const isSubDsa = currentUser.role === 'SUB_DSA';
  const isRM = currentUser.role === 'RELATIONSHIP_MANAGER';
  const canManageSplits = isAdmin || isOperations;

  const [activeTab, setActiveTab] = useState<'COMMISSIONS' | 'SPLITS' | 'CLAWBACKS'>('COMMISSIONS');
  const [earningFilter, setEarningFilter] = useState<'ALL' | 'DIRECT' | 'OVERRIDE'>('ALL');

  // Clawback modal state
  const [showClawbackModal, setShowClawbackModal] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState(partners[0]?.id || '');
  const [clawbackAmount, setClawbackAmount] = useState(10000);
  const [clawbackReason, setClawbackReason] = useState('');
  const [clawbackAppId, setClawbackAppId] = useState('');

  // Splits configuration state
  const [productSplits, setProductSplits] = useState(
    bankProducts.map((p) => ({
      id: p.id,
      productName: p.productName,
      banks: p.banks,
      baseRate: p.baseRate,
      partnerRate: p.partnerRate,
      subDsaRate: p.subDsaRate !== undefined ? p.subDsaRate : 0.1,
    }))
  );
  const [isSavingSplits, setIsSavingSplits] = useState(false);
  const [splitMessage, setSplitMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter commissions by role and earningType
  let filteredCommissions = commissions;
  if (earningFilter !== 'ALL') {
    filteredCommissions = filteredCommissions.filter(
      (c) => (c.earningType || 'DIRECT') === earningFilter
    );
  }

  const visibleClawbacks = clawbacks;

  // Totals
  const totalDisbursed = commissions.reduce((acc, c) => acc + (c.disbursedAmount || 0), 0);
  const totalEarned = commissions.reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
  const directEarned = commissions
    .filter((c) => (c.earningType || 'DIRECT') === 'DIRECT')
    .reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
  const overrideEarned = commissions
    .filter((c) => c.earningType === 'OVERRIDE')
    .reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
  const pendingPayouts = commissions
    .filter((c) => c.status === 'PENDING')
    .reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
  const totalClawbacks = visibleClawbacks.reduce((acc, c) => acc + (c.amount || 0), 0);

  // Splits rate change handler
  const handleRateChange = (
    index: number,
    field: 'baseRate' | 'partnerRate' | 'subDsaRate',
    val: number
  ) => {
    setProductSplits((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  async function handleSaveSplits() {
    setIsSavingSplits(true);
    setSplitMessage(null);
    setError(null);

    const res = await updateProductCommissionSplitsAction(
      productSplits.map((p) => ({
        id: p.id,
        productName: p.productName,
        baseRate: Number(p.baseRate),
        partnerRate: Number(p.partnerRate),
        subDsaRate: Number(p.subDsaRate),
      }))
    );
    setIsSavingSplits(false);

    if (res.ok) {
      setSplitMessage(res.message || 'Product commission splits successfully updated.');
      router.refresh();
      setTimeout(() => setSplitMessage(null), 4000);
    } else {
      setError(res.error || 'Failed to update commission splits.');
    }
  }

  async function handleRecordClawback(e: React.FormEvent) {
    e.preventDefault();
    if (!clawbackReason.trim() || clawbackAmount <= 0) {
      setError('Please provide clawback amount and reason.');
      return;
    }

    setLoading(true);
    setError(null);
    const res = await recordClawbackAction(
      selectedPartnerId,
      clawbackAppId || null,
      Number(clawbackAmount),
      clawbackReason
    );
    setLoading(false);
    if (res.ok) {
      setShowClawbackModal(false);
      setClawbackReason('');
      setClawbackAppId('');
      router.refresh();
    } else {
      setError(res.error || 'Failed to record clawback.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isSubDsa
              ? 'Sub-DSA Commission & Override Ledger'
              : isPartner
              ? 'My Commission & Payout Ledger'
              : isRM
              ? 'Assigned Network Commissions'
              : 'Commission Management & Product Splits'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSubDsa
              ? 'Track direct client commissions and automated overrides earned from your mapped agent network.'
              : isPartner
              ? 'Real-time ledger of earned commissions from disbursed loans and payout status.'
              : isRM
              ? 'Earned commissions and payout tracking for your assigned Partners and Sub-DSAs.'
              : 'Multi-tier partner commission engine, product-wise split configuration, and ledger tracking.'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/admin/rewards"
            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1.5"
          >
            🪙 Rewards & CRP Wallet
          </Link>
          {canManageSplits && activeTab === 'SPLITS' && (
            <button
              type="button"
              onClick={handleSaveSplits}
              disabled={isSavingSplits}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              {isSavingSplits ? 'Saving Splits…' : '💾 Save Commission Splits'}
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowClawbackModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              ⚠️ Execute Clawback
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {isSubDsa ? 'Total Network Volume' : isPartner ? 'My Disbursed Volume' : 'Total Disbursed'}
          </p>
          <p className="text-xl font-black text-slate-900 mt-1">{formatCurrencyINR(totalDisbursed)}</p>
        </div>

        {isSubDsa ? (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Direct Earnings</p>
              <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrencyINR(directEarned)}</p>
              <span className="text-[10px] text-slate-400 font-medium">From direct client loans</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Team Overrides</p>
              <p className="text-xl font-black text-indigo-600 mt-1">{formatCurrencyINR(overrideEarned)}</p>
              <span className="text-[10px] text-indigo-600 font-medium">From mapped agents</span>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Commissions</p>
              <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrencyINR(totalEarned)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Payouts</p>
              <p className="text-xl font-black text-amber-600 mt-1">{formatCurrencyINR(pendingPayouts)}</p>
            </div>
          </>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Clawbacks Applied</p>
          <p className="text-xl font-black text-rose-600 mt-1">{formatCurrencyINR(totalClawbacks)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('COMMISSIONS')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'COMMISSIONS'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Disbursement Ledger ({commissions.length})
        </button>

        {canManageSplits && (
          <button
            onClick={() => setActiveTab('SPLITS')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'SPLITS'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ⚙️ Product-Wise Commission Splits ({productSplits.length})
          </button>
        )}

        <button
          onClick={() => setActiveTab('CLAWBACKS')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'CLAWBACKS'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Clawbacks Ledger ({visibleClawbacks.length})
        </button>
      </div>

      {/* Feedback Messages */}
      {splitMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{splitMessage}</span>
          </div>
          <button onClick={() => setSplitMessage(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 font-bold">✕</button>
        </div>
      )}

      {/* ================= TAB 1: COMMISSIONS LEDGER ================= */}
      {activeTab === 'COMMISSIONS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Filter Earning Type:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                {(['ALL', 'DIRECT', 'OVERRIDE'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEarningFilter(type)}
                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition ${
                      earningFilter === type
                        ? 'bg-white shadow-2xs text-slate-900'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {type === 'ALL'
                      ? 'All Payouts'
                      : type === 'DIRECT'
                      ? 'Direct Business'
                      : 'Sub-DSA Overrides'}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredCommissions.length} of {commissions.length} entries
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                    <th className="px-4 py-3">App Ref</th>
                    {!isPartner && <th className="px-4 py-3">Recipient Partner</th>}
                    <th className="px-4 py-3">Earning Type</th>
                    <th className="px-4 py-3">Product & Bank</th>
                    <th className="px-4 py-3">Disbursed Amount</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Commission Amount</th>
                    {canManageSplits && <th className="px-4 py-3">Retained Margin</th>}
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCommissions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManageSplits ? 10 : isPartner ? 8 : 9}
                        className="px-4 py-12 text-center text-slate-400 text-sm"
                      >
                        No disbursement commissions found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCommissions.map((c) => {
                      const isOverride = c.earningType === 'OVERRIDE';
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              #{c.applicationId ? c.applicationId.slice(-6) : 'APP'}
                            </span>
                          </td>
                          {!isPartner && (
                            <td className="px-4 py-3.5">
                              <div className="text-xs font-bold text-slate-900">
                                {c.channelPartnerName || 'Channel Partner'}
                              </div>
                              {isOverride && c.sourcePartnerName && (
                                <div className="text-[10px] text-indigo-600 font-medium">
                                  via Agent: {c.sourcePartnerName}
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                                isOverride
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              <span>{isOverride ? '🏢 Override' : '👤 Direct'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-xs font-semibold text-slate-800">
                              {c.productName || 'Loan'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {c.bankName || 'Bank'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-slate-900">
                            {formatCurrencyINR(c.disbursedAmount)}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-bold text-slate-600">
                            {c.commissionRate}%
                          </td>
                          <td className="px-4 py-3.5 text-xs font-black text-emerald-700">
                            {formatCurrencyINR(c.commissionAmount)}
                          </td>
                          {canManageSplits && (
                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">
                              {c.netCompanyMargin !== undefined ? (
                                <span className="text-emerald-700 font-mono font-bold">
                                  {formatCurrencyINR(c.netCompanyMargin)}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                c.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.status === 'CLAWBACK'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(c.createdAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: PRODUCT-WISE COMMISSION SPLITS (ADMIN / OPS) ================= */}
      {activeTab === 'SPLITS' && canManageSplits && (
        <div className="space-y-4">
          {/* Instructional Split Card */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 border border-indigo-200/80 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Automated Commission Split Engine
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Set the exact product-by-product commercial splits below. When a mapped Agent closes a loan, the Agent receives their configured <strong>Partner Rate</strong>, the supervising <strong>Sub-DSA</strong> automatically earns the <strong>Sub-DSA Override</strong>, and Quickfinsure retains the remaining <strong>Net Retained Margin</strong>.
            </p>
            <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 text-[11px] grid sm:grid-cols-4 gap-2 font-medium text-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">1. Bank Payout to Us</span>
                <span className="text-slate-900 font-bold">e.g. 2.0%</span>
              </div>
              <div>
                <span className="text-emerald-600 block text-[10px] uppercase font-bold">2. Partner (Agent) Earns</span>
                <span className="text-emerald-700 font-bold">e.g. 1.5%</span>
              </div>
              <div>
                <span className="text-indigo-600 block text-[10px] uppercase font-bold">3. Sub-DSA Override</span>
                <span className="text-indigo-700 font-bold">e.g. 0.1%</span>
              </div>
              <div>
                <span className="text-emerald-800 block text-[10px] uppercase font-bold">4. We Retain (Margin)</span>
                <span className="text-emerald-800 font-black">2.0 - 1.5 - 0.1 = 0.4%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Lending Banks Covered</th>
                    <th className="px-4 py-3 text-center">Bank Payout (%)</th>
                    <th className="px-4 py-3 text-center">Partner (Agent) (%)</th>
                    <th className="px-4 py-3 text-center">Sub-DSA Override (%)</th>
                    <th className="px-4 py-3 text-center">Company Margin (Team)</th>
                    <th className="px-4 py-3 text-center">Company Margin (Direct)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productSplits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                        No bank products found. Please add products under Bank Policies.
                      </td>
                    </tr>
                  ) : (
                    productSplits.map((prod, idx) => {
                      const netTeamMargin = Number(
                        (prod.baseRate - prod.partnerRate - prod.subDsaRate).toFixed(2)
                      );
                      const netDirectMargin = Number(
                        (prod.baseRate - prod.partnerRate).toFixed(2)
                      );
                      const isNegativeMargin = netTeamMargin < 0;

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-xs text-slate-900 block">
                              {prod.productName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {prod.id.slice(-6)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {prod.banks.slice(0, 3).map((b, bIdx) => (
                                <span
                                  key={bIdx}
                                  className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium"
                                >
                                  {b}
                                </span>
                              ))}
                              {prod.banks.length > 3 && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  +{prod.banks.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="inline-flex items-center">
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                value={prod.baseRate}
                                onChange={(e) =>
                                  handleRateChange(idx, 'baseRate', Number(e.target.value))
                                }
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
                                onChange={(e) =>
                                  handleRateChange(idx, 'partnerRate', Number(e.target.value))
                                }
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
                                value={prod.subDsaRate}
                                onChange={(e) =>
                                  handleRateChange(idx, 'subDsaRate', Number(e.target.value))
                                }
                                className="w-16 px-2 py-1 text-xs font-bold text-center text-indigo-700 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                              <span className="ml-1 text-xs text-slate-500 font-semibold">%</span>
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveSplits}
              disabled={isSavingSplits}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-2"
            >
              {isSavingSplits ? 'Saving Changes…' : '💾 Save Product Commission Splits'}
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CLAWBACKS LEDGER ================= */}
      {activeTab === 'CLAWBACKS' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Application Ref</th>
                  <th className="px-4 py-3">Clawback Amount</th>
                  <th className="px-4 py-3">Reason / Justification</th>
                  <th className="px-4 py-3">Recorded Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleClawbacks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                      No clawbacks recorded. All partner accounts in good standing.
                    </td>
                  </tr>
                ) : (
                  visibleClawbacks.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 text-xs">
                        {c.channelPartnerName}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-600">
                        {c.applicationId ? `#${c.applicationId.slice(-6)}` : 'General / Branch'}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-black text-rose-700">
                        -{formatCurrencyINR(c.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-700">
                        {c.reason}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">
                        {formatDate(c.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Execute Clawback */}
      {showClawbackModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Execute Partner Clawback</h3>
                <p className="text-xs text-slate-500">Deduct or reverse paid commission for fraud or non-compliance.</p>
              </div>
              <button onClick={() => setShowClawbackModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordClawback} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Channel Partner</label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clawback Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={clawbackAmount}
                    onChange={(e) => setClawbackAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-rose-700 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">App ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. app_123"
                    value={clawbackAppId}
                    onChange={(e) => setClawbackAppId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Justification / Non-Compliance Reason
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Customer cancelled loan during cooling-off period / KYC fraud detected by bank audit."
                  value={clawbackReason}
                  onChange={(e) => setClawbackReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {error && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClawbackModal(false)}
                  className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Recording…' : 'Confirm Clawback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
