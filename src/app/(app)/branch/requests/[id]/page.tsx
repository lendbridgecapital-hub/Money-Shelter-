import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import {
  getApplicationById,
  listApplicationsForSubDsa,
  listApplicationsForBranch,
  isPuneHqOperationsUser,
} from '@/lib/repos/applicationsRepo';
import { getUserById } from '@/lib/repos/usersRepo';
import { listDocumentsForApplication } from '@/lib/repos/documentsRepo';
import { listStatusHistory } from '@/lib/repos/statusHistoryRepo';
import { listBanks } from '@/lib/repos/banksRepo';
import { listRemarksForApplication, listRequiredDocuments } from '@/lib/repos/workflowRepo';
import { LOAN_TYPE_LABELS, INCOME_TYPE_LABELS, formatCurrencyINR, formatDateTime } from '@/lib/format';
import StatusTracker from '@/components/StatusTracker';
import StatusBadge from '@/components/StatusBadge';
import OperationalWorkflowPanel from '@/components/OperationalWorkflowPanel';
import CaseMatchEligibilityBanner from '@/components/CaseMatchEligibilityBanner';
import CaseTopActionBanners from '@/components/CaseTopActionBanners';
import CaseEditCustomerButton from '@/components/CaseEditCustomerButton';
import { calculateCaseSla } from '@/lib/slaClient';

