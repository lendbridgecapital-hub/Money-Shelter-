import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { listBankProducts } from '@/lib/repos/bankProductsRepo';
import { listPartners } from '@/lib/repos/usersRepo';
import BankProductManager from './BankProductManager';

export default async function BanksPage() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') {
    redirect('/admin/rewards');
  }

  const products = listBankProducts(user.tenantId || 'default', user);
  const partners = listPartners(user.tenantId || 'default');

  return (
    <BankProductManager
      initialProducts={products}
      registeredPartners={partners}
      currentUser={{
        id: user.id,
        role: user.role,
        name: user.name,
      }}
    />
  );
}
