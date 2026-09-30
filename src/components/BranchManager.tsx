'use client';

import React, { useState, useTransition } from 'react';
import type { BranchWithCounts } from '@/types/db';
import { createBranchAction, updateBranchAction, deleteBranchAction } from '@/actions/branchActions';

export default function BranchManager({ branches }: { branches: BranchWithCounts[] }) {
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchWithCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingBranch(null);
    setError(null);
    setMessage(null);
    setModalOpen(true);
  };

  const openEditModal = (b: BranchWithCounts) => {
    setEditingBranch(b);
    setError(null);
    setMessage(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      let res;
      if (editingBranch) {
        res = await updateBranchAction(editingBranch.id, formData);
      } else {
        res = await createBranchAction(formData);
      }

      if (res.ok) {
        setMessage(res.message || 'Branch saved successfully.');
        setModalOpen(false);
      } else {
        setError(res.error || 'Failed to save branch.');
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete branch "${name}"?`)) return;
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const res = await deleteBranchAction(id);
      if (res.ok) {
        setMessage(res.message || 'Branch deleted.');
      } else {
        setError(res.error || 'Could not delete branch.');
      }
    });
  };

  return (
    <div>
      {message && (
        <div className="p-4 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          ✓ {message}
        </div>
      )}
      {error && (
        <div className="p-4 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm font-medium">
          ✕ {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-slate-500">{branches.length} branches registered</p>
        <button
          onClick={openCreateModal}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
        >
          + Add New Branch
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <th className="px-4 py-3">Branch Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Applications</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {branches.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-slate-900">{b.name}</p>
                  {b.address && <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{b.address}</p>}
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                    {b.code}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs text-slate-600">
                  <p>{b.email || '—'}</p>
                  <p className="text-slate-400">{b.phone || ''}</p>
                </td>
                <td className="px-4 py-3.5 font-medium text-slate-700">{b.userCount} users</td>
                <td className="px-4 py-3.5 font-medium text-slate-700">{b.applicationCount} requests</td>
                <td className="px-4 py-3.5 text-right space-x-2">
                  <button
                    onClick={() => openEditModal(b)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(b.id, b.name)}
                    disabled={isPending || b.userCount > 0 || b.applicationCount > 0}
                    title={
                      b.userCount > 0 || b.applicationCount > 0
                        ? 'Cannot delete branch with active users or applications'
                        : 'Delete branch'
                    }
                    className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Create New Branch'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter branch code, location address, and official branch email.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingBranch?.name || ''}
                  required
                  placeholder="e.g. Pune - Bavdhan HQ"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Code (Unique)</label>
                <input
                  type="text"
                  name="code"
                  defaultValue={editingBranch?.code || ''}
                  required
                  placeholder="e.g. PUN01"
                  className="w-full px-3 py-2 text-sm uppercase font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Email (Alerts)</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingBranch?.email || ''}
                  placeholder="branch@yourcompany.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  defaultValue={editingBranch?.phone || ''}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office Address</label>
                <textarea
                  name="address"
                  rows={2}
                  defaultValue={editingBranch?.address || ''}
                  placeholder="Full office address"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary px-5 py-2 text-sm font-semibold rounded-lg disabled:opacity-50"
                >
                  {isPending ? 'Saving…' : 'Save Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
