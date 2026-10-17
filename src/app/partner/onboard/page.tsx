import type { Metadata } from 'next';
import { listBranches, getBranchById } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import { getUserById, getPartnerByCode } from '@/lib/repos/usersRepo';
import PartnerOnboardingForm from '@/components/PartnerOnboardingForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { rmId?: string; ref?: string; branchId?: string; role?: string; subDsaId?: string; code?: string };
}): Promise<Metadata> {
  const isExplicitSubDsa = searchParams?.role?.toUpperCase() === 'SUB_DSA';
  const targetBranchId = searchParams?.branchId;
  const refId = searchParams?.subDsaId || searchParams?.rmId || searchParams?.ref;
  const refCode = searchParams?.code;

  let isSatara = false;
  if (targetBranchId) {
    const cleanId = targetBranchId.trim().toLowerCase();
    if (
      cleanId === 'br_satara_01' ||
      cleanId === 'str01' ||
      cleanId.includes('satara') ||
      cleanId.includes('lendbridge')
    ) {
      isSatara = true;
    }
  }

  if (!isSatara && (refId || refCode)) {
    const user = refCode ? getPartnerByCode(refCode) : (refId ? getUserById(refId) : null);
    if (
      user &&
      (user.branchId === 'br_satara_01' ||
        user.branchName?.toLowerCase().includes('satara') ||
        user.email?.toLowerCase().includes('lendbridge') ||
        user.name?.toLowerCase().includes('lendbridge'))
    ) {
      isSatara = true;
    }
  }

  if (isSatara) {
    const roleTitle = isExplicitSubDsa ? 'Sub-DSA Master Partner' : 'Channel Partner';
    const brandTitle = `Lendbridge Capital — ${roleTitle} Registration`;
    const brandDesc = isExplicitSubDsa
      ? 'WHERE BORROWING MEETS TRUST • Build your agency network, earn override commissions, and originate loans with Lendbridge Capital (Satara Branch).'
      : 'WHERE BORROWING MEETS TRUST • Join Lendbridge Capital (Satara Branch) as an authorized Channel Partner. Execute referral agreement digitally, get instant payouts and receive your partner code.';
    const logoUrl = 'https://money-shelter.onrender.com/lendbridge-logo.png';
    const currentUrl = `https://money-shelter.onrender.com/partner/onboard?${isExplicitSubDsa ? 'role=SUB_DSA&' : ''}branchId=br_satara_01`;

    return {
      title: brandTitle,
      description: brandDesc,
      openGraph: {
        title: brandTitle,
        description: brandDesc,
        url: currentUrl,
        siteName: 'Lendbridge Capital',
        images: [
          {
            url: logoUrl,
            width: 800,
            height: 400,
            alt: 'Lendbridge Capital Logo',
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: brandTitle,
        description: brandDesc,
        images: [logoUrl],
      },
      icons: [{ rel: 'icon', url: '/lendbridge-logo.png' }],
    };
  }

  const title = isExplicitSubDsa
    ? 'Sub-DSA Master Partner Onboarding — Money Shelter'
    : 'Channel Partner Onboarding — Money Shelter';
  const desc = 'WHERE MONEY MEETS TRUST • Official partner registration and digital referral agreement with Money Shelter Pvt. Ltd.';
  const defaultLogo = 'https://money-shelter.onrender.com/money-shelter-logo.png';

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      siteName: 'Money Shelter',
      images: [{ url: defaultLogo, width: 800, height: 400, alt: 'Money Shelter Logo' }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [defaultLogo],
    },
  };
}

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

  // 3. Check if referred via direct Branch link (e.g. Satara Branch / Lendbridge Capital)
  const targetBranchId = searchParams?.branchId;
  let referralBranch: (typeof branches)[number] | null = null;
  if (targetBranchId) {
    const cleanId = targetBranchId.trim().toLowerCase();
    if (
      cleanId === 'br_satara_01' ||
      cleanId === 'str01' ||
      cleanId.includes('satara') ||
      cleanId.includes('lendbridge')
    ) {
      referralBranch =
        branches.find(
          (b) => b.id === 'br_satara_01' || b.name.toLowerCase().includes('satara') || b.code === 'STR01'
        ) || null;
    } else {
      referralBranch =
        branches.find(
          (b) =>
            b.id.toLowerCase() === cleanId ||
            b.code.toLowerCase() === cleanId ||
            b.name.toLowerCase() === cleanId ||
            (b.coBrandName && b.coBrandName.toLowerCase() === cleanId)
        ) || null;
    }
  }

  // 4. Fallback: if referralSubDsa or referralRm belongs to a branch (e.g. Satara), auto-resolve referralBranch
  if (!referralBranch && (referralSubDsa?.branchId || referralRm?.branchId)) {
    const bId = referralSubDsa?.branchId || referralRm?.branchId;
    referralBranch = branches.find((b) => b.id === bId) || null;
  }

  // Guarantee Lendbridge Capital branding data if Satara branch
  if (
    referralBranch &&
    (referralBranch.id === 'br_satara_01' ||
      referralBranch.code === 'STR01' ||
      referralBranch.name.toLowerCase().includes('satara') ||
      referralBranch.coBrandName?.toLowerCase().includes('lendbridge'))
  ) {
    referralBranch = {
      ...referralBranch,
      isCoBranded: true,
      coBrandName: 'Lendbridge Capital',
      coBrandLogoUrl: '/lendbridge-logo.png',
      coBrandTagline: 'In strategic loan distribution partnership with Money Shelter Pvt. Ltd.',
    };
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PartnerOnboardingForm
        branches={branches}
        companyName={settings.companyName || 'Money Shelter Pvt. Ltd.'}
        referralRm={referralRm}
        referralSubDsa={referralSubDsa}
        referralBranch={referralBranch}
        targetRole={targetRole}
      />
    </div>
  );
}
