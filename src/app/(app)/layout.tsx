import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCompanySettings } from '@/lib/settings';
import { isUserDedicatedSiteRm } from '@/lib/repos/usersRepo';
import { getBranchById } from '@/lib/repos/branchesRepo';
import Sidebar from '@/components/Sidebar';
import MobileAppHeader from '@/components/MobileAppHeader';
import MobileBottomNav from '@/components/MobileBottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const settings = await getCompanySettings();
  const isDedicatedSiteRm =
    session.user.role === 'RELATIONSHIP_MANAGER' ? isUserDedicatedSiteRm(session.user.id) : false;

  let userBranch = session.user.branchId ? getBranchById(session.user.branchId) : undefined;
  if (
    !userBranch &&
    (session.user.email?.toLowerCase().includes('lendbridge') ||
      session.user.email?.toLowerCase().includes('satara') ||
      session.user.name?.toLowerCase().includes('lendbridge') ||
      session.user.name?.toLowerCase().includes('satara'))
  ) {
    userBranch = getBranchById('br_satara_01');
  }

  const isCoBranded = Boolean(userBranch?.isCoBranded && userBranch?.coBrandName);
  const coBrandName = userBranch?.coBrandName || null;
  let coBrandLogoUrl = userBranch?.coBrandLogoUrl || null;

  if (
    coBrandName &&
    coBrandName.toLowerCase().includes('lendbridge') &&
    (!coBrandLogoUrl || coBrandLogoUrl.includes('.svg'))
  ) {
    coBrandLogoUrl = '/lendbridge-logo.png';
  }
  const coBrandTagline = userBranch?.coBrandTagline || null;

  const effectiveBranchId = userBranch?.id || session.user.branchId;

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
        branchId={effectiveBranchId}
        isDedicatedSiteRm={isDedicatedSiteRm}
        isCoBranded={isCoBranded}
        coBrandName={coBrandName}
        coBrandLogoUrl={coBrandLogoUrl}
        coBrandTagline={coBrandTagline}
      />

      {/* 2. Mobile App Top Bar (visible on mobile, hidden on desktop) */}
      <MobileAppHeader
        role={session.user.role}
        userId={session.user.id}
        userName={session.user.name || 'User'}
        companyName={settings.companyName}
        logoUrl={settings.logoUrl}
        branchName={session.user.branchName}
        branchId={effectiveBranchId}
        isDedicatedSiteRm={isDedicatedSiteRm}
        isCoBranded={isCoBranded}
        coBrandName={coBrandName}
        coBrandLogoUrl={coBrandLogoUrl}
        coBrandTagline={coBrandTagline}
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
        isDedicatedSiteRm={isDedicatedSiteRm}
      />
    </div>
  );
}
