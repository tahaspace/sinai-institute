# Research: Security Triage Phase 0

**Branch**: `001-security-triage-phase-0`
**Date**: 2026-03-29
**Purpose**: Resolve all technical unknowns before implementation. All findings are
code-verified from direct inspection of the live repository.

---

## 1. Exact Open Mutating Endpoints

**Decision**: Four endpoints require authorization guards in this phase.

| Endpoint | Method(s) | Auth state (code-verified) | Writes to |
|----------|-----------|----------------------------|-----------|
| `POST /api/pages` | POST | ❌ **None** | Supabase: `Page` table |
| `PATCH /api/pages` | PATCH | ❌ **None** | Supabase: `Page` table |
| `POST /api/upload-image` | POST | ❌ **None** | Cloudinary `sinai-institute/news` |
| `POST /api/upload-media` | POST | ❌ **None** | Cloudinary (images + video) |

**Confirmed guarded (do NOT touch):**

| Endpoint | Auth guard |
|----------|-----------|
| `POST /api/upload` | ✅ `getServerSession()` at line 8 → returns 401 |
| `POST/PUT/DELETE /api/news` | ✅ session-guarded |
| `POST/PUT/DELETE /api/departments` | ✅ session-guarded |
| `POST/PUT/DELETE /api/schedules` | ✅ session-guarded |
| `GET *` (all public reads) | ✅ intentionally open |

**Rationale for including `/api/upload-media`**: The spec originally listed three endpoints.
Code inspection found a fourth (`upload-media`) with an identical vulnerability and
identical fix. Adding it costs one additional `getServerSession()` call. Leaving it
open after this phase creates an inconsistent security posture and guarantees a second
deployment round-trip.

