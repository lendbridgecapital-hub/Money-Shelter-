import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listApplicationsByBranch, listAllApplications, branchStats } from '@/lib/repos/applicationsRepo';
import RequestTable from '@/components/RequestTable';

export default async function RequestsPage() {
  const user = await requireUser();
  const isAdmin = user.role === 'ADMIN';
  const applications = isAdmin ? listAllApplications() : listApplicationsByBranch(user.branchId);
  const stats = branchStats(user.branchId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Requests</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin ? 'All customer loan requests across every branch.' : `Customer loan requests for ${user.branchName}.`}
          </p>
        </div>
        <Link href="/branch/create-link" className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">
          + Create Link
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total" value={stats.total ?? 0} />
        <StatCard label="Link Shared" value={stats.linkShared ?? 0} />
        <StatCard label="Document Received" value={stats.documentReceived ?? 0} />
        <StatCard label="Approved" value={stats.approved ?? 0} />
        <StatCard label="Disbursed" value={stats.disbursed ?? 0} />
      </div>

      <RequestTable applications={applications} showBranchColumn={isAdmin} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
