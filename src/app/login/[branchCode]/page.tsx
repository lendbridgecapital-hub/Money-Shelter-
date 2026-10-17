import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getBranchByCodeOrSlug } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import CoBrandedLoginForm from '@/components/CoBrandedLoginForm';
import LendbridgePartnerLoginForm from '@/components/LendbridgePartnerLoginForm';

interface PageProps {
  params: {
    branchCode: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const cleanCode = params.branchCode.toLowerCase();
  if (cleanCode === 'lendbridge' || cleanCode === 'lendbridge-capital' || cleanCode === 'lendbridgecapital') {
    return {
      title: 'Lendbridge Capital — Channel Partner Login',
      description: 'Official Channel Partner & DSA Login Portal for Lendbridge Capital (Satara Branch).',
    };
  }

  const branch = getBranchByCodeOrSlug(params.branchCode);
  const settings = await getCompanySettings();
  if (!branch) {
    return {
      title: `Branch Login | ${settings.companyName}`,
    };
  }
  const name = branch.coBrandName || branch.name;
  return {
    title: `${name} — Partner & Employee Login | ${settings.companyName}`,
    description:
      branch.coBrandTagline ||
      `Co-branded loan origination and partner portal for ${name} in partnership with ${settings.companyName}.`,
  };
}

export default async function CoBrandedLoginPage({ params }: PageProps) {
  const settings = await getCompanySettings();
  const cleanCode = params.branchCode.toLowerCase();

  if (cleanCode === 'lendbridge' || cleanCode === 'lendbridge-capital' || cleanCode === 'lendbridgecapital') {
    return <LendbridgePartnerLoginForm companySettings={settings} />;
  }

  const branch = getBranchByCodeOrSlug(params.branchCode);

  if (!branch) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="text-4xl">🏢</div>
          <h1 className="text-xl font-bold text-slate-900">Branch Portal Not Found</h1>
          <p className="text-xs text-slate-500">
            We could not find an active branch with identifier &ldquo;{params.branchCode}&rdquo;. Please verify the URL or proceed to the main portal login.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Go to Money Shelter Login →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Ensure Satara branch has Lendbridge Capital co-branding and official logo
  if (branch.id === 'br_satara_01' || branch.code === 'STR01' || branch.name.toLowerCase().includes('satara')) {
    branch.isCoBranded = true;
    branch.coBrandName = branch.coBrandName || 'Lendbridge Capital';
    branch.coBrandLogoUrl = branch.coBrandLogoUrl || '/lendbridge-logo.png';
    branch.coBrandTagline = branch.coBrandTagline || 'Co-Branded Regional Partner of Money Shelter';
  }

  return <CoBrandedLoginForm branch={branch} companySettings={settings} />;
}
