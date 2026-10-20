import { requireRole } from '@/lib/auth';
import { getCompanySettings } from '@/lib/settings';
import EmailSettingsForm from '@/components/EmailSettingsForm';
import EmailOutboxTable from '@/components/EmailOutboxTable';
import { listEmailLogs } from '@/lib/repos/emailRepo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmailSettingsPage() {
  await requireRole('ADMIN');
  const settings = await getCompanySettings();
  const logs = listEmailLogs(settings.tenantId || 'default', 150);

  const activeHost = settings.smtpHost || process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST || '';
  const activeUser = settings.smtpUser || process.env.SMTP_USER || process.env.EMAIL_SERVER_USER || '';
  const isSmtpConfigured = Boolean(activeHost && activeUser);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
            <span>✉️</span>
            <span>Email & Mail System Settings</span>
          </h1>
          <p className="text-sm text-slate-500">
            Configure SMTP delivery relays and audit automated customer confirmations and branch alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSmtpConfigured ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>SMTP Relay Active ({activeUser})</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>SMTP Setup Required for Live Delivery</span>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
            <span>📍 Satara Alert Desk:</span>
            <span className="font-mono text-emerald-700">lendbridgecapital@gmail.com</span>
          </div>
        </div>
      </div>

      <EmailSettingsForm settings={settings} />
      <EmailOutboxTable logs={logs} />
    </div>
  );
}
