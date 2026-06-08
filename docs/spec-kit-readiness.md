# Spec Kit Readiness Verdict

**Date**: 2026-03-29  
**Basis**: Full brownfield audit — code inspection, Vercel API, audit raw files, chat history  
**Purpose**: Determine whether the project is ready for Spec Kit (`@speckit-constitution` → feature specs)

---

## Overall Verdict

> **⛔ NOT READY for broad Spec Kit feature work.**  
> **✅ READY for `@speckit-constitution` now, with caveats.**  
> **✅ READY for the first stabilization slice immediately after constitution.**

The project has a serious security posture (4 critical issues), a broken production state (auth stub, results API non-functional), and no dev/prod isolation. Running Spec Kit feature specs on top of this foundation would build on sand. However, the audit is thorough enough to write a precise constitution and a tight first spec slice that directly targets stabilization.

---

## What Is Now Known with High Confidence

All items below are code-verified or live-runtime confirmed. Confidence ≥ 85%.

### Infrastructure
- **Provider**: Supabase PostgreSQL — project `eacpjbbpwonwmthutxow`, eu-west-1 (Frankfurt). Confirmed by 6 independent sources.
- **Hosting**: Vercel, Hobby plan, Node **24.x** (Vercel API confirmed). No Git integration. Manual CLI deploys only.
- **Production last deployed**: ~2026-01-30 (57 days stale). 2 bug-fix commits on `main` not live.
- **Active domains**: `test.sinaiinstitute.com` + `sinai-institute.vercel.app`. Main domain `sinaiinstitute.com` is a separate A2Hosting site.

### Security posture
- DB password (`SinaiInstitute2026!`) is in `lib/prisma.ts` source — in git permanently.
- `NEXTAUTH_SECRET` is weak and in `vercel.json` — in git permanently.
- `vercel.json` `env` block overrides Vercel dashboard — every deploy re-applies wrong/weak/dead values.
- `NEXTAUTH_URL` in production resolves to `sinai-institute.vercel.app` (wrong domain).
- `/api/upload-image`, `POST /api/pages`, `PATCH /api/pages` — no auth check on any write.

### Auth
- Auth is a single hardcoded string comparison: `admin@sainaiinstitute.com` / `admin123`.
- DB auth path is commented out with a MySQL TODO reference.
- Changing `User.password` in DB has zero effect on login.
- All portal routes outside `/cms/*` are publicly accessible — zero auth.

### Database schema (14 models, fully enumerated)
- `HomepageSpecialization` does NOT exist in schema despite a chat claiming it was added.
- `WidgetTemplate` model exists; no API or UI was ever built for it.
- `Setting` model exists as a key/value store — currently underused (homepage config in localStorage instead).
- No Prisma migrations — `db push` only — no rollback mechanism.

### Known broken features
- `/api/results` POST: sends 3 wrong field names → Prisma throws at runtime. Cannot create results.
- `/api/results` GET: `orderBy: { publishedAt }` → field doesn't exist → runtime error.
- `/api/news` GET: filter on `{ published }` → field is `isPublished` → filter silently ignored.
- Named public routes (`/about`, `/admission`, `/contact`, `/departments`, `/results`) — all **404**.
- PWA: `register-sw.ts` references `/sw.js` which doesn't exist in `public/`.

### Content
- Homepage Hero, Ticker, Stats, Social Links, Specializations — all `localStorage` only. Not cross-device. Not DB.
- All portal pages (student, faculty, institute, etc.) — hardcoded static arrays. No DB connection.
- GrapesJS CMS pages — functional. Saved to DB. Public at `/[slug]`.

### No dev/prod isolation
- Local `npm run dev` targets the same Supabase production DB as `vercel --prod`.
- `npm run prisma:seed` runs `deleteMany()` against production.

---

## What Is Still Uncertain

Confidence below 70% — requires manual verification.

| Uncertainty | Impact if wrong |
|-------------|----------------|
| Do all 14 schema models have tables in production Supabase? | GrapesJS CMS, settings may crash silently |
| Is the Supabase project active or paused? | All API routes fail — site is down |
| What port does `DATABASE_URL` in Vercel dashboard use (5432 vs 6543)? | Determines pgbouncer fix approach |
| Does `prisma/dev.db` contain real PII (nationalId, phone, email)? | Determines if `git filter-repo` is needed |
| Is `@tanstack/react-query` used anywhere in components? | Dependency pruning scope |
| Is `next-intl` initialized in `app/layout.tsx`? | i18n feature baseline |
| What does `/cms/page-builder/[id]` contain — is it dead or active? | CMS route confusion |
| What does `/cms/pages-new/` contain — duplicate or replacement? | CMS route confusion |
| Is Supabase on Free or Pro plan? | Backup and connection limit strategy |
| Does any public page route exist at `/news`? | Completeness of public website |

