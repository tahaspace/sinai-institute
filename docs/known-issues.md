# Known Issues

**Legend**: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low · ✅ Verified in code/live audit  
**Last updated**: 2026-03-28 — consolidated from all audit phases  
**Source hierarchy**: code > Vercel API > compiled docs > chats

---

## Security

### KI-001 — Multiple secrets in git history 🔴 Critical ✅ (Resolved 2026-03-29)
**Files confirmed**: `lib/prisma.ts` (Supabase URL + password), `vercel.json` (Neon URL, NEXTAUTH_SECRET), `.env` (Supabase keys, Cloudinary secrets), `prisma/seed.ts` (hardcoded admin password in comments).  
**Impact**: Anyone with repo access has full production DB access and can forge session tokens. Git history is permanent — rotation is the only remedy for what's committed.  
**Fix Applied**: Rotated all credentials in dashboards (Supabase, Cloudinary, NextAuth secret). Removed `env` block from `vercel.json`. Set all secrets in Vercel dashboard only.

---

### KI-002 — `vercel.json` env block actively overrides Vercel dashboard 🔴 Critical ✅ (Resolved 2026-03-29)
**File**: `vercel.json` lines 7–12  
**Evidence**: Vercel API confirms `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are NOT in the dashboard — only in `vercel.json`.  
**Impact**: Every `vercel --prod` re-applies wrong `NEXTAUTH_URL`, weak `NEXTAUTH_SECRET`, and dead Neon `DATABASE_URL`. Rotating secrets in the dashboard has zero effect while this block exists.  
**Fix Applied**: Removed entire `"env": {}` block from `vercel.json`. Then set `NEXTAUTH_URL` and `NEXTAUTH_SECRET` in Vercel dashboard.

---

### KI-003 — Unauthenticated write endpoints in production 🔴 Critical ✅ (Resolved 2026-03-29)
**Routes**:

| Endpoint | Risk |
|----------|------|
| `POST /api/upload-image/media` | Any internet user uploads to Cloudinary → storage abuse, cost impact |
| `POST /api/pages` | Anyone can create CMS pages with malicious `customJS` |
| `PATCH /api/pages` | Anyone can inject JavaScript into existing public pages (persistent XSS) |

**Fix Applied**: Added `const session = await getServerSession(authOptions); if (!session) return 401;` at top of 4 write handlers (`upload-image`, `upload-media`, `pages` POST/PATCH). Note: other `/api/pages` subroutes still need separate review.

---

### KI-004 — Auth is a hardcoded stub — DB auth non-functional 🔴 Critical ✅
**File**: `lib/auth.ts:30–38`  
**Active code**:
```typescript
if (email === 'admin@sainaiinstitute.com' && password === 'admin123') {
  return { id: 'dev-admin-001', role: 'SUPER_ADMIN' }
}
```
DB query block is commented out with `// TODO: Enable DB authentication when MySQL is configured`  
**Impact**: Password cannot be changed without code change + deploy. Changing `User.password` in DB has no effect. Single hardcoded user with no rotation possible.  
**Fix**: Uncomment and fix DB auth block (PostgreSQL, not MySQL); remove hardcoded bypass.

---

### KI-005 — `NEXTAUTH_URL` set to wrong domain in production 🔴 Critical ✅ (Resolved 2026-03-29)
**Live value**: `https://sinai-institute.vercel.app` (from `vercel.json`)  
**Correct value**: `https://test.sinaiinstitute.com`  
**Evidence**: Vercel API confirms `NEXTAUTH_URL` absent from dashboard; only `vercel.json` sets it.  
**Impact**: Login on the custom domain may redirect to the `.vercel.app` alias after authentication, confusing and breaking the auth flow.  
**Fix Applied**: Removed from `vercel.json`, added `https://test.sinaiinstitute.com` to Vercel dashboard.

---

### KI-006 — `/api/results` both POST and GET are broken at runtime 🟠 High ✅
**File**: `app/api/results/route.ts`

