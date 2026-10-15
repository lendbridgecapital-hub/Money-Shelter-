import { sendMail } from '@/lib/mail';
import { getCompanySettings } from '@/lib/settings';
import { getBranchById } from '@/lib/repos/branchesRepo';
import { getUserById, listUsers } from '@/lib/repos/usersRepo';
import { createNotification } from '@/lib/repos/workflowRepo';
import { formatCurrencyINR, LOAN_TYPE_LABELS } from '@/lib/format';
import type { LoanApplication, User, Role } from '@/types/db';

export function getBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }
  return 'https://quicfinsure.onrender.com';
}

function getOpsAndSupportUsers(tenantId = 'default'): User[] {
  try {
    const all = listUsers(tenantId);
    return all.filter(
      (u) =>
        u.active &&
        !u.isBlocked &&
        (u.role === 'OPERATIONS' || u.role === 'CENTRAL_SUPPORT' || u.role === 'ADMIN')
    );
  } catch {
    return [];
  }
}

/**
 * TOUCHPOINT 01: Customer Application Submitted
 * Trigger: Customer submits online loan form and uploads KYC documents via /apply/[token]
 * In-App: Relationship Manager & Central Operations Team
 * Email 1: To Customer (Customer Application Received)
 * Email 2: To Branch / Operations Desk (New Loan Application Received)
 */
export async function notifyTouchpoint01_CustomerSubmitted(
  application: LoanApplication,
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || application.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';
  const fullName = application.fullName || 'Customer';
  const loanTypeLabel = application.loanType ? LOAN_TYPE_LABELS[application.loanType] || application.loanType : 'Loan';
  const loanAmount = application.loanAmount || 0;
  const baseUrl = getBaseUrl();
  const applicationUrl = `${baseUrl}/branch/requests/${application.id}`;

  // 1. In-App Notification: Relationship Manager & Central Operations Team
  const notifTitle = 'New Loan Application Received';
  const notifMsg = `Customer ${fullName} has submitted their loan application and uploaded self-attested documents for ${loanTypeLabel} (₹${loanAmount.toLocaleString('en-IN')}).`;

  // To RM (if assigned)
  if (application.relationshipManagerId) {
    try {
      createNotification({
        tenantId,
        recipientId: application.relationshipManagerId,
        recipientRole: 'RELATIONSHIP_MANAGER',
        applicationId: application.id,
        title: notifTitle,
        message: notifMsg,
      });
    } catch (e) {
      console.warn('[TP01] Failed to notify RM in-app:', e);
    }
  }

  // To Central Operations & Support Team
  const opsUsers = getOpsAndSupportUsers(tenantId);
  for (const opsUser of opsUsers) {
    try {
      createNotification({
        tenantId,
        recipientId: opsUser.id,
        recipientRole: opsUser.role,
        applicationId: application.id,
        title: notifTitle,
        message: notifMsg,
      });
    } catch {}
  }

  // 2. Email Notification 1: To Customer
  if (application.email) {
    try {
      await sendMail({
        to: application.email,
        tenantId,
        subject: `Loan Application Received — ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
            <h2 style="color: #1e40af; margin-top: 0;">Application Received Successfully</h2>
            <p>Dear <strong>${fullName}</strong>,</p>
            <p>Thank you for submitting your loan application with <strong>${companyName}</strong>. We have received your documents and details.</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #1e40af; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Loan Type:</strong> ${loanTypeLabel}</p>
              <p style="margin: 4px 0;"><strong>Requested Amount:</strong> ₹${loanAmount.toLocaleString('en-IN')}</p>
              <p style="margin: 4px 0;"><strong>Current Status:</strong> Document Received & Under Verification</p>
            </div>
            <p>Our dedicated loan relationship manager is currently reviewing your documents and verifying eligibility with our partner banking institutions. We will get in touch with you shortly.</p>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Warm regards,<br/><strong>${companyName} Team</strong></p>
          </div>
        `,
      });
    } catch (e) {
      console.warn('[TP01] Failed to send customer confirmation email:', e);
    }
  }

  // 3. Email Notification 2: To Branch / Ops Desk
  const branch = application.branchId ? getBranchById(application.branchId) : undefined;
  const branchName = branch?.name || application.branchName || 'Central Branch';
  const handlingBranch = branch?.mappedBranchId ? getBranchById(branch.mappedBranchId) : undefined;
  const alertRecipient = branch?.email || handlingBranch?.email || settings.officialEmail;

  if (alertRecipient) {
    try {
      await sendMail({
        to: alertRecipient,
        tenantId,
        subject: `🔔 New Loan Application Received — ${fullName} (${branchName})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
            <h2 style="color: #059669; margin-top: 0;">New Loan Application Received</h2>
            <p>A customer has just submitted their loan application and uploaded self-attested documents.</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Applicant Name:</strong> ${fullName}</p>
              <p style="margin: 4px 0;"><strong>Mobile:</strong> <a href="tel:${application.mobile || ''}">${application.mobile || '—'}</a></p>
              <p style="margin: 4px 0;"><strong>Email:</strong> ${application.email || '—'}</p>
              <p style="margin: 4px 0;"><strong>${branch?.type === 'SITE' ? 'Project Site / Code:' : 'Branch Code / Name:'}</strong> ${branch?.code || '—'} (${branchName})${branch?.type === 'SITE' ? ' — Direct Company Project' : ''}</p>
              ${branch?.type === 'SITE' && handlingBranch ? `<p style="margin: 4px 0;"><strong>Handling Operating Branch:</strong> ${handlingBranch.name} (${handlingBranch.code})</p>` : ''}
              ${application.relationshipManagerName ? `<p style="margin: 4px 0;"><strong>Dedicated RM:</strong> ${application.relationshipManagerName}</p>` : ''}
              <p style="margin: 4px 0;"><strong>Product Type:</strong> ${loanTypeLabel}</p>
              <p style="margin: 4px 0;"><strong>Requested Amount:</strong> ₹${loanAmount.toLocaleString('en-IN')}</p>
              ${application.monthlyIncome ? `<p style="margin: 4px 0;"><strong>Monthly Income:</strong> ₹${Number(application.monthlyIncome).toLocaleString('en-IN')}</p>` : ''}
              ${application.existingEmi ? `<p style="margin: 4px 0;"><strong>Existing EMI(s):</strong> ₹${Number(application.existingEmi).toLocaleString('en-IN')}</p>` : ''}
            </div>
            <p style="margin: 24px 0;">
              <a href="${applicationUrl}" style="background-color: #1e40af; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Review Documents & Application →
              </a>
            </p>
            <p style="font-size: 13px; color: #64748b;">Direct Portal URL: <a href="${applicationUrl}">${applicationUrl}</a></p>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Warm regards,<br/><strong>${companyName} Automated System</strong></p>
          </div>
        `,
      });
    } catch (e) {
      console.warn('[TP01] Failed to send branch/ops alert email:', e);
    }
  }

  // Also send to handling branch email if distinct from site email
  if (handlingBranch?.email && handlingBranch.email !== alertRecipient) {
    try {
      await sendMail({
        to: handlingBranch.email,
        tenantId,
        subject: `🔔 Operations Alert: Site Project Application Received — ${fullName} (${branchName})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
            <h2 style="color: #059669; margin-top: 0;">Site Operations: New Application Received</h2>
            <p>Your branch has been assigned to handle underwriting and operations for project site <strong>${branchName}</strong>.</p>
            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Applicant Name:</strong> ${fullName}</p>
              <p style="margin: 4px 0;"><strong>Mobile:</strong> <a href="tel:${application.mobile || ''}">${application.mobile || '—'}</a></p>
              <p style="margin: 4px 0;"><strong>Project Site:</strong> ${branchName} (${branch?.code || '—'})</p>
              <p style="margin: 4px 0;"><strong>Handling Branch:</strong> ${handlingBranch.name} (${handlingBranch.code})</p>
              ${application.relationshipManagerName ? `<p style="margin: 4px 0;"><strong>Dedicated RM:</strong> ${application.relationshipManagerName}</p>` : ''}
              <p style="margin: 4px 0;"><strong>Product:</strong> ${loanTypeLabel} · ₹${loanAmount.toLocaleString('en-IN')}</p>
            </div>
            <p style="margin: 24px 0;">
              <a href="${applicationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Process Site Application File →
              </a>
            </p>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Warm regards,<br/><strong>${companyName} Automated System</strong></p>
          </div>
        `,
      });
    } catch (e) {
      console.warn('[TP01] Failed to send mapped handling branch alert email:', e);
    }
  }
}

