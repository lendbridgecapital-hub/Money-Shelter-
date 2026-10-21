'use server';

import { redirect } from 'next/navigation';
import * as applicationsRepo from '@/lib/repos/applicationsRepo';
import * as documentsRepo from '@/lib/repos/documentsRepo';
import * as statusHistoryRepo from '@/lib/repos/statusHistoryRepo';
import { getBranchById } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import { saveUploadedFile, MAX_FILE_SIZE } from '@/lib/uploads';
import { sendMail, customerConfirmationEmail, branchAlertEmail } from '@/lib/mail';
import { revalidatePath } from 'next/cache';
import { generateApplicationToken } from '@/lib/tokens';
import * as usersRepo from '@/lib/repos/usersRepo';
import * as workflowRepo from '@/lib/repos/workflowRepo';
import { syncDatabase } from '@/lib/db';
import { getDocumentGroupsForApplication } from '@/lib/documentChecklist';
import { LOAN_TYPE_LABELS } from '@/lib/format';
import { notifyTouchpoint01_CustomerSubmitted } from '@/lib/touchpoints';
import type { LoanType, IncomeType } from '@/types/db';

export type SubmitResult = { ok: false; error: string } | { ok: true };

const VALID_LOAN_TYPES: LoanType[] = [
  'HOME_LOAN',
  'PERSONAL_LOAN',
  'BUSINESS_LOAN',
  'LOAN_AGAINST_PROPERTY',
  'EDUCATION_LOAN',
  'GOLD_LOAN',
  'BALANCE_TRANSFER',
  'OTHERS',
];

function collectFiles(formData: FormData, fieldName: string): File[] {
  return formData
    .getAll(fieldName)
    .filter((v): v is File => v instanceof File && v.size > 0);
}

