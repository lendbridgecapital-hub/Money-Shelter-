'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { syncDatabase } from '@/lib/db';
import {
  listBankPolicyCards,
  getBankPolicyCardById,
  createBankPolicyCard,
  updateBankPolicyCard,
  deleteBankPolicyCard,
  toggleBankPolicyCardStatus,
} from '@/lib/repos/policyCardsRepo';
import { evaluateCustomerAgainstAllCards } from '@/lib/policyEngine';
import { getApplicationById } from '@/lib/repos/applicationsRepo';
import { db } from '@/lib/db';
import type {
  BankPolicyCard,
  CustomerEvaluationInput,
  PolicyEvaluationResult,
  RankingCriterion,
  RecommendationSummary,
} from '@/types/policy';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

/**
 * Admin action to create or update a Bank Policy Card
 */
export async function saveBankPolicyCardAction(
  data: Partial<BankPolicyCard> & { id?: string }
): Promise<{ ok: boolean; error?: string; card?: BankPolicyCard }> {
  try {
    const user = await requireRole('ADMIN');
    const tenantId = user.tenantId || 'default';

    if (!data.bankName?.trim()) {
      return { ok: false, error: 'Bank Name is mandatory.' };
    }
    if (!data.bankCode?.trim()) {
      return { ok: false, error: 'Bank Code is mandatory (e.g. HDFC, SBI).' };
    }
    if (!data.loanType) {
      return { ok: false, error: 'Please select a Loan Category.' };
    }
    if (!data.minMonthlyIncome || Number(data.minMonthlyIncome) <= 0) {
      return { ok: false, error: 'Please specify a valid Minimum Monthly Income.' };
    }
    if (!data.maxFoirPct || Number(data.maxFoirPct) <= 0 || Number(data.maxFoirPct) > 100) {
      return { ok: false, error: 'Maximum FOIR must be between 1% and 100%.' };
    }
    if (!data.baseInterestRate || Number(data.baseInterestRate) <= 0) {
      return { ok: false, error: 'Please provide a valid Base Interest Rate.' };
    }

    let savedCard: BankPolicyCard;

    if (data.id) {
      savedCard = updateBankPolicyCard(data.id, {
        bankName: data.bankName,
        bankCode: data.bankCode,
        logoUrl: data.logoUrl,
        loanType: data.loanType,
        minCibil: data.minCibil !== undefined ? Number(data.minCibil) : 650,
        maxCibil: data.maxCibil !== undefined ? Number(data.maxCibil) : 900,
        minMonthlyIncome: Number(data.minMonthlyIncome),
        maxFoirPct: Number(data.maxFoirPct),
        allowedIncomeTypes: data.allowedIncomeTypes || ['SALARIED'],
        minTenureMonths: data.minTenureMonths !== undefined ? Number(data.minTenureMonths) : 12,
        maxTenureMonths: data.maxTenureMonths !== undefined ? Number(data.maxTenureMonths) : 240,
        minLoanAmount: data.minLoanAmount !== undefined ? Number(data.minLoanAmount) : 100000,
        maxLoanAmount: data.maxLoanAmount !== undefined ? Number(data.maxLoanAmount) : 50000000,
        baseInterestRate: Number(data.baseInterestRate),
        processingFeePct: data.processingFeePct !== undefined ? Number(data.processingFeePct) : 0.5,
        processingFeeFlat: data.processingFeeFlat !== undefined ? Number(data.processingFeeFlat) : undefined,
        rateMatrix: data.rateMatrix || [],
        dynamicCriteria: data.dynamicCriteria || {},
        tatDays: data.tatDays !== undefined ? Number(data.tatDays) : 3,
        specialFeatures: data.specialFeatures || [],
        active: data.active !== undefined ? data.active : true,
        priorityWeight: data.priorityWeight !== undefined ? Number(data.priorityWeight) : 0,
      });
    } else {
      savedCard = createBankPolicyCard({
        tenantId,
        bankName: data.bankName,
        bankCode: data.bankCode,
        logoUrl: data.logoUrl,
        loanType: data.loanType,
        minCibil: data.minCibil !== undefined ? Number(data.minCibil) : 650,
        maxCibil: data.maxCibil !== undefined ? Number(data.maxCibil) : 900,
        minMonthlyIncome: Number(data.minMonthlyIncome),
        maxFoirPct: Number(data.maxFoirPct),
        allowedIncomeTypes: data.allowedIncomeTypes || ['SALARIED'],
        minTenureMonths: data.minTenureMonths !== undefined ? Number(data.minTenureMonths) : 12,
        maxTenureMonths: data.maxTenureMonths !== undefined ? Number(data.maxTenureMonths) : 240,
        minLoanAmount: data.minLoanAmount !== undefined ? Number(data.minLoanAmount) : 100000,
        maxLoanAmount: data.maxLoanAmount !== undefined ? Number(data.maxLoanAmount) : 50000000,
        baseInterestRate: Number(data.baseInterestRate),
        processingFeePct: data.processingFeePct !== undefined ? Number(data.processingFeePct) : 0.5,
        processingFeeFlat: data.processingFeeFlat !== undefined ? Number(data.processingFeeFlat) : undefined,
        rateMatrix: data.rateMatrix || [],
        dynamicCriteria: data.dynamicCriteria || {},
        tatDays: data.tatDays !== undefined ? Number(data.tatDays) : 3,
        specialFeatures: data.specialFeatures || [],
        active: data.active !== undefined ? data.active : true,
        priorityWeight: data.priorityWeight !== undefined ? Number(data.priorityWeight) : 0,
      });
    }

    await syncDatabase();
    safeRevalidate('/admin/policy-cards');
    safeRevalidate('/ops/eligibility');

    return { ok: true, card: savedCard };
  } catch (err) {
    console.error('[saveBankPolicyCardAction] error:', err);
    return { ok: false, error: (err as Error).message || 'Failed to save bank policy card.' };
  }
}

