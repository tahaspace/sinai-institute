# Contradictions and Gaps

**Purpose**: Cross-source audit comparing code reality against all documentation strata.  
**Evidence priority**: `code > live runtime evidence (Vercel API) > audit-raw files > compiled docs > historical chats`  
**Last updated**: 2026-03-28 (post production audit)  
**What this supersedes**: Earlier `docs/contradictions-and-gaps.md` (if it existed) — this is the authoritative synthesis.

---

## Quick Reference — Contradiction Index

| ID | Area | Severity | Code/Live wins over |
|----|------|----------|---------------------|
| C-01 | DB port: code=5432, ADR claims 6543 | 🔴 Critical | ADR-002, `old-ai-conversations-summary.md`, `vercel-production-notes.md` |
| C-02 | Auth flow: code bypasses DB, ADR describes bcrypt DB lookup | 🔴 Critical | ADR-004, `project-goals.md`, `old-ai-conversations-summary.md` |
| C-03 | `HomepageSpecialization` Prisma model: chat says added, code says absent | 🟠 High | `old-ai-conversations-summary.md`, `pending-features.md` |
| C-04 | Upload persistence: chat says local filesystem, code uses Cloudinary | 🟠 High | `bootstrap/known-issues.md`, `old-ai-conversations-summary.md` |
| C-05 | Node version: docs say 20.x, Vercel API says 24.x | 🟡 Medium | `vercel-production-notes.md`, all earlier docs |
| C-06 | `NEXTAUTH_URL`: docs claim custom domain, `vercel.json` sets Vercel default | 🟡 Medium | `vercel-production-notes.md`, `deployment-vercel.md` (previous version) |
| C-07 | pgbouncer/port 6543: not in code, but `ADR-002` and `vercel-production-notes.md` claim it | 🟠 High | ADR-002 |
| C-08 | SSR: docs imply server rendering, code is almost entirely `'use client'` | 🟡 Medium | `current-architecture.md` (now corrected), `project-goals.md` |
| C-09 | TanStack Query: listed as active in `project-goals.md`, not confirmed in code | 🟡 Medium | `project-goals.md` |
| C-10 | `project-goals.md` marks all portals as "✅ Implemented" — code shows hardcoded arrays | 🟠 High | `project-goals.md` |

---

## Section 1 — Code vs Documentation Contradictions

### C-01 — DB Port: 5432 (code) vs 6543 (ADR and docs) 🔴 Critical

| Source | Claims |
|--------|--------|
| `lib/prisma.ts` | Port **5432**, host `aws-1-eu-west-1.pooler.supabase.com`, no `?pgbouncer=true` |
| `ADR-002` | "pgbouncer transaction pooler (port 6543, ?pgbouncer=true&connection_limit=1)" |
| `vercel-production-notes.md` | "Port 6543, pgbouncer mode" |
| `old-ai-conversations-summary.md` | Claims Session 3 fixed to port 6543, pgbouncer |
| `deployment-audit.md` | "port 5432 in code — code wins" |
| `database-provider-verdict.md` | Confirmed port 5432 from code |

**Verdict**: Code wins. `lib/prisma.ts:7` is the hardcoded connection string that executes in production — it uses port 5432 with no pgbouncer flags. ADR-002 and the production notes document aspirational state, not implemented state. The chat session claimed it fixed this; the code shows it was not.

**Risk**: Running in session mode from serverless creates a new connection per cold start. Free tier 60-connection limit can be exhausted under concurrent traffic.

**Resolution needed**: Check actual port in `lib/prisma.ts` (confirmed 5432 from multiple reads), then fix to 6543 + `?pgbouncer=true&connection_limit=1`.

---

### C-02 — Auth Flow: Hardcoded string comparison (code) vs bcrypt DB lookup (ADR) 🔴 Critical

| Source | Claims |
|--------|--------|
| `lib/auth.ts:30–38` | Only active path: `if (email === 'admin@sainaiinstitute.com' && password === 'admin123')` — DB query commented out |
| `ADR-004` | Describes bcrypt flow: "POST → bcryptjs compare(inputPassword, User.password) → NextAuth creates JWT" |
| `project-goals.md` | "Role-based authentication (NextAuth): ✅ Implemented" |
| `old-ai-conversations-summary.md` Session 3 | Does not mention removing bcrypt — assumes DB auth works |

