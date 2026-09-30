import { requireUser } from '@/lib/auth';
import { getUserById } from '@/lib/repos/usersRepo';
import { getCompanySettings } from '@/lib/settings';
import { redirect } from 'next/navigation';
import PartnerCertificateView from './PartnerCertificateView';

import type { User } from '@/types/db';

export const metadata = {
  title: 'Channel Partner Certificate of Association — Quickfinsure',
  description: 'Official Certificate of Association for Quickfinsure Channel Partner & Sub-DSA Network.',
};

interface Props {
  searchParams: Promise<{ partnerId?: string }>;
}

export default async function PartnerCertificatePage({ searchParams }: Props) {
  const user = await requireUser();
  const params = await searchParams;

  let targetPartner: User = user;
  if (params.partnerId && (user.role === 'ADMIN' || user.role === 'CENTRAL_SUPPORT' || user.role === 'OPERATIONS' || user.role === 'RELATIONSHIP_MANAGER')) {
    const requested = getUserById(params.partnerId);
    if (requested && requested.role === 'CHANNEL_PARTNER') {
      targetPartner = requested;
    }
  }

  // If partner is not approved, show pending message
  if (targetPartner.role === 'CHANNEL_PARTNER' && targetPartner.partnerStatus !== 'APPROVED') {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-amber-200 rounded-2xl p-8 text-center shadow-sm space-y-4">
        <span className="text-4xl block">⏳</span>
        <h2 className="text-lg font-bold text-slate-900">Certificate Pending Central Support Approval</h2>
        <p className="text-xs text-slate-500">
          Your Channel Partner onboarding application is currently under review by Central Support. Once verified and approved, your official Certificate of Association will be generated here.
        </p>
        <div className="pt-2">
          <a
            href="/dashboard"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            ← Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const settings = await getCompanySettings(targetPartner.tenantId || 'default');

  return (
    <PartnerCertificateView
      partner={targetPartner}
      companyName={settings.companyName || 'Quickfinsure'}
    />
  );
}
