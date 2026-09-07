import { requireRole } from '@/lib/auth';
import { listUsers } from '@/lib/repos/usersRepo';
import { listBranches } from '@/lib/repos/branchesRepo';
import UserManager from '@/components/UserManager';

export default async function UsersPage() {
  await requireRole('ADMIN');
  const [users, branches] = [listUsers(), listBranches()];

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Users</h1>
      <p className="text-sm text-slate-500 mb-6">Manage staff accounts — Admins, Loan Managers, and Operation Executives — and their branch assignment.</p>
      <UserManager users={users} branches={branches} />
    </div>
  );
}
