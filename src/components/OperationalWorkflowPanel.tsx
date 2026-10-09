'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Bank, LoanApplication, OperationalRemark, RequiredDocumentItem, User } from '@/types/db';
import {
  sendToBankAction,
  submitRemarkAction,
  approveCaseAction,
  rejectCaseAction,
  disburseCaseAction,
} from '@/actions/workflowActions';
import { formatCurrencyINR } from '@/lib/format';

interface Props {
  application: LoanApplication;
  currentUser: User;
  banks: Bank[];
  requiredDocs?: RequiredDocumentItem[];
  remarks?: OperationalRemark[];
  baseUrl?: string;
}

export default function OperationalWorkflowPanel({
  application,
  currentUser,
  banks,
}: Props) {
  const router = useRouter();

  // Modal / Form States
  const [showSendToBank, setShowSendToBank] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.id || '');
  const [bankNote, setBankNote] = useState('');

  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [remarkStatus, setRemarkStatus] = useState<string>(application.status);
  const [remarkText, setRemarkText] = useState('');
  const [selectedDocsList, setSelectedDocsList] = useState<string[]>([]);
  const [customDocInput, setCustomDocInput] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState(application.loanAmount || 1000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureMonths, setTenureMonths] = useState(60);
  const [approveBankId, setApproveBankId] = useState(application.bankId || banks[0]?.id || '');
  const [approveNote, setApproveNote] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [disbursedAmount, setDisbursedAmount] = useState(
    application.approvedAmount || application.loanAmount || 1000000
  );
  const [disburseNote, setDisburseNote] = useState('');

  // General Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isOpsOrAdmin =
    currentUser.role === 'OPERATIONS' ||
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'CENTRAL_SUPPORT';
  const isRM = currentUser.role === 'RELATIONSHIP_MANAGER';

  // Handle Send to Bank
  async function handleSendToBank() {
    setLoading(true);
    setFeedback(null);
    const res = await sendToBankAction(application.id, selectedBankId, bankNote);
    setLoading(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Details sent to bank.' });
      setShowSendToBank(false);
      router.refresh();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to send details to bank.' });
    }
  }

  // Handle Remark & Document Request Submit
  async function handleRemarkSubmit() {
    if (!remarkText.trim() && selectedDocsList.length === 0) {
      alert('Please enter a remark or select at least one required document.');
      return;
    }
    setLoading(true);
    setFeedback(null);
    const res = await submitRemarkAction(
      application.id,
      remarkStatus as any,
      remarkText,
      selectedDocsList
    );
    setLoading(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Remark submitted.' });
      setShowRemarkModal(false);
      setRemarkText('');
      setSelectedDocsList([]);
      router.refresh();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to submit remark.' });
    }
  }

  // Handle Approve Case
  async function handleApproveCase() {
    setLoading(true);
    setFeedback(null);
    const res = await approveCaseAction(
      application.id,
      Number(approvedAmount),
      Number(interestRate),
      Number(tenureMonths),
      approveBankId,
      approveNote
    );
    setLoading(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Case approved by bank!' });
      setShowApproveModal(false);
      router.refresh();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to approve case.' });
    }
  }

  // Handle Reject Case
  async function handleRejectCase() {
    if (!rejectReason.trim()) {
      alert('Please specify the reason for case rejection.');
      return;
    }
    setLoading(true);
    setFeedback(null);
    const res = await rejectCaseAction(application.id, rejectReason.trim());
    setLoading(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Case rejected and recorded.' });
      setShowRejectModal(false);
      setRejectReason('');
      router.refresh();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to reject case.' });
    }
  }

  // Handle Disburse Loan
  async function handleDisburseLoan() {
    setLoading(true);
    setFeedback(null);
    const res = await disburseCaseAction(
      application.id,
      Number(disbursedAmount),
      disburseNote
    );
    setLoading(false);
    if (res.ok) {
      setFeedback({ type: 'success', message: res.message || 'Loan disbursed and commission credited!' });
      setShowDisburseModal(false);
      router.refresh();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to disburse loan.' });
    }
  }

  const commonDocSuggestions = [
    'Latest 3 Months Salary Slips',
    'Bank Statement for Last 6 Months',
    'Form 16 / ITR of Assessment Year 2024-25',
    'Property Sale Agreement / Index II',
    'Electricity / Utility Bill for Residence Proof',
    'Co-applicant PAN & Aadhaar KYC',
    'Business GST Returns / Udhyam Aadhar',
  ];

  function toggleDocSelection(doc: string) {
    if (selectedDocsList.includes(doc)) {
      setSelectedDocsList(selectedDocsList.filter((d) => d !== doc));
    } else {
      setSelectedDocsList([...selectedDocsList, doc]);
    }
  }

  function addCustomDoc() {
    if (customDocInput.trim() && !selectedDocsList.includes(customDocInput.trim())) {
      setSelectedDocsList([...selectedDocsList, customDocInput.trim()]);
      setCustomDocInput('');
    }
  }

  return (
    <>
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 shadow-lg ${
            feedback.type === 'success'
              ? 'bg-emerald-800 text-white'
              : 'bg-rose-800 text-white'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-white/80 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* ONLY "Select Stage Action Workflow" Screenshot Content */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2 shadow-2xs">
          <label className="block text-xs font-bold text-slate-800">
            Select Stage Action Workflow:
          </label>
          <div className="flex items-center gap-2">
            <select
              defaultValue=""
              onChange={(e) => {
                const action = e.target.value;
                if (action === 'SEND_TO_BANK') {
                  setShowSendToBank(true);
                } else if (action === 'APPROVE_CASE') {
                  setShowApproveModal(true);
                } else if (action === 'DOC_REQUEST') {
                  setRemarkStatus('DOCUMENTS_REQUIRED');
                  setShowRemarkModal(true);
                } else if (action === 'REJECT_CASE') {
                  setShowRejectModal(true);
                } else if (action === 'DISBURSE_LOAN') {
                  setShowDisburseModal(true);
                }
                e.target.value = '';
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="" disabled>-- Select Action --</option>
              {isOpsOrAdmin &&
                application.status !== 'SENT_TO_BANK' &&
                application.status !== 'APPROVED' &&
                application.status !== 'CUSTOMER_ACCEPTED' &&
                application.status !== 'DISBURSED' &&
                application.status !== 'REJECTED' && (
                  <option value="SEND_TO_BANK">🏦 Send Details to Bank</option>
                )}
              {isOpsOrAdmin && application.status === 'SENT_TO_BANK' && (
                <option value="APPROVE_CASE">✓ Approve Case</option>
              )}
              {(isOpsOrAdmin || isRM) && (
                <option value="DOC_REQUEST">📑 Document Request</option>
              )}
              {isOpsOrAdmin && application.status !== 'DISBURSED' && application.status !== 'REJECTED' && (
                <option value="REJECT_CASE">🚫 Case Reject</option>
              )}
              {isOpsOrAdmin && (application.status === 'APPROVED' || application.status === 'CUSTOMER_ACCEPTED') && (
                <option value="DISBURSE_LOAN">💰 Record Final Disbursement</option>
              )}
            </select>
          </div>
          <p className="text-[11px] text-slate-500">
            {application.status === 'SENT_TO_BANK'
              ? 'Choose Approve Case, Document Request, or Case Reject to proceed with this bank submission.'
              : 'Choose from the available stage actions above to update and advance this case.'}
          </p>
        </div>
      </div>

      {/* MODAL 1: SEND TO BANK */}
      {showSendToBank && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Send Details to Bank</h3>
              <button
                type="button"
                onClick={() => setShowSendToBank(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Lending Bank</label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.commissionPct}% base commission)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loan File / Submission Remarks</label>
              <textarea
                value={bankNote}
                onChange={(e) => setBankNote(e.target.value)}
                placeholder="e.g. Sent full KYC, income documents and property title documents via bank portal/email."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSendToBank(false)}
                className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendToBank}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Submitting…' : 'Confirm & Dispatch to Bank'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT REMARK & REQUIRED DOCUMENTS */}
      {showRemarkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Document Request / Operational Query</h3>
              <button
                type="button"
                onClick={() => setShowRemarkModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Dropdown</label>
              <select
                value={remarkStatus}
                onChange={(e) => setRemarkStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="DOCUMENTS_REQUIRED">Documents Required (Opens Upload Window for Partner)</option>
                <option value="DOCUMENTS_IN">Documents In</option>
                <option value="SENT_TO_BANK">Details Sent to Bank</option>
                <option value="APPROVED">Bank Approved</option>
                <option value="CUSTOMER_ACCEPTED">Customer Accepted</option>
                <option value="DISBURSED">Disbursed</option>
                <option value="REJECTED">Bank Rejected</option>
              </select>
            </div>

            {/* If DOCUMENTS_REQUIRED: Render required docs checklist */}
            {remarkStatus === 'DOCUMENTS_REQUIRED' && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-3">
                <span className="text-xs font-bold text-amber-900 block">
                  Select Required Documents from Partner:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {commonDocSuggestions.map((item) => (
                    <label key={item} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDocsList.includes(item)}
                        onChange={() => toggleDocSelection(item)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>

                <div className="pt-2 border-t border-amber-200 flex gap-2">
                  <input
                    type="text"
                    value={customDocInput}
                    onChange={(e) => setCustomDocInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomDoc();
                      }
                    }}
                    placeholder="Other specific doc name..."
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={addCustomDoc}
                    className="px-3 py-1.5 bg-amber-700 text-white text-xs font-bold rounded-lg hover:bg-amber-800 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {selectedDocsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedDocsList.map((doc) => (
                      <span
                        key={doc}
                        className="px-2 py-0.5 bg-white border border-amber-300 text-amber-900 text-[10px] font-semibold rounded-md flex items-center gap-1 shadow-2xs"
                      >
                        {doc}
                        <button
                          type="button"
                          onClick={() => toggleDocSelection(doc)}
                          className="text-amber-700 hover:text-amber-950 font-bold ml-1 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remark / Query Note (Will notify Partner & RM)
              </label>
              <textarea
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="Enter details of bank query, missing papers, or operational updates…"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRemarkModal(false)}
                className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemarkSubmit}
                disabled={loading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Submitting…' : 'Submit & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: APPROVE CASE */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Approve Loan File</h3>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sanctioned Lending Bank</label>
              <select
                value={approveBankId}
                onChange={(e) => setApproveBankId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.commissionPct}% base commission)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sanctioned Amount (₹)</label>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tenure (Months)</label>
              <input
                type="number"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sanction Approval Notes / Terms</label>
              <textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="e.g. Sanction letter issued by HDFC Bank. Processing fee 0.5% + GST."
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveCase}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Approving…' : 'Issue Sanction & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CASE REJECT */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold">
                  🚫
                </span>
                <h3 className="text-base font-bold text-slate-900">Reject Loan Case</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Marking this case as rejected will stop underwriting and notify the channel partner and relationship manager.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Low CIBIL score (<650), insufficient income verification, negative field verification report..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectCase}
                disabled={loading || !rejectReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Rejecting…' : 'Confirm Case Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RECORD FINAL DISBURSEMENT */}
      {showDisburseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Record Final Loan Disbursement</h3>
              <button
                type="button"
                onClick={() => setShowDisburseModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursed Amount (₹)</label>
              <input
                type="number"
                value={disbursedAmount}
                onChange={(e) => setDisbursedAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">UTR / Disbursement Reference Notes</label>
              <textarea
                value={disburseNote}
                onChange={(e) => setDisburseNote(e.target.value)}
                placeholder="e.g. Bank UTR #SBIN202610108849. Loan funds credited to builder/customer account."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDisburseModal(false)}
                className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisburseLoan}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Disbursing…' : 'Record Disbursement & Compute Commission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
