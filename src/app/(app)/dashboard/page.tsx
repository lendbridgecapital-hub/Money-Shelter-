import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getPipelineStats, listApplicationsByRole } from '@/lib/repos/applicationsRepo';
import { listBranchesWithCounts } from '@/lib/repos/branchesRepo';
import { listPartnersByRm, listPartnersBySubDsa, getUserById, isUserDedicatedSiteRm } from '@/lib/repos/usersRepo';
import { getSubDsaEarningsSummary } from '@/lib/repos/commissionsRepo';
import { formatCurrencyINR, LOAN_TYPE_LABELS, formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import ActiveReportsSection from '@/components/ActiveReportsSection';
import MobileDashboardSlider from '@/components/MobileDashboardSlider';
import SubDsaCommandHub from '@/components/SubDsaCommandHub';
import {
  getOrganisationReport,
  getRmTerritoryReport,
  getSupportOperationalReport,
  getPartnerPersonalReport,
} from '@/lib/repos/reportsRepo';
import LoanOriginationHub from '@/components/LoanOriginationHub';

export default async function DashboardPage() {
  const sessionUser = await requireUser();
  const user = getUserById(sessionUser.id) || sessionUser;
  const tenantId = user.tenantId || 'default';
  const stats = getPipelineStats(user, tenantId);
  const applications = listApplicationsByRole(user);
  // Show only "Documents In" and above active cases under Recent Applications on main screen.
  // Link Shared and Failed cases remain accessible in the Loan Pipeline under Cases tab.
  const submittedApplications = applications.filter(
    (a) => a.status !== 'LINK_SHARED' && a.status !== 'FAILED'
  );
  const recentApplications = submittedApplications.slice(0, 4);

  const isAdmin = user.role === 'ADMIN';
  const isSupport = user.role === 'CENTRAL_SUPPORT';
  const isPartner = user.role === 'CHANNEL_PARTNER';
  const isSubDsa = user.role === 'SUB_DSA';
  const isRM = user.role === 'RELATIONSHIP_MANAGER';
  const isDedicatedSiteRm = isRM ? isUserDedicatedSiteRm(user) : false;

  // Sub-DSA Network & Earnings
  const mappedAgents = isSubDsa ? listPartnersBySubDsa(user.id, tenantId) : [];
  const subDsaEarnings = isSubDsa ? getSubDsaEarningsSummary(user.id, tenantId) : null;

  // Compute access-scoped active reports
  const orgReport = isAdmin ? getOrganisationReport(tenantId) : null;
  const rmReport = isRM && !isDedicatedSiteRm ? getRmTerritoryReport(user.id, tenantId) : null;
  const supportReport = isSupport ? getSupportOperationalReport(tenantId) : null;
  const partnerPersonalReport = isPartner ? getPartnerPersonalReport(user.id, tenantId) : null;

  // Compute business metrics for the 1/3 mobile dashboard slider
  const totalDisbursedAmount = applications
    .filter((a) => a.status === 'DISBURSED')
    .reduce((sum, a) => sum + (a.disbursedAmount || a.approvedAmount || a.loanAmount || 0), 0);
  const totalDisbursedCases = stats.disbursed;
  const totalRequestedAmount = applications.reduce((sum, a) => sum + (a.loanAmount || a.approvedAmount || 0), 0);
  const approvalRate = stats.total > 0 ? Math.round(((stats.approved + stats.disbursed) / stats.total) * 100) : 0;
  const disbursementRate = stats.total > 0 ? Math.round((stats.disbursed / stats.total) * 100) : 0;

  const businessMetrics = {
    totalDisbursedAmount: orgReport ? orgReport.metrics.totalDisbursedAmount : totalDisbursedAmount,
    totalDisbursedCases: orgReport ? orgReport.metrics.totalDisbursedCases : totalDisbursedCases,
    totalRequestedAmount: orgReport ? orgReport.metrics.totalRequestedAmount : totalRequestedAmount,
    approvalRate: orgReport ? orgReport.metrics.approvalRate : approvalRate,
    disbursementRate: orgReport ? orgReport.metrics.disbursementRate : disbursementRate,
  };

  const rmPartners = isRM && !isDedicatedSiteRm ? listPartnersByRm(user.id, tenantId) : [];
  const branches = isAdmin || isSupport ? listBranchesWithCounts(tenantId) : [];
  const hasSideColumn = (isAdmin && branches.length > 0) || (isRM && !isDedicatedSiteRm && rmPartners.length > 0);

  return (
    <div className="space-y-2.5 min-w-0 max-w-full">
      {/* Dedicated Executive Mobile Dashboard (Visible on mobile, hidden on desktop) */}
      <MobileDashboardSlider
        stats={stats}
        metrics={businessMetrics}
        userName={user.name}
        role={user.role}
        userId={user.id}
        firmName={user.firmName}
        branchName={user.branchName}
        photoUrl={user.photoUrl}
      />

      {/* Mobile Digital Business Card Quick Share Card (Visible on mobile, hidden on desktop) */}
      <div className="block md:hidden bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border border-emerald-500/25 text-white rounded-xl p-2.5 shadow-xs mb-2">
        <div className="flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🪪</span>
              <p className="text-[11px] font-bold text-white tracking-wide">Smart Visiting Card</p>
              <span className="px-1 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-[8px] font-bold border border-emerald-400/30">1-Click Save</span>
            </div>
            <p className="text-[9px] text-slate-300 truncate">
              Share digital profile & auto-capture loan leads
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href={`/card/${user.id}`}
              target="_blank"
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[10px] font-bold active:scale-95 transition"
            >
              View
            </Link>
            <Link
              href="/profile"
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-extrabold shadow-xs active:scale-95 transition flex items-center gap-1"
            >
              <span>Share</span>
              <span>↗</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Partner / Sub-DSA Approval Notice Banner if not approved yet */}
      {(isPartner || isSubDsa) && user.partnerStatus !== 'APPROVED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">⏳</span>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Onboarding Under Central Support Review (Status: {user.partnerStatus || 'Pending Approval'})
              </p>
              <p className="text-[11px] text-amber-700">
                {user.partnerStatus === 'DOCUMENTS_REQUIRED'
                  ? `Central Support update needed: "${user.approvalRemark}". Go to Create Link tab to re-upload.`
                  : 'Your Sub-DSA application and documents are being vetted. Link creation will unlock upon Central Support approval.'}
              </p>
            </div>
          </div>
          <Link
            href="/branch/create-link"
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition"
          >
            Check Status →
          </Link>
        </div>
      )}

      {/* Square Flowchart Pipeline Cards */}
      <div className="hidden md:grid grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-2.5 min-w-0">
        <PipelineCard
          label="Link Shared"
          count={stats.linkShared}
          colorClass="text-emerald-700"
          href="/branch/requests?status=LINK_SHARED"
          dotColor="bg-emerald-500"
        />
        <PipelineCard
          label="Docs In"
          count={stats.documentsIn}
          colorClass="text-slate-800"
          href="/branch/requests?status=DOCUMENTS_IN"
          dotColor="bg-slate-700"
        />
        <PipelineCard
          label="Sent to Bank"
          count={stats.sentToBank}
          colorClass="text-emerald-800"
          href="/branch/requests?status=SENT_TO_BANK"
          dotColor="bg-emerald-700"
        />
        <PipelineCard
          label="Docs Req."
          count={stats.documentsRequired}
          colorClass="text-amber-700"
          href="/branch/requests?status=DOCUMENTS_REQUIRED"
          dotColor="bg-amber-500"
        />
        <PipelineCard
          label="Approved"
          count={stats.approved}
          colorClass="text-emerald-600"
          href="/branch/requests?status=APPROVED"
          dotColor="bg-emerald-500"
        />
        <PipelineCard
          label="Disbursed"
          count={stats.disbursed}
          colorClass="text-teal-700"
          href="/branch/requests?status=DISBURSED"
          dotColor="bg-teal-500"
        />
        <PipelineCard
          label="Failed / Rejected"
          count={stats.rejected}
          colorClass="text-rose-700"
          href="/branch/requests?status=REJECTED"
          dotColor="bg-rose-500"
        />
      </div>

      {/* 4. Access-Wise Active Reports & Organization Intelligence (Desktop only) */}
      <div className="hidden md:block min-w-0 max-w-full">
        <ActiveReportsSection
          role={user.role}
          currentUserId={user.id}
          orgReport={orgReport}
          rmReport={rmReport}
          supportReport={supportReport}
          partnerReport={partnerPersonalReport}
        />
      </div>

      {/* Sub-DSA Master Command Hub (Agent Recruitment Link, Overrides, Mapped Network) */}
      {isSubDsa && subDsaEarnings && (
        <SubDsaCommandHub
          user={user}
          mappedAgents={mappedAgents}
          earnings={subDsaEarnings}
        />
      )}

      {/* 5. Main Workspace */}
      <div className={`grid grid-cols-1 ${hasSideColumn ? 'lg:grid-cols-12' : ''} gap-2 min-w-0 max-w-full`}>
        {/* Left Column: Loan Origination Hub & Active Cases */}
        <div className={`${hasSideColumn ? 'lg:col-span-8' : 'w-full'} min-w-0 max-w-full`}>
          <LoanOriginationHub
            recentApplications={recentApplications}
            totalApplicationsCount={submittedApplications.length}
            partnerName={user.name}
            partnerRole={user.role}
            userId={user.id}
            userEmail={user.email}
          />
        </div>

        {/* Right Column: Branch / Partner Overview (4 cols) */}
        {hasSideColumn && (
          <div className="lg:col-span-4 space-y-1.5 flex flex-col justify-between min-w-0 max-w-full">
            {isAdmin && branches.length > 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-xl p-2 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Branches Overview
                  </h3>
                  <Link
                    href="/admin/branches"
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    Manage →
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {branches.slice(0, 3).map((b) => (
                    <div key={b.id} className="py-1 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900 leading-tight text-[11px] truncate max-w-[120px]">
                          {b.name}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">{b.code}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800 text-[11px]">{b.applicationCount}</span>
                        <span className="text-[9px] text-slate-400 ml-0.5">cases</span>
                        <p className="text-[9px] text-slate-400">{b.userCount} users</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : isRM && rmPartners.length > 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-xl p-2 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    My Channel Partners ({rmPartners.length})
                  </h3>
                  <Link
                    href="/admin/partners"
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    View All →
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {rmPartners.slice(0, 3).map((p) => (
                    <div key={p.id} className="py-1 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900 leading-tight text-[11px] truncate max-w-[120px]">
                          {p.name}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">{p.partnerCode || p.phone || p.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                          {p.partnerCode || 'Active Partner'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineCard({
  label,
  count,
  colorClass,
  href,
  dotColor,
}: {
  label: string;
  count: number;
  colorClass: string;
  href: string;
  dotColor: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-slate-200/90 hover:border-emerald-400 hover:shadow-xs rounded-xl p-2 sm:p-2.5 py-2 flex flex-col justify-between items-center text-center transition-all group shadow-2xs active:scale-[0.98]"
    >
      {/* Top: Card Name */}
      <div className="flex items-center justify-center gap-1 w-full">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate group-hover:text-slate-900 transition-colors">
          {label}
        </span>
      </div>

      {/* Center: Number */}
      <div className="flex-1 flex items-center justify-center py-0.5 sm:py-1">
        <span className={`text-lg sm:text-2xl font-black ${colorClass} tracking-tight group-hover:scale-105 transition-transform`}>
          {count}
        </span>
      </div>

      {/* Bottom hint (desktop only) */}
      <div className="hidden sm:block">
        <span className="text-[9px] font-medium text-slate-400 group-hover:text-emerald-700 transition-colors">
          View Pipeline →
        </span>
      </div>
    </Link>
  );
}
