'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, requireUser } from '@/lib/auth';
import { syncDatabase } from '@/lib/db';
import * as branchesRepo from '@/lib/repos/branchesRepo';
import type { ActionResult } from '@/actions/settingsActions';

import * as usersRepo from '@/lib/repos/usersRepo';
import type { BranchType } from '@/types/db';
import { saveUploadedFile } from '@/lib/uploads';
import { isPuneHqOperationsUser } from '@/lib/repos/applicationsRepo';

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
    const sessionUser = await requireUser();
    const existingBranch = branchesRepo.getBranchById(id);
    if (!existingBranch) {
      return { ok: false, error: 'Branch or site not found.' };
    }

    const isPuneHq = sessionUser.role === 'OPERATIONS' && isPuneHqOperationsUser(sessionUser);
    const isGlobal = sessionUser.role === 'ADMIN' || isPuneHq;

    if (!isGlobal) {
      if (sessionUser.role !== 'OPERATIONS') {
        return { ok: false, error: 'You do not have permission to do this.' };
      }
      if (existingBranch.type !== 'SITE') {
        return { ok: false, error: 'Access Denied: Regional branch operations can only edit project sites.' };
      }

      let userBranchId = sessionUser.branchId;
      if (
        !userBranchId &&
        (sessionUser.email?.toLowerCase().includes('lendbridge') ||
          sessionUser.email?.toLowerCase().includes('satara') ||
          sessionUser.name?.toLowerCase().includes('lendbridge') ||
          sessionUser.name?.toLowerCase().includes('satara'))
      ) {
        userBranchId = 'br_satara_01';
      }

      const allBranches = branchesRepo.listBranches(sessionUser.tenantId || 'default');
      const userBranch = userBranchId
        ? allBranches.find(
            (b) =>
              b.id.toLowerCase() === userBranchId!.toLowerCase() ||
              b.code.toLowerCase() === userBranchId!.toLowerCase() ||
              b.name.toLowerCase() === userBranchId!.toLowerCase()
          )
        : null;

      if (!userBranch) {
        return { ok: false, error: 'Branch operations user has no assigned branch.' };
      }

      const isMapped =
        existingBranch.mappedBranchId?.toLowerCase() === userBranch.id.toLowerCase() ||
        existingBranch.mappedBranchId?.toLowerCase() === userBranch.code.toLowerCase();

      if (!isMapped) {
        return { ok: false, error: 'Access Denied: You can only edit sites mapped to your branch.' };
      }
    }

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

