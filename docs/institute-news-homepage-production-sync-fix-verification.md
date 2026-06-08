# Verification Checklist
## Feature: institute-news-homepage-production-sync-fix
**Branch:** `003-news-homepage-sync`  
**Date:** 2026-04-05  
**Environment URLs:**
- Local dev: `http://localhost:3100`
- Production: `https://sinaiinstitute.com`

---

## Context: What Was Changed

| Component | Before | After |
|-----------|--------|-------|
| CMS "أخبار عن المعهد" data source | `localStorage['homepage_institute_news']` | `GET /api/news?category=INSTITUTE_NEWS` |
| CMS "الأخبار العامة" data source | `localStorage['homepage_general_news']` | `GET /api/news?category=GENERAL_NEWS` |
| Public homepage institute news source | `localStorage['homepage_institute_news']` | `GET /api/news?category=INSTITUTE_NEWS&published=true` |
| Public homepage general news source | `localStorage['homepage_general_news']` | `GET /api/news?category=GENERAL_NEWS&published=true` |
| API field: publish flag | `published` (wrong) | `isPublished` (correct Prisma field) |
| API field: publish date | `publishedAt` (wrong) | `publishDate` (correct Prisma field) |
| Category of one existing DB record | `'NEWS'` | `'INSTITUTE_NEWS'` (data-only update) |

**Known DB state at time of fix (3 records total):**

| id | titleAr | category | isPublished |
|----|---------|----------|-------------|
| `cmkx1oyfs0008cwzgx9wlj9w7` | مواعيد امتحانات الفصل الدراسي الثاني | INSTITUTE_NEWS | true |
| `cmkx1oyga0009cwzgclf0fbnt` | ندوة علمية حول مستقبل السياحة في مصر | EVENTS | true |
| `cmkx1oyfb0007cwzgvio444ee` | بدء التسجيل للعام الدراسي 2026/2027 | ANNOUNCEMENTS | true |

> [!NOTE]
> No records exist with `category = 'GENERAL_NEWS'`. The General News section will render empty until records are added via the CMS. This is expected behaviour.

---

## Part 1 — Local Verification

> [!IMPORTANT]
> All local checks must run against the **remote Supabase database** (not a local SQLite). Confirm `.env` contains a `DATABASE_URL` pointing to Supabase before proceeding.

### Prerequisites

```bash
# Confirm DATABASE_URL points to Supabase, not a local DB
grep DATABASE_URL .env | head -1
# Expected: postgresql://...supabase...

# Start local dev server if not already running
PORT=3100 npx next dev
```

---

### 1.1 — API Endpoint Correctness

**Purpose:** Confirm the API returns correct data without throwing 500 errors and honours both `category` and `isPublished` filters.

```bash
# Check 1: All news records (no filter)
curl -s "http://localhost:3100/api/news" | python3 -m json.tool

# Check 2: Institute news only
curl -s "http://localhost:3100/api/news?category=INSTITUTE_NEWS"

# Check 3: Institute news — published only (used by public homepage)
curl -s "http://localhost:3100/api/news?category=INSTITUTE_NEWS&published=true"

# Check 4: General news (expected empty array — no records yet)
curl -s "http://localhost:3100/api/news?category=GENERAL_NEWS"
```

| # | Check | Pass Condition | Fail Condition |
|---|-------|----------------|----------------|
| L-API-1 | GET /api/news | Returns JSON array of 3 objects, HTTP 200 | `{"error":...}` or HTTP 500 |
| L-API-2 | GET ?category=INSTITUTE_NEWS | Returns 1 record with `"category":"INSTITUTE_NEWS"` | Empty array or error |
| L-API-3 | GET ?category=INSTITUTE_NEWS&published=true | Returns 1 record with `"isPublished":true` | Empty array or 500 |
| L-API-4 | GET ?category=GENERAL_NEWS | Returns `[]` (empty array — correct, no records yet) | Error object or non-array |

---

### 1.2 — CMS "أخبار عن المعهد" Section

