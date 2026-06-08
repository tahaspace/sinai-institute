# Platform Topology

**Source**: Vercel API (live), audit files, source code, chat history  
**Last updated**: 2026-03-28

---

## 1. Hosting Topology

```
Internet
    │
    ├── test.sinaiinstitute.com (CNAME → Vercel DNS)
    ├── sinai-institute.vercel.app (Vercel auto-alias)
    └── sinaiinstitute.com (A2Hosting — separate server, not this project)

Vercel Edge Network (70+ PoPs)
    │   - Serves static assets (CDN-cached)
    │   - Runs middleware.ts (nextjs edge runtime)
    │   - Routes to serverless functions
    │
    ├── Static / CDN layer
    │     - public/logo.png, images/*, favicon*, manifest.json
    │     - .next/static/* (JS/CSS bundles)
    │
    └── Serverless functions (Node 24.x, 10s timeout)
          - app/api/* routes (one function per route file)
          - Invoked on each request; stateless; cold starts possible
          - Region: Washington, D.C. (East) — confirmed in build logs
          
Supabase (eu-west-1, Frankfurt)
    │   - PostgreSQL 15 (managed)
    │   - Project ref: eacpjbbpwonwmthutxow
    │   - Plan: Free tier (~60 direct connections)
    │
    └── Connected via:
          - lib/prisma.ts hardcoded URL (port 5432, session mode)
          - Code-level bypass of env var pattern
          
Cloudinary (CDN)
    │   - Account: dyz4dc6n7
    │   - Cloud: dyz4dc6n7
    │   - Sinai Institute folder: sinai-institute/
    │
    └── Used for all file uploads:
          /api/upload → sinai-institute/{type}/
          /api/upload-image → sinai-institute/news/

DNS
    ├── Registrar: Hostgator
    ├── Nameservers: A2Hosting (ns1–ns4.a2hosting.com)
    └── test.sinaiinstitute.com CNAME 70c132ac131a8ac5.vercel-dns-017.com
```

---

## 2. Database / Provider

### Confirmed: Supabase PostgreSQL

**Evidence** (multiple independent sources):
1. `lib/prisma.ts` hardcoded string contains `supabase.com` domain and project ref `eacpjbbpwonwmthutxow`
2. Vercel dashboard env var `NEXT_PUBLIC_SUPABASE_URL` set 47 days ago
3. Vercel dashboard env var `SUPABASE_SERVICE_ROLE_KEY` set 47 days ago
4. Chat logs (`cursor_vercel 01.md`) describe Supabase project creation and configuration
5. Deployment success notes explicitly name Supabase as the active database

**Project details**:
- Supabase project ref: `eacpjbbpwonwmthutxow`
- Region: `aws-1-eu-west-1` (Frankfurt, EU West)
- Organization: `tahaspace's Project`
- Plan: Free tier

**Connection mode** (active in production):
- Host: `aws-1-eu-west-1.pooler.supabase.com`
- Port: **5432** (session mode / direct connection) — per `lib/prisma.ts` hardcoded string
- Database: `postgres`

