# Vercel Production Notes

**Evidence sources**: `vercel.json`, `.env.production`, `.env.vercel.check`, `.env.production.local`, `ARCHITECTURE.md`, `DEPLOYMENT_SUCCESS.md`, `cursor_vercel 01.md`, `.vercel/` directory

---

## 1. Vercel Project Identity

| Field | Value |
|-------|-------|
| Project name | `sinai-institute` |
| Org/team | `tahaspace` (Vercel team ID: `team_XSGK9WqXGmUOOUJxN83U3XvK`) |
| Project ID | `prj_uIVrMsaHP2QUaYkzsg38Iggl4DlC` |
| Framework | Next.js |
| Node version | 20.x |
| Region | Frankfurt (eu-central-1) |
| Plan | Hobby |

---

## 2. Production Domains

| Domain | Status | Notes |
|--------|--------|-------|
| `sinai-institute.vercel.app` | ✅ Active (Vercel default) | Auto-assigned |
| `test.sinaiinstitute.com` | ✅ Active (custom) | CNAME → `70c132ac131a8ac5.vercel-dns-017.com` in A2Hosting DNS |
| `sinaiinstitute.com` | ⚠️ Not on Vercel | Served from A2Hosting (separate PHP/WordPress site — *uncertain*) |

> DNS managed via **A2Hosting nameservers** (ns1–ns4.a2hosting.com). Domain registered with **Hostgator**.

---

## 3. Build Configuration

From `vercel.json` (current file):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

From `package.json`:
```
build: "prisma generate && next build"
postinstall: "prisma generate"
```

> ⚠️ `next.config.ts` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`. TypeScript and ESLint failures will NOT block production builds.

---

## 4. Environment Variables (Production)

Variables confirmed active in Vercel (from `.env.vercel.check` and `.env.production`):

| Variable | Value / Details |
|----------|----------------|
| `DATABASE_URL` | Supabase Transaction Pooler, `aws-1-eu-west-1`, port 6543, pgbouncer mode |
| `NEXTAUTH_URL` | `https://test.sinaiinstitute.com` |
| `NEXTAUTH_SECRET` | `sinai-institute-secret-key-2026-very-secure-random-string-12345` |
| `NODE_ENV` | `production` |
| `CLOUDINARY_CLOUD_NAME` | `dyz4dc6n7` |
| `CLOUDINARY_API_KEY` | `137484848333568` |
| `CLOUDINARY_API_SECRET` | `oaC-TNAKAqP1-tOkvCask5TGTmY` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://eacpjbbpwonwmthutxow.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | JWT present in `.env.production` |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT present in `.env.production` |

> ⚠️ **`vercel.json` embeds the old Neon DATABASE_URL plaintext** — this file is committed to Git. Rotate or remove immediately.

> ⚠️ **`NEXTAUTH_SECRET` is weak/guessable** — it is a readable string in VCS. Should be rotated.

---

## 5. Database — Supabase PostgreSQL

| Field | Value |
|-------|-------|
| Provider | Supabase (eu-west-1, AWS) |
| Project ref | `eacpjbbpwonwmthutxow` |
| Pool host (transaction mode) | `aws-1-eu-west-1.pooler.supabase.com:6543` |
| Pool host (session mode) | `aws-1-eu-west-1.pooler.supabase.com:5432` |
| pgbouncer params | `?pgbouncer=true&connection_limit=1` |
| DB password | `SinaiInstitute2026!` (in multiple files — **rotate**) |

**Migration history**:
1. Originally **local SQLite** (`prisma/dev.db`) during scaffold
2. Moved to **Neon PostgreSQL** (Frankfurt) — quota exceeded, became unavailable
3. Data manually migrated from `dev.db` → **Supabase** via custom Node script
4. Supabase is the current production database

**Data state (at time of migration)**:
- 1 admin user
- 6 departments
- 7 pages
- 3 news items
- 2 applications
- 3 complaints

---

## 6. Deployment Process

**Current workflow** (manual, no CI/CD):
```bash
# Local → Test build
npm run build

# Deploy to production
vercel --prod
```

No GitHub Actions, no automatic deploys on push. Vercel Git integration status: **UNCERTAIN** — `VERCEL_GIT_COMMIT_REF` is empty in `.env.vercel.check`, suggesting CLI-only deploys (no GitHub integration active).

**Build steps** (Vercel runs):
1. `npm install` (with `postinstall: prisma generate`)
2. `prisma generate`
3. `next build`

---

## 7. Known Vercel-Specific Issues (from history)

| Issue | Root Cause | Fix Applied |
|-------|-----------|-------------|
| Vercel used old Neon URL at runtime despite correct env vars | Prisma client baked `DATABASE_URL` at build time from local `.env` file | Hardcoded Supabase URL in `lib/prisma.ts` for `NODE_ENV=production` |
| `.env`, `.env.production` deployed with code | Files not excluded from deployment | Added to `.vercelignore` |
| Build cache served stale Prisma client | Vercel build cache retained old Prisma client | Force rebuild with `--force` flag |
| CMS pages showed stale data (edit dialog empty) | Next.js SSR cached page without `force-dynamic` | Added `export const dynamic = 'force-dynamic'` to CMS pages |

---

## 8. File Upload Behavior in Production

⚠️ **Critical gap**: Some features write to local filesystem (`public/uploads/`, `public/images/news/`). Vercel's filesystem is **ephemeral** — files written at runtime are lost on redeploy or function cold start.

| Feature | Upload target | Production safe? |
|---------|--------------|-----------------|
| Schedule documents (PDF/image) | `public/uploads/schedules/` (local) | ❌ No |
| Hero Slider images | `public/images/news/` (local) | ❌ No |
| News images | `/api/upload-image` → Cloudinary | ✅ Yes |
| General media | `/api/upload-media` → Cloudinary | ✅ Yes |
| Application documents | `documentsUrl` field in DB (URL) | ✅ If URL is Cloudinary |

> Recommendation: Migrate schedule and hero slider uploads to use the existing Cloudinary API endpoints (`/api/upload-image`, `/api/upload-media`).

---

## 9. Performance Notes (from ARCHITECTURE.md)

- TTFB: ~150–300ms (Vercel Edge)
- DB query time: ~50–150ms (Supabase Frankfurt)
- Cache hit rate: ~85%+ (Vercel CDN)
- 70+ edge network locations

---

## 10. .vercelignore Current State

```
.env
.env.local
node_modules
```

> Note: `.env.production` is **not** in `.vercelignore` (it was removed during debugging). This means production secrets in `.env.production` can be bundled into the deployment. Verify current `.vercelignore` content.