**Purpose:** Confirm the CMS loads institute news from the database, not from localStorage.

**Steps:**
1. Open `http://localhost:3100/cms/homepage` in a **fresh private/incognito window** (clears localStorage state)
2. Log in with a CMS user account
3. Navigate to the **"أخبار عن المعهد"** section in the homepage manager
4. Open browser DevTools → **Network** tab → filter by `Fetch/XHR`

| # | Check | Pass Condition | Fail Condition |
|---|-------|----------------|----------------|
| L-CMS-1 | Network request on load | A request to `/api/news?category=INSTITUTE_NEWS` appears in Network tab with status 200 | No network request; data appears without any API call |
| L-CMS-2 | News item renders | "مواعيد امتحانات الفصل الدراسي الثاني" appears in the institute news list | Empty list or "لا توجد أخبار" when DB has data |
| L-CMS-3 | localStorage not used as source | DevTools → Application → Storage → Local Storage: `homepage_institute_news` key is **absent** | Key present and newer than the DB record |
| L-CMS-4 | Create new item | Fill form + click save → `POST /api/news` request appears → item added to UI list immediately | Error toast; no network request; item only added locally |
| L-CMS-5 | Delete item | Click delete → `DELETE /api/news?id=<id>` request appears → item removed from UI | Error toast; item disappears UI-only without network request |
| L-CMS-6 | Created item persists across reload | After creating item in L-CMS-4, do a full page reload → item still appears | Item disappears after reload (localStorage-only behaviour) |

---

### 1.3 — Public Homepage News Section

**Purpose:** Confirm the public homepage fetches and renders institute news from the database.

**Steps:**
1. Open `http://localhost:3100` in a **fresh private/incognito window**
2. Open DevTools → **Network** tab → filter by `Fetch/XHR`
3. Scroll to the "أخبار عن المعهد" section

| # | Check | Pass Condition | Fail Condition |
|---|-------|----------------|----------------|
| L-HOME-1 | Network request on load | Request to `/api/news?category=INSTITUTE_NEWS&published=true` appears with status 200 | No network request; section uses stale localStorage |
| L-HOME-2 | News card renders | "مواعيد امتحانات الفصل الدراسي الثاني" appears as a news card | Empty section when DB has a published record |
| L-HOME-3 | localStorage not used | DevTools → Application → Local Storage: `homepage_institute_news` key is **absent** | Key present with non-empty value |
| L-HOME-4 | General news section | Section renders without JS errors even though GENERAL_NEWS is empty | Browser console error related to `.map` on undefined |

---

### 1.4 — Cross-Browser / Cross-Session Isolation

**Purpose:** Confirm data is not limited to the session that wrote it.

**Steps:**

```bash
# From terminal: simulate a second "device" with no cookies/localStorage
# Add a test news item via CMS on one browser, then check via curl immediately
curl -s "http://localhost:3100/api/news?category=INSTITUTE_NEWS" | python3 -c \
  "import sys,json; items=json.load(sys.stdin); print(f'Total items: {len(items)}')"
```

| # | Check | Pass Condition | Fail Condition |
|---|-------|----------------|----------------|
| L-ISO-1 | curl sees same data as browser | Item count matches between `curl` output and CMS UI list | curl returns fewer items than CMS shows |
| L-ISO-2 | Incognito window shows same news | Open homepage in normal window AND incognito window simultaneously → same news cards | Incognito shows nothing; normal window shows news |
| L-ISO-3 | Different browser shows same data | Open homepage in Firefox (or another browser) with no localStorage for this site | No news shown in the second browser |

---

### 1.5 — Data Integrity Check

**Purpose:** Confirm no destructive changes occurred to existing production data.

```bash
# Verify all 3 original records still exist
curl -s "http://localhost:3100/api/news" | python3 -c \
  "import sys,json; items=json.load(sys.stdin); [print(f'{i[\"id\"]} | {i[\"category\"]} | {i[\"titleAr\"][:40]}') for i in items]"
```

