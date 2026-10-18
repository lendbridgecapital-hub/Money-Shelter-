import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApplicationByToken } from '@/lib/repos/applicationsRepo';
import { getBranchById } from '@/lib/repos/branchesRepo';
import { getUserById } from '@/lib/repos/usersRepo';
import { getCompanySettings } from '@/lib/settings';
import { LOAN_TYPE_LABELS, formatCurrencyINR, formatDateTime } from '@/lib/format';
import ExitFormButton from '@/components/ExitFormButton';

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const application = getApplicationByToken(params.token);
  const settings = await getCompanySettings(application?.tenantId || 'default');
  const branch = application?.branchId ? getBranchById(application.branchId) : null;

  const isSatara = Boolean(
    application?.branchId === 'br_satara_01' ||
    branch?.id === 'br_satara_01' ||
    branch?.code === 'STR01' ||
    application?.isCoBranded ||
    branch?.isCoBranded ||
    application?.coBrandName?.toLowerCase().includes('lendbridge') ||
    branch?.name?.toLowerCase().includes('satara')
  );

  if (isSatara) {
    return {
      title: 'Application Submitted Successfully — Lendbridge Capital',
      description: 'Your loan application and KYC documents have been received by Lendbridge Capital (Satara Branch).',
      openGraph: {
        title: 'Application Submitted Successfully — Lendbridge Capital',
        description: 'Your loan application and KYC documents have been received by Lendbridge Capital (Satara Branch).',
        siteName: 'Lendbridge Capital',
        images: [{ url: 'https://money-shelter.onrender.com/lendbridge-logo.png' }],
      },
      icons: [{ rel: 'icon', url: '/lendbridge-logo.png' }],
    };
  }

  return {
    title: `Application Submitted — ${settings.companyName}`,
    description: `Your loan application has been received by ${settings.companyName}.`,
  };
}

