import { requireRole } from '@/lib/auth';
import { getCompanySettings } from '@/lib/settings';
import CompanyBrandingForm from '@/components/CompanyBrandingForm';

export default async function CompanySetupPage() {
  await requireRole('ADMIN');
  const settings = await getCompanySettings();

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Company Setup</h1>
      <p className="text-sm text-slate-500 mb-6">Branding shown across the admin panel, dashboards, and the public customer application form.</p>
      <CompanyBrandingForm settings={settings} />
    </div>
  );
}
