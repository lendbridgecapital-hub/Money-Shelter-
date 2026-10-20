import { getAuthenticatedUser } from '@/lib/auth';
import { getUserById, getUserByEmail, getPartnerByCode, listUsers } from '@/lib/repos/usersRepo';
import { getCompanySettings } from '@/lib/settings';
import { redirect } from 'next/navigation';
import PartnerCertificateView from './PartnerCertificateView';

import type { User } from '@/types/db';

export const metadata = {
  title: 'Channel Partner Certificate of Association — Lendbridge Capital / Money Shelter',
  description: 'Official Certificate of Association for Channel Partner & Sub-DSA Network.',
};

interface Props {
  searchParams: Promise<{
    partnerId?: string;
    id?: string;
    code?: string;
    cert?: string;
    email?: string;
  }>;
}

export default async function PartnerCertificatePage({ searchParams }: Props) {
  const params = await searchParams;
  const currentUser = await getAuthenticatedUser();

  const allUsers = listUsers();
  const allPartners = allUsers.filter(
    (u) => (u.role === 'CHANNEL_PARTNER' || u.role === 'SUB_DSA') && u.partnerStatus === 'APPROVED'
  );

  let targetPartner: User | undefined;

  // 1. Resolve explicitly requested partner from searchParams
  const reqId = params.partnerId || params.id;
  const reqCode = params.code;
  const reqCert = params.cert;
  const reqEmail = params.email;

  if (reqId) {
    targetPartner = getUserById(reqId) || allUsers.find((u) => u.id === reqId);
    if (!targetPartner && (reqId.toLowerCase().includes('tejas') || reqId.toLowerCase().includes('ghorpade'))) {
      targetPartner = allUsers.find(
        (u) => u.id === 'usr_tejas_ghorpade_satara_01' || (u.email && u.email.toLowerCase() === 'ghorpadets@gmail.com')
      );
    }
  }

  if (!targetPartner && reqCode) {
    targetPartner = getPartnerByCode(reqCode);
  }

  if (!targetPartner && reqCert) {
    targetPartner = allUsers.find(
      (u) =>
        (u.certificateNumber && u.certificateNumber.toUpperCase() === reqCert.toUpperCase()) ||
        (u.certificateNumber && u.certificateNumber.includes(reqCert))
    );
  }

  if (!targetPartner && reqEmail) {
    targetPartner = getUserByEmail(reqEmail);
  }

  // 2. If no valid partner requested via URL parameters:
  if (!targetPartner) {
    if (!currentUser) {
      redirect('/login?callbackUrl=' + encodeURIComponent('/partner/certificate'));
    }

    if (currentUser.role === 'CHANNEL_PARTNER' || currentUser.role === 'SUB_DSA') {
      targetPartner = currentUser;
    } else {
      // For Admin / Operations / RM viewing without specific query parameters:
      // Prefer Tejas Suresh Ghorpade (active Sub-DSA) or the first approved partner
      const tejas = allPartners.find(
        (p) => p.id === 'usr_tejas_ghorpade_satara_01' || (p.email && p.email.toLowerCase() === 'ghorpadets@gmail.com')
      );
      targetPartner = tejas || allPartners[0] || currentUser;
    }
  }

  // If partner is not approved, show pending message
  if (
    (targetPartner.role === 'CHANNEL_PARTNER' || targetPartner.role === 'SUB_DSA') &&
    targetPartner.partnerStatus !== 'APPROVED'
  ) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-amber-200 rounded-2xl p-8 text-center shadow-sm space-y-4">
        <span className="text-4xl block">⏳</span>
        <h2 className="text-lg font-bold text-slate-900">Certificate Pending Verification / Approval</h2>
        <p className="text-xs text-slate-500">
          The partner onboarding application for <strong>{targetPartner.name}</strong> is currently pending review by Central Support. Once verified and approved, the official Certificate of Association will be accessible here.
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
  const isViewerAdmin = Boolean(
    currentUser &&
    (currentUser.role === 'ADMIN' ||
     currentUser.role === 'CENTRAL_SUPPORT' ||
     currentUser.role === 'OPERATIONS' ||
     currentUser.role === 'RELATIONSHIP_MANAGER')
  );

  return (
    <PartnerCertificateView
      partner={targetPartner}
      companyName={settings.companyName || 'Money Shelter'}
      allPartners={isViewerAdmin ? allPartners : undefined}
      isViewerAdmin={isViewerAdmin}
      currentUserId={currentUser?.id}
    />
  );
}
