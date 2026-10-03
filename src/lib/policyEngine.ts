import type {
  BankPolicyCard,
  CustomerEvaluationInput,
  PolicyEvaluationResult,
  RecommendationSummary,
  MatchStatus,
  RateMatrixTier,
  RankingCriterion,
} from '@/types/policy';

export type { RankingCriterion };

/**
 * Standard EMI Amortization Formula:
 * E = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * where r is monthly interest rate, n is tenure in months.
 */
export function calculateEMI(principal: number, annualRatePct: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRatePct <= 0) return Math.round(principal / tenureMonths);

  const monthlyRate = annualRatePct / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi);
}

/**
 * Reverse Amortization:
 * Calculates the maximum loan principal amount that fits within a given monthly EMI budget.
 * P = E * ((1 + r)^n - 1) / (r * (1 + r)^n)
 */
export function calculateMaxAffordableLoan(
  maxPermissibleMonthlyEmi: number,
  annualRatePct: number,
  tenureMonths: number
): number {
  if (maxPermissibleMonthlyEmi <= 0 || tenureMonths <= 0) return 0;
  if (annualRatePct <= 0) return Math.round(maxPermissibleMonthlyEmi * tenureMonths);

  const monthlyRate = annualRatePct / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const maxPrincipal = (maxPermissibleMonthlyEmi * (factor - 1)) / (monthlyRate * factor);
  return Math.max(0, Math.floor(maxPrincipal));
}

/**
 * Finds the applicable interest rate and custom FOIR cap from the bank's tiered rate matrix.
 */
export function mapApplicableRateAndFoir(
  card: BankPolicyCard,
  cibilScore: number,
  requestedAmount: number
): { mappedRate: number; maxFoirPct: number; tierDescription?: string } {
  const tiers: RateMatrixTier[] = Array.isArray(card.rateMatrix) ? card.rateMatrix : [];

  for (const tier of tiers) {
    const cibilMatch = cibilScore >= tier.cibilMin && cibilScore <= tier.cibilMax;
    const amountMatch =
      (tier.loanAmountMin === undefined || requestedAmount >= tier.loanAmountMin) &&
      (tier.loanAmountMax === undefined || requestedAmount <= tier.loanAmountMax);

    if (cibilMatch && amountMatch) {
      return {
        mappedRate: tier.interestRate,
        maxFoirPct: tier.maxFoirPct || card.maxFoirPct,
        tierDescription: tier.description,
      };
    }
  }

  // Fallback to base card parameters
  return {
    mappedRate: card.baseInterestRate,
    maxFoirPct: card.maxFoirPct,
    tierDescription: 'Standard Base Policy Tier',
  };
}

/**
 * Evaluates a customer's intake profile against a single Bank Policy Card.
 */
