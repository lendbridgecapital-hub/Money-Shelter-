import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { listAllNetworkPartners, listPartnersByRm, listPartnersBySubDsa, listRelationshipManagers } from '@/lib/repos/usersRepo';
import { listBranches } from '@/lib/repos/branchesRepo';
import PartnerComplianceManager from './PartnerComplianceManager';

export default async function PartnersPage() {
  const user = await requireUser();

  // Standard channel partners (agents) only see their own business, not the partner network directory
  if (user.role === 'CHANNEL_PARTNER') {
    redirect('/dashboard');
  }

  // Sub-DSAs see their mapped agents; RMs see their assigned network partners; Admins & Support see all
  const partners =
    user.role === 'SUB_DSA'
      ? listPartnersBySubDsa(user.id, user.tenantId || 'default')
      : user.role === 'RELATIONSHIP_MANAGER'
      ? listPartnersByRm(user.id, user.tenantId || 'default')
      : listAllNetworkPartners(user.tenantId || 'default');

  const branches = listBranches(user.tenantId || 'default');
  const relationshipManagers = listRelationshipManagers(user.tenantId || 'default');

  return (
    <PartnerComplianceManager
      partners={partners}
      branches={branches}
      relationshipManagers={relationshipManagers}
      currentUserRole={user.role}
      currentUserId={user.id}
    />
  );
}
