# Security Triage Phase 0 — Local Pre-Deployment Verification Plan

**Purpose**: Verify all phase-0 changes locally before running `vercel --prod`.  
**Precondition**: Operator pre-work (T005–T011) must be complete — Vercel dashboard vars rotated and set.  
**Local base URL**: `http://localhost:3001` (per `.env` `NEXTAUTH_URL`)  
**Database target**: External Supabase PostgreSQL (eu-west-1) — `DATABASE_URL` from `.env`  
**Auth credentials (local only)**: `admin@sainaiinstitute.com` / `admin123`  

> ⚠️ **Warning**: Local `npm run dev` connects to the PRODUCTION Supabase database. All write operations during verification will affect live data. Use read-heavy checks first; minimize writes; clean up any test records created.

---

## Phase A — Static Checks (No Server Required)

Run these before starting the dev server. They must all pass.

### A1 — TypeScript

```bash
npx tsc --noEmit 2>&1 | tee /tmp/tsc-output.txt
grep -c "error TS" /tmp/tsc-output.txt || echo "0 errors"
```

**Pass**: Zero NEW errors introduced by the branch. Pre-existing `.next/types/validator.ts` errors referencing missing `.js` files are pre-existing and acceptable — confirm they are NOT in files changed by this branch.  
**Fail**: Any error in `lib/prisma.ts`, `app/api/pages/route.ts`, `app/api/upload-image/route.ts`, `app/api/upload-media/route.ts`, or `prisma/seed.ts`.

To confirm errors are pre-existing (not branch-introduced):
```bash
git stash && npx tsc --noEmit 2>&1 | grep -c "error TS" ; git stash pop
```
Both counts must be equal.

---

### A2 — Lint

```bash
npm run lint 2>&1 | tee /tmp/lint-output.txt
```

**Pass**: No new errors in changed files.  
**Fail**: Any ESLint error in the 5 changed route files or `lib/prisma.ts`.

---

### A3 — vercel.json Integrity

```bash
python3 -c "
import json
d = json.load(open('vercel.json'))
assert 'env' not in d, 'FAIL: env block still present'
print('PASS: vercel.json clean — no env block')
"
```

**Pass**: Prints `PASS`.  
**Fail**: Any error or `FAIL:` prefix.

---

### A4 — No Hardcoded Credentials in Code

```bash
grep -rn \
  "SinaiInstitute2026\|neon.tech\|supabase.com:5432\|getDatabaseUrl\|hardcoded\|postgresql://postgres\." \
  lib/prisma.ts app/api/ 2>/dev/null
echo "Exit code: $?"
```

**Pass**: No output (zero matches).  
**Fail**: Any match found.

---

### A5 — Auth Guards Present on All 4 Guarded Endpoints

```bash
for f in \
  app/api/pages/route.ts \
  app/api/upload-image/route.ts \
  app/api/upload-media/route.ts; do
  count=$(grep -c "getServerSession" "$f" 2>/dev/null || echo 0)
  echo "$count matches in $f"
done
```

**Pass**: Each file shows `1` or `2` matches (pages/route.ts has 2 — one per POST/PATCH).  
**Fail**: Any file shows `0`.

---

### A6 — Auth Guards Also Present on Import Line

```bash
grep -n "authOptions\|getServerSession" \
  app/api/pages/route.ts \
  app/api/upload-image/route.ts \
  app/api/upload-media/route.ts
```

**Pass**: Both `getServerSession` and `authOptions` appear in imports AND in handler bodies for each file.  
**Fail**: Import present but not used in body, or body check present but import missing.

---

### A7 — Seed Production Guard

```bash
NODE_ENV=production npx tsx prisma/seed.ts 2>&1 | head -5
echo "Exit code: $?"
```

**Pass**: Output contains `SEED BLOCKED` and exit code is `1`.  
**Fail**: Script proceeds past the guard OR exit code is `0`.

Also verify `VERCEL_ENV` trigger:
```bash
VERCEL_ENV=production NODE_ENV=development npx tsx prisma/seed.ts 2>&1 | head -3
echo "Exit code: $?"
```

