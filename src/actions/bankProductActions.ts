'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import {
  createBankProduct,
  updateBankProduct,
  deleteBankProduct,
  toggleBankProductStatus,
} from '@/lib/repos/bankProductsRepo';
import { searchRegisteredPartners, listPartners } from '@/lib/repos/usersRepo';
import type { BankProduct, User } from '@/types/db';

export type ActionResult<T = unknown> = {
  ok: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function saveBankProductAction(data: {
  id?: string;
  productName: string;
  banks: string[];
  baseRate: number;
  partnerRate: number;
  dedicatedPartnerId?: string | null;
  dedicatedPartnerName?: string | null;
  dedicatedPartnerMobile?: string | null;
  notes?: string | null;
}): Promise<ActionResult<BankProduct>> {
  try {
    const user = await requireUser();
    if (user.role !== 'ADMIN' && user.role !== 'OPERATIONS') {
      return { ok: false, error: 'Only Administrators and Operations staff can configure bank products.' };
    }

    if (!data.productName || !data.productName.trim()) {
      return { ok: false, error: 'Please choose or enter a valid loan product.' };
    }

    if (!data.banks || data.banks.length === 0) {
      return { ok: false, error: 'Please select at least one Indian bank or NBFC.' };
    }

    const baseRate = Number(data.baseRate);
    if (isNaN(baseRate) || baseRate < 0) {
      return { ok: false, error: 'Please provide a valid base rate (% receivable from bank).' };
    }

    const partnerRate = Number(data.partnerRate);
    if (isNaN(partnerRate) || partnerRate < 0) {
      return { ok: false, error: 'Please provide a valid partner rate (% shared with partner).' };
    }

    // If dedicated partner is provided, verify they are a registered partner
    let dedicatedPartnerId = data.dedicatedPartnerId || null;
    let dedicatedPartnerName = data.dedicatedPartnerName || null;
    let dedicatedPartnerMobile = data.dedicatedPartnerMobile || null;

    if (dedicatedPartnerId) {
      const registered = listPartners(user.tenantId || 'default').find((p) => p.id === dedicatedPartnerId);
      if (registered) {
        dedicatedPartnerName = registered.name;
        dedicatedPartnerMobile = registered.phone || dedicatedPartnerMobile || null;
      }
    }

    if (data.id) {
      updateBankProduct(data.id, {
        productName: data.productName.trim(),
        banks: data.banks,
        baseRate,
        partnerRate,
        dedicatedPartnerId,
        dedicatedPartnerName,
        dedicatedPartnerMobile,
        notes: data.notes?.trim() || null,
      });

      revalidatePath('/admin/banks');
      return { ok: true, message: `Updated product offering for ${data.productName.trim()}.` };
    }

    const created = createBankProduct({
      tenantId: user.tenantId || 'default',
      productName: data.productName.trim(),
      banks: data.banks,
      baseRate,
      partnerRate,
      dedicatedPartnerId,
      dedicatedPartnerName,
      dedicatedPartnerMobile,
      notes: data.notes?.trim() || null,
    });

    revalidatePath('/admin/banks');
    return { ok: true, message: `Added ${created.productName} offering successfully.`, data: created };
  } catch (err) {
    console.error('[saveBankProductAction] Error:', err);
    return { ok: false, error: (err as Error).message || 'Failed to save product offering.' };
  }
}

export async function deleteBankProductAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'ADMIN') {
      return { ok: false, error: 'Only Administrators can remove bank product offerings.' };
    }

    deleteBankProduct(id);
    revalidatePath('/admin/banks');
    return { ok: true, message: 'Product offering deleted.' };
  } catch (err) {
    console.error('[deleteBankProductAction] Error:', err);
    return { ok: false, error: (err as Error).message || 'Failed to delete product.' };
  }
}

export async function toggleBankProductStatusAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'ADMIN' && user.role !== 'OPERATIONS') {
      return { ok: false, error: 'Unauthorized.' };
    }

    toggleBankProductStatus(id, active);
    revalidatePath('/admin/banks');
    return { ok: true, message: `Product marked as ${active ? 'Active' : 'Inactive'}.` };
  } catch (err) {
    console.error('[toggleBankProductStatusAction] Error:', err);
    return { ok: false, error: (err as Error).message || 'Failed to change status.' };
  }
}

export async function searchPartnersAction(query: string): Promise<User[]> {
  try {
    const user = await requireUser();
    return searchRegisteredPartners(query, user.tenantId || 'default');
  } catch {
    return [];
  }
}
