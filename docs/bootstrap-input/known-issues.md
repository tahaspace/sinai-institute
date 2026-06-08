# Known Issues

**Evidence sources**: `cursor_vercel 01.md`, `cursor_edusaas.md`, `cursor_news bar 2.md`, `cursor_hero_slider.md`, `cursor_cms_social_media_links_managemen.md`, source code analysis

---

## Critical / Security

### KI-001 — Credentials committed to VCS
**Severity**: 🔴 Critical  
**File**: `vercel.json` (committed to git)  
**Detail**: `vercel.json` contains a plaintext Neon `DATABASE_URL` with host `ep-shy-fire-ag4sxzsm.c-2.eu-central-1.aws.neon.tech`. Also, `.env.production` contains Supabase credentials. Both files are in the repository.  
**Impact**: Anyone with repo access has DB credentials and Cloudinary API secrets.  
**Evidence**: `vercel.json` lines 7–12; `.env.production` full content  
**Fix**: Rotate all credentials, remove from `vercel.json` (use Vercel dashboard env vars only), add `.env.production` to `.gitignore`.

### KI-002 — NEXTAUTH_SECRET is weak and in VCS
**Severity**: 🔴 Critical  
**File**: `vercel.json`, `.env.production`  
**Detail**: `NEXTAUTH_SECRET = "sinai-institute-secret-key-2026-very-secure-random-string-12345"` — human-readable, deterministic, committed.  
**Impact**: Session tokens can be forged.  
**Fix**: Generate with `openssl rand -base64 32`, set only in Vercel dashboard, never commit.

### KI-003 — Supabase DB password in multiple plaintext files
**Severity**: 🔴 Critical  
**Files**: `.env.production`, `.env.production.local`, `.env.vercel.check`, `cursor_vercel 01.md`  
**Detail**: `SinaiInstitute2026!` appears in at least 4 files including a chat export.  
**Fix**: Rotate Supabase DB password, purge from all files and chat exports.

---

## High — Runtime / Data Integrity

### KI-004 — Hardcoded Supabase connection string in `lib/prisma.ts`
**Severity**: 🟠 High  
**Evidence**: `cursor_vercel 01.md` — explicitly implemented as the fix for Vercel not picking up environment variables at runtime.  
**Detail**: Production Prisma client likely contains a hardcoded `DATABASE_URL` conditional on `NODE_ENV === 'production'`. This bypasses the standard env var pattern.  
**Impact**: Cannot rotate DB credentials without a code change and redeploy. No separation of concerns.  
**Fix**: Remove hardcoded URL; investigate why Vercel env vars weren't loaded at runtime (likely a Prisma client caching issue). Use `DATABASE_URL` env var with `connection_limit=1` and `?pgbouncer=true`.

### KI-005 — Local file uploads not persisted in production
**Severity**: 🟠 High  
**Confirmed affected features**:
- Schedule document upload (`/cms/schedules` → saves to `public/uploads/schedules/`)
- Hero Slider image upload (`/cms/homepage` → saves to `public/images/news/`)
**Detail**: Vercel's filesystem is read-only/ephemeral at runtime. Files written during a request are NOT persisted.  
**Symptom**: Uploaded schedules/hero images appear to save but are gone after next deploy or cold start.  
**Fix**: Route these uploads through `/api/upload-image` (Cloudinary) and store the returned URL in the DB/Settings.

### KI-006 — Social media links and specializations stored in localStorage only
**Severity**: 🟠 High  
**Affected**: CMS tab "سوشيال ميديا" (`/cms/homepage`) and CMS tab "اختر تخصصك" (specializations section)  
**Detail**: Data is stored in `localStorage` — browser-local, session-specific. Not in database.  
**Impact**: Changes made on one browser/device are invisible to other users. Data lost on browser cache clear. No server-side rendering of this content.  
**Evidence**: `cursor_cms_social_media_links_managemen.md` explicitly states "localStorage"; `cursor_homepage_specialization_section.md` confirms same.  
**Fix**: Move to `Setting` table (key/value store already in Prisma schema).

### KI-007 — TypeScript and ESLint errors suppressed in build
**Severity**: 🟠 High  
**File**: `next.config.ts`  
**Detail**: `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true` are set.  
**Impact**: Unknown quantity of type errors exist in the codebase. Deployed code may contain logic errors masked by suppressed type checking.  
**Fix**: Enable errors, fix all issues, then remove the suppression flags.

---

## Medium — Functional / UX