| Operation | Broken field | Schema field | Error |
|-----------|-------------|-------------|-------|
| POST | sends `published` | `isVisible` | Unknown field |
| POST | sends `publishedAt` | `publishDate` | Unknown field |
| POST | sends `title` | doesn't exist | Unknown field |
| GET | `orderBy: { publishedAt }` | doesn't exist | P2009 |

**Impact**: The results management system is completely non-functional — neither reading nor writing results works.  
**Fix**: Correct all field names in `app/api/results/route.ts`.

---

### KI-007 — Production DB port 5432 (session/direct) instead of 6543 (pgbouncer) 🟠 High ✅ (Resolved 2026-03-29)
**File**: `lib/prisma.ts:7` — hardcoded connection string  
**Impact**: Each Vercel cold start opens a new TCP connection to Supabase. Free tier cap ~60 connections. Concurrent traffic will exhaust connections → `P1001` errors on all API routes simultaneously.  
**Fix Applied**: Connection string in Vercel dashboard uses port `6543` and `?pgbouncer=true&connection_limit=1`. `lib/prisma.ts` now uses `process.env`.

---

### KI-008 — All portal routes beyond `/cms/*` have zero auth 🟠 High ✅
**Confirmed by**: `middleware.ts` matcher = `/cms/:path*` and `/login` only.  
**Exposed routes**: `/student/*`, `/faculty/*`, `/institute/*`, `/assistant/*`, `/parent/*`, `/library-admin/*`, `/accountant/*`, `/lms/*`  
**Current impact**: Low (all pages show hardcoded fake data — no real student/faculty data exposed).  
**Future impact**: Critical — as soon as real data is added to portals, zero auth = full exposure.

---

### KI-009 — Homepage content is browser-local (localStorage) 🟠 High ✅
**Affected**: Hero slides, news ticker, stats section, specialization cards, social media links — all in `localStorage`.  
**Impact**: Admin changes on one browser are invisible site-wide (other browsers see defaults). Lost on cache clear. Cannot be server-side rendered → SEO gap.  
**Fix**: Migrate each to `Setting` table (key/value store already in schema) with `GET/PUT /api/settings`.

---

### KI-010 — Named public routes all 404 in production 🟠 High ✅
**Affected**: `/about`, `/admission`, `/contact`, `/departments`, `/results` — directories exist with no `page.tsx`.  
**Evidence**: Code confirmed — empty directories with no route component.  
**Note**: GrapesJS-backed equivalents may exist at `/pages/about` etc. but not at the expected named paths.  
**Fix**: Add `page.tsx` to each directory, or add Next.js redirects, or document as CMS-only paths.

---

### KI-011 — `prisma/dev.db` tracked in git — possible PII 🟠 High ✅
**Size**: 299KB (significantly larger than empty SQLite — contains data)  
**Evidence**: Migration scripts read from this file: 2 applications with `nationalId`, `phone`, `email`.  
**Fix**: `sqlite3 prisma/dev.db .dump | head -200` to inspect; `git rm --cached prisma/dev.db`; add `prisma/*.db` to `.gitignore`.

---

### KI-012 — `npm run prisma:seed` wipes production data if run locally 🟠 High ✅
**File**: `prisma/seed.ts` — runs `prisma.department.deleteMany({})` and `prisma.news.deleteMany({})` before seeding.  
**Target**: `DATABASE_URL` from `.env` → production Supabase.  
**Fix**: Add `NODE_ENV !== 'development'` guard, or rename to `seed:dev` with explicit env override requirement.

---

### KI-013 — TypeScript and ESLint errors suppressed in build 🟠 High ✅
**File**: `next.config.ts` — `ignoreBuildErrors: true`, `ignoreDuringBuilds: true`  
**Impact**: Unknown quantity of type errors and lint violations exist. Broken code deploys silently.  
**Fix**: Run `npx tsc --noEmit` to assess volume; fix errors; remove suppression flags.

---

### KI-014 — No error monitoring or alerting 🟠 High
**State**: No Sentry, Datadog, or other APM. Vercel log retention is 1 day (Hobby plan).  
**Impact**: Production errors are invisible after 24 hours. DB connection failures, auth errors, 500s go undetected.  
**Fix**: `npx @sentry/wizard@latest -i nextjs` — free tier sufficient.

