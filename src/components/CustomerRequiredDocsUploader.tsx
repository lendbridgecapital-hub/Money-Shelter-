'use client';

import React, { useState, useTransition } from 'react';
import type { LoanApplication, RequiredDocumentItem } from '@/types/db';
import type { CompanySettings } from '@/types/db';
import type { Branch } from '@/types/db';
import { uploadCustomerRequiredDocumentAction } from '@/actions/publicActions';

interface CustomerRequiredDocsUploaderProps {
  token: string;
  application: LoanApplication;
  requiredDocs: RequiredDocumentItem[];
  settings: CompanySettings;
  branch?: Branch | null;
}

export default function CustomerRequiredDocsUploader({
  token,
  application,
  requiredDocs,
  settings,
  branch,
}: CustomerRequiredDocsUploaderProps) {
  const [isPending, startTransition] = useTransition();
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id?: string; type: 'success' | 'error'; message: string } | null>(null);

  const pendingCount = requiredDocs.filter((d) => d.status === 'PENDING').length;
  const isAllUploaded = requiredDocs.length > 0 && pendingCount === 0;

  async function handleFileSelected(docId: string, file: File | null) {
    if (!file) return;
    setUploadingDocId(docId);
    setFeedback(null);

    const formData = new FormData();
    formData.append('token', token);
    formData.append('requiredDocId', docId);
    formData.append('file', file);

    startTransition(async () => {
      const res = await uploadCustomerRequiredDocumentAction(formData);
      setUploadingDocId(null);
      if (res.ok) {
        setFeedback({
          id: docId,
          type: 'success',
          message: res.message || 'Document uploaded successfully!',
        });
      } else {
        setFeedback({
          id: docId,
          type: 'error',
          message: res.error || 'Failed to upload document. Please try again.',
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Alert Card */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-sm">
            !
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-200/70 text-amber-900 inline-block">
              Action Required · Loan Underwriting Update
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Additional Documents Requested
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
              Dear <strong>{application.fullName || 'Applicant'}</strong>, your loan operations desk has reviewed your file and requires the following additional document(s) before sanctioning your loan.
            </p>
          </div>
        </div>
      </div>

      {/* Global Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-3 text-lg leading-none">
            ×
          </button>
        </div>
      )}

      {/* Required Documents List */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Document Checklist</h3>
            <p className="text-xs text-slate-500">
              {pendingCount > 0
                ? `${pendingCount} document(s) awaiting your upload`
                : 'All requested documents have been uploaded!'}
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            Total: {requiredDocs.length}
          </span>
        </div>

        {requiredDocs.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No specific documents are pending at this moment.
          </p>
        ) : (
          <div className="space-y-3">
            {requiredDocs.map((doc) => {
              const isUploaded = doc.status === 'UPLOADED';
              const isCurrentUploading = uploadingDocId === doc.id && isPending;

              return (
                <div
                  key={doc.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isUploaded
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {doc.documentTitle}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isUploaded
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isUploaded ? '✓ Uploaded' : 'Pending Upload'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {isUploaded
                          ? 'Received and submitted to your operations team.'
                          : 'Please choose or photograph this document from your device.'}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isUploaded ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                            ✓ Verified & Attached
                          </span>
                        </div>
                      ) : (
                        <label
                          className={`relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer active:scale-95 transition-all ${
                            isCurrentUploading
                              ? 'bg-slate-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {isCurrentUploading ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Uploading…</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span>Upload Document ⤒</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            disabled={isCurrentUploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              handleFileSelected(doc.id, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isAllUploaded && (
          <div className="mt-6 p-5 rounded-2xl bg-emerald-600 text-white text-center shadow-md space-y-1">
            <p className="font-extrabold text-sm sm:text-base">✓ All Documents Received!</p>
            <p className="text-xs text-emerald-100">
              Your advisor and operations team will resume bank underwriting. You will receive an update shortly.
            </p>
          </div>
        )}
      </div>

      {/* Advisor Support Contact */}
      {(() => {
        const isSatara = branch?.id === 'br_satara_01' || branch?.code === 'STR01' || branch?.isCoBranded || branch?.name?.toLowerCase().includes('satara');
        return (
          <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-600">
            <p>
              Need help? Contact your advisor{' '}
              <strong>{application.channelPartnerName || application.createdByName || (isSatara ? 'Lendbridge Capital Desk' : 'Desk')}</strong>
              {isSatara ? ' at +91 9049301089 or email lendbridgecapital@gmail.com' : `${branch?.phone ? ` at ${branch.phone}` : ''}${settings.officialEmail ? ` or email ${settings.officialEmail}` : ''}`}.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
