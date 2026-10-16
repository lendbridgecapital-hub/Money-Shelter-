'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { syncDatabase } from '@/lib/db';
import * as branchesRepo from '@/lib/repos/branchesRepo';
import type { ActionResult } from '@/actions/settingsActions';

import * as usersRepo from '@/lib/repos/usersRepo';
import type { BranchType } from '@/types/db';
import { saveUploadedFile } from '@/lib/uploads';

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
    const mappedBranchId = String(formData.get('mappedBranchId') || '').trim() || null;

    const isCoBranded =
      formData.get('isCoBranded') === 'true' ||
      formData.get('isCoBranded') === '1' ||
      formData.get('isCoBranded') === 'on';
    const coBrandName = String(formData.get('coBrandName') || '').trim() || null;
    const coBrandTagline = String(formData.get('coBrandTagline') || '').trim() || null;
    let coBrandLogoUrl = String(formData.get('coBrandLogoUrl') || '').trim() || null;

    const logoFile = formData.get('coBrandLogoFile') as File | null;
    if (logoFile && logoFile.size > 0 && typeof logoFile.arrayBuffer === 'function') {
      try {
        const saved = await saveUploadedFile(logoFile, 'branding');
        coBrandLogoUrl = saved.fileUrl;
      } catch (uploadErr) {
        console.error('Co-brand logo upload failed:', uploadErr);
      }
    }

    let dedicatedRmName: string | null = null;
    if (dedicatedRmId) {
      const rm = usersRepo.getUserById(dedicatedRmId);
      if (rm) {
        dedicatedRmName = rm.name;
      }
    }

    let mappedBranchName: string | null = null;
    if (mappedBranchId) {
      const parentB = branchesRepo.getBranchById(mappedBranchId);
      if (parentB) {
        mappedBranchName = parentB.name;
      }
    }

    if (!name) return { ok: false, error: type === 'SITE' ? 'Site / Project name is required.' : 'Branch name is required.' };
    if (!code) return { ok: false, error: type === 'SITE' ? 'Site code is required.' : 'Branch code is required.' };
    if (branchesRepo.branchCodeExists(code)) return { ok: false, error: `${type === 'SITE' ? 'Site' : 'Branch'} code "${code.toUpperCase()}" is already in use.` };

    branchesRepo.createBranch({
      name,
      code,
      type,
      mappedBranchId,
      mappedBranchName,
      address: address || null,
      phone: phone || null,
      email: email || null,
      dedicatedRmId,
      dedicatedRmName,
      developerName: developerName || null,
      isCoBranded,
      coBrandName,
      coBrandLogoUrl,
      coBrandTagline,
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
    const mappedBranchIdRaw = formData.get('mappedBranchId');
    const mappedBranchId = mappedBranchIdRaw !== null ? (String(mappedBranchIdRaw).trim() || null) : undefined;

    const isCoBrandedRaw = formData.get('isCoBranded');
    const isCoBranded =
      isCoBrandedRaw !== null
        ? isCoBrandedRaw === 'true' || isCoBrandedRaw === '1' || isCoBrandedRaw === 'on'
        : undefined;

    const coBrandNameRaw = formData.get('coBrandName');
    const coBrandName = coBrandNameRaw !== null ? String(coBrandNameRaw).trim() || null : undefined;

    const coBrandTaglineRaw = formData.get('coBrandTagline');
    const coBrandTagline = coBrandTaglineRaw !== null ? String(coBrandTaglineRaw).trim() || null : undefined;

    let coBrandLogoUrl: string | null | undefined = undefined;
    const logoUrlRaw = formData.get('coBrandLogoUrl');
    if (logoUrlRaw !== null) {
      coBrandLogoUrl = String(logoUrlRaw).trim() || null;
    }

    const logoFile = formData.get('coBrandLogoFile') as File | null;
    if (logoFile && logoFile.size > 0 && typeof logoFile.arrayBuffer === 'function') {
      try {
        const saved = await saveUploadedFile(logoFile, 'branding');
        coBrandLogoUrl = saved.fileUrl;
      } catch (uploadErr) {
        console.error('Co-brand logo upload failed:', uploadErr);
      }
    }

    let dedicatedRmName: string | null | undefined = undefined;
    if (dedicatedRmId !== undefined) {
      if (dedicatedRmId) {
        const rm = usersRepo.getUserById(dedicatedRmId);
        dedicatedRmName = rm ? rm.name : null;
      } else {
        dedicatedRmName = null;
      }
    }

    let mappedBranchName: string | null | undefined = undefined;
    if (mappedBranchId !== undefined) {
      if (mappedBranchId) {
        const parentB = branchesRepo.getBranchById(mappedBranchId);
        mappedBranchName = parentB ? parentB.name : null;
      } else {
        mappedBranchName = null;
      }
    }

    if (code && branchesRepo.branchCodeExists(code, id)) {
      return { ok: false, error: `Code "${code.toUpperCase()}" is already in use.` };
    }

    branchesRepo.updateBranch(id, {
      name: name || undefined,
      code: code || undefined,
      type,
      mappedBranchId,
      mappedBranchName,
      address,
      phone,
      email,
      dedicatedRmId,
      dedicatedRmName,
      developerName: developerName !== undefined ? developerName : undefined,
      isCoBranded,
      coBrandName,
      coBrandLogoUrl,
      coBrandTagline,
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
