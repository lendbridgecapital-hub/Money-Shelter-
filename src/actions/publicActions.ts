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
import { DOCUMENT_GROUPS } from '@/lib/documentChecklist';
import { LOAN_TYPE_LABELS } from '@/lib/format';
import type { LoanType } from '@/types/db';

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
  const application = applicationsRepo.getApplicationByToken(token);
  if (!application) return { ok: false, error: 'This application link is invalid.' };
  if (application.status !== 'LINK_SHARED') {
    return { ok: false, error: 'This link has already been used. Please contact your loan executive for a new link.' };
  }

  const fullName = String(formData.get('fullName') || '').trim();
  const mobile = String(formData.get('mobile') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const loanType = String(formData.get('loanType') || '') as LoanType;
  const loanAmount = Number(formData.get('loanAmount') || 0);
  const rawMonthlyIncome = formData.get('monthlyIncome');
  const monthlyIncome = rawMonthlyIncome !== null && rawMonthlyIncome !== '' ? Number(rawMonthlyIncome) : undefined;
  const rawExistingEmi = formData.get('existingEmi');
  const existingEmi = rawExistingEmi !== null && rawExistingEmi !== '' ? Number(rawExistingEmi) : undefined;
  const attested = formData.get('selfAttested') === 'on';

  if (!fullName) return { ok: false, error: 'Full name is required.' };
  if (!/^[0-9]{10}$/.test(mobile)) return { ok: false, error: 'Please enter a valid 10-digit mobile number.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!VALID_LOAN_TYPES.includes(loanType)) return { ok: false, error: 'Please select a loan type.' };
  if (!loanAmount || loanAmount <= 0) return { ok: false, error: 'Please enter the loan amount required.' };
  if (!attested) return { ok: false, error: 'Please confirm the self-attestation declaration before submitting.' };

  // Validate required document groups and file sizes up front, before writing anything.
  const residenceProofType = String(formData.get('residence_proof_type') || '').trim();
  for (const group of DOCUMENT_GROUPS) {
    const groupFiles = group.fields.flatMap((f) => collectFiles(formData, f.name));
    if (group.required && groupFiles.length === 0) {
      return { ok: false, error: `Please upload at least one document for "${group.title}".` };
    }
    if (group.category === 'RESIDENCE_PROOF' && groupFiles.length > 0 && !residenceProofType) {
      return { ok: false, error: 'Please select which type of residence proof you are uploading.' };
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
    loanAmount,
    monthlyIncome,
    existingEmi,
  });

  // Save every uploaded document.
  for (const group of DOCUMENT_GROUPS) {
    for (const field of group.fields) {
      const files = collectFiles(formData, field.name);
      for (const file of files) {
        const saved = await saveUploadedFile(file, application.id);
        const label = group.category === 'RESIDENCE_PROOF' && residenceProofType ? `Residence Proof — ${residenceProofType}` : field.label;
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
    note: 'Customer submitted the application form and documents via the shared link.',
    changedById: null,
  });

  // Fire off notification emails — failures here must never block the customer's submission.
  const settings = await getCompanySettings();
  const branch = getBranchById(application.branchId);
  const base =
    process.env.APP_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost') ? process.env.NEXTAUTH_URL : '') ||
    'https://quicfinsure.onrender.com';

  const confirmation = customerConfirmationEmail({
    fullName,
    companyName: settings.companyName,
    loanType: LOAN_TYPE_LABELS[loanType],
    loanAmount,
  });
  await sendMail({ to: email, ...confirmation });

  const alertTo = branch?.email || settings.officialEmail;
  if (alertTo) {
    const alert = branchAlertEmail({
      fullName,
      mobile,
      email,
      loanType: LOAN_TYPE_LABELS[loanType],
      loanAmount,
      monthlyIncome,
      existingEmi,
      branchName: branch?.name || 'Unknown branch',
      applicationUrl: `${base}/branch/requests/${application.id}`,
    });
    await sendMail({ to: alertTo, ...alert });
  }

  revalidatePath('/dashboard');
  revalidatePath('/branch/requests');
  revalidatePath(`/branch/requests/${application.id}`);

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

    const application = applicationsRepo.getApplicationByToken(token);
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

    return {
      ok: true,
      message: `Document "${docLabel}" uploaded successfully!`,
    };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Upload failed.' };
  }
}
