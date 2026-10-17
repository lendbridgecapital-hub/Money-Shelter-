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

  const promoteAmit = url.searchParams.get('promote_amit') === 'true';
  if (promoteAmit) {
    try {
      db.prepare(`UPDATE loan_applications SET status = 'DOCUMENTS_IN', updated_at = ? WHERE id = 'app_5ea22d43376eafcc'`).run(new Date().toISOString());
      db.prepare(`UPDATE required_documents SET status = 'UPLOADED', uploaded_at = ? WHERE application_id = 'app_5ea22d43376eafcc'`).run(new Date().toISOString());
      if (typeof (db as any).flush === 'function') {
        await (db as any).flush();
      }
    } catch {}
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

  const admin = getUserByEmail('admin@moneyshelter.in') || getUserByEmail('admin@quickfinsure.com');
  const passwordCheck = admin ? await bcrypt.compare('Password123!', admin.passwordHash) : false;

  const testAccounts = [
    'admin@moneyshelter.in',
    'ops@moneyshelter.in',
    'rm@moneyshelter.in',
    'partner@moneyshelter.in',
    'admin@quickfinsure.com',
  ];
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

  // Direct Neon PostgreSQL inspection
  let neonTables: string[] = [];
  let neonStoreRows: Record<string, unknown>[] = [];
  let neonRelationalApps: Record<string, unknown>[] = [];
  let neonRelationalUsers: Record<string, unknown>[] = [];
  let inspectedKeyValue: any = null;
  let backupCounts: Record<string, number> = {};
  let restoredCount = 0;

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (dbUrl) {
    try {
      const { neon } = require('@neondatabase/serverless');
      const sql = neon(dbUrl);
      const queryFn = sql.query ? sql.query.bind(sql) : sql;

      try {
        const tRows = await queryFn(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`);
        neonTables = (tRows || []).map((r: any) => String(r.table_name || r.TABLE_NAME || ''));
      } catch {}

      try {
        const sRows = await queryFn(`SELECT key, updated_at, length(value::text) as size_bytes FROM quickfinsure_store;`);
        neonStoreRows = sRows || [];
      } catch {}

      if (neonTables.includes('loan_applications')) {
        try {
          const aRows = await queryFn(`SELECT id, full_name, mobile, loan_amount, status, created_at FROM loan_applications ORDER BY created_at DESC LIMIT 50;`);
          neonRelationalApps = aRows || [];
        } catch {}
      }

      if (neonTables.includes('users')) {
        try {
          const uRows = await queryFn(`SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 50;`);
          neonRelationalUsers = uRows || [];
        } catch {}
      }

      // Check for backup query or restore
      const inspectKey = url.searchParams.get('key');
      if (inspectKey) {
        try {
          const kRows = await queryFn(`SELECT value FROM quickfinsure_store WHERE key = $1 LIMIT 1;`, [inspectKey]);
          if (kRows && kRows[0] && kRows[0].value) {
            let v = kRows[0].value;
            if (typeof v === 'string') v = JSON.parse(v);
            if (v && v.default) v = v.default;
            inspectedKeyValue = {
              loan_applications: v.loan_applications || [],
              applications_count: Array.isArray(v.loan_applications) ? v.loan_applications.length : 0,
            };
          }
        } catch (e: any) {
          neonError = `Key inspect error: ${e.message}`;
        }
      }

      try {
        const bRows = await queryFn(`SELECT key, value FROM quickfinsure_store;`);
        for (const row of bRows || []) {
          let v = row.value;
          if (typeof v === 'string') {
            try { v = JSON.parse(v); } catch {}
          }
          if (v && v.default) v = v.default;
          backupCounts[row.key] = Array.isArray(v?.loan_applications) ? v.loan_applications.length : 0;
        }
      } catch {}

      const restoreKey = url.searchParams.get('restore_key');
      if (restoreKey) {
        try {
          const rRows = await queryFn(`SELECT value FROM quickfinsure_store WHERE key = $1 LIMIT 1;`, [restoreKey]);
          if (rRows && rRows[0] && rRows[0].value) {
            let src = rRows[0].value;
            if (typeof src === 'string') src = JSON.parse(src);
            if (src && src.default) src = src.default;
            if (src && Array.isArray(src.loan_applications) && src.loan_applications.length > 0) {
              const mRows = await queryFn(`SELECT value FROM quickfinsure_store WHERE key = 'main_store' LIMIT 1;`);
              let main = mRows && mRows[0] ? mRows[0].value : {};
              if (typeof main === 'string') main = JSON.parse(main);
              if (main && main.default) main = main.default;
              main.loan_applications = src.loan_applications;
              if (src.application_documents) main.application_documents = src.application_documents;
              if (src.required_documents) main.required_documents = src.required_documents;
              if (src.status_history) main.status_history = src.status_history;
              await queryFn(
                `INSERT INTO quickfinsure_store (key, value, updated_at) VALUES ('main_store', $1::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
                [JSON.stringify(main)]
              );
              restoredCount = src.loan_applications.length;
            }
          }
        } catch (e: any) {
          neonError = `Restore error: ${e.message}`;
        }
      }
    } catch (nErr) {
      neonError = (nErr as Error).message;
    }
  }

  return NextResponse.json({
    version: 'v10-neon-proactive-hydration',
    neonDirectWrite,
    neonError,
    databaseUrlSet: !!dbUrl,
    dbHost: dbUrl ? (new URL(dbUrl.startsWith('postgres') ? dbUrl : `postgres://${dbUrl}`).host) : 'NOT_SET',
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
    renderUrl: process.env.RENDER_EXTERNAL_URL || 'NOT_SET',
    neonInspection: {
      tables: neonTables,
      storeRows: neonStoreRows,
      backupCounts,
      inspectedKeyValue,
      restoredCount,
      relationalAppsCount: neonRelationalApps.length,
      relationalApps: neonRelationalApps.slice(0, 15),
      relationalUsersCount: neonRelationalUsers.length,
    },
    totalUsers: users.length,
    userEmails: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      branch_id: u.branch_id || u.branchId,
      partner_status: u.partner_status || u.partnerStatus,
      partner_code: u.partner_code || u.partnerCode,
      active: u.active,
    })),
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
