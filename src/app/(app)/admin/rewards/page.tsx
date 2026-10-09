import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import {
  listRewardLedger,
  listRedemptions,
  getPartnerWalletSummary,
} from '@/lib/repos/rewardsRepo';
import {
  listPartners,
  listPartnersByRm,
  listPartnersBySubDsa,
  isUserDedicatedSiteRm,
} from '@/lib/repos/usersRepo';
import { listCommissions, listCommissionsByPartner } from '@/lib/repos/commissionsRepo';
import { listApplicationsByRole } from '@/lib/repos/applicationsRepo';
import RewardManager from '@/components/RewardManager';
import type { User, Commission } from '@/types/db';

export default async function RewardsPage() {
  const user = await requireUser();
  const tenantId = user.tenantId || 'default';

  // Dedicated Site RM check: Point 2
  if (user.role === 'RELATIONSHIP_MANAGER' && isUserDedicatedSiteRm(user)) {
    redirect('/branch/requests');
  }

  let partners: User[] = listPartners(tenantId);
  let ledgerEntries = listRewardLedger({ tenantId });
  let redemptions = listRedemptions({ tenantId });

  const applications = listApplicationsByRole(user);
  let commissions: Commission[] = [];

  if (user.role === 'CHANNEL_PARTNER') {
    ledgerEntries = ledgerEntries.filter((e) => e.partnerId === user.id);
    redemptions = redemptions.filter((r) => r.partnerId === user.id);
    partners = [user];
    // Channel Partner: only his own receivables (Point 4)
    commissions = listCommissionsByPartner(user.id).filter((c) => c.channelPartnerId === user.id);
  } else if (user.role === 'SUB_DSA') {
    ledgerEntries = ledgerEntries.filter((e) => e.partnerId === user.id);
    redemptions = redemptions.filter((r) => r.partnerId === user.id);
    partners = [user];
    // Sub-DSA: his own and his partners' receivables bank-wise (Point 4)
    const teamPartners = listPartnersBySubDsa(user.id, tenantId);
    const teamPartnerIds = new Set(teamPartners.map((p) => p.id));
    const allCommissions = listCommissions(tenantId);
    commissions = allCommissions.filter(
      (c) =>
        c.channelPartnerId === user.id ||
        c.sourcePartnerId === user.id ||
        teamPartnerIds.has(c.channelPartnerId)
    );
  } else if (user.role === 'RELATIONSHIP_MANAGER') {
    const rmPartners = listPartnersByRm(user.id, tenantId);
    const partnerIds = new Set(rmPartners.map((p) => p.id));
    ledgerEntries = ledgerEntries.filter((e) => partnerIds.has(e.partnerId));
    redemptions = redemptions.filter((r) => partnerIds.has(r.partnerId));
    partners = rmPartners;
    commissions = listCommissions(tenantId).filter(
      (c) => partnerIds.has(c.channelPartnerId) || (c.sourcePartnerId && partnerIds.has(c.sourcePartnerId))
    );
  } else {
    // Admin, Operations, Central Support
    commissions = listCommissions(tenantId);
  }

  // For partners, get their personal wallet; for admin/ops, get aggregate tenant wallet
  const partnerIdForWallet =
    user.role === 'CHANNEL_PARTNER' || user.role === 'SUB_DSA' ? user.id : '';

  const walletSummary = getPartnerWalletSummary(partnerIdForWallet, tenantId);

  return (
    <RewardManager
      currentUser={user}
      walletSummary={walletSummary}
      ledgerEntries={ledgerEntries}
      redemptions={redemptions}
      partners={partners}
      commissions={commissions}
      applications={applications}
    />
  );
}
