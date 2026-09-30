import { requireUser } from '@/lib/auth';
import { listCommissions, listClawbacks } from '@/lib/repos/commissionsRepo';
import { listPartners, listPartnersByRm } from '@/lib/repos/usersRepo';
import CommissionManager from './CommissionManager';

export default async function CommissionsPage() {
  const user = await requireUser();
  let commissions = listCommissions(user.tenantId || 'default');
  let clawbacks = listClawbacks(user.tenantId || 'default');
  let partners = listPartners(user.tenantId || 'default');

  if (user.role === 'CHANNEL_PARTNER') {
    commissions = commissions.filter((c) => c.channelPartnerId === user.id);
    clawbacks = clawbacks.filter((c) => c.channelPartnerId === user.id);
    partners = [user];
  } else if (user.role === 'RELATIONSHIP_MANAGER') {
    const rmPartners = listPartnersByRm(user.id, user.tenantId || 'default');
    const partnerIds = new Set(rmPartners.map((p) => p.id));
    commissions = commissions.filter((c) => partnerIds.has(c.channelPartnerId));
    clawbacks = clawbacks.filter((c) => partnerIds.has(c.channelPartnerId));
    partners = rmPartners;
  }

  return (
    <CommissionManager
      commissions={commissions}
      clawbacks={clawbacks}
      currentUser={user}
      partners={partners}
    />
  );
}
