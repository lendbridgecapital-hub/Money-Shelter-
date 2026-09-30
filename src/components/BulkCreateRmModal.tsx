'use client';

import React, { useState } from 'react';
import type { Branch } from '@/types/db';
import { bulkCreateRmAction, type BulkRmRowInput, type BulkCreateRmResult } from '@/actions/userActions';

interface BulkCreateRmModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  onSuccess?: () => void;
}

interface EditableRmRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  branchId: string;
  password: string;
}

export default function BulkCreateRmModal({
  isOpen,
  onClose,
  branches,
  onSuccess,
}: BulkCreateRmModalProps) {
  const [activeTab, setActiveTab] = useState<'GRID' | 'PASTE'>('GRID');
  const [defaultBranchId, setDefaultBranchId] = useState(branches[0]?.id || '');
  const [defaultPassword, setDefaultPassword] = useState('RM@QuickFin2026!');
  const [rawCsvText, setRawCsvText] = useState('');

  const createEmptyRow = (customBranchId?: string): EditableRmRow => ({
    id: `row_${Math.random().toString(36).substring(2, 9)}`,
    name: '',
    email: '',
    phone: '',
    branchId: customBranchId || defaultBranchId || branches[0]?.id || '',
    password: '',
  });

  const [rows, setRows] = useState<EditableRmRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkCreateRmResult | null>(null);

  if (!isOpen) return null;

  // Row Manipulation
  const handleUpdateRow = (id: string, field: keyof EditableRmRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleAddMultipleRows = (count: number) => {
    const newRows: EditableRmRow[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push(createEmptyRow());
    }
    setRows((prev) => [...prev, ...newRows]);
  };

  const handleClearRows = () => {
    setRows([createEmptyRow()]);
    setRawCsvText('');
    setError(null);
    setResult(null);
  };

  // Sample CSV Download
  const handleDownloadSampleCsv = () => {
    const csvContent =
      'Full Name,Work Email,Phone,Branch Code,Password\n' +
      `Ramesh Sharma,ramesh.sharma@quickfinsure.com,9876543210,${branches[0]?.code || 'PUN-01'},RM@QuickFin2026!\n` +
      `Priya Verma,priya.verma@quickfinsure.com,9811223344,${branches[1]?.code || branches[0]?.code || 'MUM-01'},RM@QuickFin2026!\n` +
      `Amit Kulkarni,amit.kulkarni@quickfinsure.com,9988776655,${branches[0]?.code || 'PUN-01'},Pass1234!`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'quickfinsure_bulk_rms_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse Raw CSV/TSV Text into Grid
  const parseCsvText = (text: string) => {
    if (!text.trim()) return;
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsedRows: EditableRmRow[] = [];

    // Helper to find branch by name or code
    const findBranchId = (token: string) => {
      if (!token) return defaultBranchId;
      const clean = token.trim().toLowerCase();
      const match = branches.find(
        (b) =>
          b.id === clean ||
          b.code.toLowerCase() === clean ||
          b.name.toLowerCase().includes(clean)
      );
      return match ? match.id : defaultBranchId;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header if line starts with name/full name
      if (
        i === 0 &&
        (line.toLowerCase().startsWith('name') ||
          line.toLowerCase().startsWith('full name') ||
          line.toLowerCase().startsWith('full_name'))
      ) {
        continue;
      }

      // Split by comma or tab
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const cleanParts = parts.map((p) => p.trim().replace(/^["']|["']$/g, ''));

      const name = cleanParts[0] || '';
      const email = cleanParts[1] || '';
      const phone = cleanParts[2] || '';
      const branchToken = cleanParts[3] || '';
      const password = cleanParts[4] || '';

      if (name || email) {
        parsedRows.push({
          id: `row_${Math.random().toString(36).substring(2, 9)}`,
          name,
          email,
          phone,
          branchId: findBranchId(branchToken),
          password,
        });
      }
    }

    if (parsedRows.length > 0) {
      setRows(parsedRows);
      setActiveTab('GRID');
      setError(null);
    } else {
      setError('Could not parse any valid RM rows from the input text.');
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawCsvText(content);
        parseCsvText(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Validate and submit
  const validRows = rows.filter(
    (r) => r.name.trim().length > 0 && /^\S+@\S+\.\S+$/.test(r.email.trim())
  );

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    if (validRows.length === 0) {
      setError('Please provide at least one Relationship Manager with a valid name and email.');
      return;
    }

    setLoading(true);

    const payload: BulkRmRowInput[] = validRows.map((r) => ({
      name: r.name.trim(),
      email: r.email.trim().toLowerCase(),
      phone: r.phone.trim(),
      branchId: r.branchId || defaultBranchId,
      password: r.password.trim() || undefined,
    }));

    const res = await bulkCreateRmAction(payload, defaultBranchId, defaultPassword);
    setLoading(false);

    if (res.ok) {
      setResult(res);
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || 'Failed to execute bulk creation.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 via-white to-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-black shadow-xs">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Bulk Create Relationship Managers (RMs)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                  Staff Role: RM
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Provision multiple RM staff accounts simultaneously with instant branch mapping and login credentials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-lg transition"
          >
            ×
          </button>
        </div>

        {/* Global Settings Strip */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Default Branch:</span>
              <select
                value={defaultBranchId}
                onChange={(e) => {
                  setDefaultBranchId(e.target.value);
                  // Update rows that match old default
                  setRows((prev) =>
                    prev.map((r) =>
                      r.branchId === defaultBranchId ? { ...r, branchId: e.target.value } : r
                    )
                  );
                }}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Default Password:</span>
              <input
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="min 8 chars"
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 w-36 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('GRID')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                activeTab === 'GRID'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Table Grid ({validRows.length}/{rows.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PASTE')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                activeTab === 'PASTE'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📥 CSV / Paste Fast Import
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center justify-between">
              <span>✕ {error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-500 hover:text-rose-700 font-bold ml-2"
              >
                ×
              </button>
            </div>
          )}

          {/* Success / Result View */}
          {result && (
            <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>✓</span>
                    <span>{result.message}</span>
                  </h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    Newly created Relationship Managers can immediately log in with their work email and assigned initial password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition"
                >
                  Create More
                </button>
              </div>

              {result.details && result.details.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto border border-emerald-200/80 rounded-lg bg-white divide-y divide-slate-100 text-xs">
                  {result.details.map((d, idx) => (
                    <div key={idx} className="px-3 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            d.status === 'CREATED'
                              ? 'bg-emerald-500'
                              : d.status === 'SKIPPED'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-semibold text-slate-800">{d.name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">({d.email})</span>
                      </div>
                      <div className="text-right">
                        {d.status === 'CREATED' ? (
                          <span className="text-emerald-700 font-bold text-[11px]">Created</span>
                        ) : (
                          <span className="text-amber-700 font-medium text-[11px]">
                            {d.status}: {d.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: INTERACTIVE GRID */}
          {activeTab === 'GRID' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-center w-10">#</th>
                        <th className="px-3 py-2 text-left min-w-[160px]">Full Name *</th>
                        <th className="px-3 py-2 text-left min-w-[200px]">Work Email (Login ID) *</th>
                        <th className="px-3 py-2 text-left min-w-[120px]">Phone Number</th>
                        <th className="px-3 py-2 text-left min-w-[160px]">Branch Assignment</th>
                        <th className="px-3 py-2 text-left min-w-[140px]">Custom Password</th>
                        <th className="px-2 py-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, idx) => {
                        const isEmailValid =
                          !row.email.trim() || /^\S+@\S+\.\S+$/.test(row.email.trim());
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handleUpdateRow(row.id, 'name', e.target.value)}
                                placeholder="e.g. Ramesh Sharma"
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="email"
                                value={row.email}
                                onChange={(e) => handleUpdateRow(row.id, 'email', e.target.value)}
                                placeholder="ramesh@quickfinsure.com"
                                className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-medium focus:ring-2 ${
                                  !isEmailValid
                                    ? 'border-rose-400 bg-rose-50 text-rose-800 focus:ring-rose-500'
                                    : 'border-slate-200 focus:ring-emerald-500'
                                }`}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="tel"
                                value={row.phone}
                                onChange={(e) => handleUpdateRow(row.id, 'phone', e.target.value)}
                                placeholder="10-digit mobile"
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={row.branchId}
                                onChange={(e) => handleUpdateRow(row.id, 'branchId', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                              >
                                {branches.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name} ({b.code})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={row.password}
                                onChange={(e) => handleUpdateRow(row.id, 'password', e.target.value)}
                                placeholder={defaultPassword}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 focus:ring-2 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.id)}
                                title="Remove row"
                                className="text-slate-300 hover:text-rose-600 p-1 rounded transition"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition inline-flex items-center gap-1"
                  >
                    <span>+ Add Row</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddMultipleRows(5)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition inline-flex items-center gap-1"
                  >
                    <span>+ Add 5 Rows</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearRows}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition"
                  >
                    Clear All
                  </button>
                </div>

                <div className="text-slate-500 text-xs">
                  <span className="font-bold text-slate-800">{validRows.length}</span> valid row(s) ready to create.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CSV / TEXT PASTE */}
          {activeTab === 'PASTE' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📄</span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">Fast CSV & Spreadsheet Import</h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Copy rows from Microsoft Excel or Google Sheets, or paste comma/tab-separated text below.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold text-xs rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                  >
                    <span>📥 Download Sample CSV</span>
                  </button>

                  <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition cursor-pointer inline-flex items-center gap-1">
                    <span>📂 Upload .csv File</span>
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paste Raw CSV / TSV Rows:
                </label>
                <textarea
                  rows={8}
                  value={rawCsvText}
                  onChange={(e) => setRawCsvText(e.target.value)}
                  placeholder={
                    'Full Name, Work Email, Phone, Branch Code / Name, Password\n' +
                    'Ramesh Sharma, ramesh.sharma@quickfinsure.com, 9876543210, Pune Head Office, Pass123!\n' +
                    'Priya Verma, priya.verma@quickfinsure.com, 9811223344, Mumbai Branch\n' +
                    'Amit Kulkarni, amit.kulkarni@quickfinsure.com, 9988776655, PUN-01'
                  }
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Format per line: <code>Full Name, Email, Phone, Branch, Password</code> (Phone, Branch, and Password are optional).
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => parseCsvText(rawCsvText)}
                  disabled={!rawCsvText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
                >
                  <span>✓ Parse & Populate into Grid</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {validRows.length > 0 ? (
              <span>
                Ready to provision <strong>{validRows.length}</strong> Relationship Manager accounts.
              </span>
            ) : (
              <span>Fill in full name and valid work email to activate creation.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || validRows.length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating RMs…</span>
                </>
              ) : (
                <>
                  <span>⚡ Create {validRows.length} Relationship Manager(s)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
