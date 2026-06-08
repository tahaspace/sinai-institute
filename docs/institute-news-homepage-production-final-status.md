# Institute News Homepage Sync Fix — Final Status
**Feature:** institute-news-homepage-production-sync-fix  
**Assessment Date:** 2026-04-05T20:21 (UTC+2)  
**Assessed By:** Antigravity (automated verification run)

---

## 1. Implementation Status — Local

**✅ IMPLEMENTED LOCALLY — NOT YET COMMITTED**

The code fix is present in the working tree on branch `003-news-homepage-sync` but has **not been committed** to that branch. The three modified files appear as `modified` (unstaged) in `git status`:

| File | Local State | Git State |
|------|-------------|-----------|
| `app/api/news/route.ts` | ✅ Fixed | ⚠️ Unstaged (not committed) |
| `app/(public)/page.tsx` | ✅ Fixed | ⚠️ Unstaged (not committed) |
| `app/(cms)/cms/homepage/page.tsx` | ✅ Fixed | ⚠️ Unstaged (not committed) |

**Local API verification (vs. remote Supabase DB):**

```
GET http://localhost:3100/api/news               → HTTP 200 ✅ (3 records)
GET http://localhost:3100/api/news?category=INSTITUTE_NEWS → HTTP 200 ✅ (1 record)
GET http://localhost:3100/api/news?category=INSTITUTE_NEWS&published=true → HTTP 200 ✅ (1 record)
GET http://localhost:3100/api/news?category=GENERAL_NEWS → HTTP 200 ✅ (empty array, expected)
```

---

## 2. Deployment Status — Vercel / Production

**🔴 NOT DEPLOYED**

The fix has not been merged to `main` or pushed to any remote branch. The `origin/main` branch contains the **unfixed code**:

```
origin/main → commit ff29e76 "fix: add key prop to Dialog to force re-render"
```

Confirmed by inspecting `origin/main:app/api/news/route.ts` — it still contains the **original broken field names**:

| Field | origin/main (live) | Local fix (003-news-homepage-sync) |
|-------|-------------------|-------------------------------------|
| Publish flag filter | `where.published` ❌ | `where.isPublished` ✅ |
| Order field | `publishedAt: 'desc'` ❌ | `publishDate: 'desc'` ✅ |
| POST create flag | `published: published ?? true` ❌ | `isPublished: published ?? true` ✅ |
| POST date field | `publishedAt: ...` ❌ | `publishDate: ...` ✅ |

The `origin/main` public homepage (`app/(public)/page.tsx`) still reads from:
```
localStorage.getItem('homepage_institute_news')   ← old broken code, confirmed
```

---

## 3. Production Verification Results

**🔴 PRODUCTION IS NOT FIXED**

All production API checks failed with HTTP 500:

| Check | Endpoint | Result | Status |
|-------|----------|--------|--------|
| P-API-1 | `GET /api/news` | `{"error":"فشل في جلب الأخبار"}` — HTTP 500 | ❌ FAIL |
| P-API-2 | `GET /api/news?category=INSTITUTE_NEWS` | HTTP 500 | ❌ FAIL |
| P-API-3 | `GET /api/news?category=INSTITUTE_NEWS&published=true` | HTTP 500 | ❌ FAIL |

**Root cause of production 500:** The live `route.ts` references `published` and `publishedAt` — fields that do not exist in the Prisma schema — causing Prisma to throw a runtime error on every request.

**Public homepage behaviour on production:**  
`x-nextjs-prerender: 1` and `age: 594390` in production response headers indicate the homepage HTML is being served from a prerendered/CDN-cached snapshot. The news section reads from `localStorage` (old code), which is empty for every new visitor → **news section is empty for all normal users**.

Remaining 003 verification checklist items were not runnable because the prerequisite API check (P-API-1) failed.

---

## 4. Final Live Status

> [!CAUTION]
> **NOT FIXED IN PRODUCTION**

| Dimension | Status |
|-----------|--------|
| Code implemented locally | ✅ Yes — working, locally verified |
| Code committed to branch | ❌ No — changes are unstaged |
| Code pushed to remote | ❌ No — `003-news-homepage-sync` not pushed |
| Code merged to `main` | ❌ No |
| Deployed to Vercel | ❌ No |
| Production API working | ❌ No — HTTP 500 on all `/api/news` requests |
| Public homepage shows institute news | ❌ No — empty for all new/normal users |
| CMS reads from database | ❌ No — live CMS still uses `localStorage` |

---

## 5. Remaining Blockers

| # | Blocker | Priority | Required Action |
|---|---------|----------|-----------------|
| B1 | **Fix not committed** | 🔴 Critical | `git add app/api/news/route.ts app/\(public\)/page.tsx app/\(cms\)/cms/homepage/page.tsx && git commit -m "fix(news): sync institute and general news to Supabase via API"` |
| B2 | **Fix not merged to `main`** | 🔴 Critical | `git checkout main && git merge 003-news-homepage-sync` (or open a PR for review) |
| B3 | **Fix not pushed to origin** | 🔴 Critical | `git push origin main` to trigger Vercel redeploy |
| B4 | **Vercel redeploy not triggered** | 🔴 Critical | Pushing to `origin/main` will auto-trigger Vercel deployment (CI/CD already configured) |
| B5 | **Production API is currently returning HTTP 500 for all news requests** | 🟠 Ongoing | Resolved automatically once B1–B4 are completed |
| B6 | **No `GENERAL_NEWS` records in Supabase** | 🟡 Cosmetic | Post-deploy: add general news items via the CMS if that section should be populated |

---

## 6. Exact Deployment Commands

Run these in sequence after confirming no other uncommitted work should be excluded:

```bash
# Step 1: Stage only the three fix files (keep other work uncommitted)
git add app/api/news/route.ts \
        "app/(public)/page.tsx" \
        "app/(cms)/cms/homepage/page.tsx"

# Step 2: Commit the fix
git commit -m "fix(news): sync institute and general news to Supabase via API

- Fix field name mismatches in /api/news (published→isPublished, publishedAt→publishDate)
- Wire public homepage to fetch from /api/news instead of localStorage
- Wire CMS homepage manager to read/write via /api/news CRUD
- Remove localStorage side-effects for institute and general news sections"

# Step 3: Merge to main
git checkout main
git merge 003-news-homepage-sync --no-ff -m "merge(003): institute-news-homepage-production-sync-fix"

# Step 4: Push to trigger Vercel deploy
git push origin main

# Step 5: After deploy (allow ~60s), run production verification
curl -sI "https://sinaiinstitute.com/api/news" | grep HTTP
curl -s "https://sinaiinstitute.com/api/news?category=INSTITUTE_NEWS&published=true" | python3 -m json.tool
```

---

## 7. Post-Deploy Acceptance Criteria

After completing the deployment steps above, these must all pass before the fix is considered **live and resolved**:

- [ ] `GET https://sinaiinstitute.com/api/news` → HTTP 200 with JSON array
- [ ] `GET https://sinaiinstitute.com/api/news?category=INSTITUTE_NEWS&published=true` → returns record `cmkx1oyfs0008cwzgx9wlj9w7`
- [ ] Opening `https://sinaiinstitute.com` in a fresh incognito window shows "مواعيد امتحانات الفصل الدراسي الثاني" in the institute news section
- [ ] A colleague on a different device confirms the same news is visible without any localStorage involvement