export async function submitCustomerApplication(token: string, formData: FormData): Promise<SubmitResult> {
  const application = await applicationsRepo.getApplicationByTokenAsync(token);
  if (!application) return { ok: false, error: 'This application link is invalid.' };
  if (application.status !== 'LINK_SHARED') {
    return { ok: false, error: 'This link has already been used. Please contact your loan executive for a new link.' };
  }

  const fullName = String(formData.get('fullName') || '').trim();
  const mobile = String(formData.get('mobile') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const loanType = String(formData.get('loanType') || '') as LoanType;
  const rawIncomeType = formData.get('incomeType');
  const rawPropertyPaperType = formData.get('property_paper_type');
  let incomeType = (rawIncomeType ? String(rawIncomeType) : undefined) as IncomeType | undefined;
  if (loanType === 'BUSINESS_LOAN' && (!incomeType || incomeType === 'SALARIED')) {
    incomeType = 'SELF_EMPLOYED_BUSINESS';
  }
  const propertyPaperType = rawPropertyPaperType ? String(rawPropertyPaperType).trim() : undefined;

  const loanAmount = Number(formData.get('loanAmount') || 0);
  const rawOngoingLoan = formData.get('ongoingLoanAmount');
  const ongoingLoanAmount = rawOngoingLoan !== null && rawOngoingLoan !== '' ? Number(rawOngoingLoan) : undefined;
  const rawMonthlyIncome = formData.get('monthlyIncome');
  const monthlyIncome = rawMonthlyIncome !== null && rawMonthlyIncome !== '' ? Number(rawMonthlyIncome) : undefined;
  const rawExistingEmi = formData.get('existingEmi');
  const existingEmi = rawExistingEmi !== null && rawExistingEmi !== '' ? Number(rawExistingEmi) : undefined;
  const rawTenureYears = formData.get('tenureYears');
  const rawTenureMonths = formData.get('tenureMonths');
  const tenureMonths = rawTenureYears
    ? Number(rawTenureYears) * 12
    : rawTenureMonths
    ? Number(rawTenureMonths)
    : undefined;
  const attested = formData.get('selfAttested') === 'on';

  if (!fullName) return { ok: false, error: 'Full name is required.' };
  if (!/^[0-9]{10}$/.test(mobile)) return { ok: false, error: 'Please enter a valid 10-digit mobile number.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!VALID_LOAN_TYPES.includes(loanType)) return { ok: false, error: 'Please select a loan type.' };
  if (!loanAmount || loanAmount <= 0) return { ok: false, error: 'Please enter the loan amount required.' };
  if (loanType === 'BALANCE_TRANSFER' && (!ongoingLoanAmount || ongoingLoanAmount <= 0)) {
    return { ok: false, error: 'Please enter your current ongoing loan outstanding amount to transfer.' };
  }
  if (!attested) return { ok: false, error: 'Please confirm the self-attestation declaration before submitting.' };

  const documentGroups = getDocumentGroupsForApplication(loanType, incomeType);

  // Validate required document groups and file sizes up front, before writing anything.
  const residenceProofType = String(formData.get('residence_proof_type') || '').trim();
  for (const group of documentGroups) {
    const groupFiles = group.fields.flatMap((f) => collectFiles(formData, f.name));
    if (group.required && groupFiles.length === 0) {
      return { ok: false, error: `Please upload at least one document for "${group.title}".` };
    }
    if (group.category === 'RESIDENCE_PROOF' && groupFiles.length > 0 && !residenceProofType) {
      return { ok: false, error: 'Please select which type of residence proof you are uploading.' };
    }
    if (group.category === 'PROPERTY_PAPERS' && groupFiles.length > 0 && !propertyPaperType) {
      return { ok: false, error: 'Please select which type of property paper you are uploading.' };
    }
    for (const file of groupFiles) {
      if (file.size > MAX_FILE_SIZE) {
        return { ok: false, error: `"${file.name}" is larger than 10MB. Please upload a smaller file.` };
      }
    }
  }

  // Persist the basic details + status transition first.
  applicationsRepo.recordCustomerSubmission(application.id, {
    fullName,
    mobile,
    email,
    loanType,
    incomeType,
    propertyPaperType,
    loanAmount,
    ongoingLoanAmount,
    monthlyIncome,
    existingEmi,
    tenureMonths,
  });

  // Save every uploaded document.
  for (const group of documentGroups) {
    for (const field of group.fields) {
      const files = collectFiles(formData, field.name);
      for (const file of files) {
        const saved = await saveUploadedFile(file, application.id);
        let label = field.label;
        if (group.category === 'RESIDENCE_PROOF' && residenceProofType) {
          label = `Residence Proof — ${residenceProofType}`;
        } else if (group.category === 'PROPERTY_PAPERS' && propertyPaperType) {
          label = `Property Paper — ${propertyPaperType}`;
        }
        documentsRepo.addDocument({
          applicationId: application.id,
          category: group.category,
          label,
          ...saved,
        });
      }
    }
  }

  statusHistoryRepo.addStatusHistory({
    applicationId: application.id,
    status: 'DOCUMENTS_IN',
    note: `Customer ${fullName} submitted the application form and KYC documents via the shared link.`,
    changedById: null,
  });

  // Fail-Safe Assertion: Enforce DOCUMENTS_IN transition
  applicationsRepo.updateApplicationStatus(application.id, 'DOCUMENTS_IN');

  // Trigger Touchpoint 01: In-App to RM & Ops + Customer email + Branch/Ops email
  const updatedApplication = applicationsRepo.getApplicationById(application.id) || application;
  try {
    await notifyTouchpoint01_CustomerSubmitted(updatedApplication);
  } catch (err) {
    console.warn('[submitCustomerApplication] Error sending Touchpoint 01 notifications:', err);
  }

  revalidatePath('/dashboard');
  revalidatePath('/branch/requests');
  revalidatePath(`/branch/requests/${application.id}`);

  // MAIN SYSTEM SYNC: Flush customer submission and docs directly to Neon PostgreSQL
  await syncDatabase();

  // Pre-Redirect Guard: Verify that the application is confirmed as DOCUMENTS_IN
  const finalCheck = applicationsRepo.getApplicationById(application.id);
  if (finalCheck && finalCheck.status === 'LINK_SHARED') {
    applicationsRepo.updateApplicationStatus(application.id, 'DOCUMENTS_IN');
    await syncDatabase();
  }

  redirect(`/apply/${token}/success`);
}

export async function submitDigitalCardInquiryAction(formData: FormData): Promise<{ ok: boolean; error?: string; message?: string }> {
  try {
    const advisorId = String(formData.get('advisorId') || '').trim();
    const fullName = String(formData.get('fullName') || '').trim();
    const mobile = String(formData.get('mobile') || '').trim();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const loanType = (formData.get('loanType') || 'PERSONAL_LOAN') as LoanType;
    const loanAmount = Number(formData.get('loanAmount') || 0);
    const city = String(formData.get('city') || '').trim();
    const notes = String(formData.get('notes') || '').trim();

    if (!advisorId) return { ok: false, error: 'Advisor ID is missing.' };
    if (!fullName) return { ok: false, error: 'Please enter your full name.' };
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      return { ok: false, error: 'Please enter a valid 10-digit mobile number.' };
    }

    const advisor = usersRepo.getUserById(advisorId);
    if (!advisor) return { ok: false, error: 'Financial advisor not found.' };

    const app = applicationsRepo.createInquiryFromCard({
      advisorId,
      fullName,
      mobile: cleanMobile,
      email: email || undefined,
      loanType,
      loanAmount: loanAmount > 0 ? loanAmount : undefined,
      city: city || undefined,
      notes: notes || undefined,
    });

    statusHistoryRepo.addStatusHistory({
      applicationId: app.id,
      status: 'LINK_SHARED',
      note: `Inquiry received via ${advisor.name}'s Digital Business Card (${fullName} • ${cleanMobile}).`,
      changedById: advisor.id,
    });

    revalidatePath('/branch/requests');
    revalidatePath('/dashboard');

    // MAIN SYSTEM SYNC: Flush inquiry lead directly to Neon PostgreSQL
    await syncDatabase();

    return {
      ok: true,
      message: `Thank you, ${fullName}! Your inquiry has been sent directly to ${advisor.name}. They will contact you shortly on ${cleanMobile}.`,
    };
  } catch {
    return { ok: false, error: 'Failed to submit inquiry. Please try again.' };
  }
}

export async function uploadCustomerRequiredDocumentAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string; message?: string }> {
  try {
    const token = (formData.get('token') as string) || '';
    const requiredDocId = (formData.get('requiredDocId') as string) || '';
    const file = formData.get('file') as File | null;

    if (!token || !requiredDocId) {
      return { ok: false, error: 'Invalid document upload request.' };
    }

    const application = await applicationsRepo.getApplicationByTokenAsync(token);
    if (!application) {
      return { ok: false, error: 'Loan application not found.' };
    }

    if (!file || !(file instanceof File) || file.size === 0) {
      return { ok: false, error: 'Please select a valid document file to upload.' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, error: 'File size exceeds maximum allowable limit of 10MB.' };
    }

    const reqDoc = workflowRepo.getRequiredDocumentById(requiredDocId);
    if (!reqDoc || reqDoc.applicationId !== application.id) {
      return { ok: false, error: 'Requested document item not found for this application.' };
    }

    const docLabel = reqDoc.documentTitle || file.name || 'Additional Document';
    const saved = await saveUploadedFile(file, application.id);

    workflowRepo.markRequiredDocumentUploaded(requiredDocId, saved.fileUrl);

    documentsRepo.addDocument({
      applicationId: application.id,
      category: 'ADDITIONAL_REQUIRED',
      label: docLabel,
      fileName: saved.fileName,
      fileUrl: saved.fileUrl,
      fileSize: saved.fileSize,
      mimeType: saved.mimeType,
    });

    workflowRepo.addOperationalRemark({
      applicationId: application.id,
      authorId: 'customer',
      authorName: application.fullName || 'Customer (Applicant)',
      authorRole: 'BORROWER',
      remark: `Applicant uploaded required document: "${docLabel}" via secure link.`,
    });

    const allRequired = workflowRepo.listRequiredDocuments(application.id);
    const stillPending = allRequired.some((d) => d.id !== requiredDocId && d.status === 'PENDING');

    if (!stillPending) {
      applicationsRepo.updateApplicationStatus(application.id, 'DOCUMENTS_IN');
      statusHistoryRepo.addStatusHistory({
        applicationId: application.id,
        status: 'DOCUMENTS_IN',
        note: 'All requested documents have been uploaded by customer. Application returned to Documents In for Operations review.',
        changedById: null,
      });

      if (application.relationshipManagerId) {
        workflowRepo.createNotification({
          recipientId: application.relationshipManagerId,
          recipientRole: 'RELATIONSHIP_MANAGER',
          applicationId: application.id,
          title: 'Requested Documents Uploaded',
          message: `Applicant ${application.fullName || 'Customer'} uploaded all requested documents for Case #${application.id.slice(-6)}.`,
        });
      }
    } else {
      statusHistoryRepo.addStatusHistory({
        applicationId: application.id,
        status: application.status,
        note: `Applicant uploaded required document: "${docLabel}". Remaining pending: ${
          allRequired.filter((d) => d.id !== requiredDocId && d.status === 'PENDING').length
        }.`,
        changedById: null,
      });
    }

    revalidatePath('/dashboard');
    revalidatePath('/branch/requests');
    revalidatePath(`/branch/requests/${application.id}`);
    revalidatePath(`/apply/${token}`);

    // MAIN SYSTEM SYNC: Flush uploaded document records directly to Neon PostgreSQL
    await syncDatabase();

    return {
      ok: true,
      message: `Document "${docLabel}" uploaded successfully!`,
    };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Upload failed.' };
  }
}

export async function submitGeneralWebsiteInquiryAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string; message?: string }> {
  try {
    const fullName = String(formData.get('fullName') || '').trim();
    const mobile = String(formData.get('mobile') || '').trim();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const loanType = (formData.get('loanType') || 'HOME_LOAN') as LoanType;
    const loanAmount = Number(formData.get('loanAmount') || 0);
    const city = String(formData.get('city') || '').trim();
    const notes = String(formData.get('notes') || '').trim();

    if (!fullName) return { ok: false, error: 'Please enter your full name.' };
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      return { ok: false, error: 'Please enter a valid 10-digit mobile number.' };
    }

    // Assign to active admin or first staff user
    const users = usersRepo.listUsers();
    const staffUser = users.find((u) => u.role === 'ADMIN' || u.role === 'OPERATIONS' || u.role === 'RELATIONSHIP_MANAGER') || users[0];

    const app = applicationsRepo.createInquiryFromCard({
      advisorId: staffUser ? staffUser.id : 'usr_default_admin',
      fullName,
      mobile: cleanMobile,
      email: email || undefined,
      loanType,
      loanAmount: loanAmount > 0 ? loanAmount : undefined,
      city: city || undefined,
      notes: notes || `Direct website inquiry for ${loanType.replace(/_/g, ' ')} (${city || 'Maharashtra'})`,
    });

    statusHistoryRepo.addStatusHistory({
      applicationId: app.id,
      status: 'LINK_SHARED',
      note: `Inquiry submitted via Money Shelter website (${fullName} • ${cleanMobile} • ${loanType.replace(/_/g, ' ')} • City: ${city || 'Pune/Maharashtra'}).`,
      changedById: staffUser?.id || null,
    });

    revalidatePath('/branch/requests');
    revalidatePath('/dashboard');

    await syncDatabase();

    return {
      ok: true,
      message: `Thank you, ${fullName}! Your financial inquiry has been received. Our senior advisor will contact you within 2 business hours on ${cleanMobile}.`,
    };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to submit inquiry. Please try again.' };
  }
}
