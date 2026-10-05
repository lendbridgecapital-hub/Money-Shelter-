import { requireUser } from '@/lib/auth';
import { getCompanySettings } from '@/lib/settings';
import CreateLinkPanel from '@/components/CreateLinkPanel';
import PartnerOnboardingStatusGuard from '@/components/PartnerOnboardingStatusGuard';
import Link from 'next/link';

export default async function CreateLinkPage() {
  const user = await requireUser();
  const settings = await getCompanySettings();

  // Guard: If partner has not yet been approved by Central Support, enforce approval lock
  if ((user.role === 'CHANNEL_PARTNER' || user.role === 'SUB_DSA') && user.partnerStatus !== 'APPROVED') {
    return (
      <PartnerOnboardingStatusGuard
        partner={user}
        companyName={settings.companyName || 'Quickfinsure'}
      />
    );
  }

  const isSubDsa = user.role === 'SUB_DSA';
  const isPartner = user.role === 'CHANNEL_PARTNER';

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

      {/* Sub-DSA Network Banner */}
      {isSubDsa && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50/60 to-white border border-indigo-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-indigo-950">
                  Verified Sub-DSA Partner • Code: {user.partnerCode || 'QFS-SUB'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  Override Engine Active
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                As a Sub-DSA, you can originate direct loans (below) or recruit agents to earn override commissions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1"
            >
              <span>Recruit Agents Link →</span>
            </Link>
          </div>
        </div>
      )}

      {/* Partner Association Header Badge */}
      {isPartner && (
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