**Pass**: Also blocked (exit 1).

---

### A8 — Debug Tool Removed

```bash
ls public/check-localstorage.html 2>&1
```

**Pass**: `No such file or directory`.  
**Fail**: File still present.

---

### A9 — Git Diff Review

```bash
git diff main -- \
  vercel.json \
  lib/prisma.ts \
  prisma/seed.ts \
  app/api/pages/route.ts \
  app/api/upload-image/route.ts \
  app/api/upload-media/route.ts
```

**Manual review**: Read every line of output.  
**Pass**: No credential, connection string, password, or API key appears anywhere in the diff.  
**Fail**: Any secret value in the diff — STOP immediately.

---

## Phase B — Database Connectivity (Dev Server Required)

Start the dev server in a separate terminal and leave it running for all B and C checks.

```bash
npm run dev 2>&1 | tee /tmp/devserver.log
```

Wait for: `▲ Next.js ... ready on http://localhost:3001`

### B1 — Prisma Can Reach Supabase

```bash
curl -s http://localhost:3001/api/departments | python3 -m json.tool
```

**Pass**: Returns a JSON object with a `departments` array (may be empty `[]` but must not be an error object).  
**Database error signal**: Response contains `"error"` key with Prisma error codes:
- `P1001`: Cannot connect to Supabase (wrong host, port, or credentials)
- `P1002`: Timeout (Supabase connection limit exhausted or firewall)
- `P2021`: Table does not exist (schema out of sync)

**Fail**: Any JSON with an `error` key, or non-JSON response.

---

### B2 — Distinguish App Error vs Database Error

If B1 fails, isolate the cause:

```bash
# Check raw dev server log for Prisma error codes
grep -E "P[0-9]{4}|prisma|PrismaClient|connection" /tmp/devserver.log | tail -20
```

| Error pattern | Cause | Action |
|---------------|-------|--------|
| `P1001: Can't reach database server` | Wrong DATABASE_URL or Supabase down | Check `.env` DATABASE_URL — verify host, port, password |
| `P1002: Database server reached but timed out` | Connection pool exhausted | Wait and retry; check Supabase connections dashboard |
| `P2021: Table does not exist` | Schema not pushed | Run `npm run prisma:push` (⚠️ DESTRUCTIVE — backup first) |
| `Cannot find module...` | Bad import | Check `lib/prisma.ts` imports |
| HTTP 500 with `details: error message` | App error, not DB | Read the `details` field |
| HTTP 500 with no `details` | Upstream/render error | Check dev server log |

---

### B3 — Verify DATABASE_URL Points to Supabase (Not Local SQLite or Dead Neon)

```bash
node -e "
const url = process.env.DATABASE_URL || '';
if (!url) { console.log('FAIL: DATABASE_URL not set'); process.exit(1); }
if (url.includes('neon.tech')) { console.log('FAIL: Still pointing at dead Neon DB'); process.exit(1); }
if (url.includes('dev.db') || url.includes('sqlite')) { console.log('FAIL: Pointing at local SQLite'); process.exit(1); }
if (url.includes('supabase.com')) {
  const isPooler = url.includes(':6543') && url.includes('pgbouncer=true');
  console.log(isPooler
    ? 'PASS: Supabase + pgbouncer (port 6543)'
    : 'WARN: Supabase but check port (want 6543 + pgbouncer=true)');
} else {
  console.log('WARN: Unknown database host:', url.split('@')[1]?.split('/')[0]);
}
" 2>/dev/null || \
node -e "require('dotenv').config(); /* re-run in .env context */" 2>/dev/null
```

If `node -e` doesn't load `.env` automatically, use:
```bash
export $(grep -v '^#' .env | xargs) && node -e "
const url = process.env.DATABASE_URL || '';
console.log('Host:', url.split('@')[1]?.split('/')[0]);
console.log('Port 6543:', url.includes(':6543'));
console.log('pgbouncer:', url.includes('pgbouncer=true'));
"
```