/**
 * TOUCHPOINT 02: Loan File Sent to Bank
 * Trigger: Operations selects bank and submits case via sendToBankAction
 * In-App 1: To Channel Partner
 * In-App 2: To Assigned RM
 * Email: Bank dispatch alert
 */
export async function notifyTouchpoint02_SentToBank(
  application: LoanApplication,
  bankName: string,
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || application.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';
  const fullName = application.fullName || 'Customer';
  const caseIdDisplay = application.id.slice(-6);

  // 1. In-App Notification 1 (To Channel Partner)
  const partnerId = application.channelPartnerId || application.createdById;
  if (partnerId) {
    try {
      createNotification({
        tenantId,
        recipientId: partnerId,
        recipientRole: 'CHANNEL_PARTNER',
        applicationId: application.id,
        title: `Loan File Sent to Bank: ${bankName}`,
        message: `Case for ${fullName} has been submitted to ${bankName} by Operations team.`,
      });
    } catch {}
  }

  // 2. In-App Notification 2 (To Assigned RM)
  if (application.relationshipManagerId) {
    try {
      createNotification({
        tenantId,
        recipientId: application.relationshipManagerId,
        recipientRole: 'RELATIONSHIP_MANAGER',
        applicationId: application.id,
        title: `Case Dispatched to ${bankName}`,
        message: `Application #${caseIdDisplay} submitted to ${bankName}. File is under bank credit appraisal.`,
      });
    } catch {}
  }

  // 3. Email Notification to Channel Partner
  if (partnerId) {
    const partner = getUserById(partnerId);
    if (partner?.email) {
      try {
        await sendMail({
          to: partner.email,
          tenantId,
          subject: `Loan File Dispatched to Bank: ${bankName} — ${fullName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
              <h2 style="color: #1e40af; margin-top: 0;">Loan File Dispatched to ${bankName}</h2>
              <p>Dear <strong>${partner.name}</strong>,</p>
              <p>The case file for <strong>${fullName}</strong> has been submitted to <strong>${bankName}</strong> by the Operations team.</p>
              <div style="background-color: #f8fafc; border-left: 4px solid #1e40af; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 4px 0;"><strong>Case ID:</strong> #${caseIdDisplay}</p>
                <p style="margin: 4px 0;"><strong>Applicant:</strong> ${fullName}</p>
                <p style="margin: 4px 0;"><strong>Lending Institution:</strong> ${bankName}</p>
                <p style="margin: 4px 0;"><strong>Current Status:</strong> Under Bank Credit Appraisal</p>
              </div>
              <p>You can track the progress and status updates directly in your partner portal.</p>
              <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Warm regards,<br/><strong>${companyName} Operations Desk</strong></p>
            </div>
          `,
        });
      } catch {}
    }
  }
}

