import { requireUser } from '@/lib/auth';
import { listPartnerRequests, listRelationshipManagers } from '@/lib/repos/usersRepo';
import { listBranches } from '@/lib/repos/branchesRepo';
import { isPuneHqOperationsUser } from '@/lib/repos/applicationsRepo';
import { redirect } from 'next/navigation';
import PartnerRequestsClient from './PartnerRequestsClient';

export const metadata = {
  title: 'Partner & Site Onboarding Approvals — Operations & Support Desk',
  description: 'Review Channel Partner onboarding applications, verify KYC & Sub-DSA agreements, approve construction project sites, and issue Certificates of Association.',
};

export default async function PartnerRequestsPage() {
  const user = await requireUser();
  const allowedRoles = ['CENTRAL_SUPPORT', 'ADMIN', 'RELATIONSHIP_MANAGER', 'OPERATIONS'];
  if (!allowedRoles.includes(user.role)) {
    redirect('/dashboard');
  }

  const isOps = user.role === 'OPERATIONS';
  const isPuneHq = isPuneHqOperationsUser(user);
  const isRegionalBranchOps = isOps && !isPuneHq;

  const allBranches = listBranches(user.tenantId || 'default');
  let userBranchId = user.branchId;
  if (
    (!userBranchId || userBranchId === 'default') &&
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
          b.name.toLowerCase() === userBranchId.toLowerCase() ||
          (userBranchId.toLowerCase().includes('satara') &&
            (b.id === 'br_satara_01' || b.code === 'STR01' || b.name.toLowerCase().includes('satara')))
      )
    : null;

  // Direct Company Construction Project Sites
  const branchSites = isRegionalBranchOps && userBranch
    ? allBranches.filter(
        (b) => b.type === 'SITE' && (b.mappedBranchId === userBranch.id || b.mappedBranchId === userBranch.code)
      )
    : allBranches.filter((b) => b.type === 'SITE');

  let partners = listPartnerRequests(undefined, user.tenantId || 'default');
  let relationshipManagers = listRelationshipManagers(user.tenantId || 'default');

  if (isRegionalBranchOps && userBranch) {
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

    partners = partners.filter((p) => {
      if (p.branchId && allowedBranchIds.has(p.branchId.toLowerCase())) return true;
      if (p.branchName && allowedBranchIds.has(p.branchName.toLowerCase())) return true;
      if (
        userBranch.id === 'br_satara_01' &&
        (p.email.toLowerCase().includes('satara') ||
          p.email.toLowerCase().includes('lendbridge') ||
          (p.branchName && p.branchName.toLowerCase().includes('satara')) ||
          p.branchId === 'STR01' ||
          p.branchId === 'br_satara_01' ||
          p.partnerCode === 'QFS-SUB-9796' ||
          (p.name && p.name.toLowerCase().includes('tejas')) ||
          (p.agreementAuthorizedText &&
            (p.agreementAuthorizedText.toLowerCase().includes('satara') ||
              p.agreementAuthorizedText.toLowerCase().includes('lendbridge'))))
      ) {
        return true;
      }
      return false;
    });

    relationshipManagers = relationshipManagers.filter((rm) => {
      if (!rm.branchId) return false;
      const bId = rm.branchId.toLowerCase();
      return (
        bId === userBranch.id.toLowerCase() ||
        bId === userBranch.code.toLowerCase() ||
        branchSites.some((s) => s.id.toLowerCase() === bId || s.code.toLowerCase() === bId)
      );
    });
  } else if (user.role === 'RELATIONSHIP_MANAGER') {
    if (user.branchId) {
      partners = partners.filter((p) => p.branchId === user.branchId);
      relationshipManagers = relationshipManagers.filter((rm) => rm.branchId === user.branchId);
    }
  }

  const branches = isRegionalBranchOps && userBranch ? [userBranch, ...branchSites] : allBranches;

  return (
    <PartnerRequestsClient
      initialPartners={partners}
      relationshipManagers={relationshipManagers}
      branches={branches}
      branchSites={branchSites}
      userBranch={userBranch || undefined}
      isRegionalBranchOps={isRegionalBranchOps}
      currentUserRole={user.role}
      currentUserName={user.name}
      currentUserId={user.id}
    />
  );
}