**Pattern to apply** (from `/api/upload/route.ts` — already correct):
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... existing handler body unchanged
}
```

---

## 2. `vercel.json` Override State

**Decision**: Confirmed active. The `"env"` block is present and overrides ALL dashboard
env vars on every deploy.

**Current `vercel.json` env block (source-verified, 2026-03-29):**
```json
"env": {
  "DATABASE_URL": "postgresql://neondb_owner:npg_bVG...@ep-shy-fire-ag4sxzsm...neon.tech/neondb",
  "NEXTAUTH_URL": "https://sinai-institute.vercel.app",
  "NEXTAUTH_SECRET": "sinai-institute-secret-key-2026-very-secure-random-string-12345",
  "NODE_ENV": "production"
}
```

**Effect on production:**
- `DATABASE_URL` → dead Neon URL (bypassed by `lib/prisma.ts` hardcode — app still connects
  via hardcode, but dashboard `DATABASE_URL` is also overridden and useless)
- `NEXTAUTH_URL` → `sinai-institute.vercel.app` (wrong — custom domain is
  `test.sinaiinstitute.com`; login may redirect to wrong domain)
- `NEXTAUTH_SECRET` → weak 62-char deterministic string (exposed in git; sessions forgeable)
- `NODE_ENV` → redundant (Vercel sets this automatically; causes double-override)

**Fix**: Delete the entire `"env"` block from `vercel.json`. Keep only build configuration.

**`vercel.json` after fix (complete file):**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

---

## 3. `lib/prisma.ts` Hardcode — Dependency on Credential Rotation

**Decision**: The hardcode must be replaced in the same commit as credential rotation.

**Current behavior (source-verified):**
```typescript
if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
  const supabaseUrl = 'postgresql://postgres.eacpjbbpwonwmthutxow:SinaiInstitute2026!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
  return supabaseUrl;  // Ignores DATABASE_URL entirely
}
```

**Why this is coupled to rotation:**
1. Rotate DB password in Supabase dashboard → old password in `lib/prisma.ts` stops working
2. If code with new `process.env.DATABASE_URL` pattern is deployed before the dashboard
   `DATABASE_URL` is set to the new password → production DB connection fails

**Safe sequence (non-negotiable):**
1. Set new `DATABASE_URL` (new password, port `6543`, pgbouncer params) in Vercel
   dashboard FIRST
2. Rotate DB password in Supabase dashboard
3. Test dashboard URL manually (one curl or connection test)
4. Update `lib/prisma.ts` to read `process.env.DATABASE_URL`
5. Deploy `vercel --prod`

**Replacement pattern for `lib/prisma.ts`:**
```typescript
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export default prisma;
```
No `datasources` block needed — Prisma reads `DATABASE_URL` from env by default.

---

## 4. Credential Rotation Scope and Dependencies

**Decision**: Three credentials require rotation. One (Cloudinary) is independent.
Two (Supabase, NextAuth) are tightly coupled to code changes.

| Credential | Current exposure | Rotation location | Code dependency |
|-----------|----------------|-------------------|----------------|
| Supabase DB password (`SinaiInstitute2026!`) | `lib/prisma.ts` hardcode | Supabase dashboard → Settings → Database | Yes — `lib/prisma.ts` must change |
| `NEXTAUTH_SECRET` (`sinai-institute-secret-key-2026...`) | `vercel.json` | Vercel dashboard → `NEXTAUTH_SECRET` | Yes — `vercel.json` env block removal |
| Cloudinary API secret | `.env` file | Cloudinary dashboard → API Keys | No — code reads `CLOUDINARY_API_SECRET` env var already |
| `NEXTAUTH_URL` | `vercel.json` | Vercel dashboard → `NEXTAUTH_URL` | Yes — `vercel.json` env block removal |

**Rotations that are out-of-band (operator, not developer):**
- Supabase password rotation
- Cloudinary API secret rotation
- Git PAT rotation (git remote URL)

These are dashboard actions. The implementation tasks document what code must change
to consume the new values.

---

## 5. `prisma/seed.ts` — Schema/Migration Requirement

**Decision**: Zero schema changes needed. The fix is a pure environment guard.

**Current `seed.ts` destructive sequence (source-verified):**
```typescript
await prisma.department.deleteMany({});  // Lines ~28-30
// then createMany() departments
// (news.deleteMany() also present further down)
```

**No `NODE_ENV` guard exists today.** The seed runs without restriction against
whatever `DATABASE_URL` is configured.

**Fix**: Add an environment guard as the first statement in `main()`:
```typescript
async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
    console.error('❌ SEED BLOCKED: Cannot run seed against production environment.');
    console.error('   To seed a dev database: NODE_ENV=development npx tsx prisma/seed.ts');
    process.exit(1);
  }
  // ... rest of seed unchanged
}
```

**No Prisma schema addition required**. No `prisma db push` needed. Pure TypeScript change.

---

## 6. `prisma/dev.db` Git Tracking

**Decision**: File is in `.gitignore` already (`prisma/dev.db` entry confirmed). Must
verify whether it is also in the index (tracked). If tracked, remove from index.

**`.gitignore` entries confirmed present:**
```
.env*
prisma/dev.db
prisma/dev.db-journal
*.db
```

**Check if currently tracked:**
```bash
git ls-files prisma/dev.db
```
- If output is non-empty → `git rm --cached prisma/dev.db`
- If empty → already untracked; no action needed

**PII risk**: File is 299KB. Migration scripts reference applications with `nationalId`,
`phone`, `email`. Operator must inspect before removing from index. If PII confirmed
and pushed to remote: `git filter-repo` required (out of scope for this phase — document
as follow-up in `docs/known-issues.md`).

---

## 7. Safe Production Deployment Order

**Decision**: A strict ordering is required to prevent a DB connectivity gap during deploy.

```
STEP 0 — PRE-WORK (operator actions, no code changes deployed yet)
  0.1  Take Supabase manual backup
       Supabase dashboard → Database → Backups → Download
  0.2  Generate new NEXTAUTH_SECRET
       Command: openssl rand -base64 32
       Store result — do not commit anywhere
  0.3  Set in Vercel dashboard (before deploy):
       - NEXTAUTH_URL   = https://test.sinaiinstitute.com
       - NEXTAUTH_SECRET = <new random value from 0.2>
       - DATABASE_URL  = postgresql://postgres.eacpjbbpwonwmthutxow:<NEW_PASS>@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
         ↑ Use NEW password here — before rotating in Supabase
  0.4  Rotate Supabase DB password
       Supabase dashboard → Settings → Database → Reset password
       ⚠️ This invalidates the old password immediately. Application must deploy within
          minutes. Do step 0.3 first so the dashboard URL already has the new password.
  0.5  Rotate Cloudinary API secret
       Cloudinary dashboard → API Keys → Regenerate
       Update Vercel dashboard → CLOUDINARY_API_SECRET

