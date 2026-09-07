import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { branchStats } from '@/lib/repos/applicationsRepo';
import { listBranchesWithCounts } from '@/lib/repos/branchesRepo';

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === 'ADMIN') {
    const branches = listBranchesWithCounts();
    const totalUsers = branches.reduce((sum, b) => sum + b.userCount, 0);
    const totalApplications = branches.reduce((sum, b) => sum + b.applicationCount, 0);

    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Overview</h1>
        <p className="text-sm text-slate-500 mb-6">Organization-wide snapshot across all branches.</p>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <SummaryCard label="Branches" value={branches.length} />
          <SummaryCard label="Users" value={totalUsers} />
          <SummaryCard label="Total Applications" value={totalApplications} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Applications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{b.name}</td>
                  <td className="px-4 py-3 text-slate-500">{b.code}</td>
                  <td className="px-4 py-3 text-slate-600">{b.userCount}</td>
                  <td className="px-4 py-3 text-slate-600">{b.applicationCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 flex-wrap">
          <QuickLink href="/branch/requests" label="View all requests" />
          <QuickLink href="/admin/branches" label="Manage branches" />
          <QuickLink href="/admin/users" label="Manage users" />
          <QuickLink href="/admin/company" label="Company & branding" />
        </div>
      </div>
    );
  }

  const stats = branchStats(user.branchId);
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Welcome, {user.name.split(' ')[0]}</h1>
      <p className="text-sm text-slate-500 mb-6">{user.branchName} branch overview.</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <SummaryCard label="Total" value={stats.total ?? 0} />
        <SummaryCard label="Link Shared" value={stats.linkShared ?? 0} />
        <SummaryCard label="Document Received" value={stats.documentReceived ?? 0} />
        <SummaryCard label="Approved" value={stats.approved ?? 0} />
        <SummaryCard label="Disbursed" value={stats.disbursed ?? 0} />
      </div>

      <div className="flex gap-3">
        <QuickLink href="/branch/requests" label="View requests" />
        <QuickLink href="/branch/create-link" label="Create a new link" />
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300">
      {label} →
    </Link>
  );
}