**Pass**: Host contains `supabase.com`, port is `6543`, pgbouncer flag present.  
**Warn**: Host is Supabase but port is `5432` — may cause connection exhaustion under load; acceptable for local dev but not for production `DATABASE_URL`.

---

## Phase C — Endpoint Auth Guard Verification

All tests assume dev server is running on `localhost:3001`.  
These tests use `curl`. No browser session is needed for rejection tests.

### C1 — Upload Image: Rejects Unauthenticated

```bash
echo "test" > /tmp/test.txt
curl -s -o /tmp/upload-image-result.txt -w "%{http_code}" \
  -X POST http://localhost:3001/api/upload-image \
  -F "file=@/tmp/test.txt"
echo ""
cat /tmp/upload-image-result.txt
```

**Pass**: HTTP status `401` AND response body is `{"error":"Unauthorized"}`.  
**Fail**: HTTP `200` (upload succeeded without auth) or HTTP `500` (different failure).

---

### C2 — Upload Media: Rejects Unauthenticated

```bash
curl -s -o /tmp/upload-media-result.txt -w "%{http_code}" \
  -X POST http://localhost:3001/api/upload-media \
  -F "file=@/tmp/test.txt"
echo ""
cat /tmp/upload-media-result.txt
```

**Pass**: HTTP `401`, body `{"error":"Unauthorized"}`.

---

### C3 — Pages POST: Rejects Unauthenticated

```bash
curl -s -o /tmp/pages-post-result.txt -w "%{http_code}" \
  -X POST http://localhost:3001/api/pages \
  -H "Content-Type: application/json" \
  -d '{"titleAr":"test","titleEn":"test","slug":"test-unauth-'$(date +%s)'"}'
echo ""
cat /tmp/pages-post-result.txt
```

**Pass**: HTTP `401`, body `{"error":"Unauthorized"}`.  
**Fail**: HTTP `201` (page was created without auth).

---

### C4 — Pages PATCH: Rejects Unauthenticated

```bash
curl -s -o /tmp/pages-patch-result.txt -w "%{http_code}" \
  -X PATCH http://localhost:3001/api/pages \
  -H "Content-Type: application/json" \
  -d '{"slug":"home","customJS":"alert(1)"}'
echo ""
cat /tmp/pages-patch-result.txt
```

**Pass**: HTTP `401`, body `{"error":"Unauthorized"}`.  
**Fail**: HTTP `200` (XSS payload written to DB without auth).

---

### C5 — Pages GET: Still Public (Must Not Break)

```bash
curl -s -o /tmp/pages-get-result.txt -w "%{http_code}" \
  "http://localhost:3001/api/pages?published=true"
echo ""
python3 -c "import json; d=json.load(open('/tmp/pages-get-result.txt')); print('pages count:', len(d.get('pages', [])))"
```

**Pass**: HTTP `200` AND response contains `{"pages":[...]}` key.  
**Fail**: HTTP `401` (GET was accidentally guarded) or `500`.

---

### C6 — Known Unguarded Routes (For Awareness — Document Only)

These next routes are **not guarded yet** and are known remaining risks (documented in review). Do NOT deploy assuming they are safe.

```bash
# Confirm these return 200 without auth (expected — they are NOT yet guarded):
curl -s -w " HTTP=%{http_code}" -X POST http://localhost:3001/api/pages/migrate \
  -H "Content-Type: application/json" -d '{"pages":[]}' | tail -c 30
curl -s -w " HTTP=%{http_code}" -X POST http://localhost:3001/api/pages/seed | tail -c 30
```

**Expected (unfortunately)**: Both return HTTP `200` — confirming they remain unguarded.  
**Action**: Record results; add auth guards in an immediate follow-on commit before exposing these endpoints to traffic.

---

## Phase D — Authorized Flow Verification

These checks verify the auth system still functions end-to-end after the changes.

### D1 — Obtain a Session Cookie

NextAuth does not accept session via standard curl without a browser. Use this multi-step approach:

