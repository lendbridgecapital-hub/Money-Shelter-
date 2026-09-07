import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCompanySettings } from '@/lib/settings';
import Sidebar from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const settings = await getCompanySettings();

  return (
    <div className="flex">
      <Sidebar
        role={session.user.role}
        companyName={settings.companyName}
        logoUrl={settings.logoUrl}
        userName={session.user.name}
        branchName={session.user.branchName}
      />
      <main className="flex-1 min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
