/**
 * Quickfinsure - Neon PostgreSQL Synchronization Engine
 * Handles bidirectional sync, table initialization, and snapshots for Neon.
 */

const fs = require('fs');
const path = require('path');

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

async function getClient() {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not defined in environment.');
  }

  // Prefer @neondatabase/serverless (HTTP / WebSocket fetch, zero pooling bottlenecks)
  try {
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(dbUrl);
    return {
      query: async (queryText, params = []) => {
        if (sql.query) {
          return sql.query(queryText, params);
        }
        return sql(queryText, params);
      },
      type: 'neon-serverless',
    };
  } catch (err) {
    // Fallback to standard pg client
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });
    return {
      query: async (queryText, params = []) => {
        const res = await pool.query(queryText, params);
        return res.rows;
      },
      type: 'pg-pool',
    };
  }
}

async function initSchema(client) {
  // 1. Create main JSONB state store for instantaneous multi-table consistency
  await client.query(`
    CREATE TABLE IF NOT EXISTS quickfinsure_store (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 2. Create relational schema in PostgreSQL for Neon SQL console visibility
  const schemaQueries = [
    `CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      domain TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      company_name TEXT NOT NULL,
      tagline TEXT,
      logo_url TEXT,
      favicon_url TEXT,
      primary_color TEXT NOT NULL DEFAULT '#0284c7',
      accent_color TEXT NOT NULL DEFAULT '#10b981',
      official_email TEXT,
      support_phone TEXT,
      website_url TEXT,
      footer_text TEXT,
      portal_title TEXT,
      smtp_host TEXT,
      smtp_port INTEGER DEFAULT 587,
      smtp_secure INTEGER DEFAULT 0,
      smtp_user TEXT,
      smtp_password TEXT,
      smtp_from_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      company_name TEXT NOT NULL DEFAULT 'Money Shelter Pvt. Ltd.',
      tagline TEXT,
      logo_url TEXT,
      favicon_url TEXT,
      primary_color TEXT NOT NULL DEFAULT '#0284c7',
      accent_color TEXT NOT NULL DEFAULT '#10b981',
      official_email TEXT,
      support_phone TEXT,
      website_url TEXT,
      footer_text TEXT,
      portal_title TEXT,
      smtp_host TEXT,
      smtp_port INTEGER DEFAULT 587,
      smtp_secure INTEGER DEFAULT 0,
      smtp_user TEXT,
      smtp_password TEXT,
      smtp_from_name TEXT,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      tenant_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      phone TEXT,
      partner_code TEXT,
      partner_status TEXT DEFAULT 'PENDING_APPROVAL',
      father_spouse_name TEXT,
      address TEXT,
      pan_number TEXT,
      pan_document_url TEXT,
      aadhaar_number TEXT,
      aadhaar_document_url TEXT,
      agreement_accepted INTEGER DEFAULT 0,
      agreement_signed_at TEXT,
      agreement_authorized_text TEXT,
      assigned_rm_id TEXT,
      assigned_rm_name TEXT,
      approved_at TEXT,
      approved_by_id TEXT,
      approved_by_name TEXT,
      approval_remark TEXT,
      certificate_number TEXT,
      certificate_issued_at TEXT,
      commission_rate REAL,
      photo_url TEXT,
      firm_logo_url TEXT,
      firm_name TEXT,
      bio TEXT,
      city TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      is_blocked INTEGER NOT NULL DEFAULT 0,
      blocked_reason TEXT,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS loan_applications (
      id TEXT PRIMARY KEY,
      tenant_id TEXT DEFAULT 'default',
      token TEXT UNIQUE NOT NULL,
      branch_id TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      channel_partner_id TEXT,
      channel_partner_name TEXT,
      relationship_manager_id TEXT,
      relationship_manager_name TEXT,
      status TEXT NOT NULL DEFAULT 'LINK_SHARED',
      full_name TEXT,
      mobile TEXT,
      email TEXT,
      loan_type TEXT,
      loan_amount REAL,
      monthly_income REAL,
      existing_emi REAL,
      pan_number TEXT,
      aadhaar_number TEXT,
      bank_id TEXT,
      bank_name TEXT,
      sent_to_bank_at TEXT,
      approved_amount REAL,
      interest_rate REAL,
      tenure_months INTEGER,
      approved_at TEXT,
      customer_accepted_at TEXT,
      acceptance_letter_ref TEXT,
      disbursed_amount REAL,
      disbursed_at TEXT,
      commission_amount REAL,
      commission_status TEXT,
      created_at TEXT NOT NULL,
      submitted_at TEXT,
      updated_at TEXT,
      status_changed_at TEXT,
      tat_alerts_sent TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS application_documents (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      category TEXT NOT NULL,
      label TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS status_history (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      changed_by_id TEXT,
      changed_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS banks (
      id TEXT PRIMARY KEY,
      tenant_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      logo_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS bank_products (
      id TEXT PRIMARY KEY,
      bank_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      loan_type TEXT NOT NULL,
      min_amount REAL,
      max_amount REAL,
      min_tenure_months INTEGER,
      max_tenure_months INTEGER,
      min_interest_rate REAL,
      max_interest_rate REAL,
      processing_fee_pct REAL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS commissions (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      bank_id TEXT,
      amount REAL NOT NULL,
      percentage REAL,
      status TEXT NOT NULL,
      paid_at TEXT,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS operational_remarks (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      remark TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS partner_notifications (
      id TEXT PRIMARY KEY,
      partner_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'INFO',
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS required_documents (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      requested_at TEXT NOT NULL,
      uploaded_at TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS clawbacks (
      id TEXT PRIMARY KEY,
      commission_id TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT DEFAULT 'default',
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SENT',
      error_message TEXT,
      message_id TEXT,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS bank_policy_cards (
      id TEXT PRIMARY KEY,
      tenant_id TEXT DEFAULT 'default',
      bank_name TEXT NOT NULL,
      bank_code TEXT NOT NULL,
      logo_url TEXT,
      loan_type TEXT NOT NULL,
      min_cibil INTEGER NOT NULL DEFAULT 650,
      max_cibil INTEGER NOT NULL DEFAULT 900,
      min_monthly_income REAL NOT NULL DEFAULT 25000,
      max_foir_pct REAL NOT NULL DEFAULT 55,
      allowed_income_types TEXT NOT NULL DEFAULT '["SALARIED"]',
      min_tenure_months INTEGER NOT NULL DEFAULT 12,
      max_tenure_months INTEGER NOT NULL DEFAULT 240,
      min_loan_amount REAL NOT NULL DEFAULT 100000,
      max_loan_amount REAL NOT NULL DEFAULT 50000000,
      base_interest_rate REAL NOT NULL DEFAULT 8.5,
      processing_fee_pct REAL NOT NULL DEFAULT 0.5,
      processing_fee_flat REAL,
      rate_matrix JSONB DEFAULT '[]'::jsonb,
      dynamic_criteria JSONB DEFAULT '{}'::jsonb,
      tat_days INTEGER DEFAULT 3,
      special_features JSONB DEFAULT '[]'::jsonb,
      active INTEGER NOT NULL DEFAULT 1,
      priority_weight INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS reward_ledger (
      id TEXT PRIMARY KEY,
      tenant_id TEXT DEFAULT 'default',
      partner_id TEXT NOT NULL,
      partner_name TEXT,
      application_id TEXT,
      customer_name TEXT,
      customer_mobile TEXT,
      loan_type TEXT,
      disbursed_amount REAL,
      commission_amount REAL,
      points REAL NOT NULL,
      rate_multiplier REAL DEFAULT 10,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREDITED',
      description TEXT,
      redemption_id TEXT,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS reward_redemptions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT DEFAULT 'default',
      partner_id TEXT NOT NULL,
      partner_name TEXT NOT NULL,
      partner_email TEXT,
      partner_phone TEXT,
      points REAL NOT NULL,
      inr_amount REAL NOT NULL,
      payout_method TEXT NOT NULL,
      payout_details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      admin_notes TEXT,
      transaction_ref TEXT,
      processed_by_id TEXT,
      processed_by_name TEXT,
      processed_at TEXT,
      created_at TEXT NOT NULL
    );`
  ];


  for (const q of schemaQueries) {
    try {
      await client.query(q);
    } catch (err) {
      console.error('[neon-schema] Error creating table:', err.message);
    }
  }

  // Ensure all partner columns exist on users table in PostgreSQL
  const userColumns = [
    'phone TEXT',
    "partner_code TEXT",
    "partner_status TEXT DEFAULT 'PENDING_APPROVAL'",
    "father_spouse_name TEXT",
    "address TEXT",
    "pan_number TEXT",
    "pan_document_url TEXT",
    "aadhaar_number TEXT",
    "aadhaar_document_url TEXT",
    "agreement_accepted INTEGER DEFAULT 0",
    "agreement_signed_at TEXT",
    "agreement_authorized_text TEXT",
    "assigned_rm_id TEXT",
    "assigned_rm_name TEXT",
    "approved_at TEXT",
    "approved_by_id TEXT",
    "approved_by_name TEXT",
    "approval_remark TEXT",
    "certificate_number TEXT",
    "certificate_issued_at TEXT",
    "commission_rate REAL",
    "photo_url TEXT",
    "firm_logo_url TEXT",
    "firm_name TEXT",
    "bio TEXT",
    "city TEXT",
    "is_blocked INTEGER DEFAULT 0",
    "blocked_reason TEXT"
  ];

  for (const col of userColumns) {
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col};`);
    } catch (_) {}
  }

  // Ensure all loan application columns exist in PostgreSQL
  const loanApplicationColumns = [
    'channel_partner_id TEXT',
    'channel_partner_name TEXT',
    'relationship_manager_id TEXT',
    'relationship_manager_name TEXT',
    'pan_number TEXT',
    'aadhaar_number TEXT',
    'bank_id TEXT',
    'bank_name TEXT',
    'sent_to_bank_at TEXT',
    'approved_amount REAL',
    'interest_rate REAL',
    'tenure_months INTEGER',
    'approved_at TEXT',
    'customer_accepted_at TEXT',
    'acceptance_letter_ref TEXT',
    'disbursed_amount REAL',
    'disbursed_at TEXT',
    'commission_amount REAL',
    'commission_status TEXT',
    'submitted_at TEXT',
    'updated_at TEXT',
    'monthly_income REAL',
    'existing_emi REAL',
    'status_changed_at TEXT',
    'tat_alerts_sent TEXT',
    'is_co_branded INTEGER DEFAULT 0',
    'co_brand_name TEXT',
    'co_brand_logo_url TEXT',
    'co_brand_tagline TEXT'
  ];

  for (const col of loanApplicationColumns) {
    try {
      await client.query(`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS ${col};`);
    } catch (_) {}
  }

  // Ensure branch columns exist in PostgreSQL
  const branchColumns = [
    "type TEXT DEFAULT 'BRANCH'",
    'mapped_branch_id TEXT',
    'mapped_branch_name TEXT',
    'dedicated_rm_id TEXT',
    'dedicated_rm_name TEXT',
    'developer_name TEXT',
    'is_co_branded INTEGER DEFAULT 0',
    'co_brand_name TEXT',
    'co_brand_logo_url TEXT',
    'co_brand_tagline TEXT'
  ];
  for (const col of branchColumns) {
    try {
      await client.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS ${col};`);
    } catch (_) {}
  }

  // Ensure notification columns exist in PostgreSQL
  const notificationColumns = [
    "tenant_id TEXT DEFAULT 'default'",
    'recipient_id TEXT',
    'recipient_role TEXT',
    'application_id TEXT'
  ];
  for (const col of notificationColumns) {
    try {
      await client.query(`ALTER TABLE partner_notifications ADD COLUMN IF NOT EXISTS ${col};`);
    } catch (_) {}
  }

  // Self-heal Satara branch co-branding and Lendbridge operations user
  try {
    await client.query(`
      UPDATE branches 
      SET is_co_branded = 1, 
          co_brand_name = 'Lendbridge Capital', 
          co_brand_logo_url = '/lendbridge-logo.png', 
          co_brand_tagline = 'Co-Branded Regional Partner of Money Shelter' 
      WHERE id = 'br_satara_01' OR code = 'STR01' OR name ILIKE '%satara%';

      UPDATE loan_applications
      SET co_brand_logo_url = '/lendbridge-logo.png'
      WHERE branch_id = 'br_satara_01' OR co_brand_name ILIKE '%lendbridge%';

      UPDATE users 
      SET branch_id = 'br_satara_01', role = 'OPERATIONS', name = 'Rutuja (Lendbridge Capital - Satara Ops)' 
      WHERE email ILIKE '%lendbridge%';
    `);
  } catch (_) {}

  // ONE-TIME MARKET LAUNCH CLEANUP:
  // Purges all 30 test loan applications, 39 test documents, test remarks, notifications, commissions,
  // while strictly preserving all 17 users (Admins, Ops, RMs, Partners), branches, banks, products, policy cards, and settings.
  try {
    const purgeCheck = await client.query(
      "SELECT value FROM quickfinsure_store WHERE key = 'market_launch_v1_purged' LIMIT 1;"
    );
    const alreadyPurged = purgeCheck && purgeCheck.length > 0 && purgeCheck[0].value;

    if (!alreadyPurged) {
      console.log('[market-launch] Executing one-time test data cleanup in Neon PostgreSQL...');

      // 1. Truncate relational tables
      const tablesToTruncate = [
        'loan_applications',
        'application_documents',
        'status_history',
        'operational_remarks',
        'partner_notifications',
        'commissions',
        'clawbacks',
        'required_documents',
      ];
      for (const tbl of tablesToTruncate) {
        try {
          await client.query(`TRUNCATE TABLE ${tbl} CASCADE;`);
        } catch (_) {
          try {
            await client.query(`DELETE FROM ${tbl};`);
          } catch (_) {}
        }
      }

      // 2. Clean main_store JSONB in quickfinsure_store
      const storeRes = await client.query(
        "SELECT value FROM quickfinsure_store WHERE key = 'main_store' LIMIT 1;"
      );
      if (storeRes && storeRes.length > 0 && storeRes[0].value) {
        let storeData = storeRes[0].value;
        if (typeof storeData === 'string') {
          try { storeData = JSON.parse(storeData); } catch {}
        }
        if (storeData && storeData.default) storeData = storeData.default;
        if (storeData && typeof storeData === 'object') {
          storeData.loan_applications = [];
          storeData.application_documents = [];
          storeData.status_history = [];
          storeData.operational_remarks = [];
          storeData.partner_notifications = [];
          storeData.commissions = [];
          storeData.clawbacks = [];
          storeData.required_documents = [];

          const cleanJson = JSON.stringify(storeData);
          await client.query(
            `UPDATE quickfinsure_store SET value = $1::jsonb, updated_at = NOW() WHERE key = 'main_store';`,
            [cleanJson]
          );
        }
      }

      // 3. Set marker so cleanup never runs again, protecting future customer applications
      await client.query(
        `INSERT INTO quickfinsure_store (key, value, updated_at) 
         VALUES ('market_launch_v1_purged', '{"purged": true, "timestamp": "' || NOW() || '"}'::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`
      );
      console.log('[market-launch] ✓ Neon test data cleanup completed successfully.');
    }
  } catch (purgeErr) {
    console.warn('[market-launch] Notice during test data cleanup:', purgeErr.message);
  }
}

function loadInitialSeedData() {
  const tryNormalize = (data) => {
    if (!data) return null;
    let obj = data;
    if (obj.default && (obj.default.users || obj.default.tenants)) {
      obj = obj.default;
    }
    if (typeof obj === 'object' && Array.isArray(obj.users) && obj.users.length > 0) {
      return obj;
    }
    return null;
  };

  try {
    const directData = require('../data/initial-data.json');
    const norm = tryNormalize(directData);
    if (norm) return norm;
  } catch (e) {
    // fallback to path resolution
  }

  const seedFiles = [
    path.resolve(process.cwd(), 'data/initial-data.json'),
    path.resolve(process.cwd(), 'data/app-portable.json'),
  ];

  for (const file of seedFiles) {
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        const norm = tryNormalize(parsed);
        if (norm) return norm;
      } catch (err) {
        console.warn('[neon-seed] Warning reading', file, err.message);
      }
    }
  }

  return {
    tenants: [],
    company_settings: [],
    branches: [],
    users: [],
    loan_applications: [],
    application_documents: [],
    status_history: [],
    banks: [],
    bank_products: [],
    commissions: [],
    clawbacks: [],
    operational_remarks: [],
    partner_notifications: [],
    required_documents: [],
    email_logs: [],
    bank_policy_cards: [],
  };
}

function sanitizeUserBlobs(data) {
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

function ensureLendbridgeAndBranchIntegrity(data) {
  if (!data) return;

  // 1. Ensure Satara branch has co-branding configured
  if (Array.isArray(data.branches)) {
    let satara = data.branches.find(
      (b) => b.id === 'br_satara_01' || b.code === 'STR01' || (b.name && b.name.toLowerCase().includes('satara'))
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
        co_brand_logo_url: '/lendbridge-logo.png',
        co_brand_tagline: 'Co-Branded Regional Partner of Money Shelter',
        created_at: '2026-10-05T18:00:00.000Z',
        updated_at: '2026-10-05T18:00:00.000Z',
      };
      data.branches.push(satara);
    } else {
      satara.is_co_branded = 1;
      satara.co_brand_name = satara.co_brand_name || 'Lendbridge Capital';
      satara.co_brand_logo_url = '/lendbridge-logo.png';
      satara.co_brand_tagline = satara.co_brand_tagline || 'Co-Branded Regional Partner of Money Shelter';
    }
  }

  // 2. Ensure lendbridgecapital@gmail.com exists and is strictly tagged to Satara Operations
  if (Array.isArray(data.users)) {
    let lbUser = data.users.find(
      (u) => u.email && u.email.toLowerCase() === 'lendbridgecapital@gmail.com'
    );
    if (!lbUser) {
      lbUser = {
        id: 'usr_lendbridge_ops_01',
        tenant_id: 'default',
        name: 'Rutuja (Lendbridge Capital - Satara Ops)',
        email: 'lendbridgecapital@gmail.com',
        password_hash: '$2a$10$PZCb.z/.Vf6D8Y4V0k/zaOOfMEdQZ8sGDtMYQrvrQFGaFcROwoD9i',
        role: 'OPERATIONS',
        branch_id: 'br_satara_01',
        active: 1,
        created_at: '2026-10-10T00:00:00.000Z',
      };
      data.users.push(lbUser);
    } else {
      lbUser.name = 'Rutuja (Lendbridge Capital - Satara Ops)';
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



  // 4. Purge tejas duplicate alias and any duplicate users from users array
  if (Array.isArray(data.users)) {
    const seenIds = new Set();
    // 3. Ensure Tejas Suresh Ghorpade (QFS-SUB-9796) is present and mapped to Satara Sub-DSA
    let tejasGhorpade = data.users.find(
      (u) =>
        u.partner_code === 'QFS-SUB-9796' ||
        u.partnerCode === 'QFS-SUB-9796' ||
        (u.name && u.name.toLowerCase().includes('tejas suresh ghorpade'))
    );
    if (!tejasGhorpade) {
      tejasGhorpade = {
        id: 'usr_tejas_ghorpade_satara_01',
        tenant_id: 'default',
        name: 'Tejas Suresh Ghorpade',
        email: 'tejas.ghorpade@lendbridge.in',
        role: 'SUB_DSA',
        branch_id: 'br_satara_01',
        phone: '9822334455',
        active: 1,
        is_blocked: 0,
        partner_status: 'PENDING_APPROVAL',
        partner_code: 'QFS-SUB-9796',
        father_spouse_name: 'Suresh Ghorpade',
        address: 'Satara, Maharashtra - 415001',
        pan_number: 'ABCDE5678H',
        aadhaar_number: '987654321099',
        agreement_accepted: 1,
        agreement_signed_at: new Date().toISOString(),
        agreement_authorized_text:
          'SUB-DSA REFERRAL AGREEMENT executed by Tejas Suresh Ghorpade for Lendbridge Capital (Satara Branch). DPDP Act 2023 compliant.',
        city: 'Satara',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      data.users.push(tejasGhorpade);
    } else {
      tejasGhorpade.branch_id = 'br_satara_01';
      tejasGhorpade.partner_code = tejasGhorpade.partner_code || tejasGhorpade.partnerCode || 'QFS-SUB-9796';
      tejasGhorpade.partner_status = tejasGhorpade.partner_status || tejasGhorpade.partnerStatus || 'PENDING_APPROVAL';
    }

    const seenIds = new Set();
    const seenEmails = new Set();
    const seenCodes = new Set();
    const cleaned = [];

    const sortedUsers = [...data.users].sort((a, b) => {
      if (!a || !b) return 0;
      if (a.id === 'usr_tejas_subdsa_alias') return 1;
      if (b.id === 'usr_tejas_subdsa_alias') return -1;
      const aApproved = (a.partner_status === 'APPROVED' || a.partnerStatus === 'APPROVED') ? 1 : 0;
      const bApproved = (b.partner_status === 'APPROVED' || b.partnerStatus === 'APPROVED') ? 1 : 0;
      if (aApproved !== bApproved) return bApproved - aApproved;
      const aCert = (a.certificate_number || a.certificateNumber) ? 1 : 0;
      const bCert = (b.certificate_number || b.certificateNumber) ? 1 : 0;
      if (aCert !== bCert) return bCert - aCert;
      return 0;
    });

    for (const u of sortedUsers) {
      if (!u) continue;
      if (
        u.id === 'usr_tejas_subdsa_alias' ||
        (typeof u.email === 'string' && u.email.toLowerCase() === 'tejas.subdsa@quickfinsure.com')
      ) {
        continue;
      }
      const id = u.id ? String(u.id).toLowerCase().trim() : null;
      const email = u.email ? String(u.email).toLowerCase().trim() : null;
      if (id && seenIds.has(id)) continue;
      if (email && seenEmails.has(email)) continue;

      if (id) seenIds.add(id);
      if (email) seenEmails.add(email);

      cleaned.push(u);
    }
    data.users = cleaned;
  }
}

function safeDeepUnionMerge(primary, secondary) {
  if (!primary || typeof primary !== 'object') return secondary || {};
  if (!secondary || typeof secondary !== 'object') return primary || {};

  const result = { ...secondary, ...primary };

  // Users: deep union merge by ID and Email
  if (Array.isArray(primary.users) || Array.isArray(secondary.users)) {
    const userMap = new Map();
    const emailMap = new Map();

    const addU = (u, isPrimary) => {
      if (!u) return;
      const id = u.id ? String(u.id) : null;
      const email = u.email ? String(u.email).toLowerCase().trim() : null;
      let existing = (id && userMap.get(id)) || (email && emailMap.get(email));
      if (existing) {
        const merged = isPrimary ? { ...existing, ...u } : { ...u, ...existing };
        if (!merged.id && existing.id) merged.id = existing.id;
        if (id) userMap.set(id, merged);
        if (merged.id && merged.id !== id) userMap.set(merged.id, merged);
        if (email) emailMap.set(email, merged);
      } else {
        const userObj = { ...u };
        if (id) userMap.set(id, userObj);
        if (email) emailMap.set(email, userObj);
      }
    };

    // First seed users, then live Neon users take priority
    for (const u of (secondary.users || [])) addU(u, false);
    for (const u of (primary.users || [])) addU(u, true);

    // Deduplicate by unique ID and unique Email
    const seenIds = new Set();
    const seenEmails = new Set();
    const deduplicatedUsers = [];

    for (const u of [...userMap.values(), ...emailMap.values()]) {
      if (!u) continue;
      const uId = u.id ? String(u.id).toLowerCase() : null;
      const uEmail = u.email ? String(u.email).toLowerCase().trim() : null;

      if (uId && seenIds.has(uId)) continue;
      if (uEmail && seenEmails.has(uEmail)) continue;

      if (uId) seenIds.add(uId);
      if (uEmail) seenEmails.add(uEmail);
      deduplicatedUsers.push(u);
    }

    result.users = deduplicatedUsers;
  }

  // All entity collections identified by 'id'
  const collections = [
    'loan_applications',
    'branches',
    'application_documents',
    'status_history',
    'banks',
    'bank_products',
    'bank_policy_cards',
    'commissions',
    'clawbacks',
    'operational_remarks',
    'partner_notifications',
    'required_documents',
    'email_logs',
    'reward_ledger',
    'reward_redemptions',
  ];

  for (const coll of collections) {
    if (Array.isArray(primary[coll]) || Array.isArray(secondary[coll])) {
      const itemMap = new Map();
      for (const item of (secondary[coll] || [])) {
        if (item && item.id) itemMap.set(String(item.id), { ...item });
      }
      for (const item of (primary[coll] || [])) {
        if (item && item.id) {
          const existing = itemMap.get(String(item.id));
          itemMap.set(String(item.id), existing ? { ...existing, ...item } : { ...item });
        }
      }
      result[coll] = Array.from(itemMap.values());
    }
  }

  return result;
}

async function pullData(client) {
  await initSchema(client);

  let currentVal = null;
  try {
    const rows = await client.query("SELECT value FROM quickfinsure_store WHERE key = 'main_store' LIMIT 1;");
    if (rows && rows.length > 0 && rows[0].value) {
      let val = rows[0].value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch {}
      }
      if (val && val.default && (val.default.users || val.default.tenants)) {
        val = val.default;
      }
      if (val && Array.isArray(val.users) && val.users.length > 0) {
        currentVal = val;
      }
    }
  } catch (err) {
    console.warn('[neon-sync] Warning fetching main_store:', err.message);
  }

  const seed = loadInitialSeedData();
  // Safe deep union merge: Live Neon database is primary; seed adds any missing records
  let merged = currentVal ? safeDeepUnionMerge(currentVal, seed) : seed;

  sanitizeUserBlobs(merged);
  ensureLendbridgeAndBranchIntegrity(merged);

  // If live Neon didn't exist or had fewer records than combined seed, push union back to Neon
  if (!currentVal || (merged.users && merged.users.length > (currentVal.users ? currentVal.users.length : 0))) {
    await pushData(client, merged);
  }

  try {
    const appPortablePath = path.resolve(process.cwd(), 'data/app-portable.json');
    const seedPath = path.resolve(process.cwd(), 'data/initial-data.json');
    fs.writeFileSync(appPortablePath, JSON.stringify(merged, null, 2), 'utf8');
    fs.writeFileSync(seedPath, JSON.stringify(merged, null, 2), 'utf8');
  } catch {}

  return merged;
}

async function pushData(client, data) {
  await initSchema(client);
  let payload = data;
  if (payload && payload.default && (payload.default.users || payload.default.tenants)) {
    payload = payload.default;
  }

  // ANTI-WIPE SAFETY LOCK:
  // Before overwriting main_store, fetch current live Neon state to ensure NO records are ever deleted
  try {
    const rows = await client.query("SELECT value FROM quickfinsure_store WHERE key = 'main_store' LIMIT 1;");
    if (rows && rows.length > 0 && rows[0].value) {
      let existing = rows[0].value;
      if (typeof existing === 'string') {
        try { existing = JSON.parse(existing); } catch {}
      }
      if (existing && existing.default) existing = existing.default;
      if (existing && Array.isArray(existing.users) && existing.users.length > 0) {
        // Deep union merge so existing users, cases, and logs in Neon are NEVER wiped
        payload = safeDeepUnionMerge(payload, existing);
      }
    }
  } catch (err) {
    console.warn('[neon-push] Anti-wipe check warning:', err.message);
  }

  sanitizeUserBlobs(payload);
  ensureLendbridgeAndBranchIntegrity(payload);
  const jsonStr = JSON.stringify(payload);

  // 1. Write main_store
  await client.query(
    `INSERT INTO quickfinsure_store (key, value, updated_at) 
     VALUES ('main_store', $1::jsonb, NOW()) 
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
    [jsonStr]
  );

  // 2. Write rolling hourly snapshot backup into quickfinsure_store
  try {
    const backupKey = `backup_${new Date().toISOString().slice(0, 13).replace(/[-T]/g, '_')}`;
    await client.query(
      `INSERT INTO quickfinsure_store (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
      [backupKey, jsonStr]
    );
  } catch (_) {}

  try {
    const appPortablePath = path.resolve(process.cwd(), 'data/app-portable.json');
    const seedPath = path.resolve(process.cwd(), 'data/initial-data.json');
    fs.writeFileSync(appPortablePath, JSON.stringify(payload, null, 2), 'utf8');
    fs.writeFileSync(seedPath, JSON.stringify(payload, null, 2), 'utf8');
  } catch {}
}

// CLI handler for synchronous invocation or manual setup
async function main() {
  const mode = process.argv[2] || 'pull';
  const dbUrl = getDatabaseUrl();

  if (!dbUrl) {
    const dbDir = path.resolve(process.cwd(), 'data');
    const portablePath = path.join(dbDir, 'app-portable.json');
    const seedPath = path.join(dbDir, 'initial-data.json');
    let activeData = null;

    // 1. If app-portable.json already exists and has records, KEEP IT as the source of truth!
    if (fs.existsSync(portablePath)) {
      try {
        const raw = fs.readFileSync(portablePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          activeData = parsed;
        }
      } catch {}
    }

    // 2. If app-portable is not yet populated, check initial-data.json
    if (!activeData && fs.existsSync(seedPath)) {
      try {
        const raw = fs.readFileSync(seedPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          activeData = parsed;
        }
      } catch {}
    }

    // 3. Fallback to loaded initial seed template only if neither file has users
    if (!activeData) {
      activeData = loadInitialSeedData();
    }

    sanitizeUserBlobs(activeData);
    ensureLendbridgeAndBranchIntegrity(activeData);

    // Safely ensure data directory exists and mirror active state to both files
    try {
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
      fs.writeFileSync(portablePath, JSON.stringify(activeData, null, 2), 'utf8');
      fs.writeFileSync(seedPath, JSON.stringify(activeData, null, 2), 'utf8');
    } catch {}

    if (mode === 'pull') {
      process.stdout.write(JSON.stringify(activeData));
    }
    process.exit(0);
  }

  try {
    const client = await getClient();

    if (mode === 'init') {
      await initSchema(client);
      const data = await pullData(client);
      console.log('✓ Neon PostgreSQL schema initialized and verified successfully.');
      console.log('Current records:');
      for (const [table, items] of Object.entries(data)) {
        if (Array.isArray(items)) {
          console.log(`  - ${table}: ${items.length} records`);
        }
      }
      process.exit(0);
    }

    if (mode === 'pull') {
      const data = await pullData(client);
      process.stdout.write(JSON.stringify(data));
      process.exit(0);
    }

    if (mode === 'push') {
      let input = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        input += chunk;
      });
      process.stdin.on('end', async () => {
        try {
          const parsed = JSON.parse(input);
          await pushData(client, parsed);
          process.stdout.write(JSON.stringify({ success: true }));
          process.exit(0);
        } catch (e) {
          console.error(e);
          process.exit(1);
        }
      });
      return;
    }
  } catch (err) {
    console.error('[neon-helper] Error:', err);
    if (mode === 'pull') {
      const fallback = loadInitialSeedData();
      process.stdout.write(JSON.stringify(fallback));
      process.exit(0);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = {
    getDatabaseUrl,
    getClient,
    initSchema,
    pullData,
    pushData,
    loadInitialSeedData,
  };
}
