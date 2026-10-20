import nodemailer from 'nodemailer';
import { getCompanySettings } from '@/lib/settings';
import { formatCurrencyINR } from '@/lib/format';
import { logEmail, updateEmailLog } from '@/lib/repos/emailRepo';

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

  // Support database company settings with environment variable fallbacks
  const smtpHost = settings.smtpHost || process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST || '';
  const smtpPort = settings.smtpPort || Number(process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || 587);
  const smtpSecure = settings.smtpSecure ?? (process.env.SMTP_SECURE === 'true' || smtpPort === 465);
  const smtpUser = settings.smtpUser || process.env.SMTP_USER || process.env.EMAIL_SERVER_USER || '';
  const smtpPassword = settings.smtpPassword || process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD || '';
  const fromName = settings.smtpFromName || process.env.SMTP_FROM_NAME || settings.companyName || 'Money Shelter';

  // Always log the email into the system database first
  const logEntry = logEmail({
    tenantId: tenantId || 'default',
    toEmail: to,
    subject,
    bodyHtml: html,
    status: smtpHost && smtpUser ? 'SENT' : 'SMTP_NOT_CONFIGURED',
  });

  if (!smtpHost || !smtpUser) {
    console.warn(
      `[mail] SMTP not fully configured (Host: "${smtpHost}", User: "${smtpUser}"). Notification stored in system mail log for: ${to}. Subject: "${subject}"`
    );
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  // 1. HTTP API DELIVERY RELAYS (Port 443 HTTPS - 100% reliable on Vercel)
  const brevoKey =
    (smtpPassword && smtpPassword.startsWith('xkeysib-') ? smtpPassword : null) ||
    process.env.BREVO_API_KEY ||
    null;
  const resendKey =
    (smtpPassword && smtpPassword.startsWith('re_') ? smtpPassword : null) ||
    process.env.RESEND_API_KEY ||
    null;

  if (brevoKey) {
    try {
      const senderEmail = smtpUser || settings.officialEmail || 'lendbridgecapital@gmail.com';
      const senderDisplayName = fromName || settings.companyName || 'Lendbridge Capital Notifications';

      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderDisplayName, email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      const resJson = await resp.json();
      if (!resp.ok) {
        throw new Error(resJson?.message || `Brevo HTTP error ${resp.status}`);
      }

      const msgId = resJson?.messageId || 'brevo-sent';
      updateEmailLog(logEntry.id, { status: 'SENT', messageId: msgId });
      console.log(`[mail] Email dispatched via Brevo HTTP to ${to}. MessageId: ${msgId}`);
      return { sent: true, messageId: msgId };
    } catch (httpErr) {
      const errText = `Brevo HTTP Relay Failed: ${(httpErr as Error).message}`;
      console.error('[mail] Brevo error:', errText);
      updateEmailLog(logEntry.id, { status: 'FAILED', errorMessage: errText });
      return { sent: false, reason: 'SEND_FAILED', error: errText };
    }
  }

  if (resendKey) {
    try {
      const fromAddr = from || (fromName ? `"${fromName}" <${smtpUser}>` : smtpUser);
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [to],
          subject,
          html,
        }),
      });

      const resJson = await resp.json();
      if (!resp.ok) {
        throw new Error(resJson?.message || `Resend HTTP error ${resp.status}`);
      }

      const msgId = resJson?.id || 'resend-sent';
      updateEmailLog(logEntry.id, { status: 'SENT', messageId: msgId });
      console.log(`[mail] Email dispatched via Resend HTTP to ${to}. MessageId: ${msgId}`);
      return { sent: true, messageId: msgId };
    } catch (httpErr) {
      const errText = `Resend HTTP Relay Failed: ${(httpErr as Error).message}`;
      console.error('[mail] Resend error:', errText);
      updateEmailLog(logEntry.id, { status: 'FAILED', errorMessage: errText });
      return { sent: false, reason: 'SEND_FAILED', error: errText };
    }
  }

  // 2. DIRECT SMTP DELIVERY RELAY
  try {
    const isGmail = smtpHost.toLowerCase().includes('gmail');
    const cleanPassword = smtpPassword ? smtpPassword.replace(/\s+/g, '') : '';

    if (isGmail && !cleanPassword) {
      const errMsg = 'Google App Password is missing. Please type your 16-character Google App Password in Email Settings.';
      updateEmailLog(logEntry.id, { status: 'FAILED', errorMessage: errMsg });
      return { sent: false, reason: 'SEND_FAILED', error: errMsg };
    }
    
    // In serverless / cloud hosts (Vercel, AWS Lambda), Port 465 direct SSL with IPv4 is required.
    const effectivePort = isGmail && (smtpPort === 587 || !smtpPort) ? 465 : (smtpPort || 465);
    const effectiveSecure = effectivePort === 465 ? true : Boolean(smtpSecure);

    const transporter = nodemailer.createTransport({
      host: isGmail ? 'smtp.gmail.com' : smtpHost,
      port: effectivePort,
      secure: effectiveSecure,
      family: 4, // CRITICAL: Force IPv4. Prevents IPv6 connection timeout on Vercel/serverless
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      auth: {
        user: smtpUser,
        pass: cleanPassword,
      },
      tls: {
        rejectUnauthorized: false,
        servername: isGmail ? 'smtp.gmail.com' : undefined,
      },
    } as any);

    const fromAddress =
      from ||
      (fromName
        ? `"${fromName}" <${smtpUser}>`
        : smtpUser);

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });

    updateEmailLog(logEntry.id, {
      status: 'SENT',
      messageId: info.messageId,
    });

    console.log(`[mail] Email dispatched successfully to ${to}. MessageId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    let errorMsg = (err as Error).message || 'Failed to send email';
    console.error('[mail] Failed to send email via SMTP:', errorMsg);

    if (errorMsg.includes('535') || errorMsg.includes('Username and Password not accepted') || errorMsg.includes('BadCredentials')) {
      errorMsg = 'Gmail Authentication Failed: Please make sure you are using a 16-character Google App Password (from myaccount.google.com/apppasswords), NOT your normal Gmail password.';
    } else if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
      errorMsg = 'Connection timeout: Vercel serverless firewall blocked outbound SMTP socket. For 100% reliability on Vercel without socket blocks, you can paste a free Brevo API Key (starts with xkeysib-) into the SMTP Password field.';
    }

    updateEmailLog(logEntry.id, {
      status: 'FAILED',
      errorMessage: errorMsg,
    });

    return { sent: false, reason: 'SEND_FAILED', error: errorMsg };
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
