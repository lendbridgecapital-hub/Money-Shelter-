'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import * as applicationsRepo from '@/lib/repos/applicationsRepo';
import * as statusHistoryRepo from '@/lib/repos/statusHistoryRepo';
import * as workflowRepo from '@/lib/repos/workflowRepo';
import * as banksRepo from '@/lib/repos/banksRepo';
import * as commissionsRepo from '@/lib/repos/commissionsRepo';
import * as usersRepo from '@/lib/repos/usersRepo';
import * as documentsRepo from '@/lib/repos/documentsRepo';
import { syncDatabase } from '@/lib/db';
import { saveUploadedFile, MAX_FILE_SIZE } from '@/lib/uploads';
import type { ApplicationStatus, Bank, Role } from '@/types/db';
import type { ActionResult } from '@/actions/settingsActions';

// 1. Send Details to Bank (Operations)
export async function sendToBankAction(
  applicationId: string,
  bankId: string,
  note?: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'OPERATIONS' && user.role !== 'ADMIN' && user.role !== 'CENTRAL_SUPPORT') {
      return { ok: false, error: 'Only Operations, Central Support, and Admin staff can send details to bank.' };
    }

    const application = applicationsRepo.getApplicationById(applicationId);
    if (!application) {
      return { ok: false, error: 'Application not found.' };
    }

    const bank = banksRepo.getBankById(bankId);
    if (!bank) {
      return { ok: false, error: 'Selected bank not found.' };
    }

    applicationsRepo.sendCaseToBank(applicationId, bank.id, bank.name);

    const historyNote = note ? `Sent to ${bank.name}: ${note}` : `Application loan file submitted to ${bank.name}.`;
    statusHistoryRepo.addStatusHistory({
      applicationId,
      status: 'SENT_TO_BANK',
      note: historyNote,
      changedById: user.id,
    });

    workflowRepo.addOperationalRemark({
      applicationId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      statusChangedTo: 'SENT_TO_BANK',
      remark: historyNote,
    });

    // Notify Channel Partner
    if (application.channelPartnerId) {
      workflowRepo.createNotification({
        recipientId: application.channelPartnerId,
        recipientRole: 'CHANNEL_PARTNER',
        applicationId,
        title: `Loan File Sent to Bank: ${bank.name}`,
        message: `Case for ${application.fullName || 'Customer'} has been submitted to ${bank.name} by Operations team.`,
      });
    }

    // Notify RM if assigned or branch manager
    if (application.relationshipManagerId) {
      workflowRepo.createNotification({
        recipientId: application.relationshipManagerId,
        recipientRole: 'RELATIONSHIP_MANAGER',
        applicationId,
        title: `Case Dispatched to ${bank.name}`,
        message: `Application #${application.id.slice(-6)} submitted to ${bank.name}.`,
      });
    }

    revalidatePath('/dashboard');
    revalidatePath('/branch/requests');
    revalidatePath(`/branch/requests/${applicationId}`);

    await syncDatabase();

    return { ok: true, message: `Successfully forwarded loan file to ${bank.name}.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send details to bank.';
    return { ok: false, error: msg };
  }
}

// 2. Submit Operational Remark with Status Dropdown and Free-text
export async function submitRemarkAction(
  applicationId: string,
  status: ApplicationStatus,
  remark: string,
  requiredDocTitles?: string[]
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (
      user.role !== 'OPERATIONS' &&
      user.role !== 'ADMIN' &&
      user.role !== 'RELATIONSHIP_MANAGER' &&
      user.role !== 'CENTRAL_SUPPORT'
    ) {
      return { ok: false, error: 'Unauthorized to submit operational remarks.' };
    }

    const application = applicationsRepo.getApplicationById(applicationId);
    if (!application) {
      return { ok: false, error: 'Application not found.' };
    }

    // Role check: RM can only submit remarks on their own or assigned partner applications
    if (user.role === 'RELATIONSHIP_MANAGER') {
      const isDirect = application.relationshipManagerId === user.id || application.createdById === user.id;
      let isPartnerAssigned = false;
      if (application.channelPartnerId) {
        const partner = usersRepo.getUserById(application.channelPartnerId);
        if (partner && partner.assignedRmId === user.id) {
          isPartnerAssigned = true;
        }
      } else if (application.createdById) {
        const creator = usersRepo.getUserById(application.createdById);
        if (creator && creator.assignedRmId === user.id) {
          isPartnerAssigned = true;
        }
      }
      if (!isDirect && !isPartnerAssigned) {
        return {
          ok: false,
          error: "Unauthorized: You can only submit remarks on your assigned Channel Partners' applications.",
        };
      }
    }

    if (!remark.trim()) {
      return { ok: false, error: 'Please enter a remark note.' };
    }

    // Update status if changed
    const statusChanged = status !== application.status;
    if (statusChanged) {
      applicationsRepo.updateApplicationStatus(applicationId, status);
      statusHistoryRepo.addStatusHistory({
        applicationId,
        status,
        note: `Status updated to ${status}. Remark: ${remark.trim()}`,
        changedById: user.id,
      });
    }

    // Log operational remark
    workflowRepo.addOperationalRemark({
      applicationId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      statusChangedTo: statusChanged ? status : null,
      remark: remark.trim(),
    });

    // If documents are required, add them to checklist
    if (status === 'DOCUMENTS_REQUIRED' && requiredDocTitles && requiredDocTitles.length > 0) {
      applicationsRepo.setDocumentsRequired(applicationId);
      workflowRepo.addRequiredDocuments(applicationId, requiredDocTitles);
    }

    // Flowchart Requirement: Trigger notification with status and remark to RM and Channel Partner
    const notifTitle = `Remark on Loan #${application.id.slice(-6)}: ${status}`;
    const notifMsg = `${user.name} (${user.role}): "${remark.trim()}"`;

    if (application.channelPartnerId) {
      workflowRepo.createNotification({
        recipientId: application.channelPartnerId,
        recipientRole: 'CHANNEL_PARTNER',
        applicationId,
        title: notifTitle,
        message: notifMsg,
      });
    }

    if (application.relationshipManagerId && application.relationshipManagerId !== user.id) {
      workflowRepo.createNotification({
        recipientId: application.relationshipManagerId,
        recipientRole: 'RELATIONSHIP_MANAGER',
        applicationId,
        title: notifTitle,
        message: notifMsg,
      });
    }

    revalidatePath('/dashboard');
    revalidatePath('/branch/requests');
    revalidatePath(`/branch/requests/${applicationId}`);

    await syncDatabase();

    return { ok: true, message: 'Operational remark recorded and notifications dispatched.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit remark.';
    return { ok: false, error: msg };
  }
}

