# Contract: API Authorization Guard

**Phase**: `security-triage-phase-0`
**Applies to**: 4 previously-open mutating endpoints

---

## Authorization Contract (new requirement, all 4 endpoints)

**Pre-condition**: Every request to the following endpoints MUST include a valid Next-Auth
session cookie (`next-auth.session-token`). The server validates this cookie
server-side via `getServerSession(authOptions)`. No client-sent token is trusted.

### Affected Endpoints

| Endpoint | Method | File |
|----------|--------|------|
| `/api/pages` | POST | `app/api/pages/route.ts` |
| `/api/pages` | PATCH | `app/api/pages/route.ts` |
| `/api/upload-image` | POST | `app/api/upload-image/route.ts` |
| `/api/upload-media` | POST | `app/api/upload-media/route.ts` |

### Response Contract — Unauthorized (new)

**When**: `getServerSession()` returns `null` (no valid session)

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{ "error": "Unauthorized" }
```

**Side effects**: None. No DB write. No Cloudinary upload. No state change.

### Response Contract — Authorized (unchanged)

**When**: `getServerSession()` returns a session object

The handler proceeds exactly as before. No changes to request shape, response
shape, or behavior for authenticated callers.

### Implementation Pattern

```typescript
// Add at top of each affected handler, before any logic:
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Inside handler function, first lines:
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Reference implementation**: `app/api/upload/route.ts` lines 1–12 (already correct).
Copy this exact pattern. Do not invent a new pattern.

---

## Environment Variable Contract (updated)

After this phase, the following variables MUST exist in the Vercel dashboard
for production. None may exist in `vercel.json`.

| Variable | Required value shape | Who sets it |
|----------|---------------------|-------------|
| `DATABASE_URL` | `postgresql://postgres.<project>:<NEW_PASS>@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` | Operator (Vercel dashboard) |
| `NEXTAUTH_URL` | `https://test.sinaiinstitute.com` | Operator (Vercel dashboard) |
| `NEXTAUTH_SECRET` | Random 32+ byte base64 string (from `openssl rand -base64 32`) | Operator (Vercel dashboard) |
| `CLOUDINARY_CLOUD_NAME` | Unchanged | Already in dashboard |
| `CLOUDINARY_API_KEY` | Unchanged | Already in dashboard |
| `CLOUDINARY_API_SECRET` | New rotated value | Operator (Cloudinary + Vercel dashboard) |
| `SUPABASE_SERVICE_ROLE_KEY` | Unchanged (not used in app code) | Already in dashboard |
| `NEXT_PUBLIC_SUPABASE_URL` | Unchanged (not used in app code) | Already in dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Unchanged (not used in app code) | Already in dashboard |
