import { requireRole } from '@/lib/auth';
import { listBankPolicyCards } from '@/lib/repos/policyCardsRepo';
import { listApplicationsByRole } from '@/lib/repos/applicationsRepo';
import EligibilityCalculatorClient from './EligibilityCalculatorClient';

export const metadata = {
  title: 'Customer Loan Eligibility & Bank Recommendation | Quickfinsure Ops',
  description: 'AI-assisted matchmaking engine evaluating customer CIBIL, FOIR, and income against active bank policies.',
};

export default async function OpsEligibilityPage() {
  const user = await requireRole('ADMIN', 'OPERATIONS', 'CENTRAL_SUPPORT', 'RELATIONSHIP_MANAGER');
  const cards = listBankPolicyCards(user.tenantId || 'default', undefined, true);
  const activeApplications = listApplicationsByRole(user).filter(
    (a) => a.status === 'DOCUMENTS_IN' || a.status === 'LINK_SHARED' || a.status === 'DOCUMENTS_REQUIRED'
  );

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
        availableCards={cards}
        activeApplications={activeApplications.map((a) => ({
          id: a.id,
          fullName: a.fullName || 'Unnamed Applicant',
          mobile: a.mobile || '',
          loanType: a.loanType || 'HOME_LOAN',
          loanAmount: a.loanAmount || 0,
          monthlyIncome: a.monthlyIncome || 0,
          existingEmi: a.existingEmi || 0,
        }))}
      />
    </div>
  );
}