---

### KI-015 — GitHub PAT in git remote URL 🟠 High ✅
**Evidence**: `git remote -v` shows token in HTTPS remote URL string.  
**Fix**: `git remote set-url origin https://github.com/tahaspace/sinai-institute.git`; rotate PAT.

---

### KI-016 — No dev/prod database isolation 🟠 High
**State**: Local `npm run dev` targets the same Supabase production DB as `vercel --prod`.  
**Impact**: Local development reads/writes production data. Any seed or push mistake destroys prod.  
**Fix**: Create a second Supabase project for development, or use `DATABASE_URL` override in `.env.local`.

---

### KI-017 — `public/check-localstorage.html` live in production 🟡 Medium ✅ (Resolved 2026-03-29)
**URL**: `https://test.sinaiinstitute.com/check-localstorage.html`  
**Content**: Developer debug tool that reads and displays all localStorage keys.  
**Fix Applied**: Deleted from `public/`.

---

### KI-018 — Node 24.x in production, codebase targets 20.x 🟡 Medium ✅
**Evidence**: Vercel API `nodeVersion: 24.x`. `package.json` `@types/node: ^20`. No `.node-version` pinned.  
**Fix**: Vercel project settings → Node.js Version → set to `20.x`.

---

### KI-019 — Production deployment 57 days stale 🟡 Medium ✅
**Evidence**: Vercel API `targets.production` → `sinai-institute-3a1twtdm9-...` (deployed ~2026-01-30).  
**Pending commits**: `a045e58` (CMS force-dynamic), `ff29e76` (Dialog fix)  
**Fix**: `vercel --prod`

---

### KI-020 — PWA non-functional (service worker missing) 🟡 Medium ✅
**Code**: `lib/pwa/register-sw.ts` calls `navigator.serviceWorker.register('/sw.js')`  
**Reality**: No `sw.js` in `public/` directory.  
**Impact**: Silent failure on every page load. PWA install prompt shown but fails.  
**Fix**: Remove PWA UI components, or generate `sw.js` via `next-pwa` package.

---

### KI-021 — `README.md` documents wrong technology stack 🔵 Low ✅
**Claims**: MySQL 8.0+, A2Hosting. **Reality**: PostgreSQL (Supabase), Vercel.  
**Fix**: Rewrite `README.md`.

---

### KI-022 — Stale migration scripts at repo root 🔵 Low ✅
**Files**: `migrate-data.ts`, `migrate-simple.ts`, `neon-data-export.js`, `sync-to-supabase.js`  
**Risk**: These contain hardcoded credentials. May be mistakenly run.  
**Fix**: Delete after confirming they contain no unique data; add credentials to rotation list.

---

### KI-023 — `WidgetTemplate` model has no API or UI 🔵 Low ✅
**State**: Complete Prisma model, zero `prisma.widgetTemplate` references in any API route.  
**Fix**: Either build the feature or remove from schema.

---

### KI-024 — `/api/news` GET filter uses wrong field name 🟠 High ✅
**Code**: Filters on `{ published: ... }`, schema field is `isPublished`.  
**Impact**: Published filter is silently ignored; returns all news regardless of publication status.  
**Fix**: Update GET handler to use `isPublished`.

---

## Resolved Issues

| KI | Issue | Resolution |
|----|-------|-----------|
| — | "GrapesJS crashes SSR" | Static import inside `'use client'` — SSR-safe |
| — | "/api/upload writes to local filesystem" | Code confirmed Cloudinary |
| — | "HomepageSpecialization may exist in schema" | Definitively absent — fully enumerated |
| KI-001 | Multiple secrets in git | Rotated, hardcode removed |
| KI-002 | vercel.json env | Removed block |
| KI-003 | Unauthenticated write endpoints | 4 endpoints now guarded |
| KI-005 | NEXTAUTH_URL wrong domain | Fixed in dashboard |
| KI-007 | DB port 5432 (session) | Now port 6543 + pgbouncer in dashboard |
| KI-017 | Debug HTML tool | Deleted |
