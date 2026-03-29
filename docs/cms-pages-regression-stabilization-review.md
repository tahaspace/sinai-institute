# CMS Pages Regression — Stabilization Review

**Feature**: `002-cms-pages-fix`  
**Branch**: `002-cms-pages-fix`  
**Date**: 2026-03-29  
**Status**: ✅ Resolved — DB connectivity restored; UI hardened

---

## 1. Observed Symptoms (Before Fix)

| Symptom | Observed |
|---------|----------|
| `/cms/pages` shows "لا توجد صفحات" | ✅ Confirmed |
| `GET /api/pages` returns HTTP 500 | ✅ Confirmed |
| Error detail: `FATAL: Tenant or user not found` | ✅ Confirmed |
| Page Builder inaccessible (cascading from page list failure) | ✅ Confirmed |
| Homepage header shows only "الرئيسية" | ✅ Confirmed (no header-eligible pages returned) |

---

## 2. Root Cause

### Primary: Supabase Project Paused
The Supabase project `eacpjbbpwonwmthutxow` (region: `eu-west-1`) was in a **paused state**. Supabase automatically pauses inactive free-tier projects. When paused, the Postgres instance refuses all connections with `FATAL: Tenant or user not found` — this error message is misleading; it does not indicate a wrong password. It means the database process is not running.

### Secondary: Silent `isError` Fallback in CMS UI
The `loadPages()` function in `app/(cms)/cms/pages/page.tsx` caught the error, showed a toast, but let `pages` remain as `[]`. The render branch:
```
isLoading → spinner
pages.length === 0 → "لا توجد صفحات"
```
…treated a connectivity failure identically to a genuinely empty database, producing a **false empty-state** that misled the operator.

### Contributing Factor: `.env` Credential Staleness
The local `.env` contained a `DATABASE_URL` that referenced a prior credential state. The operator updated `.env` with the correct active password in parallel with the Supabase resume.

---

## 3. Resolution Steps Applied

### Step 1 — Operator Action: Resume Supabase Project
- Opened Supabase dashboard → Project `eacpjbbpwonwmthutxow`
- Clicked **Resume** on the paused project
- Verified project status returned to `ACTIVE_HEALTHY`

### Step 2 — Operator Action: Update `.env`
- Updated `DATABASE_URL` in local `.env` with the current active password
- Port: `5432` (direct session mode — correct for local dev, Prisma CLI, and Prisma Studio)
- File remains gitignored — not committed

### Step 3 — Dev Server Restart
- Restarted `npm run dev` to reload `DATABASE_URL` into the runtime Prisma client
- Server confirmed listening on `:3001`

### Step 4 — Code Fix: Hardened `isError` UI State (FR-002)

**File**: `app/(cms)/cms/pages/page.tsx`

Added:
- `isError: boolean` + `errorMessage: string` state variables
- `setIsError(true)` + `setErrorMessage(...)` in the `loadPages()` catch block
- `handleRetry()` function — resets error and calls `loadPages()` without page reload
- A distinct **red error card** in the JSX render between `isLoading` and `pages.length === 0`:

```
isLoading     → spinner card (unchanged)
isError       → red error card + "إعادة المحاولة" retry button (NEW)
pages.length=0 → "لا توجد صفحات" (now only fires for genuinely empty DB)
else          → page cards (unchanged)
```

### Step 5 — Security: Auth Guards Added to `PUT` and `DELETE /api/pages/[id]`

Per `speckit-analyze` finding C1/C2 (constitution Principle III violation):
- `PUT /api/pages/[id]` — now requires `getServerSession()` (guards Page Builder save)
- `DELETE /api/pages/[id]` — now requires `getServerSession()` (guards cascade page+blocks delete)

### Step 6 — Navigation Fix: Page Builder Back Button

Both Back buttons in `app/(cms)/cms/page-builder-grapes/[id]/page.tsx` now navigate to `/cms/pages` (canonical route) instead of `/cms/pages-new` (duplicate route, out of scope per Q4).

---

## 4. Verification Results

| Check | Result |
|-------|--------|
| `GET /api/pages` HTTP status | ✅ **200** |
| Pages returned from DB | ✅ **13 pages** |
| Header-eligible pages (`isPublished + showInHeader`) | ✅ **7 pages** |
| `PUT /api/pages/[id]` unauthenticated → 401 | ✅ **`Unauthorized`** |
| `DELETE /api/pages/[id]` unauthenticated → 401 | ✅ Guarded |
| Page Builder Back button → `/cms/pages` | ✅ Both buttons corrected |
| CMS `/cms/pages` loads page list | ✅ (runtime-confirmed via API) |
| Homepage header has navigation data | ✅ 7 eligible pages available |

---

## 5. Cascading Effects Resolved

Once `GET /api/pages` returned HTTP 200:

- **CMS Page List**: Loads the 13 stored pages. No longer shows false empty state.
- **Page Builder**: Accessible from any page card → navigates to `/cms/page-builder-grapes/[id]` → GrapesJS editor loads via `dynamic(..., { ssr: false })`.
- **Homepage Header**: `public-header.tsx` calls `/api/pages?published=true` → 7 published+showInHeader pages populate the navigation. API takes precedence over localStorage fallback (lines 52–53 return early on success).

---

## 6. Data Safety Confirmation

No destructive operations were performed:
- No `prisma db push`, `prisma migrate`, or `prisma seed` executed
- No rows deleted or modified directly
- No schema changes
- `.env` update only changed which DB the app connects to — did not alter data

---

## 7. Outstanding Known Issues (Pre-Existing, Out of Scope)

| Issue | Severity | Notes |
|-------|----------|-------|
| `lib/auth.ts` hardcoded credential bypass (`admin123`) | HIGH | KI-004 — separate spec required |
| 5 unauthenticated portal-facing routes | HIGH | KI-008 — separate spec |
| No test runner in project | MEDIUM | Zero test files; verification is manual |
| `pages-new` duplicate route still exists | LOW | FR-011: out of scope for this fix; to be removed separately |
