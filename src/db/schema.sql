-- Multi-Tenant White-Label Schema for LendBridge Capital / Quickfinsure

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  company_name TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1e40af',
  accent_color TEXT NOT NULL DEFAULT '#059669',
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
);

CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  company_name TEXT NOT NULL DEFAULT 'LendBridge Capital',
  tagline TEXT DEFAULT 'Fast & Reliable Loan Solutions',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1e40af',
  accent_color TEXT NOT NULL DEFAULT '#059669',
  official_email TEXT,
  support_phone TEXT,
  website_url TEXT,
  footer_text TEXT,
  portal_title TEXT DEFAULT 'LendBridge Capital — Loan Origination Portal',
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_secure INTEGER DEFAULT 0,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from_name TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT DEFAULT 'default',
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT DEFAULT 'default',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'LOAN_MANAGER', 'OPERATION_EXECUTIVE')),
  branch_id TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loan_applications (
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
);

CREATE TABLE IF NOT EXISTS application_documents (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS status_history (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  changed_by_id TEXT,
  changed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apps_token ON loan_applications(token);
CREATE INDEX IF NOT EXISTS idx_apps_branch ON loan_applications(branch_id);
CREATE INDEX IF NOT EXISTS idx_apps_tenant ON loan_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_docs_app ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_history_app ON status_history(application_id);
