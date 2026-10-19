import type { Metadata } from 'next';
import { listBranches } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import { getUserById, getPartnerByCode } from '@/lib/repos/usersRepo';
import PartnerOnboardingForm from '@/components/PartnerOnboardingForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Lendbridge Capital — Channel Partner Registration (Satara Branch)',
  description:
    'WHERE BORROWING MEETS TRUST • Join Lendbridge Capital (Satara Branch) as an authorized Channel Partner. Execute referral agreement digitally, get instant payouts and receive your partner code.',
  openGraph: {
    title: 'Lendbridge Capital — Channel Partner Registration',
    description:
      'WHERE BORROWING MEETS TRUST • Join Lendbridge Capital (Satara Branch) as an authorized Channel Partner. Submit retail and commercial loan files digitally, get rapid bank approvals, and earn top commission slabs.',
    url: 'https://money-shelter.vercel.app/lendbridge/onboard',
    siteName: 'Lendbridge Capital',
    images: [
      {
        url: 'https://money-shelter.vercel.app/lendbridge-logo.png',
        width: 800,
        height: 400,
        alt: 'Lendbridge Capital Logo',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lendbridge Capital — Channel Partner Registration',
    description:
      'WHERE BORROWING MEETS TRUST • Join Lendbridge Capital (Satara Branch) as an authorized Channel Partner.',
    images: ['https://money-shelter.vercel.app/lendbridge-logo.png'],
  },
  icons: [{ rel: 'icon', url: '/lendbridge-logo.png' }],
};

export default async function LendbridgeOnboardPage({
  searchParams,
}: {
  searchParams?: { rmId?: string; ref?: string; role?: string; subDsaId?: string; code?: string };
}) {
  const branches = listBranches();
  const settings = await getCompanySettings();

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

  if (refId && !referralSubDsa) {
    const u = getUserById(refId);
    if (u && u.active && !u.isBlocked) {
      if (u.role === 'SUB_DSA') {
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

  let sataraBranch =
    branches.find(
      (b) => b.id === 'br_satara_01' || b.name.toLowerCase().includes('satara') || b.code === 'STR01'
    ) || null;

  if (sataraBranch) {
    sataraBranch = {
      ...sataraBranch,
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
        referralBranch={sataraBranch}
        targetRole="CHANNEL_PARTNER"
      />
    </div>
  );
}