**Verdict**: Code wins. `lib/auth.ts` has a single hardcoded string comparison. The `bcryptjs` case is in comments with `TODO: Enable DB authentication when MySQL is configured`. The MySQL reference indicates this was written for an earlier stack and never updated.

**Impact**:
- Changing the password in the `User` DB record has zero effect
- `User.password` bcrypt hash is irrelevant to login
- Role returned is always hardcoded `'SUPER_ADMIN'` — the DB role field is not involved
- Password cannot be changed without a code change + redeploy

**ADR-004 status**: Its auth flow description is aspirational, not current reality. ADR-004 should be marked **SUPERSEDED** — current state is a security stub, not a production auth system.

---

### C-03 — `HomepageSpecialization` Model: Chat claims "added", schema says "absent" 🟠 High

| Source | Claims |
|--------|--------|
| `prisma/schema.prisma` (301 lines, fully read) | No `HomepageSpecialization` model anywhere |
| `old-ai-conversations-summary.md` Session 9 | "`HomepageSpecialization` model was added to Prisma schema (uncertain if migrated to production DB)" |
| `pending-features.md` | No mention of this model |
| `domain-model.md` | Explicitly states: "No `HomepageSpecialization` model exists" |

**Verdict**: Code wins definitively. The model does not exist. Any code path referencing `prisma.homepageSpecialization` would throw at runtime. The homepage specialization section uses `localStorage` only.

**Risk**: If this was ever pushed to the schema, it may exist in production Supabase but not in the current local `schema.prisma` — creating schema drift in the reverse direction. Manual verification: `prisma db pull`, check resulting schema.

---

### C-04 — Upload persistence: Bootstrap docs say local filesystem, code uses Cloudinary 🟠 High

| Source | Claims |
|--------|--------|
| `app/api/upload-image/route.ts` | Uses Cloudinary SDK — `v2.uploader.upload()` |
| `app/api/upload-media/route.ts` | Uses Cloudinary SDK |
| `app/api/upload/route.ts` | Uses Cloudinary SDK |
| `bootstrap/known-issues.md` KI-005 | "Schedule upload saves to `public/uploads/schedules/`" |
| `old-ai-conversations-summary.md` Session 4 | "local file uploads…`public/uploads/schedules/` directory was created" |
| `vercel-production-notes.md` | Flags schedule + hero slider uploads as "❌ Not production safe" |

**Verdict**: Code wins — all upload API routes observed in current code use Cloudinary. The local filesystem path was a development-phase approach that has since been migrated. Bootstrap known-issues KI-005 reflects a past state that has been resolved.

**Caveat**: The `public/uploads/schedules/` and `public/images/news/` directories may still exist as empty committed directories, and the CMS form may still POST to these paths via a legacy handler. **Unconfirmed** — requires running `ls public/uploads/` and reading the schedule upload form POST target.

---

### C-05 — Node Version: Docs say 20.x, production is 24.x 🟡 Medium

| Source | Claims |
|--------|--------|
| Vercel API (`live-production-audit.md`) | `nodeVersion: 24.x` |
| `vercel-production-notes.md` | "Node version: 20.x" |
| `package.json` | `@types/node: ^20` |
| `current-architecture.md` | Previously stated 20.x |

**Verdict**: Live Vercel API wins over all historical documentation. The project runs on Node 24 in production. No `.node-version` or `.nvmrc` file pins the version.

**Risk**: Unvalidated compatibility. Node 24 is a major release. The application may use APIs that behave differently. Local dev does not match production Node version.

---

### C-06 — `NEXTAUTH_URL`: Wrong value active in production 🟡 Medium

| Source | Claims |
|--------|--------|
| `vercel.json` `env` block | `NEXTAUTH_URL = https://sinai-institute.vercel.app` |
| `env-production-names.txt` | `NEXTAUTH_URL` does NOT appear in Vercel dashboard |
| `vercel-production-notes.md` | Claims `NEXTAUTH_URL = https://test.sinaiinstitute.com` |
| `live-production-audit.md` | Confirmed wrong value is live (only source is `vercel.json`) |

**Verdict**: Live audit wins. `NEXTAUTH_URL` in production resolves to `https://sinai-institute.vercel.app` via `vercel.json`. The correct value (`test.sinaiinstitute.com`) was never set in the dashboard. The notes documented an intended state that was never implemented.

**Impact**: Auth callbacks (`/api/auth/callback/credentials`) may receive wrong origin, causing redirect failures after login on the custom domain.

