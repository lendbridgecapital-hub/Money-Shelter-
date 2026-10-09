import { requireRole } from '@/lib/auth';
import { listBranchesWithCounts } from '@/lib/repos/branchesRepo';
import { listRelationshipManagers } from '@/lib/repos/usersRepo';
import BranchManager from '@/components/BranchManager';

export default async function BranchesPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  await requireRole('ADMIN');
  const branches = listBranchesWithCounts();
  const relationshipManagers = listRelationshipManagers();
  const rawType = searchParams?.type?.toUpperCase();
  const initialType = rawType === 'SITE' ? 'SITE' : rawType === 'BRANCH' ? 'BRANCH' : 'ALL';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
          <span>🏢</span>
          <span>Branches & Sites</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage company offices and direct construction project sites. Deploy dedicated manpower to originate customer loans tagged under specific project sites and dedicated RMs.
        </p>
      </div>

      <BranchManager
        branches={branches}
        relationshipManagers={relationshipManagers}
        initialTypeFilter={initialType}
      />
    </div>
  );
}
