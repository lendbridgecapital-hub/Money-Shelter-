import crypto from 'crypto';
import { db } from '@/lib/db';
import type { Tenant } from '@/types/db';

export function listTenants(): Tenant[] {
  const rows = db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return rows.map(mapRowToTenant);
}

export function getTenantById(id: string): Tenant | undefined {
  const row = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapRowToTenant(row) : undefined;
}

export function getTenantBySlug(slug: string): Tenant | undefined {
  const lower = slug.trim().toLowerCase();
  const row = db.prepare('SELECT * FROM tenants WHERE LOWER(slug) = ?').get(lower) as Record<string, unknown> | undefined;
  return row ? mapRowToTenant(row) : undefined;
}

export function getTenantByDomain(domain: string): Tenant | undefined {
  const lower = domain.trim().toLowerCase();
  const row = db.prepare('SELECT * FROM tenants WHERE LOWER(domain) = ?').get(lower) as Record<string, unknown> | undefined;
  return row ? mapRowToTenant(row) : undefined;
}

export function createTenant(data: {
  name: string;
  slug: string;
  domain?: string | null;
  companyName: string;
  tagline?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  officialEmail?: string | null;
  supportPhone?: string | null;
  websiteUrl?: string | null;
  footerText?: string | null;
  portalTitle?: string | null;
}): Tenant {
  const id = `tnt_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const slug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

  db.prepare(
    `INSERT INTO tenants (
      id, name, slug, domain, status, company_name, tagline, logo_url, favicon_url,
      primary_color, accent_color, official_email, support_phone, website_url,
      footer_text, portal_title, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name.trim(),
    slug,
    data.domain ? data.domain.trim().toLowerCase() : null,
    data.companyName.trim(),
    data.tagline || null,
    data.logoUrl || null,
    data.faviconUrl || null,
    data.primaryColor || '#1e40af',
    data.accentColor || '#059669',
    data.officialEmail || null,
    data.supportPhone || null,
    data.websiteUrl || null,
    data.footerText || `© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.`,
    data.portalTitle || `${data.companyName} — Loan Portal`,
    now,
    now
  );

  // Also create corresponding company_settings row for this tenant
  db.prepare(
    `INSERT INTO company_settings (
      id, tenant_id, company_name, tagline, logo_url, favicon_url, primary_color, accent_color,
      official_email, support_phone, website_url, footer_text, portal_title, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    id,
    data.companyName.trim(),
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
    now
  );

  const tenant = getTenantById(id);
  if (!tenant) throw new Error('Failed to create tenant');
  return tenant;
}

export function updateTenant(id: string, data: Partial<Tenant>): void {
  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name.trim());
  }
  if (data.slug !== undefined) {
    updates.push('slug = ?');
    params.push(data.slug.trim().toLowerCase());
  }
  if (data.domain !== undefined) {
    updates.push('domain = ?');
    params.push(data.domain ? data.domain.trim().toLowerCase() : null);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }
  if (data.companyName !== undefined) {
    updates.push('company_name = ?');
    params.push(data.companyName.trim());
  }
  if (data.tagline !== undefined) {
    updates.push('tagline = ?');
    params.push(data.tagline || null);
  }
  if (data.logoUrl !== undefined) {
    updates.push('logo_url = ?');
    params.push(data.logoUrl || null);
  }
  if (data.faviconUrl !== undefined) {
    updates.push('favicon_url = ?');
    params.push(data.faviconUrl || null);
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
    params.push(data.officialEmail || null);
  }
  if (data.supportPhone !== undefined) {
    updates.push('support_phone = ?');
    params.push(data.supportPhone || null);
  }
  if (data.websiteUrl !== undefined) {
    updates.push('website_url = ?');
    params.push(data.websiteUrl || null);
  }
  if (data.footerText !== undefined) {
    updates.push('footer_text = ?');
    params.push(data.footerText || null);
  }
  if (data.portalTitle !== undefined) {
    updates.push('portal_title = ?');
    params.push(data.portalTitle || null);
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());

  params.push(id);

  db.prepare(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteTenant(id: string): void {
  if (!id || id === 'default' || id === 'tnt_default') {
    throw new Error('The default system tenant cannot be deleted.');
  }

  // Clean up tenant-specific configurations
  try {
    db.prepare('DELETE FROM company_settings WHERE tenant_id = ? OR id = ?').run(id, id);
  } catch {}

  try {
    db.prepare('DELETE FROM branches WHERE tenant_id = ?').run(id);
  } catch {}

  try {
    db.prepare('DELETE FROM users WHERE tenant_id = ?').run(id);
  } catch {}

  try {
    db.prepare('DELETE FROM banks WHERE tenant_id = ?').run(id);
  } catch {}

  try {
    db.prepare('DELETE FROM bank_products WHERE tenant_id = ?').run(id);
  } catch {}

  try {
    db.prepare('DELETE FROM loan_applications WHERE tenant_id = ?').run(id);
  } catch {}

  // Delete the tenant row
  db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
}

function mapRowToTenant(row: Record<string, unknown>): Tenant {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    domain: row.domain ? String(row.domain) : null,
    status: (row.status as 'ACTIVE' | 'SUSPENDED') || 'ACTIVE',
    companyName: String(row.company_name || row.companyName || row.name),
    tagline: row.tagline ? String(row.tagline) : null,
    logoUrl: row.logo_url || row.logoUrl ? String(row.logo_url || row.logoUrl) : null,
    faviconUrl: row.favicon_url || row.faviconUrl ? String(row.favicon_url || row.faviconUrl) : null,
    primaryColor: String(row.primary_color || row.primaryColor || '#1e40af'),
    accentColor: String(row.accent_color || row.accentColor || '#059669'),
    officialEmail: row.official_email || row.officialEmail ? String(row.official_email || row.officialEmail) : null,
    supportPhone: row.support_phone || row.supportPhone ? String(row.support_phone || row.supportPhone) : null,
    websiteUrl: row.website_url || row.websiteUrl ? String(row.website_url || row.websiteUrl) : null,
    footerText: row.footer_text || row.footerText ? String(row.footer_text || row.footerText) : null,
    portalTitle: row.portal_title || row.portalTitle ? String(row.portal_title || row.portalTitle) : null,
    smtpHost: row.smtp_host || row.smtpHost ? String(row.smtp_host || row.smtpHost) : null,
    smtpPort: row.smtp_port || row.smtpPort ? Number(row.smtp_port || row.smtpPort) : undefined,
    smtpSecure: Boolean(row.smtp_secure || row.smtpSecure),
    smtpUser: row.smtp_user || row.smtpUser ? String(row.smtp_user || row.smtpUser) : null,
    smtpPassword: row.smtp_password || row.smtpPassword ? String(row.smtp_password || row.smtpPassword) : null,
    smtpFromName: row.smtp_from_name || row.smtpFromName ? String(row.smtp_from_name || row.smtpFromName) : null,
    createdAt: String(row.created_at || row.createdAt || ''),
    updatedAt: String(row.updated_at || row.updatedAt || ''),
  };
}
