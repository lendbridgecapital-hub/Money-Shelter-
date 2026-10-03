import crypto from 'crypto';
import { db } from '@/lib/db';
import type { BankPolicyCard, DynamicCriteriaFieldDef, RateMatrixTier, EmploymentType } from '@/types/policy';
import type { LoanType } from '@/types/db';

export function listBankPolicyCards(
  tenantId = 'default',
  loanType?: LoanType,
  onlyActive = false
): BankPolicyCard[] {
  let rows: Record<string, unknown>[] = [];
  try {
    if (loanType) {
      rows = db
        .prepare('SELECT * FROM bank_policy_cards WHERE (tenant_id = ? OR tenant_id = \'default\') AND loan_type = ? ORDER BY priority_weight DESC, base_interest_rate ASC, created_at DESC')
        .all(tenantId, loanType) as Record<string, unknown>[];
    } else {
      rows = db
        .prepare('SELECT * FROM bank_policy_cards WHERE (tenant_id = ? OR tenant_id = \'default\') ORDER BY priority_weight DESC, base_interest_rate ASC, created_at DESC')
        .all(tenantId) as Record<string, unknown>[];
    }
  } catch {
    rows = [];
  }

  // Self-heal with initial default policies if table is empty
  if (rows.length === 0) {
    seedDefaultBankPolicyCards('default');
    try {
      if (loanType) {
        rows = db
          .prepare('SELECT * FROM bank_policy_cards WHERE (tenant_id = ? OR tenant_id = \'default\') AND loan_type = ? ORDER BY priority_weight DESC, base_interest_rate ASC, created_at DESC')
          .all(tenantId, loanType) as Record<string, unknown>[];
      } else {
        rows = db
          .prepare('SELECT * FROM bank_policy_cards WHERE (tenant_id = ? OR tenant_id = \'default\') ORDER BY priority_weight DESC, base_interest_rate ASC, created_at DESC')
          .all(tenantId) as Record<string, unknown>[];
      }
    } catch {}
  }

  const cards = rows.map(mapRowToCard);
  if (onlyActive) {
    return cards.filter((c) => c.active);
  }
  return cards;
}