---

## What Must Be Manually Verified Before Any Risky Code Changes

**Risky code changes** = any schema modification, auth change, or deployment.

### Before schema changes (must verify)
1. **`prisma db pull`** → compare result to `prisma/schema.prisma`. If they differ, a `db push` may silently drop columns. This is the single most dangerous action in this codebase.
2. **Supabase dashboard → project status** → confirm project is active (not paused).

### Before deployment
3. **Remove `"env": {}` from `vercel.json`** → confirm in dashboard that `NEXTAUTH_URL`, `NEXTAUTH_SECRET` are set with correct values before running `vercel --prod`.

### Before auth changes
4. **Back up production Supabase data** (Supabase dashboard → Database → Backups → Download). Auth changes may involve schema additions; without a backup, a failed `db push` is unrecoverable.

### Before any feature involving student/faculty data
5. **Confirm OQ-009** (owner decision): are portals demo-only or intended for real data? No backend work for portals should start without this answer.

---

## Recommended First Stabilization Slice for `@speckit-specify`

**Feature name**: `security-triage-phase-0`  
**Scope**: Minimum changes to stop active credential exposure and fix the most dangerous open endpoints.

### Spec scope (what to specify):

```
1. Remove vercel.json env block
   - delete "env": {} from vercel.json
   - set NEXTAUTH_URL, NEXTAUTH_SECRET in Vercel dashboard (values defined)

2. Rotate production credentials (out-of-band — no code change)
   - Supabase DB password rotation (Supabase dashboard)
   - Update lib/prisma.ts with new password
   - Cloudinary API secret rotation

3. Add auth guard to 3 open write endpoints
   - POST /api/upload-image
   - POST /api/pages
   - PATCH /api/pages
   - Pattern: getServerSession(authOptions) → 401 if null

4. Delete public/check-localstorage.html

5. Deploy: vercel --prod
```

**Why this first?**  
This slice has zero schema changes, zero new models, no RBAC complexity, no feature decisions required. It is pure risk reduction. Every task has a single clear success criterion. It unblocks all subsequent work by establishing a non-broken security baseline.

**Estimated spec complexity**: Low — no ambiguous requirements.  
**Estimated implementation**: ~2 hours, no blockers.

### Second slice (after first deploys successfully):
`fix-api-results-route` — correct all field names in `/api/results` POST and GET, so the results management feature actually works.

---

## Is the Project Ready for `@speckit-constitution` Now?

**Yes — proceed immediately.**

The audit is complete and thorough. The constitution should codify:

### What to include in the constitution

**Code quality rules**:
- No `localStorage` for content shared across users — use `Setting` table
- No hardcoded credentials anywhere in source files
- All DB access via Prisma in `app/api/*/route.ts` — no Supabase SDK, no raw SQL
- No writing to `public/` at runtime (Vercel ephemeral filesystem)
- Every API write endpoint must check `getServerSession()` — return 401 if null
- TypeScript errors are not suppressed — `ignoreBuildErrors` must be removed before phase 5

**Architecture rules**:
- Middleware guards `/cms/*` — no other routes may be marked "auth required" until OQ-009 is resolved
- New content that must be shared across devices goes to DB (not `localStorage`)
- New media uploads go through `/api/upload` → Cloudinary — never to `public/`

**Database rules**:
- Schema changes require: (1) Supabase backup, (2) `prisma db pull` diff, (3) `prisma db push`, (4) `vercel --prod`
- No `prisma migrate reset` — ever
- `prisma:seed` must never run without explicit `DATABASE_URL` override pointing to non-production

**Deployment rules**:
- No secrets in any committed file — Vercel dashboard only
- `vercel.json` contains no `env` block
- All deploys tested locally with `npx tsc --noEmit` before `vercel --prod`

**Development rules**:
- Use a separate Supabase project for local dev once one is created
- No feature spec starts without: (1) reading `CLAUDE.md`, (2) reading the relevant `docs/` section
- Portal work requires OQ-009 decision before any spec is written

---

## Top 10 Risks

