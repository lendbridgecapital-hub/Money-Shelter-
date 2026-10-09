'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { syncDatabase } from '@/lib/db';
import * as branchesRepo from '@/lib/repos/branchesRepo';
import type { ActionResult } from '@/actions/settingsActions';

import * as usersRepo from '@/lib/repos/usersRepo';
import type { BranchType } from '@/types/db';

export async function createBranchAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');

    const name = String(formData.get('name') || '').trim();
    const code = String(formData.get('code') || '').trim();
    const rawType = String(formData.get('type') || 'BRANCH').trim().toUpperCase();
    const type: BranchType = rawType === 'SITE' ? 'SITE' : 'BRANCH';
    const address = String(formData.get('address') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const developerName = String(formData.get('developerName') || '').trim();
    const dedicatedRmId = String(formData.get('dedicatedRmId') || '').trim() || null;

    let dedicatedRmName: string | null = null;
    if (dedicatedRmId) {
      const rm = usersRepo.getUserById(dedicatedRmId);
      if (rm) {
        dedicatedRmName = rm.name;
      }
    }

    if (!name) return { ok: false, error: type === 'SITE' ? 'Site / Project name is required.' : 'Branch name is required.' };
    if (!code) return { ok: false, error: type === 'SITE' ? 'Site code is required.' : 'Branch code is required.' };
    if (branchesRepo.branchCodeExists(code)) return { ok: false, error: `${type === 'SITE' ? 'Site' : 'Branch'} code "${code.toUpperCase()}" is already in use.` };

    branchesRepo.createBranch({
      name,
      code,
      type,
      address: address || null,
      phone: phone || null,
      email: email || null,
      dedicatedRmId,
      dedicatedRmName,
      developerName: developerName || null,
    });

    await syncDatabase();
    revalidatePath('/admin/branches');
    revalidatePath('/admin/sites');
    revalidatePath('/admin/users');
    revalidatePath('/branch/create-link');
    return { ok: true, message: type === 'SITE' ? `Direct Company Construction Site "${name}" created successfully.` : `Branch "${name}" created.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : 'Something went wrong.' };
  }
}

export async function updateBranchAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');

    const name = String(formData.get('name') || '').trim();
    const code = String(formData.get('code') || '').trim();
    const rawType = formData.get('type') ? String(formData.get('type')).trim().toUpperCase() : undefined;
    const type: BranchType | undefined = rawType ? (rawType === 'SITE' ? 'SITE' : 'BRANCH') : undefined;
    const address = String(formData.get('address') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const developerName = String(formData.get('developerName') || '').trim();
    const dedicatedRmIdRaw = formData.get('dedicatedRmId');
    const dedicatedRmId = dedicatedRmIdRaw !== null ? (String(dedicatedRmIdRaw).trim() || null) : undefined;

    let dedicatedRmName: string | null | undefined = undefined;
    if (dedicatedRmId !== undefined) {
      if (dedicatedRmId) {
        const rm = usersRepo.getUserById(dedicatedRmId);
        dedicatedRmName = rm ? rm.name : null;
      } else {
        dedicatedRmName = null;
      }
    }

    if (code && branchesRepo.branchCodeExists(code, id)) {
      return { ok: false, error: `Code "${code.toUpperCase()}" is already in use.` };
    }

    branchesRepo.updateBranch(id, {
      name: name || undefined,
      code: code || undefined,
      type,
      address,
      phone,
      email,
      dedicatedRmId,
      dedicatedRmName,
      developerName: developerName !== undefined ? developerName : undefined,
    });

    await syncDatabase();
    revalidatePath('/admin/branches');
    revalidatePath('/admin/sites');
    revalidatePath('/admin/users');
    revalidatePath('/branch/create-link');
    return { ok: true, message: type === 'SITE' ? 'Project Site updated.' : 'Branch updated.' };
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
    revalidatePath('/admin/sites');
    return { ok: true, message: 'Deleted successfully.' };
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
