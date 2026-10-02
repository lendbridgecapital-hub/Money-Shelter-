import nodemailer from 'nodemailer';
import { getCompanySettings } from '@/lib/settings';
import { formatCurrencyINR } from '@/lib/format';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  tenantId?: string;
}

export interface SendMailResult {
  sent: boolean;
  messageId?: string;
  reason?: 'SMTP_NOT_CONFIGURED' | 'SEND_FAILED';
  error?: string;
}

export async function sendMail({ to, subject, html, from, tenantId }: SendMailOptions): Promise<SendMailResult> {
  const settings = await getCompanySettings(tenantId || 'default');

  if (!settings.smtpHost || !settings.smtpUser) {
    console.warn(`[mail] SMTP not configured. Notification not sent to: ${to}. Subject: "${subject}"`);
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: Boolean(settings.smtpSecure),
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword || '',
      },
    });

    const fromAddress =
      from ||
      (settings.smtpFromName
        ? `"${settings.smtpFromName}" <${settings.smtpUser}>`
        : settings.smtpUser);

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });

    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[mail] Failed to send email via SMTP:', err);
    return { sent: false, reason: 'SEND_FAILED', error: (err as Error).message };
  }
}

export function customerConfirmationEmail({
  fullName,
  companyName,
  loanType,
  loanAmount,
}: {
  fullName: string;
  companyName: string;
  loanType: string;
  loanAmount: number;
}): { subject: string; html: string } {
  return {
    subject: `Loan Application Received — ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
        <h2 style="color: #1e40af; margin-top: 0;">Application Received Successfully</h2>
        <p>Dear <strong>${fullName}</strong>,</p>
        <p>Thank you for submitting your loan application with <strong>${companyName}</strong>. We have received your documents and details.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #1e40af; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 4px 0;"><strong>Loan Type:</strong> ${loanType}</p>
          <p style="margin: 4px 0;"><strong>Requested Amount:</strong> ${formatCurrencyINR(loanAmount)}</p>
          <p style="margin: 4px 0;"><strong>Current Status:</strong> Document Received & Under Verification</p>
        </div>
        <p>Our dedicated loan relationship manager is currently reviewing your documents and verifying eligibility with our partner banking institutions. We will get in touch with you shortly.</p>
        <p style="margin-top: 24px; font-size: 13px; color: #64748b;">Warm regards,<br/><strong>${companyName} Team</strong></p>
      </div>
    `,
  };
}

export function branchAlertEmail({
  fullName,
  mobile,
  email,
  loanType,
  loanAmount,
  monthlyIncome,
  existingEmi,
  branchName,
  applicationUrl,
}: {
  fullName: string;
  mobile: string;
  email: string;
  loanType: string;
  loanAmount: number;
  monthlyIncome?: number;
  existingEmi?: number;
  branchName: string;
  applicationUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `🔔 New Loan Application Received — ${fullName} (${branchName})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
        <h2 style="color: #059669; margin-top: 0;">New Customer Submission</h2>
        <p>A customer has just submitted their loan application and uploaded self-attested documents.</p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 4px 0;"><strong>Applicant:</strong> ${fullName}</p>
          <p style="margin: 4px 0;"><strong>Mobile:</strong> <a href="tel:${mobile}">${mobile}</a></p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 4px 0;"><strong>Branch:</strong> ${branchName}</p>
          <p style="margin: 4px 0;"><strong>Loan Product:</strong> ${loanType}</p>
          <p style="margin: 4px 0;"><strong>Requested Amount:</strong> ${formatCurrencyINR(loanAmount)}</p>
          ${monthlyIncome ? `<p style="margin: 4px 0;"><strong>Monthly Net Income:</strong> ${formatCurrencyINR(monthlyIncome)}</p>` : ''}
          ${existingEmi !== undefined && existingEmi !== null ? `<p style="margin: 4px 0;"><strong>Existing EMI(s):</strong> ${formatCurrencyINR(existingEmi)}</p>` : ''}
        </div>
        <p style="margin: 24px 0;">
          <a href="${applicationUrl}" style="background-color: #1e40af; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Open Application & Review Documents →
          </a>
        </p>
        <p style="font-size: 13px; color: #64748b;">Direct URL: <a href="${applicationUrl}">${applicationUrl}</a></p>
      </div>
    `,
  };
}
