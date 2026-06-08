# Production Risk Register

**Evidence sources**: Vercel API, source code, audit raw files, chat history  
**Last updated**: 2026-03-28  
**Severity**: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

---

## 1. Security Risks

### RISK-S01 — DB Password in Source Code (🔴 Critical)
**Where**: `lib/prisma.ts:7` (hardcoded Supabase URL with password literal)  
**Also**: `sync-to-supabase.js` (root-level script)  
**Effect**: Anyone with git repo access has direct PostgreSQL access to production data. Git history contains the credential even if the file is changed.  
**Blast radius**: Full read/write on all production tables (User, Application, Complaint, etc.)  
**Remediation**:
1. Rotate Supabase DB password immediately in Supabase dashboard
2. Update `lib/prisma.ts` to use env var (no hardcode)
3. Switch to pgbouncer URL (port 6543) in the new env var
4. Run `git filter-repo` or BFG to remove from history (or accept git history exposure and rely on rotation)

### RISK-S02 — NEXTAUTH_SECRET Compromised (🔴 Critical)
**Where**: `vercel.json` (committed to git), active in production  
**Value**: Human-readable string — in git history permanently  
**Effect**: Any JWT session cookie signed with this secret can be forged. An attacker can create a valid `SUPER_ADMIN` session token without authenticating.  
**Note**: Auth is currently a hardcoded single-user bypass anyway; combined with this, the CMS is fully acquirable without valid creds.  
**Remediation**: Generate strong secret (`openssl rand -base64 32`), set ONLY in Vercel dashboard, remove from `vercel.json`.

### RISK-S03 — Unauthenticated Write Endpoints in Production (🔴 Critical)
**Routes**:
- `POST /api/upload-image` — no session check → anyone can upload to Cloudinary
- `POST /api/pages` — no session check → anyone can create CMS pages (including with malicious `customJS`)
- `PATCH /api/pages` — no session check → anyone can inject JS/CSS into existing pages

**Effect**:
- Cloudinary storage exhaustion / financial impact on Cloudinary account
- Arbitrary JavaScript injected into served CMS pages (XSS) affecting public website visitors
- `customJS` field in `Page` model is rendered in `<script>` tags server-side

**Remediation**: Add `getServerSession(authOptions)` check to all three handlers immediately.

### RISK-S04 — GitHub PAT Embedded in Git Remote URL (🟠 High)
**Where**: `git remote -v` shows full PAT in remote URL: `https://[TOKEN]@github.com/tahaspace/sinai-institute.git`  
**Effect**: If `.git/config` is exposed (e.g., via misconfigured web server, directory traversal), the PAT is readable. The PAT allows push to the repo.  
**Current exposure**: Not immediately exploitable (`.git/` is not served by Next.js). Risk is on the local machine and any team member who clones.  
**Remediation**: Remove PAT from remote URL: `git remote set-url origin https://github.com/tahaspace/sinai-institute.git`, use SSH key or credential manager.

### RISK-S05 — Cloudinary API Secret Committed to `.env` (🟠 High)
**Where**: `.env` file — while in `.vercelignore`, it IS tracked in git  
**Cloudinary account credentials are also in `cursor_vercel 01.md` (chat export)**  
**Effect**: Cloudinary API secret exposure allows upload of arbitrary content and deletion of existing media.  
**Remediation**: Rotate Cloudinary API secret; ensure `.env` is in `.gitignore` (it is listed as `.env*` in `.gitignore` — verify it was never committed).

### RISK-S06 — `public/check-localstorage.html` Accessible in Production (🟡 Medium)
**URL in production**: `https://test.sinaiinstitute.com/check-localstorage.html`  
**Content**: Developer debug tool that reads and displays localStorage keys/values  
**Effect**: Admin localStorage (slides config, news config, social media links, Zustand state) is readable by any visitor who accesses this page.  
**Remediation**: Delete `public/check-localstorage.html`.

---

## 2. Hidden Dependency Risks

### RISK-D01 — Production Dependent on Supabase Free Tier (🟠 High)
**Limit**: ~60 simultaneous connections (direct mode, port 5432)  
**Pattern**: Vercel serverless = new TCP connection per cold start × concurrent requests  
**Risk**: Under real traffic (exam results season, application period), connections exhaust → `P1001: Can't reach database server` for all users simultaneously  
**Symptoms to watch**: Intermittent 500 errors on all API routes at the same time  
**Remediation**: Switch to pgbouncer URL (port 6543, `?pgbouncer=true&connection_limit=1`); or upgrade Supabase plan.

