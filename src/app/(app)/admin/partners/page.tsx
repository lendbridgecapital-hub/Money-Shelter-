import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { listAllNetworkPartners, listPartnersByRm, listPartnersBySubDsa, listRelationshipManagers, isUserDedicatedSiteRm } from '@/lib/repos/usersRepo';
import { listBranches } from '@/lib/repos/branchesRepo';
import { listApplicationsByRole } from '@/lib/repos/applicationsRepo';
import { listRewardLedger } from '@/lib/repos/rewardsRepo';
import PartnerComplianceManager from './PartnerComplianceManager';

export default async function PartnersPage() {
  const user = await requireUser();

  // Standard channel partners (agents) only see their own business, not the partner network directory
  if (user.role === 'CHANNEL_PARTNER') {
    redirect('/dashboard');
  }

  // Dedicated Site RMs do not manage channel partners
  const isDedicatedSite = user.role === 'RELATIONSHIP_MANAGER' ? isUserDedicatedSiteRm(user) : false;
  if (isDedicatedSite) {
    redirect('/branch/requests');
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

  // Fetch applications & rewards for team activity inspection
  const applications = listApplicationsByRole(user);

  const rewardLedger = listRewardLedger({ tenantId: user.tenantId || 'default' });

  return (
    <PartnerComplianceManager
      partners={partners}
      branches={branches}
      relationshipManagers={relationshipManagers}
      currentUserRole={user.role}
      currentUserId={user.id}
      isDedicatedSiteRm={isDedicatedSite}
      applications={applications}
      rewardLedger={rewardLedger}
    />
  );
}
