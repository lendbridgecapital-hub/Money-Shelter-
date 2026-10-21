'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import * as applicationsRepo from '@/lib/repos/applicationsRepo';
import * as statusHistoryRepo from '@/lib/repos/statusHistoryRepo';
import * as workflowRepo from '@/lib/repos/workflowRepo';
import * as banksRepo from '@/lib/repos/banksRepo';
import * as commissionsRepo from '@/lib/repos/commissionsRepo';
import * as rewardsRepo from '@/lib/repos/rewardsRepo';
import * as usersRepo from '@/lib/repos/usersRepo';
import * as documentsRepo from '@/lib/repos/documentsRepo';
import { getProductCommissionSplit } from '@/lib/repos/bankProductsRepo';
import { syncDatabase } from '@/lib/db';
import { saveUploadedFile, MAX_FILE_SIZE } from '@/lib/uploads';
import type { ApplicationStatus, Bank, Role, LoanType } from '@/types/db';
import type { ActionResult } from '@/actions/settingsActions';
import {
  notifyTouchpoint02_SentToBank,
  notifyTouchpoint03_DocumentsRequired,
  notifyTouchpoint04_DocumentsReUploaded,
  notifyTouchpoint05_LoanSanctioned,
  notifyTouchpoint06_OfferAccepted,
  notifyTouchpoint07_LoanDisbursed,
  notifyTouchpoint08_LoanRejected,
  notifyTouchpoint12_ClawbackRecorded,
} from '@/lib/touchpoints';

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

    // Trigger Touchpoint 02: Loan File Sent to Bank (In-App to Partner & RM + Email notice)
    try {
      await notifyTouchpoint02_SentToBank(application, bank.name, { tenantId: application.tenantId });
    } catch (notifErr) {
      console.warn('[sendToBankAction] Error dispatching Touchpoint 02 notifications:', notifErr);
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

    // Check specific touchpoints
    if (status === 'DOCUMENTS_REQUIRED') {
      // Trigger Touchpoint 03: Operational Remark & Document Deficiency Raised
      try {
        await notifyTouchpoint03_DocumentsRequired(
          application,
          { name: user.name, role: user.role },
          remark.trim(),
          requiredDocTitles,
          { tenantId: application.tenantId }
        );
      } catch (e) {
        console.warn('[submitRemarkAction] Error dispatching Touchpoint 03:', e);
      }
    } else if (status === 'REJECTED') {
      // Trigger Touchpoint 08: Loan Application Rejected
      try {
        await notifyTouchpoint08_LoanRejected(
          application,
          remark.trim(),
          { tenantId: application.tenantId }
        );
      } catch (e) {
        console.warn('[submitRemarkAction] Error dispatching Touchpoint 08:', e);
      }
    } else {
      // Flowchart Requirement: Trigger standard notification with status and remark to RM and Channel Partner
      const notifTitle = `Remark on Loan #${application.id.slice(-6)}: ${status}`;
      const notifMsg = `${user.name} (${user.role}): "${remark.trim()}"`;

      if (application.channelPartnerId) {
        workflowRepo.createNotification({
          tenantId: application.tenantId,
          recipientId: application.channelPartnerId,
          recipientRole: 'CHANNEL_PARTNER',
          applicationId,
          title: notifTitle,
          message: notifMsg,
        });
      }

      if (application.relationshipManagerId && application.relationshipManagerId !== user.id) {
        workflowRepo.createNotification({
          tenantId: application.tenantId,
          recipientId: application.relationshipManagerId,
          recipientRole: 'RELATIONSHIP_MANAGER',
          applicationId,
          title: notifTitle,
          message: notifMsg,
        });
      }
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

      // Trigger Touchpoint 04: Deficiency Documents Re-Uploaded (In-App to RM & Ops + status email)
      try {
        await notifyTouchpoint04_DocumentsReUploaded(application, { tenantId: application.tenantId });
      } catch (e) {
        console.warn('[uploadRequiredDocumentFileAction] Error dispatching Touchpoint 04:', e);
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
      // Trigger Touchpoint 04: Deficiency Documents Re-Uploaded
      try {
        await notifyTouchpoint04_DocumentsReUploaded(application, { tenantId: application.tenantId });
      } catch (e) {
        console.warn('[partnerUploadRequiredDocAction] Error dispatching Touchpoint 04:', e);
      }
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

    // Trigger Touchpoint 05: Loan Sanctioned & Approved (In-App to Partner & RM + Customer sanction email with link)
    const updatedApp = applicationsRepo.getApplicationById(applicationId) || application;
    try {
      await notifyTouchpoint05_LoanSanctioned(
        updatedApp,
        approvedAmount,
        interestRate,
        bankName || 'Bank',
        { tenantId: application.tenantId }
      );
    } catch (e) {
      console.warn('[approveCaseAction] Error dispatching Touchpoint 05:', e);
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

// 4b. Reject Loan Case (Operations / Admin)
export async function rejectCaseAction(
  applicationId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'OPERATIONS' && user.role !== 'ADMIN' && user.role !== 'CENTRAL_SUPPORT') {
      return { ok: false, error: 'Only Operations, Central Support, and Admin staff can reject loan cases.' };
    }

    const application = applicationsRepo.getApplicationById(applicationId);
    if (!application) {
      return { ok: false, error: 'Application not found.' };
    }

    if (!reason || !reason.trim()) {
      return { ok: false, error: 'Please provide a reason for rejecting the case.' };
    }

    const rejectNote = reason.trim();
    applicationsRepo.updateApplicationStatus(applicationId, 'REJECTED');

    statusHistoryRepo.addStatusHistory({
      applicationId,
      status: 'REJECTED',
      note: `Case rejected: ${rejectNote}`,
      changedById: user.id,
    });

    workflowRepo.addOperationalRemark({
      applicationId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      statusChangedTo: 'REJECTED',
      remark: `Case rejected: ${rejectNote}`,
    });

    try {
      await notifyTouchpoint08_LoanRejected(
        application,
        rejectNote,
        { tenantId: application.tenantId }
      );
    } catch (e) {
      console.warn('[rejectCaseAction] Error dispatching Touchpoint 08:', e);
    }

    revalidatePath('/dashboard');
    revalidatePath('/branch/requests');
    revalidatePath(`/branch/requests/${applicationId}`);

    await syncDatabase();

    return { ok: true, message: 'Case has been marked as Rejected.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reject case.';
    return { ok: false, error: msg };
  }
}

// 5. Customer Accepts Loan Offer
export async function customerAcceptOfferAction(
  token: string,
  customerName?: string
): Promise<ActionResult & { acceptanceRef?: string }> {
  try {
    const application = await applicationsRepo.getApplicationByTokenAsync(token);
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

    // Trigger Touchpoint 06: Customer Digitally Accepts Sanction Offer (In-App to Partner & Ops + Email copy)
    try {
      await notifyTouchpoint06_OfferAccepted(updated, acceptanceRef, { tenantId: updated.tenantId });
    } catch (e) {
      console.warn('[customerAcceptOfferAction] Error dispatching Touchpoint 06:', e);
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

    // Determine partner commission rate from product split, partner custom rate, or bank slab
    const split = getProductCommissionSplit(application.loanType || 'PERSONAL_LOAN', application.tenantId);
    const partnerId = application.channelPartnerId || application.createdById;
    const partner = partnerId ? usersRepo.getUserById(partnerId) : undefined;

    let commissionRate = split.partnerRate;
    if (partner?.commissionRate !== undefined && partner.commissionRate > 0) {
      commissionRate = partner.commissionRate;
    } else if (application.bankId) {
      const bank = banksRepo.getBankById(application.bankId);
      if (bank && bank.commissionPct) {
        commissionRate = bank.commissionPct;
      }
    }

    const commissionAmount = Math.round((disbursedAmount * commissionRate) / 100);

    // Check if partner is mapped under a Sub-DSA (Team Business)
    let overrideAmount = 0;
    const overrideRate = split.subDsaRate || 0.1;
    let subDsa: any = undefined;
    if (partner?.parentSubDsaId) {
      subDsa = usersRepo.getUserById(partner.parentSubDsaId);
    }

    // Update application
    applicationsRepo.disburseApplication(applicationId, disbursedAmount, commissionAmount);

    // Record Commission ledger entries
    if (partner) {
      const isDirectSubDsa = partner.role === 'SUB_DSA';

      // 1. Primary Direct Commission (to Agent or Sub-DSA acting as primary agent)
      commissionsRepo.recordCommission({
        tenantId: application.tenantId,
        applicationId,
        channelPartnerId: partner.id,
        channelPartnerName: partner.name,
        bankId: application.bankId || 'bank_default',
        bankName: application.bankName || 'Lending Bank',
        disbursedAmount,
        commissionRate,
        commissionAmount,
        earningType: 'DIRECT',
        productName: split.productName,
        bankPayoutRate: split.baseRate,
        subDsaOverrideRate: subDsa ? overrideRate : 0,
        netCompanyMargin: subDsa
          ? Math.max(0, Number((split.baseRate - commissionRate - overrideRate).toFixed(2)))
          : Math.max(0, Number((split.baseRate - commissionRate).toFixed(2))),
      });

      // Credit CRP (Credit Reward Points: 1 CRP = ₹10) to Partner Wallet
      rewardsRepo.creditCommissionReward({
        tenantId: application.tenantId,
        partnerId: partner.id,
        partnerName: partner.name,
        applicationId,
        customerName: application.fullName,
        customerMobile: application.mobile,
        loanType: application.loanType,
        disbursedAmount,
        commissionAmount,
        earningType: 'DIRECT',
      });

      // 2. Override Commission for Sub-DSA (Team Business)
      if (subDsa && !isDirectSubDsa) {
        overrideAmount = Math.round((disbursedAmount * overrideRate) / 100);
        commissionsRepo.recordCommission({
          tenantId: application.tenantId,
          applicationId,
          channelPartnerId: subDsa.id,
          channelPartnerName: subDsa.name,
          bankId: application.bankId || 'bank_default',
          bankName: application.bankName || 'Lending Bank',
          disbursedAmount,
          commissionRate: overrideRate,
          commissionAmount: overrideAmount,
          earningType: 'OVERRIDE',
          sourcePartnerId: partner.id,
          sourcePartnerName: partner.name,
          productName: split.productName,
          bankPayoutRate: split.baseRate,
          subDsaOverrideRate: overrideRate,
          netCompanyMargin: Math.max(0, Number((split.baseRate - commissionRate - overrideRate).toFixed(2))),
        });

        // Credit CRP to Sub-DSA Wallet for Team Override
        rewardsRepo.creditCommissionReward({
          tenantId: application.tenantId,
          partnerId: subDsa.id,
          partnerName: subDsa.name,
          applicationId,
          customerName: application.fullName,
          customerMobile: application.mobile,
          loanType: application.loanType,
          disbursedAmount,
          commissionAmount: overrideAmount,
          earningType: 'OVERRIDE',
          sourcePartnerName: partner.name,
        });

        // Notify Sub-DSA about the override commission & CRP points
        const subDsaCrp = Math.round((overrideAmount / 10) * 100) / 100;
        workflowRepo.createNotification({
          recipientId: subDsa.id,
          recipientRole: 'SUB_DSA',
          applicationId,
          title: `Team Override Earned: ₹${overrideAmount.toLocaleString('en-IN')} (${subDsaCrp.toLocaleString('en-IN')} CRP)! 🚀`,
          message: `Your mapped partner ${partner.name} closed a ${split.productName} for ₹${disbursedAmount.toLocaleString('en-IN')}. You earned an override of ₹${overrideAmount.toLocaleString('en-IN')} (+${subDsaCrp} CRP credited to your wallet).`,
        });
      }
    }

    const histNote = `Loan disbursed: ₹${disbursedAmount.toLocaleString('en-IN')}. Direct Commission: ₹${commissionAmount.toLocaleString('en-IN')} (${commissionRate}%)${overrideAmount > 0 ? ` + Sub-DSA Override: ₹${overrideAmount.toLocaleString('en-IN')} (${overrideRate}%)` : ''}. ${note ? `Note: ${note}` : ''}`;
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

    // Trigger Touchpoint 07: Loan Disbursed & Commission Credited (In-App to Partner + Commission credit email)
    if (partner) {
      try {
        await notifyTouchpoint07_LoanDisbursed(
          application,
          disbursedAmount,
          commissionAmount,
          commissionRate,
          partner,
          { tenantId: application.tenantId }
        );
      } catch (e) {
        console.warn('[disburseCaseAction] Error dispatching Touchpoint 07:', e);
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/branch/requests');
    revalidatePath(`/branch/requests/${applicationId}`);
    revalidatePath('/admin/rewards');
    revalidatePath('/admin/commissions');

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

    // Trigger Touchpoint 12: Commission Clawback Recorded (In-App to Partner + Statement adjustment email)
    try {
      await notifyTouchpoint12_ClawbackRecorded(
        partner,
        amount,
        reason.trim(),
        applicationId,
        { tenantId: partner.tenantId }
      );
    } catch (e) {
      console.warn('[recordClawbackAction] Error dispatching Touchpoint 12:', e);
    }

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

// 12. Edit Customer Information (Operations / Admin) with Mandatory Remark
export async function editCustomerInformationAction(
  applicationId: string,
  data: {
    fullName: string;
    mobile: string;
    email?: string | null;
    loanType: LoanType;
    loanAmount: number;
    ongoingLoanAmount?: number | null;
    monthlyIncome?: number | null;
    existingEmi?: number | null;
    tenureMonths?: number | null;
    panNumber?: string | null;
    aadhaarNumber?: string | null;
    remark: string; // MANDATORY!
  }
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== 'OPERATIONS' && user.role !== 'ADMIN' && user.role !== 'CENTRAL_SUPPORT') {
      return { ok: false, error: 'Only Operations, Central Support, and Admin staff have permission to edit customer information.' };
    }

    if (!data.remark || !data.remark.trim()) {
      return { ok: false, error: 'A mandatory remark explaining the reason for modifying customer information is required.' };
    }

    if (!data.fullName || !data.fullName.trim()) {
      return { ok: false, error: 'Customer full name cannot be empty.' };
    }

    if (!data.mobile || !data.mobile.trim()) {
      return { ok: false, error: 'Customer mobile number cannot be empty.' };
    }

    const application = applicationsRepo.getApplicationById(applicationId);
    if (!application) {
      return { ok: false, error: 'Application not found.' };
    }

    // Compare fields and generate comprehensive audit log diff
    const changes: string[] = [];
    if (data.fullName.trim() !== (application.fullName || '').trim()) {
      changes.push(`Name: '${application.fullName || '—'}' → '${data.fullName.trim()}'`);
    }
    if (data.mobile.trim() !== (application.mobile || '').trim()) {
      changes.push(`Mobile: '${application.mobile || '—'}' → '${data.mobile.trim()}'`);
    }
    if ((data.email || '').trim().toLowerCase() !== (application.email || '').trim().toLowerCase()) {
      changes.push(`Email: '${application.email || '—'}' → '${(data.email || '—').trim().toLowerCase()}'`);
    }
    if (data.loanType !== application.loanType) {
      changes.push(`Loan Type: '${application.loanType || '—'}' → '${data.loanType}'`);
    }
    if (Number(data.loanAmount) !== Number(application.loanAmount)) {
      changes.push(`Loan Amount: ₹${Number(application.loanAmount || 0).toLocaleString('en-IN')} → ₹${Number(data.loanAmount).toLocaleString('en-IN')}`);
    }
    if (data.ongoingLoanAmount !== undefined && Number(data.ongoingLoanAmount || 0) !== Number(application.ongoingLoanAmount || 0)) {
      changes.push(`Ongoing Loan Amount: ₹${Number(application.ongoingLoanAmount || 0).toLocaleString('en-IN')} → ₹${Number(data.ongoingLoanAmount || 0).toLocaleString('en-IN')}`);
    }
    if (Number(data.monthlyIncome || 0) !== Number(application.monthlyIncome || 0)) {
      changes.push(`Monthly Income: ₹${Number(application.monthlyIncome || 0).toLocaleString('en-IN')} → ₹${Number(data.monthlyIncome || 0).toLocaleString('en-IN')}`);
    }
    if (Number(data.existingEmi || 0) !== Number(application.existingEmi || 0)) {
      changes.push(`Existing EMI: ₹${Number(application.existingEmi || 0).toLocaleString('en-IN')} → ₹${Number(data.existingEmi || 0).toLocaleString('en-IN')}`);
    }
    if (data.tenureMonths !== undefined && data.tenureMonths !== application.tenureMonths) {
      const oldTenure = application.tenureMonths ? `${application.tenureMonths / 12} yrs (${application.tenureMonths}m)` : '—';
      const newTenure = data.tenureMonths ? `${data.tenureMonths / 12} yrs (${data.tenureMonths}m)` : '—';
      changes.push(`Tenure: ${oldTenure} → ${newTenure}`);
    }
    if ((data.panNumber || '').trim().toUpperCase() !== (application.panNumber || '').trim().toUpperCase()) {
      changes.push(`PAN: '${application.panNumber || '—'}' → '${(data.panNumber || '—').trim().toUpperCase()}'`);
    }
    if ((data.aadhaarNumber || '').trim().replace(/\s+/g, '') !== (application.aadhaarNumber || '').trim().replace(/\s+/g, '')) {
      changes.push(`Aadhaar: '${application.aadhaarNumber || '—'}' → '${(data.aadhaarNumber || '—').trim().replace(/\s+/g, '')}'`);
    }

    const diffSummary = changes.length > 0 ? changes.join('; ') : 'No field values modified';

    // 1. Update database record
    applicationsRepo.updateApplicationCustomerInfo(applicationId, {
      fullName: data.fullName,
      mobile: data.mobile,
      email: data.email,
      loanType: data.loanType,
      loanAmount: Number(data.loanAmount) || 0,
      ongoingLoanAmount: data.ongoingLoanAmount !== undefined ? Number(data.ongoingLoanAmount) : null,
      monthlyIncome: data.monthlyIncome !== undefined ? Number(data.monthlyIncome) : null,
      existingEmi: data.existingEmi !== undefined ? Number(data.existingEmi) : null,
      tenureMonths: data.tenureMonths !== undefined ? Number(data.tenureMonths) : null,
      panNumber: data.panNumber,
      aadhaarNumber: data.aadhaarNumber,
    });

    // 2. Add to Operational Remarks
    workflowRepo.addOperationalRemark({
      applicationId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      statusChangedTo: application.status,
      remark: `✏️ [Customer Info Edited]: ${data.remark.trim()}${changes.length > 0 ? ` [Modifications: ${diffSummary}]` : ''}`,
    });

    // 3. Add to Lifecycle Status History (Audit Trail)
    statusHistoryRepo.addStatusHistory({
      applicationId,
      status: application.status,
      note: `Customer info edited by ${user.name} (${user.role}). Mandatory Remark: "${data.remark.trim()}". ${changes.length > 0 ? `Modifications: ${diffSummary}` : ''}`,
      changedById: user.id,
    });

    // 4. Synchronously flush to Neon PostgreSQL
    await syncDatabase();

    // 5. Revalidate cache
    revalidatePath(`/branch/requests/${applicationId}`);
    revalidatePath('/branch/requests');
    revalidatePath('/dashboard');
    revalidatePath('/ops/eligibility');

    return { ok: true, message: 'Customer information successfully updated and recorded in log history.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update customer information.';
    return { ok: false, error: msg };
  }
}