// 3. Channel Partner / Ops / Support Uploads Required Document via FormData
export async function uploadRequiredDocumentFileAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const applicationId = (formData.get('applicationId') as string) || '';
    const requiredDocId = (formData.get('requiredDocId') as string) || '';
    const note = ((formData.get('note') as string) || '').trim();
    const file = formData.get('file') as File | null;

    if (!applicationId || !requiredDocId) {
      return { ok: false, error: 'Missing application or document identification.' };
    }

    const application = applicationsRepo.getApplicationById(applicationId);
    if (!application) {
      return { ok: false, error: 'Loan application not found.' };
    }

    // Role check: Channel Partner or RM must be assigned to this application
    if (user.role === 'CHANNEL_PARTNER') {
      if (
        application.channelPartnerId !== user.id &&
        application.createdById !== user.id
      ) {
        return { ok: false, error: 'You are not assigned to this application.' };
      }
    } else if (user.role === 'RELATIONSHIP_MANAGER') {
      const isDirect = application.relationshipManagerId === user.id || application.createdById === user.id;
      let isPartnerAssigned = false;
      if (application.channelPartnerId) {
        const partner = usersRepo.getUserById(application.channelPartnerId);
        if (partner && partner.assignedRmId === user.id) isPartnerAssigned = true;
      } else if (application.createdById) {
        const creator = usersRepo.getUserById(application.createdById);
        if (creator && creator.assignedRmId === user.id) isPartnerAssigned = true;
      }
      if (!isDirect && !isPartnerAssigned) {
        return { ok: false, error: 'Unauthorized: You are not assigned to this application.' };
      }
    }

    // File validation
    if (!file || typeof file === 'string' || !(file instanceof File) || file.size === 0) {
      return { ok: false, error: 'Please select a document file to attach.' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, error: 'File size exceeds maximum allowable limit of 10MB.' };
    }

    const reqDoc = workflowRepo.getRequiredDocumentById(requiredDocId);
    const docLabel = reqDoc ? reqDoc.documentTitle : (file.name || 'Additional Document');

    // Save physical file to disk (public/uploads/<applicationId>/...)
    const saved = await saveUploadedFile(file, applicationId);

    // Update required document item status to UPLOADED
    workflowRepo.markRequiredDocumentUploaded(requiredDocId, saved.fileUrl);

    // Add to application_documents table so Central Support & Ops can view/download
    documentsRepo.addDocument({
      applicationId,
      category: 'ADDITIONAL_REQUIRED',
      label: docLabel,
      fileName: saved.fileName,
      fileUrl: saved.fileUrl,
      fileSize: saved.fileSize,
      mimeType: saved.mimeType,
    });

    // Add operational remark / audit history
    const remarkNote = `Uploaded document: "${docLabel}" (${file.name}, ${(file.size / 1024).toFixed(1)} KB).${
      note ? ` Remarks: ${note}` : ''
    }`;

    workflowRepo.addOperationalRemark({
      applicationId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      remark: remarkNote,
    });

    // Check if all required docs are now uploaded
    const allRequired = workflowRepo.listRequiredDocuments(applicationId);
    const stillPending = allRequired.some((d) => d.id !== requiredDocId && d.status === 'PENDING');

    if (!stillPending) {
      // Move application back to DOCUMENTS_IN for Central Support / Operations review
      applicationsRepo.updateApplicationStatus(applicationId, 'DOCUMENTS_IN');
      statusHistoryRepo.addStatusHistory({
        applicationId,
        status: 'DOCUMENTS_IN',
        note: `All requested documents uploaded by ${user.name} (${user.role}). Case moved to Documents In for Central Support & Operations review.`,
        changedById: user.id,
      });

      // Notify Relationship Manager if assigned
      if (application.relationshipManagerId) {
        workflowRepo.createNotification({
          recipientId: application.relationshipManagerId,
          recipientRole: 'RELATIONSHIP_MANAGER',
          applicationId,
          title: `All Required Documents Uploaded`,
          message: `All requested documents for ${application.fullName || 'Customer'} (Case #${application.id.slice(-6)}) have been uploaded. Ready for review.`,
        });
      }
    } else {
      statusHistoryRepo.addStatusHistory({
        applicationId,
        status: application.status,
        note: `Uploaded document: "${docLabel}". Remaining pending documents: ${
          allRequired.filter((d) => d.id !== requiredDocId && d.status === 'PENDING').length
        }.`,
        changedById: user.id,
      });
    }

    revalidatePath('/dashboard');
    revalidatePath('/branch/requests');
    revalidatePath(`/branch/requests/${applicationId}`);
    if (application.token) {
      revalidatePath(`/apply/${application.token}`);
    }

    await syncDatabase();

    return {
      ok: true,
      message: `Document "${docLabel}" uploaded successfully and submitted for review.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to upload document file.';
    return { ok: false, error: msg };
  }
}

// Legacy / URL-based Channel Partner Uploads Required Document
export async function partnerUploadRequiredDocAction(
  applicationId: string,
  requiredDocId: string,
  fileUrl: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const application = applicationsRepo.getApplicationById(applicationId);
    if (!application) {
      return { ok: false, error: 'Application not found.' };
    }

    // Check ownership if channel partner or RM
    if (user.role === 'CHANNEL_PARTNER') {
      if (
        application.channelPartnerId !== user.id &&
        application.createdById !== user.id
      ) {
        return { ok: false, error: 'You are not assigned to this application.' };
      }
    } else if (user.role === 'RELATIONSHIP_MANAGER') {
      const isDirect = application.relationshipManagerId === user.id || application.createdById === user.id;
      let isPartnerAssigned = false;
      if (application.channelPartnerId) {
        const partner = usersRepo.getUserById(application.channelPartnerId);
        if (partner && partner.assignedRmId === user.id) isPartnerAssigned = true;
      } else if (application.createdById) {
        const creator = usersRepo.getUserById(application.createdById);
        if (creator && creator.assignedRmId === user.id) isPartnerAssigned = true;
      }
      if (!isDirect && !isPartnerAssigned) {
        return { ok: false, error: 'Unauthorized: You are not assigned to this application.' };
      }
    }

    const reqDoc = workflowRepo.getRequiredDocumentById(requiredDocId);
    const docLabel = reqDoc ? reqDoc.documentTitle : 'Required Document';

    workflowRepo.markRequiredDocumentUploaded(requiredDocId, fileUrl);

    // Register in application_documents so Central Support and Operations see it
    documentsRepo.addDocument({
      applicationId,
      category: 'ADDITIONAL_REQUIRED',
      label: docLabel,
      fileName: fileUrl.split('/').pop() || `${docLabel}.pdf`,
      fileUrl,
      fileSize: 1024 * 100,
      mimeType: 'application/pdf',
    });

    // Check if all required docs are now uploaded
    const allRequired = workflowRepo.listRequiredDocuments(applicationId);
    const stillPending = allRequired.some((d) => d.id !== requiredDocId && d.status === 'PENDING');

    if (!stillPending) {
      // Move application back to DOCUMENTS_IN for Operations team review
      applicationsRepo.updateApplicationStatus(applicationId, 'DOCUMENTS_IN');
      statusHistoryRepo.addStatusHistory({
        applicationId,
        status: 'DOCUMENTS_IN',
        note: 'All requested documents have been provided by Channel Partner. Ready for Ops review.',
        changedById: user.id,
      });
    }

    revalidatePath('/dashboard');
    revalidatePath('/branch/requests');
    revalidatePath(`/branch/requests/${applicationId}`);

    await syncDatabase();

    return { ok: true, message: 'Document uploaded successfully.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to upload document.';
    return { ok: false, error: msg };
  }
}

// 4. Approve Case with Interest Rate and Approved Amount (Operations)
export async function approveCaseAction(
  applicationId: string,
  approvedAmount: number,
  interestRate: number,
  tenureMonths: number,
  bankId?: string,
  note?: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'OPERATIONS' && user.role !== 'ADMIN' && user.role !== 'CENTRAL_SUPPORT') {
      return { ok: false, error: 'Only Operations, Central Support, and Admin staff can approve loan cases.' };
    }

    const application = applicationsRepo.getApplicationById(applicationId);
    if (!application) {
      return { ok: false, error: 'Application not found.' };
    }

    if (!approvedAmount || approvedAmount <= 0) {
      return { ok: false, error: 'Please enter a valid approved loan amount.' };
    }
    if (!interestRate || interestRate <= 0) {
      return { ok: false, error: 'Please enter an approved interest rate.' };
    }

    let bankName: string | undefined = application.bankName || undefined;
    if (bankId) {
      const bank = banksRepo.getBankById(bankId);
      if (bank) {
        bankName = bank.name;
      }
    }

    applicationsRepo.approveApplication(
      applicationId,
      approvedAmount,
      interestRate,
      tenureMonths || 60,
      bankId,
      bankName
    );

    const histNote = `Loan approved by ${bankName || 'Bank'} for ₹${approvedAmount.toLocaleString('en-IN')} @ ${interestRate}% p.a. ${note ? `(${note})` : ''}`;
    statusHistoryRepo.addStatusHistory({
      applicationId,
      status: 'APPROVED',
      note: histNote,
      changedById: user.id,
    });

    workflowRepo.addOperationalRemark({
      applicationId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      statusChangedTo: 'APPROVED',
      remark: histNote,
    });

    // Notify Channel Partner & RM
    if (application.channelPartnerId) {
      workflowRepo.createNotification({
        recipientId: application.channelPartnerId,
        recipientRole: 'CHANNEL_PARTNER',
        applicationId,
        title: `Loan Approved: ₹${approvedAmount.toLocaleString('en-IN')}`,
        message: `Sanction offer ready for ${application.fullName || 'Customer'} at ${interestRate}% by ${bankName || 'Bank'}. Customer acceptance link is now active.`,
      });
    }

    if (application.relationshipManagerId) {
      workflowRepo.createNotification({
        recipientId: application.relationshipManagerId,
        recipientRole: 'RELATIONSHIP_MANAGER',
        applicationId,
        title: `Loan Sanctioned: ₹${approvedAmount.toLocaleString('en-IN')}`,
        message: `Case #${application.id.slice(-6)} sanctioned by ${bankName || 'Bank'}.`,
      });
    }

    revalidatePath('/dashboard');
    revalidatePath('/branch/requests');
    revalidatePath(`/branch/requests/${applicationId}`);
    if (application.token) {
      revalidatePath(`/offer/${application.token}`);
    }

    await syncDatabase();

    return { ok: true, message: 'Case approved. Sanction offer link generated for customer acceptance.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to approve case.';
    return { ok: false, error: msg };
  }
}

