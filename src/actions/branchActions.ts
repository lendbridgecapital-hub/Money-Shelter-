'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { syncDatabase } from '@/lib/db';
import * as branchesRepo from '@/lib/repos/branchesRepo';
import type { ActionResult } from '@/actions/settingsActions';

export async function createBranchAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');

    const name = String(formData.get('name') || '').trim();
    const code = String(formData.get('code') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const email = String(formData.get('email') || '').trim();

    if (!name) return { ok: false, error: 'Branch name is required.' };
    if (!code) return { ok: false, error: 'Branch code is required.' };
    if (branchesRepo.branchCodeExists(code)) return { ok: false, error: `Branch code "${code.toUpperCase()}" is already in use.` };

    branchesRepo.createBranch({
      name,
      code,
      address: address || null,
      phone: phone || null,
      email: email || null,
    });

    await syncDatabase();
    revalidatePath('/admin/branches');
    return { ok: true, message: `Branch "${name}" created.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : 'Something went wrong.' };
  }
}

export async function updateBranchAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');

    const name = String(formData.get('name') || '').trim();
    const code = String(formData.get('code') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const email = String(formData.get('email') || '').trim();

    if (code && branchesRepo.branchCodeExists(code, id)) {
      return { ok: false, error: `Branch code "${code.toUpperCase()}" is already in use.` };
    }

    branchesRepo.updateBranch(id, {
      name: name || undefined,
      code: code || undefined,
      address,
      phone,
      email,
    });

    await syncDatabase();
    revalidatePath('/admin/branches');
    return { ok: true, message: 'Branch updated.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : 'Something went wrong.' };
  }
}

export async function deleteBranchAction(id: string): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');
    const branches = branchesRepo.listBranches();
    if (branches.length <= 1) return { ok: false, error: 'At least one branch must exist.' };

    branchesRepo.deleteBranch(id);
    await syncDatabase();
    revalidatePath('/admin/branches');
    return { ok: true, message: 'Branch deleted.' };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error && err.message === 'FORBIDDEN'
          ? 'You do not have permission to do this.'
          : 'Could not delete this branch — make sure it has no users or applications assigned, then try again.',
    };
  }
}
