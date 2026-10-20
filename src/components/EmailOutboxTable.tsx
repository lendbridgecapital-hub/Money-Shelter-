'use client';

import React, { useState, useMemo } from 'react';
import type { EmailLog } from '@/types/db';
import { formatDate } from '@/lib/format';

export default function EmailOutboxTable({ logs }: { logs: EmailLog[] }) {
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'SATARA' | 'CUSTOMER' | 'ALERTS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Category Filter
      if (filterMode === 'SATARA') {
        const isSatara =
          log.toEmail.toLowerCase().includes('lendbridge') ||
          log.subject.toLowerCase().includes('satara') ||
          log.subject.toLowerCase().includes('lendbridge');
        if (!isSatara) return false;
      } else if (filterMode === 'CUSTOMER') {
        const isCustomer =
          log.subject.toLowerCase().includes('application received') ||
          log.subject.toLowerCase().includes('sanction offer') ||
          log.subject.toLowerCase().includes('disbursement');
        if (!isCustomer) return false;
      } else if (filterMode === 'ALERTS') {
        const isAlert =
          log.subject.includes('🔔') ||
          log.subject.toLowerCase().includes('alert') ||
          log.subject.toLowerCase().includes('documents re-uploaded') ||
          log.subject.toLowerCase().includes('acceptance recorded');
        if (!isAlert) return false;
      }

      // 2. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTo = log.toEmail.toLowerCase().includes(q);
        const matchesSubject = log.subject.toLowerCase().includes(q);
        const matchesStatus = log.status.toLowerCase().includes(q);
        return matchesTo || matchesSubject || matchesStatus;
      }

      return true;
    });
  }, [logs, filterMode, searchQuery]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden space-y-4 p-5 sm:p-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>📫</span>
            <span>System Mail Outbox & Delivery Audit</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time audit log of automated customer confirmations, Satara branch alerts, and system emails.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            {filteredLogs.length} / {logs.length} Logged
          </span>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Logs
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('SATARA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filterMode === 'SATARA'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span>📍</span>
            <span>Satara Branch Only (lendbridgecapital@gmail.com)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('CUSTOMER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'CUSTOMER'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            Customer Confirmations
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('ALERTS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'ALERTS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Branch Alerts
          </button>
        </div>

        <div className="w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, recipient..."
            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
          <p className="text-sm font-semibold text-slate-700">No matching email records found</p>
          <p className="text-xs text-slate-400">
            {logs.length === 0
              ? 'Dispatched notifications and customer confirmations will appear here automatically.'
              : 'Try clearing your search query or switching to All Logs.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Recipient</th>
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const statusColors = {
                  SENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  FAILED: 'bg-red-50 text-red-700 border-red-200',
                  SMTP_NOT_CONFIGURED: 'bg-amber-50 text-amber-700 border-amber-200',
                };

                const statusLabels = {
                  SENT: '✓ Dispatched',
                  FAILED: '✕ Failed',
                  SMTP_NOT_CONFIGURED: '⏳ Stored (No SMTP)',
                };

                const isSataraRecipient =
                  log.toEmail.toLowerCase().includes('lendbridgecapital') ||
                  log.subject.toLowerCase().includes('satara');

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {isSataraRecipient && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 font-extrabold uppercase">
                            Satara
                          </span>
                        )}
                        <span>{log.toEmail}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate font-medium">
                      {log.subject}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          statusColors[log.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {statusLabels[log.status] || log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold active:scale-95 transition cursor-pointer"
                      >
                        Audit / View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{selectedLog.subject}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  To: <strong className="text-slate-800">{selectedLog.toEmail}</strong> • {formatDate(selectedLog.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedLog.errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                <strong>Error reason:</strong> {selectedLog.errorMessage}
              </div>
            )}

            {selectedLog.messageId && (
              <div className="text-[11px] font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                SMTP Message-ID: {selectedLog.messageId}
              </div>
            )}

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl p-4 bg-slate-50 text-xs">
              <div
                dangerouslySetInnerHTML={{ __html: selectedLog.bodyHtml }}
                className="prose prose-xs max-w-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