```bash
# Step 1: Get CSRF token
CSRF=$(curl -s http://localhost:3001/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
echo "CSRF token: $CSRF"

# Step 2: Sign in and capture session cookie
curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt \
  -X POST http://localhost:3001/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF&email=admin%40sainaiinstitute.com&password=admin123&json=true" \
  -w "\nHTTP=%{http_code}\n" | tail -3

# Step 3: Verify session is active
curl -s -b /tmp/cookies.txt \
  http://localhost:3001/api/auth/session | python3 -m json.tool
```

**Pass for D1**: Step 3 returns a JSON object containing `"user"` key with `"email": "admin@sainaiinstitute.com"`.  
**Fail**: `{"expires":..., "user": null}` or empty `{}`.

---

### D2 — Authorized Upload-Image: Must Not Be Blocked

```bash
curl -s -b /tmp/cookies.txt \
  -X POST http://localhost:3001/api/upload-image \
  -F "file=@/tmp/test.txt" \
  -w "\nHTTP=%{http_code}\n" | tail -5
```

**Pass**: HTTP is NOT `401` (auth guard did not block the authenticated request). A `400` (invalid file type) is acceptable and expected since `test.txt` is not an image — it proves the request passed authentication and reached business logic.  
**Fail**: HTTP `401` (guard is blocking even authenticated users).

---

### D3 — Authorized Pages POST: Must Create a Page

> ⚠️ This creates a real record in the production Supabase database. Use a unique test slug and delete it afterward.

```bash
TEST_SLUG="phase0-local-test-$(date +%s)"

curl -s -b /tmp/cookies.txt \
  -X POST http://localhost:3001/api/pages \
  -H "Content-Type: application/json" \
  -d "{\"titleAr\":\"صفحة اختبار\",\"titleEn\":\"Test Page\",\"slug\":\"$TEST_SLUG\"}" \
  -w "\nHTTP=%{http_code}\n" | tail -5

echo "Test slug used: $TEST_SLUG"
```

**Pass**: HTTP `201` AND response contains `{"page":{...}}` with correct slug.  
**Fail**: HTTP `401` (authenticated request blocked) or `500` (DB write failed).

**Cleanup** (run after test — delete the test page):
```bash
PAGE_ID=$(curl -s -b /tmp/cookies.txt \
  "http://localhost:3001/api/pages?slug=$TEST_SLUG" \
  | python3 -c "import sys,json; pages=json.load(sys.stdin).get('pages',[]); print(pages[0]['id'] if pages else 'NOT_FOUND')")
echo "Page ID to delete: $PAGE_ID"

# Delete (note: this route is currently unguarded — will work without auth)
curl -s -X DELETE "http://localhost:3001/api/pages/$PAGE_ID" -w "\nHTTP=%{http_code}\n"
```

---

### D4 — Authorized Pages PATCH: Must Update Without 401

```bash
curl -s -b /tmp/cookies.txt \
  -X PATCH http://localhost:3001/api/pages \
  -H "Content-Type: application/json" \
  -d '{"slug":"does-not-exist-slug-xyz","contentAr":"test"}' \
  -w "\nHTTP=%{http_code}\n" | tail -5
```

**Pass**: HTTP `404` (page slug not found — auth passed, business logic ran).  
**Fail**: HTTP `401` (authenticated request blocked).

---

## Phase E — Homepage and CMS Smoke Test

### E1 — Homepage Loads

```bash
curl -s -o /dev/null -w "HTTP=%{http_code}" http://localhost:3001/
```

**Pass**: HTTP `200`.

---

### E2 — Login Page Loads

```bash
curl -s -o /dev/null -w "HTTP=%{http_code}" http://localhost:3001/login
```

**Pass**: HTTP `200`.

---

### E3 — CMS Redirect Without Session

```bash
curl -s -o /dev/null -w "HTTP=%{http_code}" \
  -L http://localhost:3001/cms/dashboard
```

**Pass**: HTTP `200` after redirect to `/login` (middleware redirects unauthenticated CMS requests).  
**Fail**: HTTP `200` serving the actual dashboard without auth.

---