const CATEGORY_TITLES: Record<string, string> = {
  PAN_CARD: 'PAN Card',
  AADHAAR_CARD: 'Aadhaar Card',
  RESIDENCE_PROOF: 'Residence Proof',
  PHOTO: 'Applicant Photograph',
  SHOP_ACT: 'Shop Act Licence (Both Sides)',
  UDYAM_CERTIFICATE: 'Udyam Registration Certificate',
  GST_CERTIFICATE: 'GST Certificate & Returns',
  INCOME_PROOF: 'Income Proof / ITR',
  BANK_STATEMENT: 'Bank Statements & Financials',
  LOAN_TRACK_RECORD: 'Track Record of Loans (Running Loans / RTR)',
  PROPERTY_PAPERS: 'Property Documents',
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
  } else if (user.role === 'SUB_DSA') {
    const allowed = listApplicationsForSubDsa(user.id, user.tenantId || 'default');
    if (!allowed.some((a) => a.id === application.id)) {
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
    const isOperatingBranchRM =
      Boolean(user.branchId && (application.mappedBranchId === user.branchId || application.branchId === user.branchId));

    if (!isDirectRM && !isAssignedPartnerApp && !isOperatingBranchRM) {
      notFound();
    }
  } else if (user.role === 'OPERATIONS') {
    if (!isPuneHqOperationsUser(user)) {
      const isLendbridgeOrSatara =
        user.email.toLowerCase().includes('lendbridge') ||
        user.email.toLowerCase().includes('satara') ||
        user.name.toLowerCase().includes('lendbridge') ||
        user.name.toLowerCase().includes('satara') ||
        user.branchId === 'br_satara_01';

      const branchToFilter = isLendbridgeOrSatara ? 'br_satara_01' : (user.branchId || null);

      if (branchToFilter) {
        const branchApps = listApplicationsForBranch(branchToFilter, user.tenantId || 'default');
        if (!branchApps.some((a) => a.id === application.id)) {
          notFound();
        }
      } else {
        notFound();
      }
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
    'https://money-shelter.onrender.com';

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
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {application.branchType === 'SITE' ? (
            <>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                <span>🏗️</span>
                <span>Site Project: {application.branchName} (Direct Company Operated)</span>
              </span>
              {application.mappedBranchName && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  <span>🏢</span>
                  <span>Handling Ops Branch: {application.mappedBranchName}</span>
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <span>🏢</span>
              <span>Branch: {application.branchName || 'Head Office'}</span>
            </span>
          )}
          {application.isCoBranded && application.coBrandName && (
            <>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200">
                <span>🤝</span>
                <span>Co-Branded: {application.coBrandName}</span>
              </span>
            </>
          )}
          <span className="text-slate-300">•</span>
          <span className="text-xs text-slate-500">
            Originated by: <strong>{application.channelPartnerName || application.createdByName || 'Channel Partner'}</strong>
          </span>
          {application.relationshipManagerName && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                👤 Dedicated RM: {application.relationshipManagerName}
              </span>
            </>
          )}
        </div>
        {(() => {
          const sla = calculateCaseSla(application);
          return (
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-900">
                {application.fullName || 'Awaiting customer submission'}
              </h1>
              <StatusBadge status={application.status} />
              {/* Live Bucket Timer Badge (Hidden in Disbursed and Rejected/Expired) */}
              {sla.showTimer && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border shadow-xs ${sla.badgeClass}`}
                  title={sla.statusMessage}
                >
                  <span className={`w-2 h-2 rounded-full ${sla.badgeDotClass}`} />
                  <span>⏱️ {sla.elapsedFormatted} in current bucket</span>
                  {sla.standardTatFormatted && (
                    <span className="opacity-80 font-normal">/ TAT: {sla.standardTatFormatted}</span>
                  )}
                  {sla.severity === 'ORANGE' && <span className="ml-1 text-amber-950 font-black">⚠️ TAT Exceeded</span>}
                  {sla.severity === 'RED' && <span className="ml-1 text-white bg-rose-700 px-1.5 py-0.5 rounded font-black animate-pulse">🚨 Admin Warning Alarm</span>}
                </span>
              )}
            </div>
          );
        })()}
      </div>

      {/* SLA Alert Banner for breached cases (Hidden in Disbursed and Rejected/Expired) */}
      {(() => {
        const sla = calculateCaseSla(application);
        if (!sla.showTimer || sla.severity === 'NORMAL') return null;
        return (
          <div
            className={`p-4 rounded-xl border mb-5 flex items-center justify-between gap-3 ${
              sla.severity === 'RED'
                ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-xs'
                : 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{sla.severity === 'RED' ? '🚨' : '⚠️'}</span>
              <div>
                <p className="font-bold text-sm">
                  {sla.severity === 'RED' ? 'Critical SLA Breach (Warning Alarm Triggered)' : 'Standard Turnaround Time (TAT) Exceeded'}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  {sla.statusMessage}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Flowchart Visual Pipeline Tracker */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 overflow-x-auto shadow-xs">
        <StatusTracker status={application.status} />
      </div>

      {/* Match Loan Eligibility Option on Top */}
      <CaseMatchEligibilityBanner
        application={application}
        isOpsOrAdmin={
          user.role === 'OPERATIONS' ||
          user.role === 'ADMIN' ||
          user.role === 'CENTRAL_SUPPORT' ||
          user.role === 'RELATIONSHIP_MANAGER'
        }
      />

      {/* Stage Action Information on Top (e.g. Documents Required checklist & upload, Sanction Acceptance, Customer Offer Link, Disbursed Summary) */}
      <CaseTopActionBanners
        application={application}
        currentUser={user}
        requiredDocs={requiredDocs}
        baseUrl={baseUrl}
      />

      {/* Grid Layout: Displays basic information across buckets per user request */}
      <div className="space-y-6">
        <div className="space-y-6">
          {/* Basic Details */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold text-slate-900">Loan File Overview</h2>
              <CaseEditCustomerButton
                application={application}
                isOpsOrAdmin={user.role === 'OPERATIONS' || user.role === 'ADMIN' || user.role === 'CENTRAL_SUPPORT'}
              />
            </div>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <Field label="Full Name" value={application.fullName} />
              <Field label="Mobile" value={application.mobile} />
              <Field label="Email" value={application.email} />
              {application.panNumber && <Field label="PAN Card Number" value={application.panNumber} />}
              {application.aadhaarNumber && <Field label="Aadhaar Number" value={application.aadhaarNumber} />}
              <Field label="Loan Type" value={application.loanType ? LOAN_TYPE_LABELS[application.loanType] : null} />
              {application.incomeType && (
                <Field
                  label="Customer Income Type"
                  value={INCOME_TYPE_LABELS[application.incomeType] || application.incomeType}
                />
              )}
              {application.propertyPaperType && (
                <Field label="Property Paper Type" value={application.propertyPaperType} />
              )}
              <Field label="Requested Loan Amount" value={application.loanAmount ? formatCurrencyINR(application.loanAmount) : null} />
              {application.monthlyIncome && (
                <Field label="Monthly Net Income" value={formatCurrencyINR(application.monthlyIncome)} />
              )}
              {application.existingEmi !== undefined && application.existingEmi !== null && (
                <Field label="Existing Monthly EMI(s)" value={formatCurrencyINR(application.existingEmi)} />
              )}
              <Field
                label="Location / Desk"
                value={
                  application.branchType === 'SITE'
                    ? `🏗️ ${application.branchName || 'Site Project'} (Direct Company Project)`
                    : `🏢 ${application.branchName || 'Head Office'}`
                }
              />
              <Field
                label="Dedicated Relationship Manager"
                value={application.relationshipManagerName || 'Head Office Direct'}
              />
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

          {/* Uploaded Documents - Hidden under LINK_SHARED as user requested only basic information */}
          {application.status !== 'LINK_SHARED' && (
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
          )}
        </div>
      </div>

      {/* Bottom Navigation & Centered Flowchart Action Controls */}
      <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl shadow-xs active:scale-95 transition shrink-0"
        >
          <svg className="w-4 h-4 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Return to Home Dashboard</span>
        </Link>

        {/* Flowchart Action Controls Centered on the row */}
        {application.status !== 'LINK_SHARED' && (
          <div className="flex-1 w-full md:max-w-md mx-auto flex justify-center">
            <OperationalWorkflowPanel
              application={application}
              currentUser={user}
              banks={banks}
              requiredDocs={requiredDocs}
              remarks={remarks}
              baseUrl={baseUrl}
            />
          </div>
        )}

        <Link
          href="/branch/requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl shadow-2xs active:scale-95 transition shrink-0"
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
