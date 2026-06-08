# Implementation Plan: Security Triage Phase 0

**Branch**: `001-security-triage-phase-0`
**Date**: 2026-03-29
**Spec**: [spec.md](./spec.md)
**Research**: [research.md](./research.md)

---

## Summary

Stabilize the live Sinai Institute production system by closing 4 critical security
gaps before any feature work begins. The changes are:
1. Remove the `vercel.json` `"env"` block that re-applies wrong/stale secrets on every deploy
2. Rotate 3 leaked production credentials (DB password, NextAuth secret, Cloudinary API secret)
3. Add `getServerSession()` authorization guard to 4 unauthenticated write endpoints
4. Add a production guard to `prisma/seed.ts` to prevent accidental production data deletion
5. Remove `lib/prisma.ts` hardcoded DB connection string; read from env var instead
6. Delete `public/check-localstorage.html` debug tool
7. Remove `prisma/dev.db` from git index if still tracked

**No schema changes. No new dependencies. No new routes. No refactors.**

---

## Technical Context

| Field | Value |
|-------|-------|
| Language/Version | TypeScript 5, Node 24.x (Vercel), Next.js 15.1.5 |
| Framework | Next.js App Router — `app/api/*/route.ts` pattern |
| Auth library | `next-auth` v4 — `getServerSession(authOptions)` |
| Database | Supabase PostgreSQL via Prisma ORM (no direct DB calls) |
| Deployment | Vercel CLI — `vercel --prod` |
| Build command | `npm run build` (= `prisma generate && next build`) |
| Performance goals | N/A — no new code paths affecting latency |
| Constraints | Zero schema changes · zero new deps · minimal changed lines |
| Scale/Scope | 4 files modified + 1 file deleted + 1 git index operation |

---

## Constitution Check

*Reference: `.specify/memory/constitution.md`*

| Gate | Principle | Status |
|------|-----------|--------|
| All Critical KIs are resolved OR this plan IS the resolution | I. Production Safety First | ✅ This plan resolves KI-001–005, KI-017 |
| No secret, credential, or connection string in any file this plan touches | II. Secret Handling | ✅ All secrets moved to dashboard; hardcode removed |
| Every new/modified write endpoint includes `getServerSession()` → 401 | III. Auth on Mutating Endpoints | ✅ 4 endpoints guarded |
| Schema changes: backup + `prisma db pull` + `db push` before deploy | IV. Data and Schema Safety | ✅ N/A — zero schema changes |
| `prisma:seed` MUST NOT target production; no `prisma migrate reset` | IV. Data and Schema Safety | ✅ Guard added to seed.ts |
| Relevant `docs/` files updated in same changeset | V. Architectural Integrity | ✅ known-issues.md + deployment-vercel.md updated in tasks |
| `npx tsc --noEmit` passes before `vercel --prod` | VI. Code Quality | ✅ Required in pre-deploy gate |
| New content goes to DB; uploads go to Cloudinary | VII. Content Persistence | ✅ N/A — no new content paths |
| OQ-009 answered before portal work; new deps confirmed | VIII. Scope Discipline | ✅ N/A — no portal work, no new deps |

**All 9 gates pass. No violations. No Complexity Tracking entry required.**

---

## Project Structure

### Documentation (this feature)

```
specs/001-security-triage-phase-0/
├── spec.md                          ← Feature specification
├── plan.md                          ← This file
├── research.md                      ← Phase 0 research (all unknowns resolved)
├── data-model.md                    ← Entity impact assessment
├── contracts/
│   ├── api-auth-guard.md            ← 401 response contract + env var contract
│   └── post-deploy-checklist.md     ← 8-item post-deploy verification
└── tasks.md                         ← Created by /speckit-tasks
```

### Source Code Changes (all in repository root)

```
vercel.json                          MODIFY — delete "env" block
lib/prisma.ts                        MODIFY — remove hardcode, read DATABASE_URL from env
prisma/seed.ts                       MODIFY — add production env guard
app/api/pages/route.ts               MODIFY — add getServerSession() to POST and PATCH handlers
app/api/upload-image/route.ts        MODIFY — add getServerSession() to POST handler
app/api/upload-media/route.ts        MODIFY — add getServerSession() to POST handler
public/check-localstorage.html       DELETE
prisma/dev.db                        GIT RM --CACHED (if tracked; confirm first)
docs/known-issues.md                 MODIFY — mark KI-001–005, KI-017 resolved post-deploy
docs/deployment-vercel.md            MODIFY — update env var section, remove "wrong domain" notes
CLAUDE.md                            MODIFY — update critical code realities after fixes applied
```

---

