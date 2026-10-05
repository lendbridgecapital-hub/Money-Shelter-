import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserByEmail } from '@/lib/repos/usersRepo';
import bcrypt from 'bcryptjs';
import initialSeedData from '../../../../data/initial-data.json';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const forceSeed = url.searchParams.get('seed') === 'true';
  const forceSync = url.searchParams.get('sync') === 'true';

  let neonDirectWrite = false;
  let neonError: string | null = null;

  if (forceSync && typeof (db as any).flush === 'function') {
    try {
      await (db as any).flush();
      neonDirectWrite = true;
    } catch (err) {
      neonError = (err as Error).message;
    }
  }

  const rawSeed: any = initialSeedData;
  const seedData = (rawSeed?.default && (rawSeed.default.users || rawSeed.default.tenants)) ? rawSeed.default : rawSeed;

  let users = (db.prepare('SELECT id, email, role, active, password_hash FROM users').all() || []) as Record<string, unknown>[];

  // If forced or if users count is 0, seed directly into Neon PostgreSQL and db adapter
  if (forceSeed || users.length === 0) {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (dbUrl) {
      try {
        const { neon } = require('@neondatabase/serverless');
        const sql = neon(dbUrl);
        const queryFn = sql.query ? sql.query.bind(sql) : sql;
        await queryFn(`
          CREATE TABLE IF NOT EXISTS quickfinsure_store (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
        const jsonStr = JSON.stringify(seedData);
        await queryFn(
          `INSERT INTO quickfinsure_store (key, value, updated_at) 
           VALUES ('main_store', $1::jsonb, NOW()) 
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
          [jsonStr]
        );
        neonDirectWrite = true;
      } catch (err) {
        neonError = (err as Error).message;
      }
    }

    if (Array.isArray(seedData.users)) {
      for (const u of seedData.users) {
        try {
          db.prepare(
            `INSERT INTO users (id, tenant_id, name, email, password_hash, role, branch_id, active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            u.id,
            u.tenant_id || 'default',
            u.name,
            u.email,
            u.password_hash || u.passwordHash,
            u.role,
            u.branch_id || u.branchId || 'default',
            1,
            u.created_at || new Date().toISOString()
          );
        } catch {}
      }
    }

    // Re-query after seed
    users = (db.prepare('SELECT id, email, role, active, password_hash FROM users').all() || []) as Record<string, unknown>[];
  }

  const admin = getUserByEmail('admin@quickfinsure.com');
  const passwordCheck = admin ? await bcrypt.compare('Password123!', admin.passwordHash) : false;

  const testAccounts = ['admin@quickfinsure.com', 'ops@quickfinsure.com', 'rm@quickfinsure.com', 'partner@quickfinsure.com'];
  const testResults: Record<string, { exists: boolean; role?: string; passwordMatch: boolean }> = {};

  for (const email of testAccounts) {
    const acc = getUserByEmail(email);
    testResults[email] = {
      exists: !!acc,
      role: acc?.role,
      passwordMatch: acc ? await bcrypt.compare('Password123!', acc.passwordHash) : false,
    };
  }

  let applications: Record<string, unknown>[] = [];
  try {
    applications = (db.prepare('SELECT id, full_name, mobile, loan_type, loan_amount, status, created_at FROM loan_applications ORDER BY created_at DESC').all() || []) as Record<string, unknown>[];
  } catch {}

  let emailLogs: Record<string, unknown>[] = [];
  try {
    emailLogs = (db.prepare('SELECT id, to_email, subject, status, created_at FROM email_logs ORDER BY created_at DESC').all() || []) as Record<string, unknown>[];
  } catch {}

  return NextResponse.json({
    version: 'v8-neon-sync',
    neonDirectWrite,
    neonError,
    databaseUrlSet: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
    renderUrl: process.env.RENDER_EXTERNAL_URL || 'NOT_SET',
    totalUsers: users.length,
    userEmails: users.map((u) => ({ email: u.email, role: u.role, active: u.active })),
    adminFound: !!admin,
    passwordMatch: passwordCheck,
    accountsStatus: testResults,
    totalApplications: applications.length,
    tejashreeFound: applications.find((a) => String(a.fullName || a.full_name || '').includes('Tejashree') || a.id === 'app_tejashree_jadhav_2026') || null,
    applications: applications.slice(0, 10),
    totalEmailLogs: emailLogs.length,
    recentEmails: emailLogs.slice(0, 5),
  });
}
