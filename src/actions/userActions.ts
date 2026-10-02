'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { requireRole, requireUser } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/uploads';
import * as usersRepo from '@/lib/repos/usersRepo';
import { listBranches } from '@/lib/repos/branchesRepo';
import type { Role } from '@/types/db';
import type { ActionResult } from '@/actions/settingsActions';

const VALID_ROLES: Role[] = ['ADMIN', 'CENTRAL_SUPPORT', 'OPERATIONS', 'RELATIONSHIP_MANAGER', 'CHANNEL_PARTNER'];

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireRole('ADMIN', 'CENTRAL_SUPPORT');

    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const role = String(formData.get('role') || '') as Role;
    const branchId = String(formData.get('branchId') || '');
    const phone = String(formData.get('phone') || '').trim().replace(/[^0-9]/g, '');

    if (!name) return { ok: false, error: 'Name is required.' };
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'A valid email is required.' };
    if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
    if (!VALID_ROLES.includes(role)) return { ok: false, error: 'Invalid role selected.' };
    if (!branchId) return { ok: false, error: 'A branch must be selected.' };
    if (usersRepo.emailExists(email)) return { ok: false, error: 'A user with this email already exists.' };

    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRmId = formData.get('assignedRmId') ? String(formData.get('assignedRmId')) : undefined;
    const panNumber = formData.get('panNumber') ? String(formData.get('panNumber')) : undefined;
    const aadhaarNumber = formData.get('aadhaarNumber') ? String(formData.get('aadhaarNumber')) : undefined;
    const commissionRate = formData.get('commissionRate') ? Number(formData.get('commissionRate')) : undefined;

    let assignedRmName: string | undefined = undefined;
    if (assignedRmId) {
      const rms = usersRepo.listRelationshipManagers();
      const matched = rms.find((r) => r.id === assignedRmId);
      if (matched) assignedRmName = matched.name;
    }

    usersRepo.createUser({
      name,
      email,
      passwordHash,
      role,
      branchId,
      phone: phone || undefined,
      partnerStatus: role === 'CHANNEL_PARTNER' ? 'APPROVED' : undefined,
      assignedRmId,
      assignedRmName,
      panNumber,
      aadhaarNumber,
      commissionRate,
    });

    revalidatePath('/admin/users');
    revalidatePath('/admin/partners');
    revalidatePath('/admin/partner-requests');
    return { ok: true, message: `${role === 'CHANNEL_PARTNER' ? 'Channel Partner' : 'User'} "${name}" created.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : (err instanceof Error ? err.message : 'Something went wrong.') };
  }
}

export async function setUserActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    await requireRole('ADMIN', 'CENTRAL_SUPPORT');
    usersRepo.setUserActive(id, active);
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : 'Something went wrong.' };
  }
}

export async function updateUserRoleBranchAction(id: string, role: Role, branchId: string): Promise<ActionResult> {
  try {
    await requireRole('ADMIN', 'CENTRAL_SUPPORT');
    if (!VALID_ROLES.includes(role)) return { ok: false, error: 'Invalid role.' };
    usersRepo.updateUserRoleAndBranch(id, role, branchId);
    revalidatePath('/admin/users');
    return { ok: true, message: 'User updated.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : 'Something went wrong.' };
  }
}

export interface BulkRmRowInput {
  name: string;
  email: string;
  phone?: string;
  branchId?: string;
  password?: string;
}

export interface BulkCreateRmResult {
  ok: boolean;
  message?: string;
  error?: string;
  createdCount?: number;
  skippedCount?: number;
  failedCount?: number;
  details?: Array<{
    name: string;
    email: string;
    status: 'CREATED' | 'SKIPPED' | 'FAILED';
    reason?: string;
  }>;
}

export async function bulkCreateRmAction(
  rows: BulkRmRowInput[],
  defaultBranchId?: string,
  defaultPassword?: string
): Promise<BulkCreateRmResult> {
  try {
    await requireRole('ADMIN', 'CENTRAL_SUPPORT');

    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, error: 'No Relationship Manager records provided for creation.' };
    }

    const branches = listBranches();
    const fallbackBranchId = defaultBranchId || branches[0]?.id || 'branch_default';
    const fallbackPassword =
      defaultPassword?.trim() && defaultPassword.trim().length >= 8
        ? defaultPassword.trim()
        : 'RM@QuickFin2026!';

    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: NonNullable<BulkCreateRmResult['details']> = [];
    const seenEmails = new Set<string>();

    for (const row of rows) {
      const name = (row.name || '').trim();
      const email = (row.email || '').trim().toLowerCase();
      const phone = (row.phone || '').trim().replace(/[^0-9]/g, '');
      const branchId = row.branchId || fallbackBranchId;
      const pwd =
        row.password?.trim() && row.password.trim().length >= 8 ? row.password.trim() : fallbackPassword;

      if (!name) {
        failedCount++;
        details.push({
          name: name || 'Unnamed',
          email: email || 'N/A',
          status: 'FAILED',
          reason: 'Full name is required.',
        });
        continue;
      }

      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        failedCount++;
        details.push({
          name,
          email: email || 'Invalid',
          status: 'FAILED',
          reason: 'Valid email address is required.',
        });
        continue;
      }

      if (seenEmails.has(email)) {
        skippedCount++;
        details.push({
          name,
          email,
          status: 'SKIPPED',
          reason: 'Duplicate email within this bulk batch.',
        });
        continue;
      }
      seenEmails.add(email);

      if (usersRepo.emailExists(email)) {
        skippedCount++;
        details.push({
          name,
          email,
          status: 'SKIPPED',
          reason: 'Account with this email already exists in system.',
        });
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(pwd, 10);
        usersRepo.createUser({
          name,
          email,
          passwordHash,
          role: 'RELATIONSHIP_MANAGER',
          branchId,
          phone: phone || undefined,
        });

        createdCount++;
        details.push({
          name,
          email,
          status: 'CREATED',
        });
      } catch (insertErr) {
        failedCount++;
        details.push({
          name,
          email,
          status: 'FAILED',
          reason: insertErr instanceof Error ? insertErr.message : 'Database insertion error',
        });
      }
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin/partner-requests');
    revalidatePath('/dashboard');

    return {
      ok: true,
      createdCount,
      skippedCount,
      failedCount,
      message: `Bulk creation complete: ${createdCount} RM(s) created successfully.${skippedCount > 0 ? ` ${skippedCount} duplicate(s) skipped.` : ''}${failedCount > 0 ? ` ${failedCount} row(s) failed.` : ''}`,
      details,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error && err.message === 'FORBIDDEN'
          ? 'You do not have permission to create Relationship Managers.'
          : 'Failed to process bulk RM creation.',
    };
  }
}

export async function updateUserProfileAction(formData: FormData): Promise<ActionResult> {
  try {
    const currentUser = await requireUser();
    const name = String(formData.get('name') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const firmName = String(formData.get('firmName') || '').trim();
    const bio = String(formData.get('bio') || '').trim();
    const city = String(formData.get('city') || '').trim();

    if (!name) return { ok: false, error: 'Name cannot be empty.' };
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (email && email !== currentUser.email && usersRepo.emailExists(email, currentUser.id)) {
      return { ok: false, error: 'This email is already in use by another account.' };
    }

    let photoUrl: string | null | undefined = undefined;
    const photoFile = formData.get('photoFile') as File | null;
    if (photoFile && photoFile.size > 0 && photoFile.name) {
      const saved = await saveUploadedFile(photoFile, 'profiles');
      photoUrl = saved.fileUrl;
    }

    let firmLogoUrl: string | null | undefined = undefined;
    const firmLogoFile = formData.get('firmLogoFile') as File | null;
    if (firmLogoFile && firmLogoFile.size > 0 && firmLogoFile.name) {
      const saved = await saveUploadedFile(firmLogoFile, 'branding');
      firmLogoUrl = saved.fileUrl;
    }

    usersRepo.updateUserProfile(currentUser.id, {
      name,
      phone: phone || null,
      email: email || currentUser.email,
      photoUrl,
      firmLogoUrl,
      firmName: firmName || null,
      bio: bio || null,
      city: city || null,
    });

    revalidatePath('/profile');
    revalidatePath('/dashboard');
    revalidatePath(`/card/${currentUser.id}`);

    return { ok: true, message: 'Profile & business card details updated successfully!' };
  } catch {
    return { ok: false, error: 'Failed to update profile details.' };
  }
}
