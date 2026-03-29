# Security Triage Phase 0 — Implementation Review

**Date**: 2026-03-29  
**Reviewer**: Antigravity (post-implementation audit)  
**Infrastructure model**: Corrected — Vercel (runtime) + Supabase (external database, eu-west-1)  
**Source of truth**: `CLAUDE.md` + `docs/platform-topology.md`

---

## Executive Summary

The code changes are substantially correct and close the most critical risks. However, **3 unauthenticated mutating endpoints remain unguarded** that were identified during speckit-analyze but were not included in the original scope. These constitute a **conditional blocker** — the deployment is safe to proceed only if the operator accepts these 3 endpoints as a known-remaining risk to be fixed immediately post-deploy in a follow-on commit.

---

## 1. Spec / Plan / Task Compliance

| Task Group | Expected | Implemented | Status |
|-----------|---------|------------|--------|
| Remove `vercel.json` env block | ✅ Required | ✅ Done | **PASS** |
| Rewrite `lib/prisma.ts` | ✅ Required | ✅ Done | **PASS** |
| Auth guard: `POST /api/upload-image` | ✅ Required | ✅ Done | **PASS** |
| Auth guard: `POST /api/upload-media` | ✅ Required | ✅ Done | **PASS** |
| Auth guard: `POST /api/pages` | ✅ Required | ✅ Done | **PASS** |
| Auth guard: `PATCH /api/pages` | ✅ Required | ✅ Done | **PASS** |
| Seed production guard | ✅ Required | ✅ Done | **PASS** |
| Delete `public/check-localstorage.html` | ✅ Required | ✅ Done | **PASS** |
| Documentation update | ✅ Required | ✅ Done | **PASS** |
| Guard: `POST /api/pages/migrate` | ⚠️ Discovered | ❌ Missing | **FAIL** |
| Guard: `POST /api/pages/seed` (HTTP) | ⚠️ Discovered | ❌ Missing | **FAIL** |
| Guard: `PUT /api/pages/[id]` | ⚠️ Discovered | ❌ Missing | **FAIL** |
| Guard: `DELETE /api/pages/[id]` | ⚠️ Discovered | ❌ Missing | **FAIL** |
| Guard: `POST /api/pages/[id]/blocks` | ⚠️ Discovered | ❌ Missing | **FAIL** |

> Note: The 5 unguarded routes above were flagged during speckit-analyze but excluded from the approved tasks.md scope. They are not a regression introduced by this branch — they were already unguarded on main. The review flags them because they must be resolved before or immediately after deploy.

---

## 2. Endpoint Auth Guard Review

### ✅ Correctly Guarded

**`app/api/upload-image/route.ts`**
```typescript
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```
- Guard is first statement in `POST` handler body ✅
- Imports `getServerSession` + `authOptions` ✅
- GET does not exist on this route — no unintended exposure ✅

**`app/api/upload-media/route.ts`**
- Same pattern as above ✅
- No DELETE or GET exposed ✅

**`app/api/pages/route.ts`**
- `GET` handler: correctly unguarded (public read is intentional) ✅
- `POST` handler: guarded as first statement ✅
- `PATCH` handler: guarded as first statement ✅
- Single import block — no duplicate imports ✅

### ❌ Unguarded — Production Risk

**`app/api/pages/migrate/route.ts` — `POST` (line 5)**
- Writes arbitrary pages including `customJS` to Supabase
- No session check — unauthenticated call accepted
- Risk: persistent XSS via `customJS` field (same risk as the now-fixed `POST /api/pages`)

**`app/api/pages/seed/route.ts` — `POST` (line 5)**
- Creates default pages in Supabase (upsert-style, skips existing slugs)
- No session check — any internet user can trigger this
- Risk: content injection; `customJS` fields in seeded pages would execute on public pages

**`app/api/pages/[id]/route.ts` — `PUT` (line 53) and `DELETE` (line 123)**
- `PUT`: Full page update with no auth — overwrites any field including `customJS`
- `DELETE`: Deletes pages with no auth — only guard is "no child pages" check
- Risk: data destruction + persistent XSS via PUT

**`app/api/pages/[id]/blocks/route.ts` — `POST` (line 5)**
- Replaces all blocks for a page with no auth — can inject block content
- Risk: content injection into public pages

