import { requireUser } from '@/lib/auth';
import {
  listRewardLedger,
  listRedemptions,
  getPartnerWalletSummary,
} from '@/lib/repos/rewardsRepo';
import { listPartners, listPartnersByRm } from '@/lib/repos/usersRepo';
import RewardManager from '@/components/RewardManager';
import type { User } from '@/types/db';

export default async function RewardsPage() {
  const user = await requireUser();
  const tenantId = user.tenantId || 'default';

  let partners: User[] = listPartners(tenantId);
  let ledgerEntries = listRewardLedger({ tenantId });
  let redemptions = listRedemptions({ tenantId });

  if (user.role === 'CHANNEL_PARTNER' || user.role === 'SUB_DSA') {
    ledgerEntries = ledgerEntries.filter((e) => e.partnerId === user.id);
    redemptions = redemptions.filter((r) => r.partnerId === user.id);
    partners = [user];
  } else if (user.role === 'RELATIONSHIP_MANAGER') {
    const rmPartners = listPartnersByRm(user.id, tenantId);
    const partnerIds = new Set(rmPartners.map((p) => p.id));
    ledgerEntries = ledgerEntries.filter((e) => partnerIds.has(e.partnerId));
    redemptions = redemptions.filter((r) => partnerIds.has(r.partnerId));
    partners = rmPartners;
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
    />
  );
}
