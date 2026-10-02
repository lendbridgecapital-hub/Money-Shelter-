import { requireRole } from '@/lib/auth';
import { getCompanySettings } from '@/lib/settings';
import EmailSettingsForm from '@/components/EmailSettingsForm';
import EmailOutboxTable from '@/components/EmailOutboxTable';
import { listEmailLogs } from '@/lib/repos/emailRepo';

export default async function EmailSettingsPage() {
  await requireRole('ADMIN');
  const settings = await getCompanySettings();
  const logs = listEmailLogs(settings.tenantId || 'default', 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Email & Mail System Settings</h1>
        <p className="text-sm text-slate-500">Configure SMTP delivery relays and audit automated customer confirmations and branch alerts.</p>
      </div>
      <EmailSettingsForm settings={settings} />
      <EmailOutboxTable logs={logs} />
    </div>
  );
}

