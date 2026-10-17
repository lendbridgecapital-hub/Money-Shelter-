import { notFound } from 'next/navigation';
import { getApplicationByToken } from '@/lib/repos/applicationsRepo';
import { getBranchById } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import { listBankPolicyCards } from '@/lib/repos/policyCardsRepo';
import { evaluateCustomerAgainstAllCards } from '@/lib/policyEngine';
import { buildCustomerEligibilityOfferData } from '@/lib/offerPdfHelper';
import type { CustomerEvaluationInput, CustomerEligibilityOfferData } from '@/types/policy';
import EligibilityOfferPublicClient from './EligibilityOfferPublicClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { token: string } }) {
  const application = getApplicationByToken(params.token);
  const branch = application?.branchId ? getBranchById(application.branchId) : null;
  const isSatara = Boolean(
    application?.branchId === 'br_satara_01' ||
    branch?.id === 'br_satara_01' ||
    branch?.code === 'STR01' ||
    application?.isCoBranded ||
    branch?.isCoBranded ||
    application?.coBrandName?.toLowerCase().includes('lendbridge') ||
    branch?.name?.toLowerCase().includes('satara')
  );

  const brandName = isSatara ? 'Lendbridge Capital' : 'Money Shelter';
  return {
    title: application?.fullName
      ? `Loan Eligibility Offer — ${application.fullName} | ${brandName}`
      : `Loan Eligibility Offer | ${brandName}`,
    description: `Official tentative loan eligibility assessment and multi-bank offer letter by ${brandName}.`,
    openGraph: {
      title: application?.fullName
        ? `Loan Eligibility Offer — ${application.fullName} | ${brandName}`
        : `Loan Eligibility Offer | ${brandName}`,
      description: `Official tentative loan eligibility assessment and multi-bank offer letter by ${brandName}.`,
      siteName: brandName,
      images: isSatara ? [{ url: 'https://money-shelter.onrender.com/lendbridge-logo.png' }] : undefined,
    },
  };
}

export default async function EligibilityOfferPublicPage({
  params,
}: {
  params: { token: string };
}) {
  const application = getApplicationByToken(params.token);

  if (!application) {
    // If not found, check if it's a demo or invalid token
    notFound();
  }

  const tenantId = application.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);

  let offerData: CustomerEligibilityOfferData;

  // 1. If stored JSON exists, use it
  if (application.eligibilityOfferJson) {
    try {
      offerData = JSON.parse(application.eligibilityOfferJson);
    } catch {
      offerData = null as any;
    }
  }

  // 2. Otherwise generate dynamically from active bank cards
  if (!offerData!) {
    const loanType = application.loanType || 'HOME_LOAN';
    const monthlyIncome = Number(application.monthlyIncome || 50000);
    const existingEmi = Number(application.existingEmi || 0);
    const requestedAmount = Number(application.loanAmount || 1000000);
    const requestedTenureMonths = application.tenureMonths || 240;

    const input: CustomerEvaluationInput = {
      customerName: application.fullName || undefined,
      loanType,
      cibilScore: 750,
      monthlyIncome,
      existingEmi,
      requestedAmount,
      requestedTenureMonths,
      employmentType: 'SALARIED',
    };

    const cards = listBankPolicyCards(tenantId, loanType, true);
    const summary = evaluateCustomerAgainstAllCards(input, cards, 'LOWEST_RATE');

    offerData = buildCustomerEligibilityOfferData({
      application,
      input,
      summary,
      settings,
      advisor: {
        name: application.relationshipManagerName || application.channelPartnerName || `${settings.companyName || 'Money Shelter'} Senior Credit Advisor`,
        role: application.relationshipManagerName ? 'Relationship Manager' : 'Financial Advisor',
        phone: '+91 98765 43210',
        branchName: application.branchName || 'Pune Bavdhan HQ',
      },
    });
  }

  return <EligibilityOfferPublicClient offerData={offerData} />;
}
