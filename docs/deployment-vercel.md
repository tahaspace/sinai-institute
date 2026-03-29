# Deployment — Vercel

**Source**: Vercel API (live 2026-03-28) + `vercel.json` + `lib/prisma.ts` + audit files  
**Confidence**: High on all items unless marked ⚠️

---

## Live Project Identity

| Field | Value | Source |
|-------|-------|--------|
| Project | `sinai-institute` | Vercel API |
| Project ID | `prj_uIVrMsaHP2QUaYkzsg38Iggl4DlC` | Vercel API |
| Team | `tahaspace` (`team_XSGK9WqXGmUOOUJxN83U3XvK`) | Vercel API |
| Framework | `nextjs` | Vercel API |
| **Node version** | **24.x** | Vercel API (codebase targets 20.x — unvalidated mismatch) |
| Plan | Hobby — 10s function timeout · 1-day log retention | |
| Build command | `npm run build` (= `prisma generate && next build`) | |
| Git integration | ❌ None — CLI deploys only | Vercel API `link.type: None` |

---

## Active Domains

| Domain | Status | Type |
|--------|--------|------|
| `test.sinaiinstitute.com` | ✅ Primary live | CNAME → Vercel DNS (`70c132ac...vercel-dns-017.com`) |
| `sinai-institute.vercel.app` | ✅ Active alias | Vercel auto |
| `sinaiinstitute.com` | ❌ Not Vercel | A2Hosting (separate server, different codebase) |

DNS registrar: Hostgator · Nameservers: A2Hosting (ns1–ns4.a2hosting.com)

All aliases resolve to production deployment: `sinai-institute-3a1twtdm9-tahaspaces-projects.vercel.app`

---

## Current Production State

**Deployed**: ~2026-01-30 (57 days stale as of audit)  
**Deploy method**: Vercel CLI — `vercel --prod`  
**Pending commits not yet live**:

```
a045e58  fix: force dynamic rendering for CMS pages  ← CMS shows stale data in prod
ff29e76  fix: add key prop to Dialog to force re-render  ← Dialog may not render correctly
```

**To deploy**: `vercel --prod` from `main` branch root

---

## Environment Variables

### Confirmed in Vercel Dashboard (live, encrypted, correct)

| Variable | Set age | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | recent | Supabase connection string (port 6543 + pgbouncer) |
| `SUPABASE_SERVICE_ROLE_KEY` | 47d | Supabase admin JWT (unused in app code) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 47d | Client key (unused — no Supabase SDK) |
| `NEXT_PUBLIC_SUPABASE_URL` | 47d | Project URL (unused — no Supabase SDK) |
| `CLOUDINARY_API_SECRET` | recent | Upload auth |
| `CLOUDINARY_API_KEY` | recent | Upload auth |
| `CLOUDINARY_CLOUD_NAME` | recent | Upload target |
| `NEXTAUTH_URL` | recent | Auth domain (`https://test.sinaiinstitute.com`) |
| `NEXTAUTH_SECRET` | recent | Session signing token |

### In `vercel.json` env block (REMOVED)

> The `vercel.json` `env` block has been successfully removed to ensure Vercel dashboard precedence.

### Preview Environment

Only `DATABASE_URL` is set — `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and all `CLOUDINARY_*` vars are absent from the preview environment.  
**Current impact**: None — no Git integration means no preview deployments are created.  
**Future risk (GAP-10)**: Enabling Vercel Git integration immediately creates broken preview deploys per branch — auth fails, uploads fail. Before enabling Git integration, all missing vars must be added to the Preview environment in the Vercel dashboard.

---

## Build Process

```
vercel --prod triggers:
1. npm install → postinstall: prisma generate
2. npm run build:
   └── prisma generate (again — redundant but harmless)
   └── next build
       └── NODE_ENV=production → lib/prisma.ts reads DATABASE_URL from env (dashboard-injected)
       └── TypeScript errors: IGNORED (ignoreBuildErrors: true)
       └── ESLint: IGNORED (ignoreDuringBuilds: true)
3. .next/ output deployed to Vercel CDN + serverless functions
```

Build does NOT trigger DB calls — no RSC data fetching at build time, no `generateStaticParams` for API routes. Build is safe for production DB.

---

## Database Connection in Production

**What actually runs**:
```
Host:     aws-1-eu-west-1.pooler.supabase.com
Port:     6543  ← pgbouncer mode
User:     postgres.eacpjbbpwonwmthutxow
DB:       postgres
SSL:      implicit (Supabase requires it)
```

**Fix Applied**: Port changed to `6543`, added `?pgbouncer=true&connection_limit=1`, hardcode removed, now uses env var from dashboard.

---

## Deploy Runbook

```bash
# Standard deploy
git checkout main
vercel --prod

# Force rebuild (bust cache)
vercel --prod --force

# Rollback
vercel rollback
# or: Vercel dashboard → Deployments → promote previous

# Check current live state
vercel ls --prod
```

> ⚠️ `vercel rollback` does NOT revert `prisma db push` schema changes. Schema is one-way.

---

## Production vs Local Differences

| Dimension | Local dev | Production |
|-----------|----------|-----------|
| DB connection | `process.env.DATABASE_URL` from `.env` | `process.env.DATABASE_URL` |
| DB target | Supabase production (SAME DB) | Supabase production |
| `NODE_ENV` | `development` | `production` (set by Vercel) |
| Prisma singleton | Global (persists HMR) | Per cold-start (new connection each time) |
| Auth | Same hardcoded bypass | Same hardcoded bypass |
| HTTPS | No (HTTP) | Yes (Vercel TLS) |
| Middleware | Runs locally | Runs on Vercel Edge |
| `NEXTAUTH_URL` | ⚠️ `.env` sets `:3001` | Dashboard sets custom domain |
| Function timeout | None | 10s max |
| Log retention | Terminal | 1 day (Hobby plan) |

---

## Known Deployment Issues

| Issue | Severity | Status |
|-------|----------|--------|
| `vercel.json` env block overrides dashboard | 🔴 Critical | ✅ Resolved |
| `NEXTAUTH_URL` wrong domain in production | 🔴 Critical | ✅ Resolved |
| `NEXTAUTH_SECRET` weak + in git | 🔴 Critical | ✅ Resolved |
| DB port 5432 (session) in serverless | 🟠 High | ✅ Resolved |
| Node 24.x — codebase targets 20.x | 🟡 Medium | Active — pin to 20 in project settings |
| Production 57 days stale | 🟡 Medium | Run `vercel --prod` to resolve |
| No error monitoring | 🟠 High | Add Sentry |
| 1-day log retention | 🟡 Medium | Hobby plan limitation |