// 5. Customer Accepts Loan Offer
export async function customerAcceptOfferAction(
  token: string,
  customerName?: string
): Promise<ActionResult & { acceptanceRef?: string }> {
  try {
    const application = applicationsRepo.getApplicationByToken(token);
    if (!application) {
      return { ok: false, error: 'Application not found or link has expired.' };
    }

    if (application.status !== 'APPROVED') {
      return { ok: false, error: 'This loan application is not currently pending customer acceptance.' };
    }

    const acceptanceRef = `QFS-SANCT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const updated = applicationsRepo.customerAcceptLoanOffer(token, acceptanceRef);
    if (!updated) {
      return { ok: false, error: 'Failed to record acceptance.' };
    }

    statusHistoryRepo.addStatusHistory({
      applicationId: updated.id,
      status: 'CUSTOMER_ACCEPTED',
      note: `Sanction offer officially accepted by customer (${customerName || updated.fullName || 'Customer'}). Acceptance Ref: ${acceptanceRef}`,
    });

    // Notify Operations team
    workflowRepo.addOperationalRemark({
      applicationId: updated.id,
      authorId: 'customer',
      authorName: customerName || updated.fullName || 'Customer',
      authorRole: 'CHANNEL_PARTNER', // using available role enum
      statusChangedTo: 'CUSTOMER_ACCEPTED',
      remark: `Customer reviewed and digitally accepted sanction letter terms. Reference: ${acceptanceRef}. Acceptance letter ready for bank transmission.`,
    });

    // Notify Channel Partner
    if (updated.channelPartnerId) {
      workflowRepo.createNotification({
        recipientId: updated.channelPartnerId,
        recipientRole: 'CHANNEL_PARTNER',
        applicationId: updated.id,
        title: `Customer Accepted Sanction Offer! 🎉`,
        message: `${updated.fullName || 'Customer'} has accepted the loan terms (${acceptanceRef}). Operations will now request disbursement from the bank.`,
      });
    }

    revalidatePath('/dashboard');
    revalidatePath('/branch/requests');
    revalidatePath(`/branch/requests/${updated.id}`);
    revalidatePath(`/offer/${token}`);

    await syncDatabase();

    return { ok: true, message: 'Offer accepted successfully!', acceptanceRef };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to accept loan offer.';
    return { ok: false, error: msg };
  }
}

// 6. Final Disbursement & Commission Calculation (Operations / Admin)
export async function disburseCaseAction(
  applicationId: string,
  disbursedAmount: number,
  note?: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'OPERATIONS' && user.role !== 'ADMIN' && user.role !== 'CENTRAL_SUPPORT') {
      return { ok: false, error: 'Only Operations, Central Support, and Admin staff can mark loan disbursed.' };
    }

    const application = applicationsRepo.getApplicationById(applicationId);
    if (!application) {
      return { ok: false, error: 'Application not found.' };
    }

    if (!disbursedAmount || disbursedAmount <= 0) {
      return { ok: false, error: 'Please enter a valid disbursement amount.' };
    }

    // Determine partner commission rate: check partner's custom rate or bank's commission slab
    let commissionRate = 1.0; // default 1%
    if (application.channelPartnerId) {
      const partner = usersRepo.getUserById(application.channelPartnerId);
      if (partner?.commissionRate !== undefined && partner.commissionRate > 0) {
        commissionRate = partner.commissionRate;
      } else if (application.bankId) {
        const bank = banksRepo.getBankById(application.bankId);
        if (bank && bank.commissionPct) {
          commissionRate = bank.commissionPct;
        }
      }
    }

    const commissionAmount = Math.round((disbursedAmount * commissionRate) / 100);

    // Update application
    applicationsRepo.disburseApplication(applicationId, disbursedAmount, commissionAmount);

    // Record Commission ledger entry
    if (application.channelPartnerId) {
      commissionsRepo.recordCommission({
        tenantId: application.tenantId,
        applicationId,
        channelPartnerId: application.channelPartnerId,
        channelPartnerName: application.channelPartnerName || 'Partner',
        bankId: application.bankId || 'bank_default',
        bankName: application.bankName || 'Lending Bank',
        disbursedAmount,
        commissionRate,
      });
    }

    const histNote = `Loan disbursed: ₹${disbursedAmount.toLocaleString('en-IN')}. Calculated Partner Commission: ₹${commissionAmount.toLocaleString('en-IN')} (${commissionRate}%). ${note ? `Note: ${note}` : ''}`;
    statusHistoryRepo.addStatusHistory({
      applicationId,
      status: 'DISBURSED',
      note: histNote,
      changedById: user.id,
    });

    workflowRepo.addOperationalRemark({
      applicationId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      statusChangedTo: 'DISBURSED',
      remark: histNote,
    });

    // Notify Channel Partner
    if (application.channelPartnerId) {
      workflowRepo.createNotification({
        recipientId: application.channelPartnerId,
        recipientRole: 'CHANNEL_PARTNER',
        applicationId,
        title: `Loan Disbursed! Commission Earned: ₹${commissionAmount.toLocaleString('en-IN')}`,
        message: `Case for ${application.fullName || 'Customer'} has been disbursed. Your payout of ₹${commissionAmount.toLocaleString('en-IN')} is queued.`,
      });
    }

    revalidatePath('/dashboard');
    revalidatePath('/branch/requests');
    revalidatePath(`/branch/requests/${applicationId}`);

    await syncDatabase();

    return { ok: true, message: `Disbursement recorded successfully. Partner commission ₹${commissionAmount.toLocaleString('en-IN')} logged.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record disbursement.';
    return { ok: false, error: msg };
  }
}

