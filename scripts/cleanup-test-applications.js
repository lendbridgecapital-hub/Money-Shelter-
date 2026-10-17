const fs = require('fs');
const path = require('path');

const seedPath = path.resolve(__dirname, '../data/initial-data.json');
const portablePath = path.resolve(__dirname, '../data/app-portable.json');
const dbFilePath = path.resolve(__dirname, '../data/app.db');

console.log('--- Cleaning test loan applications and test customer documents ---');

if (fs.existsSync(seedPath)) {
  const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  const prevApps = data.loan_applications ? data.loan_applications.length : 0;
  const prevDocs = data.application_documents ? data.application_documents.length : 0;
  const prevHistory = data.status_history ? data.status_history.length : 0;
  const prevRemarks = data.operational_remarks ? data.operational_remarks.length : 0;
  const prevNotifs = data.partner_notifications ? data.partner_notifications.length : 0;

  data.loan_applications = [];
  data.application_documents = [];
  data.status_history = [];
  data.operational_remarks = [];
  data.partner_notifications = [];
  data.commissions = [];
  data.clawbacks = [];
  data.required_documents = [];
  data.reward_ledger = [];
  data.reward_redemptions = [];

  fs.writeFileSync(seedPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ Cleared from initial-data.json:`);
  console.log(`  - Loan Applications: ${prevApps} -> 0`);
  console.log(`  - Application Documents: ${prevDocs} -> 0`);
  console.log(`  - Status History: ${prevHistory} -> 0`);
  console.log(`  - Operational Remarks: ${prevRemarks} -> 0`);
  console.log(`  - Partner Notifications: ${prevNotifs} -> 0`);
  console.log(`  - Preserved Users: ${data.users.length}`);
  console.log(`  - Preserved Branches: ${data.branches.length}`);
  console.log(`  - Preserved Banks: ${data.banks.length}`);
  console.log(`  - Preserved Bank Products: ${data.bank_products.length}`);
  console.log(`  - Preserved Policy Cards: ${data.bank_policy_cards.length}`);
}

if (fs.existsSync(portablePath)) {
  try {
    const pData = JSON.parse(fs.readFileSync(portablePath, 'utf8'));
    pData.loan_applications = [];
    pData.application_documents = [];
    pData.status_history = [];
    pData.operational_remarks = [];
    pData.partner_notifications = [];
    pData.commissions = [];
    pData.clawbacks = [];
    pData.required_documents = [];
    pData.reward_ledger = [];
    pData.reward_redemptions = [];
    fs.writeFileSync(portablePath, JSON.stringify(pData, null, 2), 'utf8');
    console.log('✓ Cleared app-portable.json');
  } catch (err) {
    console.warn('Warning updating app-portable.json:', err.message);
  }
}

if (fs.existsSync(dbFilePath)) {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbFilePath);
    db.exec(`
      DELETE FROM loan_applications;
      DELETE FROM application_documents;
      DELETE FROM status_history;
      DELETE FROM operational_remarks;
      DELETE FROM partner_notifications;
      DELETE FROM commissions;
      DELETE FROM clawbacks;
      DELETE FROM required_documents;
      DELETE FROM reward_ledger;
      DELETE FROM reward_redemptions;
    `);
    db.close();
    console.log('✓ Cleared local SQLite app.db tables');
  } catch (err) {
    console.warn('Warning clearing local SQLite:', err.message);
  }
}

console.log('--- Cleanup completed successfully ---');
