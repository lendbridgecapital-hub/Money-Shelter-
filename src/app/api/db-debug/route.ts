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

  // Guarantee Tejas Suresh Ghorpade (ghorpadets@gmail.com, QFS-SUB-9796) is present in Neon and database
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (dbUrl) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { neon } = require('@neondatabase/serverless');
      const sql = neon(dbUrl);
      const queryFn = sql.query ? sql.query.bind(sql) : sql;
      const mRows = await queryFn(`SELECT value FROM quickfinsure_store WHERE key = 'main_store' LIMIT 1;`);
      if (mRows && mRows[0] && mRows[0].value) {
        let main = mRows[0].value;
        if (typeof main === 'string') main = JSON.parse(main);
        if (main && main.default) main = main.default;
        if (Array.isArray(main.users)) {
          let tUser = main.users.find(
            (u: any) =>
              u.email === 'ghorpadets@gmail.com' ||
              u.partner_code === 'LBC-STR-SUB-9796' ||
              u.partnerCode === 'LBC-STR-SUB-9796' ||
              u.partner_code === 'QFS-SUB-9796' ||
              u.partnerCode === 'QFS-SUB-9796'
          );
          if (!tUser) {
            tUser = {
              id: 'usr_tejas_ghorpade_satara_01',
              tenant_id: 'default',
              name: 'Tejas Suresh Ghorpade',
              email: 'ghorpadets@gmail.com',
              password_hash: '$2a$10$PZCb.z/.Vf6D8Y4V0k/zaOOfMEdQZ8sGDtMYQrvrQFGaFcROwoD9i',
              role: 'SUB_DSA',
              branch_id: 'br_satara_01',
              phone: '8796974799',
              active: 1,
              is_blocked: 0,
              partner_status: 'APPROVED',
              partner_code: 'LBC-STR-SUB-9796',
              father_spouse_name: 'Suresh Ghorpade',
              address: 'Satara, Maharashtra - 415001',
              pan_number: 'ABCDE5678H',
              pan_document_url: '/uploads/partners/1790971777138_wsrnzn_pan_document_url.png',
              aadhaar_number: '987654321099',
              aadhaar_document_url: '/uploads/partners/1790971777168_rr0mfp_aadhaar_document_url.png',
              agreement_accepted: 1,
              agreement_signed_at: '2026-10-18T18:17:23.000Z',
              agreement_authorized_text:
                'SUB-DSA REFERRAL AGREEMENT executed by Tejas Suresh Ghorpade for Lendbridge Capital (Satara Branch). DPDP Act 2023 compliant.',
              city: 'Satara',
              certificate_number: 'LBC-STR-SUB-CERT-2026-9796',
              certificate_issued_at: '2026-10-19T09:00:00.000Z',
              approved_at: '2026-10-19T09:00:00.000Z',
              approved_by_id: 'usr_lendbridge_ops_01',
              approved_by_name: 'Rutuja (Lendbridge Capital - Satara Ops)',
              assigned_rm_id: 'usr_lendbridge_ops_01',
              assigned_rm_name: 'Rutuja (Lendbridge Capital - Satara Ops)',
              commission_rate: 1.5,
              created_at: '2026-10-18T18:17:23.000Z',
              updated_at: '2026-10-19T09:00:00.000Z',
            };
            main.users.push(tUser);
          } else {
            tUser.name = 'Tejas Suresh Ghorpade';
            tUser.email = 'ghorpadets@gmail.com';
            tUser.phone = '8796974799';
            tUser.role = 'SUB_DSA';
            tUser.branch_id = 'br_satara_01';
            tUser.partner_code = 'LBC-STR-SUB-9796';
            tUser.partner_status = 'APPROVED';
            tUser.pan_document_url = tUser.pan_document_url || '/uploads/partners/1790971777138_wsrnzn_pan_document_url.png';
            tUser.aadhaar_document_url = tUser.aadhaar_document_url || '/uploads/partners/1790971777168_rr0mfp_aadhaar_document_url.png';
            tUser.certificate_number = 'LBC-STR-SUB-CERT-2026-9796';
            tUser.certificate_issued_at = tUser.certificate_issued_at || '2026-10-19T09:00:00.000Z';
            tUser.approved_at = tUser.approved_at || '2026-10-19T09:00:00.000Z';
            tUser.approved_by_id = tUser.approved_by_id || 'usr_lendbridge_ops_01';
            tUser.approved_by_name = tUser.approved_by_name || 'Rutuja (Lendbridge Capital - Satara Ops)';
            tUser.assigned_rm_id = tUser.assigned_rm_id || 'usr_lendbridge_ops_01';
            tUser.assigned_rm_name = tUser.assigned_rm_name || 'Rutuja (Lendbridge Capital - Satara Ops)';
            tUser.commission_rate = tUser.commission_rate ?? 1.5;
          }
          await queryFn(
            `INSERT INTO quickfinsure_store (key, value, updated_at) VALUES ('main_store', $1::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
            [JSON.stringify(main)]
          );
        }
      }
    } catch (e: any) {
      console.warn('[db-debug] Direct Neon Tejas upsert warning:', e.message);
    }
  }

  try {
    const localTejas = db.prepare('SELECT id FROM users WHERE email = ? OR partner_code IN (?, ?)').get('ghorpadets@gmail.com', 'LBC-STR-SUB-9796', 'QFS-SUB-9796');
    if (!localTejas) {
      db.prepare(`
        INSERT INTO users (
          id, tenant_id, name, email, password_hash, role, branch_id, phone,
          partner_code, partner_status, certificate_number, certificate_issued_at, approved_at,
          approved_by_id, approved_by_name, assigned_rm_id, assigned_rm_name, commission_rate,
          father_spouse_name, address, pan_number, pan_document_url,
          aadhaar_number, aadhaar_document_url, agreement_accepted, agreement_signed_at, agreement_authorized_text,
          city, active, is_blocked, created_at, updated_at
        ) VALUES (
          'usr_tejas_ghorpade_satara_01', 'default', 'Tejas Suresh Ghorpade', 'ghorpadets@gmail.com',
          '$2a$10$PZCb.z/.Vf6D8Y4V0k/zaOOfMEdQZ8sGDtMYQrvrQFGaFcROwoD9i', 'SUB_DSA', 'br_satara_01', '8796974799',
          'LBC-STR-SUB-9796', 'APPROVED', 'LBC-STR-SUB-CERT-2026-9796', '2026-10-19T09:00:00.000Z', '2026-10-19T09:00:00.000Z',
          'usr_lendbridge_ops_01', 'Rutuja (Lendbridge Capital - Satara Ops)', 'usr_lendbridge_ops_01', 'Rutuja (Lendbridge Capital - Satara Ops)', 1.5,
          'Suresh Ghorpade', 'Satara, Maharashtra - 415001', 'ABCDE5678H', '/uploads/partners/1790971777138_wsrnzn_pan_document_url.png',
          '987654321099', '/uploads/partners/1790971777168_rr0mfp_aadhaar_document_url.png', 1, '2026-10-18T18:17:23.000Z', 'SUB-DSA REFERRAL AGREEMENT executed by Tejas Suresh Ghorpade for Lendbridge Capital (Satara Branch). DPDP Act 2023 compliant.',
          'Satara', 1, 0, '2026-10-18T18:17:23.000Z', '2026-10-19T09:00:00.000Z'
        )
      `).run();
      if (typeof (db as any).flush === 'function') {
        await (db as any).flush();
      }
    } else {
      db.prepare(`
        UPDATE users SET
          partner_code = 'LBC-STR-SUB-9796',
          partner_status = 'APPROVED',
          certificate_number = 'LBC-STR-SUB-CERT-2026-9796',
          pan_document_url = COALESCE(pan_document_url, '/uploads/partners/1790971777138_wsrnzn_pan_document_url.png'),
          aadhaar_document_url = COALESCE(aadhaar_document_url, '/uploads/partners/1790971777168_rr0mfp_aadhaar_document_url.png')
        WHERE email = 'ghorpadets@gmail.com' OR partner_code IN ('LBC-STR-SUB-9796', 'QFS-SUB-9796')
      `).run();
      if (typeof (db as any).flush === 'function') {
        await (db as any).flush();
      }
    }
  } catch {}

  const rawSeed: any = initialSeedData;
  const seedData = (rawSeed?.default && (rawSeed.default.users || rawSeed.default.tenants)) ? rawSeed.default : rawSeed;

  let users = (db.prepare('SELECT id, email, role, active, password_hash FROM users').all() || []) as Record<string, unknown>[];

  // If forced or if users count is 0, seed directly into Neon PostgreSQL and db adapter
  if (forceSeed || users.length === 0) {
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
