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
  role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'LOAN_MANAGER', 'OPERATION_EXECUTIVE', 'CENTRAL_SUPPORT', 'OPERATIONS', 'RELATIONSHIP_MANAGER', 'CHANNEL_PARTNER')),
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
);

CREATE TABLE IF NOT EXISTS loan_applications (
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

CREATE TABLE IF NOT EXISTS banks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT DEFAULT 'default',
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  logo_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bank_products (
  id TEXT PRIMARY KEY,
  bank_id TEXT NOT NULL,
  loan_type TEXT NOT NULL,
  min_amount REAL NOT NULL,
  max_amount REAL NOT NULL,
  min_tenure_months INTEGER NOT NULL,
  max_tenure_months INTEGER NOT NULL,
  interest_rate_min REAL NOT NULL,
  interest_rate_max REAL NOT NULL,
  processing_fee_percent REAL NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT DEFAULT 'default',
  application_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  disbursed_amount REAL NOT NULL,
  commission_rate REAL NOT NULL,
  commission_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clawbacks (
  id TEXT PRIMARY KEY,
  commission_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operational_remarks (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  status_changed_to TEXT,
  remark TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS partner_notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT DEFAULT 'default',
  recipient_id TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  application_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS required_documents (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  document_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  uploaded_file_url TEXT,
  uploaded_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_partner_code ON users(partner_code);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apps_token ON loan_applications(token);
CREATE INDEX IF NOT EXISTS idx_apps_branch ON loan_applications(branch_id);
CREATE INDEX IF NOT EXISTS idx_apps_tenant ON loan_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_docs_app ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_history_app ON status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_commissions_partner ON commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON partner_notifications(recipient_id);

CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT DEFAULT 'default',
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SENT',
  error_message TEXT,
  message_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_to ON email_logs(to_email);

CREATE TABLE IF NOT EXISTS bank_policy_cards (
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
  rate_matrix TEXT NOT NULL DEFAULT '[]',
  dynamic_criteria TEXT NOT NULL DEFAULT '{}',
  tat_days INTEGER DEFAULT 3,
  special_features TEXT DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  priority_weight INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bpc_tenant_loan ON bank_policy_cards(tenant_id, loan_type);