---

### C-07 — pgbouncer: ADR claims it, code refutes it 🟠 High

**This is partially the same as C-01**, but specifically concerns the ADR decision record. ADR-002 states as its "key configuration": "Database URL uses pgbouncer transaction pooler (port 6543, `?pgbouncer=true&connection_limit=1`)".

This is recorded as a committed architectural decision. It is not what runs in production. **ADR-002 must be flagged as "Superseded" or "Partially Implemented".**

The ADR itself notes in Consequences: "Prisma client cached a stale connection URL at build time — currently worked around with hardcoded URL." This tacitly acknowledges the workaround but presents the pgbouncer config as the intended/accepted decision — implying it was implemented.

**ADR-002 status**: The decision was made but the implementation drifted to port 5432 (direct mode). The ADR is now misleading.

---

### C-08 — Render strategy: Docs imply SSR, code is client-only 🟡 Medium

| Source | Claims |
|--------|--------|
| `app/(public)/page.tsx` | `'use client'` — fetches data in `useEffect`, reads `localStorage` |
| `app/(public)/[slug]/page.tsx` | `'use client'` — fetches in `useEffect` |
| All portal pages | `'use client'` with static/hardcoded data |
| `project-goals.md` | "Use Next.js App Router with server components and dynamic API routes" |
| `ARCHITECTURE.md` (old, not in this repo) | Referenced performance stats implying SSR |

**Verdict**: Code wins. The application has essentially zero RSC data fetching at the page level. Every page is a client-side rendered shell that hydrates data via `useEffect`. This is Next.js App Router style but without RSC data fetching benefits (no server-side SEO content, no reduced client JS for data).

**Impact**: SEO is compromised for all dynamically rendered content. GrapesJS-rendered public pages (`/[slug]`) have their content available only after client-side JS executes — search engine crawlers see an empty shell.

---

### C-09 — TanStack Query: Listed as "active", not confirmed in code 🟡 Medium

| Source | Claims |
|--------|--------|
| `project-goals.md` | "Use TanStack Query for client-side data fetching" |
| `project-overview.md` | "Installed but likely unused: `@tanstack/react-query`" |
| `package.json` | `@tanstack/react-query` is installed |

**Verdict**: The package is installed. Whether it is used anywhere is "likely unused" per `project-overview.md` — which was marked as uncertain pending a code grep. No confirmed `useQuery` or `useMutation` call found in any code review.

**Action needed**: `grep -r "useQuery\|useMutation\|QueryClient" app/ components/ --include="*.tsx"` to resolve.

---

### C-10 — `project-goals.md` marks portals as "✅ Implemented" 🟠 High

`project-goals.md` (generated from bootstrap) marks:
- "Student portal: ✅ Implemented (`app/(student)/`)"
- "Faculty portal: ✅ Implemented (`app/(faculty)/`)"
- "Institute admin dashboard: ✅ Implemented (`app/(institute)/`)"
- "Role-based authentication: ✅ Implemented"

**Code reality**:
- All these portals exist as **UI scaffolds with hardcoded arrays** — no DB model backs any portal identity or data
- No auth protection on portal routes (middleware covers only `/cms/*`)
- `project-overview.md` and `feature-inventory.md` correctly document this as "UI only / hardcoded data"

**Verdict**: Code + newer compiled docs win over the bootstrap `project-goals.md`. The bootstrap doc was generated as an optimistic "what was attempted" summary; the code audit is the accurate state.

---

## Section 2 — Features Claimed But Not Found in Code

### F-01 — `HomepageSpecialization` Prisma model (claimed in chat → absent from schema)
**Source of claim**: `old-ai-conversations-summary.md` Session 9  
**Code reality**: Definitively absent from `prisma/schema.prisma` (all 14 models enumerated)  
**Confidence**: 🟢 High — schema was fully read

### F-02 — Supabase SDK / Supabase Auth integration (claimed by env vars)
**Source of claim**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel dashboard; implies SDK usage  
**Code reality**: `@supabase/supabase-js` is NOT in `package.json`. No Supabase client import in any app file.  
**Conclusion**: Supabase env vars are set in dashboard but entirely unused in application code. Supabase is used only as a PostgreSQL host via Prisma. The Supabase-specific env vars are dead configuration.  
**Confidence**: 🟢 High

