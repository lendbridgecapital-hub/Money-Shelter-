'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Commission, Clawback, Role, User } from '@/types/db';
import { recordClawbackAction } from '@/actions/workflowActions';
import { formatCurrencyINR, formatDate } from '@/lib/format';

interface Props {
  commissions: Commission[];
  clawbacks: Clawback[];
  currentUser: User;
  partners: User[];
}

export default function CommissionManager({
  commissions,
  clawbacks,
  currentUser,
  partners,
}: Props) {
  const router = useRouter();
  const isAdmin = currentUser.role === 'ADMIN';
  const isPartner = currentUser.role === 'CHANNEL_PARTNER';
  const isRM = currentUser.role === 'RELATIONSHIP_MANAGER';

  const [activeTab, setActiveTab] = useState<'COMMISSIONS' | 'CLAWBACKS'>('COMMISSIONS');
  const [showClawbackModal, setShowClawbackModal] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState(partners[0]?.id || '');
  const [clawbackAmount, setClawbackAmount] = useState(10000);
  const [clawbackReason, setClawbackReason] = useState('');
  const [clawbackAppId, setClawbackAppId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter commissions for partner
  const visibleCommissions = isPartner
    ? commissions.filter((c) => c.channelPartnerId === currentUser.id)
    : commissions;

  const visibleClawbacks = isPartner
    ? clawbacks.filter((c) => c.channelPartnerId === currentUser.id)
    : clawbacks;

  // Totals
  const totalDisbursed = visibleCommissions.reduce((acc, c) => acc + (c.disbursedAmount || 0), 0);
  const totalEarned = visibleCommissions.reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
  const pendingPayouts = visibleCommissions
    .filter((c) => c.status === 'PENDING')
    .reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
  const totalClawbacks = visibleClawbacks.reduce((acc, c) => acc + (c.amount || 0), 0);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isPartner
              ? 'My Commission & Payout Ledger'
              : isRM
              ? 'Assigned Channel Partners Commissions'
              : 'Commission Management & Payouts'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isPartner
              ? 'Real-time ledger of earned commissions from disbursed loans and payout status.'
              : isRM
              ? 'Earned commissions and payout tracking for your assigned Channel Partners.'
              : 'Partner commissions, automated slab payouts, and clawback enforcement.'}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowClawbackModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            ⚠️ Execute Clawback
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {isPartner ? 'My Disbursed Volume' : isRM ? 'Partner Disbursed Volume' : 'Total Disbursed'}
          </p>
          <p className="text-xl font-black text-slate-900 mt-1">{formatCurrencyINR(totalDisbursed)}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Commissions</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrencyINR(totalEarned)}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Payouts</p>
          <p className="text-xl font-black text-amber-600 mt-1">{formatCurrencyINR(pendingPayouts)}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Clawbacks Applied</p>
          <p className="text-xl font-black text-rose-600 mt-1">{formatCurrencyINR(totalClawbacks)}</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-slate-200 flex gap-2">
        <button
          onClick={() => setActiveTab('COMMISSIONS')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'COMMISSIONS'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Disbursement Commissions ({visibleCommissions.length})
        </button>
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

      {/* Commissions Table */}
      {activeTab === 'COMMISSIONS' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-4 py-3">Application Ref</th>
                  {!isPartner && <th className="px-4 py-3">Channel Partner</th>}
                  <th className="px-4 py-3">Lending Bank</th>
                  <th className="px-4 py-3">Disbursed Amount</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Commission Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={isPartner ? 7 : 8} className="px-4 py-12 text-center text-slate-400 text-sm">
                      No disbursed loan commissions recorded yet.
                    </td>
                  </tr>
                ) : (
                  visibleCommissions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          #{c.applicationId ? c.applicationId.slice(-6) : 'APP'}
                        </span>
                      </td>
                      {!isPartner && (
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">
                          {c.channelPartnerName || 'Channel Partner'}
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
                        {c.bankName || 'Bank'}
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

      {/* Clawbacks Table */}
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
