import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCompanySettings } from '@/lib/settings';
import Sidebar from '@/components/Sidebar';
import MobileAppHeader from '@/components/MobileAppHeader';
import MobileBottomNav from '@/components/MobileBottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const settings = await getCompanySettings();

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50">
      {/* 1. Desktop Sidebar (hidden on mobile, visible on desktop) */}
      <Sidebar
        role={session.user.role}
        userId={session.user.id}
        companyName={settings.companyName}
        logoUrl={settings.logoUrl}
        userName={session.user.name || 'User'}
        branchName={session.user.branchName}
      />

      {/* 2. Mobile App Top Bar (visible on mobile, hidden on desktop) */}
      <MobileAppHeader
        role={session.user.role}
        userId={session.user.id}
        userName={session.user.name || 'User'}
        companyName={settings.companyName}
        logoUrl={settings.logoUrl}
        branchName={session.user.branchName}
      />

      {/* 3. Main Workspace Area */}
      <main className="flex-1 min-w-0 min-h-screen w-full max-w-full bg-slate-50 transition-all duration-300 ease-in-out overflow-x-hidden">
        <div className="max-w-7xl w-full mx-auto px-2.5 sm:px-6 pt-2 pb-28 md:pb-4 min-w-0">{children}</div>
      </main>

      {/* 4. Native Android Bottom Navigation Bar (visible on mobile, hidden on desktop) */}
      <MobileBottomNav
        role={session.user.role}
        userId={session.user.id}
        userName={session.user.name || 'User'}
        companyName={settings.companyName}
        logoUrl={settings.logoUrl}
        branchName={session.user.branchName}
      />
    </div>
  );
}
