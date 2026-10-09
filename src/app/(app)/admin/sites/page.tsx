import { requireRole } from '@/lib/auth';
import { listBranchesWithCounts } from '@/lib/repos/branchesRepo';
import { listRelationshipManagers } from '@/lib/repos/usersRepo';
import BranchManager from '@/components/BranchManager';

export default async function SitesPage() {
  await requireRole('ADMIN');
  const branches = listBranchesWithCounts();
  const relationshipManagers = listRelationshipManagers();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
          <span>🏗️</span>
          <span>Construction Sites (Direct Company Projects)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Construction projects operated directly by the company. Deploy dedicated manpower to originate customer loans tagged under this site and its assigned dedicated Relationship Manager (RM).
        </p>
      </div>

      <BranchManager
        branches={branches}
        relationshipManagers={relationshipManagers}
        initialTypeFilter="SITE"
      />
    </div>
  );
}
