import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getApplicationById } from '@/lib/repos/applicationsRepo';
import { getUserById } from '@/lib/repos/usersRepo';
import { listDocumentsForApplication } from '@/lib/repos/documentsRepo';
import { listStatusHistory } from '@/lib/repos/statusHistoryRepo';
import { listBanks } from '@/lib/repos/banksRepo';
import { listRemarksForApplication, listRequiredDocuments } from '@/lib/repos/workflowRepo';
import { LOAN_TYPE_LABELS, formatCurrencyINR, formatDateTime } from '@/lib/format';
import StatusTracker from '@/components/StatusTracker';
import StatusBadge from '@/components/StatusBadge';
import OperationalWorkflowPanel from '@/components/OperationalWorkflowPanel';

const CATEGORY_TITLES: Record<string, string> = {
  PAN_CARD: 'PAN Card',
  AADHAAR_CARD: 'Aadhaar Card',
  RESIDENCE_PROOF: 'Residence Proof',
  INCOME_PROOF: 'Income Proof',
  BANK_STATEMENT: 'Bank Statements & Financials',
  ADDITIONAL_REQUIRED: 'Operational Additional Documents',
  ACCEPTANCE_LETTER: 'Sanction Acceptance Letter',
  OTHER: 'Other',
};

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const application = getApplicationById(params.id);
  if (!application) notFound();

  // Role-based visibility
  if (user.role === 'CHANNEL_PARTNER') {
    if (application.channelPartnerId !== user.id && application.createdById !== user.id) {
      notFound();
    }
  } else if (user.role === 'RELATIONSHIP_MANAGER') {
    const isDirectRM = application.relationshipManagerId === user.id || application.createdById === user.id;
    let isAssignedPartnerApp = false;
    if (application.channelPartnerId) {
      const partner = getUserById(application.channelPartnerId);
      if (partner && partner.assignedRmId === user.id) {
        isAssignedPartnerApp = true;
      }
    } else if (application.createdById) {
      const creator = getUserById(application.createdById);
      if (creator && creator.assignedRmId === user.id) {
        isAssignedPartnerApp = true;
      }
    }
    if (!isDirectRM && !isAssignedPartnerApp) {
      notFound();
    }
  }

  const documents = listDocumentsForApplication(application.id);
  const history = listStatusHistory(application.id);
  const banks = listBanks(application.tenantId || 'default');
  const requiredDocs = listRequiredDocuments(application.id);
  const remarks = listRemarksForApplication(application.id);
  const baseUrl =
    process.env.APP_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost') ? process.env.NEXTAUTH_URL : '') ||
    'https://quicfinsure.onrender.com';

  const docsByCategory = documents.reduce<Record<string, typeof documents>>((acc, doc) => {
    (acc[doc.category] ||= []).push(doc);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition"
          >
            <svg className="w-3.5 h-3.5 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home Dashboard</span>
          </Link>
          <Link
            href="/branch/requests"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-2xs active:scale-95 transition"
          >
            <svg className="w-3.5 h-3.5 stroke-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span>All Cases</span>
          </Link>
        </div>
        <p className="text-xs text-slate-400 mb-1">
          {application.branchName || 'Branch'} · Originated by {application.channelPartnerName || application.createdByName || 'Channel Partner'}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-slate-900">
            {application.fullName || 'Awaiting customer submission'}
          </h1>
          <StatusBadge status={application.status} />
        </div>
      </div>

      {/* Flowchart Visual Pipeline Tracker */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 overflow-x-auto shadow-xs">
        <StatusTracker status={application.status} />
      </div>

      {/* Main Flowchart Actions & Modals */}
      <OperationalWorkflowPanel
        application={application}
        currentUser={user}
        banks={banks}
        requiredDocs={requiredDocs}
        remarks={remarks}
        baseUrl={baseUrl}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h2 className="font-semibold text-slate-900 mb-4">Loan File Overview</h2>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <Field label="Full Name" value={application.fullName} />
              <Field label="Mobile" value={application.mobile} />
              <Field label="Email" value={application.email} />
              <Field label="Loan Type" value={application.loanType ? LOAN_TYPE_LABELS[application.loanType] : null} />
              <Field label="Requested Loan Amount" value={application.loanAmount ? formatCurrencyINR(application.loanAmount) : null} />
              <Field label="Submitted On" value={application.submittedAt ? formatDateTime(application.submittedAt) : null} />
              <Field label="Channel Partner" value={application.channelPartnerName || application.createdByName} />
              <Field label="Lending Bank" value={application.bankName} />
              {application.approvedAmount && (
                <Field label="Sanctioned Amount" value={formatCurrencyINR(application.approvedAmount)} />
              )}
              {application.interestRate && (
                <Field label="Interest Rate" value={`${application.interestRate}% p.a.`} />
              )}
              {application.acceptanceLetterRef && (
                <Field label="Sanction Acceptance Ref" value={application.acceptanceLetterRef} />
              )}
              {application.disbursedAmount && (
                <Field label="Final Disbursed Amount" value={formatCurrencyINR(application.disbursedAmount)} />
              )}
            </dl>
          </section>

          {/* Uploaded Documents */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Applicant Documents</h2>
              <span className="text-xs text-slate-400 font-medium">{documents.length} files attached</span>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-400">No documents uploaded yet — waiting on customer to complete the KYC form.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(docsByCategory).map(([category, docs]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      {CATEGORY_TITLES[category] || category}
                    </p>
                    <ul className="space-y-1.5">
                      {docs.map((doc) => (
                        <li key={doc.id} className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-sm font-medium text-slate-800">
                            {doc.label} <span className="text-xs text-slate-400">({doc.fileName})</span>
                          </span>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
                          >
                            Download ⤓
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Status & Activity History */}
        <div>
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h2 className="font-semibold text-slate-900 mb-4">Lifecycle Audit History</h2>
            <ul className="space-y-3.5">
              {history.map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={h.status} />
                      <span className="text-[11px] text-slate-400">{formatDateTime(h.changedAt)}</span>
                    </div>
                    {h.note && <p className="text-slate-700 mt-1 leading-snug">{h.note}</p>}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      By: {h.changedByName || 'System / Customer'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Bottom Navigation Helper for Mobile */}
      <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl shadow-xs active:scale-95 transition"
        >
          <svg className="w-4 h-4 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Return to Home Dashboard</span>
        </Link>
        <Link
          href="/branch/requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl shadow-2xs active:scale-95 transition"
        >
          <span>All Cases</span>
          <svg className="w-3.5 h-3.5 stroke-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-800 font-medium mt-0.5">{value || '—'}</dd>
    </div>
  );
}
