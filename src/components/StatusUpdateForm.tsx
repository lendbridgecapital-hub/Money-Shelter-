'use client';

import React, { useState, useTransition } from 'react';
import type { ApplicationStatus } from '@/types/db';
import { updateApplicationStatusAction } from '@/actions/applicationActions';

interface StatusUpdateFormProps {
  applicationId: string;
  currentStatus: ApplicationStatus;
}

export default function StatusUpdateForm({ applicationId, currentStatus }: StatusUpdateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const res = await updateApplicationStatusAction(applicationId, status, note);
      if (res.ok) {
        setMessage(res.message || 'Status updated successfully.');
        setNote('');
      } else {
        setError(res.error || 'Failed to update status.');
      }
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm sticky top-6">
      <h2 className="font-semibold text-slate-900 mb-1">Update Pipeline Stage</h2>
      <p className="text-xs text-slate-500 mb-4">
        Advance this application through approval or disbursement stages.
      </p>

      {message && (
        <div className="p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          ✓ {message}
        </div>
      )}
      {error && (
        <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          ✕ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Select Stage</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="LINK_SHARED">1. Link Shared (Awaiting Customer)</option>
            <option value="DOCUMENT_RECEIVED">2. Document Received (Verification)</option>
            <option value="LOAN_APPROVED">3. Loan Approved by Bank</option>
            <option value="LOAN_REJECTED">4. Loan Rejected</option>
            <option value="LOAN_DISBURSED">5. Loan Disbursed</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Note / Remarks</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Sanction letter received from HDFC Bank. Loan sanctioned for ₹30L at 8.65% ROI."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || status === currentStatus && !note}
          className="w-full btn-primary py-2.5 px-4 rounded-lg text-xs font-semibold shadow-sm hover:opacity-95 disabled:opacity-50 transition-opacity"
        >
          {isPending ? 'Updating Stage…' : 'Save Status Update'}
        </button>
      </form>
    </div>
  );
}
