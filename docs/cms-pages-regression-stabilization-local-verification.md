# CMS Pages Regression — Local Verification Steps

**Feature**: `002-cms-pages-fix`  
**Branch**: `002-cms-pages-fix`  
**Date**: 2026-03-29  
**Replicate**: Run these commands after any future restart or Supabase resume to confirm the fix is still active.

---

## Pre-Conditions Checklist

Before running any verification step:

- [ ] Supabase project `eacpjbbpwonwmthutxow` is **ACTIVE** (not paused) — check dashboard or test step V1 below
- [ ] `.env` contains the correct `DATABASE_URL` (port `5432`, valid password)
- [ ] Dev server has been started (`npm run dev`) **after** the `.env` was last updated
- [ ] Dev server is listening on `:3001` — confirm with: `ss -tlnp | grep :3001`

---

## V1 — Database Connectivity (T002/T014 Gate)

```bash
# Run from repo root
curl -s -o /tmp/pages_check.json http://localhost:3001/api/pages

python3 -c "
import json
d = json.load(open('/tmp/pages_check.json'))
if 'error' in d:
    print('FAIL — DB error:', d.get('error'))
    details = d.get('details','')
    if 'FATAL' in details:
        print('HINT: Supabase project may be paused — resume from dashboard')
    elif 'password' in details.lower() or 'authentication' in details.lower():
        print('HINT: Wrong password in .env DATABASE_URL — update from Supabase dashboard')
else:
    pages = d.get('pages', [])
    print('PASS — pages_count:', len(pages))
"
```

**Expected**: `PASS — pages_count: 13` (or any N ≥ 0 without `error` key)  
**Failure hints**:
- `FATAL: Tenant or user not found` → Supabase project is **paused** — resume from dashboard
- `authentication failed` → Wrong password in `.env` — get current password from Supabase Settings → Database

---

## V2 — CMS Page List Error State (US1 — FR-002)

**Purpose**: Confirm the error card shows on failure instead of "لا توجد صفحات"

```bash
# Step 1: temporarily break the password (add one wrong char)
# Edit .env: change DATABASE_URL password to something invalid

# Step 2: restart server
pkill -f "next-server"; npm run dev &

# Step 3: after server is ready
curl -s http://localhost:3001/api/pages | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Has error key:', 'error' in d)
# Should be True — 500 when DB unreachable
"

# Step 4: open http://localhost:3001/cms/pages in browser
# EXPECTED: Red error card with Arabic text + "إعادة المحاولة" retry button
# NOT EXPECTED: "لا توجد صفحات" (that would mean the bug is still present)

# Step 5: restore correct password and restart server
# Step 6: open /cms/pages again — page list should load
```

**Test IDs**: T016–T020 in `specs/002-cms-pages-fix/tasks.md`

---

## V3 — Auth Guards on Mutating Endpoints (T035/T037)

```bash
# PUT guard — must return 401
curl -s -X PUT http://localhost:3001/api/pages/any-id \
  -H "Content-Type: application/json" \
  -d '{"titleAr":"test"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('PUT guard:', d.get('error','MISSING — VULNERABILITY'))"
# Expected: PUT guard: Unauthorized

# DELETE guard — must return 401
curl -s -X DELETE http://localhost:3001/api/pages/any-id \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('DELETE guard:', d.get('error','MISSING — VULNERABILITY'))"
# Expected: DELETE guard: Unauthorized

# GET /api/pages still public (no auth required)
curl -s http://localhost:3001/api/pages | python3 -c "import sys,json; d=json.load(sys.stdin); print('GET public:', 'pages' in d)"
# Expected: GET public: True
```

---

## V4 — Homepage Header Navigation (US3 — T025/T026)

```bash
# Check which pages should appear in header
curl -s http://localhost:3001/api/pages | python3 -c "
import json
d = json.load(open('/tmp/pages_check.json'))
pages = d.get('pages', [])
header_pages = [p for p in pages if p.get('isPublished') and p.get('showInHeader')]
print('Header-eligible pages:', len(header_pages))
for p in sorted(header_pages, key=lambda x: x.get('order',99)):
    parentId = p.get('parentId')
    print('  %s/%s%s' % (
        '[child] ' if parentId else '',
        p.get('slug','?'),
        ' | ' + p.get('titleAr','?')
    ))
"
```

**Visual check**: Open `http://localhost:3001/` → verify the header nav shows the matching pages (not just "الرئيسية")  
**Expected (verified 2026-03-29)**: 7 published+showInHeader pages available

---

## V5 — Page Builder Navigation (US2 — T021/T022/T036)

```bash
# Confirm Back buttons navigate to canonical /cms/pages (not /cms/pages-new)
grep "router.push" "app/(cms)/cms/page-builder-grapes/[id]/page.tsx"
# Expected: ALL occurrences show '/cms/pages' — none should show '/cms/pages-new'
```

**Visual check**: 
1. Login → `/cms/pages` → click **Page Builder** on any page  
2. Confirm GrapesJS editor loads at `/cms/page-builder-grapes/[id]`  
3. Click "رجوع" (Back) → confirm browser navigates to `/cms/pages`

---

## V6 — Type Check and Lint

```bash
# Must complete with 0 new errors
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"

# Lint on changed files
npx next lint --file "app/(cms)/cms/pages/page.tsx" \
              --file "app/api/pages/[id]/route.ts" 2>&1 | tail -5
```

**Note**: Pre-existing suppressed TypeScript errors in the build are acceptable per constitution. V6 checks for **new** errors introduced by this fix only.

---

## V7 — End-to-End Smoke Test

Run in order after all above pass:

1. `GET http://localhost:3001/api/pages` → `200 + pages array`
2. Browser: `http://localhost:3001/cms/pages` (logged in) → 13 page cards visible
3. Browser: click **Page Builder** on any page → GrapesJS opens
4. Browser: click **رجوع** in GrapesJS → returns to `/cms/pages`
5. Browser: `http://localhost:3001/` → header nav has >1 link (beyond "الرئيسية")
6. Browser: unauthenticated `PUT /api/pages/[id]` → `401 Unauthorized`
7. Browser: unauthenticated `DELETE /api/pages/[id]` → `401 Unauthorized`

---

## Troubleshooting Quick Reference

| Symptom | Most Likely Cause | Action |
|---------|------------------|--------|
| `FATAL: Tenant or user not found` | Supabase project paused | Resume from Supabase dashboard |  
| `authentication failed` | Wrong password in `.env` | Get password from Supabase Settings → Database |
| API returns 200 but empty `pages: []` | DB empty (no rows in Page table) | Check Supabase Table Editor → Page table row count |
| `/cms/pages` shows "لا توجد صفحات" after fix | `isError` state not triggering | Check browser console — should show `Error loading pages` |
| Page Builder shows blank canvas | Normal for new pages (no saved blocks) | Add content then save |
| Header still shows only "الرئيسية" | All pages have `showInHeader: false` or `isPublished: false` | Edit a page in CMS and enable both flags |
| `PUT /api/pages/[id]` returns 200 without auth | Auth guard missing/reverted | Check `app/api/pages/[id]/route.ts` for `getServerSession` |
