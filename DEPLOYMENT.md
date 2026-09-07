# Deployment Guide

This app is **stateful**: it stores its database (SQLite) and every uploaded
document on local disk. That rules out pure-serverless hosts (Vercel,
Netlify) as-is, because their filesystem is wiped on every deploy and isn't
shared across instances. It works great anywhere that gives you a
persistent disk — a VPS, or a PaaS with volume support.

A `Dockerfile` and `docker-compose.yml` are included, so deployment is the
same three commands almost everywhere.

## Option comparison

| Option | Effort | Cost | Best for |
|---|---|---|---|
| **VPS + Docker** (DigitalOcean, Hetzner, AWS Lightsail) | Medium (one-time server setup) | ~$5–12/mo | Full control, cheapest, recommended default |
| **Railway** | Low (connect repo, click deploy) | ~$5–20/mo | Fastest to get live, least ops work |
| **Render** | Low | Free tier available, ~$7+/mo for persistent disk | Similar to Railway |
| **Vercel / Netlify** | N/A without changes | — | Not supported as-is — see [Going serverless](#going-serverless-vercelnetlify) |

If you don't already have a preference, **Railway** is the fastest path to
a live URL today; a **VPS with Docker** is the better long-term home once
you're past the pilot stage (cheaper at scale, no platform lock-in).

## Option A: Railway (fastest)

1. Push this project to a GitHub repo (Railway deploys from Git).
2. On [railway.app](https://railway.app), **New Project → Deploy from GitHub
   repo**, select it. Railway detects the `Dockerfile` automatically.
3. Add a **Volume**, mounted at `/app/data`, and a second one mounted at
   `/app/public/uploads` (Settings → Volumes). This is the step people
   skip and then wonder why their data disappears on redeploy.
4. Under **Variables**, set:
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` and `APP_BASE_URL` — your Railway-provided domain
     (or your custom domain), e.g. `https://loans.yourcompany.com`
   - `DATABASE_FILE=/app/data/app.db`
   - Leave `SMTP_*` unset for now — you'll set those from the Admin >
     Email Settings screen after first login instead.
5. Deploy. Once it's up, open a shell (Railway → your service → the
   three-dot menu → "Run a command", or add a one-off deploy step) and run
   `npm run db:seed` once to create your first Admin login — or see
   [Creating the first Admin without the seed script](#creating-the-first-admin-without-the-seed-script).
6. Add your custom domain under Settings → Domains; Railway issues the TLS
   certificate for you automatically.

Render works almost identically — Dockerfile deploy, add a persistent disk
mounted at `/app/data` and `/app/public/uploads`, same environment
variables.

## Option B: Your own VPS with Docker (recommended for production)

1. Spin up a small Ubuntu VPS (1–2 GB RAM is plenty to start) and install
   Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. Copy the project to the server (`git clone` your repo, or `scp` the
   folder up), then create your production `.env`:
   ```bash
   cp .env.example .env
   # edit .env: set NEXTAUTH_SECRET (openssl rand -base64 32),
   # NEXTAUTH_URL and APP_BASE_URL to your real domain
   ```
3. Bring it up:
   ```bash
   docker compose up -d --build
   ```
   This builds the image, and creates two named volumes
   (`dsa_data`, `dsa_uploads`) that persist across restarts and rebuilds.
4. Create your first Admin user (see below), then check
   `docker compose logs -f app` if anything looks off.
5. **Put a reverse proxy in front of it for HTTPS.** The container only
   serves plain HTTP on port 3000. The easiest option is
   [Caddy](https://caddyserver.com/) — install it on the host and point it
   at the container:
   ```
   # /etc/caddy/Caddyfile
   loans.yourcompany.com {
     reverse_proxy localhost:3000
   }
   ```
   `systemctl reload caddy` and Caddy handles the certificate automatically
   via Let's Encrypt. (nginx + certbot works too, if that's your team's
   standard.)
6. Point your domain's DNS A record at the server's IP.

To redeploy after a code change: `git pull && docker compose up -d --build`.

## Creating the first Admin without the seed script

The seed script (`npm run db:seed`) is meant for local development — it
creates demo branches, users, and sample requests. In production you
usually want just one real Admin account instead. Run this once, inside
the running container (`docker compose exec app sh`, or your platform's
shell/console feature):

```bash
node -e "
const bcrypt = require('bcryptjs');
const { createBranch } = require('./src/lib/repos/branchesRepo');
const { createUser } = require('./src/lib/repos/usersRepo');
(async () => {
  const branch = createBranch({ name: 'Head Office', code: 'HO01' });
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  createUser({ name: 'Admin', email: 'admin@yourcompany.com', passwordHash, role: 'ADMIN', branchId: branch.id });
  console.log('Admin created — sign in with admin@yourcompany.com / ChangeMe123!');
})();
"
```

Sign in immediately and change that password by creating your real account
and disabling this one, or update it directly — there's no self-service
"change password" screen yet, so the current path is to disable an old
account and create a fresh one from Admin > Users.

## Post-deploy checklist

- [ ] Signed in as Admin and set your real company name, logo, and brand
      colors under **Company Setup**
- [ ] Configured SMTP under **Email Settings** and sent yourself a test
      email
- [ ] Created your real branches and staff accounts, disabled/removed any
      demo accounts
- [ ] Generated a test application link, submitted it as if you were a
      customer, and confirmed both notification emails arrived
- [ ] Confirmed `/app/data` and `/app/public/uploads` are on a volume that
      survives a redeploy (redeploy once and check your test application is
      still there)
- [ ] HTTPS is working on your real domain

## Going serverless (Vercel/Netlify)

Possible, but requires two changes first — both described in the main
[README's "Going to production" section](README.md#going-to-production):
swap the SQLite repos for a hosted Postgres database, and swap local file
uploads for an S3-compatible bucket. Once neither the database nor the
uploads touch local disk, this becomes a standard stateless Next.js app
and deploys to Vercel like any other.
