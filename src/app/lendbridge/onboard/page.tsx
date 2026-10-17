import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lendbridge Capital — Channel Partner Registration (Satara Branch)',
  description:
    'Join Lendbridge Capital (Satara Branch) as an authorized Channel Partner. Execute referral agreement digitally, get instant payouts and receive your partner code.',
  openGraph: {
    title: 'Lendbridge Capital — Channel Partner Registration (Satara Branch)',
    description:
      'Join Lendbridge Capital (Satara Branch) as an authorized Channel Partner. Execute referral agreement digitally, get instant payouts and receive your partner code.',
    siteName: 'Lendbridge Capital',
    images: [{ url: 'https://money-shelter.onrender.com/lendbridge-logo.png', width: 800, height: 400, alt: 'Lendbridge Capital Logo' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lendbridge Capital — Channel Partner Registration (Satara Branch)',
    description:
      'Join Lendbridge Capital (Satara Branch) as an authorized Channel Partner. Execute referral agreement digitally, get instant payouts and receive your partner code.',
    images: ['https://money-shelter.onrender.com/lendbridge-logo.png'],
  },
  icons: [{ rel: 'icon', url: '/lendbridge-logo.png' }],
};

export default function LendbridgeOnboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const params = new URLSearchParams();
  params.set('branchId', 'br_satara_01');
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== 'branchId') params.set(k, v);
    });
  }
  redirect(`/partner/onboard?${params.toString()}`);
}
