'use client';

import React, { useState, useTransition } from 'react';
import type { Tenant } from '@/types/db';
import {
  createTenantAction,
  updateTenantAction,
  applyTenantAsActiveSystemAction,
  deleteTenantAction,
} from '@/actions/tenantActions';

export default function TenantManager({ tenants }: { tenants: Tenant[] }) {
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [accentColor, setAccentColor] = useState('#059669');

  const openCreateModal = () => {
    setEditingTenant(null);
    setName('');
    setSlug('');
    setCompanyName('');
    setPrimaryColor('#1e40af');
    setAccentColor('#059669');
    setError(null);
    setMessage(null);
    setModalOpen(true);
  };

  const openEditModal = (t: Tenant) => {
    setEditingTenant(t);
    setName(t.name);
    setSlug(t.slug);
    setCompanyName(t.companyName);
    setPrimaryColor(t.primaryColor || '#1e40af');
    setAccentColor(t.accentColor || '#059669');
    setError(null);
    setMessage(null);
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingTenant) {
      setCompanyName(val);
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      let res;
      if (editingTenant) {
        res = await updateTenantAction(editingTenant.id, formData);
      } else {
        res = await createTenantAction(formData);
      }

      if (res.ok) {
        setMessage(res.message || 'Tenant organization saved successfully.');
        setModalOpen(false);
      } else {
        setError(res.error || 'Failed to save tenant.');
      }
    });
  };

  const handleSwitchActive = (tenantId: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await applyTenantAsActiveSystemAction(tenantId);
      if (res.ok) {
        setMessage(res.message || 'Active system branding switched!');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setError(res.error || 'Could not switch branding.');
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingTenant) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await deleteTenantAction(deletingTenant.id);
      if (res.ok) {
        setMessage(res.message || 'Company deleted successfully.');
        setDeletingTenant(null);
      } else {
        setError(res.error || 'Failed to delete company.');
      }
    });
  };

  return (
    <div>
      {message && (
        <div className="p-4 mb-6 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          ✓ {message}
        </div>
      )}
      {error && (
        <div className="p-4 mb-6 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          ✕ {error}
        </div>
      )}

      {/* Banner explaining white-label multi-client capability */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full mb-2">
              White-Label Client Hub
            </span>
            <h2 className="text-xl font-bold mb-1">Multi-Client White-Label Platform</h2>
            <p className="text-xs text-blue-100 max-w-xl">
              Brand and resell this loan platform to multiple banks, NBFCs, and DSA agencies. Each customer gets their
              own company branding, primary/accent colors, branches, staff users, and customer application links.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-white text-blue-950 font-bold text-xs shadow-md hover:bg-blue-50 transition-colors shrink-0"
          >
            + Onboard New Client
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <th className="px-4 py-3">Client / Brand</th>
              <th className="px-4 py-3">Slug / Domain</th>
              <th className="px-4 py-3">Brand Theme</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                  No custom client tenants yet. Click &quot;+ Onboard New Client&quot; to create your first white-labeled customer.
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-2xs"
                        style={{ backgroundColor: t.primaryColor }}
                      >
                        {t.companyName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{t.companyName}</p>
                        <p className="text-xs text-slate-400">{t.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-600">
                    <p>/{t.slug}</p>
                    {t.domain && <p className="text-slate-400 font-sans">{t.domain}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-200 shadow-xs"
                        style={{ backgroundColor: t.primaryColor }}
                        title={`Primary: ${t.primaryColor}`}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-slate-200 shadow-xs"
                        style={{ backgroundColor: t.accentColor }}
                        title={`Accent: ${t.accentColor}`}
                      />
                      <span className="text-[11px] text-slate-400 font-mono">{t.primaryColor}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">
                    <p>{t.officialEmail || '—'}</p>
                    <p className="text-slate-400">{t.supportPhone || ''}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        t.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-1.5">
                    <button
                      onClick={() => handleSwitchActive(t.id)}
                      disabled={isPending}
                      className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors active:scale-95"
                      title="Apply this client branding as the active system theme"
                    >
                      Preview Theme
                    </button>
                    <button
                      onClick={() => openEditModal(t)}
                      className="text-xs font-semibold px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors active:scale-95"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingTenant(t)}
                      disabled={isPending}
                      className="text-xs font-semibold px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors active:scale-95 disabled:opacity-50"
                      title="Delete this company tenant"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
                style={{ backgroundColor: deletingTenant.primaryColor }}
              >
                {deletingTenant.companyName.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Company</h3>
                <p className="text-xs text-slate-500 font-mono">/{deletingTenant.slug}</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3.5 text-xs text-rose-800 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Permanent Deletion Warning</span>
              </p>
              <p className="leading-relaxed">
                Are you sure you want to delete <strong>&quot;{deletingTenant.companyName}&quot;</strong>?
              </p>
              <p className="text-[11px] text-rose-600">
                All custom branding, branches, and staff accounts created under this company will be permanently removed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTenant(null)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending ? 'Deleting…' : 'Yes, Delete Company'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Create Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingTenant ? `Edit Client: ${editingTenant.companyName}` : 'Onboard New White-Label Client'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Configure brand colors, client identity, and optional administrator credentials.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Client / Company Name *</label>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  placeholder="e.g. Apex Finance & Mortgages"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tenant Slug (URL Safe) *</label>
                  <input
                    type="text"
                    name="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    required
                    placeholder="apex-finance"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Domain (Optional)</label>
                  <input
                    type="text"
                    name="domain"
                    defaultValue={editingTenant?.domain || ''}
                    placeholder="loans.apexfinance.com"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      name="primaryColor"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full font-mono text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      name="accentColor"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-full font-mono text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    name="officialEmail"
                    defaultValue={editingTenant?.officialEmail || ''}
                    placeholder="contact@client.com"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Support Phone</label>
                  <input
                    type="text"
                    name="supportPhone"
                    defaultValue={editingTenant?.supportPhone || ''}
                    placeholder="+91 98765 00000"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {!editingTenant && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-slate-800">Initial Client Administrator Login</p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Admin Full Name</label>
                    <input
                      type="text"
                      name="adminName"
                      placeholder="e.g. Anil Kumar (Director)"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Admin Email</label>
                    <input
                      type="email"
                      name="adminEmail"
                      placeholder="admin@client.com"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Initial Password</label>
                    <input
                      type="password"
                      name="adminPassword"
                      defaultValue="Password123!"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
                    />
                  </div>
                </div>
              )}

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
                  {isPending ? 'Saving…' : 'Save Client Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
