# DSA Loan Platform

A multi-branch, white-labeled loan application platform for a DSA (Direct
Selling Agent) that sources loans on behalf of partner banks. Staff generate
secure one-time links, customers fill in their details and upload documents
with no account needed, and the request moves through a five-stage pipeline
from *Link Shared* to *Loan Disbursed* — with automated email notifications
along the way.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS**, using
Server Actions for all mutations (no separate REST/API layer to maintain)
and an embedded **SQLite** database via `better-sqlite3` for a zero-config
start. See [Going to production](#going-to-production) for scaling this to
Postgres and object storage.

**Deploying this?** See [DEPLOYMENT.md](DEPLOYMENT.md) — a `Dockerfile` and
`docker-compose.yml` are included, with step-by-step guides for a VPS and
for Railway/Render.

## Features

- **Whitelabeling** — company name, logo, and a live primary/accent color
  picker that re-themes the entire app (admin panel, dashboards, and the
  public customer form) instantly on save.
- **Branch management** — create, edit, and (when empty) delete branches.
  Every user and every loan request belongs to exactly one branch.
- **Roles** — Admin (full control), Loan Manager (branch oversight), and
  Operation Executive (day-to-day request handling), each scoped to their
  branch except Admin, who sees everything.
- **Request pipeline** — every application tracks status across *Link
  Shared → Document Received → Loan Approved / Rejected → Loan Disbursed*,
  shown as a visual tracker plus a full audit trail of who changed what,
  when.
- **Secure application links** — a branch staff member generates a unique,
  single-use, unguessable link (no login required) and shares it with the
  customer.
- **Customer application form** — basic details, loan type (Home, Personal,
  Business, Loan against Property, Education, Gold, Others), and a full
  document checklist (PAN, Aadhaar, residence proof, income proof, bank
  statements) with a prominent self-attestation notice and confirmation
  checkbox.
- **Automated emails** — on submission, the customer gets a confirmation
  email and the branch/company gets an alert with the applicant's details,
  and the request automatically moves to *Document Received*. SMTP is
  configured entirely from the Admin > Email Settings screen (with a
  send-a-test-email button); if SMTP isn't configured yet, the app logs a
  warning and continues instead of failing the customer's submission.

## Getting started

```bash
npm install
cp .env.example .env        # generate a real NEXTAUTH_SECRET before deploying
npm run db:seed             # creates demo branches, users, and sample requests
npm run dev                 # http://localhost:3000
```

Demo sign-ins created by the seed script (password for all: `Password123!`):

| Email | Role | Branch |
|---|---|---|
| `admin@dsaloans.example` | Admin | Pune - Bavdhan HQ |
| `manager@dsaloans.example` | Loan Manager | Pune - Bavdhan HQ |
| `executive@dsaloans.example` | Operation Executive | Pune - Bavdhan HQ |
| `mumbai.exec@dsaloans.example` | Operation Executive | Mumbai - Andheri |

Sign in as Admin first and visit **Company Setup** to set your real company
name, logo, and brand colors, then **Email Settings** to connect SMTP (e.g.
a Gmail app password, SendGrid, Postmark, or your own mail server) so
notification emails actually go out.

For production, generate a real secret for `NEXTAUTH_SECRET`
(`openssl rand -base64 32`), set `NEXTAUTH_URL` and `APP_BASE_URL` to your
real domain, and run `npm run build && npm start`.

## How it's organized

```
src/
  app/
    (app)/            Authenticated area (Admin panel + branch dashboards), guarded by src/app/(app)/layout.tsx
    apply/[token]/     Public, unauthenticated customer application form
    api/auth/          NextAuth route handler
  actions/             Server Actions — every mutation in the app (branding, branches,
                       users, links, status updates, the public submission) lives here
  components/          Client components (forms, tables, the status tracker, etc.)
  lib/
    db.ts              better-sqlite3 connection + schema bootstrap
    repos/             Typed data-access functions — the only code that writes SQL
    auth.ts            NextAuth config + requireUser()/requireRole() guards
    mail.ts            Nodemailer wrapper reading SMTP config from the database
    documentChecklist.ts  Single source of truth for the document upload groups
  db/schema.sql        Table definitions, applied idempotently on boot
scripts/seed.ts         Demo data
```

**Why Server Actions instead of a REST API?** Every admin form, the link
generator, the status updater, and the public application form call a
typed `async function` directly — no hand-rolled fetch/JSON boilerplate, and
Next.js handles the request plumbing. Every action re-checks the caller's
role and branch server-side (see `requireRole()` / `requireUser()` in
`src/lib/auth.ts`), so this is not "trust the client" — it's the same
authorization you'd write for a REST endpoint, just without the extra
layer.

**Why SQLite?** It means `npm install && npm run dev` works with zero
external services — no database server to stand up, no connection string to
get right before you can look at the app. It comfortably handles a single
DSA office or a handful of branches. The data-access layer is isolated
behind `src/lib/repos/*`, specifically so that swapping the storage engine
later doesn't mean rewriting the UI.

## Role permissions

| Action | Admin | Loan Manager | Operation Executive |
|---|---|---|---|
| Company branding, colors, logo | ✅ | – | – |
| Create/edit/delete branches | ✅ | – | – |
| Create/edit users | ✅ | – | – |
| Configure SMTP / email settings | ✅ | – | – |
| View requests (own branch) | ✅ (all branches) | ✅ | ✅ |
| Generate application link | ✅ | ✅ | ✅ |
| Update request status | ✅ | ✅ | ✅ |

Loan Manager and Operation Executive both operate at the branch level per
the spec ("oversight of branch-level loan files" vs. "day-to-day management
of customer requests"); if you want status changes (approve/reject/disburse)
restricted to Loan Manager and above, tighten the check in
`src/actions/applicationActions.ts::updateApplicationStatusAction`.

## Document upload checklist

Configured in one place — `src/lib/documentChecklist.ts` — so adding,
renaming, or reordering a required document doesn't touch the form
component or the server action:

1. **PAN Card**
2. **Aadhaar Card** (full card, or front & back)
3. **Residence Proof** (any one — customer picks the type, then uploads it):
   Passport, Telephone Bill, Postpaid Mobile Bill, Driving License,
   Electricity Bill (last month), Ration Card, or a notarized Rent
   Agreement with the owner's current month electricity bill.
4. **Income Proof**: latest 3 months' salary slips, latest Form-16 (last 2
   years), latest increment & appointment letter with CTC, and — for a
   working co-applicant — their latest Form-16 and 3 salary slips.
5. **Bank Statements & Financials**: last 1 year from the salary account,
   last 1 year from the savings account (individual & co-applicant), and
   existing loan repayment track records.

The form displays a prominent self-attestation notice and requires the
customer to check a confirmation box before submitting.

## Going to production

This starter is fully functional as shipped, but a few things are worth
upgrading before a large-scale production rollout:

- **Database**: `better-sqlite3` is great for a single server and modest
  volume. For multi-instance deployments or heavy concurrent write load,
  swap the implementations in `src/lib/repos/*.ts` for a Postgres client
  (e.g. `pg` or `postgres.js`) behind the same function signatures — nothing
  above the repo layer needs to change. `src/db/schema.sql` translates to
  standard Postgres DDL with minor type tweaks (`TEXT` timestamps →
  `timestamptz`, add `gen_random_uuid()` defaults, etc.).
- **File storage**: uploaded documents are saved to `public/uploads/` on
  local disk (see `src/lib/uploads.ts`) — fine for a single server, but it
  won't survive a redeploy on most PaaS/serverless hosts and won't be
  shared across multiple instances. Swap `saveUploadedFile()` for an
  S3-compatible bucket (AWS S3, Cloudflare R2, DigitalOcean Spaces) — it's
  the only function that touches the filesystem.
- **Secrets**: set a real `NEXTAUTH_SECRET`, and store the SMTP password
  in the database only as a convenience for the Admin UI — consider
  encrypting it at rest or moving it to a secrets manager if your
  compliance requirements call for it.
- **Rate limiting**: the public `/apply/[token]` route and the login form
  are good candidates for basic rate limiting (e.g. via your reverse proxy
  or a middleware) before going live.
- **Backups**: if you stay on SQLite in production, back up the `data/`
  directory (WAL files included) on a schedule.
