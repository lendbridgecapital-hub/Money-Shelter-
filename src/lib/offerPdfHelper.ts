import type { LoanApplication, CompanySettings } from '@/types/db';
import type {
  CustomerEvaluationInput,
  RecommendationSummary,
  CustomerEligibilityOfferData,
  CustomerEligibilityOfferBankItem,
} from '@/types/policy';
import { getSalarySlabFoirCap } from '@/lib/policyEngine';
import { LOAN_TYPE_LABELS, formatCurrencyINR } from '@/lib/format';

export const MANDATORY_IMPORTANT_NOTE =
  'Please note that this loan eligibility offer is based on the preliminary financial data provided by you and standard institutional lending criteria of the respective banks/NBFCs. All terms, including indicative interest rates, eligible loan amount, processing fees, and tenure, might get changed. This is a tentative offer and the final offer will be based on the final bank\'s sanction, credit appraisal, and verification of original documents.';

export function buildCustomerEligibilityOfferData(params: {
  application?: LoanApplication | null;
  input: CustomerEvaluationInput;
  summary: RecommendationSummary;
  settings?: Partial<CompanySettings>;
  advisor?: {
    name?: string;
    role?: string;
    phone?: string;
    branchName?: string;
  };
  customObligationRemarks?: string;
  customSpecialRemarks?: string;
}): CustomerEligibilityOfferData {
  const { application, input, summary, settings, advisor, customObligationRemarks, customSpecialRemarks } = params;

  const now = new Date();
  const validUntilDate = new Date();
  validUntilDate.setDate(now.getDate() + 15); // Valid 15 days

  const appToken = application?.token || '';
  const tokenSuffix = appToken ? appToken.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() : Math.floor(1000 + Math.random() * 9000).toString();
  const referenceNumber = `QFS-OFFER-${now.getFullYear()}-${tokenSuffix}`;

  const monthlyIncome = Number(input.monthlyIncome || application?.monthlyIncome || 0);
  const existingEmi = Number(input.existingEmi ?? application?.existingEmi ?? 0);
  const requestedAmount = Number(input.requestedAmount || application?.loanAmount || 0);
  const requestedTenureMonths = Number(input.requestedTenureMonths || application?.tenureMonths || 240);
  const requestedTenureYears = Math.round(requestedTenureMonths / 12);

  const autoFoirCap = getSalarySlabFoirCap(monthlyIncome);
  const maxPermissibleObligations = Math.round((monthlyIncome * autoFoirCap) / 100);
  const availableEmiHeadroom = Math.max(0, maxPermissibleObligations - existingEmi);
  const currentFoir = monthlyIncome > 0 ? Number(((existingEmi / monthlyIncome) * 100).toFixed(1)) : 0;

  // Format eligible and partial bank offers
  const eligibleResults = summary.results.filter((r) => r.status === 'ELIGIBLE' || r.status === 'PARTIALLY_ELIGIBLE');
  const offersList: CustomerEligibilityOfferBankItem[] = eligibleResults.map((res, index) => {
    let feeText = 'Standard Bank Charges';
    if (res.processingFeeAmount > 0) {
      feeText = `₹${res.processingFeeAmount.toLocaleString('en-IN')}`;
    }

    return {
      cardId: res.cardId,
      bankName: res.bankName,
      bankCode: res.bankCode,
      logoUrl: res.logoUrl,
      status: res.status,
      isBestMatch: index === 0 && res.isEligible,
      interestRate: res.mappedInterestRate,
      recommendedAmount: res.approvedOrRecommendedAmount,
      proposedEmi: res.proposedEmi,
      tenureMonths: res.tenureMonths,
      tenureYears: Math.round(res.tenureMonths / 12),
      processingFeeText: feeText,
      processingFeeAmount: res.processingFeeAmount,
      tatDays: res.tatDays || 3,
      foirPct: res.actualFoirPct,
      maxFoirPct: res.maxPermissibleFoirPct,
      specialFeatures: res.specialFeatures || [],
      passRemarks: res.passReasons || [],
      specialRemarks: res.breachReasons || [],
    };
  });

  // Default Obligation Analysis Remark
  let defaultObligationRemark = '';
  if (existingEmi > 0) {
    defaultObligationRemark = `Applicant has declared ongoing monthly EMI obligations of ₹${existingEmi.toLocaleString('en-IN')} (${currentFoir}% of gross monthly income). Factoring an institutional FOIR cap of ${autoFoirCap}%, you retain ₹${availableEmiHeadroom.toLocaleString('en-IN')}/month in disposable EMI headroom. The offered loan limits are carefully matched to ensure comfortable debt servicing without strain.`;
  } else {
    defaultObligationRemark = `Applicant reports zero active monthly debt obligations. 100% of the permissible FOIR allowance (₹${availableEmiHeadroom.toLocaleString('en-IN')}/month headroom) is fully available for fresh borrowing, qualifying for prime sanction limits.`;
  }

  // Default Special Remark / Document Guidance
  const defaultSpecialRemark =
    'Standard pre-sanction requirements: Latest 3 months salary slips / 2 years ITR, 6 months banking statements from primary operating account, KYC documents (PAN & Aadhaar), and property/business verification documents where applicable.';

  const advisorName = advisor?.name || application?.relationshipManagerName || application?.channelPartnerName || 'Quickfinsure Senior Credit Advisor';
  const advisorRole = advisor?.role || (application?.relationshipManagerName ? 'Relationship Manager' : 'Financial Advisor');
  const advisorPhone = advisor?.phone || '+91 98765 43210';
  const branchName = advisor?.branchName || application?.branchName || 'Pune Bavdhan HQ';

  return {
    referenceNumber,
    generatedAt: now.toISOString(),
    validUntil: validUntilDate.toISOString(),
    applicationToken: appToken,
    applicationId: application?.id,
    companyName: settings?.companyName || 'Quickfinsure Solutions',
    companyTagline: settings?.tagline || 'Licensed DSA Partner & Multi-Bank Syndication Network',
    supportPhone: settings?.supportPhone || '+91 98765 43210',
    officialEmail: settings?.officialEmail || 'support@quickfinsure.com',
    advisorName,
    advisorRole,
    advisorPhone,
    branchName,

    customerName: input.customerName || application?.fullName || 'Valued Customer',
    customerMobile: application?.mobile || undefined,
    customerEmail: application?.email || undefined,
    loanType: input.loanType || application?.loanType || 'HOME_LOAN',
    requestedAmount,
    requestedTenureYears,
    requestedTenureMonths,
    monthlyIncome,
    existingEmi,
    employmentType: input.employmentType || 'SALARIED',
    cibilScore: input.cibilScore,

    autoFoirCap,
    currentFoir,
    availableEmiHeadroom,
    maxPermissibleObligations,

    bankOffers: offersList,
    obligationRemarks: customObligationRemarks || defaultObligationRemark,
    specialRemarks: customSpecialRemarks || defaultSpecialRemark,

    importantNote: MANDATORY_IMPORTANT_NOTE,
  };
}

