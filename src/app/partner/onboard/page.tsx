import { listBranches } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import { getUserById } from '@/lib/repos/usersRepo';
import PartnerOnboardingForm from '@/components/PartnerOnboardingForm';

export const metadata = {
  title: 'Partner Onboarding — Money Shelter Sub-DSA & Channel Partner Registration',
  description:
    'Join Money Shelter Pvt. Ltd. as an authorized Channel Partner & Sub-DSA. Execute referral agreement digitally and receive your partner code.',
};

export default async function PartnerOnboardPage({
  searchParams,
}: {
  searchParams?: { rmId?: string; ref?: string; branchId?: string; role?: string; subDsaId?: string; code?: string };
}) {
  const branches = listBranches();
  const settings = await getCompanySettings();

  const isExplicitSubDsa = searchParams?.role?.toUpperCase() === 'SUB_DSA';
  const refId = searchParams?.subDsaId || searchParams?.rmId || searchParams?.ref;
  const refCode = searchParams?.code;

  let referralRm: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    branchId?: string;
    branchName?: string;
  } | null = null;

  let referralSubDsa: {
    id: string;
    name: string;
    partnerCode?: string;
    phone?: string;
    branchId?: string;
    branchName?: string;
    assignedRmId?: string;
    assignedRmName?: string;
  } | null = null;

  // 1. Check if referred by Sub-DSA (by subDsaId or refCode or ref user with SUB_DSA role)
  if (searchParams?.subDsaId) {
    const subDsaUser = getUserById(searchParams.subDsaId);
    if (subDsaUser && subDsaUser.role === 'SUB_DSA' && subDsaUser.active && !subDsaUser.isBlocked) {
      const b = branches.find((br) => br.id === subDsaUser.branchId);
      referralSubDsa = {
        id: subDsaUser.id,
        name: subDsaUser.name,
        partnerCode: subDsaUser.partnerCode,
        phone: subDsaUser.phone || undefined,
        branchId: subDsaUser.branchId,
        branchName: b ? b.name : undefined,
        assignedRmId: subDsaUser.assignedRmId || undefined,
        assignedRmName: subDsaUser.assignedRmName || undefined,
      };
    }
  } else if (refCode) {
    const { getPartnerByCode } = await import('@/lib/repos/usersRepo');
    const matched = getPartnerByCode(refCode);
    if (matched && matched.role === 'SUB_DSA' && matched.active && !matched.isBlocked) {
      const b = branches.find((br) => br.id === matched.branchId);
      referralSubDsa = {
        id: matched.id,
        name: matched.name,
        partnerCode: matched.partnerCode,
        phone: matched.phone || undefined,
        branchId: matched.branchId,
        branchName: b ? b.name : undefined,
        assignedRmId: matched.assignedRmId || undefined,
        assignedRmName: matched.assignedRmName || undefined,
      };
    }
  }

  // 2. Check if referred by RM or Admin
  if (refId && !referralSubDsa) {
    const u = getUserById(refId);
    if (u && u.active && !u.isBlocked) {
      if (u.role === 'SUB_DSA' && !isExplicitSubDsa) {
        const b = branches.find((br) => br.id === u.branchId);
        referralSubDsa = {
          id: u.id,
          name: u.name,
          partnerCode: u.partnerCode,
          phone: u.phone || undefined,
          branchId: u.branchId,
          branchName: b ? b.name : undefined,
          assignedRmId: u.assignedRmId || undefined,
          assignedRmName: u.assignedRmName || undefined,
        };
      } else if (u.role === 'RELATIONSHIP_MANAGER') {
        const rmBranch = branches.find((b) => b.id === u.branchId);
        referralRm = {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || undefined,
          branchId: u.branchId,
          branchName: rmBranch ? rmBranch.name : undefined,
        };
      }
    }
  }

  const targetRole = isExplicitSubDsa ? 'SUB_DSA' : 'CHANNEL_PARTNER';

  return (
    <div className="min-h-screen bg-slate-50">
      <PartnerOnboardingForm
        branches={branches}
        companyName={settings.companyName || 'Money Shelter Pvt. Ltd.'}
        referralRm={referralRm}
        referralSubDsa={referralSubDsa}
        targetRole={targetRole}
      />
    </div>
  );
}
