import type { Metadata } from 'next';
import { listBranches } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import { getUserById, getPartnerByCode } from '@/lib/repos/usersRepo';
import PartnerOnboardingForm from '@/components/PartnerOnboardingForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Lendbridge Capital — Sub-DSA Master Partner Registration',
  description:
    'WHERE BORROWING MEETS TRUST • Partner with Lendbridge Capital (Satara Branch) as an authorized Sub-DSA (Master Partner). Recruit channel partners, manage retail loan originations, and earn direct overrides on every disbursement.',
  openGraph: {
    title: 'Lendbridge Capital — Sub-DSA Master Partner Registration',
    description:
      'WHERE BORROWING MEETS TRUST • Partner with Lendbridge Capital (Satara Branch) as an authorized Sub-DSA (Master Partner). Recruit channel partners, manage retail loan originations, and earn direct overrides on every disbursement.',
    url: 'https://money-shelter.onrender.com/lendbridge/sub-dsa',
    siteName: 'Lendbridge Capital',
    images: [
      {
        url: 'https://money-shelter.onrender.com/lendbridge-logo.png',
        width: 800,
        height: 400,
        alt: 'Lendbridge Capital Logo',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lendbridge Capital — Sub-DSA Master Partner Registration',
    description:
      'WHERE BORROWING MEETS TRUST • Partner with Lendbridge Capital (Satara Branch) as an authorized Sub-DSA (Master Partner).',
    images: ['https://money-shelter.onrender.com/lendbridge-logo.png'],
  },
  icons: [{ rel: 'icon', url: '/lendbridge-logo.png' }],
};

export default async function LendbridgeSubDsaPage({
  searchParams,
}: {
  searchParams?: { rmId?: string; ref?: string; role?: string; code?: string };
}) {
  const branches = listBranches();
  const settings = await getCompanySettings();

  const refId = searchParams?.rmId || searchParams?.ref;

  let referralRm: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    branchId?: string;
    branchName?: string;
  } | null = null;

  if (refId) {
    const u = getUserById(refId);
    if (u && u.active && !u.isBlocked && u.role === 'RELATIONSHIP_MANAGER') {
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
        referralBranch={sataraBranch}
        targetRole="SUB_DSA"
      />
    </div>
  );
}
