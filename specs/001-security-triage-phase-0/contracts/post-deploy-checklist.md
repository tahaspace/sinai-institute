# Post-Deploy Verification Checklist

**Phase**: `security-triage-phase-0`
**When to use**: Immediately after `vercel --prod` completes. Must complete within 10 minutes.
**Rollback trigger**: Any item marked ❌ → run `vercel rollback` immediately.

---

## Required Checks

### 1. Public Homepage
- Open `https://test.sinaiinstitute.com` in a browser
- [ ] Page loads without error (no 500, no timeout, no blank page)
- [ ] No browser console errors related to failed API calls

### 2. Database Connectivity
- Open `https://test.sinaiinstitute.com/api/departments`
- [ ] Returns JSON with department records (not an error object)
- Confirms: new DATABASE_URL in dashboard connects successfully to Supabase

### 3. Admin Login on Custom Domain
- Navigate to `https://test.sinaiinstitute.com/login`
- Submit: `admin@sainaiinstitute.com` / `admin123`
- [ ] Login succeeds and redirects to `/cms/dashboard`
- [ ] Browser session cookie domain shows `test.sinaiinstitute.com` (not `.vercel.app`)
- Confirms: NEXTAUTH_URL is correct, NEXTAUTH_SECRET is valid

### 4. CMS Page List Loads
- From CMS dashboard, navigate to Pages (`/cms/pages`)
- [ ] Page list loads with existing pages
- Confirms: database read works from authenticated session

### 5. Authorization Guard Active — Unauthenticated Write Rejected
- In a terminal or API client (with no session cookie):
  ```bash
  curl -s -X POST https://test.sinaiinstitute.com/api/upload-image \
    -F "file=@/any/local/image.jpg" | cat
  ```
- [ ] Response is `{"error":"Unauthorized"}` with HTTP 401
- Confirms: auth guard is live on upload-image

### 6. Authorized Write Still Works
- Logged in as admin, navigate to CMS → Pages → open any page in GrapesJS editor
- Save the page
- [ ] Save succeeds without error
- Confirms: authorized writes are not blocked

### 7. Environment Override Absent
- Vercel CLI: `vercel env ls --environment=production`  
  OR Vercel dashboard → sinai-institute → Settings → Environment Variables
- [ ] `NEXTAUTH_URL` shows `https://test.sinaiinstitute.com`
- [ ] `NEXTAUTH_SECRET` exists (value encrypted — verify it was set in dashboard, not `vercel.json`)
- [ ] `DATABASE_URL` shows supabase.com URL with port 6543 (not neon.tech)
- Confirms: `vercel.json` env block is gone and did not override dashboard values

### 8. Debug Tool Removed
- Open `https://test.sinaiinstitute.com/check-localstorage.html`
- [ ] Returns 404
- Confirms: debug file is not deployed

---

## Pass Criteria
All 8 items checked ✅ → Phase 0 complete. Update `docs/known-issues.md` to mark
KI-001 through KI-005, KI-017 as resolved.

## Fail/Rollback Procedure
```bash
# Step 1: Rollback deployment
vercel rollback

# Step 2: Confirm previous version is live
curl https://test.sinaiinstitute.com/api/departments

# Step 3: Document which checklist item failed in docs/known-issues.md
# Step 4: Debug offline — do NOT apply a forward-fix to production in an emergency
```

**After rollback — DB password note**: If Supabase password was already rotated (Step 0.4)
before the failed deploy, the rolled-back version's hardcoded password is invalid.
Temporary fix: update Vercel dashboard `DATABASE_URL` manually to use the new password.
The site will connect successfully even under the old deployment's hardcode because
`lib/prisma.ts` hardcode only runs when `NODE_ENV=production` AND the dashboard URL is
ignored — so update the hardcode directly in the source and redeploy hotfix.
