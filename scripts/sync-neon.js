/**
 * QuickFinSure - Neon PostgreSQL Synchronization Engine
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
      company_name TEXT NOT NULL DEFAULT 'QuickFinSure',
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
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS loan_applications (
      id TEXT PRIMARY KEY,
      tenant_id TEXT DEFAULT 'default',
      token TEXT UNIQUE NOT NULL,
      branch_id TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'LINK_SHARED',
      full_name TEXT,
      mobile TEXT,
      email TEXT,
      loan_type TEXT,
      loan_amount REAL,
      created_at TEXT NOT NULL,
      submitted_at TEXT,
      updated_at TEXT
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
    );`
  ];

  for (const q of schemaQueries) {
    try {
      await client.query(q);
    } catch (err) {
      console.error('[neon-schema] Error creating table:', err.message);
    }
  }
}

function loadInitialSeedData() {
  try {
    const directData = require('../data/initial-data.json');
    if (directData && Array.isArray(directData.users) && directData.users.length > 0) {
      return directData;
    }
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
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.users) && parsed.users.length > 0) {
          return parsed;
        }
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
  };
}

async function pullData(client) {
  await initSchema(client);

  const rows = await client.query("SELECT value FROM quickfinsure_store WHERE key = 'main_store' LIMIT 1;");
  if (rows && rows.length > 0 && rows[0].value && Array.isArray(rows[0].value.users) && rows[0].value.users.length > 0) {
    return rows[0].value;
  }

  // If empty on Neon or has 0 users, populate with initial seed data
  const seed = loadInitialSeedData();
  await pushData(client, seed);
  return seed;
}

async function pushData(client, data) {
  await initSchema(client);
  const jsonStr = JSON.stringify(data);
  await client.query(
    `INSERT INTO quickfinsure_store (key, value, updated_at) 
     VALUES ('main_store', $1::jsonb, NOW()) 
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
    [jsonStr]
  );
}

// CLI handler for synchronous invocation or manual setup
async function main() {
  const mode = process.argv[2] || 'pull';
  const dbUrl = getDatabaseUrl();

  if (!dbUrl) {
    if (mode === 'pull') {
      const fallback = loadInitialSeedData();
      process.stdout.write(JSON.stringify(fallback));
      process.exit(0);
    }
    console.error('DATABASE_URL is not set.');
    process.exit(1);
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
