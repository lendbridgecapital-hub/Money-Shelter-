# White-Label Reselling & Multi-Client Commercial Guide

This document explains how to brand, package, price, and sell **LendBridge Capital / Quickfinsure** as a commercial white-label software to multiple clients (DSA agencies, loan distributors, NBFCs, and financial advisory firms).

---

## 1. What Makes This Software White-Label Ready?

This platform is engineered from the ground up so that **zero coding is required to customize it for a new client**. Every client can have their own brand identity, visual style, staff structure, and customer communication:

1. **Instant Dynamic Visual Theming**
   - **Logo & Favicon**: Upload custom company logo and browser tab icon.
   - **Color Engine**: Set custom primary and accent hex colors (e.g. Navy Blue, Emerald Green, Royal Purple, Crimson Red). The platform automatically generates dynamic CSS shades and updates the entire sidebar, headers, badges, buttons, and customer forms in real-time.
   - **Brand Identity**: Company name, tagline, custom portal title, and legal copyright footers.

2. **Multi-Branch Operations Scoped to Each Client**
   - Each client can create unlimited branches (e.g. Head Office, Regional Branches, City Hubs).
   - Role-based staff access:
     - **Admin**: Full control over branding, branches, team, and all requests.
     - **Loan Manager**: Branch oversight and review of branch files.
     - **Operation Executive**: Day-to-day customer request generation and document tracking.

3. **Secure, Frictionless Customer Loan Submission (`/apply/[token]`)**
   - Staff generate unique single-use links and share via WhatsApp or Email.
   - Customers open a clean, mobile-responsive application form branded with the **client's logo, colors, and branch details**.
   - 5-stage document upload checklist (PAN, Aadhaar, Residence Proof, Salary Slips/ITR, Bank Statements) with a legal self-attestation declaration.
   - Confirmation receipt with a tracking token and assigned branch contact.

4. **Dedicated SMTP Email Relay per Client**
   - Each client can connect their own mail server (Gmail Workspace, SendGrid, Amazon SES, Postmark) so applicant confirmations and branch alerts come from `loans@clientcompany.com`.

---

## 2. Business Models: How to Sell to Multiple Customers

You can monetize this software using two high-margin models:

### Model A: Multi-Tenant Hosted SaaS (Recurring Revenue)
*Host one instance on Railway, Render, or a VPS and onboard multiple clients.*

| Tier | Target Client | Monthly Fee | Features Included |
|---|---|---|---|
| **Starter** | Small DSA / 1 Branch | ₹3,999 / mo (\$50/mo) | 1 Branch, up to 5 staff, branded portal, up to 100 applications/mo |
| **Growth** | Medium DSA / 3–5 Branches | ₹8,999 / mo (\$120/mo) | 5 Branches, 20 staff, custom brand colors, custom SMTP email |
| **Enterprise** | Large Distributor / State-wide | ₹19,999 / mo (\$250/mo) | Unlimited branches, custom domain (`loans.client.com`), priority support |

### Model B: Dedicated Enterprise License (One-Time Sale + AMC)
*Deploy an independent, isolated instance directly onto the client's own VPS or cloud account.*

- **One-time Setup & License Fee**: ₹75,000 – ₹2,50,000 (\$1,000 – \$3,500) per client.
- **Annual Maintenance Contract (AMC)**: 15% – 20% annually for software updates, server monitoring, and backups.

---

## 3. How to Onboard a New Client in 3 Minutes

When a new customer purchases the software:

1. **Log in as Admin** and navigate to **Client Tenants** (`/admin/tenants`).
2. Click **+ Onboard New Client**.
3. Fill in:
   - **Client Name**: e.g., *Apex Financial Services*
   - **Tenant Slug**: e.g., *apex-finserv*
   - **Brand Colors**: Pick their corporate brand colors.
   - **Client Admin Email**: The email of their director or operations head.
   - **Initial Password**: Set temporary password (e.g. `Password123!`).
4. Click **Save Client Organization**.
   - The system automatically creates their isolated organization, default Head Office branch, and client administrator account!

---

## 4. Custom Domain & Subdomain Setup

For enterprise clients wanting their own domain (e.g., `loans.apexfinserv.com`):

1. **DNS Record**:
   Ask the client to add a CNAME record in their DNS manager (GoDaddy, Cloudflare, Namecheap):
   ```
   CNAME  loans.apexfinserv.com  ->  your-server-ip or your-domain.com
   ```
2. **Reverse Proxy (Nginx / Caddy / Railway)**:
   Add the client's domain to your proxy configuration. With Caddy or Railway, SSL certificates (HTTPS) are issued automatically via Let's Encrypt with zero manual intervention.

---

## 5. Quick Demonstration Checklist for Sales Pitches

When showing a live demo to a prospective buyer:

1. **Show the Login Screen**: Demonstrate the clean interface and one-click role switchers.
2. **Show Company Setup (`/admin/company`)**: Change the Primary Color from Blue to Purple or Emerald Green live, click Save, and show how the whole app adapts instantly.
3. **Show Link Generation (`/branch/create-link`)**: Click "+ Generate Link" and show the instant WhatsApp share button.
4. **Open the Customer Application (`/apply/[token]`)**: Show how an applicant sees the client's logo, colors, mobile-optimized file upload checklist, and self-attestation box.
5. **Show the Request Pipeline (`/branch/requests`)**: Show the live 5-stage tracker from *Link Shared* to *Loan Disbursed* with audit trail timestamps.
