import { notFound } from 'next/navigation';
import { getApplicationByToken } from '@/lib/repos/applicationsRepo';
import { getBranchById } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import CustomerApplicationForm from '@/components/CustomerApplicationForm';

export default async function CustomerApplyPage({ params }: { params: { token: string } }) {
  const application = getApplicationByToken(params.token);
  if (!application) notFound();

  const settings = await getCompanySettings(application.tenantId || 'default');
  const branch = getBranchById(application.branchId);

  // If already submitted, inform the applicant gracefully
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

          <p className="text-[11px] text-slate-400">
            Need to update details or upload additional documents? Please contact your loan relationship executive.
          </p>
        </div>
      </div>
    );
  }

  const advisorName = application.channelPartnerName || application.createdByName || 'Loan Origination Desk';

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Brand Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.companyName} className="h-9 max-w-[140px] object-contain" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                style={{ backgroundColor: settings.primaryColor }}
              >
                {settings.companyName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                {settings.companyName}
              </h1>
              <p className="text-[11px] text-slate-400">
                {branch ? `${branch.name} Branch` : 'Digital Loan Origination Desk'}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <span>🔒</span>
            <span>256-Bit SSL Encrypted</span>
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
        <CustomerApplicationForm token={params.token} settings={settings} branch={branch} />
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