export async function createSiteForBranchAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole('ADMIN', 'CENTRAL_SUPPORT', 'OPERATIONS');

    const name = String(formData.get('name') || '').trim();
    let code = String(formData.get('code') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const developerName = String(formData.get('developerName') || '').trim();
    const dedicatedRmId = String(formData.get('dedicatedRmId') || '').trim() || null;

    if (!name) return { ok: false, error: 'Project / Construction site name is required.' };

    // Resolve parent branch
    let mappedBranchId = String(formData.get('mappedBranchId') || '').trim();
    if (user.role === 'OPERATIONS') {
      // Branch operations can only create sites mapped to their own branch
      let effectiveBranchId = user.branchId;
      if (
        !effectiveBranchId &&
        (user.email?.toLowerCase().includes('lendbridge') ||
          user.email?.toLowerCase().includes('satara') ||
          user.name?.toLowerCase().includes('lendbridge') ||
          user.name?.toLowerCase().includes('satara'))
      ) {
        effectiveBranchId = 'br_satara_01';
      }
      if (!effectiveBranchId) {
        return { ok: false, error: 'Your operations user is not assigned to a branch.' };
      }
      mappedBranchId = effectiveBranchId;
    }

    if (!mappedBranchId) {
      return { ok: false, error: 'Parent branch is required for a project site.' };
    }

    const parentB = branchesRepo.getBranchById(mappedBranchId);
    if (!parentB) {
      return { ok: false, error: 'Parent branch does not exist.' };
    }

    // Auto-generate site code if not provided
    if (!code) {
      const prefix = (parentB.code || 'SITE').slice(0, 3).toUpperCase();
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      code = `${prefix}-ST-${randomSuffix}`;
    }

    if (branchesRepo.branchCodeExists(code)) {
      return { ok: false, error: `Site code "${code.toUpperCase()}" is already in use. Please enter a unique code.` };
    }

    let dedicatedRmName: string | null = null;
    if (dedicatedRmId) {
      const rm = usersRepo.getUserById(dedicatedRmId);
      if (rm) {
        dedicatedRmName = rm.name;
      }
    }

    // Inherit co-branding from parent branch if parent is co-branded
    const isCoBranded = parentB.isCoBranded || false;
    const coBrandName = parentB.coBrandName || null;
    const coBrandLogoUrl = parentB.coBrandLogoUrl || null;
    const coBrandTagline = parentB.coBrandTagline || null;

    branchesRepo.createBranch({
      name,
      code,
      type: 'SITE',
      status: 'APPROVED',
      mappedBranchId: parentB.id,
      mappedBranchName: parentB.name,
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
    revalidatePath('/admin/partner-requests');
    revalidatePath('/admin/partners');
    revalidatePath('/admin/branches');
    revalidatePath('/admin/sites');
    revalidatePath('/branch/create-link');

    return {
      ok: true,
      message: `Direct Construction Site "${name}" (${code}) created and approved successfully under ${parentB.name}.`,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error && err.message === 'FORBIDDEN'
          ? 'You do not have permission to create project sites.'
          : 'Failed to create project site. Please check the inputs and try again.',
    };
  }
}

export async function approveSiteAction(siteId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const allowedRoles = ['ADMIN', 'CENTRAL_SUPPORT', 'OPERATIONS'];
    if (!allowedRoles.includes(user.role)) {
      return { ok: false, error: 'Unauthorized to approve project sites.' };
    }

    const site = branchesRepo.getBranchById(siteId);
    if (!site) {
      return { ok: false, error: 'Project site not found.' };
    }

    const isPuneHq = user.role === 'OPERATIONS' && isPuneHqOperationsUser(user);
    const isGlobal = user.role === 'ADMIN' || user.role === 'CENTRAL_SUPPORT' || isPuneHq;

    if (!isGlobal) {
      let userBranchId = user.branchId;
      if (
        !userBranchId &&
        (user.email?.toLowerCase().includes('lendbridge') ||
          user.email?.toLowerCase().includes('satara') ||
          user.name?.toLowerCase().includes('lendbridge') ||
          user.name?.toLowerCase().includes('satara'))
      ) {
        userBranchId = 'br_satara_01';
      }

      const allBranches = branchesRepo.listBranches(user.tenantId || 'default');
      const userBranch = userBranchId
        ? allBranches.find(
            (b) =>
              b.id.toLowerCase() === userBranchId!.toLowerCase() ||
              b.code.toLowerCase() === userBranchId!.toLowerCase() ||
              b.name.toLowerCase() === userBranchId!.toLowerCase()
          )
        : null;

      if (!userBranch) {
        return { ok: false, error: 'Branch operations user has no assigned branch.' };
      }

      const isMapped =
        site.mappedBranchId?.toLowerCase() === userBranch.id.toLowerCase() ||
        site.mappedBranchId?.toLowerCase() === userBranch.code.toLowerCase();

      if (!isMapped) {
        return { ok: false, error: 'Access Denied: You are only authorized to approve sites mapped to your branch.' };
      }
    }

    branchesRepo.updateBranch(siteId, { status: 'APPROVED' });
    await syncDatabase();

    revalidatePath('/admin/partner-requests');
    revalidatePath('/admin/partners');
    revalidatePath('/admin/sites');
    revalidatePath('/admin/branches');
    revalidatePath('/branch/create-link');

    return {
      ok: true,
      message: `Project Site "${site.name}" (${site.code}) approved successfully! Direct customer loans and partner originations are now active.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to approve project site.',
    };
  }
}

export async function rejectSiteAction(siteId: string, reason?: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const allowedRoles = ['ADMIN', 'CENTRAL_SUPPORT', 'OPERATIONS'];
    if (!allowedRoles.includes(user.role)) {
      return { ok: false, error: 'Unauthorized to reject project sites.' };
    }

    const site = branchesRepo.getBranchById(siteId);
    if (!site) {
      return { ok: false, error: 'Project site not found.' };
    }

    const isPuneHq = user.role === 'OPERATIONS' && isPuneHqOperationsUser(user);
    const isGlobal = user.role === 'ADMIN' || user.role === 'CENTRAL_SUPPORT' || isPuneHq;

    if (!isGlobal) {
      let userBranchId = user.branchId;
      if (
        !userBranchId &&
        (user.email?.toLowerCase().includes('lendbridge') ||
          user.email?.toLowerCase().includes('satara') ||
          user.name?.toLowerCase().includes('lendbridge') ||
          user.name?.toLowerCase().includes('satara'))
      ) {
        userBranchId = 'br_satara_01';
      }

      const allBranches = branchesRepo.listBranches(user.tenantId || 'default');
      const userBranch = userBranchId
        ? allBranches.find(
            (b) =>
              b.id.toLowerCase() === userBranchId!.toLowerCase() ||
              b.code.toLowerCase() === userBranchId!.toLowerCase() ||
              b.name.toLowerCase() === userBranchId!.toLowerCase()
          )
        : null;

      if (!userBranch) {
        return { ok: false, error: 'Branch operations user has no assigned branch.' };
      }

      const isMapped =
        site.mappedBranchId?.toLowerCase() === userBranch.id.toLowerCase() ||
        site.mappedBranchId?.toLowerCase() === userBranch.code.toLowerCase();

      if (!isMapped) {
        return { ok: false, error: 'Access Denied: You are only authorized to manage sites mapped to your branch.' };
      }
    }

    branchesRepo.updateBranch(siteId, { status: 'REJECTED' });
    await syncDatabase();

    revalidatePath('/admin/partner-requests');
    revalidatePath('/admin/partners');
    revalidatePath('/admin/sites');
    revalidatePath('/admin/branches');

    return {
      ok: true,
      message: `Project Site "${site.name}" (${site.code}) rejected.${reason ? ` Reason: ${reason}` : ''}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reject project site.',
    };
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