## Phase 0: Out-of-Band Operator Actions (Pre-Code)

**Must be completed BEFORE writing any code changes.**
These are dashboard operations performed by the institute's operator.
They cannot be scripted; they require human access to external service dashboards.

### Step 0.1 — Supabase Manual Backup

```
Supabase dashboard → Project eacpjbbpwonwmthutxow
→ Database → Backups → Create new backup / Download latest
```

Confirm download completes before proceeding. This is the only rollback point for data.

### Step 0.2 — Generate New NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Copy the output. Store in a password manager. Do NOT paste into any file.

### Step 0.3 — Set Vercel Dashboard Env Vars (Production)

In Vercel dashboard → Project `sinai-institute` → Settings → Environment Variables:

| Variable | Value to set | Notes |
|----------|-------------|-------|
| `NEXTAUTH_URL` | `https://test.sinaiinstitute.com` | Create new — currently absent from dashboard |
| `NEXTAUTH_SECRET` | `<output from step 0.2>` | Create new — currently absent from dashboard |
| `DATABASE_URL` | `postgresql://postgres.eacpjbbpwonwmthutxow:<NEW_PASS>@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` | Update existing — use NEW password (before Supabase rotation) |

⚠️ Set `DATABASE_URL` with the NEW password BEFORE rotating in Supabase (step 0.4).
This ensures the dashboard has the new value ready as soon as the rotation happens.

### Step 0.4 — Rotate Supabase DB Password

```
Supabase dashboard → Project settings → Database → Reset database password
```

Copy the new password. Confirm it matches what was set in `DATABASE_URL` in step 0.3.

### Step 0.5 — Rotate Cloudinary API Secret

```
Cloudinary dashboard → Settings → API Keys → Regenerate
```

Update in Vercel dashboard → `CLOUDINARY_API_SECRET` with new value.

### Step 0.6 — Verify Dashboard Values

Confirm in Vercel dashboard:
- `NEXTAUTH_URL` = `https://test.sinaiinstitute.com`
- `NEXTAUTH_SECRET` = (new strong value — not the git-exposed one)
- `DATABASE_URL` = supabase.com URL with `:6543`, new password
- `CLOUDINARY_API_SECRET` = new rotated value

---

## Phase 1: Code Changes

**All changes in a single commit on `001-security-triage-phase-0` branch.**
Commit message: `[SECURITY] phase-0: remove vercel.json env override, add auth guards, fix prisma init`

### Change 1 — `vercel.json` — Remove env block

**Before:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "DATABASE_URL": "...",
    "NEXTAUTH_URL": "...",
    "NEXTAUTH_SECRET": "...",
    "NODE_ENV": "production"
  }
}
```

**After:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

**Lines changed**: ~10 deleted. Zero new lines.

---

### Change 2 — `lib/prisma.ts` — Remove hardcoded connection string

**Before**: `getDatabaseUrl()` function returns hardcoded Supabase URL in production;
ignores `DATABASE_URL` env var entirely when `NODE_ENV=production`.

**After**: Standard Prisma singleton pattern. Reads `DATABASE_URL` from env by default.

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

**Lines changed**: ~30 deleted, ~10 added. No imports added. No new files.

**Dependency**: Step 0.3 must be complete (new `DATABASE_URL` in dashboard) before this
code is deployed. Order: set dashboard first → deploy code second.

---

### Change 3 — `prisma/seed.ts` — Add production guard

**Add as first statement in `main()` function:**

```typescript
async function main() {
  // PRODUCTION GUARD — prevents seed from running against live data
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
    console.error('');
    console.error('❌ SEED BLOCKED: Running against production is forbidden.');
    console.error('   This command deletes and recreates departments and news.');
    console.error('');
    console.error('   To seed a development database:');
    console.error('   DATABASE_URL="<dev-db-url>" NODE_ENV=development npx tsx prisma/seed.ts');
    console.error('');
    process.exit(1);
  }

  // ... existing seed logic unchanged below
```

**Lines changed**: ~12 lines added at top of `main()`. Zero existing lines removed.

---

### Change 4 — Auth guard: `app/api/pages/route.ts`

**Add to imports** (top of file):
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
```

**Add to `POST` handler** (first lines after `try {`):
```typescript
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Add to `PATCH` handler** (same pattern):
```typescript
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**`GET` handler**: No change — public read must remain open.

**Lines changed**: ~2 imports + ~6 lines in POST + ~6 lines in PATCH = ~14 lines added.

---

### Change 5 — Auth guard: `app/api/upload-image/route.ts`