/**
 * TOUCHPOINT 03: Operational Remark & Document Deficiency Raised
 * Trigger: Bank credit queries require missing paperwork (status DOCUMENTS_REQUIRED)
 * In-App 1: To Channel Partner
 * In-App 2: To Assigned RM
 * Email: Actionable Deficiency Notice to Partner
 */
export async function notifyTouchpoint03_DocumentsRequired(
  application: LoanApplication,
  author: { name: string; role: Role | string },
  remarkText: string,
  requiredDocTitles?: string[],
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || application.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';
  const fullName = application.fullName || 'Customer';
  const caseIdDisplay = application.id.slice(-6);
  const baseUrl = getBaseUrl();
  const uploadUrl = `${baseUrl}/branch/requests/${application.id}`;

  const partnerId = application.channelPartnerId || application.createdById;

  // 1. In-App Notification 1 (To Channel Partner)
  if (partnerId) {
    try {
      createNotification({
        tenantId,
        recipientId: partnerId,
        recipientRole: 'CHANNEL_PARTNER',
        applicationId: application.id,
        title: `Remark on Loan #${caseIdDisplay}: DOCUMENTS_REQUIRED`,
        message: `${author.name} (${author.role}): "${remarkText}"`,
      });
    } catch {}
  }

  // 2. In-App Notification 2 (To Assigned RM)
  if (application.relationshipManagerId) {
    try {
      createNotification({
        tenantId,
        recipientId: application.relationshipManagerId,
        recipientRole: 'RELATIONSHIP_MANAGER',
        applicationId: application.id,
        title: `Remark on Loan #${caseIdDisplay}: DOCUMENTS_REQUIRED`,
        message: `Operational query raised on ${fullName}'s file: "${remarkText}".`,
      });
    } catch {}
  }

  // 3. Email Notification: Actionable Deficiency Notice to Partner
  if (partnerId) {
    const partner = getUserById(partnerId);
    if (partner?.email) {
      const docListHtml = requiredDocTitles && requiredDocTitles.length > 0
        ? `<div style="margin-top: 10px;"><strong>Missing Documents Requested:</strong><ul style="margin: 6px 0 0 16px; padding: 0;">${requiredDocTitles.map((d) => `<li style="margin-bottom: 4px;">${d}</li>`).join('')}</ul></div>`
        : '';

      try {
        await sendMail({
          to: partner.email,
          tenantId,
          subject: `Action Required: Additional Documents Requested for ${fullName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
              <h2 style="color: #d97706; margin-top: 0;">⚠️ Action Required: Additional Documents Requested</h2>
              <p>Dear <strong>${partner.name}</strong>,</p>
              <p>The credit appraisal team has raised an operational query for customer <strong>${fullName}</strong> (Case #${caseIdDisplay}).</p>
              <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 4px 0;"><strong>Query / Remark:</strong> "${remarkText}"</p>
                ${docListHtml}
              </div>
              <p>Please upload the requested paperwork promptly via your portal to resume credit processing:</p>
              <p style="margin: 24px 0;">
                <a href="${uploadUrl}" style="background-color: #d97706; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Upload Requested Documents →
                </a>
              </p>
              <p style="font-size: 13px; color: #64748b;">Portal Link: <a href="${uploadUrl}">${uploadUrl}</a></p>
              <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Warm regards,<br/><strong>${companyName} Operations Team</strong></p>
            </div>
          `,
        });
      } catch {}
    }
  }
}

/**
 * TOUCHPOINT 04: Deficiency Documents Re-Uploaded
 * Trigger: Partner or customer uploads requested document file
 * In-App: To Assigned RM & Central Operations
 * Email: Internal status email
 */