### ⚠️ Auth Stub — Carries Session Risk

**`lib/auth.ts:30–38`**
```typescript
if (credentials.email === 'admin@sainaiinstitute.com' && credentials.password === 'admin123') {
  return { id: 'dev-admin-001', role: 'SUPER_ADMIN' }
}
```
- Hardcoded credentials are NOT changed by this phase (deferred KI-004)
- The `getServerSession()` guards added in phase 0 will reject unauthenticated requests ✅
- However, `admin123` is still the only working password — any admin session is high-value
- The session itself connects to the externally-hosted Supabase DB via Prisma
- **Implication**: The auth guards function correctly, but the credentials they protect are still weak

---

## 3. `vercel.json` env Block Removal — Runtime Impact

**Current state** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

**Assessment**: Safe. No unexpected runtime impact.

- The removed `env` block previously set `DATABASE_URL` to a dead Neon URL, `NEXTAUTH_URL` to the wrong domain, and `NEXTAUTH_SECRET` to a weak plaintext value
- Removing this block means Vercel will now source all vars from the dashboard
- **Prerequisite**: The operator MUST have placed correct values in the Vercel dashboard before deploying. Specifically: `DATABASE_URL` (Supabase, port 6543, pgbouncer), `NEXTAUTH_URL` (correct domain), `NEXTAUTH_SECRET` (rotated strong value), `CLOUDINARY_*` keys
- If any dashboard var is **missing**, the next deploy will expose undefined-env failures at runtime
- There is no fallback: `lib/prisma.ts` no longer has hardcoded values

**Risk if dashboard not updated before deploy**: Database connectivity failure — all API routes return 500.

---

## 4. Prisma Client — Externally-Hosted Database Safety

**Current `lib/prisma.ts`**:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

**Assessment**: Correct and safe for an externally-hosted database (Supabase eu-west-1).

- No hardcoded connection string ✅
- Reads `DATABASE_URL` from environment (Vercel dashboard → injected into serverless function) ✅
- Standard singleton pattern prevents connection explosion on HMR in development ✅
- In production (Vercel serverless), each cold start gets a fresh `PrismaClient` — correct for stateless serverless ✅
- `database_url` in `schema.prisma` must still be `env("DATABASE_URL")` — not changed by this branch (pre-existing correct) ✅

**Infrastructure note**: Every Vercel serverless invocation makes a **public internet TCP connection** to `aws-1-eu-west-1.pooler.supabase.com:6543`. This is by design — Vercel does not have a private network path to Supabase. The pgbouncer port (6543) ensures connection pooling is handled by Supabase's pooler rather than opening direct connections.

**One minor concern**: The singleton pattern `if (NODE_ENV !== 'production') globalForPrisma.prisma = prisma` means production does NOT cache the client in the global object. In Vercel's execution model this is correct — each function invocation is isolated. ✅

---

## 5. Seed Production Guard — Sufficiency

**Current guard** (`prisma/seed.ts`):
```typescript
if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
  console.error('❌ SEED BLOCKED...');
  process.exit(1);
}
```

**Assessment**: Sufficient for the `prisma/seed.ts` script. One gap for the HTTP endpoint.

- `NODE_ENV=production` check blocks Vercel production runtime ✅
- `VERCEL_ENV` check catches all Vercel environments (production, preview, development-on-Vercel) ✅
- Script exits with code 1 before any DB calls ✅
- Clear developer guidance in error message ✅

**Gap**: `app/api/pages/seed/route.ts` is a **separate, unguarded HTTP endpoint** that also seeds pages into the externally-hosted Supabase database. It has no auth guard and no environment check. The `prisma/seed.ts` script guard does not protect the HTTP seed endpoint.

---

## 6. Documentation Review

### Wording that incorrectly implies database is on Vercel

Searched all docs and `CLAUDE.md`. **No wording in `docs/` or `CLAUDE.md` implies the database is on Vercel.** The docs consistently and correctly separate:
- Vercel as the application/runtime host
- Supabase as the external database provider

One stale item found in `CLAUDE.md` line 29:
```
# ⚠️ NODE_ENV=production → lib/prisma.ts uses HARDCODED Supabase string
```
This comment in the Commands section refers to the **old behavior** that was fixed. It should be updated.