// 7. Admin: Partner Compliance & Blocking
export async function blockPartnerAction(
  partnerId: string,
  isBlocked: boolean,
  reason?: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'ADMIN') {
      return { ok: false, error: 'Only Administrators can block or unblock partners.' };
    }

    const partner = usersRepo.getUserById(partnerId);
    if (!partner) {
      return { ok: false, error: 'Partner not found.' };
    }

    usersRepo.setUserBlocked(partnerId, isBlocked, reason);
    revalidatePath('/admin/partners');
    await syncDatabase();
    return {
      ok: true,
      message: isBlocked ? `Partner ${partner.name} has been blocked.` : `Partner ${partner.name} has been unblocked.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update partner status.';
    return { ok: false, error: msg };
  }
}

// 8. Admin: Record Clawback
export async function recordClawbackAction(
  partnerId: string,
  applicationId: string | null,
  amount: number,
  reason: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'ADMIN') {
      return { ok: false, error: 'Only Administrators can execute commission clawbacks.' };
    }

    const partner = usersRepo.getUserById(partnerId);
    if (!partner) {
      return { ok: false, error: 'Partner not found.' };
    }

    if (!amount || amount <= 0) {
      return { ok: false, error: 'Please specify a valid clawback amount.' };
    }
    if (!reason.trim()) {
      return { ok: false, error: 'Please specify a justification/reason for the clawback.' };
    }

    commissionsRepo.recordClawback({
      channelPartnerId: partnerId,
      channelPartnerName: partner.name,
      applicationId: applicationId || null,
      amount,
      reason: reason.trim(),
    });

    workflowRepo.createNotification({
      recipientId: partnerId,
      recipientRole: 'CHANNEL_PARTNER',
      applicationId: applicationId || 'general',
      title: `Commission Clawback Notice: ₹${amount.toLocaleString('en-IN')}`,
      message: `A clawback of ₹${amount.toLocaleString('en-IN')} has been applied to your account. Reason: ${reason.trim()}`,
    });

    revalidatePath('/admin/partners');
    revalidatePath('/admin/commissions');
    await syncDatabase();
    return { ok: true, message: `Clawback of ₹${amount.toLocaleString('en-IN')} recorded against ${partner.name}.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record clawback.';
    return { ok: false, error: msg };
  }
}

// 9. Admin: Bank Management
export async function saveBankAction(data: {
  id?: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  commissionPct: number;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'ADMIN') {
      return { ok: false, error: 'Only Administrators can manage partner banks.' };
    }

    if (!data.name.trim() || !data.code.trim()) {
      return { ok: false, error: 'Bank name and code are required.' };
    }

    if (data.id) {
      banksRepo.updateBank(data.id, data);
    } else {
      banksRepo.createBank({
        name: data.name,
        code: data.code,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        commissionPct: data.commissionPct,
      });
    }

    revalidatePath('/admin/banks');
    await syncDatabase();
    return { ok: true, message: 'Bank details saved.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save bank.';
    return { ok: false, error: msg };
  }
}

export async function deleteBankAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'ADMIN') {
      return { ok: false, error: 'Only Administrators can delete banks.' };
    }

    banksRepo.deleteBank(id);
    revalidatePath('/admin/banks');
    await syncDatabase();
    return { ok: true, message: 'Bank removed.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete bank.';
    return { ok: false, error: msg };
  }
}