### F-03 — Service worker / PWA functionality
**Source of claim**: `lib/pwa/register-sw.ts`, `components/pwa/` exist; PWA install prompt UI referenced  
**Code reality**: No `sw.js` file exists in `public/` — service worker registration fails silently on every page load  
**Confidence**: 🟢 High

### F-04 — SMTP / email notifications
**Source of claim**: `project-goals.md` does not list this; but `pending-features.md` CMS section lists no email feature. `.env.example` has SMTP variables.  
**Code reality**: No mailer library (`nodemailer`, `resend`, `sendgrid`, etc.) in `package.json`. No email code in any API route.  
**Confidence**: 🟢 High — absence confirmed

### F-05 — `WidgetTemplate` API / UI
**Source of claim**: `WidgetTemplate` model exists in `prisma/schema.prisma` with full field set  
**Code reality**: No `prisma.widgetTemplate` call in any API route or component. No route for managing widget templates in `app/(cms)/`.  
**Conclusion**: Dead schema model — UI and API were never built.  
**Confidence**: 🟢 High

### F-06 — Real portal data (live DB data in student/faculty portals)
**Source of claim**: `project-goals.md` marks student/faculty portals "✅ Implemented"; `feature-inventory.md` source says "Live DB data: ❌ Not implemented — Uncertain"  
**Code reality**: `app/(student)/student/grades/page.tsx` confirmed to contain `const subjectGrades = [...]` (hardcoded array).  
**Confidence**: 🟢 High (one file confirmed; all likely identical pattern)

### F-07 — Bilingual UI / language switcher
**Source of claim**: `pending-features.md` marks "Bilingual switching (AR/EN): ⚠️ Partial — next-intl installed, locale files exist"  
**Code reality**: `next-intl` is installed; `i18n/locales/ar.json` and `en.json` exist. No public-facing language toggle UI confirmed.  
**Confidence**: 🟡 Medium — partial evidence. `next-intl` may be wired into layout (not read); or may be installed but not initialized.

### F-08 — Autosave in GrapesJS page builder
**Source of claim**: `old-ai-conversations-summary.md` — "autosave mentioned in chat as not yet done"  
**Code reality**: No autosave callback or interval found in any page builder code read  
**Confidence**: 🟡 Medium

### F-09 — Page version restore UI
**Source of claim**: `PageVersion` model exists with `blocksData` JSON snapshot. `pending-features.md` marks "Page version history: ⚠️ Partial — `PageVersion` model exists"  
**Code reality**: `POST /api/pages/[id]/blocks` creates a version when `createVersion=true`. No restore API route confirmed.  
**Conclusion**: Versions are captured; restoration is not implemented.  
**Confidence**: 🟡 Medium

---

## Section 3 — Features Found But Not Documented

### U-01 — `/api/pages/migrate` and `/api/pages/seed` endpoints
**Found in**: `app/api/pages/migrate/route.ts`, `app/api/pages/seed/route.ts`  
**Not in**: `feature-inventory.md` API table (partially — "migrate" mentioned as route), `pending-features.md`  
**Note**: These are admin utilities that likely run with no auth check. They should be disabled or protected in production.

### U-02 — `/cms/migrate-pages` and `/cms/seed-pages` CMS routes
**Found in**: `current-architecture.md` app structure  
**Risk**: These are one-time migration tools exposed as live routes. A logged-in admin can re-run them, potentially overwriting DB content.

### U-03 — `public/check-localstorage.html` — publicly accessible debug tool
**Found in**: `public/` directory confirmed  
**Accessible at**: `https://test.sinaiinstitute.com/check-localstorage.html`  
**Not in**: Any feature doc — was supposed to be removed (KI-018)  
**Status**: Still deployed as of last audit.

### U-04 — Two overlapping public page render paths
**Found in**: `app/(public)/[slug]/page.tsx` AND `app/(public)/pages/[slug]/page.tsx`  
**Both render CMS pages but via different paths**: `[slug]` at root, `pages/[slug]` under a prefix  
**Not documented in**: `docs/route-inventory.md` (lists one, not both clearly)

### U-05 — `/api/results` GET with broken `orderBy`
**Found in**: Code inspection — `orderBy: { publishedAt: 'desc' }` where `publishedAt` doesn't exist in `Result` model  
**Documented as**: KI-007 covers POST but not GET failure  
**Impact**: GET also throws at runtime; results are not fetchable at all