STEP 1 — CODE CHANGES (one branch, one PR, one deploy)
  Apply all code changes (Tasks T001-T009) in same branch
  Run: npx tsc --noEmit  (must pass or pre-existing errors documented)
  Run: npm run lint

STEP 2 — DEPLOY
  vercel --prod

STEP 3 — POST-DEPLOY VERIFICATION (checklist — must complete within 10 min)
  See contracts/post-deploy-checklist.md

ROLLBACK TRIGGER:
  If any checklist item fails → vercel rollback immediately
  Do NOT forward-fix after a failed deploy — rollback first, debug offline
```

---

## 8. Rollback Strategy

**Decision**: Platform rollback (promote previous deployment) is sufficient. No DB
rollback needed because no schema changes are in this phase.

**Rollback command:**
```bash
vercel rollback
# or: Vercel dashboard → sinai-institute → Deployments → previous deployment → "Promote to Production"
```

**Rollback triggers** (any one is sufficient):
- Admin login on `test.sinaiinstitute.com` fails after deploy
- Public homepage returns 500 or timeout after deploy
- `/api/departments` returns error (indicates DB connectivity loss)
- A previously-authorized CMS operation returns 401 for a logged-in admin

**Rollback does NOT revert:**
- Supabase password rotation (already done in Step 0.4 — irreversible)
- Vercel dashboard env var changes

**Post-rollback recovery if DB password was already rotated:**
- Previous deployment's `lib/prisma.ts` hardcode still has old password → DB connection
  fails even after rollback
- Resolution: update Vercel dashboard `DATABASE_URL` to use temp connection string with
  new password, or update `lib/prisma.ts` hardcode to new password and redeploy

**Risk mitigation**: Steps 0.3–0.5 (set new dashboard URL before rotating Supabase) mean
the Vercel dashboard already has the correct new password before the old one is invalidated,
so even a rollback to the hardcoded-URL version can be patched by updating the env var.

---

## 9. Live/Production vs. Repo Drift Assessment

**Confirmed drift items that affect this triage:**

| Drift | Impact on Phase 0 | Resolution |
|-------|------------------|-----------|
| Production is 57 days stale (deployed ~2026-01-30) | Phase 0 deploy will also bring in 2 pending commits (`a045e58` CMS force-dynamic, `ff29e76` Dialog fix) | No action — these are bug fixes, safe to deploy |
| `vercel.json` env block active in production | All secrets wrong/stale in live env | Resolved by removing env block |
| `NEXTAUTH_URL` = wrong domain in production | Login redirect unreliable on custom domain | Resolved by Step 0.3 |
| `DATABASE_URL` in dashboard = dead Neon URL | Bypassed by `lib/prisma.ts` hardcode; irrelevant until hardcode removed | Resolved by Step 0.3 + code change |
| No `NEXTAUTH_URL` or `NEXTAUTH_SECRET` in Vercel dashboard | Both come from `vercel.json` block only | Resolved by Step 0.3 before env block removal |

**No schema drift confirmed**: Cannot verify without running `prisma db pull`. Operator
should run this during Step 0 and confirm no unexpected differences. If tables are missing,
`prisma db push` is safe to run before deploy (no destructive changes, only additive).