Expected output (order may vary by `publishDate`):
```
cmkx1oyga0009cwzgclf0fbnt | EVENTS | ندوة علمية حول مستقبل السياحة في مصر
cmkx1oyfs0008cwzgx9wlj9w7 | INSTITUTE_NEWS | مواعيد امتحانات الفصل الدراسي الثاني
cmkx1oyfb0007cwzgvio444ee | ANNOUNCEMENTS | بدء التسجيل للعام الدراسي 2026/2027
```

| # | Check | Pass Condition | Fail Condition |
|---|-------|----------------|----------------|
| L-DATA-1 | All 3 original records exist | All 3 IDs present in output | Any ID missing |
| L-DATA-2 | EVENTS record unchanged | `cmkx1oyga0009cwzgclf0fbnt` has `category=EVENTS` | Category changed or record absent |
| L-DATA-3 | ANNOUNCEMENTS record unchanged | `cmkx1oyfb0007cwzgvio444ee` has `category=ANNOUNCEMENTS` | Category changed or record absent |
| L-DATA-4 | INSTITUTE_NEWS category correct | `cmkx1oyfs0008cwzgx9wlj9w7` has `category=INSTITUTE_NEWS` | Category is still `NEWS` (old value) |
| L-DATA-5 | No extra records created | Total count = 3 (plus any items you deliberately added during testing) | Unexpected duplicate or phantom records |

---

### 1.6 — TypeScript Compilation

```bash
npx tsc --noEmit 2>&1 | grep -E "app/api/news|app/\(public\)/page|app/\(cms\)/cms/homepage"
```

| # | Check | Pass Condition | Fail Condition |
|---|-------|----------------|----------------|
| L-TS-1 | No TS errors in modified files | Zero lines of output for the three grep patterns | Any TS error in `route.ts`, `page.tsx` (public), or `page.tsx` (CMS) |

---

## Part 2 — Production Verification

> [!CAUTION]
> Do not run any write or delete commands against the production URL during verification. Use only `GET` requests via curl. All write operations must go through the CMS UI.

### Prerequisites

```bash
# Verify deployment succeeded
# Check Vercel dashboard or run:
curl -sI "https://sinaiinstitute.com" | grep -E "HTTP|x-vercel-deployment-url"
```

---

### 2.1 — Production API Correctness

```bash
# Production API — institute news (published only)
curl -s "https://sinaiinstitute.com/api/news?category=INSTITUTE_NEWS&published=true" | python3 -m json.tool

# Production API — all news (sanity check)
curl -s "https://sinaiinstitute.com/api/news" | python3 -c \
  "import sys,json; items=json.load(sys.stdin); print(f'Total records: {len(items)}')"
```

| # | Check | Pass Condition | Fail Condition |
|---|-------|----------------|----------------|
| P-API-1 | GET /api/news returns data | JSON array, HTTP 200, ≥3 records | 500 error or `{"error":...}` |
| P-API-2 | INSTITUTE_NEWS filter works | Returns 1+ records with `"category":"INSTITUTE_NEWS"` | Empty array when DB has data |
| P-API-3 | isPublished filter works | All returned records have `"isPublished":true` | Records with `isPublished:false` included |
| P-API-4 | No 500 errors | HTTP status 200 on all three endpoints | Any HTTP 500 |

---

### 2.2 — Public Homepage for Normal Users

**Purpose:** Confirm news is visible to users who have never visited the site before and have no localStorage.

**Steps:**
1. Open `https://sinaiinstitute.com` in a **fresh incognito/private window** that has never visited the site
2. Scroll to the "أخبار عن المعهد" section
3. Open DevTools → Network → confirm API requests are made

| # | Check | Pass Condition | Fail Condition |
|---|-------|----------------|----------------|
| P-HOME-1 | Institute news renders for new visitor | "مواعيد امتحانات الفصل الدراسي الثاني" visible in the news section | Section is empty or shows "لا توجد أخبار" |
| P-HOME-2 | Network request made | `/api/news?category=INSTITUTE_NEWS&published=true` appears in Network tab | Section populates without any XHR (localStorage fallback) |
| P-HOME-3 | No JS console errors | Browser console shows no errors related to news fetch | `TypeError: cannot read property 'map' of undefined` or fetch error |
| P-HOME-4 | General news section stable | General news section renders without crash (even if empty) | Console error or broken UI layout |