### U-06 — `/api/news` GET filter with wrong field name
**Found in**: Code — GET handler filters `{ published: ... }` but field is `isPublished`  
**Not clearly documented** as a confirmed broken GET path — bootstrap KI docs focused on POST  

### U-07 — `next.config.ts` image `remotePatterns` configuration
**Found in**: `next.config.ts` — allows images from `res.cloudinary.com` and any Supabase storage URL  
**Not documented** anywhere  
**Note**: If `remotePatterns` is too permissive (e.g., `hostname: '**'`), it may allow SSRF via Next.js Image optimization endpoint

---

## Section 4 — Runtime / Deployment Assumptions Lacking Evidence

### A-01 — `NEXTAUTH_URL` correct value was ever set in Vercel dashboard
**Assumption in all deployment docs**: `NEXTAUTH_URL = https://test.sinaiinstitute.com` is set  
**Evidence**: `env-production-names.txt` shows `NEXTAUTH_URL` is NOT listed among Vercel dashboard env vars. Only `vercel.json` sets it (wrong value).  
**Confidence it's wrong**: 🟢 High  
**Impact**: Login redirect on custom domain may silently fail

### A-02 — Production DB schema matches local `prisma/schema.prisma`
**Assumption**: `prisma db push` was run and all 14 models exist in production Supabase  
**Evidence**: No `prisma db pull` output available. Last schema push timestamp unknown. GrapesJS models were added in Session 10 — unclear if push ran.  
**Confidence schema is correct**: 🟡 Medium — likely pushed at some point given app works (departments load)  
**Confidence ALL 14 models exist**: 🔴 Low — `WidgetTemplate`, `Setting` may be missing

### A-03 — Supabase project is active and not paused
**Assumption**: Free tier project is running  
**Evidence**: `logs-last-24h.txt` is empty — no function invocations in 24h window captured. Project could be paused after 7 days of inactivity (Supabase free tier policy).  
**Confidence it's active**: 🟡 Medium — Vercel env vars were set 47d ago; unclear if traffic occurred since

### A-04 — Cloudinary account has sufficient quota
**Assumption**: Uploads still work; free tier not exceeded  
**Evidence**: Cloudinary credentials set 52d ago in Vercel dashboard; no quota check performed  
**Confidence**: 🟡 Medium

### A-05 — Schedule uploads go to Cloudinary (not local filesystem) in current production
**Assumption (from code)**: `/api/upload` uses Cloudinary  
**Counter-evidence**: Chat Session 4 created `public/uploads/schedules/` for local storage. If the schedule CMS UI POSTs to a path that was never updated to Cloudinary, files could still be going to the ephemeral `public/uploads/` on Vercel.  
**Confidence current state is Cloudinary**: 🟡 Medium — API routes use Cloudinary, but form POST target in CMS schedule UI not confirmed

### A-06 — Vercel function timeout is sufficient for DB operations
**Assumption**: All API routes complete within 10 seconds  
**Evidence**: Supabase is in Frankfurt (eu-west-1), Vercel builds to Washington DC. The Vercel project was built in Washington DC per DEPLOYMENT logs.  
**Anomaly**: If functions run in Washington but DB is in Frankfurt, latency adds ~100–150ms per query. Multi-operation routes (`POST /api/pages` creating blocks) may be at risk under load.  
**Confidence this is a problem**: 🔴 Low — no evidence of timeouts; noted for monitoring

---

## Section 5 — Unresolved Unknowns Requiring Manual Verification

| # | Unknown | Verification method | Impact if wrong |
|---|---------|-------------------|-----------------|
| MV-01 | Does `HomepageSpecialization` table exist in production Supabase? | `prisma db pull` — check resulting schema | Schema drift in reverse direction |
| MV-02 | Is production Supabase project active or paused? | Supabase dashboard → project status | All DB operations fail |
| MV-03 | What is the actual `DATABASE_URL` port in Vercel dashboard? | Vercel dashboard → env vars → reveal | Determines if pgbouncer is in effect via dashboard |
| MV-04 | Do all 14 `schema.prisma` models have tables in production? | `npx prisma studio` → check tables | Missing tables cause runtime crashes on affected routes |
| MV-05 | Does `/api/upload-image` have auth now, or was it always open? | Read `app/api/upload-image/route.ts` header | Open endpoint = Cloudinary abuse vector |
| MV-06 | What does the schedule CMS form POST to? | Read `/cms/schedules/page.tsx` form action | Local file vs Cloudinary determines production file persistence |
| MV-07 | Does `next-intl` work (initialized in app layout)? | Read `app/layout.tsx` providers | Language features non-functional |
| MV-08 | Is Supabase plan Free or Pro? | Supabase dashboard → billing | PITR, connection limits, backups differ |
| MV-09 | What is the Vercel function runtime region? | Vercel project settings → Functions region | Latency to Supabase eu-west-1 |
| MV-10 | Was `prisma db push` run after GrapesJS models added? | `prisma db pull` and diff | `/api/pages`, `/cms/pages` crash in production if tables missing |