export async function notifyTouchpoint04_DocumentsReUploaded(
  application: LoanApplication,
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || application.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';
  const fullName = application.fullName || 'Customer';
  const caseIdDisplay = application.id.slice(-6);
  const baseUrl = getBaseUrl();
  const caseUrl = `${baseUrl}/branch/requests/${application.id}`;

  const notifTitle = 'All Required Documents Uploaded';
  const notifMsg = `All requested documents for ${fullName} (Case #${caseIdDisplay}) have been uploaded. Ready for Operations review.`;

  // 1. In-App Notification (To Assigned RM)
  if (application.relationshipManagerId) {
    try {
      createNotification({
        tenantId,
        recipientId: application.relationshipManagerId,
        recipientRole: 'RELATIONSHIP_MANAGER',
        applicationId: application.id,
        title: notifTitle,
        message: notifMsg,
      });
    } catch {}
  }

  // 2. In-App Notification (To Central Operations & Support)
  const opsUsers = getOpsAndSupportUsers(tenantId);
  for (const opsUser of opsUsers) {
    try {
      createNotification({
        tenantId,
        recipientId: opsUser.id,
        recipientRole: opsUser.role,
        applicationId: application.id,
        title: notifTitle,
        message: notifMsg,
      });
    } catch {}
  }

  // 3. Email Notification: Internal Status Email
  const branch = application.branchId ? getBranchById(application.branchId) : undefined;
  const alertRecipient = branch?.email || settings.officialEmail;
  if (alertRecipient) {
    try {
      await sendMail({
        to: alertRecipient,
        tenantId,
        subject: `🔔 Documents Re-Uploaded — ${fullName} (Case #${caseIdDisplay})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
            <h2 style="color: #059669; margin-top: 0;">Documents Re-Uploaded for Review</h2>
            <p>All requested documents have been uploaded for customer <strong>${fullName}</strong> (Case #${caseIdDisplay}).</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Case ID:</strong> #${caseIdDisplay}</p>
              <p style="margin: 4px 0;"><strong>Applicant:</strong> ${fullName}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> Documents In (Ready for Operations Review)</p>
            </div>
            <p style="margin: 24px 0;">
              <a href="${caseUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Review Application & Documents →
              </a>
            </p>
            <p style="color: #64748b; font-size: 13px;">Warm regards,<br/><strong>${companyName} System</strong></p>
          </div>
        `,
      });
    } catch {}
  }
}

/**
 * TOUCHPOINT 05: Loan Sanctioned & Approved
 * Trigger: Operations enters approved amount, interest rate, and tenure via approveCaseAction
 * In-App 1: To Channel Partner
 * In-App 2: To Assigned RM
 * Email: To Customer with Sanction Acceptance Link
 */
export async function notifyTouchpoint05_LoanSanctioned(
  application: LoanApplication,
  approvedAmount: number,
  interestRate: number,
  bankName: string,
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || application.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';
  const fullName = application.fullName || 'Customer';
  const caseIdDisplay = application.id.slice(-6);
  const tenureMonths = application.tenureMonths || 60;
  const baseUrl = getBaseUrl();
  const offerUrl = application.token ? `${baseUrl}/offer/${application.token}` : `${baseUrl}/dashboard`;

  // 1. In-App Notification 1 (To Channel Partner)
  const partnerId = application.channelPartnerId || application.createdById;
  if (partnerId) {
    try {
      createNotification({
        tenantId,
        recipientId: partnerId,
        recipientRole: 'CHANNEL_PARTNER',
        applicationId: application.id,
        title: `Loan Approved: ₹${approvedAmount.toLocaleString('en-IN')} 🎉`,
        message: `Sanction offer ready for ${fullName} at ${interestRate}% by ${bankName}. Customer acceptance link is now active.`,
      });
    } catch {}
  }

  // 2. In-App Notification 2 (To Assigned RM)
  if (application.relationshipManagerId) {
    try {
      createNotification({
        tenantId,
        recipientId: application.relationshipManagerId,
        recipientRole: 'RELATIONSHIP_MANAGER',
        applicationId: application.id,
        title: `Loan Sanctioned: ₹${approvedAmount.toLocaleString('en-IN')}`,
        message: `Case #${caseIdDisplay} sanctioned by ${bankName} @ ${interestRate}% p.a.`,
      });
    } catch {}
  }

  // 3. Email Notification (To Customer with Sanction Acceptance Link)
  if (application.email) {
    try {
      await sendMail({
        to: application.email,
        tenantId,
        subject: `Congratulations! Your Loan Sanction Offer is Ready — ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
            <h2 style="color: #16a34a; margin-top: 0;">🎉 Congratulations! Your Loan Sanction Offer is Ready</h2>
            <p>Dear <strong>${fullName}</strong>,</p>
            <p>We are delighted to inform you that your loan application has been approved by <strong>${bankName}</strong> through <strong>${companyName}</strong>.</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Approved Loan Amount:</strong> ₹${approvedAmount.toLocaleString('en-IN')}</p>
              <p style="margin: 4px 0;"><strong>Sanctioned Interest Rate:</strong> ${interestRate}% p.a.</p>
              <p style="margin: 4px 0;"><strong>Loan Tenure:</strong> ${tenureMonths} Months (${(tenureMonths / 12).toFixed(1)} Years)</p>
              <p style="margin: 4px 0;"><strong>Lending Partner:</strong> ${bankName}</p>
            </div>
            <p>Please review your sanction parameters and complete your digital acceptance to initiate bank disbursement:</p>
            <p style="margin: 24px 0; text-align: center;">
              <a href="${offerUrl}" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Review & Accept Sanction Offer →
              </a>
            </p>
            <p style="font-size: 13px; color: #64748b;">Direct Link: <a href="${offerUrl}">${offerUrl}</a></p>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Warm regards,<br/><strong>${companyName} Team</strong></p>
          </div>
        `,
      });
    } catch (e) {
      console.warn('[TP05] Failed to send customer sanction email:', e);
    }
  }
}

