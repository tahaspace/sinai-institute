# Deployment Audit

**Source**: `vercel.json`, `.vercelignore`, `.gitignore`, `lib/prisma.ts`, `lib/auth.ts`, `lib/cloudinary.ts`, `next.config.ts`, `middleware.ts`, `package.json`, `.env` (keys only)  
**Last updated**: 2026-03-28

---

## 1. Vercel Configuration

**File**: `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "DATABASE_URL": "postgresql://neondb_owner:...@ep-shy-fire-ag4sxzsm.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    "NEXTAUTH_URL": "https://sinai-institute.vercel.app",
    "NEXTAUTH_SECRET": "sinai-institute-secret-key-2026-very-secure-random-string-12345",
    "NODE_ENV": "production"
  }
}
```

### Critical Issues with `vercel.json`

| Issue | Detail | Risk |
|-------|--------|------|
| `DATABASE_URL` is dead | Points to Neon (`ep-shy-fire-ag4sxzsm.c-2.eu-central-1.aws.neon.tech`) — free tier quota exhausted and no longer active | Full environment variable is useless; not used at runtime anyway (overridden by `lib/prisma.ts`) |
| `NEXTAUTH_URL` is wrong | `https://sinai-institute.vercel.app` — deployed domain is `https://test.sinaiinstitute.com` | Auth callbacks redirect to non-existent Vercel subdomain; login may appear to work locally but fail on custom domain |
| `NEXTAUTH_SECRET` is weak and public | In git, in source | Anyone with repo access can forge session cookies (if they also have `NEXTAUTH_URL`) |
| `NODE_ENV: "production"` | Vercel would set this automatically — redundant but also triggers `lib/prisma.ts` hardcoded URL path | No immediate risk; just cargo-cult |
| All `env` secrets in `vercel.json` | Vercel Dashboard is the correct location; `vercel.json` "env" block overrides dashboard values | Secrets rotate in dashboard but `vercel.json` overrides revert them |

**How Vercel actually selects env vars**: Vercel applies env in this priority order:
1. `vercel.json` `env` block (highest priority — overrides dashboard)
2. Vercel project dashboard environment variables
3. `.env*` files committed to git (NOT applied in production)

So even if `NEXTAUTH_SECRET` is rotated in the dashboard, the `vercel.json` value takes precedence.

**Recommendation**: Remove the entire `"env": {}` block from `vercel.json` and manage all secrets exclusively in the Vercel dashboard.

---

## 2. `.vercelignore`

```
node_modules
.next
.git
prisma/dev.db
*.log
.env
.env.local
```

