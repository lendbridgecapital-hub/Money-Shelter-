import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getApplicationByToken } from '@/lib/repos/applicationsRepo';
import { getBranchById } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import OfferClient from './OfferClient';

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const application = getApplicationByToken(params.token);
  const settings = await getCompanySettings(application?.tenantId || 'default');
  const branch = application?.branchId ? getBranchById(application.branchId) : null;

  const isSatara = Boolean(
    application?.branchId === 'br_satara_01' ||
    branch?.id === 'br_satara_01' ||
    branch?.code === 'STR01' ||
    application?.isCoBranded ||
    branch?.isCoBranded ||
    application?.coBrandName?.toLowerCase().includes('lendbridge') ||
    branch?.name?.toLowerCase().includes('satara')
  );

  if (isSatara) {
    return {
      title: 'Loan Sanction Offer & Acceptance Letter — Lendbridge Capital',
      description: 'Review and digitally accept your sanctioned loan offer with Lendbridge Capital (Satara Branch).',
      openGraph: {
        title: 'Loan Sanction Offer & Acceptance Letter — Lendbridge Capital',
        description: 'Review and digitally accept your sanctioned loan offer with Lendbridge Capital (Satara Branch).',
        siteName: 'Lendbridge Capital',
        images: [{ url: 'https://money-shelter.vercel.app/lendbridge-logo.png' }],
      },
      icons: [{ rel: 'icon', url: '/lendbridge-logo.png' }],
    };
  }

  return {
    title: `Loan Sanction Offer — ${settings.companyName}`,
    description: `Review and accept your loan sanction letter through ${settings.companyName}.`,
  };
}

export default async function OfferPage({ params }: { params: { token: string } }) {
  const application = getApplicationByToken(params.token);
  if (!application) {
    notFound();
  }

  const settings = await getCompanySettings(application.tenantId || 'default');

  return <OfferClient application={application} token={params.token} settings={settings} />;
}
