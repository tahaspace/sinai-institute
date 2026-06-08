# Live vs Code Gap Analysis

**Trust hierarchy**: Code > Vercel API > Vercel audit files > Historical chat docs  
**Last updated**: 2026-03-28

---

## Summary Table

| Gap | Severity | Confidence | Cause |
|-----|----------|-----------|-------|
| Node version: code assumes 20.x, Vercel runs 24.x | Medium | High | Project config not pinned |
| `NEXTAUTH_URL` in production is wrong domain | High | High | `vercel.json` env overrides dashboard |
| `DATABASE_URL` env var is dead (Neon) — bypassed by hardcode | High | High | Deliberate workaround in `lib/prisma.ts` |
| DB port: code uses 5432 (direct), docs claim 6543 (pooler) | High | Medium | Conflicting sources — code wins |
| All docs (docs/) not committed to git / not deployed | Low | High | By design — local-only audit artifacts |
| `NEXTAUTH_SECRET` is weak, in VCS, and in production | Critical | High | `vercel.json` env block |
| Dashboard has 7 env vars; code needs 3 more missing ones | High | High | `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NODE_ENV` not in dashboard |
| Production deployment is 57 days old — code changes since | Medium | High | CLI deploy on 2026-01-30; no deploys since |
| localStorage-based homepage config differs per device | High | High | By design — no server sync |
| `public/uploads/` used in historical notes; ephemeral on Vercel | High | High | Vercel read-only FS confirmed |

---

## Gap Detail

### GAP-01 — Node Version: Code Assumes ~20, Vercel Runs 24 (Medium)

**What code expects**: No `.node-version` or `.nvmrc` pinned. `@types/node: ^20` in `package.json` devDependencies.  
**What Vercel runs**: `nodeVersion: 24.x` per Vercel API.  
**Historical notes**: Claimed Node 20.x  
**Risk**: Node 24 is a major version with potential breaking changes in native modules. `better-sqlite3` (devDependency) uses native addons — would need recompilation for Node 24. Not used in prod though.  
**Action needed**: Pin a Node version in Vercel project settings or add `.node-version` file. Confirm no native module issues under Node 24.

### GAP-02 — `NEXTAUTH_URL` in Production is Wrong Domain (High)

**Code expects**: NextAuth reads `NEXTAUTH_URL` to construct callback URLs and validate CSRF.  
**`vercel.json` currently sets**: `NEXTAUTH_URL = https://sinai-institute.vercel.app`  
**Actual live domain**: `https://test.sinaiinstitute.com`  
**Evidence**: Vercel alias file confirms both domains active; chat logs `DEPLOYMENT_SUCCESS_2026-02-04.md` states `✅ https://test.sinaiinstitute.com`  
**Dashboard state**: `NEXTAUTH_URL` is NOT in the Vercel dashboard env vars — only in the `vercel.json` block.  
**Impact**: Login at `test.sinaiinstitute.com` may fail if NextAuth's CSRF token validation checks the callback URL against `NEXTAUTH_URL`. Users may see "Invalid callback URL" or be redirected to `sinai-institute.vercel.app` after sign-in.  
**Cause**: `vercel.json` env block was set early and never updated when the custom domain was added.  
**Fix**: Remove env block from `vercel.json`; set `NEXTAUTH_URL = https://test.sinaiinstitute.com` in Vercel dashboard.

### GAP-03 — DATABASE_URL is Dead Neon URL, Bypassed by Hardcode (High)

**What `vercel.json` sets**: `DATABASE_URL = postgresql://...neon.tech/neondb?sslmode=require` (quota exceeded, dead)  
**What `lib/prisma.ts` actually does**: Ignores `DATABASE_URL` when `NODE_ENV=production`; uses hardcoded Supabase string.  
**Effect**: DB connectivity works — but through a fragile workaround, not through proper env configuration.  
**Dashboard state**: `DATABASE_URL` IS in the Vercel dashboard env vars (47 days ago, encrypted) — pointing to Supabase. But `vercel.json` overrides the dashboard value.  
**Cause**: Prisma client was resolving to wrong DB during build; workaround was to hardcode.  
**Fix**: Remove `DATABASE_URL` from `vercel.json`; ensure dashboard value uses Supabase + port 6543 + `?pgbouncer=true`; remove hardcoded string from `lib/prisma.ts`.

### GAP-04 — DB Port Conflict: Code Uses 5432, Docs Say 6543 (High)

