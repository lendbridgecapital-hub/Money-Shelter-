import type { Metadata } from 'next';
import Link from 'next/link';
import { getApplicationByToken, getApplicationByTokenAsync, updateApplicationStatus } from '@/lib/repos/applicationsRepo';
import { getBranchById } from '@/lib/repos/branchesRepo';
import { getUserById } from '@/lib/repos/usersRepo';
import { getCompanySettings } from '@/lib/settings';
import { listRequiredDocuments } from '@/lib/repos/workflowRepo';
import CustomerApplicationForm from '@/components/CustomerApplicationForm';
import CustomerRequiredDocsUploader from '@/components/CustomerRequiredDocsUploader';
import ExitFormButton from '@/components/ExitFormButton';
import type { LoanType, IncomeType } from '@/types/db';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { branch?: string; loanType?: string; incomeType?: string };
}): Promise<Metadata> {
  const application = await getApplicationByTokenAsync(params.token);
  const settings = await getCompanySettings(application?.tenantId || 'default');
  const branch = application?.branchId
    ? getBranchById(application.branchId)
    : (searchParams?.branch ? getBranchById(searchParams.branch) : null);

  const advisor = application?.channelPartnerId
    ? getUserById(application.channelPartnerId)
    : application?.createdById
    ? getUserById(application.createdById)
    : null;

  const isSatara = Boolean(
    searchParams?.branch === 'br_satara_01' ||
    searchParams?.branch === 'STR01' ||
    searchParams?.branch?.toLowerCase().includes('satara') ||
    searchParams?.branch?.toLowerCase().includes('lendbridge') ||
    application?.branchId === 'br_satara_01' ||
    application?.branchId === 'STR01' ||
    branch?.id === 'br_satara_01' ||
    branch?.code === 'STR01' ||
    branch?.name?.toLowerCase().includes('satara') ||
    application?.isCoBranded ||
    branch?.isCoBranded ||
    application?.coBrandName?.toLowerCase().includes('lendbridge') ||
    branch?.coBrandName?.toLowerCase().includes('lendbridge') ||
    advisor?.email?.toLowerCase().includes('lendbridge') ||
    advisor?.email === 'kanase.hrishi@gmail.com' ||
    advisor?.phone?.includes('9049301089') ||
    advisor?.branchId === 'br_satara_01' ||
    advisor?.partnerCode?.startsWith('LBC-STR')
  );

  if (isSatara) {
    const brandTitle = 'Lendbridge Capital — Customer Document Desk';
    const brandDesc = 'WHERE BORROWING MEETS TRUST • Upload and submit your loan KYC documents securely through Lendbridge Capital (Satara Branch).';
    const logoUrl = 'https://money-shelter.vercel.app/lendbridge-logo.png';

    return {
      title: brandTitle,
      description: brandDesc,
      openGraph: {
        title: brandTitle,
        description: brandDesc,
        url: `https://money-shelter.vercel.app/apply/${params.token}`,
        siteName: 'Lendbridge Capital',
        images: [
          {
            url: logoUrl,
            width: 800,
            height: 400,
            alt: 'Lendbridge Capital Logo',
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: brandTitle,
        description: brandDesc,
        images: [logoUrl],
      },
      icons: [{ rel: 'icon', url: '/lendbridge-logo.png' }],
    };
  }

  const title = settings.portalTitle || `${settings.companyName} — Where Money Meets Trust`;
  const desc = settings.tagline || 'WHERE MONEY MEETS TRUST';
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      siteName: settings.companyName,
      images: settings.logoUrl ? [{ url: settings.logoUrl }] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description: desc,
    },
    icons: settings.faviconUrl ? [{ rel: 'icon', url: settings.faviconUrl }] : undefined,
  };
}

