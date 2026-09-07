'use server';

import { redirect } from 'next/navigation';
import * as applicationsRepo from '@/lib/repos/applicationsRepo';
import * as documentsRepo from '@/lib/repos/documentsRepo';
import * as statusHistoryRepo from '@/lib/repos/statusHistoryRepo';
import { getBranchById } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import { saveUploadedFile, MAX_FILE_SIZE } from '@/lib/uploads';
import { sendMail, customerConfirmationEmail, branchAlertEmail } from '@/lib/mail';
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
  applicationsRepo.recordCustomerSubmission(application.id, { fullName, mobile, email, loanType, loanAmount });

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
    status: 'DOCUMENT_RECEIVED',
    note: 'Customer submitted the application form and documents via the shared link.',
    changedById: null,
  });

  // Fire off notification emails — failures here must never block the customer's submission.
  const settings = await getCompanySettings();
  const branch = getBranchById(application.branchId);
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';

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
      branchName: branch?.name || 'Unknown branch',
      applicationUrl: `${base}/branch/requests/${application.id}`,
    });
    await sendMail({ to: alertTo, ...alert });
  }

  redirect(`/apply/${token}/success`);
}