### KI-008 — CMS Page Builder (GrapesJS) may have SSR issues
**Severity**: 🟡 Medium  
**Detail**: GrapesJS is a browser-only library. It must be dynamically imported with `{ ssr: false }`. If this is not correctly implemented, the page builder will fail on Vercel's server-side rendering.  
**Evidence**: `cursor_news bar 2.md` — GrapesJS was integrated rapidly; SSR handling not explicitly confirmed.  
**Symptom**: White screen or hydration error when opening `/cms/page-builder-grapes/[id]`.  
**Fix**: Verify `dynamic(() => import(...), { ssr: false })` wraps the GrapesJS editor component.

### KI-009 — Neon credentials still in `vercel.json`
**Severity**: 🟡 Medium  
**Detail**: `vercel.json` still references `ep-shy-fire-ag4sxzsm.c-2.eu-central-1.aws.neon.tech`. Neon quota was exceeded; this connection is dead. However, the stale credential is still committed.  
**Impact**: Confusion during future debugging; if Neon account is reactivated, this could create split-brain DB state.  
**Fix**: Remove env vars from `vercel.json` entirely; manage via Vercel dashboard.

### KI-010 — Page builder dynamic routes conflict with static public pages
**Severity**: 🟡 Medium  
**Detail**: Dynamic public pages are served from `/pages/[slug]`, but most core public pages use hardcoded routes (e.g., `/about`, `/admission`, `/departments`). Both systems coexist. Pages edited via CMS may not appear at their expected canonical URL.  
**Example**: If "About" is edited in CMS and saved, it may be served at `/pages/about` instead of `/about`.  
**Fix**: Implement a redirect rule or refactor core pages to read their content from the DB.

### KI-011 — `[slug]` route at app root may conflict with CMS pages
**Severity**: 🟡 Medium  
**File**: `app/[slug]/` directory (exists per file listing)  
**Detail**: A `[slug]` route exists at the root. This may conflict with existing named routes (`/about`, `/contact`, etc.).  
**Fix**: Verify route priority does not shadow static routes.

### KI-012 — `HomepageSpecialization` Prisma model may not exist in production DB
**Severity**: 🟡 Medium  
**Detail**: `cursor_homepage_specialization_section.md` mentions adding `HomepageSpecialization` to Prisma schema. However, the current `prisma/schema.prisma` does not contain this model (not seen in the reviewed file).  
**Risk**: If the model was added in schema but `prisma db push` was never run on production, any API calls referencing it will fail.  
**Action**: Run `prisma db push` against production Supabase to sync schema.

### KI-013 — Middleware only protects `/cms/*` routes
**Severity**: 🟡 Medium  
**File**: `middleware.ts`  
**Detail**: Only `/cms/:path*` and `/login` are matched. Portal routes (`/student/*`, `/faculty/*`, `/institute/*`, etc.) are not protected by middleware.  
**Impact**: Portal pages are accessible without authentication unless they implement their own auth checks.  
**Fix**: Add portal paths to middleware matcher, or verify each portal implements `getServerSession` checks.

---

## Low — Quality / Maintenance

### KI-014 — README.md documents MySQL but production uses PostgreSQL
**Severity**: 🔵 Low  
**File**: `README.md`  
**Detail**: README says `DATABASE_URL="mysql://..."` and "requires MySQL 8.0+". Actual production DB is PostgreSQL (Supabase).  
**Fix**: Update README to reflect current stack.

### KI-015 — `page.tsx.backup` and `page.tsx.backup2` in app root
**Severity**: 🔵 Low  
**Files**: `app/page.tsx.backup`, `app/page.tsx.backup2`  
**Detail**: Stale backup files left in `app/` directory. May cause confusion.  
**Fix**: Delete, the git history preserves old versions.

### KI-016 — `dev.db` (SQLite) committed to repository
**Severity**: 🔵 Low  
**File**: `prisma/dev.db`  
**Detail**: SQLite development database committed to git (396 bytes — likely empty or minimal). Contains potential PII if seeded with real data.  
**Fix**: Add `prisma/*.db` to `.gitignore`.

### KI-017 — Social media data uses localStorage (not Database)
(See KI-006 above — also a medium issue)

### KI-018 — Multiple migration scripts with unclear status
**Severity**: 🔵 Low  
**Files**: `migrate-data.ts`, `migrate-simple.ts`, `neon-data-export.js`, `sync-to-supabase.js`  
**Detail**: Several one-off migration scripts exist at repo root. Their current utility is unknown — they were used during the Neon→Supabase migration.  
**Fix**: Archive or delete. Document which one was actually executed.