export default async function CustomerApplyPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { loanType?: string; incomeType?: string; branch?: string };
}) {
  const application = await getApplicationByTokenAsync(params.token);
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
  const branch = application.branchId
    ? getBranchById(application.branchId)
    : (searchParams?.branch ? getBranchById(searchParams.branch) : null);

  const advisor = application.channelPartnerId
    ? getUserById(application.channelPartnerId)
    : application.createdById
    ? getUserById(application.createdById)
    : undefined;

  const isSatara = Boolean(
    searchParams?.branch === 'br_satara_01' ||
    searchParams?.branch === 'STR01' ||
    searchParams?.branch?.toLowerCase().includes('satara') ||
    searchParams?.branch?.toLowerCase().includes('lendbridge') ||
    application.branchId === 'br_satara_01' ||
    application.branchId === 'STR01' ||
    branch?.id === 'br_satara_01' ||
    branch?.code === 'STR01' ||
    branch?.name?.toLowerCase().includes('satara') ||
    application.isCoBranded ||
    branch?.isCoBranded ||
    application.coBrandName?.toLowerCase().includes('lendbridge') ||
    branch?.coBrandName?.toLowerCase().includes('lendbridge') ||
    advisor?.email?.toLowerCase().includes('lendbridge') ||
    advisor?.email === 'kanase.hrishi@gmail.com' ||
    advisor?.phone?.includes('9049301089') ||
    advisor?.branchId === 'br_satara_01' ||
    advisor?.partnerCode?.startsWith('LBC-STR')
  );

  const isCoBranded = Boolean(application.isCoBranded || branch?.isCoBranded || isSatara);
  const coBrandName = isSatara ? 'Lendbridge Capital' : (application.coBrandName || branch?.coBrandName || null);
  const coBrandLogoUrl = isSatara ? '/lendbridge-logo.png' : (application.coBrandLogoUrl || branch?.coBrandLogoUrl || null);
  const coBrandTagline = isSatara ? 'Satara Regional Branch • Customer Document Portal' : (application.coBrandTagline || branch?.coBrandTagline || null);

  // Check 7-Day Auto-Expiry or FAILED bucket status
  const nowMs = Date.now();
  const createdDate = application.createdAt ? new Date(application.createdAt) : null;
  const createdMs = createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate.getTime() : nowMs;
  const isUnderSevenDays = createdMs > 1000000000000 && (nowMs - createdMs) < 7 * 24 * 60 * 60 * 1000;

  // Auto-heal: If an application was recently created (within 7 days) but was mistakenly marked FAILED, recover it to LINK_SHARED
  if (application.status === 'FAILED' && isUnderSevenDays) {
    try {
      updateApplicationStatus(application.id, 'LINK_SHARED');
      application.status = 'LINK_SHARED';
    } catch {}
  }

  const isSevenDaysExpired = application.status === 'LINK_SHARED' && createdMs > 1000000000000 && (nowMs - createdMs) >= 7 * 24 * 60 * 60 * 1000;
  const isFailed = application.status === 'FAILED' || isSevenDaysExpired;

  if (isFailed) {
    if (application.status === 'LINK_SHARED') {
      try {
        updateApplicationStatus(application.id, 'FAILED');
      } catch {}
    }

    const advisor = application.channelPartnerId
      ? getUserById(application.channelPartnerId)
      : application.createdById
      ? getUserById(application.createdById)
      : undefined;
    const advisorName = advisor?.name || application.channelPartnerName || application.createdByName || 'Your Financial Advisor';
    const advisorPhone = isSatara ? '+91 9049301089' : (advisor?.phone || branch?.phone || settings.supportPhone);
    const cleanPhone = advisorPhone ? advisorPhone.replace(/[^0-9]/g, '').slice(-10) : '';

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl shadow-md mb-5 bg-rose-600">
            ⏳
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Application Link Expired</h1>
          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            This loan application link has expired after 7 days of inactivity. The case has been closed and moved to the Failed bucket.
          </p>

          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 text-left space-y-1.5 mb-6">
            <p><strong>Bucket:</strong> Failed / Expired</p>
            <p><strong>Expiry Reason:</strong> 7 days validity window exceeded</p>
            <p><strong>Assigned Advisor:</strong> {advisorName}</p>
            {branch?.name && <p><strong>Branch:</strong> {isSatara ? 'Lendbridge Capital — Satara Branch' : branch.name}</p>}
          </div>

          <p className="text-xs text-slate-600 font-semibold mb-4">
            Please ask your advisor to generate a new application link to apply for your loan.
          </p>
          {cleanPhone && (
            <a
              href={`tel:+91${cleanPhone}`}
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl text-xs font-bold text-white transition shadow-sm bg-emerald-600 hover:bg-emerald-700 mb-3"
            >
              📞 Call Advisor: +91 {cleanPhone}
            </a>
          )}
          <ExitFormButton label="Exit Form / Close Tab ✕" variant="outline" />
        </div>
      </div>
    );
  }

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
              {isSatara || (coBrandName && coBrandName.toLowerCase().includes('lendbridge')) ? (
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/lendbridge-logo.png"
                    alt="Lendbridge Capital"
                    className="h-8 sm:h-9 max-w-[150px] object-contain"
                  />
                  <div className="hidden sm:block border-l border-slate-200 pl-3">
                    <p className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight">Lendbridge Capital</p>
                    <p className="text-[10px] text-slate-500 font-medium">Satara Regional Branch</p>
                  </div>
                </div>
              ) : isCoBranded && coBrandName ? (
                <div className="flex items-center gap-2 sm:gap-2.5">
                  {coBrandLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coBrandLogoUrl} alt={coBrandName} className="h-7 sm:h-8 max-w-[120px] object-contain" />
                  ) : (
                    <div className="px-2 py-1 rounded-lg bg-emerald-900 text-white font-extrabold text-[11px] tracking-wide">
                      {coBrandName}
                    </div>
                  )}
                  <span className="text-slate-300 font-bold text-sm sm:text-base select-none">×</span>
                  {settings.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.logoUrl} alt={settings.companyName} className="h-6 sm:h-7 max-w-[110px] object-contain" />
                  ) : (
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{settings.companyName}</span>
                  )}
                </div>
              ) : settings.logoUrl ? (
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
              {!isCoBranded && !isSatara && (
                <span className="font-bold text-slate-900 text-sm hidden sm:inline">
                  {settings.companyName}
                </span>
              )}
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

        {isSatara ? (
          <footer className="max-w-4xl mx-auto px-4 sm:px-6 mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-500">
            <p className="font-semibold text-slate-700">© 2026 Lendbridge Capital (Satara Branch). All rights reserved.</p>
            <p className="mt-1.5 text-slate-500">
              <span>Email: <a href="mailto:lendbridgecapital@gmail.com" className="text-emerald-700 font-medium hover:underline">lendbridgecapital@gmail.com</a> · </span>
              <span>Support: <a href="tel:9049301089" className="text-emerald-700 font-medium hover:underline">+91 9049301089</a></span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Powai Naka, Satara, Maharashtra - 415001</p>
          </footer>
        ) : (
          <footer className="max-w-4xl mx-auto px-4 sm:px-6 mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
            <p className="font-medium text-slate-500">{settings.footerText}</p>
          </footer>
        )}
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
            {isSatara || (coBrandName && coBrandName.toLowerCase().includes('lendbridge')) ? (
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/lendbridge-logo.png"
                  alt="Lendbridge Capital"
                  className="h-8 sm:h-9 max-w-[150px] object-contain"
                />
                <div>
                  <h1 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight">
                    Lendbridge Capital
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Satara Regional Branch • Customer Document Portal
                  </p>
                </div>
              </div>
            ) : isCoBranded && coBrandName ? (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {coBrandLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coBrandLogoUrl} alt={coBrandName} className="h-7 sm:h-8 max-w-[120px] object-contain" />
                ) : (
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-900 text-white font-extrabold text-xs tracking-wide">
                    {coBrandName}
                  </div>
                )}
                <span className="text-slate-300 font-bold text-sm sm:text-base select-none">×</span>
                {settings.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.logoUrl} alt={settings.companyName} className="h-6 sm:h-7 max-w-[110px] object-contain" />
                ) : (
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">{settings.companyName}</span>
                )}
              </div>
            ) : settings.logoUrl ? (
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
            {!isSatara && (
              <div>
                <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  {isCoBranded && coBrandName ? (
                    <span>
                      {coBrandName}{' '}
                      <span className="text-slate-400 font-normal text-xs">({branch?.name || 'Branch'})</span>
                    </span>
                  ) : (
                    settings.companyName
                  )}
                </h1>
                <p className="text-[11px] text-slate-500">
                  {isCoBranded
                    ? coBrandTagline || `In partnership with ${settings.companyName}`
                    : branch
                    ? branch.type === 'SITE'
                      ? `🏗️ ${branch.name} — Direct Project Desk`
                      : `${branch.name} Branch`
                    : 'Digital Loan Origination Desk'}
                </p>
              </div>
            )}
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
              style={{ backgroundColor: `${isSatara ? '#059669' : settings.primaryColor}15`, color: isSatara ? '#059669' : settings.primaryColor }}
            >
              Digital Loan Origination
            </span>
            {isSatara ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                <span>🏢</span>
                <span>Lendbridge Capital — Satara Branch</span>
              </span>
            ) : isCoBranded && coBrandName ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                <span>🤝</span>
                <span>{coBrandName} Co-Branded Portal</span>
              </span>
            ) : null}
            {branch?.type === 'SITE' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                <span>🏗️</span>
                <span>{branch.name} — Direct Project</span>
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isSatara ? 'Apply for Your Loan with Lendbridge Capital' : 'Apply for Your Loan in Minutes'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            {isSatara
              ? 'Submit your loan requirements and KYC documents securely through Lendbridge Capital (Satara Branch). Instant pre-eligibility with 40+ premier lending institutions.'
              : isCoBranded && coBrandName
              ? `Submit your loan requirements through ${coBrandName} in strategic partnership with ${settings.companyName}. Instant pre-eligibility with 40+ premier lending institutions.`
              : branch?.type === 'SITE'
              ? `Submit your loan documents directly for ${branch.name}. All information will be securely reviewed by our dedicated project desk.`
              : 'Submit your loan requirements and KYC documents in our encrypted portal. Fast approval with top lending banks.'}
          </p>

          {isSatara ? (
            <div className="mt-4 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 border border-emerald-200 rounded-2xl flex items-center gap-3 max-w-2xl shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-base shadow-2xs">
                🏢
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Lendbridge Capital • Satara Branch
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Powai Naka, Satara, Maharashtra - 415001 • Direct loan origination facility backed by 40+ premier banks & NBFCs with fast end-to-end processing.
                </p>
              </div>
            </div>
          ) : isCoBranded && coBrandName ? (
            <div className="mt-4 p-3.5 bg-gradient-to-r from-purple-50 via-emerald-50/50 to-slate-50 border border-purple-200/90 rounded-2xl flex items-center gap-3 max-w-2xl shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-purple-700 text-white font-bold flex items-center justify-center shrink-0 text-base shadow-2xs">
                🤝
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {coBrandName} • {branch?.name || 'Branch'}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {coBrandTagline || `Direct loan facility operated in strategic partnership with ${settings.companyName}`}. Backed by 40+ premier banks & NBFCs with end-to-end processing.
                </p>
              </div>
            </div>
          ) : null}

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
          initialLoanType={(searchParams?.loanType || application.loanType) as LoanType | undefined}
          initialIncomeType={(searchParams?.incomeType || application.incomeType) as IncomeType | undefined}
        />
      </main>

      {/* Branded Footer */}
      {isSatara ? (
        <footer className="max-w-4xl mx-auto px-4 sm:px-6 mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-700">© 2026 Lendbridge Capital (Satara Branch). All rights reserved.</p>
          <p className="mt-1.5 text-slate-500">
            <span>Email: <a href="mailto:lendbridgecapital@gmail.com" className="text-emerald-700 font-medium hover:underline">lendbridgecapital@gmail.com</a> · </span>
            <span>Support: <a href="tel:9049301089" className="text-emerald-700 font-medium hover:underline">+91 9049301089</a></span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Powai Naka, Satara, Maharashtra - 415001</p>
        </footer>
      ) : (
        <footer className="max-w-4xl mx-auto px-4 sm:px-6 mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
          <p className="font-medium text-slate-500">{settings.footerText}</p>
          <p className="mt-1">
            {settings.officialEmail && <span>Email: {settings.officialEmail} · </span>}
            {settings.supportPhone && <span>Support: {settings.supportPhone}</span>}
          </p>
        </footer>
      )}
    </div>
  );
}
