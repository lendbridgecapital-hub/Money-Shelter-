import { requireUser } from '@/lib/auth';
import { listCommissions, listClawbacks, listCommissionsForSubDsa } from '@/lib/repos/commissionsRepo';
import { listPartners, listPartnersByRm } from '@/lib/repos/usersRepo';
import { listBankProducts } from '@/lib/repos/bankProductsRepo';
import CommissionManager from './CommissionManager';

export default async function CommissionsPage() {
  const user = await requireUser();
  const tenantId = user.tenantId || 'default';
  let commissions = listCommissions(tenantId);
  let clawbacks = listClawbacks(tenantId);
  let partners = listPartners(tenantId);
  const bankProducts = listBankProducts(tenantId);

  if (user.role === 'CHANNEL_PARTNER') {
    commissions = commissions.filter((c) => c.channelPartnerId === user.id);
    clawbacks = clawbacks.filter((c) => c.channelPartnerId === user.id);
    partners = [user];
  } else if (user.role === 'SUB_DSA') {
    commissions = listCommissionsForSubDsa(user.id, tenantId);
    clawbacks = clawbacks.filter((c) => c.channelPartnerId === user.id);
    partners = [user];
  } else if (user.role === 'RELATIONSHIP_MANAGER') {
    const rmPartners = listPartnersByRm(user.id, tenantId);
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
      bankProducts={bankProducts}
    />
  );
}