---

## Section 6 — Confidence Scores by Area

| Area | Score | Basis |
|------|-------|-------|
| **DB provider: Supabase confirmed** | 🟢 95% | 6 independent code + config sources |
| **DB port: 5432 in production** | 🟢 90% | `lib/prisma.ts` hardcode confirmed, `database-provider-verdict.md` |
| **Auth is hardcoded stub** | 🟢 95% | `lib/auth.ts` fully read |
| **Uploads go to Cloudinary (API routes)** | 🟢 85% | Three API route files confirm; CMS form target uncertain |
| **Portal pages use hardcoded data** | 🟢 90% | Confirmed in student grades page; reasonable assumption for all |
| **Homepage config is localStorage-only** | 🟢 90% | `app/(public)/page.tsx` 723 lines; localStorage pattern confirmed |
| **Node 24.x in production** | 🟢 90% | Vercel API live |
| **`NEXTAUTH_URL` wrong in production** | 🟢 90% | `env-production-names.txt` confirms absent from dashboard |
| **`HomepageSpecialization` absent from schema** | 🟢 99% | `schema.prisma` fully enumerated |
| **`/api/results` POST broken** | 🟢 95% | Field names in route vs schema confirmed |
| **Public routes 404** (`/about`, etc.) | 🟡 70% | Directory listing not run; `feature-inventory.md` shows ❓ status |
| **`WidgetTemplate` has no UI** | 🟡 80% | No API route found; possible UI not observed |
| **Next-intl not wired** | 🟡 65% | Not confirmed; likely unused based on feature inventory |
| **Production DB schema matches local** | 🟡 55% | No `prisma db pull` run |
| **Supabase project active** | 🟡 60% | Logs empty; 47d since env set; no traffic evidence |
| **All 14 tables exist in production** | 🔴 45% | Uncertain — GrapesJS models may not have been pushed |

---

## Appendix: Document Trust Level Summary

| Document | Trust level | Notes |
|----------|------------|-------|
| `lib/prisma.ts`, `lib/auth.ts` | ✅ Highest | Direct code — fully read |
| `prisma/schema.prisma` | ✅ Highest | 301 lines, fully enumerated |
| `app/api/*/route.ts` | ✅ Highest | API routes read for key paths |
| `docs/bootstrap-input/audit-raw/vercel/env-production-names.txt` | ✅ High | Live Vercel CLI snapshot |
| `docs/live-production-audit.md` | ✅ High | Vercel API confirmed 2026-03-28 |
| `docs/database-provider-verdict.md` | ✅ High | Cross-referencing 6 sources |
| `docs/live-vs-code-gap.md` | ✅ High | Evidence-based |
| `docs/current-architecture.md` | ✅ High | Code-verified |
| `docs/feature-inventory.md` | ✅ High | Code-verified |
| `docs/domain-model.md` | ✅ High | From schema |
| `docs/adrs/*.md` | 🟡 Medium | Inferred from code — describe intent, may not be implemented |
| `docs/project-overview.md` | 🟡 Medium | Code-verified body, some open questions remain |
| `docs/bootstrap-input/vercel-production-notes.md` | 🟡 Medium | Documented aspirational/intended state; C-01, C-06 show inaccuracies |
| `docs/bootstrap-input/project-goals.md` | 🟡 Medium | C-10 shows portal implementation status is overstated |
| `docs/bootstrap-input/pending-features.md` | 🟡 Medium | Generated from chat + code; mostly accurate |
| `docs/bootstrap-input/old-ai-conversations-summary.md` | 🔴 Low-Medium | Historical narrative; C-03, C-04, C-07 show inaccuracies after code comparison |
| `docs/bootstrap-input/known-issues.md` | 🟡 Medium | Used as baseline; our `docs/known-issues.md` supersedes it |