/**
 * Admin action to delete a Bank Policy Card
 */
export async function deleteBankPolicyCardAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireRole('ADMIN');
    deleteBankPolicyCard(id);
    await syncDatabase();
    safeRevalidate('/admin/policy-cards');
    safeRevalidate('/ops/eligibility');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Failed to delete policy card.' };
  }
}

/**
 * Admin action to toggle active status of a Bank Policy Card
 */
export async function toggleBankPolicyCardStatusAction(
  id: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireRole('ADMIN');
    toggleBankPolicyCardStatus(id, active);
    await syncDatabase();
    safeRevalidate('/admin/policy-cards');
    safeRevalidate('/ops/eligibility');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Failed to toggle policy card status.' };
  }
}

/**
 * Operations & Admin action to evaluate customer eligibility against all active Bank Cards
 */
export async function evaluateCustomerEligibilityAction(
  input: CustomerEvaluationInput,
  rankBy: RankingCriterion = 'LOWEST_RATE'
): Promise<{ ok: boolean; error?: string; summary?: RecommendationSummary }> {
  try {
    const user = await requireRole('ADMIN', 'OPERATIONS', 'CENTRAL_SUPPORT', 'RELATIONSHIP_MANAGER');
    const tenantId = user.tenantId || 'default';

    if (!input.loanType) {
      return { ok: false, error: 'Loan Category is required.' };
    }
    if (!input.cibilScore || input.cibilScore < 300 || input.cibilScore > 900) {
      return { ok: false, error: 'Please enter a valid CIBIL Score between 300 and 900.' };
    }
    if (!input.monthlyIncome || input.monthlyIncome <= 0) {
      return { ok: false, error: 'Please enter customer Monthly In-Hand Income.' };
    }
    if (!input.requestedAmount || input.requestedAmount <= 0) {
      return { ok: false, error: 'Please enter Requested Loan Amount.' };
    }
    if (!input.requestedTenureMonths || input.requestedTenureMonths <= 0) {
      return { ok: false, error: 'Please enter Requested Loan Tenure (in months).' };
    }

    const cards = listBankPolicyCards(tenantId, input.loanType, true);
    const summary = evaluateCustomerAgainstAllCards(input, cards, rankBy);

    return { ok: true, summary };
  } catch (err) {
    console.error('[evaluateCustomerEligibilityAction] error:', err);
    return { ok: false, error: (err as Error).message || 'Failed to evaluate customer eligibility.' };
  }
}

/**
 * Assigns a selected bank recommendation to an existing customer loan application
 */
export async function attachRecommendationToApplicationAction(
  applicationId: string,
  result: PolicyEvaluationResult
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireRole('ADMIN', 'OPERATIONS', 'CENTRAL_SUPPORT', 'RELATIONSHIP_MANAGER');
    const app = getApplicationById(applicationId);
    if (!app) {
      return { ok: false, error: 'Application not found.' };
    }

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE loan_applications 
       SET bank_id = ?, bank_name = ?, approved_amount = ?, interest_rate = ?, tenure_months = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      result.cardId,
      result.bankName,
      result.approvedOrRecommendedAmount,
      result.mappedInterestRate,
      result.tenureMonths,
      now,
      applicationId
    );

    // Record operational status note
    db.prepare(
      `INSERT INTO status_history (id, application_id, status, note, changed_by_id, changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      `sh_${Date.now()}`,
      applicationId,
      app.status,
      `Matched with ${result.bankName} policy: Interest Rate ${result.mappedInterestRate}% p.a., Recommended Sanction: ₹${result.approvedOrRecommendedAmount.toLocaleString('en-IN')}, EMI: ₹${result.proposedEmi.toLocaleString('en-IN')}/m (Evaluation run by ${user.name} - ${user.role}).`,
      user.id,
      now
    );

    await syncDatabase();
    safeRevalidate('/branch/requests');
    safeRevalidate(`/branch/requests/${applicationId}`);
    safeRevalidate('/ops/eligibility');

    return { ok: true };
  } catch (err) {
    console.error('[attachRecommendationToApplicationAction] error:', err);
    return { ok: false, error: (err as Error).message || 'Failed to attach recommendation to case.' };
  }
}
