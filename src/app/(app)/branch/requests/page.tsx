import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listApplicationsByRole, getPipelineStats } from '@/lib/repos/applicationsRepo';
import RequestTable from '@/components/RequestTable';
import { ROLE_LABELS } from '@/lib/format';

export default async function RequestsPage() {
  const user = await requireUser();
  const applications = listApplicationsByRole(user);
  const stats = getPipelineStats(user, user.tenantId || 'default');
  const isAdminOrOps = user.role === 'ADMIN' || user.role === 'OPERATIONS';

  return (
    <div className="space-y-3 sm:space-y-4 min-w-0 max-w-full">
      {/* Page Header Bar */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/dashboard"
            className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs active:scale-95 transition shrink-0"
          >
            <svg className="w-3.5 h-3.5 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home</span>
          </Link>
          <h1 className="text-base sm:text-xl font-black text-slate-900 truncate">
            {user.role === 'CHANNEL_PARTNER' ? 'Customer Leads' : 'Loan Pipeline'}
          </h1>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
            {stats.total} Cases
          </span>
        </div>

        <Link
          href="/branch/create-link"
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
        >
          <span>+</span>
          <span>New Lead</span>
        </Link>
      </div>

      {/* Desktop-only Compact Pipeline Stage Overview */}
      <div className="hidden md:grid grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-2.5 min-w-0">
        <CompactStageCard label="Link Shared" value={stats.linkShared} colorClass="text-emerald-700" href="/branch/requests?status=LINK_SHARED" />
        <CompactStageCard label="Docs In" value={stats.documentsIn} colorClass="text-slate-800" href="/branch/requests?status=DOCUMENTS_IN" />
        <CompactStageCard label="Docs Required" value={stats.documentsRequired} colorClass="text-amber-700" href="/branch/requests?status=DOCUMENTS_REQUIRED" />
        <CompactStageCard label="Sent to Bank" value={stats.sentToBank} colorClass="text-indigo-700" href="/branch/requests?status=SENT_TO_BANK" />
        <CompactStageCard label="Approved" value={stats.approved} colorClass="text-emerald-600" href="/branch/requests?status=APPROVED" />
        <CompactStageCard label="Disbursed" value={stats.disbursed} colorClass="text-teal-700" href="/branch/requests?status=DISBURSED" />
        <CompactStageCard label="Failed / Rejected" value={stats.rejected} colorClass="text-rose-700" href="/branch/requests?status=REJECTED" />
      </div>

      {/* Main Request Cards & Filter Component */}
      <RequestTable
        applications={applications}
        showBranchColumn={isAdminOrOps}
        canMatchEligibility={isAdminOrOps}
      />
    </div>
  );
}

function CompactStageCard({
  label,
  value,
  colorClass,
  href,
}: {
  label: string;
  value: number;
  colorClass: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white border border-slate-200/80 rounded-xl px-2.5 py-2 text-center shadow-2xs hover:border-emerald-300 hover:shadow-xs transition">
      <p className={`text-base sm:text-lg font-black ${colorClass}`}>{value}</p>
      <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold truncate mt-0.5">{label}</p>
    </div>
  );

  return href ? (
    <Link href={href} className="block transition active:scale-95">
      {content}
    </Link>
  ) : (
    content
  );
}