export function evaluateCustomerAgainstCard(
  input: CustomerEvaluationInput,
  card: BankPolicyCard
): PolicyEvaluationResult {
  const passReasons: string[] = [];
  const breachReasons: string[] = [];

  const requestedAmount = Number(input.requestedAmount || 0);
  const tenureMonths = Math.min(
    Number(input.requestedTenureMonths || card.maxTenureMonths),
    card.maxTenureMonths
  );

  // 1. CIBIL Score Validation
  const cibil = Number(input.cibilScore || 0);
  if (cibil < card.minCibil) {
    breachReasons.push(`CIBIL score ${cibil} is below bank minimum threshold of ${card.minCibil}.`);
  } else if (cibil > card.maxCibil) {
    breachReasons.push(`CIBIL score ${cibil} exceeds allowed range max (${card.maxCibil}).`);
  } else {
    passReasons.push(`CIBIL score ${cibil} meets criteria (Min: ${card.minCibil}).`);
  }

  // 2. Minimum Monthly Income Validation
  const income = Number(input.monthlyIncome || 0);
  if (income < card.minMonthlyIncome) {
    breachReasons.push(
      `Monthly income ₹${income.toLocaleString('en-IN')} is below required minimum ₹${card.minMonthlyIncome.toLocaleString('en-IN')}.`
    );
  } else {
    passReasons.push(
      `Monthly income ₹${income.toLocaleString('en-IN')} satisfies minimum ₹${card.minMonthlyIncome.toLocaleString('en-IN')}.`
    );
  }

  // 3. Employment / Income Type
  const empType = input.employmentType;
  const allowedEmpTypes = Array.isArray(card.allowedIncomeTypes) ? card.allowedIncomeTypes : ['SALARIED'];
  if (!allowedEmpTypes.includes(empType)) {
    const formattedTypes = allowedEmpTypes.map((t) => t.replace(/_/g, ' ')).join(', ');
    breachReasons.push(`Employment type '${empType.replace(/_/g, ' ')}' is not accepted. (Eligible: ${formattedTypes}).`);
  } else {
    passReasons.push(`Employment type '${empType.replace(/_/g, ' ')}' is supported.`);
  }

  // 4. Loan Tenure Validation
  if (input.requestedTenureMonths > card.maxTenureMonths) {
    breachReasons.push(
      `Requested tenure of ${input.requestedTenureMonths}m exceeds maximum bank cap of ${card.maxTenureMonths}m.`
    );
  } else {
    passReasons.push(`Tenure of ${tenureMonths}m is within permissible limit (${card.maxTenureMonths}m max).`);
  }

  // 5. Dynamic Criteria Checks (Age, Company Category, Salary Mode, Location)
  const dyn = card.dynamicCriteria || {};

  // 5a. Age Check
  if (input.applicantAge !== undefined && input.applicantAge > 0) {
    const minAge = typeof dyn.minAge === 'number' ? dyn.minAge : 21;
    const maxAge = typeof dyn.maxAge === 'number' ? dyn.maxAge : 65;
    if (input.applicantAge < minAge) {
      breachReasons.push(`Applicant age ${input.applicantAge} is below minimum requirement (${minAge} years).`);
    } else if (input.applicantAge > maxAge) {
      breachReasons.push(`Applicant age ${input.applicantAge} exceeds maximum age at maturity (${maxAge} years).`);
    } else {
      passReasons.push(`Applicant age (${input.applicantAge} years) is within policy limits (${minAge}-${maxAge}).`);
    }
  }

  // 5b. Company Category Check
  if (input.companyCategory && Array.isArray(dyn.allowedCompanyCategories)) {
    const allowedCats = dyn.allowedCompanyCategories as string[];
    if (!allowedCats.includes('ALL') && !allowedCats.includes(input.companyCategory)) {
      breachReasons.push(
        `Employer category '${input.companyCategory}' is outside approved list (${allowedCats.join(', ')}).`
      );
    } else {
      passReasons.push(`Employer category (${input.companyCategory}) is eligible for corporate rates.`);
    }
  }

  // 5c. Salary Mode Check
  if (input.salaryMode && Array.isArray(dyn.allowedSalaryModes)) {
    const allowedModes = dyn.allowedSalaryModes as string[];
    if (!allowedModes.includes(input.salaryMode)) {
      breachReasons.push(
        `Salary credit mode '${input.salaryMode.replace(/_/g, ' ')}' is not accepted. Bank requires ${allowedModes.join(', ')}.`
      );
    } else {
      passReasons.push(`Salary credit mode (${input.salaryMode}) meets verification standard.`);
    }
  }

  // 5d. Work Experience / Vintage
  if (input.workExperienceMonths !== undefined && typeof dyn.minWorkExperienceMonths === 'number') {
    if (input.workExperienceMonths < dyn.minWorkExperienceMonths) {
      breachReasons.push(
        `Work experience (${input.workExperienceMonths}m) is below mandatory vintage (${dyn.minWorkExperienceMonths}m).`
      );
    }
  }
  if (input.businessVintageMonths !== undefined && typeof dyn.minBusinessVintageMonths === 'number') {
    if (input.businessVintageMonths < dyn.minBusinessVintageMonths) {
      breachReasons.push(
        `Business operational vintage (${input.businessVintageMonths}m) is below mandatory threshold (${dyn.minBusinessVintageMonths}m).`
      );
    }
  }

  // 6. Interest Rate Mapping & Tier Resolution
  const { mappedRate, maxFoirPct: effectiveMaxFoir, tierDescription } = mapApplicableRateAndFoir(
    card,
    cibil,
    requestedAmount
  );
  if (tierDescription) {
    passReasons.push(`Mapped to ${tierDescription} at ${mappedRate.toFixed(2)}% p.a.`);
  }

  // 7. FOIR (Fixed Obligation to Income Ratio) & Loan Affordability Computation
  const existingEmi = Number(input.existingEmi || 0);
  const maxTotalAllowedObligation = (income * effectiveMaxFoir) / 100;
  const maxAvailableMonthlyEmi = Math.max(0, maxTotalAllowedObligation - existingEmi);

  // Compute proposed EMI for requested amount
  const proposedEmi = calculateEMI(requestedAmount, mappedRate, tenureMonths);
  const totalObligationsWithNewLoan = existingEmi + proposedEmi;
  const actualFoirPct = income > 0 ? Number(((totalObligationsWithNewLoan / income) * 100).toFixed(1)) : 100;

  // Compute max affordable loan amount within the permissible monthly EMI
  const maxAffordableLoanAmount = calculateMaxAffordableLoan(maxAvailableMonthlyEmi, mappedRate, tenureMonths);

  let status: MatchStatus = 'ELIGIBLE';
  let approvedOrRecommendedAmount = requestedAmount;

  if (breachReasons.length > 0) {
    status = 'INELIGIBLE';
  } else if (maxAvailableMonthlyEmi <= 0) {
    status = 'INELIGIBLE';
    const currentFoir = income > 0 ? ((existingEmi / income) * 100).toFixed(1) : '100';
    breachReasons.push(
      `Existing obligations (₹${existingEmi.toLocaleString('en-IN')}) already consume ${currentFoir}% of income, exceeding max FOIR cap of ${effectiveMaxFoir}%.`
    );
  } else if (actualFoirPct > effectiveMaxFoir) {
    // Customer can be partially approved for an affordable amount
    status = 'PARTIALLY_ELIGIBLE';
    approvedOrRecommendedAmount = Math.min(card.maxLoanAmount, maxAffordableLoanAmount);
    breachReasons.push(
      `Requested loan of ₹${requestedAmount.toLocaleString('en-IN')} pushes FOIR to ${actualFoirPct}% (Max permissible: ${effectiveMaxFoir}%). Sanctionable up to ₹${approvedOrRecommendedAmount.toLocaleString('en-IN')}.`
    );
  } else if (requestedAmount > card.maxLoanAmount) {
    status = 'PARTIALLY_ELIGIBLE';
    approvedOrRecommendedAmount = card.maxLoanAmount;
    breachReasons.push(
      `Requested amount ₹${requestedAmount.toLocaleString('en-IN')} exceeds bank policy ceiling (₹${card.maxLoanAmount.toLocaleString('en-IN')}).`
    );
  } else if (requestedAmount < card.minLoanAmount) {
    status = 'INELIGIBLE';
    breachReasons.push(
      `Requested amount ₹${requestedAmount.toLocaleString('en-IN')} is below bank ticket floor (₹${card.minLoanAmount.toLocaleString('en-IN')}).`
    );
  } else {
    passReasons.push(
      `FOIR with proposed loan is ${actualFoirPct}% (within max ceiling of ${effectiveMaxFoir}%).`
    );
  }

  // 8. Financial Calculations (Processing Fee, Total Interest, Total Payment)
  const processingFeePctAmount = (approvedOrRecommendedAmount * card.processingFeePct) / 100;
  const processingFeeAmount = Math.round(
    card.processingFeeFlat ? Math.max(card.processingFeeFlat, processingFeePctAmount) : processingFeePctAmount
  );
  const finalEmi = calculateEMI(approvedOrRecommendedAmount, mappedRate, tenureMonths);
  const totalRepaymentAmount = finalEmi * tenureMonths;
  const totalInterestPayable = Math.max(0, totalRepaymentAmount - approvedOrRecommendedAmount);

  // 9. Match Confidence & Approval Likelihood Score (0 to 100)
  let approvalLikelihoodScore = 50;
  if (status === 'ELIGIBLE') {
    approvalLikelihoodScore = 75;
    if (cibil >= 780) approvalLikelihoodScore += 15;
    else if (cibil >= 750) approvalLikelihoodScore += 10;
    if (actualFoirPct <= effectiveMaxFoir - 15) approvalLikelihoodScore += 10;
    if (income >= card.minMonthlyIncome * 2) approvalLikelihoodScore += 5;
  } else if (status === 'PARTIALLY_ELIGIBLE') {
    approvalLikelihoodScore = 60;
    if (cibil >= 750) approvalLikelihoodScore += 10;
  } else {
    approvalLikelihoodScore = Math.max(10, 40 - breachReasons.length * 10);
  }
  approvalLikelihoodScore = Math.min(99, Math.max(5, approvalLikelihoodScore));

  return {
    cardId: card.id,
    bankName: card.bankName,
    bankCode: card.bankCode,
    logoUrl: card.logoUrl,
    loanType: card.loanType,
    status,
    isEligible: status === 'ELIGIBLE' || status === 'PARTIALLY_ELIGIBLE',
    mappedInterestRate: Number(mappedRate.toFixed(2)),
    proposedEmi: status === 'ELIGIBLE' ? proposedEmi : finalEmi,
    maxAffordableLoanAmount,
    requestedAmount,
    approvedOrRecommendedAmount,
    tenureMonths,
    actualFoirPct,
    maxPermissibleFoirPct: effectiveMaxFoir,
    maxPermissibleEmi: Math.round(maxAvailableMonthlyEmi),
    processingFeeAmount,
    totalInterestPayable,
    totalRepaymentAmount,
    passReasons,
    breachReasons,
    approvalLikelihoodScore,
    tatDays: card.tatDays || 3,
    specialFeatures: card.specialFeatures || [],
  };
}

