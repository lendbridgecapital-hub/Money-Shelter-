/* Seeds a demo Admin user, a couple of branches, and sample staff so the
 * app is usable immediately after `npm install && npm run db:seed`.
 * Safe to re-run — it skips creating rows that already exist.
 */
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';
import { createBranch, listBranches } from '../src/lib/repos/branchesRepo';
import { createUser, emailExists } from '../src/lib/repos/usersRepo';
import { createApplicationLink, recordCustomerSubmission } from '../src/lib/repos/applicationsRepo';
import { addStatusHistory } from '../src/lib/repos/statusHistoryRepo';
import { generateApplicationToken } from '../src/lib/tokens';

async function main() {
  console.log('Seeding DSA Loan Platform demo data…');

  let branches = listBranches();
  if (branches.length === 0) {
    createBranch({ name: 'Pune - Bavdhan HQ', code: 'PUN01', email: 'pune.branch@example.com', address: '5th Floor, Galore Tech IT Park, Bavdhan, Pune - 411021' });
    createBranch({ name: 'Mumbai - Andheri', code: 'MUM01', email: 'mumbai.branch@example.com' });
    branches = listBranches();
    console.log(`Created ${branches.length} branches.`);
  } else {
    console.log(`Branches already exist (${branches.length}) — skipping.`);
  }

  const hq = branches[0];
  const second = branches[1] || branches[0];

  const demoUsers: { name: string; email: string; role: 'ADMIN' | 'LOAN_MANAGER' | 'OPERATION_EXECUTIVE'; branchId: string }[] = [
    { name: 'Admin User', email: 'admin@dsaloans.example', role: 'ADMIN', branchId: hq.id },
    { name: 'Loan Manager', email: 'manager@dsaloans.example', role: 'LOAN_MANAGER', branchId: hq.id },
    { name: 'Operation Executive', email: 'executive@dsaloans.example', role: 'OPERATION_EXECUTIVE', branchId: hq.id },
    { name: 'Mumbai Executive', email: 'mumbai.exec@dsaloans.example', role: 'OPERATION_EXECUTIVE', branchId: second.id },
  ];

  const passwordHash = await bcrypt.hash('Password123!', 10);
  for (const u of demoUsers) {
    if (emailExists(u.email)) {
      console.log(`User ${u.email} already exists — skipping.`);
      continue;
    }
    createUser({ ...u, passwordHash });
    console.log(`Created user ${u.email} (${u.role})`);
  }

  // A couple of sample requests so the dashboard isn't empty on first run.
  const exec = demoUsers[2];
  const execRow = db.prepare('SELECT id FROM users WHERE email = ?').get(exec.email) as { id: string } | undefined;
  if (execRow) {
    const existingApps = db.prepare('SELECT COUNT(*) as c FROM loan_applications').get() as { c: number };
    if (existingApps.c === 0) {
      const link1 = createApplicationLink({ token: generateApplicationToken(), branchId: hq.id, createdById: execRow.id });
      addStatusHistory({ applicationId: link1.id, status: 'LINK_SHARED', note: 'Demo: link shared with prospective customer.' });

      const link2 = createApplicationLink({ token: generateApplicationToken(), branchId: hq.id, createdById: execRow.id });
      recordCustomerSubmission(link2.id, {
        fullName: 'Rahul Deshmukh',
        mobile: '9876543210',
        email: 'rahul.demo@example.com',
        loanType: 'HOME_LOAN',
        loanAmount: 3500000,
      });
      addStatusHistory({ applicationId: link2.id, status: 'LINK_SHARED', note: 'Demo: link shared.' });
      addStatusHistory({ applicationId: link2.id, status: 'DOCUMENT_RECEIVED', note: 'Demo: customer submitted documents.' });

      console.log('Created 2 sample loan requests.');
    }
  }

  console.log('\nDone. Sign in with:');
  for (const u of demoUsers) console.log(`  ${u.email} / Password123!  (${u.role})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.close());
