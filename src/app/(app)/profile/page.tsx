import { requireUser } from '@/lib/auth';
import { getUserById } from '@/lib/repos/usersRepo';
import { getCompanySettings } from '@/lib/settings';
import ProfileClient from './ProfileClient';

export const metadata = {
  title: 'My Profile & Business Details',
};

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = getUserById(sessionUser.id) || sessionUser;
  const settings = await getCompanySettings();

  return <ProfileClient user={user} settings={settings} />;
}
