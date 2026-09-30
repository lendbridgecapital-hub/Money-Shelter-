import { notFound } from 'next/navigation';
import { getUserById } from '@/lib/repos/usersRepo';
import { getCompanySettings } from '@/lib/settings';
import DigitalBusinessCardClient from './DigitalBusinessCardClient';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const advisor = getUserById(params.id);
  const settings = await getCompanySettings();
  if (!advisor) return { title: 'Business Card' };

  return {
    title: `${advisor.name} — Digital Business Card | ${settings.companyName}`,
    description: `Official digital visiting card of ${advisor.name}, Certified Financial Advisor with ${settings.companyName}.`,
  };
}

export default async function DigitalBusinessCardPage({ params }: Props) {
  const advisor = getUserById(params.id);
  if (!advisor || !advisor.active) {
    notFound();
  }

  const settings = await getCompanySettings();

  return <DigitalBusinessCardClient advisor={advisor} companySettings={settings} />;
}
