import type { LoanType } from './db';

export type EmploymentType =
  | 'SALARIED'
  | 'SELF_EMPLOYED_PROFESSIONAL'
  | 'SELF_EMPLOYED_BUSINESS'
  | 'CASH_SALARY';

export interface RateMatrixTier {
  id?: string;
  cibilMin: number;
  cibilMax: number;
  loanAmountMin?: number;
  loanAmountMax?: number;
  interestRate: number; // in % p.a. (e.g. 8.50)
  maxFoirPct?: number; // custom FOIR cap for this risk band (e.g. 65%)
  processingFeePct?: number;
  description?: string;
}

export type DynamicFieldType = 'NUMBER' | 'STRING' | 'DROPDOWN' | 'BOOLEAN';

export interface DynamicCriteriaFieldDef {
  key: string; // e.g. 'minAge', 'companyCategory', 'salaryMode'
  label: string; // e.g. 'Minimum Age', 'Employer Category', 'Salary Mode'
  type: DynamicFieldType;
  options?: string[]; // for DROPDOWN
  unit?: string; // 'Years', '₹', 'Months', etc.
  description?: string;
  defaultValue?: unknown;
}

export interface BankPolicyCard {
  id: string;
  tenantId?: string;
  bankName: string; // e.g. 'HDFC Bank', 'State Bank of India', 'ICICI Bank'
  bankCode: string; // e.g. 'HDFC', 'SBI', 'ICICI'
  logoUrl?: string | null;
  loanType: LoanType;
  
  // Core criteria
  minCibil: number;
  maxCibil: number;
  minMonthlyIncome: number;
  maxFoirPct: number; // e.g. 55 for 55%
  allowedIncomeTypes: EmploymentType[];
  minTenureMonths: number;
  maxTenureMonths: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  
  // Pricing
  baseInterestRate: number; // e.g. 8.50
  processingFeePct: number; // e.g. 0.50
  processingFeeFlat?: number; // e.g. 5000
  rateMatrix: RateMatrixTier[]; // Tiered pricing matrix
  
  // Flexible Dynamic Criteria (JSONB)
  dynamicCriteria: Record<string, unknown>;
  
  // Operational metadata
  tatDays: number; // Turnaround time in days
  specialFeatures?: string[]; // e.g. ['Zero Prepayment Charges', 'Digital Paperless Sanction']
  active: boolean;
  priorityWeight?: number; // higher = promoted
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerEvaluationInput {
  customerName?: string;
  loanType: LoanType;
  cibilScore: number;
  monthlyIncome: number;
  existingEmi: number;
  employmentType: EmploymentType;
  requestedAmount: number;
  requestedTenureMonths: number;
  
  // Dynamic fields
  applicantAge?: number;
  companyCategory?: 'SUPER_CAT_A' | 'CAT_A' | 'CAT_B' | 'CAT_C' | 'GOVT' | 'OTHER';
  salaryMode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH';
  locationTier?: 'METRO' | 'TIER_1' | 'TIER_2' | 'TIER_3';
  workExperienceMonths?: number;
  businessVintageMonths?: number;
  propertyType?: 'READY_RESIDENTIAL' | 'UNDER_CONSTRUCTION' | 'PLOT' | 'COMMERCIAL';
  customDynamicValues?: Record<string, unknown>;
}

export type MatchStatus = 'ELIGIBLE' | 'PARTIALLY_ELIGIBLE' | 'INELIGIBLE';

export type RankingCriterion = 'LOWEST_RATE' | 'HIGHEST_AMOUNT' | 'LOWEST_EMI' | 'BEST_MATCH';

export interface PolicyEvaluationResult {
  cardId: string;
  bankName: string;
  bankCode: string;
  logoUrl?: string | null;
  loanType: LoanType;
  status: MatchStatus;
  isEligible: boolean;
  
  // Matched Pricing & Affordability
  mappedInterestRate: number;
  proposedEmi: number;
  maxAffordableLoanAmount: number;
  requestedAmount: number;
  approvedOrRecommendedAmount: number;
  tenureMonths: number;
  
  // FOIR & Ratios
  actualFoirPct: number;
  maxPermissibleFoirPct: number;
  maxPermissibleEmi: number;
  
  // Costs
  processingFeeAmount: number;
  totalInterestPayable: number;
  totalRepaymentAmount: number;
  
  // Reasons & Scores
  passReasons: string[];
  breachReasons: string[];
  approvalLikelihoodScore: number; // 0 to 100
  tatDays: number;
  specialFeatures?: string[];
}

export interface RecommendationSummary {
  input: CustomerEvaluationInput;
  totalBanksEvaluated: number;
  eligibleCount: number;
  partiallyEligibleCount: number;
  ineligibleCount: number;
  results: PolicyEvaluationResult[];
  timestamp: string;
}

export interface CustomerEligibilityOfferBankItem {
  cardId: string;
  bankName: string;
  bankCode: string;
  logoUrl?: string | null;
  status: MatchStatus;
  isBestMatch?: boolean;
  interestRate: number; // in % p.a.
  recommendedAmount: number; // ₹
  proposedEmi: number; // ₹/month
  tenureMonths: number;
  tenureYears: number;
  processingFeeText: string;
  processingFeeAmount: number;
  tatDays: number;
  foirPct: number;
  maxFoirPct: number;
  specialFeatures?: string[];
  passRemarks: string[];
  specialRemarks?: string[];
}

export interface CustomerEligibilityOfferData {
  referenceNumber: string;
  generatedAt: string;
  validUntil: string;
  applicationToken?: string;
  applicationId?: string;
  companyName: string;
  companyTagline?: string;
  supportPhone?: string;
  officialEmail?: string;
  advisorName?: string;
  advisorRole?: string;
  advisorPhone?: string;
  branchName?: string;
  
  // Applicant details
  customerName: string;
  customerMobile?: string;
  customerEmail?: string;
  loanType: LoanType;
  requestedAmount: number;
  requestedTenureYears: number;
  requestedTenureMonths: number;
  monthlyIncome: number;
  existingEmi: number;
  employmentType: EmploymentType;
  cibilScore?: number;
  
  // Underwriting / FOIR benchmarks
  autoFoirCap: number;
  currentFoir: number;
  availableEmiHeadroom: number;
  maxPermissibleObligations: number;
  
  // Evaluated Bank Options
  bankOffers: CustomerEligibilityOfferBankItem[];
  
  // Custom or Operator-added Remarks & Obligation notes
  obligationRemarks?: string;
  specialRemarks?: string;
  
  // Mandatory Important Note
  importantNote: string;
}
