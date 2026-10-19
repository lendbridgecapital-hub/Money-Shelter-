import React from 'react';
import type { Metadata } from 'next';
import { getCompanySettings } from '@/lib/settings';
import LendbridgePartnerLoginForm from '@/components/LendbridgePartnerLoginForm';

export const metadata: Metadata = {
  title: 'Lendbridge Capital — Portal Login',
  description:
    'Official Channel Partner, Sub-DSA and Branch Employee login portal for Lendbridge Capital (Satara Branch). Access multi-bank loan sourcing, live SLA timers, and commission reports.',
  openGraph: {
    title: 'Lendbridge Capital — Portal Login',
    description:
      'Official Channel Partner, Sub-DSA and Branch Employee login portal for Lendbridge Capital (Satara Branch).',
    siteName: 'Lendbridge Capital',
    images: [{ url: 'https://money-shelter.vercel.app/lendbridge-logo.png' }],
  },
  icons: {
    icon: '/lendbridge-logo.png',
  },
};

export default async function LendbridgeLoginPage() {
  const settings = await getCompanySettings();
  return <LendbridgePartnerLoginForm companySettings={settings} />;
}
