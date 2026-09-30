import { notFound } from 'next/navigation';
import { getApplicationByToken } from '@/lib/repos/applicationsRepo';
import { getCompanySettings } from '@/lib/settings';
import OfferClient from './OfferClient';

export default async function OfferPage({ params }: { params: { token: string } }) {
  const application = getApplicationByToken(params.token);
  if (!application) {
    notFound();
  }

  const settings = await getCompanySettings(application.tenantId || 'default');

  return <OfferClient application={application} token={params.token} settings={settings} />;
}