### E4 — CMS Dashboard Accessible With Session

```bash
curl -s -b /tmp/cookies.txt \
  -o /dev/null -w "HTTP=%{http_code}" \
  http://localhost:3001/cms/dashboard
```

**Pass**: HTTP `200`.

---

## Phase F — Final Pass/Fail Checklist

Complete all items. Every item must be `[x]` before deployment.

```
Static Checks
[ ] A1 — TypeScript: zero new errors in changed files
[ ] A2 — ESLint: no new errors in changed files
[ ] A3 — vercel.json: no "env" key present
[ ] A4 — No hardcoded credentials in lib/prisma.ts or any api/ file
[ ] A5 — getServerSession present in all 4 guarded route files
[ ] A6 — authOptions import present alongside getServerSession in all 4 files
[ ] A7 — Seed guard fires and exits 1 when NODE_ENV=production
[ ] A7b — Seed guard fires and exits 1 when VERCEL_ENV is set
[ ] A8 — public/check-localstorage.html does not exist
[ ] A9 — git diff reviewed line-by-line; zero credentials in diff

Database Connectivity
[ ] B1 — GET /api/departments returns JSON with "departments" array
[ ] B3 — DATABASE_URL points to supabase.com (not neon.tech, not SQLite)

Auth Guard Rejection Tests
[ ] C1 — POST /api/upload-image returns 401 without session
[ ] C2 — POST /api/upload-media returns 401 without session
[ ] C3 — POST /api/pages returns 401 without session
[ ] C4 — PATCH /api/pages returns 401 without session
[ ] C5 — GET /api/pages returns 200 without session (public read intact)

Known Unguarded Routes (Awareness)
[ ] C6 — Confirmed POST /api/pages/migrate is NOT guarded (document, fix in follow-on)
[ ] C6 — Confirmed POST /api/pages/seed (HTTP) is NOT guarded (document, fix in follow-on)

Authorized Flow Tests
[ ] D1 — Admin session obtained via credentials; /api/auth/session confirms user object
[ ] D2 — POST /api/upload-image with session returns 400 (file type), NOT 401
[ ] D3 — POST /api/pages with session returns 201 (page created)
[ ] D3c — Test page created in D3 was deleted from Supabase
[ ] D4 — PATCH /api/pages with session returns 404 (not found), NOT 401

Smoke Tests
[ ] E1 — GET / returns 200
[ ] E2 — GET /login returns 200
[ ] E3 — GET /cms/dashboard without session redirects to /login
[ ] E4 — GET /cms/dashboard with session returns 200

Operator Pre-Work Confirmation (cannot be verified from code)
[ ] OP1 — Supabase DB password rotated (T008 complete)
[ ] OP2 — Vercel dashboard DATABASE_URL = Supabase port 6543 + pgbouncer=true (new password)
[ ] OP3 — Vercel dashboard NEXTAUTH_URL = https://test.sinaiinstitute.com
[ ] OP4 — Vercel dashboard NEXTAUTH_SECRET = strong rotated value
[ ] OP5 — Vercel dashboard CLOUDINARY_API_SECRET = rotated value
```

---

## Deployment Gate

**All of the following must be true before running `vercel --prod`:**

1. Every static check (A1–A9) passed
2. Database connectivity confirmed (B1)
3. All 4 auth guard rejection tests passed (C1–C4)
4. Public read still works (C5)
5. Authorized flows work (D1–D4)
6. All smoke tests pass (E1–E4)
7. All 5 operator pre-work items confirmed (OP1–OP5)
8. Known unguarded routes (C6) documented and accepted as follow-on work

**If any check fails**: Do NOT deploy. Fix the failing check, restart from Phase A.

---

## Post-Verification: Deploy Command

Once all checks pass:

```bash
git checkout 001-security-triage-phase-0
git log --oneline -5          # confirm commits look correct
vercel --prod                 # deploy to production
```

Immediately after deploy, run the live verification checklist from `tasks.md` Phase 10 (T039–T046) within 10 minutes. If any live check fails: `vercel rollback`.