export function getBankPolicyCardById(id: string): BankPolicyCard | undefined {
  try {
    const row = db.prepare('SELECT * FROM bank_policy_cards WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? mapRowToCard(row) : undefined;
  } catch {
    return undefined;
  }
}

export function createBankPolicyCard(data: {
  tenantId?: string;
  bankName: string;
  bankCode: string;
  logoUrl?: string | null;
  loanType: LoanType;
  minCibil: number;
  maxCibil: number;
  minMonthlyIncome: number;
  maxFoirPct: number;
  allowedIncomeTypes: EmploymentType[];
  minTenureMonths: number;
  maxTenureMonths: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  baseInterestRate: number;
  processingFeePct: number;
  processingFeeFlat?: number;
  rateMatrix?: RateMatrixTier[];
  dynamicCriteria?: Record<string, unknown>;
  tatDays?: number;
  specialFeatures?: string[];
  active?: boolean;
  priorityWeight?: number;
}): BankPolicyCard {
  const id = `bpc_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';

  const cleanRateMatrix = JSON.stringify(data.rateMatrix || []);
  const cleanDynamicCriteria = JSON.stringify(data.dynamicCriteria || {});
  const cleanAllowedIncomeTypes = JSON.stringify(data.allowedIncomeTypes || ['SALARIED']);
  const cleanSpecialFeatures = JSON.stringify(data.specialFeatures || []);

  db.prepare(
    `INSERT INTO bank_policy_cards (
      id, tenant_id, bank_name, bank_code, logo_url, loan_type,
      min_cibil, max_cibil, min_monthly_income, max_foir_pct,
      allowed_income_types, min_tenure_months, max_tenure_months,
      min_loan_amount, max_loan_amount, base_interest_rate,
      processing_fee_pct, processing_fee_flat, rate_matrix,
      dynamic_criteria, tat_days, special_features, active, priority_weight,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tenantId,
    data.bankName.trim(),
    data.bankCode.trim().toUpperCase(),
    data.logoUrl || null,
    data.loanType,
    Number(data.minCibil),
    Number(data.maxCibil),
    Number(data.minMonthlyIncome),
    Number(data.maxFoirPct),
    cleanAllowedIncomeTypes,
    Number(data.minTenureMonths),
    Number(data.maxTenureMonths),
    Number(data.minLoanAmount),
    Number(data.maxLoanAmount),
    Number(data.baseInterestRate),
    Number(data.processingFeePct),
    data.processingFeeFlat !== undefined ? Number(data.processingFeeFlat) : null,
    cleanRateMatrix,
    cleanDynamicCriteria,
    data.tatDays ? Number(data.tatDays) : 3,
    cleanSpecialFeatures,
    data.active !== false ? 1 : 0,
    data.priorityWeight ? Number(data.priorityWeight) : 0,
    now,
    now
  );

  const created = getBankPolicyCardById(id);
  if (!created) throw new Error('Failed to create bank policy card');
  return created;
}

export function updateBankPolicyCard(
  id: string,
  data: Partial<Omit<BankPolicyCard, 'id' | 'createdAt'>>
): BankPolicyCard {
  const existing = getBankPolicyCardById(id);
  if (!existing) throw new Error('Bank policy card not found');

  const now = new Date().toISOString();
  const updates: string[] = ['updated_at = ?'];
  const params: unknown[] = [now];

  if (data.bankName !== undefined) {
    updates.push('bank_name = ?');
    params.push(data.bankName.trim());
  }
  if (data.bankCode !== undefined) {
    updates.push('bank_code = ?');
    params.push(data.bankCode.trim().toUpperCase());
  }
  if (data.logoUrl !== undefined) {
    updates.push('logo_url = ?');
    params.push(data.logoUrl);
  }
  if (data.loanType !== undefined) {
    updates.push('loan_type = ?');
    params.push(data.loanType);
  }
  if (data.minCibil !== undefined) {
    updates.push('min_cibil = ?');
    params.push(Number(data.minCibil));
  }
  if (data.maxCibil !== undefined) {
    updates.push('max_cibil = ?');
    params.push(Number(data.maxCibil));
  }
  if (data.minMonthlyIncome !== undefined) {
    updates.push('min_monthly_income = ?');
    params.push(Number(data.minMonthlyIncome));
  }
  if (data.maxFoirPct !== undefined) {
    updates.push('max_foir_pct = ?');
    params.push(Number(data.maxFoirPct));
  }
  if (data.allowedIncomeTypes !== undefined) {
    updates.push('allowed_income_types = ?');
    params.push(JSON.stringify(data.allowedIncomeTypes));
  }
  if (data.minTenureMonths !== undefined) {
    updates.push('min_tenure_months = ?');
    params.push(Number(data.minTenureMonths));
  }
  if (data.maxTenureMonths !== undefined) {
    updates.push('max_tenure_months = ?');
    params.push(Number(data.maxTenureMonths));
  }
  if (data.minLoanAmount !== undefined) {
    updates.push('min_loan_amount = ?');
    params.push(Number(data.minLoanAmount));
  }
  if (data.maxLoanAmount !== undefined) {
    updates.push('max_loan_amount = ?');
    params.push(Number(data.maxLoanAmount));
  }
  if (data.baseInterestRate !== undefined) {
    updates.push('base_interest_rate = ?');
    params.push(Number(data.baseInterestRate));
  }
  if (data.processingFeePct !== undefined) {
    updates.push('processing_fee_pct = ?');
    params.push(Number(data.processingFeePct));
  }
  if (data.processingFeeFlat !== undefined) {
    updates.push('processing_fee_flat = ?');
    params.push(data.processingFeeFlat !== null ? Number(data.processingFeeFlat) : null);
  }
  if (data.rateMatrix !== undefined) {
    updates.push('rate_matrix = ?');
    params.push(JSON.stringify(data.rateMatrix));
  }
  if (data.dynamicCriteria !== undefined) {
    updates.push('dynamic_criteria = ?');
    params.push(JSON.stringify(data.dynamicCriteria));
  }
  if (data.tatDays !== undefined) {
    updates.push('tat_days = ?');
    params.push(Number(data.tatDays));
  }
  if (data.specialFeatures !== undefined) {
    updates.push('special_features = ?');
    params.push(JSON.stringify(data.specialFeatures));
  }
  if (data.active !== undefined) {
    updates.push('active = ?');
    params.push(data.active ? 1 : 0);
  }
  if (data.priorityWeight !== undefined) {
    updates.push('priority_weight = ?');
    params.push(Number(data.priorityWeight));
  }

  params.push(id);
  db.prepare(`UPDATE bank_policy_cards SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = getBankPolicyCardById(id);
  if (!updated) throw new Error('Failed to update bank policy card');
  return updated;
}

export function deleteBankPolicyCard(id: string): void {
  db.prepare('DELETE FROM bank_policy_cards WHERE id = ?').run(id);
}

export function toggleBankPolicyCardStatus(id: string, active: boolean): void {
  db.prepare('UPDATE bank_policy_cards SET active = ?, updated_at = ? WHERE id = ?').run(
    active ? 1 : 0,
    new Date().toISOString(),
    id
  );
}

export function listDynamicCriteriaDefs(tenantId = 'default'): DynamicCriteriaFieldDef[] {
  // Built-in standard dynamic criteria fields
  const standardDefs: DynamicCriteriaFieldDef[] = [
    {
      key: 'applicantAge',
      label: 'Applicant Age Range',
      type: 'NUMBER',
      unit: 'Years',
      description: 'Minimum and maximum permissible age of the borrower at application and maturity.',
      defaultValue: { minAge: 21, maxAge: 65 },
    },
    {
      key: 'allowedCompanyCategories',
      label: 'Approved Employer Categories',
      type: 'DROPDOWN',
      options: ['SUPER_CAT_A', 'CAT_A', 'CAT_B', 'CAT_C', 'GOVT', 'ALL'],
      description: 'Bank approved categorization of employer corporate list for lower interest rates.',
      defaultValue: ['SUPER_CAT_A', 'CAT_A', 'CAT_B', 'GOVT'],
    },
    {
      key: 'allowedSalaryModes',
      label: 'Salary Credit Mode',
      type: 'DROPDOWN',
      options: ['BANK_TRANSFER', 'CHEQUE', 'CASH'],
      description: 'Mandatory mode through which applicant salary or business revenue is credited.',
      defaultValue: ['BANK_TRANSFER'],
    },
    {
      key: 'locationTiers',
      label: 'Approved Geography / City Tiers',
      type: 'DROPDOWN',
      options: ['METRO', 'TIER_1', 'TIER_2', 'TIER_3'],
      description: 'City classifications eligible for sourcing this specific policy card.',
      defaultValue: ['METRO', 'TIER_1', 'TIER_2'],
    },
    {
      key: 'minWorkExperienceMonths',
      label: 'Minimum Total Work Experience',
      type: 'NUMBER',
      unit: 'Months',
      description: 'Total employment or professional vintage required.',
      defaultValue: 24,
    },
    {
      key: 'minBusinessVintageMonths',
      label: 'Minimum Business Vintage',
      type: 'NUMBER',
      unit: 'Months',
      description: 'Minimum duration of operational business registration.',
      defaultValue: 36,
    },
    {
      key: 'propertyType',
      label: 'Permissible Property Type',
      type: 'DROPDOWN',
      options: ['READY_RESIDENTIAL', 'UNDER_CONSTRUCTION', 'PLOT', 'COMMERCIAL'],
      description: 'Allowed collateral or acquisition property classification for secured loans.',
      defaultValue: ['READY_RESIDENTIAL', 'UNDER_CONSTRUCTION'],
    },
  ];

  return standardDefs;
}

function mapRowToCard(row: Record<string, unknown>): BankPolicyCard {
  const safeJsonParse = <T>(val: unknown, fallback: T): T => {
    if (!val) return fallback;
    if (typeof val === 'object') return val as T;
    try {
      return JSON.parse(String(val)) as T;
    } catch {
      return fallback;
    }
  };

  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || row.tenantId || 'default'),
    bankName: String(row.bank_name || row.bankName || ''),
    bankCode: String(row.bank_code || row.bankCode || ''),
    logoUrl: row.logo_url || row.logoUrl ? String(row.logo_url || row.logoUrl) : null,
    loanType: (row.loan_type || row.loanType || 'HOME_LOAN') as LoanType,
    minCibil: Number(row.min_cibil !== undefined ? row.min_cibil : row.minCibil || 650),
    maxCibil: Number(row.max_cibil !== undefined ? row.max_cibil : row.maxCibil || 900),
    minMonthlyIncome: Number(row.min_monthly_income !== undefined ? row.min_monthly_income : row.minMonthlyIncome || 25000),
    maxFoirPct: Number(row.max_foir_pct !== undefined ? row.max_foir_pct : row.maxFoirPct || 55),
    allowedIncomeTypes: safeJsonParse<EmploymentType[]>(
      row.allowed_income_types || row.allowedIncomeTypes,
      ['SALARIED']
    ),
    minTenureMonths: Number(row.min_tenure_months !== undefined ? row.min_tenure_months : row.minTenureMonths || 12),
    maxTenureMonths: Number(row.max_tenure_months !== undefined ? row.max_tenure_months : row.maxTenureMonths || 240),
    minLoanAmount: Number(row.min_loan_amount !== undefined ? row.min_loan_amount : row.minLoanAmount || 100000),
    maxLoanAmount: Number(row.max_loan_amount !== undefined ? row.max_loan_amount : row.maxLoanAmount || 50000000),
    baseInterestRate: Number(row.base_interest_rate !== undefined ? row.base_interest_rate : row.baseInterestRate || 8.5),
    processingFeePct: Number(row.processing_fee_pct !== undefined ? row.processing_fee_pct : row.processingFeePct || 0.5),
    processingFeeFlat: row.processing_fee_flat !== undefined && row.processing_fee_flat !== null
      ? Number(row.processing_fee_flat)
      : undefined,
    rateMatrix: safeJsonParse<RateMatrixTier[]>(row.rate_matrix || row.rateMatrix, []),
    dynamicCriteria: safeJsonParse<Record<string, unknown>>(row.dynamic_criteria || row.dynamicCriteria, {}),
    tatDays: Number(row.tat_days !== undefined ? row.tat_days : row.tatDays || 3),
    specialFeatures: safeJsonParse<string[]>(row.special_features || row.specialFeatures, []),
    active: row.active !== 0 && row.active !== false && row.active !== '0',
    priorityWeight: Number(row.priority_weight !== undefined ? row.priority_weight : row.priorityWeight || 0),
    createdAt: String(row.created_at || row.createdAt || ''),
    updatedAt: row.updated_at || row.updatedAt ? String(row.updated_at || row.updatedAt) : undefined,
  };
}

/**
 * Seeds default production bank policy cards across major Indian financial institutions
 */
export function seedDefaultBankPolicyCards(tenantId = 'default'): void {
  try {
    const existing = db.prepare('SELECT COUNT(*) as count FROM bank_policy_cards').get() as { count: number } | undefined;
    if (existing && Number(existing.count) > 0) {
      return;
    }
  } catch {}

  const seedPolicies = [
    // 1. HDFC Bank - Home Loan
    {
      bankName: 'HDFC Bank',
      bankCode: 'HDFC',
      loanType: 'HOME_LOAN' as LoanType,
      minCibil: 700,
      maxCibil: 900,
      minMonthlyIncome: 30000,
      maxFoirPct: 60,
      allowedIncomeTypes: ['SALARIED', 'SELF_EMPLOYED_PROFESSIONAL', 'SELF_EMPLOYED_BUSINESS'] as EmploymentType[],
      minTenureMonths: 12,
      maxTenureMonths: 360,
      minLoanAmount: 500000,
      maxLoanAmount: 100000000,
      baseInterestRate: 8.40,
      processingFeePct: 0.50,
      processingFeeFlat: 3000,
      tatDays: 3,
      priorityWeight: 10,
      specialFeatures: ['Instant In-Principle Sanction', 'Zero Prepayment Penalty on Floating Rate', 'Digital Document Upload'],
      rateMatrix: [
        { cibilMin: 800, cibilMax: 900, interestRate: 8.35, maxFoirPct: 65, description: 'Super Prime Tier' },
        { cibilMin: 750, cibilMax: 799, interestRate: 8.45, maxFoirPct: 60, description: 'Prime Tier' },
        { cibilMin: 700, cibilMax: 749, interestRate: 8.75, maxFoirPct: 55, description: 'Standard Tier' },
      ],
      dynamicCriteria: {
        minAge: 21,
        maxAge: 65,
        minWorkExperienceMonths: 24,
        allowedCompanyCategories: ['SUPER_CAT_A', 'CAT_A', 'CAT_B', 'GOVT'],
        allowedSalaryModes: ['BANK_TRANSFER'],
        locationTiers: ['METRO', 'TIER_1', 'TIER_2'],
      },
    },
    // 2. State Bank of India (SBI) - Home Loan
    {
      bankName: 'State Bank of India',
      bankCode: 'SBI',
      loanType: 'HOME_LOAN' as LoanType,
      minCibil: 650,
      maxCibil: 900,
      minMonthlyIncome: 25000,
      maxFoirPct: 55,
      allowedIncomeTypes: ['SALARIED', 'SELF_EMPLOYED_PROFESSIONAL', 'SELF_EMPLOYED_BUSINESS'] as EmploymentType[],
      minTenureMonths: 12,
      maxTenureMonths: 360,
      minLoanAmount: 300000,
      maxLoanAmount: 150000000,
      baseInterestRate: 8.50,
      processingFeePct: 0.35,
      tatDays: 5,
      priorityWeight: 9,
      specialFeatures: ['Lowest Processing Fee in Industry', 'Concession for Women Borrowers (-0.05%)', 'No Hidden Ledger Charges'],
      rateMatrix: [
        { cibilMin: 750, cibilMax: 900, interestRate: 8.40, maxFoirPct: 60, description: 'SBI Regular Home Loan (750+ CIBIL)' },
        { cibilMin: 700, cibilMax: 749, interestRate: 8.60, maxFoirPct: 55, description: 'SBI Band 2' },
        { cibilMin: 650, cibilMax: 699, interestRate: 9.15, maxFoirPct: 50, description: 'SBI Band 3' },
      ],
      dynamicCriteria: {
        minAge: 18,
        maxAge: 70,
        minWorkExperienceMonths: 12,
        allowedCompanyCategories: ['SUPER_CAT_A', 'CAT_A', 'CAT_B', 'CAT_C', 'GOVT'],
        allowedSalaryModes: ['BANK_TRANSFER', 'CHEQUE'],
        locationTiers: ['METRO', 'TIER_1', 'TIER_2', 'TIER_3'],
      },
    },
    // 3. ICICI Bank - Personal Loan
    {
      bankName: 'ICICI Bank',
      bankCode: 'ICICI',
      loanType: 'PERSONAL_LOAN' as LoanType,
      minCibil: 720,
      maxCibil: 900,
      minMonthlyIncome: 35000,
      maxFoirPct: 50,
      allowedIncomeTypes: ['SALARIED'] as EmploymentType[],
      minTenureMonths: 12,
      maxTenureMonths: 60,
      minLoanAmount: 50000,
      maxLoanAmount: 4000000,
      baseInterestRate: 10.75,
      processingFeePct: 1.50,
      tatDays: 1,
      priorityWeight: 8,
      specialFeatures: ['Disbursal within 24 Hours', 'Completely Paperless E-KYC', 'Flexible 12-60m Tenure'],
      rateMatrix: [
        { cibilMin: 780, cibilMax: 900, interestRate: 10.50, maxFoirPct: 55, description: 'Top Corporate Tier' },
        { cibilMin: 740, cibilMax: 779, interestRate: 11.25, maxFoirPct: 50, description: 'Standard Salaried Tier' },
        { cibilMin: 720, cibilMax: 739, interestRate: 12.50, maxFoirPct: 45, description: 'Entry Salaried Tier' },
      ],
      dynamicCriteria: {
        minAge: 23,
        maxAge: 58,
        minWorkExperienceMonths: 24,
        allowedCompanyCategories: ['SUPER_CAT_A', 'CAT_A', 'CAT_B'],
        allowedSalaryModes: ['BANK_TRANSFER'],
        locationTiers: ['METRO', 'TIER_1', 'TIER_2'],
      },
    },
    // 4. Axis Bank - Personal Loan
    {
      bankName: 'Axis Bank',
      bankCode: 'AXIS',
      loanType: 'PERSONAL_LOAN' as LoanType,
      minCibil: 700,
      maxCibil: 900,
      minMonthlyIncome: 25000,
      maxFoirPct: 55,
      allowedIncomeTypes: ['SALARIED', 'SELF_EMPLOYED_PROFESSIONAL'] as EmploymentType[],
      minTenureMonths: 12,
      maxTenureMonths: 60,
      minLoanAmount: 50000,
      maxLoanAmount: 3500000,
      baseInterestRate: 10.99,
      processingFeePct: 1.75,
      tatDays: 2,
      priorityWeight: 7,
      specialFeatures: ['Quick Approval for Cat A/B Corporates', 'Part-Payment Option Available', 'Doorstep Assistance'],
      rateMatrix: [
        { cibilMin: 750, cibilMax: 900, interestRate: 10.75, maxFoirPct: 55, description: 'Prime Personal Loan' },
        { cibilMin: 700, cibilMax: 749, interestRate: 11.75, maxFoirPct: 50, description: 'Standard Personal Loan' },
      ],
      dynamicCriteria: {
        minAge: 21,
        maxAge: 60,
        minWorkExperienceMonths: 12,
        allowedCompanyCategories: ['SUPER_CAT_A', 'CAT_A', 'CAT_B', 'CAT_C'],
        allowedSalaryModes: ['BANK_TRANSFER'],
        locationTiers: ['METRO', 'TIER_1', 'TIER_2'],
      },
    },
    // 5. Bajaj Housing Finance - Home Loan
    {
      bankName: 'Bajaj Housing Finance',
      bankCode: 'BAJAJ',
      loanType: 'HOME_LOAN' as LoanType,
      minCibil: 680,
      maxCibil: 900,
      minMonthlyIncome: 30000,
      maxFoirPct: 65,
      allowedIncomeTypes: ['SALARIED', 'SELF_EMPLOYED_BUSINESS', 'SELF_EMPLOYED_PROFESSIONAL'] as EmploymentType[],
      minTenureMonths: 12,
      maxTenureMonths: 360,
      minLoanAmount: 1000000,
      maxLoanAmount: 150000000,
      baseInterestRate: 8.60,
      processingFeePct: 0.50,
      tatDays: 2,
      priorityWeight: 8,
      specialFeatures: ['Highest FOIR Eligibility (up to 65%)', 'Top-Up Loan up to ₹1 Crore', 'Customised EMI Structuring'],
      rateMatrix: [
        { cibilMin: 750, cibilMax: 900, interestRate: 8.50, maxFoirPct: 65, description: 'Prime Housing Tier' },
        { cibilMin: 700, cibilMax: 749, interestRate: 8.80, maxFoirPct: 60, description: 'Flexi Housing Tier' },
        { cibilMin: 680, cibilMax: 699, interestRate: 9.30, maxFoirPct: 55, description: 'Standard Housing Tier' },
      ],
      dynamicCriteria: {
        minAge: 23,
        maxAge: 65,
        minWorkExperienceMonths: 24,
        allowedCompanyCategories: ['SUPER_CAT_A', 'CAT_A', 'CAT_B', 'CAT_C', 'GOVT'],
        allowedSalaryModes: ['BANK_TRANSFER'],
        locationTiers: ['METRO', 'TIER_1', 'TIER_2', 'TIER_3'],
      },
    },
    // 6. Tata Capital - Business Loan
    {
      bankName: 'Tata Capital',
      bankCode: 'TATA',
      loanType: 'BUSINESS_LOAN' as LoanType,
      minCibil: 700,
      maxCibil: 900,
      minMonthlyIncome: 50000,
      maxFoirPct: 60,
      allowedIncomeTypes: ['SELF_EMPLOYED_BUSINESS', 'SELF_EMPLOYED_PROFESSIONAL'] as EmploymentType[],
      minTenureMonths: 12,
      maxTenureMonths: 48,
      minLoanAmount: 300000,
      maxLoanAmount: 7500000,
      baseInterestRate: 14.50,
      processingFeePct: 2.00,
      tatDays: 3,
      priorityWeight: 7,
      specialFeatures: ['Unsecured Collateral-Free Sanction', 'Fast In-Principle Verification', 'Overdraft Facility Linked'],
      rateMatrix: [
        { cibilMin: 750, cibilMax: 900, interestRate: 13.99, maxFoirPct: 60, description: 'Prime Business Tier' },
        { cibilMin: 700, cibilMax: 749, interestRate: 15.25, maxFoirPct: 55, description: 'Growth Business Tier' },
      ],
      dynamicCriteria: {
        minAge: 25,
        maxAge: 65,
        minBusinessVintageMonths: 36,
        locationTiers: ['METRO', 'TIER_1', 'TIER_2'],
      },
    },
    // 7. Kotak Mahindra Bank - Loan Against Property
    {
      bankName: 'Kotak Mahindra Bank',
      bankCode: 'KOTAK',
      loanType: 'LOAN_AGAINST_PROPERTY' as LoanType,
      minCibil: 680,
      maxCibil: 900,
      minMonthlyIncome: 40000,
      maxFoirPct: 60,
      allowedIncomeTypes: ['SALARIED', 'SELF_EMPLOYED_BUSINESS', 'SELF_EMPLOYED_PROFESSIONAL'] as EmploymentType[],
      minTenureMonths: 12,
      maxTenureMonths: 180,
      minLoanAmount: 1000000,
      maxLoanAmount: 50000000,
      baseInterestRate: 9.25,
      processingFeePct: 1.00,
      tatDays: 4,
      priorityWeight: 8,
      specialFeatures: ['High LTV up to 70% of Property Market Value', 'Residential & Commercial Collateral Accepted'],
      rateMatrix: [
        { cibilMin: 750, cibilMax: 900, interestRate: 9.10, maxFoirPct: 60, description: 'Prime LAP Tier' },
        { cibilMin: 700, cibilMax: 749, interestRate: 9.50, maxFoirPct: 55, description: 'Standard LAP Tier' },
        { cibilMin: 680, cibilMax: 699, interestRate: 9.95, maxFoirPct: 50, description: 'Regular LAP Tier' },
      ],
      dynamicCriteria: {
        minAge: 23,
        maxAge: 65,
        propertyType: ['READY_RESIDENTIAL', 'COMMERCIAL'],
        locationTiers: ['METRO', 'TIER_1', 'TIER_2'],
      },
    },
  ];

  for (const pol of seedPolicies) {
    try {
      createBankPolicyCard({
        tenantId,
        ...pol,
      });
    } catch {}
  }
}
