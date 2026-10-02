import Link from 'next/link';
import { getApplicationByToken } from '@/lib/repos/applicationsRepo';
import { getBranchById } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import { listRequiredDocuments } from '@/lib/repos/workflowRepo';
import CustomerApplicationForm from '@/components/CustomerApplicationForm';
import CustomerRequiredDocsUploader from '@/components/CustomerRequiredDocsUploader';
import type { LoanType } from '@/types/db';

export default async function CustomerApplyPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { loanType?: string };
}) {
  const application = getApplicationByToken(params.token);
  if (!application) {
    const defaultSettings = await getCompanySettings('default');
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg">
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl shadow-md mb-5"
            style={{ backgroundColor: defaultSettings.primaryColor }}
          >
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Application Link Not Found or Expired</h1>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            The link you accessed may have expired, or the unique security token might be incomplete. Please check the link shared by your advisor or ask them to generate a fresh link.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 text-left space-y-1.5 mb-6">
            <p>
              <strong>Portal:</strong> {defaultSettings.companyName}
            </p>
            {defaultSettings.officialEmail && (
              <p>
                <strong>Support Email:</strong>{' '}
                <a href={`mailto:${defaultSettings.officialEmail}`} className="text-blue-600 hover:underline">
                  {defaultSettings.officialEmail}
                </a>
              </p>
            )}
            {defaultSettings.supportPhone && (
              <p>
                <strong>Support Phone:</strong>{' '}
                <a href={`tel:${defaultSettings.supportPhone}`} className="text-blue-600 hover:underline">
                  {defaultSettings.supportPhone}
                </a>
              </p>
            )}
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl text-xs font-semibold text-white transition shadow-sm hover:opacity-95"
            style={{ backgroundColor: defaultSettings.primaryColor }}
          >
            Go to {defaultSettings.companyName} Home Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const settings = await getCompanySettings(application.tenantId || 'default');
  const branch = getBranchById(application.branchId);

  // If status is DOCUMENTS_REQUIRED: Render the dedicated document upload checklist
  if (application.status === 'DOCUMENTS_REQUIRED') {
    const requiredDocs = listRequiredDocuments(application.id);
    return (
      <div className="min-h-screen bg-slate-50/70 pb-16">
        {/* Safe Area Aware Header with Home & Exit Navigation */}
        <header
          className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)' }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition shadow-xs"
                title="Return to Home Dashboard"
              >
                <svg className="w-3.5 h-3.5 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Home</span>
              </Link>
              {settings.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logoUrl} alt={settings.companyName} className="h-8 max-w-[130px] object-contain" />
              ) : (
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  {settings.companyName.charAt(0)}
                </div>
              )}
              <span className="font-bold text-slate-900 text-sm hidden sm:inline">
                {settings.companyName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/branch/requests/${application.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition border border-slate-200"
              >
                <span>Exit Preview ✕</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
          <CustomerRequiredDocsUploader
            token={params.token}
            application={application}
            requiredDocs={requiredDocs}
            settings={settings}
            branch={branch}
          />
        </main>

        <footer className="max-w-4xl mx-auto px-4 sm:px-6 mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
          <p className="font-medium text-slate-500">{settings.footerText}</p>
        </footer>
      </div>
    );
  }

  // If already submitted and not DOCUMENTS_REQUIRED, inform gracefully with Home button
  if (application.status !== 'LINK_SHARED') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg">
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl shadow-md mb-5"
            style={{ backgroundColor: settings.accentColor }}
          >
            ✓
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Application Already Submitted</h1>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            Your application and KYC documents have already been received and are currently under verification with your designated advisor{' '}
            <strong>{application.channelPartnerName || application.createdByName || 'Loan Consultant'}</strong>. This single-use link has expired.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 text-left space-y-1.5 mb-6">
            <p>
              <strong>Applicant:</strong> {application.fullName || 'Registered Applicant'}
            </p>
            <p>
              <strong>Assigned Advisor:</strong> {application.channelPartnerName || application.createdByName || 'Direct Desk'}
            </p>
            {branch?.name && (
              <p>
                <strong>Branch:</strong> {branch.name}
              </p>
            )}
            {branch?.phone && (
              <p>
                <strong>Contact:</strong> {branch.phone}
              </p>
            )}
            {branch?.email && (
              <p>
                <strong>Email:</strong> {branch.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl text-xs font-bold text-white transition shadow-sm bg-emerald-600 hover:bg-emerald-700"
            >
              Return to Home Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Brand Header with Safe Area and Home Navigation */}
      <header
        className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Direct Home Navigation for Previews */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition shadow-xs"
              title="Return to Home Dashboard"
            >
              <svg className="w-3.5 h-3.5 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Home</span>
            </Link>

            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.companyName} className="h-8 max-w-[130px] object-contain" />
            ) : (
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                style={{ backgroundColor: settings.primaryColor }}
              >
                {settings.companyName.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                {settings.companyName}
              </h1>
              <p className="text-[11px] text-slate-400">
                {branch ? `${branch.name} Branch` : 'Digital Loan Origination Desk'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition border border-slate-200"
            >
              <span>Exit Preview ✕</span>
            </Link>
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <span>🔒</span>
              <span>256-Bit SSL Encrypted</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-white border-b border-slate-200/60 py-8 mb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <span
            className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2"
            style={{ backgroundColor: `${settings.primaryColor}15`, color: settings.primaryColor }}
          >
            Digital Loan Origination
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Apply for Your Loan in Minutes
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Please fill in your primary details and upload the requested KYC and income documents. Our lending team will
            process your file with partner banks.
          </p>
        </div>
      </div>

      {/* Main Customer Form */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6">
        <CustomerApplicationForm
          token={params.token}
          settings={settings}
          branch={branch}
          initialLoanType={searchParams?.loanType as LoanType | undefined}
        />
      </main>

      {/* Branded Footer */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
        <p className="font-medium text-slate-500">{settings.footerText}</p>
        <p className="mt-1">
          {settings.officialEmail && <span>Email: {settings.officialEmail} · </span>}
          {settings.supportPhone && <span>Support: {settings.supportPhone}</span>}
        </p>
      </footer>
    </div>
  );
}
