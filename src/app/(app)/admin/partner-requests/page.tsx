import { requireUser } from '@/lib/auth';
import { listPartnerRequests, listRelationshipManagers } from '@/lib/repos/usersRepo';
import { listBranches } from '@/lib/repos/branchesRepo';
import { redirect } from 'next/navigation';
import PartnerRequestsClient from './PartnerRequestsClient';

export const metadata = {
  title: 'Partner Onboarding Approvals — Central Support Desk',
  description: 'Review Channel Partner onboarding applications, verify KYC & Sub-DSA agreements, assign RMs, and approve associations.',
};

export default async function PartnerRequestsPage() {
  const user = await requireUser();
  const allowedRoles = ['CENTRAL_SUPPORT', 'ADMIN', 'RELATIONSHIP_MANAGER', 'OPERATIONS'];
  if (!allowedRoles.includes(user.role)) {
    redirect('/dashboard');
  }

  let partners = listPartnerRequests(undefined, user.tenantId || 'default');
  let relationshipManagers = listRelationshipManagers(user.tenantId || 'default');
  const branches = listBranches(user.tenantId || 'default');

  // Branch restriction: If user is not Super Admin or Central Support, restrict strictly to their own branch
  if (user.role !== 'ADMIN' && user.role !== 'CENTRAL_SUPPORT') {
    if (user.branchId) {
      partners = partners.filter((p) => p.branchId === user.branchId);
      relationshipManagers = relationshipManagers.filter((rm) => rm.branchId === user.branchId);
    } else {
      partners = [];
    }
  }

  return (
    <PartnerRequestsClient
      initialPartners={partners}
      relationshipManagers={relationshipManagers}
      branches={branches}
      currentUserRole={user.role}
      currentUserName={user.name}
    />
  );
}