**What the dashboard URL likely contains** (unconfirmed — encrypted):
- `docs/bootstrap-input/vercel-production-notes.md` claims port 6543 (pgbouncer) was configured
- `lib/prisma.ts` shows port 5432 — code wins
- **Conclusion**: Production runs on 5432 unless the dashboard URL is used (which it isn't — `lib/prisma.ts` overrides it)

**Prisma client initialization**: Singleton in `lib/prisma.ts`. Dev uses env var; production uses hardcoded string. No connection pooling configured (`connection_limit` not set).

### Historical: Neon PostgreSQL (Dead)
- Was first database: `ep-shy-fire-ag4sxzsm.c-2.eu-central-1.aws.neon.tech`
- Free tier quota exhausted — migrated to Supabase
- Still present in `vercel.json` env block (dead credential)
- Migration script: `migrate-data.ts` (SQLite → PostgreSQL migration tool)

### Historical: SQLite local (`prisma/dev.db`)
- Used during initial development phase
- Migrated to Neon → then to Supabase
- `dev.db` still in repo (299KB) and tracked by git (but excluded from Vercel deploy by `.vercelignore`)

---

## 3. Storage and Media Surfaces

| Surface | Provider | Path/Location | Data type | Shared across devices? |
|---------|---------|--------------|-----------|----------------------|
| Primary DB | Supabase PostgreSQL | Project `eacpjbbpwonwmthutxow` | All structured data | ✅ Yes |
| Uploaded media | Cloudinary | `sinai-institute/{type}/` | PDFs, images | ✅ Yes (CDN) |
| Homepage config | Browser `localStorage` | Keys: `homepage_*` | Slides, news, stats, social links | ❌ No — per device |
| CMS UI state | Zustand → `localStorage` | Key: `edusaas-app-storage` | Sidebar, language pref | ❌ No |
| Static images | Vercel CDN (committed) | `public/images/news/`, etc. | WhatsApp-sourced press photos | ✅ Yes (deployed static) |
| Dev DB | Local filesystem | `prisma/dev.db` | Historical dev data | ❌ Local only |
| Vercel ephemeral FS | Vercel serverless | `/tmp/` or `public/` | Not used at runtime | ❌ Ephemeral |

---

## 4. Auth / Session Surfaces

| Surface | Technology | Location | Notes |
|---------|-----------|----------|-------|
| Session JWT | NextAuth v4 | HTTP-only cookie | `next-auth.session-token` |
| JWT signing key | `NEXTAUTH_SECRET` | In `vercel.json` only (weak) | Not in Vercel dashboard |
| Auth provider | Credentials (password) | `lib/auth.ts` | Hardcoded bypass — DB lookup disabled |
| Middleware | NextAuth edge middleware | `middleware.ts` | Protects `/cms/*` only |
| Admin credential | Email + password | `lib/auth.ts:30` | Single hardcoded user |
| User table | `User` in Supabase | Never queried at login | bcrypt password in DB; unused |
| Supabase Auth | Not used | N/A | Supabase anon/service keys present (set in dashboard) but `@supabase/supabase-js` not imported |

---

## 5. Environment Separation

| Environment | State | Database | Auth | Notes |
|-------------|-------|---------|------|-------|
| **Production** | ✅ Active | Supabase port 5432 (hardcoded) | Hardcoded bypass | Deployed 57 days ago via CLI |
| **Preview** | ⚠️ Broken | `DATABASE_URL` only in dashboard | No `NEXTAUTH_*` | Never used — no Git integration |
| **Development (local)** | ✅ Active | Supabase port 5432 via `.env` | Hardcoded bypass | Same DB as production |
| **Staging** | ❌ None | N/A | N/A | No staging environment exists |

**Key topology risk**: Local development and production share the **same Supabase database**. There is no database isolation between dev and prod. A `npm run dev` on a local machine performs read/write against the live production data.

---

## 6. Inactive Projects in Vercel Account

| Project | Status | Notes |
|---------|--------|-------|
| `edusaas-smart-innovation` | Inactive | Previous project name; 88 days old; still has active aliases pointing to it but no current deployment |
| `v0-arabic-crypto-exchange` | Inactive | 373 days old; unrelated project |
| `sinai-institute` | ✅ Active production | Current project |

---

## 7. GitHub Repository

| Field | Value |
|-------|-------|
| Owner | `tahaspace` |
| Repo name | `sinai-institute` |
| URL | `https://github.com/tahaspace/sinai-institute` |
| Visibility | Private (PAT required for access) |
| Default branch | `main` |
| Vercel integration | ❌ None (CLI deploy only) |
| Commits on `main` | 4 total (sparse history — bulk init commit + 3 fixes) |
| Local branch | `speckit-bootstrap` (ahead of main with untracked docs) |
| PAT in remote URL | ⚠️ `ghp_REDACTED_ROTATED` embedded in `git remote -v` |
