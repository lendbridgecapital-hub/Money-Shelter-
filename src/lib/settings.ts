import { db } from '@/lib/db';
import type { CompanySettings } from '@/types/db';

export const DEFAULT_SETTINGS: CompanySettings = {
  id: 'default',
  tenantId: 'default',
  companyName: 'QuickFinSure',
  tagline: 'Your Trusted Multi-Branch Loan Origination & Partner Platform',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#16a34a', // QuickFinSure Emerald Green Brand Theme
  accentColor: '#1e293b',  // QuickFinSure Corporate Navy Accent
  officialEmail: 'contact@quickfinsure.com',
  supportPhone: '+91 98765 43210',
  websiteUrl: 'https://quickfinsure.com',
  footerText: '© 2026 QuickFinSure. All rights reserved. Licensed DSA Partner.',
  portalTitle: 'QuickFinSure — Loan Origination Portal',
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  smtpFromName: 'QuickFinSure Notifications',
};

export async function getCompanySettings(tenantId = 'default'): Promise<CompanySettings> {
  try {
    const row = db
      .prepare('SELECT * FROM company_settings WHERE tenant_id = ? OR id = ?')
      .get(tenantId, tenantId) as Record<string, unknown> | undefined;

    if (!row) {
      // Check if any settings row exists
      const fallbackRow = db
        .prepare('SELECT * FROM company_settings LIMIT 1')
        .get() as Record<string, unknown> | undefined;

      if (fallbackRow) {
        return mapRowToSettings(fallbackRow);
      }

      // Initialize default settings into database
      db.prepare(
        `INSERT INTO company_settings (
          id, tenant_id, company_name, tagline, logo_url, favicon_url, primary_color, accent_color,
          official_email, support_phone, website_url, footer_text, portal_title,
          smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from_name, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        'default',
        'default',
        DEFAULT_SETTINGS.companyName,
        DEFAULT_SETTINGS.tagline || '',
        DEFAULT_SETTINGS.logoUrl || '',
        DEFAULT_SETTINGS.faviconUrl || '',
        DEFAULT_SETTINGS.primaryColor,
        DEFAULT_SETTINGS.accentColor,
        DEFAULT_SETTINGS.officialEmail || '',
        DEFAULT_SETTINGS.supportPhone || '',
        DEFAULT_SETTINGS.websiteUrl || '',
        DEFAULT_SETTINGS.footerText || '',
        DEFAULT_SETTINGS.portalTitle || '',
        DEFAULT_SETTINGS.smtpHost || '',
        DEFAULT_SETTINGS.smtpPort || 587,
        DEFAULT_SETTINGS.smtpSecure ? 1 : 0,
        DEFAULT_SETTINGS.smtpUser || '',
        DEFAULT_SETTINGS.smtpPassword || '',
        DEFAULT_SETTINGS.smtpFromName || '',
        new Date().toISOString()
      );

      return DEFAULT_SETTINGS;
    }

    return mapRowToSettings(row);
  } catch (err) {
    console.error('[settings] Failed to load company settings:', err);
    return DEFAULT_SETTINGS;
  }
}

function mapRowToSettings(row: Record<string, unknown>): CompanySettings {
  return {
    id: String(row.id || 'default'),
    tenantId: String(row.tenant_id || row.tenantId || 'default'),
    companyName: String(row.company_name || row.companyName || DEFAULT_SETTINGS.companyName),
    tagline: String(row.tagline || DEFAULT_SETTINGS.tagline),
    logoUrl: String(row.logo_url || row.logoUrl || ''),
    faviconUrl: String(row.favicon_url || row.faviconUrl || ''),
    primaryColor: String(row.primary_color || row.primaryColor || DEFAULT_SETTINGS.primaryColor),
    accentColor: String(row.accent_color || row.accentColor || DEFAULT_SETTINGS.accentColor),
    officialEmail: String(row.official_email || row.officialEmail || ''),
    supportPhone: String(row.support_phone || row.supportPhone || ''),
    websiteUrl: String(row.website_url || row.websiteUrl || ''),
    footerText: String(row.footer_text || row.footerText || DEFAULT_SETTINGS.footerText),
    portalTitle: String(row.portal_title || row.portalTitle || DEFAULT_SETTINGS.portalTitle),
    smtpHost: String(row.smtp_host || row.smtpHost || ''),
    smtpPort: Number(row.smtp_port || row.smtpPort || 587),
    smtpSecure: Boolean(row.smtp_secure || row.smtpSecure),
    smtpUser: String(row.smtp_user || row.smtpUser || ''),
    smtpPassword: String(row.smtp_password || row.smtpPassword || ''),
    smtpFromName: String(row.smtp_from_name || row.smtpFromName || ''),
  };
}
