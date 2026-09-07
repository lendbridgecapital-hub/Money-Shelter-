'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth';
import * as usersRepo from '@/lib/repos/usersRepo';
import type { Role } from '@/types/db';
import type { ActionResult } from '@/actions/settingsActions';

const VALID_ROLES: Role[] = ['ADMIN', 'LOAN_MANAGER', 'OPERATION_EXECUTIVE'];

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');

    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const role = String(formData.get('role') || '') as Role;
    const branchId = String(formData.get('branchId') || '');

    if (!name) return { ok: false, error: 'Name is required.' };
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'A valid email is required.' };
    if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
    if (!VALID_ROLES.includes(role)) return { ok: false, error: 'Invalid role selected.' };
    if (!branchId) return { ok: false, error: 'A branch must be selected.' };
    if (usersRepo.emailExists(email)) return { ok: false, error: 'A user with this email already exists.' };

    const passwordHash = await bcrypt.hash(password, 10);
    usersRepo.createUser({ name, email, passwordHash, role, branchId });

    revalidatePath('/admin/users');
    return { ok: true, message: `User "${name}" created.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : 'Something went wrong.' };
  }
}

export async function setUserActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');
    usersRepo.setUserActive(id, active);
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : 'Something went wrong.' };
  }
}

export async function updateUserRoleBranchAction(id: string, role: Role, branchId: string): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');
    if (!VALID_ROLES.includes(role)) return { ok: false, error: 'Invalid role.' };
    usersRepo.updateUserRoleAndBranch(id, role, branchId);
    revalidatePath('/admin/users');
    return { ok: true, message: 'User updated.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : 'Something went wrong.' };
  }
}
