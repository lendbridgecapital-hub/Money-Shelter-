import { requireRole } from '@/lib/auth';
import { listBranchesWithCounts } from '@/lib/repos/branchesRepo';
import BranchManager from '@/components/BranchManager';

export default async function BranchesPage() {
  await requireRole('ADMIN');
  const branches = listBranchesWithCounts();

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Branches</h1>
      <p className="text-sm text-slate-500 mb-6">Create and manage the company's branches. Every user and loan request belongs to one branch.</p>
      <BranchManager branches={branches} />
    </div>
  );
}