| # | Risk | Severity | Status |
|---|------|----------|--------|
| R-01 | DB password in `lib/prisma.ts` source code + git history | 🔴 Critical | Active |
| R-02 | `NEXTAUTH_SECRET` weak and committed — sessions forgeable | 🔴 Critical | Active |
| R-03 | `POST /api/pages` and `PATCH /api/pages` — any internet user can inject persistent XSS into public pages | 🔴 Critical | Active |
| R-04 | `vercel.json` env block overrides all dashboard secrets — credential rotation has no effect | 🔴 Critical | Active |
| R-05 | Auth is a hardcoded bypass — DB auth non-functional, password is unchangeable without redeploy | 🔴 Critical | Active |
| R-06 | `npm run prisma:seed` destroys production departments + news when run locally | 🟠 High | Active — no guard |
| R-07 | DB port 5432 (session/direct) in serverless — connection exhaustion under concurrent load | 🟠 High | Active |
| R-08 | No dev/prod DB isolation — local development writes to production data | 🟠 High | Active |
| R-09 | No Prisma migration history — any schema error applied with `db push` cannot be rolled back | 🟠 High | Ongoing structural risk |
| R-10 | `/api/results` entirely broken at runtime (both GET and POST) — feature is completely non-functional | 🟠 High | Active |

---

## Top 10 Unknowns

| # | Unknown | Why it matters |
|---|---------|---------------|
| U-01 | Do all 14 Prisma models have tables in production Supabase? | Determines if GrapesJS, Settings, Versions crash in prod |
| U-02 | Is Supabase project active or paused? | Site may already be down |
| U-03 | What port is `DATABASE_URL` in Vercel dashboard (5432 vs 6543)? | Determines pgbouncer fix strategy |
| U-04 | Does `prisma/dev.db` contain real PII? | Determines whether git history purge is required |
| U-05 | What is Supabase plan (Free vs Pro)? | Connection limits, PITR availability |
| U-06 | What does `/cms/page-builder/[id]` contain — legacy or active? | Determines if 2 competing builders exist simultaneously |
| U-07 | What does `/cms/pages-new/` contain vs `/cms/pages/`? | Two CMS entry points — one may be wrong/confusing |
| U-08 | Is `@tanstack/react-query` used anywhere? | Bundle weight and arch decision |
| U-09 | Are portals intended for live data or demo-only? (OQ-009) | Determines scope of all future portal work |
| U-10 | Has `prisma db push` been run since GrapesJS models were added? | `Page`, `PageBlock`, `PageVersion`, `Setting` may not exist in prod |

---

## Top 10 Immediate Actions Before Broad Development

In strict priority order. Each is a prerequisite for the next.

| # | Action | Time | Risk if skipped |
|---|--------|------|----------------|
| 1 | **Remove `"env": {}` block from `vercel.json`** | 2 min | Every subsequent deploy re-applies wrong secrets |
| 2 | **Rotate Supabase DB password** (Supabase dashboard → Settings → Database) | 10 min | Existing leaked password remains active forever |
| 3 | **Update `lib/prisma.ts`** with new password after rotation | 5 min | App loses DB connectivity |
| 4 | **Set `NEXTAUTH_URL` = `https://test.sinaiinstitute.com` in Vercel dashboard** | 2 min | Login redirects to wrong domain |
| 5 | **Generate new `NEXTAUTH_SECRET`** (`openssl rand -base64 32`) → Vercel dashboard | 5 min | Existing weak secret in git remains forgeable |
| 6 | **Add `getServerSession()` to `POST /api/upload-image`, `POST /api/pages`, `PATCH /api/pages`** | 30 min | Cloudinary abuse + persistent XSS on public pages |
| 7 | **Deploy Phase 0: `vercel --prod`** | 5 min | Security fixes not live |
| 8 | **Run `prisma db pull`** → diff against `schema.prisma` | 20 min | Any subsequent `db push` may silently drop columns |
| 9 | **Check Supabase project status** (dashboard → confirm active, not paused) | 2 min | Production may currently be down |
| 10 | **Delete `public/check-localstorage.html`** and commit | 2 min | Admin localStorage state exposed to public |

---

## Reading Order for First Spec Kit Session

Before running `@speckit-constitution`:
1. `CLAUDE.md` — orient to project, 15 critical code realities
2. `docs/known-issues.md` — understand what's broken
3. `docs/current-architecture.md` — system topology and auth flow
4. `docs/contradictions-and-gaps.md` — where docs conflict with code
5. `docs/open-questions.md` — what needs owner decision before feature work

Before running `@speckit-specify` for the first slice:
1. Above list
2. `docs/bootstrap-next-steps.md` Phase 0 — confirms scope of first slice
3. `docs/feature-inventory.md` API table — before touching any API route
