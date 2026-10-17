import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { listAllNetworkPartners, listPartnersByRm, listPartnersBySubDsa, listRelationshipManagers, isUserDedicatedSiteRm } from '@/lib/repos/usersRepo';
import { listBranches } from '@/lib/repos/branchesRepo';
import { listApplicationsByRole, isPuneHqOperationsUser } from '@/lib/repos/applicationsRepo';
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

  const isOps = user.role === 'OPERATIONS';
  const isPuneHq = isPuneHqOperationsUser(user);
  const isRegionalBranchOps = isOps && !isPuneHq;

  const allBranches = listBranches(user.tenantId || 'default');
  let userBranchId = user.branchId;
  if (
    !userBranchId &&
    (user.email?.toLowerCase().includes('lendbridge') ||
      user.email?.toLowerCase().includes('satara') ||
      user.name?.toLowerCase().includes('lendbridge') ||
      user.name?.toLowerCase().includes('satara'))
  ) {
    userBranchId = 'br_satara_01';
  }

  const userBranch = userBranchId
    ? allBranches.find(
        (b) =>
          b.id.toLowerCase() === userBranchId.toLowerCase() ||
          b.code.toLowerCase() === userBranchId.toLowerCase() ||
          b.name.toLowerCase() === userBranchId.toLowerCase()
      )
    : null;

  // Gather branch and its mapped construction/project sites if regional branch ops
  const branchSites = isRegionalBranchOps && userBranch
    ? allBranches.filter(
        (b) => b.type === 'SITE' && (b.mappedBranchId === userBranch.id || b.mappedBranchId === userBranch.code)
      )
    : [];

  const branches = isRegionalBranchOps && userBranch
    ? [userBranch, ...branchSites]
    : allBranches;

  // Filter partners: Sub-DSAs see their mapped agents; RMs see their assigned partners; Branch Ops sees branch & sites partners
  let partners = [];
  if (user.role === 'SUB_DSA') {
    partners = listPartnersBySubDsa(user.id, user.tenantId || 'default');
  } else if (user.role === 'RELATIONSHIP_MANAGER') {
    partners = listPartnersByRm(user.id, user.tenantId || 'default');
  } else if (isRegionalBranchOps && userBranch) {
    const allowedBranchIds = new Set<string>();
    allowedBranchIds.add(userBranch.id.toLowerCase());
    allowedBranchIds.add(userBranch.code.toLowerCase());
    allowedBranchIds.add(userBranch.name.toLowerCase());
    if (userBranch.coBrandName) allowedBranchIds.add(userBranch.coBrandName.toLowerCase());
    for (const site of branchSites) {
      allowedBranchIds.add(site.id.toLowerCase());
      allowedBranchIds.add(site.code.toLowerCase());
      allowedBranchIds.add(site.name.toLowerCase());
    }

    const allNetworkPartners = listAllNetworkPartners(user.tenantId || 'default');
    partners = allNetworkPartners.filter((p) => {
      if (p.branchId && allowedBranchIds.has(p.branchId.toLowerCase())) return true;
      if (p.branchName && allowedBranchIds.has(p.branchName.toLowerCase())) return true;
      if (
        userBranch.id === 'br_satara_01' &&
        (p.email.toLowerCase().includes('satara') ||
          p.email.toLowerCase().includes('lendbridge') ||
          (p.branchName && p.branchName.toLowerCase().includes('satara')) ||
          p.branchId === 'STR01')
      ) {
        return true;
      }
      return false;
    });
  } else {
    // Admin, Central Support, Pune HQ Ops see all
    partners = listAllNetworkPartners(user.tenantId || 'default');
  }

  // Filter relationship managers
  const allRms = listRelationshipManagers(user.tenantId || 'default');
  const relationshipManagers = isRegionalBranchOps && userBranch
    ? allRms.filter((rm) => {
        if (!rm.branchId) return false;
        const bId = rm.branchId.toLowerCase();
        return (
          bId === userBranch.id.toLowerCase() ||
          bId === userBranch.code.toLowerCase() ||
          branchSites.some((s) => s.id.toLowerCase() === bId || s.code.toLowerCase() === bId)
        );
      })
    : allRms;

  // Fetch applications & rewards strictly scoped
  const applications = listApplicationsByRole(user);

  const partnerIdSet = new Set(partners.map((p) => p.id));
  const rawRewardLedger = listRewardLedger({ tenantId: user.tenantId || 'default' });
  const rewardLedger = isRegionalBranchOps
    ? rawRewardLedger.filter((r) => partnerIdSet.has(r.partnerId))
    : rawRewardLedger;

  return (
    <PartnerComplianceManager
      partners={partners}
      branches={branches}
      relationshipManagers={relationshipManagers}
      currentUserRole={user.role}
      currentUserId={user.id}
      userBranchId={userBranch?.id || user.branchId}
      userBranchName={userBranch?.name || user.branchName}
      isDedicatedSiteRm={isDedicatedSite}
      isBranchOps={isRegionalBranchOps}
      branchSites={branchSites}
      applications={applications}
      rewardLedger={rewardLedger}
    />
  );
}
