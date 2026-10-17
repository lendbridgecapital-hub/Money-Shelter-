import React from 'react';
import type { Metadata } from 'next';
import { getCompanySettings } from '@/lib/settings';
import LendbridgePartnerLoginForm from '@/components/LendbridgePartnerLoginForm';

export const metadata: Metadata = {
  title: 'Lendbridge Capital — Channel Partner Login | Money Shelter',
  description:
    'Dedicated Channel Partner and Sub-DSA login portal for Lendbridge Capital in partnership with Money Shelter Pvt. Ltd. Access multi-bank sourcing, live SLA timers, and commission reports.',
};

export default async function LendbridgeLoginPage() {
  const settings = await getCompanySettings();
  return <LendbridgePartnerLoginForm companySettings={settings} />;
}
