# Database Provider Verdict

**Purpose**: Definitive identification of the production database provider and connection topology.  
**Evidence sources consulted** (in order of trust):  
1. `prisma/schema.prisma` — schema config  
2. `lib/prisma.ts` — runtime connection code  
3. `vercel.json` — Vercel env block  
4. `docs/bootstrap-input/audit-raw/vercel/env-production-names.txt` — live Vercel env var names  
5. `docs/bootstrap-input/audit-raw/vercel/logs-last-24h.txt` — empty (no log data)  
6. `docs/bootstrap-input/audit-raw/vercel/deployments-ready.txt` — deployment history  
7. `sync-to-supabase.js`, `neon-data-export.js` — migration scripts  
8. `docs/deployment-audit.md`, `docs/live-production-audit.md`, `docs/platform-topology.md`  
9. `docs/bootstrap-input/chats-raw/*` — historical clues  

**Last updated**: 2026-03-28

---

## Verdict

### ✅ Confirmed: Supabase PostgreSQL

The production database is **Supabase PostgreSQL**, hosted in the AWS `eu-west-1` (Frankfurt) region, operated at the project reference `eacpjbbpwonwmthutxow`.

This is **not a close call**. Six independent sources corroborate the same provider and project.

---

## Evidence — Confirmed Facts

The following are directly observed in source code and config files, not inferred:

### 1. `lib/prisma.ts` — Production Runtime Connection (Highest Trust)

The file contains the literal, hardcoded production connection string that every API route uses in production:

```
Host:     aws-1-eu-west-1.pooler.supabase.com
Port:     5432
DB user:  postgres.eacpjbbpwonwmthutxow
Database: postgres
```

- Provider: **Supabase** (host domain `*.supabase.com`, Supabase-pattern user `postgres.<project-ref>`)
- Project reference: `eacpjbbpwonwmthutxow` — unique Supabase project identifier
- Region: `eu-west-1` (EU West — Frankfurt, AWS infrastructure under Supabase management)
- Mode: **Session / direct mode** — port 5432, NOT pgbouncer (port 6543)
- Comment in file: `// In production (Vercel), always use Supabase hardcoded`

### 2. `sync-to-supabase.js` — Migration Script

Root-level utility script connects directly to:
```
Host:     aws-1-eu-west-1.pooler.supabase.com
Port:     5432
DB user:  postgres.eacpjbbpwonwmthutxow
```
Identical to `lib/prisma.ts` — same project, same host, same port.

### 3. Vercel Production Environment — `env-production-names.txt` (Live Vercel CLI snapshot)

Four Supabase-specific environment variables are active in the Vercel production environment:

```
DATABASE_URL                Encrypted    Production    47d ago
SUPABASE_SERVICE_ROLE_KEY   Encrypted    Production    47d ago
NEXT_PUBLIC_SUPABASE_ANON_KEY Encrypted  Production    47d ago
NEXT_PUBLIC_SUPABASE_URL     Encrypted  Production    47d ago
```

The presence of `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SUPABASE_URL` makes the provider unambiguous — these are Supabase-specific variable names with Supabase-specific JWT structures.

All four were set **47 days ago** (approximately 2026-02-09), consistent with the Vercel project's last `updatedAt` timestamp (2026-02-09 22:22 UTC per Vercel API).

### 4. `.env` File

Contains three Supabase-specific variable keys (values redacted):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

These keys follow the exact naming convention from Supabase's own onboarding documentation and SDK.

### 5. `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Provider is `postgresql` — consistent with Supabase's PostgreSQL backend. Not MySQL, SQLite, or MongoDB.

### 6. Historical Chat (`cursor_vercel 01.md`)

Chat session explicitly describes:
- Creating a Supabase project
- Navigating to Supabase dashboard to retrieve connection strings
- Referring to project `eacpjbbpwonwmthutxow` by name during troubleshooting

---

## Evidence — Ruled Out Providers

### Neon PostgreSQL — Historically Present, Currently Dead

`vercel.json` contains a `DATABASE_URL` pointing to `ep-shy-fire-ag4sxzsm.c-2.eu-central-1.aws.neon.tech`. This was the **first database** used — before migration to Supabase.

- `neon-data-export.js` at repo root was the export tool used to migrate off Neon
- The Neon connection string is in `vercel.json` but is bypassed by `lib/prisma.ts` in production
- `vercel.json` env block is also overridden by the dashboard env vars (which point to Supabase)
- Chat logs describe Neon's free tier quota being exhausted as the migration trigger

**Status**: Neon was the first DB. It is dead. It has no role in current production.

### SQLite (`prisma/dev.db`) — Development Only

- File exists at `prisma/dev.db` (299KB, committed to git)
- Was used during initial local development
- Migrated to Neon, then to Supabase
- Migration scripts (`migrate-simple.ts`, `migrate-data.ts`) used SQLite as a source
- Not relevant to production at all

### MySQL / A2Hosting — Template Artifact

- `README.md` mentions MySQL 8.0+ and A2Hosting — this was from a scaffold template, not the actual stack
- No MySQL-pattern connections exist anywhere in the codebase
- `schema.prisma` uses `provider = "postgresql"` confirming PostgreSQL, not MySQL

---

## Connection Topology

### Type: Externally Hosted (Not Vercel-Managed, Not Vercel-Integrated)