### RISK-D02 — Font Awesome via External CDN (🟡 Medium)
**Where**: `app/layout.tsx` — `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/..."/>`  
**Risk**: If cdnjs.cloudflare.com is unreachable, all icons fail to render site-wide. Icons are load-critical (navigation, buttons).  
**Note**: SRI `integrity` attribute is present — this protects against CDN compromise but not against CDN downtime.  
**Remediation**: Self-host Font Awesome or use next/font/local; alternatively, the icons could be replaced with Lucide React (already installed).

### RISK-D03 — No Service Worker in Production (PWA Broken) (🟡 Medium)
**Code**: `lib/pwa/register-sw.ts` tries to register `/sw.js`  
**Reality**: No `sw.js` in `public/` directory  
**Effect**: PWA install prompt shows but actually fails; offline mode non-functional; push notification registration silently fails  
**Low immediate risk** — these are enhancement features, not functional requirements. But browser errors will appear in console.  
**Remediation**: Remove the PWA install UI components, or generate `sw.js` using `next-pwa` package.

### RISK-D04 — Node 24.x Not Validated Against Codebase (🟡 Medium)
**Vercel API says**: `nodeVersion: 24.x` (live)  
**Package.json says**: `@types/node: ^20`  
**Risk**: Node 24 may have behavior changes in crypto, `https`, `fetch` that affect NextAuth, Prisma TLS, or Cloudinary SDK. `better-sqlite3` (devDependency with native binding) would fail under Node 24 but is not in production.  
**Remediation**: Pin `nodeVersion: 20.x` or `22.x` in Vercel project settings; verify current prod behavior.

---

## 3. Migration Risks

### RISK-M01 — No Migrations Directory — Schema Drift Undetectable (🔴 Critical)
**State**: `prisma migrate` has never been used. All schema changes applied via `prisma db push`.  
**Risk**: The production Supabase schema may differ from `prisma/schema.prisma` if:
- A `db push` ran with an older schema version
- A manual change was made in Supabase Studio
- A failed `db push` left partial changes

**Consequence**: If you run `prisma db push` with the current schema and production has diverged, Prisma may drop columns or tables without warning.  
**Remediation**:
1. Run `prisma db pull` against production to get current actual schema
2. Diff against `schema.prisma`
3. Establish a migration baseline: `prisma migrate diff --from-schema-datamodel` 
4. Switch to `prisma migrate` workflow instead of `db push`

### RISK-M02 — Seed Script Destroys Production Data If Run (🔴 Critical)
**Command**: `npm run prisma:seed`  
**Effect**: `prisma.department.deleteMany({})` cascades to ALL Results, Schedules, Specializations. `prisma.news.deleteMany({})` wipes all news.  
**Target**: `DATABASE_URL` from `.env` → currently production Supabase  
**Risk**: Accidental run of `npm run prisma:seed` destroys all production academic data.  
**Remediation**: Add `NODE_ENV` guard to seed script; rename to `seed:dev` with explicit `DATABASE_URL` override requirement.

### RISK-M03 — db.push in Dev Targets Production DB (🟠 High)
**Command**: `npm run prisma:push`  
**Target**: `DATABASE_URL` from `.env` → Supabase production  
**Risk**: Any local schema change pushed via `prisma db push` alters the production database immediately, with no review, staging, or rollback.  
**Remediation**: Use a separate Supabase project for local dev, or use `prisma db push --preview-feature` on a shadow DB.

### RISK-M04 — `prisma/dev.db` Contains Historical PII (🟠 High)
**File**: `prisma/dev.db` (299KB, SQLite, tracked in git via `.vercelignore` but git-tracked)  
**Contents**: Based on `migrate-data.ts` which reads Users, Departments, Specializations, Pages, and potentially Applications from this file — which means:
- Application records may include `nationalId`, `birthDate`, `phone`, `email` of real test data
**Remediation**: Inspect the DB (`npx prisma studio --url file:prisma/dev.db`), delete if it contains PII, `git rm --cached prisma/dev.db`, ensure `.gitignore` covers `*.db`.

---

## 4. Logging and Observability Gaps

