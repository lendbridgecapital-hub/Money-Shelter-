import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lendbridge Capital — Sub-DSA Master Partner Registration (Satara Branch)',
  description:
    'Join Lendbridge Capital (Satara Branch) as an authorized Sub-DSA Master Partner. Build your agency network, earn override commissions, and originate loans.',
  openGraph: {
    title: 'Lendbridge Capital — Sub-DSA Master Partner Registration (Satara Branch)',
    description:
      'Join Lendbridge Capital (Satara Branch) as an authorized Sub-DSA Master Partner. Build your agency network, earn override commissions, and originate loans.',
    siteName: 'Lendbridge Capital',
    images: [{ url: 'https://money-shelter.onrender.com/lendbridge-logo.png', width: 800, height: 400, alt: 'Lendbridge Capital Logo' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lendbridge Capital — Sub-DSA Master Partner Registration (Satara Branch)',
    description:
      'Join Lendbridge Capital (Satara Branch) as an authorized Sub-DSA Master Partner. Build your agency network, earn override commissions, and originate loans.',
    images: ['https://money-shelter.onrender.com/lendbridge-logo.png'],
  },
  icons: [{ rel: 'icon', url: '/lendbridge-logo.png' }],
};

export default function LendbridgeSubDsaPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const params = new URLSearchParams();
  params.set('role', 'SUB_DSA');
  params.set('branchId', 'br_satara_01');
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== 'branchId' && k !== 'role') params.set(k, v);
    });
  }
  redirect(`/partner/onboard?${params.toString()}`);
}
