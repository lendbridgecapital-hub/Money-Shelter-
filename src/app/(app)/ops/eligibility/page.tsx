import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { listBankPolicyCards } from '@/lib/repos/policyCardsRepo';
import { listApplicationsByRole } from '@/lib/repos/applicationsRepo';
import type { BankPolicyCard } from '@/types/policy';
import type { LoanType } from '@/types/db';
import EligibilityCalculatorClient from './EligibilityCalculatorClient';

export const metadata = {
  title: 'Customer Loan Eligibility & Bank Recommendation | Quickfinsure',
  description: 'AI-assisted matchmaking engine evaluating customer CIBIL, FOIR, and income against active bank policies.',
};

export default async function OpsEligibilityPage() {
  const user = await requireUser();
  if (user.role !== 'ADMIN' && user.role !== 'OPERATIONS') {
    redirect('/dashboard');
  }

  const tenantId = user?.tenantId || 'default';

  let cards: BankPolicyCard[] = [];
  try {
    cards = listBankPolicyCards(tenantId, undefined, true) || [];
  } catch (err) {
    console.error('[OpsEligibilityPage] Error fetching cards:', err);
    cards = [];
  }

  let activeApplicationsList: Array<{
    id: string;
    fullName: string;
    mobile: string;
    loanType: LoanType;
    loanAmount: number;
    monthlyIncome: number;
    existingEmi: number;
  }> = [];

  try {
    const rawApps = listApplicationsByRole(user) || [];
    activeApplicationsList = (rawApps || [])
      .filter((a) => a && a.status === 'DOCUMENTS_IN')
      .map((a) => ({
        id: String(a?.id || ''),
        fullName: String(a?.fullName || 'Unnamed Applicant'),
        mobile: String(a?.mobile || ''),
        loanType: (a?.loanType as LoanType) || 'HOME_LOAN',
        loanAmount: Number(a?.loanAmount || 0),
        monthlyIncome: Number(a?.monthlyIncome || 0),
        existingEmi: Number(a?.existingEmi || 0),
      }));
  } catch (err) {
    console.error('[OpsEligibilityPage] Error fetching applications:', err);
    activeApplicationsList = [];
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-2xl text-white border border-indigo-500/20 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Customer Loan Eligibility & Bank Recommendation Engine
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Evaluate customer profiles (CIBIL score, FOIR, net monthly income, existing EMIs) against live bank sourcing policies to identify the highest sanction amounts and lowest interest rates.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
            🔒 Operations & Underwriting Desk
          </span>
        </div>
      </div>

      <EligibilityCalculatorClient
        availableCards={cards || []}
        activeApplications={activeApplicationsList || []}
      />
    </div>
  );
}
