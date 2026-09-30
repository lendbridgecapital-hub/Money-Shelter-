import { requireUser } from '@/lib/auth';
import { getCompanySettings } from '@/lib/settings';
import CreateLinkPanel from '@/components/CreateLinkPanel';
import PartnerOnboardingStatusGuard from '@/components/PartnerOnboardingStatusGuard';
import Link from 'next/link';

export default async function CreateLinkPage() {
  const user = await requireUser();
  const settings = await getCompanySettings();

  // Guard: If channel partner has not yet been approved by Central Support, enforce approval lock
  if (user.role === 'CHANNEL_PARTNER' && user.partnerStatus !== 'APPROVED') {
    return (
      <PartnerOnboardingStatusGuard
        partner={user}
        companyName={settings.companyName || 'QuickFinSure'}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Navigation */}
      <div className="flex items-center gap-2">
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
          <span>Cases Pipeline</span>
        </Link>
      </div>
      {/* Partner Association Header Badge */}
      {user.role === 'CHANNEL_PARTNER' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">✓</span>
            <span className="text-xs font-bold text-emerald-900">
              Verified Channel Partner • Code: {user.partnerCode || 'QFS-PRT'}
            </span>
            {user.assignedRmName && (
              <span className="text-[11px] text-emerald-700">
                • Assigned RM: <strong>{user.assignedRmName}</strong>
              </span>
            )}
          </div>
          <Link
            href="/partner/certificate"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline inline-flex items-center gap-1"
          >
            <span>🎓 View Certificate of Association</span>
            <span>↗</span>
          </Link>
        </div>
      )}

      <div>
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Create Customer Link</h1>
        <p className="text-sm text-slate-500 mb-4">
          Generate a secure, shareable link for a customer to submit their loan application and KYC documents.
        </p>
      </div>

      <CreateLinkPanel
        companyName={settings.companyName}
        partnerName={user.name}
        userRole={user.role}
      />
    </div>
  );
}
