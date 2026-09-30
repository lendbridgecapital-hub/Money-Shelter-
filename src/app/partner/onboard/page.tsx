import { listBranches } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import { getUserById } from '@/lib/repos/usersRepo';
import PartnerOnboardingForm from '@/components/PartnerOnboardingForm';

export const metadata = {
  title: 'Partner Onboarding — Quickfinsure Sub-DSA Registration',
  description:
    'Join Quickfinsure as an authorized Channel Partner & Sub-DSA. Execute referral agreement digitally and receive your partner code.',
};

export default async function PartnerOnboardPage({
  searchParams,
}: {
  searchParams?: { rmId?: string; ref?: string; branchId?: string };
}) {
  const branches = listBranches();
  const settings = await getCompanySettings();

  const refRmId = searchParams?.rmId || searchParams?.ref;
  let referralRm: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    branchId?: string;
    branchName?: string;
  } | null = null;

  if (refRmId) {
    const rmUser = getUserById(refRmId);
    if (rmUser && rmUser.role === 'RELATIONSHIP_MANAGER' && rmUser.active && !rmUser.isBlocked) {
      const rmBranch = branches.find((b) => b.id === rmUser.branchId);
      referralRm = {
        id: rmUser.id,
        name: rmUser.name,
        email: rmUser.email,
        phone: rmUser.phone || undefined,
        branchId: rmUser.branchId,
        branchName: rmBranch ? rmBranch.name : undefined,
      };
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PartnerOnboardingForm
        branches={branches}
        companyName={settings.companyName || 'Quickfinsure'}
        referralRm={referralRm}
      />
    </div>
  );
}
