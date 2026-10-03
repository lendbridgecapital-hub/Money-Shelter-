import { requireRole } from '@/lib/auth';
import { listBankPolicyCards, listDynamicCriteriaDefs } from '@/lib/repos/policyCardsRepo';
import PolicyCardManager from './PolicyCardManager';

export const metadata = {
  title: 'Bank Policy Engine | Quickfinsure Admin',
  description: 'Manage institutional bank sourcing guidelines, FOIR caps, and CIBIL interest rate matrices.',
};

export default async function AdminPolicyCardsPage() {
  const user = await requireRole('ADMIN');
  const cards = listBankPolicyCards(user.tenantId || 'default');
  const dynamicDefs = listDynamicCriteriaDefs(user.tenantId || 'default');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 rounded-2xl text-white border border-emerald-500/20 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">💳</span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Bank Policy Engine & Sourcing Cards
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Configure bank-specific lending guidelines, CIBIL bands, FOIR ratios, and dynamic criteria. These cards power the Operations automated loan recommendation engine.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
            🛡️ Admin Control Plane
          </span>
        </div>
      </div>

      <PolicyCardManager initialCards={cards} dynamicDefs={dynamicDefs} />
    </div>
  );
}
