# Institute News Homepage Sync Fix — Implementation Review

**Feature Branch**: `003-news-homepage-sync`  
**Date**: 2026-04-05  
**Status**: Code fix complete — awaiting deployment and NEXTAUTH_URL correction  

---

## Root Cause (Confirmed)

Three independent bugs combined to produce the save failure and homepage invisibility:

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 1 | `GET` filter used `published` (non-existent) instead of `isPublished` | `app/api/news/route.ts:18` | All news returned regardless of publish state; endpoint effectively broken |
| 2 | `GET` orderBy used `publishedAt` (non-existent) instead of `publishDate` | `app/api/news/route.ts:22` | Prisma P2009 at runtime — endpoint returns HTTP 500 on every request |
| 3 | `POST` wrote `published`/`publishedAt` instead of `isPublished`/`publishDate` | `app/api/news/route.ts:68–84` | Saves would fail with Prisma P2009 even if auth passed |
| 4 | `PUT` used raw body spread (`const { id, ...data } = body`) | `app/api/news/route.ts:106` | Prisma P2009 — all edit operations would fail once auth was restored |
| 5 | Public homepage (`/`) read from `localStorage` | `app/(public)/page.tsx` | News invisible to any visitor who hadn't used the CMS on that exact browser |
| 6 | CMS homepage manager read/wrote `localStorage` | `app/(cms)/cms/homepage/page.tsx` | News state isolated per-device, never persisted to DB |
| 7 | `NEXTAUTH_URL` wrong in Vercel dashboard | Vercel env vars | `getServerSession` returns `null` on all production POST/PUT/DELETE → HTTP 401 |

**Shared backend path**: Both "أخبار عن المعهد" (`handleAddInstituteNews`) and "أخبار" (`handleAddGeneralNews`) call the same `/api/news` endpoint with identical body shape `{ title, content, image, category, published }`. The only difference is `category: 'INSTITUTE_NEWS'` vs `category: 'GENERAL_NEWS'`. All failures affect both sections equally.

**Image/storage path**: Image field is a Cloudinary URL resolved at form submit time. No image upload occurs inside `/api/news`. Image failures are independent of DB write failures.

**Auth path**: `getServerSession(authOptions)` is called at the top of POST, PUT, and DELETE handlers. This is correct — auth guard is preserved. The failure is solely from `NEXTAUTH_URL` pointing to the wrong domain in Vercel.

---

## Changes Made (Code)

### `app/api/news/route.ts`
- **GET**: `where.published` → `where.isPublished`; `orderBy: { publishedAt }` → `orderBy: { publishDate }`
- **POST**: Field mapping corrected — `title→titleAr`, `content→contentAr`, `published→isPublished`, `publishedAt→publishDate`; `titleEn`/`contentEn` default to `''`
- **PUT**: Raw body spread removed; explicit field mapping added (`title→titleAr`, `content→contentAr`, `published→isPublished`, `image→image`, `category→category`); conditional updates (only fields present in body); `publishDate` set on re-publish

### `app/(public)/page.tsx`
- `localStorage` reads for `homepage_institute_news` and `homepage_general_news` replaced with `fetch('/api/news?category=INSTITUTE_NEWS&published=true')` and `fetch('/api/news?category=GENERAL_NEWS&published=true')` on `useEffect`
- Graceful empty state rendered when fetch returns `[]`

### `app/(cms)/cms/homepage/page.tsx`
- On mount: `GET /api/news?category=INSTITUTE_NEWS` and `GET /api/news?category=GENERAL_NEWS` replace `localStorage.getItem('homepage_institute_news')`
- Save (`handleAddInstituteNews`, `handleAddGeneralNews`): POSTs to `/api/news` with explicit `category` field; replaces `localStorage.setItem`
- Edit: PUTs to `/api/news` with `id`; replaces `localStorage.setItem`
- Delete: `DELETE /api/news?id=...`; replaces `localStorage.removeItem` (item-level splice)

---

## Spec Inconsistency Fixed (Analysis I1)

`spec.md FR-016` previously said "trigger a redeploy" after updating `NEXTAUTH_URL`, which directly contradicted `FR-018` ("no additional redeploy is needed"). The stale instruction was removed from FR-016. FR-018 remains authoritative.

---

## Data Integrity Verification (Pre-Commit)

Checked via Supabase Management API (`/v1/projects/.../database/query`):

| Record ID | Category | isPublished | titleAr |
|-----------|----------|-------------|---------|
| `cmkx1oyfs0008cwzgx9wlj9w7` | INSTITUTE_NEWS | ✅ true | مواعيد امتحانات الفصل الدراسي الثاني |
| `cmkx1oyga0009cwzgclf0fbnt` | EVENTS | ✅ true | ندوة علمية حول مستقبل السياحة في مصر |
| `cmkx1oyfb0007cwzgvio444ee` | ANNOUNCEMENTS | ✅ true | بدء التسجيل للعام الدراسي 2026/2027 |

**3 original records intact.** 2 test artifacts from previous session (`titleAr='test'`) were deleted via SQL with double confirmation (`AND "titleAr" = 'test'` guard).

---

