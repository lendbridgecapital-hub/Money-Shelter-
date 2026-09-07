import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getApplicationById } from '@/lib/repos/applicationsRepo';
import { listDocumentsForApplication } from '@/lib/repos/documentsRepo';
import { listStatusHistory } from '@/lib/repos/statusHistoryRepo';
import { LOAN_TYPE_LABELS, formatCurrencyINR, formatDateTime } from '@/lib/format';
import StatusTracker from '@/components/StatusTracker';
import StatusBadge from '@/components/StatusBadge';
import StatusUpdateForm from '@/components/StatusUpdateForm';

const CATEGORY_TITLES: Record<string, string> = {
  PAN_CARD: 'PAN Card',
  AADHAAR_CARD: 'Aadhaar Card',
  RESIDENCE_PROOF: 'Residence Proof',
  INCOME_PROOF: 'Income Proof',
  BANK_STATEMENT: 'Bank Statements & Financials',
  OTHER: 'Other',
};

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const application = getApplicationById(params.id);
  if (!application) notFound();
  if (user.role !== 'ADMIN' && application.branchId !== user.branchId) notFound();

  const documents = listDocumentsForApplication(application.id);
  const history = listStatusHistory(application.id);

  const docsByCategory = documents.reduce<Record<string, typeof documents>>((acc, doc) => {
    (acc[doc.category] ||= []).push(doc);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-slate-400 mb-1">{application.branchName} · Created by {application.createdByName}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-slate-900">{application.fullName || 'Awaiting customer submission'}</h1>
          <StatusBadge status={application.status} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 overflow-x-auto">
        <StatusTracker status={application.status} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Basic Details</h2>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <Field label="Full Name" value={application.fullName} />
              <Field label="Mobile" value={application.mobile} />
              <Field label="Email" value={application.email} />
              <Field label="Loan Type" value={application.loanType ? LOAN_TYPE_LABELS[application.loanType] : null} />
              <Field label="Loan Amount Required" value={application.loanAmount ? formatCurrencyINR(application.loanAmount) : null} />
              <Field label="Submitted On" value={application.submittedAt ? formatDateTime(application.submittedAt) : null} />
            </dl>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Documents</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-400">No documents uploaded yet — waiting on the customer to submit.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(docsByCategory).map(([category, docs]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{CATEGORY_TITLES[category] || category}</p>
                    <ul className="space-y-1.5">
                      {docs.map((doc) => (
                        <li key={doc.id}>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-primary text-sm font-medium hover:underline"
                          >
                            {doc.label} — {doc.fileName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Status History</h2>
            <ul className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
                  <div>
                    <p className="text-slate-800">
                      <StatusBadge status={h.status} /> {h.note && <span className="text-slate-500 ml-1">— {h.note}</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDateTime(h.changedAt)} {h.changedByName ? `· ${h.changedByName}` : '· Customer'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div>
          <StatusUpdateForm applicationId={application.id} currentStatus={application.status} />
        </div>
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
