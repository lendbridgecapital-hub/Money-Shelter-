'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth';
import * as tenantsRepo from '@/lib/repos/tenantsRepo';
import * as branchesRepo from '@/lib/repos/branchesRepo';
import * as usersRepo from '@/lib/repos/usersRepo';
import { updateSettings } from '@/lib/repos/settingsRepo';
import type { ActionResult } from '@/actions/settingsActions';

export async function createTenantAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');

    const name = String(formData.get('name') || '').trim();
    const slug = String(formData.get('slug') || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const companyName = String(formData.get('companyName') || name).trim();
    const primaryColor = String(formData.get('primaryColor') || '#1e40af').trim();
    const accentColor = String(formData.get('accentColor') || '#059669').trim();
    const officialEmail = String(formData.get('officialEmail') || '').trim();
    const supportPhone = String(formData.get('supportPhone') || '').trim();
    const websiteUrl = String(formData.get('websiteUrl') || '').trim();

    // Initial admin credentials for the new client
    const adminName = String(formData.get('adminName') || 'Client Admin').trim();
    const adminEmail = String(formData.get('adminEmail') || '').trim().toLowerCase();
    const adminPassword = String(formData.get('adminPassword') || 'ChangeMe123!');

    if (!name) return { ok: false, error: 'Tenant / Client name is required.' };
    if (!slug) return { ok: false, error: 'Tenant slug is required (e.g. "apex-capital").' };

    const existing = tenantsRepo.getTenantBySlug(slug);
    if (existing) return { ok: false, error: `Slug "${slug}" is already in use by another tenant.` };

    const tenant = tenantsRepo.createTenant({
      name,
      slug,
      companyName,
      primaryColor,
      accentColor,
      officialEmail,
      supportPhone,
      websiteUrl,
    });

    // Create default branch for this tenant
    const branch = branchesRepo.createBranch({
      name: `${companyName} Head Office`,
      code: `${slug.substring(0, 3).toUpperCase()}01`,
      email: officialEmail || null,
      tenantId: tenant.id,
    });

    // Create client admin user if email provided
    if (adminEmail) {
      if (!usersRepo.emailExists(adminEmail)) {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        usersRepo.createUser({
          name: adminName,
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
          branchId: branch.id,
          tenantId: tenant.id,
        });
      }
    }

    revalidatePath('/admin/tenants');
    return { ok: true, message: `Client organization "${companyName}" created successfully!` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not create tenant organization.',
    };
  }
}

export async function updateTenantAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');

    const name = String(formData.get('name') || '').trim();
    const companyName = String(formData.get('companyName') || name).trim();
    const domain = String(formData.get('domain') || '').trim();
    const primaryColor = String(formData.get('primaryColor') || '').trim();
    const accentColor = String(formData.get('accentColor') || '').trim();
    const officialEmail = String(formData.get('officialEmail') || '').trim();
    const supportPhone = String(formData.get('supportPhone') || '').trim();
    const websiteUrl = String(formData.get('websiteUrl') || '').trim();
    const status = (formData.get('status') as 'ACTIVE' | 'SUSPENDED') || 'ACTIVE';

    tenantsRepo.updateTenant(id, {
      name: name || undefined,
      companyName: companyName || undefined,
      domain: domain || null,
      primaryColor: primaryColor || undefined,
      accentColor: accentColor || undefined,
      officialEmail: officialEmail || null,
      supportPhone: supportPhone || null,
      websiteUrl: websiteUrl || null,
      status,
    });

    // Also sync to company_settings for this tenant
    updateSettings(
      {
        companyName,
        primaryColor,
        accentColor,
        officialEmail,
        supportPhone,
        websiteUrl,
      },
      id
    );

    revalidatePath('/admin/tenants');
    return { ok: true, message: 'Client organization branding updated.' };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not update tenant.',
    };
  }
}

export async function applyTenantAsActiveSystemAction(tenantId: string): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');
    const tenant = tenantsRepo.getTenantById(tenantId);
    if (!tenant) return { ok: false, error: 'Tenant not found.' };

    // Update system default settings to mirror this tenant's branding
    updateSettings(
      {
        companyName: tenant.companyName,
        tagline: tenant.tagline || '',
        logoUrl: tenant.logoUrl || '',
        faviconUrl: tenant.faviconUrl || '',
        primaryColor: tenant.primaryColor,
        accentColor: tenant.accentColor,
        officialEmail: tenant.officialEmail || '',
        supportPhone: tenant.supportPhone || '',
        websiteUrl: tenant.websiteUrl || '',
        footerText: tenant.footerText || '',
        portalTitle: tenant.portalTitle || '',
      },
      'default'
    );

    revalidatePath('/', 'layout');
    return { ok: true, message: `Active branding switched to "${tenant.companyName}".` };
  } catch (err) {
    return { ok: false, error: 'Could not switch active branding.' };
  }
}

export async function deleteTenantAction(tenantId: string): Promise<ActionResult> {
  try {
    await requireRole('ADMIN');

    if (!tenantId || tenantId === 'default' || tenantId === 'tnt_default') {
      return { ok: false, error: 'The default system company cannot be deleted.' };
    }

    const tenant = tenantsRepo.getTenantById(tenantId);
    if (!tenant) {
      return { ok: false, error: 'Company tenant not found.' };
    }

    tenantsRepo.deleteTenant(tenantId);

    revalidatePath('/admin/tenants');
    revalidatePath('/', 'layout');
    return { ok: true, message: `Company "${tenant.companyName}" was permanently deleted.` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not delete company tenant.',
    };
  }
}

