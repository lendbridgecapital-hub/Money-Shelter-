'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Branch, Role } from '@/types/db';
import { createUserAction, setUserActiveAction, updateUserRoleBranchAction } from '@/actions/userActions';
import BulkCreateRmModal from '@/components/BulkCreateRmModal';
import { ROLE_LABELS } from '@/lib/format';

export default function UserManager({
  users,
  branches,
  currentUserRole = 'ADMIN',
}: {
  users: User[];
  branches: Branch[];
  currentUserRole?: Role;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [formRole, setFormRole] = useState<Role>('RELATIONSHIP_MANAGER');

  // Relationship managers for assignment
  const relationshipManagers = useMemo(() => users.filter((u) => u.role === 'RELATIONSHIP_MANAGER'), [users]);

  // Counts
  const rmCount = users.filter((u) => u.role === 'RELATIONSHIP_MANAGER').length;
  const opsCount = users.filter((u) => u.role === 'OPERATIONS').length;
  const supportCount = users.filter((u) => u.role === 'CENTRAL_SUPPORT').length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const partnerCount = users.filter((u) => u.role === 'CHANNEL_PARTNER').length;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPhone = u.phone ? u.phone.includes(q) : false;
        const matchBranch = (u.branchName || '').toLowerCase().includes(q);
        const matchCode = (u.partnerCode || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchBranch && !matchCode) {
          return false;
        }
      }
      return true;
    });
  }, [users, roleFilter, searchTerm]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await createUserAction(formData);
        if (res && res.ok) {
          setMessage(res.message || 'User created successfully.');
          setModalOpen(false);
          router.refresh();
        } else {
          setError((res && res.error) || 'Failed to create user.');
        }
      } catch (err) {
        setError((err as Error).message || 'Server error creating user.');
      }
    });
  };

  const handleToggleActive = (id: string, current: boolean) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await setUserActiveAction(id, !current);
        if (!res || !res.ok) setError((res && res.error) || 'Could not update user status.');
        router.refresh();
      } catch (err) {
        setError((err as Error).message || 'Server error updating user status.');
      }
    });
  };

  const handleRoleChange = (id: string, newRole: Role, branchId: string) => {
    startTransition(async () => {
      try {
        const res = await updateUserRoleBranchAction(id, newRole, branchId);
        if (!res || !res.ok) setError((res && res.error) || 'Could not update role.');
        router.refresh();
      } catch (err) {
        setError((err as Error).message || 'Server error updating role.');
      }
    });
  };

  const handleBranchChange = (id: string, role: Role, newBranchId: string) => {
    startTransition(async () => {
      try {
        const res = await updateUserRoleBranchAction(id, role, newBranchId);
        if (!res || !res.ok) setError((res && res.error) || 'Could not update branch.');
        router.refresh();
      } catch (err) {
        setError((err as Error).message || 'Server error updating branch.');
      }
    });
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>✓ {message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between">
          <span>✕ {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm">
            👥
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Team Directory</h3>
            <p className="text-[11px] text-slate-500">
              Total {users.length} registered accounts ({rmCount} Relationship Managers active)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMessage(null);
              setBulkModalOpen(true);
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition"
          >
            <span>⚡</span>
            <span>Bulk Create RMs</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setMessage(null);
              setModalOpen(true);
            }}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1 transition"
          >
            <span>+</span>
            <span>Add Single Staff</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search name, email, phone, or branch…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Role Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                roleFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('RELATIONSHIP_MANAGER')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                roleFilter === 'RELATIONSHIP_MANAGER'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Relationship Managers ({rmCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('CENTRAL_SUPPORT')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                roleFilter === 'CENTRAL_SUPPORT'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Central Support ({supportCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('OPERATIONS')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                roleFilter === 'OPERATIONS'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Operations ({opsCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('ADMIN')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                roleFilter === 'ADMIN'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Admins ({adminCount})
            </button>
            {partnerCount > 0 && (
              <button
                type="button"
                onClick={() => setRoleFilter('CHANNEL_PARTNER')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  roleFilter === 'CHANNEL_PARTNER'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Channel Partners ({partnerCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <th className="px-4 py-3">Staff Member & Email</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Platform Role</th>
              <th className="px-4 py-3">Assigned Branch</th>
              <th className="px-4 py-3">Account Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No staff members match the selected filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{u.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                    {u.phone || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={isPending || currentUserRole !== 'ADMIN'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as Role, u.branchId)}
                      className="text-xs font-semibold border border-slate-200 rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="RELATIONSHIP_MANAGER">Relationship Manager (RM)</option>
                      <option value="CENTRAL_SUPPORT">Central Support</option>
                      <option value="OPERATIONS">Operations</option>
                      <option value="ADMIN">Administrator</option>
                      <option value="CHANNEL_PARTNER">Channel Partner</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.branchId}
                      disabled={isPending || currentUserRole !== 'ADMIN'}
                      onChange={(e) => handleBranchChange(u.id, u.role, e.target.value)}
                      className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-emerald-500"
                    >
                      <optgroup label="🏢 Branches">
                        {branches
                          .filter((b) => b.type !== 'SITE')
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="🏗️ Construction Sites">
                        {branches
                          .filter((b) => b.type === 'SITE')
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      }`}
                    >
                      {u.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(u.id, u.active)}
                      disabled={isPending}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md px-2.5 py-1 hover:bg-slate-50 transition"
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Create RM Modal */}
      <BulkCreateRmModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        branches={branches}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Add Single User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900">Create Staff User</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Add a new staff member with role-based access and assigned branch.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email (Login ID) *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="ramesh@moneyshelter.in"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password (min 8 chars) *</label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  defaultValue="Password123!"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Role *</label>
                <select
                  name="role"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                >
                  <option value="CHANNEL_PARTNER">Channel Partner (Auto-Approved & Active)</option>
                  <option value="RELATIONSHIP_MANAGER">Relationship Manager (RM) - Channel Partner Portfolios</option>
                  <option value="OPERATIONS">Operations - Loan Underwriting & Banks</option>
                  <option value="CENTRAL_SUPPORT">Central Support - Partner Onboarding & Approvals</option>
                  <option value="ADMIN">Administrator - Full Organization Control</option>
                </select>
              </div>

              {formRole === 'CHANNEL_PARTNER' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Relationship Manager (RM)</label>
                    <select
                      name="assignedRmId"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                    >
                      <option value="">No RM Assigned (Head Office Direct)</option>
                      {relationshipManagers.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name} ({rm.branchName || 'HQ'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number (Optional)</label>
                      <input
                        type="text"
                        name="panNumber"
                        placeholder="e.g. ABCDE1234F"
                        maxLength={10}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar (Optional)</label>
                      <input
                        type="text"
                        name="aadhaarNumber"
                        placeholder="12 digits"
                        maxLength={12}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Branch / Construction Site *</label>
                <select
                  name="branchId"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                >
                  <optgroup label="🏢 Regional Branches / Offices">
                    {branches
                      .filter((b) => b.type !== 'SITE')
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="🏗️ Construction Sites (Direct Company Projects)">
                    {branches
                      .filter((b) => b.type === 'SITE')
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code}){b.dedicatedRmName ? ` — Dedicated RM: ${b.dedicatedRmName}` : ''}
                        </option>
                      ))}
                  </optgroup>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Selecting a Construction Site will deploy this manpower under that project, auto-mapping their customer applications to the project and dedicated RM.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isPending ? 'Creating…' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
