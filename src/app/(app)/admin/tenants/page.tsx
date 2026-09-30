import { requireRole } from '@/lib/auth';
import { listTenants } from '@/lib/repos/tenantsRepo';
import TenantManager from '@/components/TenantManager';

export default async function TenantsPage() {
  await requireRole('ADMIN');
  const tenants = listTenants();

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">White-Label Client Hub</h1>
      <p className="text-sm text-slate-500 mb-6">
        Manage customer tenants, customize client logos, brand themes, domains, and onboard new organizations.
      </p>
      <TenantManager tenants={tenants} />
    </div>
  );
}