**`lib/prisma.ts` hardcoded string**: Port `5432` — session/direct mode  
**`docs/bootstrap-input/vercel-production-notes.md` claims**: Port `6543`, pgbouncer mode  
**Vercel dashboard**: `DATABASE_URL` encrypted — cannot verify port  
**Code wins**: The hardcoded string in `lib/prisma.ts` is what actually runs in production.  
**Impact**: If running on session mode (5432) in serverless, each cold start creates a new direct connection. Supabase free tier allows ~60. Under concurrent load, connections exhaust.  
**Cause**: The vercel-production-notes.md was likely aspirational or documented an intermediate state.  
**Action**: Verify actual port by checking the current `lib/prisma.ts` hardcoded string. The audit confirms `5432`.

### GAP-05 — Docs Folder Not Committed / Not Deployed (Low — by Design)

**Local `git status`**: `docs/` is in untracked files on branch `speckit-bootstrap`. Not committed.  
**Production repo (`main`)**: Has no `docs/` directory.  
**Impact**: All audit documentation exists only on the local machine. If the local environment is lost, all bootstrap docs are gone.  
**Action**: Commit `docs/` to the repo (at minimum to `speckit-bootstrap` branch). Consider a `docs-only` or `speckit` branch strategy.

### GAP-06 — `NEXTAUTH_SECRET` Weak, In VCS, Active in Production (Critical)

**`vercel.json` contains**: `NEXTAUTH_SECRET = "sinai-institute-secret-key-2026-very-secure-random-string-12345"`  
**Dashboard state**: NOT in dashboard — `vercel.json` is the only source.  
**Risk**: Anyone who has read the git repo can forge valid NextAuth session cookies.  
**Code impact**: Since auth is already bypassed (hardcoded admin only), an attacker does not even need to forge cookies — they can use the plaintext credential. But the weak secret is still an active risk for future code.  
**Fix**: Generate `openssl rand -base64 32`, set ONLY in Vercel dashboard, remove from `vercel.json`.

### GAP-07 — Production Deployment is 57 Days Old (Medium)

**Last deployment**: ~2026-01-30 (`sinai-institute-3a1twtdm9-...`)  
**Code on `main`**: 4 commits, latest `ff29e76` (fix: add key prop to Dialog)  
**Commits after production**: At minimum commits `a045e58` and `ff29e76` — both labeled `fix:`.  
**Risk**: Bug fixes already committed to `main` are NOT live in production.  
**Known fixes not yet deployed**:
- `fix: force dynamic rendering for CMS pages` — CMS pages may serve stale data currently
- `fix: add key prop to Dialog to force re-render` — CMS edit dialog may not rerender correctly
**Action**: Deploy current `main` to production: `vercel --prod`

### GAP-08 — Homepage Content Differs Per Device (High — Not Technically a Drift)

**Code reality**: Homepage slides, stats, specializations, news, social media all saved in `localStorage`.  
**Production reality**: Admin who configured CMS content on their machine sees it; a fresh browser user sees an empty homepage.  
**This is not a code-vs-production gap** — it's a design gap between how CMS saves data (browser-local) vs. what public visitors see.  
**Action needed**: Migrate these keys to the `Setting` DB table (already in schema).

### GAP-09 — `public/uploads/` Local Writes vs Vercel Ephemeral FS (High)

**Historical notes claim**: Schedule PDFs and hero images written to `public/uploads/` and `public/images/news/`.  
**Current code reality**: All upload routes use Cloudinary (`/api/upload`, `/api/upload-image`). The `public/uploads/` directories are empty.  
**Conclusion**: This gap was ALREADY FIXED in the Cloudinary migration. The historical docs were outdated. The `vercel-production-notes.md` may have logged a past issue that is now resolved.  
**Confidence**: Medium — this in code is confirmed, but if any legacy code path still writes to `public/`, it would silently fail on Vercel.

### GAP-10 — Preview Environment Missing Auth + Cloudinary Vars (Medium)

**Vercel preview env**: Only `DATABASE_URL` is set.  
**Missing for preview**: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `CLOUDINARY_*` vars.  
**Impact**: Any Vercel preview deployment (e.g., from a feature branch) will have broken auth and broken uploads. Preview deployments don't exist currently (no Git integration), so this has no immediate impact.  
**Action**: Not critical now; becomes critical if Git integration is enabled.
