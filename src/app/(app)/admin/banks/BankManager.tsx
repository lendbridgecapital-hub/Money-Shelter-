'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Bank, Role } from '@/types/db';
import { saveBankAction, deleteBankAction } from '@/actions/workflowActions';
import { formatDate } from '@/lib/format';

interface Props {
  initialBanks: Bank[];
  userRole: Role;
}

export default function BankManager({ initialBanks, userRole }: Props) {
  const router = useRouter();
  const isAdmin = userRole === 'ADMIN';

  const [banks, setBanks] = useState<Bank[]>(initialBanks);
  const [showModal, setShowModal] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [commissionPct, setCommissionPct] = useState(1.0);
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreateModal() {
    setEditingBank(null);
    setName('');
    setCode('');
    setCommissionPct(1.0);
    setContactPerson('');
    setEmail('');
    setPhone('');
    setError(null);
    setShowModal(true);
  }

  function openEditModal(bank: Bank) {
    setEditingBank(bank);
    setName(bank.name);
    setCode(bank.code);
    setCommissionPct(bank.commissionPct || 1.0);
    setContactPerson(bank.contactPerson || '');
    setEmail(bank.email || '');
    setPhone(bank.phone || '');
    setError(null);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Please provide bank name and code.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await saveBankAction({
      id: editingBank ? editingBank.id : undefined,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      commissionPct: Number(commissionPct),
      contactPerson: contactPerson.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });

    setLoading(false);
    if (res.ok) {
      setShowModal(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to save bank.');
    }
  }

  async function handleDelete(id: string, bankName: string) {
    if (!confirm(`Are you sure you want to remove ${bankName}?`)) return;
    setLoading(true);
    const res = await deleteBankAction(id);
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to remove bank.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Partner Lending Banks</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure partner banks, relationship managers, and default base commission slabs.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            + Add Partner Bank
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                <th className="px-4 py-3">Bank Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Commission Slab</th>
                <th className="px-4 py-3">Contact Desk</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {banks.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No partner banks registered yet. Click &quot;Add Partner Bank&quot; to configure lenders.
                  </td>
                </tr>
              ) : (
                banks.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{b.name}</p>
                      <p className="text-xs text-slate-400">ID: {b.id.slice(-6)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {b.code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {b.commissionPct}% payout
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {b.contactPerson && <p className="font-medium text-slate-800">{b.contactPerson}</p>}
                      {b.email && <p className="text-slate-500">{b.email}</p>}
                      {b.phone && <p className="text-slate-400">{b.phone}</p>}
                      {!b.contactPerson && !b.email && !b.phone && <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          b.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {b.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(b)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id, b.name)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Create / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">
                {editingBank ? 'Edit Partner Bank' : 'Add Partner Lending Bank'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC, ICICI, SBI"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Base Commission (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    placeholder="1.0"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Officer Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar (Regional Relationship Head)"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Desk Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="dsa.desk@bank.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Desk Phone (Optional)</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {error && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Saving…' : 'Save Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