/**
 * TOUCHPOINT 06: Customer Digitally Accepts Sanction Offer
 * Trigger: Customer accepts terms online via /offer/[token]
 * In-App 1: To Channel Partner
 * In-App 2: To Operations Desk
 * Email: Operations final order copy
 */
export async function notifyTouchpoint06_OfferAccepted(
  application: LoanApplication,
  acceptanceRef: string,
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || application.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';
  const fullName = application.fullName || 'Customer';
  const baseUrl = getBaseUrl();
  const caseUrl = `${baseUrl}/branch/requests/${application.id}`;

  // 1. In-App Notification 1 (To Channel Partner)
  const partnerId = application.channelPartnerId || application.createdById;
  if (partnerId) {
    try {
      createNotification({
        tenantId,
        recipientId: partnerId,
        recipientRole: 'CHANNEL_PARTNER',
        applicationId: application.id,
        title: 'Customer Accepted Sanction Offer! 🎉',
        message: `${fullName} has accepted the loan terms (${acceptanceRef}). Operations will now request disbursement from the bank.`,
      });
    } catch {}
  }

  // 2. In-App Notification 2 (To Operations Desk)
  const opsUsers = getOpsAndSupportUsers(tenantId);
  for (const opsUser of opsUsers) {
    try {
      createNotification({
        tenantId,
        recipientId: opsUser.id,
        recipientRole: opsUser.role,
        applicationId: application.id,
        title: 'Sanction Acceptance Recorded',
        message: `Customer acceptance signed with Ref ${acceptanceRef}. Disbursement kit ready for bank submission.`,
      });
    } catch {}
  }

  // 3. Email Notification: Operations Final Order Copy
  const branch = application.branchId ? getBranchById(application.branchId) : undefined;
  const alertRecipient = branch?.email || settings.officialEmail;
  if (alertRecipient) {
    try {
      await sendMail({
        to: alertRecipient,
        tenantId,
        subject: `🔔 Customer Acceptance Recorded — ${fullName} (Ref: ${acceptanceRef})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
            <h2 style="color: #16a34a; margin-top: 0;">Sanction Acceptance Digitally Signed</h2>
            <p>Customer <strong>${fullName}</strong> has digitally signed the loan terms.</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Acceptance Ref:</strong> ${acceptanceRef}</p>
              <p style="margin: 4px 0;"><strong>Customer Name:</strong> ${fullName}</p>
              <p style="margin: 4px 0;"><strong>Sanctioned Amount:</strong> ₹${(application.approvedAmount || application.loanAmount || 0).toLocaleString('en-IN')}</p>
              <p style="margin: 4px 0;"><strong>Bank:</strong> ${application.bankName || 'Partner Bank'}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> Disbursement Kit Ready for Bank Submission</p>
            </div>
            <p style="margin: 24px 0;">
              <a href="${caseUrl}" style="background-color: #1e40af; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Open Case for Disbursement →
              </a>
            </p>
            <p style="color: #64748b; font-size: 13px;">Warm regards,<br/><strong>${companyName} System</strong></p>
          </div>
        `,
      });
    } catch {}
  }
}

/**
 * TOUCHPOINT 07: Loan Disbursed & Commission Credited
 * Trigger: Operations logs actual disbursement via disburseCaseAction
 * In-App: To Channel Partner
 * Email: To Channel Partner
 */
