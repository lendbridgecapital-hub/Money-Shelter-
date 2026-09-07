import { requireUser } from '@/lib/auth';
import { getCompanySettings } from '@/lib/settings';
import CreateLinkPanel from '@/components/CreateLinkPanel';

export default async function CreateLinkPage() {
  await requireUser();
  const settings = await getCompanySettings();

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Create Link</h1>
      <p className="text-sm text-slate-500 mb-6">Generate a secure, shareable link for a customer to submit their loan application.</p>
      <CreateLinkPanel companyName={settings.companyName} />
    </div>
  );
}