---

### 2.3 — Cross-Device / Cross-Browser Verification

**Purpose:** Confirm the fix is truly cross-device and not session-scoped.

| # | Check | Steps | Pass Condition | Fail Condition |
|---|-------|-------|----------------|----------------|
| P-ISO-1 | Two different physical devices show same news | Open homepage on your device AND colleague's device simultaneously | Identical news items on both | Colleague sees news; you see none (or vice versa) |
| P-ISO-2 | Different browsers show same news | Open homepage in Chrome AND Firefox on same machine | Same news items in both browsers | Only one browser shows news |
| P-ISO-3 | curl output matches browser UI | `curl "https://sinaiinstitute.com/api/news?category=INSTITUTE_NEWS&published=true"` then compare with browser | Item count and titles match | curl returns more items than UI renders |
| P-ISO-4 | Mobile device shows news | Open homepage on a mobile phone (no prior site visit) | News section populated correctly | Empty section on mobile |

---

### 2.4 — CMS Persists Across Sessions (Production)

**Purpose:** Confirm CMS writes go to Supabase and are immediately visible to everyone.

**Steps:**
1. Log in to `https://sinaiinstitute.com/cms/homepage` on **Device A**
2. Create a new institute news item titled **"اختبار التحقق من قاعدة البيانات"**
3. Save the item
4. On **Device B** (or curl from terminal), check the public API immediately:

```bash
curl -s "https://sinaiinstitute.com/api/news?category=INSTITUTE_NEWS&published=true" | \
  python3 -c "import sys,json; items=json.load(sys.stdin); [print(i['titleAr']) for i in items]"
```

5. Open `https://sinaiinstitute.com` in an incognito window → verify new item appears
6. **Delete the test item** from the CMS after verification to keep production data clean

| # | Check | Pass Condition | Fail Condition |
|---|-------|----------------|----------------|
| P-CMS-1 | New item appears in curl output | "اختبار التحقق من قاعدة البيانات" appears in curl response immediately after CMS save | Item absent from curl; only visible in CMS browser session |
| P-CMS-2 | New item appears on public homepage | Incognito browser window on Device B shows the new item | Item not visible on Device B |
| P-CMS-3 | Delete propagates | After CMS delete, `curl` no longer returns the test item | Item still returned by API after deletion |

---

### 2.5 — Cache and Revalidation Behaviour

> [!NOTE]
> Because the news section on the public homepage is rendered entirely client-side via `useEffect` + `fetch`, there is **no Next.js ISR/SSG cache** to invalidate. Data is fetched live on every page load from the Supabase database via the API route.

| # | Check | Pass Condition | Fail Condition |
|---|-------|----------------|----------------|
| P-CACHE-1 | New item visible immediately after CMS publish (no Vercel rebuild needed) | Item appears on homepage within 1–2 seconds of page load after CMS save | Item requires a Vercel redeploy to appear |
| P-CACHE-2 | Vercel deployment cache headers | `curl -sI "https://sinaiinstitute.com/api/news"`: check `Cache-Control` header | `Cache-Control: no-store` or `max-age=0` (API routes should not be edge-cached with stale data) | Header shows `s-maxage=31536000` with no revalidation |
| P-CACHE-3 | Hard reload shows fresh data | After browser hard refresh (`Ctrl+Shift+R`) on homepage | Updated news appears immediately | Old news from prior load persists after hard refresh |

---

### 2.6 — Data Integrity Check (Production)

```bash
# Verify all 3 original records are intact in production
curl -s "https://sinaiinstitute.com/api/news" | python3 -c \
  "import sys,json; items=json.load(sys.stdin); [print(f'{i[\"id\"]} | {i[\"category\"]} | {i[\"titleAr\"][:40]}') for i in items]"
```