export function generateWhatsAppShareUrl(
  offerData: CustomerEligibilityOfferData,
  publicShareUrl: string
): string {
  const bestOffer = offerData.bankOffers[0];
  const loanLabel = LOAN_TYPE_LABELS[offerData.loanType] || offerData.loanType;

  let text = `Hello *${offerData.customerName}*,\n\n`;
  text += `Here is your official *Loan Eligibility & Tentative Bank Offer* from *${offerData.companyName}*:\n\n`;
  text += `📋 *Loan Category:* ${loanLabel}\n`;
  text += `💰 *Requested Loan:* ${formatCurrencyINR(offerData.requestedAmount)}\n`;
  text += `⏱️ *Preferred Tenure:* ${offerData.requestedTenureYears} Years\n\n`;

  if (bestOffer) {
    text += `⭐ *Best Matching Bank Offer:*\n`;
    text += `🏦 *Bank:* ${bestOffer.bankName}\n`;
    text += `📈 *Indicative Interest Rate:* ${bestOffer.interestRate.toFixed(2)}% p.a.\n`;
    text += `💵 *Estimated Monthly EMI:* ₹${Math.round(bestOffer.proposedEmi).toLocaleString('en-IN')}/mo\n`;
    text += `🎯 *Sanction Limit:* ${formatCurrencyINR(bestOffer.recommendedAmount)}\n\n`;
  }

  text += `⚠️ *IMPORTANT NOTE:*\n${offerData.importantNote}\n\n`;
  text += `📄 *View & Download Full Official PDF Offer Report:*\n${publicShareUrl}\n\n`;
  text += `📞 *Your Financial Advisor:* ${offerData.advisorName} (${offerData.advisorPhone})\n`;
  text += `Office: ${offerData.branchName}`;

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
