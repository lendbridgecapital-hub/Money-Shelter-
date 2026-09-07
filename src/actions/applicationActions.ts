'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import * as applicationsRepo from '@/lib/repos/applicationsRepo';
import * as statusHistoryRepo from '@/lib/repos/statusHistoryRepo';
import { generateApplicationToken } from '@/lib/tokens';
import type { ApplicationStatus } from '@/types/db';
import type { ActionResult } from '@/actions/settingsActions';

export type CreateLinkResult = ActionResult & { url?: string; token?: string };

export async function createApplicationLinkAction(): Promise<CreateLinkResult> {
  try {
    const user = await requireUser();

    const token = generateApplicationToken();
    const application = applicationsRepo.createApplicationLink({
      token,
      branchId: user.branchId,
      createdById: user.id,
    });

    statusHistoryRepo.addStatusHistory({
      applicationId: application.id,
      status: 'LINK_SHARED',
      note: 'Link generated and shared with customer.',
      changedById: user.id,
    });

    const base = process.env.APP_BASE_URL || 'http://localhost:3000';
    const url = `${base}/apply/${token}`;

    revalidatePath('/branch/requests');
    return { ok: true, url, token };
  } catch {
    return { ok: false, error: 'Could not generate a link. Please try again.' };
  }
}

const VALID_STATUSES: ApplicationStatus[] = ['LINK_SHARED', 'DOCUMENT_RECEIVED', 'LOAN_APPROVED', 'LOAN_REJECTED', 'LOAN_DISBURSED'];

export async function updateApplicationStatusAction(
  applicationId: string,
  status: ApplicationStatus,
  note?: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const application = applicationsRepo.getApplicationById(applicationId);
    if (!application) return { ok: false, error: 'Application not found.' };
    if (user.role !== 'ADMIN' && application.branchId !== user.branchId) {
      return { ok: false, error: 'This application belongs to a different branch.' };
    }
    if (!VALID_STATUSES.includes(status)) return { ok: false, error: 'Invalid status.' };

    applicationsRepo.updateApplicationStatus(applicationId, status);
    statusHistoryRepo.addStatusHistory({ applicationId, status, note: note || null, changedById: user.id });

    revalidatePath('/branch/requests');
    revalidatePath(`/branch/requests/${applicationId}`);
    return { ok: true, message: 'Status updated.' };
  } catch {
    return { ok: false, error: 'Could not update status. Please try again.' };
  }
}
