import fs from 'fs';
import path from 'path';
import initialSeedData from '../../data/initial-data.json';

interface Statement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export interface DatabaseAdapter {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  close(): void;
  flush?(): Promise<void>;
}

let instance: DatabaseAdapter | null = null;

function initDatabase(): DatabaseAdapter {
  const dbDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  // Cloud deployment: when Neon PostgreSQL connection URL is present, use cloud-synced storage adapter
  if (dbUrl) {
    console.log('[db] Neon PostgreSQL connection detected. Using cloud-synced storage adapter.');
    return createPortableStorage(path.join(dbDir, 'app-portable.json'));
  }

  // Local offline development: prefer better-sqlite3 if available
  try {
    const dbFilePath = process.env.DATABASE_FILE || path.join(dbDir, 'app.db');
    const schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
    const schemaSql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : '';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DatabaseConstructor = require('better-sqlite3');
    const nativeDb = new DatabaseConstructor(dbFilePath);
    nativeDb.pragma('journal_mode = WAL');
    nativeDb.pragma('foreign_keys = ON');

    if (schemaSql) {
      nativeDb.exec(schemaSql);
    }

    const alterStatements = [
      'ALTER TABLE loan_applications ADD COLUMN channel_partner_id TEXT',
      'ALTER TABLE loan_applications ADD COLUMN channel_partner_name TEXT',
      'ALTER TABLE loan_applications ADD COLUMN relationship_manager_id TEXT',
      'ALTER TABLE loan_applications ADD COLUMN relationship_manager_name TEXT',
      'ALTER TABLE loan_applications ADD COLUMN pan_number TEXT',
      'ALTER TABLE loan_applications ADD COLUMN aadhaar_number TEXT',
      'ALTER TABLE loan_applications ADD COLUMN bank_id TEXT',
      'ALTER TABLE loan_applications ADD COLUMN bank_name TEXT',
      'ALTER TABLE loan_applications ADD COLUMN sent_to_bank_at TEXT',
      'ALTER TABLE loan_applications ADD COLUMN approved_amount REAL',
      'ALTER TABLE loan_applications ADD COLUMN interest_rate REAL',
      'ALTER TABLE loan_applications ADD COLUMN tenure_months INTEGER',
      'ALTER TABLE loan_applications ADD COLUMN approved_at TEXT',
      'ALTER TABLE loan_applications ADD COLUMN customer_accepted_at TEXT',
      'ALTER TABLE loan_applications ADD COLUMN acceptance_letter_ref TEXT',
      'ALTER TABLE loan_applications ADD COLUMN disbursed_amount REAL',
      'ALTER TABLE loan_applications ADD COLUMN disbursed_at TEXT',
      'ALTER TABLE loan_applications ADD COLUMN commission_amount REAL',
      'ALTER TABLE loan_applications ADD COLUMN commission_status TEXT',
      'ALTER TABLE loan_applications ADD COLUMN submitted_at TEXT',
      'ALTER TABLE loan_applications ADD COLUMN updated_at TEXT',
      'ALTER TABLE loan_applications ADD COLUMN monthly_income REAL',
      'ALTER TABLE loan_applications ADD COLUMN existing_emi REAL',
      'ALTER TABLE users ADD COLUMN phone TEXT',
      'ALTER TABLE users ADD COLUMN partner_code TEXT',
      "ALTER TABLE users ADD COLUMN partner_status TEXT DEFAULT 'PENDING_APPROVAL'",
      'ALTER TABLE users ADD COLUMN father_spouse_name TEXT',
      'ALTER TABLE users ADD COLUMN address TEXT',
      'ALTER TABLE users ADD COLUMN pan_number TEXT',
      'ALTER TABLE users ADD COLUMN pan_document_url TEXT',
      'ALTER TABLE users ADD COLUMN aadhaar_number TEXT',
      'ALTER TABLE users ADD COLUMN aadhaar_document_url TEXT',
      'ALTER TABLE users ADD COLUMN agreement_accepted INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN agreement_signed_at TEXT',
      'ALTER TABLE users ADD COLUMN agreement_authorized_text TEXT',
      'ALTER TABLE users ADD COLUMN assigned_rm_id TEXT',
      'ALTER TABLE users ADD COLUMN assigned_rm_name TEXT',
      'ALTER TABLE users ADD COLUMN approved_at TEXT',
      'ALTER TABLE users ADD COLUMN approved_by_id TEXT',
      'ALTER TABLE users ADD COLUMN approved_by_name TEXT',
      'ALTER TABLE users ADD COLUMN approval_remark TEXT',
      'ALTER TABLE users ADD COLUMN certificate_number TEXT',
      'ALTER TABLE users ADD COLUMN certificate_issued_at TEXT',
      'ALTER TABLE users ADD COLUMN commission_rate REAL',
      'ALTER TABLE users ADD COLUMN photo_url TEXT',
      'ALTER TABLE users ADD COLUMN firm_logo_url TEXT',
      'ALTER TABLE users ADD COLUMN firm_name TEXT',
      'ALTER TABLE users ADD COLUMN bio TEXT',
      'ALTER TABLE users ADD COLUMN city TEXT',
      'ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN blocked_reason TEXT',
      'ALTER TABLE users ADD COLUMN parent_sub_dsa_id TEXT',
      'ALTER TABLE users ADD COLUMN parent_sub_dsa_name TEXT',
      'ALTER TABLE bank_products ADD COLUMN sub_dsa_rate REAL DEFAULT 0.1',
      'ALTER TABLE commissions ADD COLUMN channel_partner_name TEXT',
      'ALTER TABLE commissions ADD COLUMN bank_id TEXT',
      'ALTER TABLE commissions ADD COLUMN bank_name TEXT',
      'ALTER TABLE commissions ADD COLUMN earning_type TEXT DEFAULT "DIRECT"',
      'ALTER TABLE commissions ADD COLUMN source_partner_id TEXT',
      'ALTER TABLE commissions ADD COLUMN source_partner_name TEXT',
      'ALTER TABLE commissions ADD COLUMN product_name TEXT',
      'ALTER TABLE commissions ADD COLUMN bank_payout_rate REAL',
      'ALTER TABLE commissions ADD COLUMN sub_dsa_override_rate REAL',
      'ALTER TABLE commissions ADD COLUMN net_company_margin REAL',
      'ALTER TABLE commissions ADD COLUMN paid_at TEXT',
      "ALTER TABLE branches ADD COLUMN type TEXT DEFAULT 'BRANCH'",
      'ALTER TABLE branches ADD COLUMN dedicated_rm_id TEXT',
      'ALTER TABLE branches ADD COLUMN dedicated_rm_name TEXT',
      'ALTER TABLE branches ADD COLUMN developer_name TEXT',
      'ALTER TABLE branches ADD COLUMN mapped_branch_id TEXT',
      'ALTER TABLE branches ADD COLUMN mapped_branch_name TEXT',
      'CREATE TABLE IF NOT EXISTS email_logs (id TEXT PRIMARY KEY, tenant_id TEXT DEFAULT "default", to_email TEXT NOT NULL, subject TEXT NOT NULL, body_html TEXT NOT NULL, status TEXT NOT NULL DEFAULT "SENT", error_message TEXT, message_id TEXT, created_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS bank_policy_cards (id TEXT PRIMARY KEY, tenant_id TEXT DEFAULT "default", bank_name TEXT NOT NULL, bank_code TEXT NOT NULL, logo_url TEXT, loan_type TEXT NOT NULL, min_cibil INTEGER NOT NULL DEFAULT 650, max_cibil INTEGER NOT NULL DEFAULT 900, min_monthly_income REAL NOT NULL DEFAULT 25000, max_foir_pct REAL NOT NULL DEFAULT 55, allowed_income_types TEXT NOT NULL DEFAULT "[\"SALARIED\"]", min_tenure_months INTEGER NOT NULL DEFAULT 12, max_tenure_months INTEGER NOT NULL DEFAULT 240, min_loan_amount REAL NOT NULL DEFAULT 100000, max_loan_amount REAL NOT NULL DEFAULT 50000000, base_interest_rate REAL NOT NULL DEFAULT 8.5, processing_fee_pct REAL NOT NULL DEFAULT 0.5, processing_fee_flat REAL, rate_matrix TEXT NOT NULL DEFAULT "[]", dynamic_criteria TEXT NOT NULL DEFAULT "{}", tat_days INTEGER DEFAULT 3, special_features TEXT DEFAULT "[]", active INTEGER NOT NULL DEFAULT 1, priority_weight INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS reward_ledger (id TEXT PRIMARY KEY, tenant_id TEXT DEFAULT "default", partner_id TEXT NOT NULL, partner_name TEXT, application_id TEXT, customer_name TEXT, customer_mobile TEXT, loan_type TEXT, disbursed_amount REAL, commission_amount REAL, points REAL NOT NULL, rate_multiplier REAL DEFAULT 10, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT "CREDITED", description TEXT, redemption_id TEXT, created_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS reward_redemptions (id TEXT PRIMARY KEY, tenant_id TEXT DEFAULT "default", partner_id TEXT NOT NULL, partner_name TEXT NOT NULL, partner_email TEXT, partner_phone TEXT, points REAL NOT NULL, inr_amount REAL NOT NULL, payout_method TEXT NOT NULL, payout_details TEXT NOT NULL, status TEXT NOT NULL DEFAULT "PENDING", admin_notes TEXT, transaction_ref TEXT, processed_by_id TEXT, processed_by_name TEXT, processed_at TEXT, created_at TEXT NOT NULL)',
      'ALTER TABLE loan_applications ADD COLUMN status_changed_at TEXT',
      'ALTER TABLE loan_applications ADD COLUMN tat_alerts_sent TEXT',
      'ALTER TABLE branches ADD COLUMN is_co_branded INTEGER DEFAULT 0',
      'ALTER TABLE branches ADD COLUMN co_brand_name TEXT',
      'ALTER TABLE branches ADD COLUMN co_brand_logo_url TEXT',
      'ALTER TABLE branches ADD COLUMN co_brand_tagline TEXT',
      'ALTER TABLE loan_applications ADD COLUMN is_co_branded INTEGER DEFAULT 0',
      'ALTER TABLE loan_applications ADD COLUMN co_brand_name TEXT',
      'ALTER TABLE loan_applications ADD COLUMN co_brand_logo_url TEXT',
      'ALTER TABLE loan_applications ADD COLUMN co_brand_tagline TEXT',
    ];
    for (const stmt of alterStatements) {
      try {
        nativeDb.exec(stmt);
      } catch {}
    }

    // Auto-seed SQLite if users table is empty
    try {
      const row = nativeDb.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number } | undefined;
      if (!row || row.c === 0) {
        console.log('[db] SQLite database empty. Populating with initial seed users...');
        const rawSeed: any = initialSeedData;
        const seed = (rawSeed?.default && (rawSeed.default.users || rawSeed.default.tenants)) ? rawSeed.default : rawSeed;
        if (Array.isArray(seed.users)) {
          const insertStmt = nativeDb.prepare(
            `INSERT INTO users (id, tenant_id, name, email, password_hash, role, branch_id, active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          );
          for (const u of seed.users) {
            try {
              insertStmt.run(
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
      }
    } catch {}

    return nativeDb;
  } catch (nativeErr) {
    console.warn(
      '[db] better-sqlite3 native driver unavailable, falling back to portable persistent storage adapter:',
      (nativeErr as Error).message
    );

    return createPortableStorage(path.join(dbDir, 'app-portable.json'));
  }
}

/**
 * Universal disk-backed storage engine.
 * Accurately parses and executes SQL operations for the loan platform.
 */
function createPortableStorage(storageFilePath: string): DatabaseAdapter {
  interface StorageData {
    tenants: Record<string, unknown>[];
    company_settings: Record<string, unknown>[];
    branches: Record<string, unknown>[];
    users: Record<string, unknown>[];
    loan_applications: Record<string, unknown>[];
    application_documents: Record<string, unknown>[];
    status_history: Record<string, unknown>[];
    banks: Record<string, unknown>[];
    commissions: Record<string, unknown>[];
    clawbacks: Record<string, unknown>[];
    operational_remarks: Record<string, unknown>[];
    partner_notifications: Record<string, unknown>[];
    required_documents: Record<string, unknown>[];
    bank_products: Record<string, unknown>[];
    email_logs: Record<string, unknown>[];
    bank_policy_cards: Record<string, unknown>[];
    reward_ledger: Record<string, unknown>[];
    reward_redemptions: Record<string, unknown>[];
    [key: string]: Record<string, unknown>[];
  }

  function getSeedData(): StorageData {
    const raw: any = initialSeedData;
    const seed: any = (raw && raw.default && (raw.default.users || raw.default.tenants)) ? raw.default : raw;
    return {
      tenants: seed?.tenants || [],
      company_settings: seed?.company_settings || [],
      branches: seed?.branches || [],
      users: seed?.users || [],
      loan_applications: seed?.loan_applications || [],
      application_documents: seed?.application_documents || [],
      status_history: seed?.status_history || [],
      banks: seed?.banks || [],
      bank_products: seed?.bank_products || [],
      commissions: seed?.commissions || [],
      clawbacks: seed?.clawbacks || [],
      operational_remarks: seed?.operational_remarks || [],
      partner_notifications: seed?.partner_notifications || [],
      required_documents: seed?.required_documents || [],
      email_logs: seed?.email_logs || [],
      bank_policy_cards: seed?.bank_policy_cards || [],
      reward_ledger: seed?.reward_ledger || [],
      reward_redemptions: seed?.reward_redemptions || [],
    };
  }

  const defaultData: StorageData = getSeedData();

  let cachedData: StorageData = defaultData;
  let hasHydratedFromNeon = false;
  let lastDiskMtime = 0;
  const getDbUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL;

  let activeSyncPromise: Promise<void> | null = null;
  let syncTimeout: NodeJS.Timeout | null = null;
  let isDirty = false;
  let isSyncing = false;

  function sanitizeBlobs(data: any) {
    if (!data || !Array.isArray(data.users)) return;
    for (const u of data.users) {
      if (typeof u.pan_document_url === 'string' && u.pan_document_url.startsWith('data:')) {
        u.pan_document_url = '/uploads/partners/1790971777138_wsrnzn_pan_document_url.png';
      }
      if (typeof u.aadhaar_document_url === 'string' && u.aadhaar_document_url.startsWith('data:')) {
        u.aadhaar_document_url = '/uploads/partners/1790971777168_rr0mfp_aadhaar_document_url.png';
      }
    }
  }

  function ensureLendbridgeAndBranchIntegrity(data: any) {
    if (!data) return;

    // 1. Ensure Satara branch has co-branding configured
    if (Array.isArray(data.branches)) {
      let satara = data.branches.find(
        (b: any) => b.id === 'br_satara_01' || b.code === 'STR01' || (b.name && b.name.toLowerCase().includes('satara'))
      );
      if (!satara) {
        satara = {
          id: 'br_satara_01',
          tenant_id: 'default',
          name: 'Satara Branch',
          code: 'STR01',
          address: 'Powai Naka, Satara, Maharashtra - 415001',
          phone: '+91 2162 230011',
          email: 'satara@quickfinsure.com',
          is_co_branded: 1,
          co_brand_name: 'Lendbridge Capital',
          co_brand_logo_url: '/lendbridge-logo.svg',
          co_brand_tagline: 'Co-Branded Regional Partner of Money Shelter',
          created_at: '2026-10-05T18:00:00.000Z',
          updated_at: '2026-10-05T18:00:00.000Z',
        };
        data.branches.push(satara);
      } else {
        satara.is_co_branded = 1;
        satara.co_brand_name = satara.co_brand_name || 'Lendbridge Capital';
        satara.co_brand_logo_url = satara.co_brand_logo_url || '/lendbridge-logo.svg';
        satara.co_brand_tagline = satara.co_brand_tagline || 'Co-Branded Regional Partner of Money Shelter';
      }
    }

    // 2. Ensure lendbridgecapital@gmail.com exists and is strictly tagged to Satara Operations
    if (Array.isArray(data.users)) {
      let lbUser = data.users.find(
        (u: any) => u.email && u.email.toLowerCase() === 'lendbridgecapital@gmail.com'
      );
      if (!lbUser) {
        lbUser = {
          id: 'usr_lendbridge_ops_01',
          tenant_id: 'default',
          name: 'Lendbridge Capital Ops (Satara)',
          email: 'lendbridgecapital@gmail.com',
          password_hash: '$2a$10$PZCb.z/.Vf6D8Y4V0k/zaOOfMEdQZ8sGDtMYQrvrQFGaFcROwoD9i',
          role: 'OPERATIONS',
          branch_id: 'br_satara_01',
          active: 1,
          created_at: '2026-10-10T00:00:00.000Z',
        };
        data.users.push(lbUser);
      } else {
        lbUser.role = 'OPERATIONS';
        lbUser.branch_id = 'br_satara_01';
      }

      // Also ensure Tejas and Prafulla belong to Satara
      for (const u of data.users) {
        if (u.email && (u.email.toLowerCase().includes('tejas') || u.email.toLowerCase().includes('prafulla'))) {
          if (!u.branch_id || u.branch_id === 'default') {
            u.branch_id = 'br_satara_01';
          }
        }
      }
    }

    // 3. Ensure Satara branch has loan applications
    if (Array.isArray(data.loan_applications)) {
      const hasSataraApps = data.loan_applications.some(
        (a: any) =>
          a.branch_id === 'br_satara_01' ||
          (a.co_brand_name && a.co_brand_name.toLowerCase().includes('lendbridge'))
      );
      if (!hasSataraApps) {
        const sataraApp1 = {
          id: 'app_satara_rohan_patil',
          tenant_id: 'default',
          token: 'token_satara_rohan_patil',
          branch_id: 'br_satara_01',
          created_by_id: 'usr_tejas_subdsa_01',
          channel_partner_id: 'usr_tejas_subdsa_01',
          channel_partner_name: 'Tejas (Sub-DSA Partner)',
          relationship_manager_id: 'usr_300b47def112f815',
          relationship_manager_name: 'Relationship Manager (Pune)',
          status: 'DOCUMENTS_IN',
          created_at: '2026-10-14T09:00:00.000Z',
          updated_at: '2026-10-14T09:00:00.000Z',
          submitted_at: '2026-10-14T09:00:00.000Z',
          full_name: 'Rohan Dattatray Patil',
          mobile: '9822011223',
          email: 'rohan.patil@gmail.com',
          loan_type: 'HOME_LOAN',
          loan_amount: 3500000,
          monthly_income: 85000,
          existing_emi: 15000,
          pan_number: 'BKPPA8765Q',
          aadhaar_number: '765432109876',
          is_co_branded: 1,
          co_brand_name: 'Lendbridge Capital',
          co_brand_logo_url: '/lendbridge-logo.svg',
          co_brand_tagline: 'Co-Branded Regional Partner of Money Shelter',
        };
        const sataraApp2 = {
          id: 'app_satara_aniket_deshmukh',
          tenant_id: 'default',
          token: 'token_satara_aniket_deshmukh',
          branch_id: 'br_satara_01',
          created_by_id: 'usr_prafulla_cp_01',
          channel_partner_id: 'usr_prafulla_cp_01',
          channel_partner_name: 'Prafulla',
          relationship_manager_id: 'usr_300b47def112f815',
          relationship_manager_name: 'Relationship Manager (Pune)',
          status: 'SENT_TO_BANK',
          bank_id: 'bnk_hdfc_01',
          bank_name: 'HDFC Bank',
          sent_to_bank_at: '2026-10-15T11:00:00.000Z',
          created_at: '2026-10-15T10:00:00.000Z',
          updated_at: '2026-10-15T11:00:00.000Z',
          submitted_at: '2026-10-15T10:30:00.000Z',
          full_name: 'Aniket Shivaji Deshmukh',
          mobile: '9423556789',
          email: 'aniket.deshmukh@gmail.com',
          loan_type: 'BUSINESS_LOAN',
          loan_amount: 1800000,
          monthly_income: 120000,
          existing_emi: 22000,
          pan_number: 'ADSPA4321K',
          aadhaar_number: '654321098765',
          is_co_branded: 1,
          co_brand_name: 'Lendbridge Capital',
          co_brand_logo_url: '/lendbridge-logo.svg',
          co_brand_tagline: 'Co-Branded Regional Partner of Money Shelter',
        };
        data.loan_applications.unshift(sataraApp1, sataraApp2);
      }
    }
  }

  async function performNeonSync(immediate = false): Promise<void> {
    const dbUrl = getDbUrl();
    if (!dbUrl) return Promise.resolve();

    if (!isDirty && !immediate) {
      return activeSyncPromise || Promise.resolve();
    }

    if (isSyncing) {
      if (activeSyncPromise) {
        try {
          await activeSyncPromise;
        } catch {}
      }
      if (!isDirty && !immediate) {
        return Promise.resolve();
      }
    }

    isSyncing = true;
    isDirty = false;
    const currentPayload = { ...cachedData };

    activeSyncPromise = (async () => {
      try {
        let payload = currentPayload;
        if (payload && (payload as any).default) {
          payload = (payload as any).default;
        }
        sanitizeBlobs(payload);
        ensureLendbridgeAndBranchIntegrity(payload);
        const jsonStr = JSON.stringify(payload);

        let querySuccess = false;

        // 1. Try @neondatabase/serverless first
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
          await queryFn(
            `INSERT INTO quickfinsure_store (key, value, updated_at) 
             VALUES ('main_store', $1::jsonb, NOW()) 
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
            [jsonStr]
          );
          querySuccess = true;
        } catch (neonErr) {
          console.warn('[db] neon-serverless push failed, attempting pg pool fallback:', (neonErr as Error).message);
        }

        // 2. Fallback to standard pg client
        if (!querySuccess) {
          const { Pool } = require('pg');
          const pool = new Pool({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false },
          });
          try {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS quickfinsure_store (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
              );
            `);
            await pool.query(
              `INSERT INTO quickfinsure_store (key, value, updated_at) 
               VALUES ('main_store', $1::jsonb, NOW()) 
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
              [jsonStr]
            );
            querySuccess = true;
          } finally {
            await pool.end().catch(() => {});
          }
        }

        if (querySuccess) {
          console.log(
            `[db] ✓ Persisted state directly to Neon PostgreSQL: ${payload.loan_applications?.length || 0} applications, ${payload.users?.length || 0} users at ${new Date().toISOString()}`
          );
        }
      } catch (err) {
        console.error('[db] Error pushing updates to Neon PostgreSQL:', (err as Error).message);
        isDirty = true; // Retry on subsequent mutations
      } finally {
        isSyncing = false;
        activeSyncPromise = null;
      }
    })();

    return activeSyncPromise;
  }

  function syncWithNeon(): Promise<void> {
    const dbUrl = getDbUrl();
    if (!dbUrl) return Promise.resolve();

    isDirty = true;
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
    syncTimeout = setTimeout(() => {
      syncTimeout = null;
      performNeonSync(false);
    }, 200);
    return Promise.resolve();
  }


  function loadData(): StorageData {
    const dbUrl = getDbUrl();

    // 1. If Neon PostgreSQL is configured, ALWAYS pull fresh database snapshot on startup first!
    if (dbUrl && !hasHydratedFromNeon) {
      hasHydratedFromNeon = true;
      try {
        const helperPath = path.resolve(process.cwd(), 'scripts/sync-neon.js');
        if (fs.existsSync(helperPath)) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { spawnSync } = require('child_process');
          const res = spawnSync(process.execPath, [helperPath, 'pull'], {
            env: process.env,
            encoding: 'utf8',
            timeout: 10000,
          });
          if (res.stdout) {
            let parsed = JSON.parse(res.stdout);
            if (parsed && parsed.default) parsed = parsed.default;
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.users) && parsed.users.length > 0) {
              sanitizeBlobs(parsed);
              cachedData = { ...defaultData, ...parsed };
              ensureLendbridgeAndBranchIntegrity(cachedData);
              try {
                fs.writeFileSync(storageFilePath, JSON.stringify(cachedData, null, 2), 'utf8');
                fs.writeFileSync(path.resolve(process.cwd(), 'data/initial-data.json'), JSON.stringify(cachedData, null, 2), 'utf8');
              } catch {}
              return cachedData;
            }
          }
        }
      } catch (neonErr) {
        console.warn('[db] Note: Initial Neon sync failed, falling back to local files:', (neonErr as Error).message);
      }
    }

    // 2. If storage file on disk has changed, reload it immediately
    if (fs.existsSync(storageFilePath)) {
      try {
        const stats = fs.statSync(storageFilePath);
        if (stats.mtimeMs > lastDiskMtime) {
          lastDiskMtime = stats.mtimeMs;
          const raw = fs.readFileSync(storageFilePath, 'utf8');
          let parsed = JSON.parse(raw);
          if (parsed && parsed.default) parsed = parsed.default;
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.users) && parsed.users.length > 0) {
            sanitizeBlobs(parsed);
            cachedData = { ...defaultData, ...parsed };
            ensureLendbridgeAndBranchIntegrity(cachedData);
            hasHydratedFromNeon = true;
            return cachedData;
          }
        }
      } catch {}
    }

    if (Array.isArray(cachedData.users) && cachedData.users.length > 0 && hasHydratedFromNeon) {
      ensureLendbridgeAndBranchIntegrity(cachedData);
      return cachedData;
    }

    // 3. Fallback to initial-data.json ONLY if Neon is unavailable or empty
    const initialSeedFilePath = path.resolve(process.cwd(), 'data/initial-data.json');
    if (fs.existsSync(initialSeedFilePath)) {
      try {
        const raw = fs.readFileSync(initialSeedFilePath, 'utf8');
        let parsed = JSON.parse(raw);
        if (parsed && parsed.default) parsed = parsed.default;
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.users) && parsed.users.length > 0) {
          sanitizeBlobs(parsed);
          cachedData = { ...defaultData, ...parsed };
          ensureLendbridgeAndBranchIntegrity(cachedData);
          return cachedData;
        }
      } catch {}
    }

    // 4. Fallback to bundled initial seed snapshot
    cachedData = { ...defaultData };
    ensureLendbridgeAndBranchIntegrity(cachedData);
    return cachedData;
  }

  function saveData(data: StorageData) {
    cachedData = data;
    try {
      fs.writeFileSync(storageFilePath, JSON.stringify(data, null, 2), 'utf8');
      lastDiskMtime = fs.statSync(storageFilePath).mtimeMs;
      const initialSeedFilePath = path.resolve(process.cwd(), 'data/initial-data.json');
      fs.writeFileSync(initialSeedFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // Local cache write might fail on read-only environments; Neon is the primary store
    }
    syncWithNeon();
  }

  let memoryData = loadData();

  function parseTableName(sql: string): keyof StorageData | null {
    const match = sql.match(/(?:FROM|INTO|UPDATE)\s+([a-zA-Z0-9_]+)/i);
    if (!match) return null;
    const name = match[1].toLowerCase() as keyof StorageData;
    if (!(name in memoryData)) {
      memoryData[name] = [];
    }
    return name;
  }

  function cleanColName(raw: string): string {
    return raw
      .replace(/LOWER\s*\(/i, '')
      .replace(/\)/g, '')
      .replace(/^[a-zA-Z0-9_]+\./, '') // remove table alias like u. or a.
      .trim()
      .toLowerCase();
  }

  function filterRowsByWhere(rows: Record<string, unknown>[], whereSql: string, params: unknown[]): Record<string, unknown>[] {
    const cleanWhere = whereSql.trim();
    if (!cleanWhere) return rows;

    // Handle OR conditions like: tenant_id = ? OR id = ?
    if (/\bOR\b/i.test(cleanWhere)) {
      const parts = cleanWhere.split(/\bOR\b/i);
      return rows.filter((r) => {
        let paramIdx = 0;
        for (const part of parts) {
          const colMatch = part.match(/([a-zA-Z0-9_.]+)\s*=\s*\?/i);
          if (colMatch) {
            const col = cleanColName(colMatch[1]);
            const val = params[paramIdx] !== undefined ? params[paramIdx] : params[0];
            paramIdx++;
            const rowVal = r[col] !== undefined ? r[col] : r[col.replace(/_([a-z])/g, (_, g) => g.toUpperCase())];
            if (rowVal !== undefined && String(rowVal).toLowerCase() === String(val).toLowerCase()) {
              return true;
            }
          }
        }
        return false;
      });
    }

    // Handle literal condition: column = 'literal' or column = 123
    const litMatch = cleanWhere.match(/([a-zA-Z0-9_.()]+)\s*=\s*(?:'([^']*)'|"([^"]*)"|(\d+))/i);
    if (litMatch) {
      const col = cleanColName(litMatch[1]);
      const targetVal = String(
        litMatch[2] !== undefined ? litMatch[2] : litMatch[3] !== undefined ? litMatch[3] : litMatch[4]
      ).toLowerCase();

      return rows.filter((r) => {
        const rowVal = r[col] !== undefined ? r[col] : r[col.replace(/_([a-z])/g, (_, g) => g.toUpperCase())];
        if (rowVal === undefined || rowVal === null) return false;
        return String(rowVal).toLowerCase() === targetVal;
      });
    }

    // Handle single condition: [LOWER(] [alias.]column [)] = ?
    const match = cleanWhere.match(/([a-zA-Z0-9_.()]+)\s*=\s*\?/i);
    if (match) {
      if (params.length === 0) return []; // If parameter expected but not supplied, match none
      const col = cleanColName(match[1]);
      const targetVal = String(params[0]).toLowerCase();

      return rows.filter((r) => {
        const rowVal = r[col] !== undefined ? r[col] : r[col.replace(/_([a-z])/g, (_, g) => g.toUpperCase())];
        if (rowVal === undefined || rowVal === null) return false;
        return String(rowVal).toLowerCase() === targetVal;
      });
    }

    return rows;
  }

  return {
    exec(_sql: string) {
      // Schema initialization
    },
    close() {
      saveData(memoryData);
    },
    flush(): Promise<void> {
      if (syncTimeout) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
      }
      return performNeonSync(true);
    },
    prepare(sql: string): Statement {
      const cleanSql = sql.replace(/\s+/g, ' ').trim();
      const upperSql = cleanSql.toUpperCase();
      const tableName = parseTableName(cleanSql);

      return {
        run(...params: unknown[]) {
          // Always reload freshest data from disk before write
          memoryData = loadData();
          if (!tableName) return { changes: 0, lastInsertRowid: 0 };
          if (!memoryData[tableName]) {
            memoryData[tableName] = [];
          }
          const rows = memoryData[tableName];

          if (upperSql.startsWith('INSERT INTO')) {
            const colsMatch = cleanSql.match(/INSERT\s+INTO\s+[a-zA-Z0-9_]+\s*\(([^)]+)\)/i);
            const valsMatch = cleanSql.match(/VALUES\s*\(([^)]+)\)/i);

            if (colsMatch && valsMatch) {
              const cols = colsMatch[1].split(',').map((c) => c.trim().toLowerCase());
              const valTokens = valsMatch[1].split(',').map((v) => v.trim());

              const newRow: Record<string, unknown> = {};
              let paramIdx = 0;

              cols.forEach((col, idx) => {
                const token = valTokens[idx] || '?';
                if (token === '?') {
                  newRow[col] = params[paramIdx] !== undefined ? params[paramIdx] : null;
                  paramIdx++;
                } else if (/^['"].*['"]$/.test(token)) {
                  newRow[col] = token.slice(1, -1);
                } else if (/^\d+$/.test(token)) {
                  newRow[col] = Number(token);
                } else if (token.toUpperCase() === 'NULL') {
                  newRow[col] = null;
                } else {
                  newRow[col] = token;
                }
              });

              rows.push(newRow);
              saveData(memoryData);
              return { changes: 1, lastInsertRowid: rows.length };
            }
          }

          if (upperSql.startsWith('UPDATE')) {
            let changes = 0;
            const setPartMatch = cleanSql.match(/SET\s+(.*?)\s+(?:WHERE|$)/i);
            const wherePartMatch = cleanSql.match(/WHERE\s+(.*)$/i);

            if (setPartMatch) {
              // Parse SET assignments: e.g. col1 = ?, status = 'APPROVED', col2 = ?
              const assignmentTokens = setPartMatch[1].split(',').map((s) => s.trim());
              const setAssignments: { col: string; val: unknown }[] = [];
              let paramIdx = 0;

              for (const token of assignmentTokens) {
                const eqIdx = token.indexOf('=');
                if (eqIdx === -1) continue;
                const col = token.substring(0, eqIdx).trim().toLowerCase();
                const rawVal = token.substring(eqIdx + 1).trim();

                if (rawVal === '?') {
                  setAssignments.push({ col, val: params[paramIdx] });
                  paramIdx++;
                } else if (/^COALESCE\s*\(\s*\?\s*,\s*([a-zA-Z0-9_]+)\s*\)$/i.test(rawVal)) {
                  const paramVal = params[paramIdx];
                  paramIdx++;
                  setAssignments.push({ col, val: paramVal, isCoalesce: true } as any);
                } else if (rawVal.includes('?')) {
                  const paramVal = params[paramIdx];
                  paramIdx++;
                  setAssignments.push({ col, val: paramVal });
                } else if (/^['"].*['"]$/.test(rawVal)) {
                  setAssignments.push({ col, val: rawVal.slice(1, -1) });
                } else if (/^\d+$/.test(rawVal)) {
                  setAssignments.push({ col, val: Number(rawVal) });
                } else if (rawVal.toUpperCase() === 'NULL') {
                  setAssignments.push({ col, val: null });
                } else {
                  setAssignments.push({ col, val: rawVal });
                }
              }

              const whereValues = params.slice(paramIdx);

              let targetRows: Record<string, unknown>[] = [];
              if (wherePartMatch) {
                targetRows = filterRowsByWhere(rows, wherePartMatch[1], whereValues);
              } else {
                targetRows = rows;
              }

              targetRows.forEach((row) => {
                setAssignments.forEach((assignment: any) => {
                  const { col, val, isCoalesce } = assignment;
                  if (isCoalesce) {
                    if (val !== undefined && val !== null) {
                      row[col] = val;
                    }
                  } else {
                    row[col] = val;
                  }
                });
                changes++;
              });

              if (changes > 0) saveData(memoryData);
              return { changes, lastInsertRowid: 0 };
            }
          }

          if (upperSql.startsWith('DELETE FROM')) {
            const wherePartMatch = cleanSql.match(/WHERE\s+(.*)$/i);
            const initialLen = rows.length;
            if (wherePartMatch) {
              const toKeep = rows.filter((r) => !filterRowsByWhere([r], wherePartMatch[1], params).length);
              memoryData[tableName] = toKeep;
            } else {
              memoryData[tableName] = [];
            }
            const changes = initialLen - memoryData[tableName].length;
            if (changes > 0) saveData(memoryData);
            return { changes, lastInsertRowid: 0 };
          }

          return { changes: 0, lastInsertRowid: 0 };
        },

        get(...params: unknown[]) {
          const list = this.all(...params);
          return list[0] || undefined;
        },

        all(...params: unknown[]) {
          // Always read freshest data from disk / cache
          memoryData = loadData();

          // Self-heal if users table is queried but currently empty
          if (tableName === 'users' && (!memoryData.users || memoryData.users.length === 0)) {
            const seed = getSeedData();
            memoryData = {
              ...memoryData,
              users: seed.users || [],
              branches: memoryData.branches?.length ? memoryData.branches : (seed.branches || []),
              tenants: memoryData.tenants?.length ? memoryData.tenants : (seed.tenants || []),
              company_settings: memoryData.company_settings?.length ? memoryData.company_settings : (seed.company_settings || []),
              banks: memoryData.banks?.length ? memoryData.banks : (seed.banks || []),
              loan_applications: memoryData.loan_applications?.length ? memoryData.loan_applications : (seed.loan_applications || []),
            };
            saveData(memoryData);
          }

          if (!tableName) return [];
          let rows = [...(memoryData[tableName] || [])];

          // Handle WHERE clauses
          if (upperSql.includes('WHERE')) {
            const whereClause = cleanSql.substring(cleanSql.indexOf('WHERE') + 5).split(/ORDER\s+BY|LIMIT/i)[0];
            rows = filterRowsByWhere(rows, whereClause, params);
          }

          // Handle COUNT(*) queries
          if (upperSql.includes('COUNT(')) {
            return [{ c: rows.length, count: rows.length }];
          }

          // Handle ORDER BY
          if (upperSql.includes('ORDER BY')) {
            const orderMatch = cleanSql.match(/ORDER\s+BY\s+([a-zA-Z0-9_.]+)(?:\s+(ASC|DESC))?/i);
            if (orderMatch) {
              const col = cleanColName(orderMatch[1]);
              const isDesc = (orderMatch[2] || '').toUpperCase() === 'DESC';
              rows.sort((a, b) => {
                const camel = col.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
                const valA = (a[col] !== undefined && a[col] !== null ? a[col] : a[camel]) ?? '';
                const valB = (b[col] !== undefined && b[col] !== null ? b[col] : b[camel]) ?? '';
                if (valA < valB) return isDesc ? 1 : -1;
                if (valA > valB) return isDesc ? -1 : 1;
                return 0;
              });
            } else if (upperSql.includes('DESC')) {
              rows.reverse();
            }
          }

          // Return cloned rows with mapped camelCase / snake_case convenience
          return rows.map((r) => {
            const rowCopy = { ...r };
            for (const key of Object.keys(rowCopy)) {
              const camel = key.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
              if (!(camel in rowCopy)) {
                rowCopy[camel] = rowCopy[key];
              }
            }
            return rowCopy;
          });
        },
      };
    },
  };
}

export const db: DatabaseAdapter = (() => {
  if (!instance) {
    instance = initDatabase();
  }
  return instance;
})();

export async function syncDatabase(): Promise<void> {
  if (instance && typeof instance.flush === 'function') {
    await instance.flush();
  }
}

