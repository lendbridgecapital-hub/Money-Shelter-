'use client';

import React, { useState } from 'react';
import type { EmailLog } from '@/types/db';
import { formatDate } from '@/lib/format';

export default function EmailOutboxTable({ logs }: { logs: EmailLog[] }) {
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  if (logs.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 shadow-2xs">
        <p className="text-sm">No email records found yet. Dispatched emails and notifications will appear here in real time.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden space-y-3 p-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">System Mail Outbox & Delivery Audit</h3>
          <p className="text-xs text-slate-500">Record of automated customer confirmations, branch alerts, and notifications.</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
          {logs.length} Total Logs
        </span>
      </div>

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
            {logs.map((log) => {
              const statusColors = {
                SENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                FAILED: 'bg-red-50 text-red-700 border-red-200',
                SMTP_NOT_CONFIGURED: 'bg-amber-50 text-amber-700 border-amber-200',
              };

              const statusLabels = {
                SENT: '✓ Dispatched',
                FAILED: '✕ Failed',
                SMTP_NOT_CONFIGURED: '⏳ Outbox Stored (No SMTP)',
              };

              return (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {log.toEmail}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                    {log.subject}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
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
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold active:scale-95 transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{selectedLog.subject}</h3>
                <p className="text-[11px] text-slate-500">
                  To: <strong>{selectedLog.toEmail}</strong> • {formatDate(selectedLog.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition"
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
              <div className="text-[11px] font-mono text-slate-500">
                Message-ID: {selectedLog.messageId}
              </div>
            )}

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs">
              <div
                dangerouslySetInnerHTML={{ __html: selectedLog.bodyHtml }}
                className="prose prose-xs max-w-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