| Property | Value |
|----------|-------|
| Hosting provider | Supabase (external managed PostgreSQL, not Vercel infrastructure) |
| Vercel integration | **None** — no Supabase Vercel integration installed |
| Infrastructure | AWS `eu-west-1` (Frankfurt), managed by Supabase |
| Vercel ↔ Supabase link | Manual — connection string configured manually in `lib/prisma.ts` (hardcoded) and in Vercel dashboard (env var) |
| Connection mode | **Session / direct (port 5432)** — not transaction pooler (port 6543) |
| pgbouncer | ❌ Not configured — no `?pgbouncer=true` in hardcoded string |
| `connection_limit` | ❌ Not set |
| SSL | Implicit (Supabase requires SSL by default; no explicit `?sslmode=require` in hardcoded string) |
| Supabase SDK | ❌ Not used — `@supabase/supabase-js` is NOT in `package.json`. Database accessed exclusively via Prisma ORM. |
| Supabase Auth | ❌ Not used — `SUPABASE_SERVICE_ROLE_KEY` and anon key are set in dashboard but never read in application code. |

**Summary**: Supabase is used purely as a **managed PostgreSQL host** behind Prisma. None of Supabase's native features (Auth, Storage, Realtime, Edge Functions, RLS) are used.

---

## What Is Still Unknown

| Unknown | Why it matters |
|---------|---------------|
| **The actual `DATABASE_URL` value in the Vercel dashboard** (encrypted) | The dashboard value may point to port 6543 (pgbouncer) even though `lib/prisma.ts` uses port 5432 (bypassing the dashboard). The dashboard value does not affect runtime behavior while `lib/prisma.ts` hardcodes the URL. |
| **Current schema state in production Supabase** | No `prisma db pull` has been run since the last `prisma db push`. Unknown whether migrations for GrapesJS tables (`PageBlock`, `PageVersion`, `WidgetTemplate`, `Setting`) and any late-added fields were successfully pushed to production. |
| **Current Supabase connection count and headroom** | Free tier has ~60 direct connection limit. Session mode from serverless creates new connections per cold start. Unknown whether the limit has been hit in practice. |
| **Whether Supabase project is active or paused** | Supabase free tier pauses projects after 1 week of inactivity. The project last received traffic activity is unknown (logs file empty). |
| **Supabase plan (Free vs. Pro)** | Determines PITR availability, connection limits, log retention in Supabase dashboard. |

---

## Safest Manual Verification Steps

In order of quickest-to-execute:

### Step 1 — Supabase Dashboard (1 minute, zero risk)
Go to: `https://supabase.com/dashboard/project/eacpjbbpwonwmthutxow`

Verify:
- Project status: Active (green) / Paused (gray)
- Database health indicator
- Connection count: Database → Reports → Connection Pooling

This confirms the project is the active database and not paused.

### Step 2 — Verify Table Existence (5 minutes, read-only)
```bash
npx prisma studio
```
This opens a GUI against the database. Confirm all 14 models from `schema.prisma` have corresponding tables:
`User`, `Department`, `Specialization`, `Result`, `StudentResult`, `Schedule`, `Lecture`, `News`, `Application`, `Complaint`, `ContactMessage`, `Page`, `PageBlock`, `PageVersion`, `WidgetTemplate`, `Setting`

If `PageBlock`, `PageVersion`, `Setting`, or `WidgetTemplate` are missing, a `prisma db push` has not been run since they were added to the schema.

### Step 3 — Verify Dashboard DATABASE_URL Port (2 minutes)
Vercel Dashboard → `sinai-institute` project → Settings → Environment Variables → `DATABASE_URL` → Reveal

Confirm whether the dashboard value uses:
- Port `5432` (session/direct) — `lib/prisma.ts` override hardcodes this; dashboard value is irrelevant at runtime
- Port `6543` (transaction/pgbouncer) — would be the correct value if `lib/prisma.ts` were fixed to use env var

This step is safe (read-only) and resolves GAP-04 from `docs/live-vs-code-gap.md`.

### Step 4 — Confirm Supabase Plan (2 minutes)
Supabase Dashboard → `eacpjbbpwonwmthutxow` → Settings → Billing

Confirm:
- Plan: Free vs. Pro
- If Free: note that PITR is unavailable; daily backups may be the only recovery option

---

## Final Confidence Summary

| Claim | Confidence | Evidence count |
|-------|-----------|---------------|
| Provider is Supabase | 🟢 **Confirmed** | 6 independent sources |
| Project ref `eacpjbbpwonwmthutxow` | 🟢 **Confirmed** | 3 code files + Vercel env keys |
| Region: `eu-west-1` (Frankfurt) | 🟢 **Confirmed** | `lib/prisma.ts` host string |
| Active in production | 🟢 **Confirmed** | `lib/prisma.ts` hardcodes and Vercel dashboard has the vars |
| Port 5432 (direct, not pgbouncer) | 🟢 **Confirmed** | `lib/prisma.ts:7` literal |
| Supabase SDK not used in app | 🟢 **Confirmed** | `package.json` has no `@supabase/supabase-js` |
| Supabase Auth not used | 🟢 **Confirmed** | No Supabase auth calls in any app file |
| Supabase project currently active (not paused) | 🟡 **Likely** | Env vars set 47d ago; no traffic evidence |
| All 14 schema tables exist in production | 🟡 **Likely** | No `prisma db pull` run to confirm |
| Dashboard `DATABASE_URL` port (6543 vs 5432) | 🔴 **Unknown** | Encrypted — not readable from code or audit files |
| Supabase plan (Free vs. Pro) | 🔴 **Unknown** | Not in any observable artifact |