One stale item in `CLAUDE.md` line 87 (Prisma Safety Rules):
```
6. **Before `db push`**: Use session mode (port 5432 — already the case) for schema operations
```
Port 5432 is session mode — this is still correct for `prisma db push` (pgbouncer mode can cause issues with DDL statements). This note is accurate and should be retained.

The `docs/deployment-vercel.md` Build Process section still contains:
```
└── NODE_ENV=production → lib/prisma.ts hardcoded Supabase URL
```
This is stale and describes the old behavior. Should be corrected.

---

## 7. Infrastructure — Corrected Model Compliance

| Claim | Correct? | Evidence |
|-------|----------|----------|
| Vercel hosts runtime only | ✅ | `platform-topology.md` §1 |
| Database is externally hosted on Supabase (eu-west-1) | ✅ | `platform-topology.md` §2 |
| Prisma connects over public internet TCP | ✅ | TCP to `aws-1-eu-west-1.pooler.supabase.com` |
| `vercel rollback` does not revert Supabase schema changes | ✅ | Explicitly documented |
| No `@vercel/postgres` or Vercel-managed DB used | ✅ | `package.json` confirmed |
| `DATABASE_URL` from Vercel dashboard → injected into serverless env | ✅ | Standard Vercel env var injection |

---

## 8. Go / No-Go Recommendation

### ⚠️ CONDITIONAL GO

**The implemented changes are correct and safe to deploy IF:**

1. ✅ Operator has rotated Supabase DB password (T008)
2. ✅ Operator has set `DATABASE_URL` (port 6543 + pgbouncer) in Vercel dashboard
3. ✅ Operator has set `NEXTAUTH_URL = https://test.sinaiinstitute.com` in dashboard
4. ✅ Operator has set `NEXTAUTH_SECRET` (strong, rotated) in dashboard
5. ✅ Operator has rotated `CLOUDINARY_API_SECRET` and updated in dashboard

**If any of the 5 operator steps above are incomplete → NO-GO.** The code now fully depends on dashboard vars; without them the application breaks at runtime.

---

## 9. Code-Level Issues That Must Be Fixed Before or Immediately After Deploy

### MUST FIX — Before phase 0 is considered complete

| # | File | Issue | Severity |
|---|------|-------|----------|
| 1 | `app/api/pages/migrate/route.ts` | No auth guard on POST — writes `customJS` to Supabase | 🔴 Critical |
| 2 | `app/api/pages/seed/route.ts` (HTTP) | No auth guard on POST — seeds pages with `customJS` to Supabase | 🔴 Critical |
| 3 | `app/api/pages/[id]/route.ts` | No auth guard on PUT or DELETE — overwrites/destroys pages | 🔴 Critical |
| 4 | `app/api/pages/[id]/blocks/route.ts` | No auth guard on POST — replaces all blocks in a page | 🔴 Critical |

**Fix pattern** (same as all implemented guards):
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// At the top of each mutating handler:
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### SHOULD FIX — Documentation corrections

| # | File | Stale Content | Correction |
|---|------|--------------|-----------|
| 5 | `CLAUDE.md` line 29 | `lib/prisma.ts uses HARDCODED Supabase string` | Remove or update — hardcode was removed |
| 6 | `docs/deployment-vercel.md` Build Process | `NODE_ENV=production → lib/prisma.ts hardcoded Supabase URL` | Update — now reads from `DATABASE_URL` env var |

---

## 10. Summary of Findings

| Category | Finding | Verdict |
|----------|---------|---------|
| vercel.json removal | Clean, no env fallback issues | ✅ |
| lib/prisma.ts rewrite | Correct singleton, env-driven, external DB safe | ✅ |
| 4 original auth guards | Correctly implemented, minimal diff | ✅ |
| seed.ts production guard | Sufficient, blocks script execution | ✅ |
| debug tool deletion | Confirmed removed | ✅ |
| 5 additional unguarded routes | Not in scope but actively exploitable | ❌ |
| 1 stale comment in CLAUDE.md | Minor, non-breaking | ⚠️ |
| 1 stale line in deployment-vercel.md | Minor, non-breaking | ⚠️ |
| Operator pre-work (T005–T011) | Cannot be verified from codebase — operator responsibility | ⏳ |
