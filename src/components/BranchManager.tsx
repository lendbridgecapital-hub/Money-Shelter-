'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import type { BranchWithCounts, User, BranchType } from '@/types/db';
import { createBranchAction, updateBranchAction, deleteBranchAction } from '@/actions/branchActions';

interface BranchManagerProps {
  branches: BranchWithCounts[];
  relationshipManagers?: User[];
  initialTypeFilter?: 'ALL' | 'BRANCH' | 'SITE';
}

export default function BranchManager({
  branches,
  relationshipManagers = [],
  initialTypeFilter = 'ALL',
}: BranchManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [formType, setFormType] = useState<BranchType>('BRANCH');
  const [editingBranch, setEditingBranch] = useState<BranchWithCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BRANCH' | 'SITE'>(initialTypeFilter);
  const [searchQuery, setSearchQuery] = useState('');

  const branchCount = useMemo(() => branches.filter((b) => b.type !== 'SITE').length, [branches]);
  const siteCount = useMemo(() => branches.filter((b) => b.type === 'SITE').length, [branches]);
  const totalUsers = useMemo(() => branches.reduce((acc, b) => acc + (b.userCount || 0), 0), [branches]);
  const totalRequests = useMemo(() => branches.reduce((acc, b) => acc + (b.applicationCount || 0), 0), [branches]);

  const operatingBranches = useMemo(
    () => branches.filter((b) => b.type !== 'SITE' && (!editingBranch || b.id !== editingBranch.id)),
    [branches, editingBranch]
  );

  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (typeFilter === 'BRANCH' && b.type === 'SITE') return false;
      if (typeFilter === 'SITE' && b.type !== 'SITE') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchCode = b.code.toLowerCase().includes(q);
        const matchAddress = (b.address || '').toLowerCase().includes(q);
        const matchDev = (b.developerName || '').toLowerCase().includes(q);
        const matchRm = (b.dedicatedRmName || '').toLowerCase().includes(q);
        const matchMappedBranch = (b.mappedBranchName || '').toLowerCase().includes(q);
        return matchName || matchCode || matchAddress || matchDev || matchRm || matchMappedBranch;
      }
      return true;
    });
  }, [branches, typeFilter, searchQuery]);

  const openCreateBranchModal = () => {
    setEditingBranch(null);
    setFormType('BRANCH');
    setError(null);
    setMessage(null);
    setModalOpen(true);
  };

  const openCreateSiteModal = () => {
    setEditingBranch(null);
    setFormType('SITE');
    setError(null);
    setMessage(null);
    setModalOpen(true);
  };

  const openEditModal = (b: BranchWithCounts) => {
    setEditingBranch(b);
    setFormType(b.type === 'SITE' ? 'SITE' : 'BRANCH');
    setError(null);
    setMessage(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    formData.set('type', formType);

    startTransition(async () => {
      let res;
      if (editingBranch) {
        res = await updateBranchAction(editingBranch.id, formData);
      } else {
        res = await createBranchAction(formData);
      }

      if (res.ok) {
        setMessage(res.message || (formType === 'SITE' ? 'Site saved successfully.' : 'Branch saved successfully.'));
        setModalOpen(false);
      } else {
        setError(res.error || 'Failed to save location.');
      }
    });
  };

  const handleDelete = (id: string, name: string, isSite: boolean) => {
    const label = isSite ? 'construction site' : 'branch';
    if (!confirm(`Are you sure you want to delete ${label} "${name}"?`)) return;
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const res = await deleteBranchAction(id);
      if (res.ok) {
        setMessage(res.message || `${label} deleted.`);
      } else {
        setError(res.error || `Could not delete ${label}.`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-900 text-xs">✕</button>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✕</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 text-xs">✕</button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Locations</span>
            <span className="text-base">📍</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{branches.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Offices & project sites</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Branches</span>
            <span className="text-base">🏢</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{branchCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Regional company offices</p>
        </div>

        <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-2xs bg-gradient-to-br from-amber-50/40 to-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Company Sites</span>
            <span className="text-base">🏗️</span>
          </div>
          <p className="text-2xl font-black text-amber-950">{siteCount}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Direct construction projects</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Deployed Manpower</span>
            <span className="text-base">👥</span>
          </div>
          <p className="text-2xl font-black text-emerald-700">{totalUsers}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{totalRequests} loan files tagged</p>
        </div>
      </div>

      {/* Control Bar: Filters & Action Buttons */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Tab Switcher & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                typeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({branches.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('BRANCH')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                typeFilter === 'BRANCH'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🏢 Branches</span>
              <span className="text-[10px] opacity-75">({branchCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('SITE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                typeFilter === 'SITE'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              <span>🏗️ Sites</span>
              <span className="text-[10px] opacity-90">({siteCount})</span>
            </button>
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name, code, developer, address, or RM…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: + Add Branch & + Add Site Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openCreateBranchModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
          >
            <span>🏢</span>
            <span>+ Add Branch</span>
          </button>

          <button
            type="button"
            onClick={openCreateSiteModal}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
            title="Create a new construction project site operated directly by the company"
          >
            <span>🏗️</span>
            <span>+ Add Site</span>
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="px-4 py-3">Location / Project</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">RM / Contact Desk</th>
              <th className="px-4 py-3">Deployed Manpower</th>
              <th className="px-4 py-3">Loan Files</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBranches.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <div className="text-3xl mb-2">🏢</div>
                  <p className="font-semibold text-slate-700 text-sm">No locations found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {searchQuery ? 'Try clearing your search query.' : 'Click "+ Add Branch" or "+ Add Site" above to register a new location.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredBranches.map((b) => {
                const isSite = b.type === 'SITE';
                return (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 font-bold ${
                            isSite
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isSite ? '🏗️' : '🏢'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{b.name}</p>
                          {isSite && b.developerName && (
                            <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                              🏗️ Builder: {b.developerName}
                            </p>
                          )}
                          {isSite && b.mappedBranchName && (
                            <p className="text-[11px] text-blue-700 font-semibold mt-0.5 flex items-center gap-1">
                              <span>🏢 Handling Branch:</span>
                              <span className="font-bold">{b.mappedBranchName}</span>
                            </p>
                          )}
                          {!isSite && (() => {
                            const handledSites = branches.filter((s) => s.type === 'SITE' && s.mappedBranchId === b.id);
                            if (handledSites.length > 0) {
                              return (
                                <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                                  <span>🏗️ Handles {handledSites.length} {handledSites.length === 1 ? 'Site' : 'Sites'}:</span>
                                  <span className="truncate max-w-[160px]">{handledSites.map((s) => s.name).join(', ')}</span>
                                </p>
                              );
                            }
                            return null;
                          })()}
                          {b.address && (
                            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate" title={b.address}>
                              {b.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {isSite ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs">
                          <span>🏗️</span>
                          <span>Company Site</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          <span>🏢</span>
                          <span>Branch Office</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/60">
                        {b.code}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-xs">
                      {isSite ? (
                        <div>
                          {b.dedicatedRmName ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold mb-1">
                              <span>👤</span>
                              <span>RM: {b.dedicatedRmName}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic block mb-0.5">No RM assigned</span>
                          )}
                          <p className="text-[11px] text-slate-500">{b.email || b.phone || '—'}</p>
                        </div>
                      ) : (
                        <div className="text-slate-600">
                          <p className="font-medium text-slate-800">{b.email || '—'}</p>
                          <p className="text-slate-400 text-[11px]">{b.phone || ''}</p>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{b.userCount}</span>
                        <span className="text-xs text-slate-500">staff / manpower</span>
                      </div>
                      {isSite && (
                        <Link
                          href={`/admin/users`}
                          className="text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:underline mt-0.5 inline-block"
                        >
                          + Deploy Manpower →
                        </Link>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{b.applicationCount}</span>
                      <span className="text-xs text-slate-500 ml-1">requests</span>
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id, b.name, isSite)}
                        disabled={isPending || b.userCount > 0 || b.applicationCount > 0}
                        title={
                          b.userCount > 0 || b.applicationCount > 0
                            ? `Cannot delete location with ${b.userCount} active manpower or ${b.applicationCount} loan requests`
                            : 'Delete'
                        }
                        className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>{formType === 'SITE' ? '🏗️' : '🏢'}</span>
                  <span>
                    {editingBranch
                      ? `Edit ${editingBranch.type === 'SITE' ? 'Construction Site' : 'Branch'}: ${editingBranch.name}`
                      : formType === 'SITE'
                      ? 'Create New Construction Site'
                      : 'Create New Branch Office'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {formType === 'SITE'
                    ? 'A construction project handled directly by company. Deploy dedicated manpower under this project to originate leads and collect KYC tagged under this site and dedicated RM.'
                    : 'A regional company branch office. Users and loan origination desks are organized under this branch.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Type Switcher (Only when creating new) */}
            {!editingBranch && (
              <div className="mb-5 p-1 bg-slate-100 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFormType('BRANCH')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    formType === 'BRANCH'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🏢</span>
                  <span>Branch (Office)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('SITE')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    formType === 'SITE'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-amber-900'
                  }`}
                >
                  <span>🏗️</span>
                  <span>Site (Construction Project)</span>
                </button>
              </div>
            )}

            {/* Explanatory Banner for Site */}
            {formType === 'SITE' && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                <span className="text-base shrink-0">ℹ️</span>
                <p className="leading-relaxed">
                  <strong>Direct Company Operated Project:</strong> Deployed manpower stationed at this project will share links with customers. All applications and KYC information will automatically be tagged under this site and the assigned dedicated RM.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {formType === 'SITE' ? 'Project / Site Name *' : 'Branch Name *'}
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingBranch?.name || ''}
                  required
                  placeholder={formType === 'SITE' ? 'e.g. Godrej Woods Project / Pune Bavdhan Site' : 'e.g. Pune - Bavdhan HQ'}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {formType === 'SITE' ? 'Site Code (Unique) *' : 'Branch Code (Unique) *'}
                  </label>
                  <input
                    type="text"
                    name="code"
                    defaultValue={editingBranch?.code || ''}
                    required
                    placeholder={formType === 'SITE' ? 'e.g. STE-GDJ-01' : 'e.g. PUN01'}
                    className="w-full px-3 py-2 text-xs uppercase font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                {formType === 'SITE' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Builder / Developer Name
                    </label>
                    <input
                      type="text"
                      name="developerName"
                      defaultValue={editingBranch?.developerName || ''}
                      placeholder="e.g. Godrej Properties"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Official Branch Email</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={editingBranch?.email || ''}
                      placeholder="branch@company.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Mapped Operating Branch for SITE */}
              {formType === 'SITE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mapped Operating Branch (Handling Operations Desk)
                  </label>
                  <select
                    name="mappedBranchId"
                    defaultValue={editingBranch?.mappedBranchId || ''}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                  >
                    <option value="">No Regional Branch (Direct Central Operations)</option>
                    {operatingBranches.map((ob) => (
                      <option key={ob.id} value={ob.id}>
                        🏢 {ob.name} ({ob.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Select the company branch responsible for underwriting, operational review, document verification, and bank submission for this project site.
                  </p>
                </div>
              )}

              {/* Dedicated RM selection for SITE */}
              {formType === 'SITE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dedicated Relationship Manager (RM)
                  </label>
                  <select
                    name="dedicatedRmId"
                    defaultValue={editingBranch?.dedicatedRmId || ''}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                  >
                    <option value="">No RM Assigned (Head Office Direct)</option>
                    {relationshipManagers.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name} {rm.branchName ? `(${rm.branchName})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Every loan application and inquiry submitted from this site will be mapped to this dedicated RM.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {formType === 'SITE' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Site Official Email</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={editingBranch?.email || ''}
                      placeholder="site@company.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div className={formType === 'SITE' ? '' : 'col-span-2'}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {formType === 'SITE' ? 'Site Contact Phone' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingBranch?.phone || ''}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {formType === 'SITE' ? 'Project / Construction Site Address *' : 'Office Address'}
                </label>
                <textarea
                  name="address"
                  rows={2}
                  defaultValue={editingBranch?.address || ''}
                  required={formType === 'SITE'}
                  placeholder={formType === 'SITE' ? 'Full project construction address & landmark' : 'Full office address'}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs disabled:opacity-50 transition active:scale-95 ${
                    formType === 'SITE' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {isPending ? 'Saving…' : formType === 'SITE' ? 'Save Construction Site' : 'Save Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
