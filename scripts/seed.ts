/* Seeds QuickFinSure as the single client organization with branches,
 * staff users, banks, commissions, and sample loan requests across all flowchart stages.
 */
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';
import { createBranch, listBranches } from '../src/lib/repos/branchesRepo';
import { createUser, emailExists } from '../src/lib/repos/usersRepo';
import {
  createApplicationLink,
  recordCustomerSubmission,
  sendCaseToBank,
  setDocumentsRequired,
  approveApplication,
  customerAcceptLoanOffer,
  disburseApplication,
} from '../src/lib/repos/applicationsRepo';
import { addStatusHistory } from '../src/lib/repos/statusHistoryRepo';
import { addDocument } from '../src/lib/repos/documentsRepo';
import { listBanks, createBank } from '../src/lib/repos/banksRepo';
import { addOperationalRemark, addRequiredDocuments, createNotification } from '../src/lib/repos/workflowRepo';
import { recordCommission } from '../src/lib/repos/commissionsRepo';
import { generateApplicationToken } from '../src/lib/tokens';
import { listTenants, createTenant } from '../src/lib/repos/tenantsRepo';
import { getCompanySettings } from '../src/lib/settings';
import { createBankProduct, listBankProducts } from '../src/lib/repos/bankProductsRepo';

async function main() {
  console.log('Seeding QuickFinSure Platform Data…\n');

  // 1. Maintain single client organization: QuickFinSure ONLY
  const existingTenants = listTenants();
  for (const t of existingTenants) {
    if (t.slug !== 'quickfinsure') {
      try {
        db.prepare('DELETE FROM tenants WHERE id = ?').run(t.id);
        db.prepare('DELETE FROM company_settings WHERE tenant_id = ?').run(t.id);
      } catch {
        // continue
      }
    }
  }

  let quickFinSureTenant = listTenants().find((t) => t.slug === 'quickfinsure');
  if (!quickFinSureTenant) {
    quickFinSureTenant = createTenant({
      name: 'QuickFinSure Solutions',
      slug: 'quickfinsure',
      domain: 'apply.quickfinsure.com',
      companyName: 'QuickFinSure',
      tagline: 'Your Trusted Multi-Branch Loan Origination & Partner Platform',
      primaryColor: '#0284c7', // Sky Blue Theme
      accentColor: '#10b981',  // Emerald Green Accent
      officialEmail: 'contact@quickfinsure.com',
      supportPhone: '+91 98765 43210',
      websiteUrl: 'https://quickfinsure.com',
      footerText: '© 2026 QuickFinSure. All rights reserved. Licensed DSA Partner.',
      portalTitle: 'QuickFinSure — Loan Origination Portal',
    });
    console.log('✓ Maintained single client organization: QuickFinSure.');
  } else {
    console.log('✓ QuickFinSure organization verified.');
  }

  // 2. Initialize / update system default Company Settings to QuickFinSure
  db.prepare(
    `UPDATE company_settings 
     SET company_name = ?, tagline = ?, primary_color = ?, accent_color = ?,
         official_email = ?, support_phone = ?, website_url = ?, footer_text = ?,
         portal_title = ?, updated_at = ?
     WHERE id = 'default' OR tenant_id = 'default'`
  ).run(
    'QuickFinSure',
    'Your Trusted Multi-Branch Loan Origination & Partner Platform',
    '#0284c7',
    '#10b981',
    'contact@quickfinsure.com',
    '+91 98765 43210',
    'https://quickfinsure.com',
    '© 2026 QuickFinSure. All rights reserved. Licensed DSA Partner.',
    'QuickFinSure — Loan Origination Portal',
    new Date().toISOString()
  );
  await getCompanySettings('default');
  console.log('✓ Updated system branding to QuickFinSure.');

  // 3. Seed Branches for QuickFinSure
  let branches = listBranches();
  if (branches.length === 0) {
    createBranch({
      name: 'Pune - Bavdhan HQ',
      code: 'PUN01',
      email: 'pune@quickfinsure.com',
      address: '5th Floor, Galore Tech IT Park, Bavdhan, Pune - 411021',
      phone: '+91 20 4000 1100',
    });
    createBranch({
      name: 'Mumbai - Andheri West',
      code: 'MUM01',
      email: 'mumbai@quickfinsure.com',
      address: 'Office 402, Lotus Corporate Park, Andheri East, Mumbai - 400063',
      phone: '+91 22 6000 2200',
    });
    createBranch({
      name: 'Bengaluru - Indiranagar',
      code: 'BLR01',
      email: 'blr@quickfinsure.com',
      address: '100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru - 560038',
      phone: '+91 80 8000 3300',
    });
    branches = listBranches();
    console.log(`✓ Created ${branches.length} QuickFinSure branches.`);
  }

  const hq = branches[0];
  const second = branches[1] || branches[0];

  // 4. Seed Partner Lending Banks
  let banks = listBanks('default');
  if (banks.length === 0) {
    createBank({
      name: 'HDFC Bank',
      code: 'HDFC',
      commissionPct: 1.0,
      contactPerson: 'Vikram Joshi (Regional DSA Desk)',
      email: 'dsa.pune@hdfcbank.com',
      phone: '+91 98220 11223',
    });
    createBank({
      name: 'ICICI Bank',
      code: 'ICICI',
      commissionPct: 0.9,
      contactPerson: 'Anjali Nair (Retail Assets)',
      email: 'retail.loans@icicibank.com',
      phone: '+91 98220 22334',
    });
    createBank({
      name: 'State Bank of India',
      code: 'SBI',
      commissionPct: 0.75,
      contactPerson: 'Suresh Patil (RACPC Pune)',
      email: 'racpc.pune@sbi.co.in',
      phone: '+91 98220 33445',
    });
    createBank({
      name: 'Axis Bank',
      code: 'AXIS',
      commissionPct: 1.1,
      contactPerson: 'Pooja Hegde (Channel Sales)',
      email: 'channel.partners@axisbank.com',
      phone: '+91 98220 44556',
    });
    createBank({
      name: 'Kotak Mahindra Bank',
      code: 'KOTAK',
      commissionPct: 1.25,
      contactPerson: 'Sameer Kulkarni (Prime Mortgages)',
      email: 'mortgages@kotak.com',
      phone: '+91 98220 55667',
    });
    banks = listBanks('default');
    console.log(`✓ Created ${banks.length} partner lending banks.`);
  }

  // 5. Seed Users for all 4 Roles
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const roleUsers = [
    {
      name: 'QuickFinSure Admin',
      email: 'admin@quickfinsure.com',
      role: 'ADMIN' as const,
      branchId: hq.id,
      phone: '+91 98765 00001',
    },
    {
      name: 'Operations Team Lead',
      email: 'ops@quickfinsure.com',
      role: 'OPERATIONS' as const,
      branchId: hq.id,
      phone: '+91 98765 00002',
    },
    {
      name: 'Relationship Manager (Pune)',
      email: 'rm@quickfinsure.com',
      role: 'RELATIONSHIP_MANAGER' as const,
      branchId: hq.id,
      phone: '+91 98765 00003',
    },
    {
      name: 'Relationship Manager (Pune)',
      email: 'rm.pune@quickfinsure.com',
      role: 'RELATIONSHIP_MANAGER' as const,
      branchId: hq.id,
      phone: '+91 98765 00004',
    },
    {
      name: 'Central Support Desk',
      email: 'support@quickfinsure.com',
      role: 'CENTRAL_SUPPORT' as const,
      branchId: hq.id,
      phone: '+91 98765 00005',
    },
    {
      name: 'Channel Partner (Apex Wealth)',
      email: 'partner@quickfinsure.com',
      role: 'CHANNEL_PARTNER' as const,
      branchId: hq.id,
      phone: '9820011223',
    },
    {
      name: 'Rajesh Gupta (FinAdvisors)',
      email: 'rajesh@finadvisors.in',
      role: 'CHANNEL_PARTNER' as const,
      branchId: hq.id,
      phone: '9819922334',
    },
    {
      name: 'Pooja Mehta (Capital Associates)',
      email: 'pooja@capitalassociates.in',
      role: 'CHANNEL_PARTNER' as const,
      branchId: second.id,
      phone: '9821133445',
    },
    {
      name: 'Vikram Malhotra (Prime Capital)',
      email: 'vikram@primecapital.in',
      role: 'CHANNEL_PARTNER' as const,
      branchId: hq.id,
      phone: '9822334455',
    },
    // Backwards-compatible aliases
    {
      name: 'Operations Backup',
      email: 'executive@quickfinsure.com',
      role: 'OPERATIONS' as const,
      branchId: second.id,
      phone: '+91 98765 00005',
    },
    {
      name: 'RM Backup',
      email: 'manager@quickfinsure.com',
      role: 'RELATIONSHIP_MANAGER' as const,
      branchId: second.id,
      phone: '+91 98765 00006',
    },
  ];

  for (const u of roleUsers) {
    if (!emailExists(u.email)) {
      createUser({ ...u, passwordHash });
      console.log(`✓ Created user ${u.email} (${u.role})`);
    } else {
      // Ensure role, password_hash, and phone are updated
      db.prepare(
        'UPDATE users SET role = ?, password_hash = ?, phone = ?, branch_id = ?, active = 1, is_blocked = 0 WHERE email = ?'
      ).run(u.role, passwordHash, u.phone || null, u.branchId, u.email);
    }
  }

  // Fetch created partner and ops rows
  const partnerUser = db.prepare('SELECT id, name FROM users WHERE email = ?').get('partner@quickfinsure.com') as { id: string; name: string };
  const opsUser = db.prepare('SELECT id, name FROM users WHERE email = ?').get('ops@quickfinsure.com') as { id: string; name: string };
  const rmUser = db.prepare('SELECT id, name FROM users WHERE email = ?').get('rm@quickfinsure.com') as { id: string; name: string };

  // Set partner approval & certificate states
  db.prepare(
    `UPDATE users 
     SET partner_status = 'APPROVED',
         certificate_number = 'QFS-CERT-2026-8801',
         certificate_issued_at = '2026-03-01T10:00:00.000Z',
         assigned_rm_id = ?,
         assigned_rm_name = ?,
         partner_code = 'QFS-PRT-8801',
         pan_number = 'ABCDE1234F',
         aadhaar_number = '998877665544',
         agreement_accepted = 1
     WHERE email = 'partner@quickfinsure.com'`
  ).run(rmUser.id, rmUser.name);

  db.prepare(
    `UPDATE users 
     SET partner_status = 'PENDING_APPROVAL',
         partner_code = 'QFS-PRT-9420',
         pan_number = 'PRIME1234K',
         aadhaar_number = '123456789012',
         agreement_accepted = 1,
         agreement_signed_at = '2026-09-25T14:30:00.000Z',
         agreement_authorized_text = 'SUB-DSA REFERRAL AGREEMENT executed by Vikram Malhotra (Prime Capital) on 25-Sep-2026. PAN: PRIME1234K. DPDP compliant.'
     WHERE email = 'vikram@primecapital.in'`
  ).run();

  // 5.5 Seed Product-Wise Partner Lending Bank Cards
  const existingProducts = listBankProducts('default');
  if (existingProducts.length === 0) {
    createBankProduct({
      productName: 'Home Loan',
      banks: ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Kotak Mahindra Bank', 'Axis Bank', 'Bank of Baroda', 'Punjab National Bank', 'Tata Capital Housing Finance', 'Bajaj Housing Finance', 'LIC Housing Finance'],
      baseRate: 2.0, // QuickFinSure receivable from bank (e.g. 2.0%)
      partnerRate: 1.2, // Payout to partner (e.g. 1.2%)
      notes: 'Prime residential home loans with fast 48-hr in-principle sanction.',
    });

    createBankProduct({
      productName: 'Personal Loan',
      banks: ['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Bajaj Finance', 'Tata Capital Financial Services', 'Kotak Mahindra Bank', 'IDFC FIRST Bank', 'Aditya Birla Finance'],
      baseRate: 2.5, // QuickFinSure receivable (2.5%)
      partnerRate: 1.5, // Payout to partner (1.5%)
      notes: 'Salaried and self-employed personal loans up to ₹40 Lakhs.',
    });

    createBankProduct({
      productName: 'Business Loan',
      banks: ['ICICI Bank', 'HDFC Bank', 'Axis Bank', 'Bajaj Finance', 'L&T Finance', 'Piramal Capital & Housing Finance', 'Poonawalla Fincorp', 'Hero FinCorp'],
      baseRate: 2.75, // QuickFinSure receivable (2.75%)
      partnerRate: 1.65, // Payout to partner (1.65%)
      notes: 'Unsecured business loans and MSME working capital facilities.',
    });

    createBankProduct({
      productName: 'Loan Against Property',
      banks: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Kotak Mahindra Bank', 'Bajaj Housing Finance', 'PNB Housing Finance', 'Tata Capital Housing Finance'],
      baseRate: 1.8, // QuickFinSure receivable (1.8%)
      partnerRate: 1.0, // Payout to partner (1.0%)
      notes: 'Commercial & residential collateral loans up to ₹15 Crores.',
    });

    createBankProduct({
      productName: 'Balance Transfer',
      banks: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Bank of Baroda', 'Union Bank of India', 'Kotak Mahindra Bank'],
      baseRate: 1.5, // QuickFinSure receivable (1.5%)
      partnerRate: 0.85, // Payout to partner (0.85%)
      notes: 'Zero prepayment penalty refinancing with top-up options.',
    });

    createBankProduct({
      productName: 'Education Loan',
      banks: ['State Bank of India', 'Bank of Baroda', 'HDFC Bank', 'Avanse Financial Services', 'InCred Financial Services', 'Auxilo Finserve'],
      baseRate: 1.75, // QuickFinSure receivable (1.75%)
      partnerRate: 1.1, // Payout to partner (1.1%)
      notes: 'Domestic and international study loans with customized moratorium.',
    });

    // Dedicated Partner Product Card for Apex Wealth
    if (partnerUser) {
      createBankProduct({
        productName: 'Home Loan',
        banks: ['HDFC Bank', 'ICICI Bank', 'Kotak Mahindra Bank'],
        baseRate: 2.2, // QuickFinSure receivable (2.2%)
        partnerRate: 1.5, // Dedicated Partner payout (1.5%)
        dedicatedPartnerId: partnerUser.id,
        dedicatedPartnerName: partnerUser.name,
        dedicatedPartnerMobile: '9820011223',
        notes: 'Exclusive premier tier partner payout matrix for high-volume cases.',
      });
    }

    console.log('✓ Created 7 product-wise lending bank cards (Universal & Dedicated).');
  }

  // 6. Seed Sample Loan Applications across all Flowchart Buckets
  const existingApps = db.prepare('SELECT COUNT(*) as c FROM loan_applications').get() as { c: number };
  if (existingApps.c <= 3) {
    // Clean up old sample applications so clean flowchart data is loaded
    db.prepare('DELETE FROM loan_applications').run();
    db.prepare('DELETE FROM application_documents').run();
    db.prepare('DELETE FROM status_history').run();
    db.prepare('DELETE FROM operational_remarks').run();
    db.prepare('DELETE FROM partner_notifications').run();
    db.prepare('DELETE FROM required_documents').run();
    db.prepare('DELETE FROM commissions').run();

    const hdfc = banks.find((b) => b.code === 'HDFC') || banks[0];
    const icici = banks.find((b) => b.code === 'ICICI') || banks[1];
    const axis = banks.find((b) => b.code === 'AXIS') || banks[3];

    // --- BUCKET 1: LINK_SHARED ---
    const app1 = createApplicationLink({
      token: generateApplicationToken(),
      branchId: hq.id,
      createdById: partnerUser.id,
      channelPartnerId: partnerUser.id,
      channelPartnerName: partnerUser.name,
      relationshipManagerId: rmUser.id,
      relationshipManagerName: rmUser.name,
    });
    addStatusHistory({
      applicationId: app1.id,
      status: 'LINK_SHARED',
      note: 'Custom application link generated and shared with client via WhatsApp.',
      changedById: partnerUser.id,
    });

    // --- BUCKET 2: DOCUMENTS_IN ---
    const app2 = createApplicationLink({
      token: generateApplicationToken(),
      branchId: hq.id,
      createdById: partnerUser.id,
      channelPartnerId: partnerUser.id,
      channelPartnerName: partnerUser.name,
      relationshipManagerId: rmUser.id,
      relationshipManagerName: rmUser.name,
    });
    recordCustomerSubmission(app2.id, {
      fullName: 'Rahul Anant Deshmukh',
      mobile: '9876543210',
      email: 'rahul.deshmukh@gmail.com',
      loanType: 'HOME_LOAN',
      loanAmount: 3500000,
    });
    addStatusHistory({ applicationId: app2.id, status: 'LINK_SHARED', note: 'Link generated.' });
    addStatusHistory({ applicationId: app2.id, status: 'DOCUMENTS_IN', note: 'Customer uploaded KYC documents.' });
    addDocument({
      applicationId: app2.id,
      category: 'PAN_CARD',
      label: 'PAN Card Copy',
      fileName: 'rahul_deshmukh_pan.pdf',
      fileUrl: 'https://placehold.co/600x400.png?text=PAN+Card',
      fileSize: 452000,
      mimeType: 'application/pdf',
    });
    addDocument({
      applicationId: app2.id,
      category: 'AADHAAR_CARD',
      label: 'Aadhaar Card Front & Back',
      fileName: 'rahul_aadhaar.pdf',
      fileUrl: 'https://placehold.co/600x400.png?text=Aadhaar+Card',
      fileSize: 512000,
      mimeType: 'application/pdf',
    });

    // --- BUCKET 3: SENT_TO_BANK ---
    const app3 = createApplicationLink({
      token: generateApplicationToken(),
      branchId: hq.id,
      createdById: partnerUser.id,
      channelPartnerId: partnerUser.id,
      channelPartnerName: partnerUser.name,
      relationshipManagerId: rmUser.id,
      relationshipManagerName: rmUser.name,
    });
    recordCustomerSubmission(app3.id, {
      fullName: 'Priya Shrikant Sharma',
      mobile: '9822114455',
      email: 'priya.sharma@yahoo.com',
      loanType: 'PERSONAL_LOAN',
      loanAmount: 1500000,
    });
    sendCaseToBank(app3.id, hdfc.id, hdfc.name);
    addStatusHistory({ applicationId: app3.id, status: 'LINK_SHARED', note: 'Link generated.' });
    addStatusHistory({ applicationId: app3.id, status: 'DOCUMENTS_IN', note: 'KYC verified.' });
    addStatusHistory({ applicationId: app3.id, status: 'SENT_TO_BANK', note: `Loan file submitted to ${hdfc.name}.` });
    addOperationalRemark({
      applicationId: app3.id,
      authorId: opsUser.id,
      authorName: opsUser.name,
      authorRole: 'OPERATIONS',
      statusChangedTo: 'SENT_TO_BANK',
      remark: `Complete salary slips, Form 16, and credit bureau report dispatched to ${hdfc.name} underwriting desk.`,
    });

    // --- BUCKET 4: DOCUMENTS_REQUIRED ---
    const app4 = createApplicationLink({
      token: generateApplicationToken(),
      branchId: hq.id,
      createdById: partnerUser.id,
      channelPartnerId: partnerUser.id,
      channelPartnerName: partnerUser.name,
      relationshipManagerId: rmUser.id,
      relationshipManagerName: rmUser.name,
    });
    recordCustomerSubmission(app4.id, {
      fullName: 'Amit Jayant Patel',
      mobile: '9890123456',
      email: 'amit.patel@pateltech.com',
      loanType: 'BUSINESS_LOAN',
      loanAmount: 5000000,
    });
    sendCaseToBank(app4.id, icici.id, icici.name);
    setDocumentsRequired(app4.id);
    addRequiredDocuments(app4.id, [
      'ITR Acknowledgement & Computation of AY 2024-25',
      'Bank Statement with Apr-Sep 2024 credits highlighted',
      'GST 3B Returns for last 2 quarters',
    ]);
    addStatusHistory({ applicationId: app4.id, status: 'LINK_SHARED', note: 'Link created.' });
    addStatusHistory({ applicationId: app4.id, status: 'DOCUMENTS_IN', note: 'KYC submitted.' });
    addStatusHistory({ applicationId: app4.id, status: 'SENT_TO_BANK', note: 'Sent to ICICI Bank.' });
    addStatusHistory({
      applicationId: app4.id,
      status: 'DOCUMENTS_REQUIRED',
      note: 'ICICI Credit Manager raised query: Missing latest ITR and GST returns.',
    });
    addOperationalRemark({
      applicationId: app4.id,
      authorId: opsUser.id,
      authorName: opsUser.name,
      authorRole: 'OPERATIONS',
      statusChangedTo: 'DOCUMENTS_REQUIRED',
      remark: 'Bank credit query raised. Please upload 2 years ITR and 2 quarters GST returns for borrower.',
    });
    createNotification({
      recipientId: partnerUser.id,
      recipientRole: 'CHANNEL_PARTNER',
      applicationId: app4.id,
      title: 'Action Required: Documents Requested by Bank',
      message: 'ICICI Bank underwriting requires ITR and GST returns for Amit Patel. Please upload.',
    });

    // --- BUCKET 5: APPROVED (Awaiting Customer Acceptance) ---
    const app5 = createApplicationLink({
      token: generateApplicationToken(),
      branchId: second.id,
      createdById: partnerUser.id,
      channelPartnerId: partnerUser.id,
      channelPartnerName: partnerUser.name,
      relationshipManagerId: rmUser.id,
      relationshipManagerName: rmUser.name,
    });
    recordCustomerSubmission(app5.id, {
      fullName: 'Sunita Ramesh Verma',
      mobile: '9765432100',
      email: 'sunita.verma@gmail.com',
      loanType: 'HOME_LOAN',
      loanAmount: 4500000,
    });
    approveApplication(app5.id, 4500000, 8.65, 180, icici.id, icici.name);
    addStatusHistory({ applicationId: app5.id, status: 'LINK_SHARED', note: 'Link shared.' });
    addStatusHistory({ applicationId: app5.id, status: 'DOCUMENTS_IN', note: 'Submitted.' });
    addStatusHistory({ applicationId: app5.id, status: 'SENT_TO_BANK', note: 'Sent to ICICI.' });
    addStatusHistory({
      applicationId: app5.id,
      status: 'APPROVED',
      note: 'Sanction letter issued by ICICI Bank for ₹45,00,000 @ 8.65% for 180 months. Awaiting customer acceptance.',
    });
    addOperationalRemark({
      applicationId: app5.id,
      authorId: opsUser.id,
      authorName: opsUser.name,
      authorRole: 'OPERATIONS',
      statusChangedTo: 'APPROVED',
      remark: 'ICICI Bank approved ₹45L at 8.65% floating rate. Sanction letter generated and sent to customer.',
    });

    // --- BUCKET 6: CUSTOMER_ACCEPTED ---
    const app6 = createApplicationLink({
      token: generateApplicationToken(),
      branchId: hq.id,
      createdById: partnerUser.id,
      channelPartnerId: partnerUser.id,
      channelPartnerName: partnerUser.name,
      relationshipManagerId: rmUser.id,
      relationshipManagerName: rmUser.name,
    });
    recordCustomerSubmission(app6.id, {
      fullName: 'Vikram Dinesh Malhotra',
      mobile: '9988776655',
      email: 'vikram.malhotra@corp.in',
      loanType: 'LOAN_AGAINST_PROPERTY',
      loanAmount: 7500000,
    });
    approveApplication(app6.id, 7000000, 9.25, 120, hdfc.id, hdfc.name);
    customerAcceptLoanOffer(app6.token, 'QFS-SANCT-7B92');
    addStatusHistory({ applicationId: app6.id, status: 'APPROVED', note: 'HDFC Bank approved ₹70L.' });
    addStatusHistory({
      applicationId: app6.id,
      status: 'CUSTOMER_ACCEPTED',
      note: 'Customer signed digital acceptance letter (Ref: QFS-SANCT-7B92). Ready for bank disbursement.',
    });
    addOperationalRemark({
      applicationId: app6.id,
      authorId: opsUser.id,
      authorName: opsUser.name,
      authorRole: 'OPERATIONS',
      statusChangedTo: 'CUSTOMER_ACCEPTED',
      remark: 'Customer verified sanction letter. Signed acceptance ready for transmission to HDFC disbursement desk.',
    });

    // --- BUCKET 7: DISBURSED ---
    const app7 = createApplicationLink({
      token: generateApplicationToken(),
      branchId: hq.id,
      createdById: partnerUser.id,
      channelPartnerId: partnerUser.id,
      channelPartnerName: partnerUser.name,
      relationshipManagerId: rmUser.id,
      relationshipManagerName: rmUser.name,
    });
    recordCustomerSubmission(app7.id, {
      fullName: 'Neha Kulkarni',
      mobile: '9850011223',
      email: 'neha.kulkarni@techindia.org',
      loanType: 'PERSONAL_LOAN',
      loanAmount: 3500000,
    });
    approveApplication(app7.id, 3500000, 10.25, 48, axis.id, axis.name);
    customerAcceptLoanOffer(app7.token, 'QFS-SANCT-88A1');
    const partnerComm = Math.round((3500000 * 1.1) / 100); // 1.1% Axis Bank = ₹38,500
    disburseApplication(app7.id, 3500000, partnerComm);
    recordCommission({
      applicationId: app7.id,
      channelPartnerId: partnerUser.id,
      channelPartnerName: partnerUser.name,
      bankId: axis.id,
      bankName: axis.name,
      disbursedAmount: 3500000,
      commissionRate: 1.1,
    });
    addStatusHistory({
      applicationId: app7.id,
      status: 'DISBURSED',
      note: `Loan disbursed ₹35,00,000 by Axis Bank. Partner commission ₹${partnerComm.toLocaleString('en-IN')} logged.`,
    });
    addOperationalRemark({
      applicationId: app7.id,
      authorId: opsUser.id,
      authorName: opsUser.name,
      authorRole: 'OPERATIONS',
      statusChangedTo: 'DISBURSED',
      remark: 'UTR: AXIS202609259012. ₹35L credited to borrower account. Partner payout queued.',
    });

    console.log('✓ Successfully seeded 7 sample applications across all flowchart pipeline stages.');
  }

  console.log('\n========================================================================');
  console.log('🎉 QuickFinSure Flowchart & Role-Based System Initialized!');
  console.log('========================================================================');
  console.log('  1. ADMIN:                admin@quickfinsure.com / Password123!');
  console.log('  2. OPERATIONS:           ops@quickfinsure.com / Password123!');
  console.log('  3. RELATIONSHIP MGR:     rm@quickfinsure.com / Password123!');
  console.log('  4. CHANNEL PARTNER:      partner@quickfinsure.com / Password123!');
  console.log('========================================================================\n');
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