export async function notifyTouchpoint07_LoanDisbursed(
  application: LoanApplication,
  disbursedAmount: number,
  commissionAmount: number,
  commissionRate: number,
  partner: User,
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || application.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';
  const fullName = application.fullName || 'Customer';
  const bankName = application.bankName || 'Lending Bank';
  const baseUrl = getBaseUrl();
  const commissionsUrl = `${baseUrl}/admin/commissions`;

  // 1. In-App Notification (To Channel Partner)
  try {
    createNotification({
      tenantId,
      recipientId: partner.id,
      recipientRole: partner.role === 'SUB_DSA' ? 'SUB_DSA' : 'CHANNEL_PARTNER',
      applicationId: application.id,
      title: `Loan Disbursed! Commission Earned: ₹${commissionAmount.toLocaleString('en-IN')} 💰`,
      message: `Case for ${fullName} has been disbursed (₹${disbursedAmount.toLocaleString('en-IN')}). Your payout of ₹${commissionAmount.toLocaleString('en-IN')} is queued in your commission ledger.`,
    });
  } catch {}

  // 2. Email Notification (To Channel Partner)
  if (partner.email) {
    try {
      await sendMail({
        to: partner.email,
        tenantId,
        subject: `Disbursement Confirmed & Commission Credit Notice — ${fullName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
            <h2 style="color: #16a34a; margin-top: 0;">💰 Disbursement Confirmed & Commission Credit Notice</h2>
            <p>Dear <strong>${partner.name}</strong>,</p>
            <p>Congratulations! The loan case for <strong>${fullName}</strong> has been disbursed by <strong>${bankName}</strong>.</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Customer Name:</strong> ${fullName}</p>
              <p style="margin: 4px 0;"><strong>Disbursed Amount:</strong> ₹${disbursedAmount.toLocaleString('en-IN')}</p>
              <p style="margin: 4px 0;"><strong>Lending Partner:</strong> ${bankName}</p>
              <p style="margin: 4px 0;"><strong>Applied Commission Rate:</strong> ${commissionRate}%</p>
              <p style="margin: 4px 0;"><strong>Gross Rupee Earnings:</strong> ₹${commissionAmount.toLocaleString('en-IN')}</p>
              <p style="margin: 4px 0;"><strong>Payout Status:</strong> Queued in Commission Ledger</p>
            </div>
            <p>Your earnings have been credited to your commission ledger. You can inspect your transaction ledger anytime from your portal.</p>
            <p style="margin: 24px 0;">
              <a href="${commissionsUrl}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Commission Ledger →
              </a>
            </p>
            <p style="color: #64748b; font-size: 13px;">Warm regards,<br/><strong>${companyName} Finance Desk</strong></p>
          </div>
        `,
      });
    } catch (e) {
      console.warn('[TP07] Failed to send partner disbursement email:', e);
    }
  }
}

/**
 * TOUCHPOINT 08: Loan Application Rejected
 * Trigger: Case marked REJECTED by credit operations
 * In-App: To Channel Partner & RM
 * Email: Partner file-closure note
 */
