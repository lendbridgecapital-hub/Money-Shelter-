import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { listPartners, listPartnersByRm } from '@/lib/repos/usersRepo';
import PartnerComplianceManager from './PartnerComplianceManager';

export default async function PartnersPage() {
  const user = await requireUser();

  // Channel partners should only see their own business, not the partner network/compliance directory
  if (user.role === 'CHANNEL_PARTNER') {
    redirect('/dashboard');
  }

  // RMs only see their assigned channel partners
  const partners =
    user.role === 'RELATIONSHIP_MANAGER'
      ? listPartnersByRm(user.id, user.tenantId || 'default')
      : listPartners(user.tenantId || 'default');

  return <PartnerComplianceManager partners={partners} currentUserRole={user.role} currentUserId={user.id} />;
}