**Add to imports** (top of file, after existing imports):
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
```

**Add to `POST` handler** (first lines after `try {`):
```typescript
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Lines changed**: ~2 imports + ~4 lines = ~6 lines added.

---

### Change 6 — Auth guard: `app/api/upload-media/route.ts`

Same pattern as Change 5. Identical imports + identical session check at top of `POST` handler.

**Lines changed**: ~2 imports + ~4 lines = ~6 lines added.

---

### Change 7 — Delete `public/check-localstorage.html`

```bash
git rm public/check-localstorage.html
```

---

### Change 8 — `prisma/dev.db` git index (conditional)

```bash
git ls-files prisma/dev.db  # Check if tracked
# If output is non-empty:
git rm --cached prisma/dev.db
```

Do NOT delete the local file — only remove from git tracking. The `.gitignore` already
prevents re-tracking.

---

## Phase 2: Pre-Deploy Gate

**Run before `vercel --prod`. All must pass.**

```bash
# 1. Type check (must produce zero NEW errors)
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Verify vercel.json has no "env" key
cat vercel.json | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'env' not in d, 'env block still present!'; print('✅ vercel.json clean')"

# 4. Verify lib/prisma.ts has no hardcoded URL
grep -n "SinaiInstitute2026\|supabase.com:5432\|hardcoded" lib/prisma.ts && echo "❌ HARDCODE FOUND" || echo "✅ No hardcode"

# 5. Verify each guarded endpoint has getServerSession
grep -l "getServerSession" \
  app/api/pages/route.ts \
  app/api/upload-image/route.ts \
  app/api/upload-media/route.ts && echo "✅ Guards present" || echo "❌ Missing guard"

# 6. Verify public debug tool is gone
ls public/check-localstorage.html 2>/dev/null && echo "❌ DEBUG FILE STILL PRESENT" || echo "✅ Debug file gone"

# 7. Confirm dashboard env vars are set (visual check in Vercel dashboard)
#    NEXTAUTH_URL, NEXTAUTH_SECRET, DATABASE_URL, CLOUDINARY_API_SECRET
```

**If any check fails → do not deploy. Fix the check first.**

---

## Phase 3: Deploy

```bash
vercel --prod
```

Expected output: `✅  Production: https://sinai-institute-<hash>.vercel.app`
Aliased to: `https://test.sinaiinstitute.com`

---

## Phase 4: Post-Deploy Verification

Follow `contracts/post-deploy-checklist.md` exactly.
All 8 items must pass within 10 minutes of deploy completion.

**Rollback command if any item fails:**
```bash
vercel rollback
```

---

## Phase 5: Documentation Update (post-successful verification)

Only after all 8 checklist items pass:

- `docs/known-issues.md` — Mark resolved:
  - KI-001: Secrets in git history — Rotated, hardcode removed
  - KI-002: vercel.json env block — Removed
  - KI-003: Unauthenticated write endpoints — Guarded (4 endpoints)
  - KI-004: Auth stub — UNCHANGED (deferred to Phase 1)
  - KI-005: NEXTAUTH_URL wrong domain — Fixed (dashboard + env block removed)
  - KI-017: Debug HTML tool — Deleted

- `docs/deployment-vercel.md` — Update:
  - Remove "wrong domain" and "missing from dashboard" notes for NEXTAUTH_URL/SECRET
  - Update DATABASE_URL entry to reflect port 6543 + pgbouncer
  - Remove `vercel.json` env block warning (now resolved)

- `CLAUDE.md` — Update critical code realities:
  - Remove: "lib/prisma.ts hardcoded URL" (now removed)
  - Remove: "vercel.json env block overrides dashboard" (now resolved)
  - Add: "All secrets now in Vercel dashboard only"
  - Add: "4 write endpoints now require session (see api-auth-guard.md contract)"

---

## Complexity Tracking

*No constitution violations — table not needed.*

---

## Risk Register for This Plan

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| DB connection fails after removing hardcode if dashboard URL is wrong | Medium | Step 0.3 sets and verifies dashboard URL before Step 0.4 rotates password |
| Rollback needed but Supabase password already rotated | Low | Post-rollback: manually update dashboard DATABASE_URL to use new password |
| `getServerSession()` import path wrong — build fails | Low | Copy exact pattern from `app/api/upload/route.ts` (already working) |
| TypeScript errors from `lib/prisma.ts` simplification | Low | Run `npx tsc --noEmit` as pre-deploy gate before deploying |
| CMS admin locked out if NEXTAUTH_SECRET rotated mid-session | Very low | Sessions are short-lived JWTs; existing sessions expire normally |
| `upload-image` guard breaks GrapesJS image attachment in editor | Low | GrapesJS editor runs inside authenticated CMS session — guard passes for admin |
