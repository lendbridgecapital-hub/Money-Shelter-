import Link from 'next/link';
import { getApplicationByToken } from '@/lib/repos/applicationsRepo';
import { getBranchById } from '@/lib/repos/branchesRepo';
import { getUserById } from '@/lib/repos/usersRepo';
import { getCompanySettings } from '@/lib/settings';
import { listRequiredDocuments } from '@/lib/repos/workflowRepo';
import CustomerApplicationForm from '@/components/CustomerApplicationForm';
import CustomerRequiredDocsUploader from '@/components/CustomerRequiredDocsUploader';
import ExitFormButton from '@/components/ExitFormButton';
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

          <div className="space-y-3">
            <p className="text-xs text-slate-600 font-semibold">
              Please contact your financial advisor to receive a valid application link.
            </p>
            {defaultSettings.supportPhone && (
              <a
                href={`tel:${defaultSettings.supportPhone}`}
                className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl text-xs font-bold text-white transition shadow-sm bg-emerald-600 hover:bg-emerald-700"
              >
                📞 Call Support: {defaultSettings.supportPhone}
              </a>
            )}
            <ExitFormButton label="Exit Form / Close Tab ✕" variant="outline" />
          </div>
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
        {/* Safe Area Aware Header with Clean Exit Navigation */}
        <header
          className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)' }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
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
              <ExitFormButton label="Exit Form ✕" variant="header" />
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

  // If already submitted and not DOCUMENTS_REQUIRED, inform gracefully
  if (application.status !== 'LINK_SHARED') {
    const advisor = application.channelPartnerId
      ? getUserById(application.channelPartnerId)
      : application.createdById
      ? getUserById(application.createdById)
      : undefined;
    const advisorName = advisor?.name || application.channelPartnerName || application.createdByName || 'Your Financial Advisor';
    const advisorPhone = advisor?.phone || branch?.phone || settings.supportPhone;
    const cleanPhone = advisorPhone ? advisorPhone.replace(/[^0-9]/g, '').slice(-10) : '';

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
            <strong>{advisorName}</strong>.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 text-left space-y-1.5 mb-5">
            <p>
              <strong>Applicant:</strong> {application.fullName || 'Registered Applicant'}
            </p>
            <p>
              <strong>Assigned Advisor:</strong> {advisorName}
            </p>
            {advisor?.firmName && (
              <p>
                <strong>Firm / Desk:</strong> {advisor.firmName}
              </p>
            )}
            {branch?.name && (
              <p>
                <strong>Branch:</strong> {branch.name}
              </p>
            )}
            {advisorPhone && (
              <p>
                <strong>Contact Phone:</strong> {advisorPhone}
              </p>
            )}
            {advisor?.email && (
              <p>
                <strong>Email:</strong> {advisor.email}
              </p>
            )}
          </div>

          {/* Please Call Your Financial Advisor Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left space-y-2.5 mb-5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
              <span>📞</span>
              <span>Please call your financial advisor</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Please contact your advisor directly to track your document verification and loan sanction status.
            </p>
            {cleanPhone && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <a
                  href={`tel:+91${cleanPhone}`}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-xs"
                >
                  <span>📞 Call: +91 {cleanPhone}</span>
                </a>
                <a
                  href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                    `Hello ${advisorName}, I have submitted my loan application (Ref: ${application.token}). Please share the status.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 transition shadow-xs"
                >
                  <span>💬 WhatsApp</span>
                </a>
              </div>
            )}
          </div>

          <ExitFormButton label="Exit Form / Close Tab ✕" variant="outline" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Brand Header with Safe Area and Clean Exit Navigation */}
      <header
        className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <div>
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                {settings.companyName}
              </h1>
              <p className="text-[11px] text-slate-500">
                {branch
                  ? branch.type === 'SITE'
                    ? `🏗️ ${branch.name} — Direct Project Desk`
                    : `${branch.name} Branch`
                  : 'Digital Loan Origination Desk'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExitFormButton label="Exit Form ✕" variant="header" />
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
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${settings.primaryColor}15`, color: settings.primaryColor }}
            >
              Digital Loan Origination
            </span>
            {branch?.type === 'SITE' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                <span>🏗️</span>
                <span>{branch.name} — Direct Project</span>
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Apply for Your Loan in Minutes
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            {branch?.type === 'SITE'
              ? `Submit your loan documents directly for ${branch.name}. All information will be securely reviewed by our dedicated project desk.`
              : 'Submit your loan requirements and KYC documents in our encrypted portal. Fast approval with top lending banks.'}
          </p>

          {branch?.type === 'SITE' && (
            <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/40 border border-amber-200 rounded-2xl flex items-center gap-3 max-w-2xl">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-2xs">
                🏗️
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950">
                  Direct Company Operated Construction Project
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Project: <strong>{branch.name}</strong>
                  {branch.developerName ? ` (${branch.developerName})` : ''}
                  {branch.dedicatedRmName ? ` • Dedicated RM: ${branch.dedicatedRmName}` : ''}
                </p>
              </div>
            </div>
          )}
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