export default async function ApplicationSuccessPage({ params }: { params: { token: string } }) {
  const application = getApplicationByToken(params.token);
  if (!application) {
    const defaultSettings = await getCompanySettings('default');
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Application Record Not Found</h1>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            We could not find the application associated with this link. If you already submitted your application, your advisor has received it.
          </p>
          <div className="space-y-3">
            <p className="text-xs text-slate-600 font-semibold">
              Please contact your financial advisor to verify your application status.
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

  const isSatara = Boolean(
    application.branchId === 'br_satara_01' ||
    branch?.id === 'br_satara_01' ||
    branch?.code === 'STR01' ||
    application.isCoBranded ||
    branch?.isCoBranded ||
    application.coBrandName?.toLowerCase().includes('lendbridge') ||
    branch?.name?.toLowerCase().includes('satara')
  );

  const isCoBranded = Boolean(application.isCoBranded || branch?.isCoBranded || isSatara);
  const coBrandName = isSatara ? 'Lendbridge Capital' : (application.coBrandName || branch?.coBrandName || null);
  const coBrandLogoUrl = isSatara ? '/lendbridge-logo.png' : (application.coBrandLogoUrl || branch?.coBrandLogoUrl || null);
  const coBrandTagline = isSatara ? 'Satara Regional Branch' : (application.coBrandTagline || branch?.coBrandTagline || null);

  const advisor = application.channelPartnerId
    ? getUserById(application.channelPartnerId)
    : application.createdById
    ? getUserById(application.createdById)
    : undefined;
  const advisorName = advisor?.name || application.channelPartnerName || application.createdByName || 'Your Financial Advisor';
  const advisorPhone = isSatara ? '+91 9049301089' : (advisor?.phone || branch?.phone || settings.supportPhone);
  const advisorEmail = isSatara ? 'lendbridgecapital@gmail.com' : (advisor?.email || branch?.email || settings.officialEmail);
  const cleanPhone = advisorPhone ? advisorPhone.replace(/[^0-9]/g, '').slice(-10) : '';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 text-center shadow-lg">
        {/* Brand Logo Header */}
        {isSatara ? (
          <div className="flex items-center justify-center gap-2.5 mb-6 pb-4 border-b border-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lendbridge-logo.png" alt="Lendbridge Capital" className="h-9 max-w-[160px] object-contain" />
            <div className="text-left border-l border-slate-200 pl-2.5">
              <p className="font-extrabold text-slate-900 text-xs leading-tight">Lendbridge Capital</p>
              <p className="text-[10px] text-slate-500">Satara Regional Branch</p>
            </div>
          </div>
        ) : isCoBranded && coBrandName ? (
          <div className="flex items-center justify-center gap-3 mb-6 pb-4 border-b border-slate-100">
            {coBrandLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coBrandLogoUrl} alt={coBrandName} className="h-8 max-w-[130px] object-contain" />
            ) : (
              <span className="font-extrabold text-slate-900 text-sm">{coBrandName}</span>
            )}
            <span className="text-slate-300 font-bold text-base">×</span>
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.companyName} className="h-7 max-w-[120px] object-contain" />
            ) : (
              <span className="font-bold text-slate-700 text-xs">{settings.companyName}</span>
            )}
          </div>
        ) : null}

        {/* Success Icon */}
        <div
          className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-white text-4xl shadow-md mb-6"
          style={{ backgroundColor: settings.accentColor }}
        >
          ✓
        </div>

        <span
          className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2"
          style={{ backgroundColor: `${settings.accentColor}18`, color: settings.accentColor }}
        >
          Submission Received
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Thank You, {application.fullName?.split(' ')[0] || 'Applicant'}!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
          Your loan application and KYC documents have been securely submitted to{' '}
          <strong>{isSatara ? 'Lendbridge Capital' : isCoBranded && coBrandName ? `${coBrandName} in partnership with ${settings.companyName}` : settings.companyName}</strong>. A confirmation email has been sent to your registered address.
        </p>

        {/* Prominent Partner Contact & "Please Call Your Financial Advisor" Section */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50/60 border-2 border-emerald-300 rounded-3xl p-5 sm:p-6 text-left shadow-sm mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm shrink-0"
              style={{ backgroundColor: settings.primaryColor }}
            >
              {advisorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                Assigned Financial Advisor
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {advisorName}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isCoBranded && coBrandName
                  ? `${coBrandName} (${branch?.name || 'Branch'}) · In association with Money Shelter`
                  : advisor?.firmName || branch?.name || (settings.companyName ? `${settings.companyName} Loan Desk` : 'Money Shelter Loan Desk')}
                {advisor?.partnerCode ? ` · ID: ${advisor.partnerCode}` : ''}
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-emerald-200/80 shadow-2xs space-y-1">
            <p className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-1.5">
              <span>📞</span>
              <span>Please call your financial advisor</span>
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your financial advisor has been notified of your document submission. Please call them to confirm receipt, evaluate eligible bank rates, and expedite your loan sanction.
            </p>
          </div>

          {/* Action Buttons: Direct Call & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {cleanPhone ? (
              <>
                <a
                  href={`tel:+91${cleanPhone}`}
                  className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-sm"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                  <span>Call Advisor: +91 {cleanPhone}</span>
                </a>

                <a
                  href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                    `Hello ${advisorName}, I have just submitted my loan application form on ${settings.companyName || 'Money Shelter'} (Ref: ${application.token}). Please review and guide me on the next steps.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black text-white bg-teal-600 hover:bg-teal-700 active:scale-95 transition shadow-sm"
                >
                  <span>💬 WhatsApp Advisor</span>
                </a>
              </>
            ) : (
              advisorEmail && (
                <div className="col-span-2 text-xs text-slate-600">
                  <span>Advisor Email: </span>
                  <a href={`mailto:${advisorEmail}`} className="text-blue-600 underline font-semibold">
                    {advisorEmail}
                  </a>
                </div>
              )
            )}
          </div>
        </div>

        {/* Application Summary Box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left text-xs space-y-3 mb-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-slate-400">Application Reference</span>
            <span className="font-mono font-bold text-slate-800">{application.token}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Loan Product</span>
            <span className="font-semibold text-slate-800">
              {application.loanType ? LOAN_TYPE_LABELS[application.loanType] : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Amount Requested</span>
            <span className="font-bold text-slate-900 text-sm">
              {application.loanAmount ? formatCurrencyINR(application.loanAmount) : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Assigned Advisor</span>
            <span className="font-semibold text-slate-800">{advisorName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Assigned Branch</span>
            <span className="font-semibold text-slate-800">{branch?.name || 'Head Office'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Submitted On</span>
            <span className="font-mono font-semibold text-slate-700 text-[11px] flex items-center gap-1">
              <span>🕒</span>
              <span>{formatDateTime(application.submittedAt || application.createdAt)}</span>
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-slate-400">Current Status</span>
            <span
              className="px-2.5 py-0.5 rounded-full font-bold text-[11px]"
              style={{ backgroundColor: `${settings.accentColor}18`, color: settings.accentColor }}
            >
              Document Received & Under Review
            </span>
          </div>
        </div>

        {/* What Happens Next Steps */}
        <div className="text-left mb-6">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Next Steps in the Process:</h3>
          <ol className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                1
              </span>
              <span>Your financial advisor and underwriting team will verify your submitted KYC documents.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                2
              </span>
              <span>Your file is matched with top partner banks offering the lowest interest rates and highest sanction.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                3
              </span>
              <span>Upon bank sanction, your advisor coordinates loan acceptance signing & fast disbursement.</span>
            </li>
          </ol>
        </div>

        {/* Clean Exit Option instead of Home Dashboard */}
        <div className="pt-2 pb-4">
          <ExitFormButton label="Exit Form / Close Tab ✕" variant="outline" />
        </div>

        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
          {isSatara ? (
            <div>
              <p className="font-semibold text-slate-700">© 2026 Lendbridge Capital (Satara Branch). All rights reserved.</p>
              <p className="mt-1 text-slate-500">
                Email: lendbridgecapital@gmail.com · Support: +91 9049301089
              </p>
            </div>
          ) : (
            settings.footerText
          )}
        </div>
      </div>
    </div>
  );
}