## Local Verification Results

| Task | Check | Result |
|------|-------|--------|
| T001 | Production `GET /api/news` | HTTP 500 ✅ (expected pre-deploy) |
| T010 | Local `GET /api/news` | HTTP 200 ✅ |
| T012 | `?category=INSTITUTE_NEWS&published=true` | 1 record ✅ |
| T015 | `?category=GENERAL_NEWS&published=true` | 0 records (graceful) ✅ |
| T016 | TypeScript gate `npx tsc --noEmit` | 0 new errors in our files ✅ (pre-existing errors in unrelated files documented) |
| T021 | Data integrity | 3 original records ✅ |
| T022 | Homepage caching | CSR (`'use client'` + `useEffect`) — no ISR ✅ propagation instant |
| Lint | `npx eslint` on our files | Pre-existing errors only; no new errors from our changes ✅ |

---

## Pre-Existing Lint Errors (Documented, Not Introduced)

All errors in modified files are pre-existing:
- `route.ts:13` — `any` type (pre-existing)
- `route.ts:31,85,131,166` — `'error' is defined but never used` in catch blocks (pre-existing)
- `app/(cms)/cms/homepage/page.tsx` — `any` in lines 173, 496, 500, 586 (pre-existing)

These do not affect runtime behavior and are not introduced by this fix.

---

## Remaining Steps (Operator)

### Step 1 — Commit and Deploy (T028–T032)
```bash
git add app/api/news/route.ts app/\(public\)/page.tsx app/\(cms\)/cms/homepage/page.tsx \
        docs/domain-model.md docs/feature-inventory.md docs/known-issues.md \
        docs/institute-news-homepage-production-sync-fix-review.md \
        specs/003-news-homepage-sync/spec.md specs/003-news-homepage-sync/tasks.md

git commit -m "fix(news): wire homepage and CMS to /api/news; fix GET filter, PUT field mapping

- GET: published→isPublished, publishedAt→publishDate (fixes HTTP 500)
- POST: title→titleAr, content→contentAr, published→isPublished
- PUT: remove raw body spread; explicit field mapping (prevents Prisma P2009)
- PUT: set publishDate on re-publish
- app/(public)/page.tsx: replace localStorage reads with /api/news fetch
- app/(cms)/cms/homepage/page.tsx: replace all localStorage RM with API calls
- docs: domain-model, feature-inventory, known-issues updated
- spec: FR-016 stale redeploy instruction removed (I1 fix)

[SECURITY]: getServerSession check preserved on ALL mutating handlers (POST/PUT/DELETE)
Pre-existing lint errors in route.ts and cms/homepage.tsx documented — not introduced
Refs: 003-news-homepage-sync, FR-001–FR-020, SC-001–SC-006"

git push origin 003-news-homepage-sync
```

### Step 2 — Monitor Vercel Build (T031)
- Open `vercel.com/dashboard` → confirm build starts within 30s → confirm success (~2–3 min)
- If build fails: `git revert HEAD --no-edit && git push origin main`

### Step 3 — Confirm Production GET 200 (T032)
```bash
curl -s -o /dev/null -w "%{http_code}" "https://sinaiinstitute.com/api/news"
# Expected: 200
```

### Step 4 — Correct NEXTAUTH_URL (T033–T035) 👤 Operator
1. Vercel dashboard → project → Settings → Environment Variables
2. Locate `NEXTAUTH_URL` → confirm current value is NOT `https://sinaiinstitute.com`
3. Update to exactly: `https://sinaiinstitute.com` (no trailing slash)
4. Confirm `NEXTAUTH_SECRET` is present and non-empty
5. No redeploy needed — takes effect on next request

### Step 5 — Test CMS Write on Production (T036–T037) 👤 Operator
1. Log into `https://sinaiinstitute.com/cms`
2. Open homepage manager → "أخبار عن المعهد"
3. Add test item: `اختبار - لا تحذف` → save → confirm success toast (HTTP 201)
4. Delete ONLY that test item → confirm removed

---

## FR Coverage Status

| FR | Description | Status |
|----|-------------|--------|
| FR-001 | Homepage fetches from /api/news | ✅ Implemented |
| FR-002 | CMS loads from /api/news | ✅ Implemented |
| FR-003 | CMS saves via /api/news | ✅ Implemented (blocked by NEXTAUTH_URL until Step 4) |
| FR-005 | isPublished filter correctness | ✅ Fixed in route.ts |
| FR-011 | publishDate orderBy | ✅ Fixed in route.ts |
| FR-012 | POST field mapping | ✅ Fixed in route.ts |
| FR-013 | CMS field → schema mapping | ✅ CMS sends `content`, route maps to `contentAr` |
| FR-015 | category query param filter | ✅ Already existed in GET handler |
| FR-016 | NEXTAUTH_URL correct in Vercel | ⏳ Operator action required (Step 4) |
| FR-018 | Deploy code first, then NEXTAUTH_URL | ✅ Plan confirmed |
| FR-019 | PUT explicit field mapping | ✅ Fixed in route.ts |
| FR-020 | Data integrity pre-commit | ✅ Verified — 3 records intact |