/**
 * Runs the customer profile against all active Bank Cards and returns a ranked recommendation matrix.
 */
export function evaluateCustomerAgainstAllCards(
  input: CustomerEvaluationInput,
  cards: BankPolicyCard[],
  rankBy: RankingCriterion = 'LOWEST_RATE'
): RecommendationSummary {
  // Filter for matching loan type
  const matchingCards = cards.filter(
    (c) => c.active && (c.loanType === input.loanType || !input.loanType)
  );

  const evaluations = matchingCards.map((card) => evaluateCustomerAgainstCard(input, card));

  // Sort based on chosen ranking criteria
  evaluations.sort((a, b) => {
    // 1. Group by eligibility status: ELIGIBLE > PARTIALLY_ELIGIBLE > INELIGIBLE
    const statusWeight: Record<MatchStatus, number> = {
      ELIGIBLE: 3,
      PARTIALLY_ELIGIBLE: 2,
      INELIGIBLE: 1,
    };
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[b.status] - statusWeight[a.status];
    }

    // 2. Secondary sort within same eligibility tier
    switch (rankBy) {
      case 'LOWEST_RATE':
        return a.mappedInterestRate - b.mappedInterestRate;
      case 'HIGHEST_AMOUNT':
        return b.approvedOrRecommendedAmount - a.approvedOrRecommendedAmount;
      case 'LOWEST_EMI':
        return a.proposedEmi - b.proposedEmi;
      case 'BEST_MATCH':
      default:
        return b.approvalLikelihoodScore - a.approvalLikelihoodScore;
    }
  });

  const eligibleCount = evaluations.filter((e) => e.status === 'ELIGIBLE').length;
  const partiallyEligibleCount = evaluations.filter((e) => e.status === 'PARTIALLY_ELIGIBLE').length;
  const ineligibleCount = evaluations.filter((e) => e.status === 'INELIGIBLE').length;

  return {
    input,
    totalBanksEvaluated: matchingCards.length,
    eligibleCount,
    partiallyEligibleCount,
    ineligibleCount,
    results: evaluations,
    timestamp: new Date().toISOString(),
  };
}
