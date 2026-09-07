import { requireRole } from '@/lib/auth';
import { getCompanySettings } from '@/lib/settings';
import EmailSettingsForm from '@/components/EmailSettingsForm';

export default async function EmailSettingsPage() {
  await requireRole('ADMIN');
  const settings = await getCompanySettings();

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Email Settings</h1>
      <p className="text-sm text-slate-500 mb-6">Configure the company's official email and SMTP relay used for automated notifications.</p>
      <EmailSettingsForm settings={settings} />
    </div>
  );
}
