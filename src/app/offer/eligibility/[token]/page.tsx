import { notFound } from 'next/navigation';
import { getApplicationByToken } from '@/lib/repos/applicationsRepo';
import { getCompanySettings } from '@/lib/settings';
import { listBankPolicyCards } from '@/lib/repos/policyCardsRepo';
import { evaluateCustomerAgainstAllCards } from '@/lib/policyEngine';
import { buildCustomerEligibilityOfferData } from '@/lib/offerPdfHelper';
import type { CustomerEvaluationInput, CustomerEligibilityOfferData } from '@/types/policy';
import EligibilityOfferPublicClient from './EligibilityOfferPublicClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { token: string } }) {
  const application = getApplicationByToken(params.token);
  return {
    title: application?.fullName
      ? `Loan Eligibility Offer — ${application.fullName} | Money Shelter`
      : 'Loan Eligibility Offer | Money Shelter',
    description: 'Official tentative loan eligibility assessment and multi-bank offer letter.',
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
