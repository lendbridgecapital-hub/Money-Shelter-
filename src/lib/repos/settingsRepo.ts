import { db } from '@/lib/db';
import type { CompanySettings } from '@/types/db';

export function updateSettings(data: Partial<CompanySettings>, tenantId = 'default'): void {
  const existing = db
    .prepare('SELECT id FROM company_settings WHERE tenant_id = ? OR id = ?')
    .get(tenantId, tenantId) as { id: string } | undefined;

  const now = new Date().toISOString();

  if (!existing) {
    db.prepare(
      `INSERT INTO company_settings (
        id, tenant_id, company_name, tagline, logo_url, favicon_url, primary_color, accent_color,
        official_email, support_phone, website_url, footer_text, portal_title,
        smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from_name, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      tenantId,
      tenantId,
      data.companyName || 'LendBridge Capital',
      data.tagline || '',
      data.logoUrl || '',
      data.faviconUrl || '',
      data.primaryColor || '#1e40af',
      data.accentColor || '#059669',
      data.officialEmail || '',
      data.supportPhone || '',
      data.websiteUrl || '',
      data.footerText || '',
      data.portalTitle || '',
      data.smtpHost || '',
      data.smtpPort || 587,
      data.smtpSecure ? 1 : 0,
      data.smtpUser || '',
      data.smtpPassword || '',
      data.smtpFromName || '',
      now
    );
    return;
  }

  // Update existing row
  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.companyName !== undefined) {
    updates.push('company_name = ?');
    params.push(data.companyName);
  }
  if (data.tagline !== undefined) {
    updates.push('tagline = ?');
    params.push(data.tagline);
  }
  if (data.logoUrl !== undefined) {
    updates.push('logo_url = ?');
    params.push(data.logoUrl);
  }
  if (data.faviconUrl !== undefined) {
    updates.push('favicon_url = ?');
    params.push(data.faviconUrl);
  }
  if (data.primaryColor !== undefined) {
    updates.push('primary_color = ?');
    params.push(data.primaryColor);
  }
  if (data.accentColor !== undefined) {
    updates.push('accent_color = ?');
    params.push(data.accentColor);
  }
  if (data.officialEmail !== undefined) {
    updates.push('official_email = ?');
    params.push(data.officialEmail);
  }
  if (data.supportPhone !== undefined) {
    updates.push('support_phone = ?');
    params.push(data.supportPhone);
  }
  if (data.websiteUrl !== undefined) {
    updates.push('website_url = ?');
    params.push(data.websiteUrl);
  }
  if (data.footerText !== undefined) {
    updates.push('footer_text = ?');
    params.push(data.footerText);
  }
  if (data.portalTitle !== undefined) {
    updates.push('portal_title = ?');
    params.push(data.portalTitle);
  }
  if (data.smtpHost !== undefined) {
    updates.push('smtp_host = ?');
    params.push(data.smtpHost);
  }
  if (data.smtpPort !== undefined) {
    updates.push('smtp_port = ?');
    params.push(data.smtpPort);
  }
  if (data.smtpSecure !== undefined) {
    updates.push('smtp_secure = ?');
    params.push(data.smtpSecure ? 1 : 0);
  }
  if (data.smtpUser !== undefined) {
    updates.push('smtp_user = ?');
    params.push(data.smtpUser);
  }
  if (data.smtpPassword !== undefined) {
    updates.push('smtp_password = ?');
    params.push(data.smtpPassword);
  }
  if (data.smtpFromName !== undefined) {
    updates.push('smtp_from_name = ?');
    params.push(data.smtpFromName);
  }

  updates.push('updated_at = ?');
  params.push(now);

  params.push(existing.id);

  db.prepare(`UPDATE company_settings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}
