'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { updateSettings } from '@/lib/repos/settingsRepo';
import { saveUploadedFile } from '@/lib/uploads';
import { sendMail } from '@/lib/mail';
import { getCompanySettings } from '@/lib/settings';
import { syncDatabase } from '@/lib/db';

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export async function updateBranding(formData: FormData): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');

    const companyName = String(formData.get('companyName') || '').trim();
    const officialEmail = String(formData.get('officialEmail') || '').trim();
    const primaryColor = String(formData.get('primaryColor') || '').trim();
    const accentColor = String(formData.get('accentColor') || '').trim();
    const logoFile = formData.get('logo') as File | null;

    if (!companyName) return { ok: false, error: 'Company name is required.' };
    if (!HEX_COLOR_RE.test(primaryColor)) return { ok: false, error: 'Primary color must be a valid hex value.' };
    if (!HEX_COLOR_RE.test(accentColor)) return { ok: false, error: 'Accent color must be a valid hex value.' };

    let logoUrl: string | undefined;
    if (logoFile && logoFile.size > 0) {
      if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(logoFile.type)) {
        return { ok: false, error: 'Logo must be a PNG, JPG, WEBP, or SVG image.' };
      }
      const saved = await saveUploadedFile(logoFile, 'branding');
      logoUrl = saved.fileUrl;
    }

    updateSettings({
      companyName,
      officialEmail: officialEmail || undefined,
      primaryColor,
      accentColor,
      ...(logoUrl ? { logoUrl } : {}),
    });

    await syncDatabase();
    revalidatePath('/', 'layout');
    return { ok: true, message: 'Company branding updated.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : 'Something went wrong.' };
  }
}

export async function updateSmtpSettings(formData: FormData): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');

    const smtpHost = String(formData.get('smtpHost') || '').trim();
    const smtpPort = Number(formData.get('smtpPort') || 587);
    const smtpSecure = formData.get('smtpSecure') === 'on';
    const smtpUser = String(formData.get('smtpUser') || '').trim();
    const smtpPasswordRaw = String(formData.get('smtpPassword') || '');
    const smtpFromName = String(formData.get('smtpFromName') || '').trim();

    const current = await getCompanySettings();

    updateSettings({
      smtpHost: smtpHost || undefined,
      smtpPort: Number.isFinite(smtpPort) ? smtpPort : 587,
      smtpSecure,
      smtpUser: smtpUser || undefined,
      // Keep the existing password if the admin left the field blank (masked).
      smtpPassword: smtpPasswordRaw ? smtpPasswordRaw : current.smtpPassword,
      smtpFromName: smtpFromName || undefined,
    });

    await syncDatabase();
    revalidatePath('/admin/email-settings');
    return { ok: true, message: 'Email / SMTP settings saved.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : 'Something went wrong.' };
  }
}

export async function sendTestEmail(toEmail: string): Promise<ActionResult> {
  try {
    const admin = await requireRole('ADMIN');
    const settings = await getCompanySettings();

    const result = await sendMail({
      to: toEmail || settings.officialEmail || admin.email,
      subject: `Test email from ${settings.companyName}`,
      html: `<p>This is a test email sent from the ${settings.companyName} loan platform's Email Settings page. If you received this, your SMTP configuration is working.</p>`,
    });

    if (!result.sent) {
      return {
        ok: false,
        error:
          result.reason === 'SMTP_NOT_CONFIGURED'
            ? 'SMTP is not fully configured yet — fill in host, user, and password first.'
            : result.error
            ? `Failed to send: ${result.error}`
            : 'Failed to send — double-check your SMTP host, port, and credentials.',
      };
    }
    return { ok: true, message: 'Test email sent successfully.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === 'FORBIDDEN' ? 'You do not have permission to do this.' : 'Something went wrong.' };
  }
}