`.env` and `.env.local` are excluded from Vercel deployment — correct. `prisma/dev.db` is excluded — correct (though it's still tracked in git). `.env.example` is NOT listed — it deploys to Vercel, but doesn't contain live values so this is acceptable.

---

## 3. Build Process on Vercel

**Phase 1: Install**  
`npm install` → triggers `postinstall: prisma generate` → Prisma client is compiled into `node_modules/@prisma/client`

**Phase 2: Build**  
`npm run build` → `prisma generate && next build`

- `prisma generate` runs again (redundant but harmless)  
- `next build` compiles all pages and API route handlers
- TypeScript errors: **ignored** (`ignoreBuildErrors: true`)
- ESLint: **ignored** (`ignoreDuringBuilds: true`)
- `NODE_ENV=production` is set by Vercel during build — triggers `lib/prisma.ts` hardcoded URL

**Does build touch Supabase?**  
Next.js does not call API route handlers at build time for the App Router (no `generateStaticParams` found for dynamic API routes, no RSC data fetching found in page components). Build is safe from DB connectivity perspective. The Prisma client is generated but not connected during build.

**Output**: `.next/` directory — standard Next.js build output. Vercel deploys this.

---

## 4. Runtime Architecture on Vercel

### Serverless Function Model
Every `app/api/*/route.ts` file becomes a Vercel serverless function. Default timeout: **10 seconds** (Hobby plan).

**Cold start behavior**:
1. Vercel receives request
2. If no warm function exists, starts new Node.js instance
3. Module-level code runs: `lib/prisma.ts` creates new PrismaClient, `lib/cloudinary.ts` logs config
4. Handler executes
5. Connection to Supabase is established (TCP via port 5432)
6. Response returned

**Connection pool concern**:  
Each cold start creates a new `PrismaClient` with a new connection pool. Supabase free tier allows ~60 simultaneous direct connections (port 5432). Under load, if 60 concurrent serverless invocations fire, all connection slots fill. New requests get `P1001: Can't reach database server` or `P1017: Server closed the connection`.

The global singleton in `lib/prisma.ts`:
```typescript
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```
**This singleton only works in dev.** In production (`NODE_ENV === 'production'`), the `global` assignment is skipped — every cold start creates a new `PrismaClient`. This is the documented Vercel/Prisma pattern but requires pgbouncer (port 6543 + `?pgbouncer=true&connection_limit=1`) to be safe.

### Static Assets
`public/` directory is served via Vercel CDN edge network.
- `check-localstorage.html` is deployed and publicly accessible via CDN
- `images/` and `uploads/` subdirectories are deployed as static files

### Middleware (Edge)
`middleware.ts` runs at the Vercel edge network (not in serverless functions). It uses `withAuth` from `next-auth/middleware`. Pattern:
- `authorized: () => true` — always passes the authorization check
- `function middleware(req)` — manually implements redirect logic

The edge runtime is more constrained than Node.js. Importing from `lib/auth.ts` works because it only uses `next-auth` (edge-compatible). If `lib/prisma.ts` were imported in `middleware.ts`, it would fail (Prisma is not edge-compatible).

---

## 5. Environment Variable Dependency Summary

The following env vars are essential for different runtime surfaces:

### Required for Any Request to Succeed
| Variable | Used in | Source in production |
|----------|---------|---------------------|
| `NEXTAUTH_SECRET` | NextAuth session cookie signing | Vercel dashboard (but `vercel.json` overrides with weak value) |
| `NEXTAUTH_URL` | NextAuth callback URLs, CSRF | Vercel dashboard (but `vercel.json` overrides with wrong value) |

### Required for Upload Endpoints
| Variable | Used in | Source |
|----------|---------|--------|
| `CLOUDINARY_CLOUD_NAME` | `lib/cloudinary.ts` | Vercel dashboard + `.env` (committed) |
| `CLOUDINARY_API_KEY` | `lib/cloudinary.ts` | Same |
| `CLOUDINARY_API_SECRET` | `lib/cloudinary.ts` | Same |

### Required for DB (Dev Only — Production Bypasses These)
| Variable | Used in | Source |
|----------|---------|--------|
| `DATABASE_URL` | `lib/prisma.ts` dev path | `.env` (committed) → production Supabase |

### Automatically Set by Vercel (Not in `.env`)
| Variable | Value | Used by |
|----------|-------|--------|
| `VERCEL_ENV` | `"production"` | `lib/prisma.ts` production check |
| `NODE_ENV` | `"production"` | `lib/prisma.ts`, `vercel.json` redundantly sets this |
| `VERCEL_URL` | Current deployment URL | Not used in application code |

### Unused Variables (Present in `.env` / `.env.example`)
| Variable | Reason unused |
|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | No `@supabase/supabase-js` import in any application file |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Same |
| `SMTP_*` (5 vars) | No mailer library installed; `.env.example` documents them but they have no effect |
| `NEXT_PUBLIC_SITE_URL` | Not referenced in any application code |
| `NEXT_PUBLIC_SITE_NAME` | Not referenced in any application code |
| `UPLOAD_DIR` | Not referenced; uploads go to Cloudinary |

---

## 6. Production-Only Risk Points

### R-01 — Two Dead/Wrong Variables Control Auth (Critical)
Both `NEXTAUTH_URL` and `NEXTAUTH_SECRET` in `vercel.json` are wrong:
- `NEXTAUTH_URL = https://sinai-institute.vercel.app` — not the live domain
- `NEXTAUTH_SECRET = sinai-institute-secret-key-2026-...` — in git, weak

Sessions signed with this secret are forgeable by anyone who reads the repo. And since auth is a hardcoded string bypass, the attacker doesn't even need to forge — they can just use `admin@sainaiinstitute.com / admin123`.

### R-02 — Production DB Connection Hardcoded in Source (Critical)
`lib/prisma.ts` contains:
```typescript
const supabaseUrl = 'postgresql://postgres.eacpjbbpwonwmthutxow:SinaiInstitute2026!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
```

This is in git. Rotating the password requires:
1. Change password in Supabase dashboard
2. Update this literal string in `lib/prisma.ts`
3. Deploy new code

Until the password is rotated, anyone with repo access has full database access. The password appears in `sync-to-supabase.js` as well.

### R-03 — Session-Mode DB Under Serverless (High)
Port 5432 (session/direct) vs. needed port 6543 (transaction/pgbouncer). Under concurrent traffic, Supabase free tier connections will be exhausted. Symptoms: intermittent 500 errors, "cannot connect to DB" messages.

**Fix**: Change production URL to:
```
postgresql://postgres.eacpjbbpwonwmthutxow:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### R-04 — No Health Check Endpoint (Low)
No `/api/health` or `/api/ping` route. Vercel doesn't require one, but Supabase connection health is not observable without attempting a real query.

### R-05 — Debug HTML Publicly Accessible (Low)
`public/check-localstorage.html` is deployed via Vercel CDN. Accessible at `https://test.sinaiinstitute.com/check-localstorage.html`. Reveals admin-side localStorage keys and values to any visitor.

### R-06 — Cloudinary Logs on Every Cold Start (Low)
`lib/cloudinary.ts` logs cloud name prefix to stdout on module import. Every cold start produces a log line in Vercel function logs. Not a security risk (partial key only), but noisy.

### R-07 — `vercel.json` Overrides Dashboard Secrets (High)
If ops team rotates `NEXTAUTH_SECRET` in the Vercel dashboard, `vercel.json`'s `env` block overrides it at deploy time. Any future deployment silently reverts the rotated secret.

---

## 7. Local vs. Production Differences

| Dimension | Local Dev (`npm run dev`) | Production (Vercel) |
|-----------|--------------------------|-------------------|
| DB connection URL | `process.env.DATABASE_URL` from `.env` | Hardcoded string in `lib/prisma.ts` |
| DB target | Supabase production (same DB) | Supabase production |
| `NODE_ENV` | `development` (Next.js sets this) | `production` (Vercel sets this) |
| Prisma client singleton | Persisted via `global` across HMR | New instance per cold start |
| Auth mechanism | Hardcoded bypass | Same hardcoded bypass |
| HTTPS | No (HTTP only) | Yes (Vercel managed TLS) |
| Upload target | Cloudinary (same account) | Cloudinary (same account) |
| Middleware | No (runs only on Vercel Edge) | Yes (`middleware.ts` on Edge) |
| `NEXTAUTH_URL` | `http://localhost:3000` or `:3001` | `https://sinai-institute.vercel.app` (wrong domain) |
| Static files | Served by Next.js dev server | Served by Vercel CDN |
| TypeScript errors | Build still succeeds | Build still succeeds |
| Cache | No edge caching | Vercel CDN caches static + some routes |
| Function timeout | None (long-running requests OK) | 10s max (Hobby plan) |
| Logs | Terminal output | Vercel log drain (retained 1 day on Hobby) |

---

## 8. Deployment Procedure (Inferred)

No CI/CD. Manual Vercel CLI deploys only.

```bash
# 1. Ensure Vercel CLI is installed and authenticated
vercel --version

# 2. Deploy to production
vercel --prod

# Vercel then runs:
#   npm install           (postinstall: prisma generate)
#   npm run build         (prisma generate + next build)
#   Deploy .next/

# If deployment fails mid-build:
#   Previous deployment remains live (Vercel atomically swaps)
```

**No automated testing step** before deploy. No staging environment observed. No Git branch integration (deployments are not triggered by pushes).

**Rollback**: Vercel keeps previous deployments. To rollback: `vercel rollback` or promote a previous deployment in the dashboard.

---

## 9. Domain Configuration

| Domain | Type | Status |
|--------|------|--------|
| `test.sinaiinstitute.com` | Custom domain | Live — inferred from CLAUDE.md and historical docs |
| `sinai-institute.vercel.app` | Vercel subdomain | Referenced in `vercel.json NEXTAUTH_URL` — mismatch with live domain |

`NEXTAUTH_URL` mismatch means:
- OAuth callback URLs point to the wrong domain
- CSRF token validation may fail on the custom domain
- Users may see "Callback URL not allowed" or "Invalid CSRF token" errors on login from `test.sinaiinstitute.com`

**To fix**: Set `NEXTAUTH_URL=https://test.sinaiinstitute.com` in Vercel dashboard AND remove the `env.NEXTAUTH_URL` entry from `vercel.json`.