export async function notifyTouchpoint08_LoanRejected(
  application: LoanApplication,
  rejectionReason: string,
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || application.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';
  const fullName = application.fullName || 'Customer';
  const caseIdDisplay = application.id.slice(-6);
  const partnerId = application.channelPartnerId || application.createdById;

  // 1. In-App Notification (To Channel Partner)
  if (partnerId) {
    try {
      createNotification({
        tenantId,
        recipientId: partnerId,
        recipientRole: 'CHANNEL_PARTNER',
        applicationId: application.id,
        title: `Loan File Closed / Rejected: #${caseIdDisplay}`,
        message: `Application for ${fullName} could not be sanctioned by the lender. Reason: ${rejectionReason}`,
      });
    } catch {}
  }

  // 2. In-App Notification (To Assigned RM)
  if (application.relationshipManagerId) {
    try {
      createNotification({
        tenantId,
        recipientId: application.relationshipManagerId,
        recipientRole: 'RELATIONSHIP_MANAGER',
        applicationId: application.id,
        title: `Loan File Closed / Rejected: #${caseIdDisplay}`,
        message: `Application for ${fullName} rejected. Reason: ${rejectionReason}`,
      });
    } catch {}
  }

  // 3. Email Notification (Partner file-closure note)
  if (partnerId) {
    const partner = getUserById(partnerId);
    if (partner?.email) {
      try {
        await sendMail({
          to: partner.email,
          tenantId,
          subject: `Loan Application Update: Case #${caseIdDisplay} Closed / Rejected`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
              <h2 style="color: #dc2626; margin-top: 0;">Loan Application File Closed</h2>
              <p>Dear <strong>${partner.name}</strong>,</p>
              <p>This is to inform you that the loan application for <strong>${fullName}</strong> (Case #${caseIdDisplay}) could not be approved by the lender.</p>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 4px 0;"><strong>Applicant:</strong> ${fullName}</p>
                <p style="margin: 4px 0;"><strong>Requested Amount:</strong> ₹${(application.loanAmount || 0).toLocaleString('en-IN')}</p>
                <p style="margin: 4px 0;"><strong>Lender:</strong> ${application.bankName || 'Partner Bank'}</p>
                <p style="margin: 4px 0;"><strong>Reason:</strong> ${rejectionReason}</p>
              </div>
              <p>You can generate a new link or contact your assigned Relationship Manager for assistance with alternative banking options.</p>
              <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Warm regards,<br/><strong>${companyName} Credit Operations</strong></p>
            </div>
          `,
        });
      } catch {}
    }
  }
}

/**
 * TOUCHPOINT 09: Channel Partner Onboarding Submission
 * Trigger: Prospective Sub-DSA registers online via /partner/register or /partner/onboard
 * In-App 1: To Assigned RM (if referral link used)
 * In-App 2: To Central Support
 * Email: Partner welcome acknowledgement
 */
export async function notifyTouchpoint09_PartnerOnboarded(
  partner: User,
  assignedRm?: User | null,
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || partner.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';
  const partnerName = partner.name;
  const rmName = assignedRm?.name || partner.assignedRmName || 'Central Support Desk';

  // 1. In-App Notification 1 (To Assigned RM, if referral link used)
  if (partner.assignedRmId) {
    try {
      createNotification({
        tenantId,
        recipientId: partner.assignedRmId,
        recipientRole: 'RELATIONSHIP_MANAGER',
        applicationId: 'partner-onboarding',
        title: 'New Partner Onboarded via Your Link! 🤝',
        message: `${partnerName} has completed partner onboarding using your link and is auto-assigned to you (Pending Central Support verification).`,
      });
    } catch {}
  }

  // 2. In-App Notification 2 (To Central Support)
  const opsUsers = getOpsAndSupportUsers(tenantId);
  for (const opsUser of opsUsers) {
    try {
      createNotification({
        tenantId,
        recipientId: opsUser.id,
        recipientRole: opsUser.role,
        applicationId: 'partner-onboarding',
        title: 'New Partner Onboarding Submission 📋',
        message: `${partnerName} has submitted Sub-DSA onboarding. Auto-assigned to RM ${rmName}. Pending KYC verification.`,
      });
    } catch {}
  }

  // 3. Email Notification (Partner Welcome Acknowledgement)
  if (partner.email) {
    try {
      await sendMail({
        to: partner.email,
        tenantId,
        subject: `Welcome to ${companyName} — Partner Application Received`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
            <h2 style="color: #1e40af; margin-top: 0;">Welcome to ${companyName}!</h2>
            <p>Dear <strong>${partnerName}</strong>,</p>
            <p>Thank you for submitting your partner onboarding application with <strong>${companyName}</strong>. We have successfully received your information and KYC documents.</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #1e40af; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Applicant Name:</strong> ${partnerName}</p>
              <p style="margin: 4px 0;"><strong>Mobile:</strong> ${partner.phone || '—'}</p>
              <p style="margin: 4px 0;"><strong>Assigned RM:</strong> ${rmName}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> Under KYC Verification</p>
            </div>
            <p>Our Central Support desk will verify your details within 24 business hours. You will receive your official Partner Code and Certificate upon approval.</p>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Warm regards,<br/><strong>${companyName} Partner Network</strong></p>
          </div>
        `,
      });
    } catch {}
  }
}

/**
 * TOUCHPOINT 10: Channel Partner KYC Approved & Certified
 * Trigger: Central Support approves partner application via approvePartnerAction
 * In-App: To Channel Partner
 * Email: To Channel Partner
 */
export async function notifyTouchpoint10_PartnerApproved(
  partner: User,
  assignedRmName: string,
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || partner.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';
  const partnerName = partner.name;
  const baseUrl = getBaseUrl();
  const certUrl = `${baseUrl}/partner/certificate`;

  // 1. In-App Notification (To Channel Partner)
  try {
    createNotification({
      tenantId,
      recipientId: partner.id,
      recipientRole: partner.role === 'SUB_DSA' ? 'SUB_DSA' : 'CHANNEL_PARTNER',
      applicationId: 'partner-onboarding',
      title: 'Partner Application Approved! 🎖️',
      message: `Your Channel Partner application has been approved by Central Support. Your assigned Relationship Manager is ${assignedRmName}. You can now create customer links and view your Certificate of Association.`,
    });
  } catch {}

  // 2. Email Notification (To Channel Partner)
  if (partner.email) {
    const assignedRm = partner.assignedRmId ? getUserById(partner.assignedRmId) : undefined;
    const rmContactText = assignedRm?.phone ? `(📞 ${assignedRm.phone})` : '';

    try {
      await sendMail({
        to: partner.email,
        tenantId,
        subject: `Welcome to ${companyName} — Channel Partner Approval & Certificate Issued`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
            <h2 style="color: #16a34a; margin-top: 0;">🎖️ Channel Partner Approved & Certificate Issued</h2>
            <p>Dear <strong>${partnerName}</strong>,</p>
            <p>Welcome to <strong>${companyName}</strong>! Your partner application has been approved by Central Support.</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Official Partner Code:</strong> <span style="font-family: monospace; font-size: 15px; font-weight: bold; color: #16a34a;">${partner.partnerCode || 'QFS-PRT-ACTIVE'}</span></p>
              <p style="margin: 4px 0;"><strong>Assigned Relationship Manager:</strong> ${assignedRmName} ${rmContactText}</p>
              <p style="margin: 4px 0;"><strong>Certificate Number:</strong> ${partner.certificateNumber || 'Issued'}</p>
              <p style="margin: 4px 0;"><strong>Privileges:</strong> Customer Link Generation & Digital Cards Active</p>
            </div>
            <p>You can now log in, generate personalized customer links, and download your official Certificate of Association:</p>
            <p style="margin: 24px 0; text-align: center;">
              <a href="${certUrl}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Download Certificate of Association →
              </a>
            </p>
            <p style="font-size: 13px; color: #64748b;">Direct Certificate URL: <a href="${certUrl}">${certUrl}</a></p>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Warm regards,<br/><strong>${companyName} Partner Network</strong></p>
          </div>
        `,
      });
    } catch (e) {
      console.warn('[TP10] Failed to send partner approval email:', e);
    }
  }
}

/**
 * TOUCHPOINT 11: Partner KYC Document Update Requested
 * Trigger: Central Support flags deficient KYC files via requestPartnerDocsAction
 * In-App: To Channel Partner
 * Email: Partner KYC re-upload action
 */
export async function notifyTouchpoint11_PartnerDocsRequested(
  partner: User,
  remark: string,
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || partner.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';
  const baseUrl = getBaseUrl();
  const onboardUrl = `${baseUrl}/partner/onboard`;

  // 1. In-App Notification (To Channel Partner)
  try {
    createNotification({
      tenantId,
      recipientId: partner.id,
      recipientRole: partner.role === 'SUB_DSA' ? 'SUB_DSA' : 'CHANNEL_PARTNER',
      applicationId: 'partner-onboarding',
      title: 'Action Required: Partner Document Update Requested ⚠️',
      message: `Central Support has requested an update: "${remark}". Please log in to upload the requested files.`,
    });
  } catch {}

  // 2. Email Notification (Partner KYC re-upload action)
  if (partner.email) {
    try {
      await sendMail({
        to: partner.email,
        tenantId,
        subject: `Action Required: Additional Documents Requested for Your Partner Account`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
            <h2 style="color: #d97706; margin-top: 0;">⚠️ Action Required: Partner Documents Requested</h2>
            <p>Dear <strong>${partner.name}</strong>,</p>
            <p>Central Support has reviewed your onboarding files and requested an update:</p>
            <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Support Remark:</strong> "${remark}"</p>
            </div>
            <p>Please log in to your partner portal and re-upload the requested paperwork to resume approval:</p>
            <p style="margin: 24px 0;">
              <a href="${onboardUrl}" style="background-color: #d97706; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Upload Documents Now →
              </a>
            </p>
            <p style="color: #64748b; font-size: 13px;">Warm regards,<br/><strong>${companyName} Central Support</strong></p>
          </div>
        `,
      });
    } catch {}
  }
}

/**
 * TOUCHPOINT 12: Commission Clawback Recorded
 * Trigger: Super Admin executes clawback via recordClawbackAction
 * In-App: To Channel Partner
 * Email: Partner statement adjustment
 */
export async function notifyTouchpoint12_ClawbackRecorded(
  partner: User,
  amount: number,
  reason: string,
  applicationId?: string | null,
  options?: { tenantId?: string }
): Promise<void> {
  const tenantId = options?.tenantId || partner.tenantId || 'default';
  const settings = await getCompanySettings(tenantId);
  const companyName = settings.companyName || 'Money Shelter';

  // 1. In-App Notification (To Channel Partner)
  try {
    createNotification({
      tenantId,
      recipientId: partner.id,
      recipientRole: partner.role === 'SUB_DSA' ? 'SUB_DSA' : 'CHANNEL_PARTNER',
      applicationId: applicationId || 'general',
      title: `Commission Clawback Notice: ₹${amount.toLocaleString('en-IN')} ⚠️`,
      message: `A clawback of ₹${amount.toLocaleString('en-IN')} has been applied to your account. Reason: ${reason}`,
    });
  } catch {}

  // 2. Email Notification (Partner statement adjustment)
  if (partner.email) {
    try {
      await sendMail({
        to: partner.email,
        tenantId,
        subject: `Notice of Commission Adjustment / Clawback — ₹${amount.toLocaleString('en-IN')}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff;">
            <h2 style="color: #dc2626; margin-top: 0;">⚠️ Notice of Commission Statement Adjustment</h2>
            <p>Dear <strong>${partner.name}</strong>,</p>
            <p>This is a formal notification that an adjustment / clawback of <strong>₹${amount.toLocaleString('en-IN')}</strong> has been recorded against your commission account.</p>
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Adjustment Amount:</strong> ₹${amount.toLocaleString('en-IN')}</p>
              ${applicationId ? `<p style="margin: 4px 0;"><strong>Case Reference:</strong> #${applicationId.slice(-6)}</p>` : ''}
              <p style="margin: 4px 0;"><strong>Reason:</strong> ${reason}</p>
              <p style="margin: 4px 0;"><strong>Ledger Impact:</strong> Adjusted against upcoming payouts</p>
            </div>
            <p>If you have questions regarding this adjustment, please get in touch with your assigned Relationship Manager or Finance Desk.</p>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Warm regards,<br/><strong>${companyName} Finance Desk</strong></p>
          </div>
        `,
      });
    } catch {}
  }
}