### RISK-L01 — Vercel Hobby Plan: 1-Day Log Retention (🟠 High)
**Plan**: Hobby (free)  
**Log retention**: 1 day  
**Effect**: Debugging a reported bug from 2 days ago has zero logs. Production errors are invisible after 24 hours.  
**Current evidence**: `logs-last-24h.txt` in audit files was empty — no traffic or logs captured.  
**Remediation**: Upgrade to Vercel Pro (7-day logs) or integrate a log forwarding service (Axiom, Datadog, Logtail — all have free Vercel integrations).

### RISK-L02 — No Error Monitoring (🟠 High)
**State**: No Sentry, no New Relic, no Datadog, no Highlight.io.  
**Evidence**: Not in `package.json`, not in `app/layout.tsx` provider stack.  
**Effect**: Errors in production are invisible unless a user reports them or logs are manually checked within 24 hours.  
**Remediation**: Add Sentry with 1 line: `npm install @sentry/nextjs && npx @sentry/wizard@latest -i nextjs`. Free tier sufficient.

### RISK-L03 — Debug `console.log` Statements in Production Code (🟡 Medium)
**Location**: `app/(public)/[slug]/page.tsx` — 15+ `console.log` calls including `'🔄 DynamicPage render'`, `'🔍 Fetching page'`, `'📡 API Response'`, etc.  
**Effect**: These appear in Vercel function logs, consuming log quota and obscuring real errors.  
**Also**: `lib/cloudinary.ts` logs cloud name prefix on every module load.  
**Remediation**: Remove or convert to `if (process.env.NODE_ENV === 'development')` guards.

### RISK-L04 — No Health Check or Uptime Monitoring (🟡 Medium)
**State**: No `/api/health` endpoint, no uptime monitoring (UptimeRobot, BetterUptime, etc.).  
**Effect**: Site downtime is only discovered when a user reports it.  
**Remediation**: Add `GET /api/health` returning `{ status: 'ok', db: 'ok' }` by testing Prisma connection. Connect to a free uptime monitor.

---

## 5. Deployment Rollback Concerns

### RISK-R01 — No Automated Tests — Can't Validate Build Before Deploy (🟠 High)
**State**: No test framework in `package.json`. No test scripts. No CI pipeline.  
**Risk**: Every `vercel --prod` deploys untested code. A breaking change is only discovered after it hits production.  
**Remediation**: Add at minimum smoke tests for critical API routes; run `tsc --noEmit` and `eslint` before deploying.

### RISK-R02 — Rollback Requires Manual CLI Action (🟡 Medium)
**Mechanism**: `vercel rollback` or promote a previous deployment in dashboard.  
**Risk**: If the developer is unavailable during an incident, rollback requires Vercel dashboard access.  
**Prisma schema caveat**: If a `prisma db push` ran as part of the broken deployment, rollback does NOT revert the schema. Schema changes in production are one-way without migrations.  
**Remediation**: Before every deploy that includes schema changes, take a Supabase backup.

### RISK-R03 — Production Deployment 57 Days Stale (🟡 Medium)
**Commits on `main` not yet deployed**: `a045e58` (force-dynamic CMS fix), `ff29e76` (Dialog key fix)  
**Known bugs still live in production**:
- CMS pages served cached/stale data (no `force-dynamic`)
- CMS edit dialog may not re-render on open

**Remediation**: Deploy `main` to production: `vercel --prod` from repo root.

### RISK-R04 — Single Production DB — No Backup Observable (🟡 Medium)
**Supabase free plan**: Point-in-time recovery available only on Pro plan. Free plan offers daily backups only (7-day retention on Pro).  
**Risk**: A bad `prisma db push` or `prisma:seed` run destroys data with no immediate recovery.  
**Remediation**: Manually export data periodically (`pg_dump` via Supabase CLI), or upgrade to Supabase Pro for PITR.

---

## Risk Priority Matrix

| Priority | Risks | Action |
|---------|-------|--------|
| 🔴 Do before any new feature work | S01, S02, S03, M01, M02 | Rotate credentials, add auth guards, baseline migrations |
| 🟠 Do within 1 week | S04, S05, D01, D04, M03, M04, L01, L02, R01 | Dev/prod DB separation, connection pooler, monitoring |
| 🟡 Address in next sprint | S06, D02, D03, L03, L04, R02, R03, R04 | Debug cleanup, deploy stale fixes, rollback docs |
