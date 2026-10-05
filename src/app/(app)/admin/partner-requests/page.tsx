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
  if (user.role !== 'CENTRAL_SUPPORT' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const partners = listPartnerRequests(undefined, user.tenantId || 'default');
  const relationshipManagers = listRelationshipManagers(user.tenantId || 'default');
  const branches = listBranches(user.tenantId || 'default');

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