| # | Check | Pass Condition | Fail Condition |
|---|-------|----------------|----------------|
| P-DATA-1 | All 3 original records present | All 3 known IDs in output | Any original ID missing |
| P-DATA-2 | No category regressions | `cmkx1oyfs0008cwzgx9wlj9w7` shows `INSTITUTE_NEWS` | Category shows `NEWS` (old value) |
| P-DATA-3 | EVENTS and ANNOUNCEMENTS records untouched | Other two records retain original `category` and `titleAr` | Any field changed on non-INSTITUTE_NEWS records |

---

## Part 3 — Rollback Triggers

Initiate a rollback **immediately** if any of these conditions are observed in production after deployment:

| Trigger | Condition | Rollback Action |
|---------|-----------|-----------------|
| 🔴 **API total failure** | `GET /api/news` returns HTTP 500 for more than 30 seconds | `git revert` the three file changes + redeploy |
| 🔴 **Homepage crashes** | Public homepage throws a JavaScript error that prevents page render | Revert `app/(public)/page.tsx` to prior commit + redeploy |
| 🔴 **CMS crash on load** | CMS homepage manager throws unhandled error on mount | Revert `app/(cms)/cms/homepage/page.tsx` to prior commit + redeploy |
| 🟠 **Data loss detected** | Any of the 3 original DB records missing from `GET /api/news` response | Do NOT add code changes; restore record directly in Supabase dashboard |
| 🟠 **Category regression** | `cmkx1oyfs0008cwzgx9wlj9w7` shows `category = 'NEWS'` again | Re-run SQL update in Supabase: `UPDATE "News" SET category = 'INSTITUTE_NEWS' WHERE id = 'cmkx1oyfs0008cwzgx9wlj9w7';` |
| 🟡 **Institute news section empty** | Public homepage shows no news cards but API returns data correctly | Check browser console for JS mapping error; may require a minor hotfix to field mapping in `page.tsx` |
| 🟡 **CMS list empty on load** | CMS shows empty institute news list but `curl /api/news?category=INSTITUTE_NEWS` returns data | Check for auth session issue; CMS fetch may be failing due to expired session cookie |

### Rollback Commands

```bash
# Option 1: Revert all three file changes in one commit
git revert HEAD --no-edit
git push origin 003-news-homepage-sync

# Option 2: Revert a specific file to its pre-fix state
git checkout <commit-before-fix> -- app/api/news/route.ts
git checkout <commit-before-fix> -- app/\(public\)/page.tsx
git checkout <commit-before-fix> -- app/\(cms\)/cms/homepage/page.tsx
git add . && git commit -m "rollback(news): revert news sync fix" && git push

# Option 3: Restore the category data change if accidentally reverted in DB
# Run in Supabase SQL editor:
# UPDATE "News" SET category = 'INSTITUTE_NEWS', "updatedAt" = NOW()
# WHERE id = 'cmkx1oyfs0008cwzgx9wlj9w7';
```

> [!WARNING]
> Reverting the code does **not** undo the database `category` update. The DB change (`NEWS` → `INSTITUTE_NEWS`) is safe to keep regardless of code state — it is a correct classification and does not break the pre-fix behaviour.

---

## Summary: Verification Sign-off

| Area | Local | Production |
|------|-------|------------|
| API field correctness | ✅ Verified (curl L-API-1 through L-API-4) | ⬜ Pending deployment |
| CMS loads from DB | ✅ Verified (L-CMS-1, L-CMS-2) | ⬜ Pending deployment |
| Public homepage renders news | ✅ Verified (L-HOME-1, L-HOME-2) | ⬜ Pending deployment |
| Cross-session / cross-device | ✅ Verified via curl isolation (L-ISO-1) | ⬜ Pending deployment |
| Data integrity (3 records intact) | ✅ All 3 original records confirmed | ⬜ Pending deployment |
| TypeScript compilation | ✅ No errors in modified files | N/A |
| Cache behaviour | N/A (CSR fetch, no ISR) | ⬜ Confirm P-CACHE-1 after deploy |
