import { requireRole } from '@/lib/auth';
import { listUsers } from '@/lib/repos/usersRepo';
import { listBranches } from '@/lib/repos/branchesRepo';
import UserManager from '@/components/UserManager';

export default async function UsersPage() {
  const currentUser = await requireRole('ADMIN', 'CENTRAL_SUPPORT');
  const [users, branches] = [listUsers(currentUser.tenantId || 'default'), listBranches(currentUser.tenantId || 'default')];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Staff & Relationship Managers</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage team members, provision individual or bulk Relationship Managers (RMs), and control branch assignments.
        </p>
      </div>
      <UserManager users={users} branches={branches} currentUserRole={currentUser.role} />
    </div>
  );
}
