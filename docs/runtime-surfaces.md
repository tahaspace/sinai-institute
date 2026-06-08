# Runtime Surfaces

**Source**: `.env` (keys only, values redacted), `vercel.json`, `lib/`, `next.config.ts`, `middleware.ts`, `prisma/schema.prisma`, `package.json`  
**Last updated**: 2026-03-28

---

## 1. Environment Variables

All variables observed in `.env` file. All are committed to git (security risk).

### Required for runtime

| Variable | Read by | Where set in production |
|----------|---------|------------------------|
| `DATABASE_URL` | `lib/prisma.ts` (dev only — overridden in prod) | Vercel dashboard (effectively unused in prod) |
| `NEXTAUTH_URL` | NextAuth implicitly | Vercel dashboard (should be `https://test.sinaiinstitute.com`) — `vercel.json` has wrong value |
| `NEXTAUTH_SECRET` | NextAuth implicitly | Vercel dashboard + `vercel.json` (weak value in git) |
| `CLOUDINARY_CLOUD_NAME` | `lib/cloudinary.ts` | Vercel dashboard + `.env` (committed) |
| `CLOUDINARY_API_KEY` | `lib/cloudinary.ts` | Vercel dashboard + `.env` (committed) |
| `CLOUDINARY_API_SECRET` | `lib/cloudinary.ts` | Vercel dashboard + `.env` (committed) |
| `NODE_ENV` | `lib/prisma.ts` (triggers hardcoded URL) | Vercel auto-sets `production` |
| `VERCEL_ENV` | `lib/prisma.ts` (fallback check) | Vercel auto-injects |

### Present in `.env` but usage uncertain

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase JS client URL — no `@supabase/supabase-js` import found in codebase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same — likely unused |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin Supabase JWT — no usage found; likely vestigial |

### Variables in `vercel.json` env block (dead — overridden)

| Variable | Value in `vercel.json` | Issue |
|----------|----------------------|-------|
| `DATABASE_URL` | Neon PostgreSQL URL | Dead — Neon quota exceeded; overridden by `lib/prisma.ts` hardcoded URL anyway |
| `NEXTAUTH_URL` | `https://sinai-institute.vercel.app` | Wrong domain — should be `https://test.sinaiinstitute.com` |
| `NEXTAUTH_SECRET` | Weak plaintext secret | In git history |
| `NODE_ENV` | `production` | Triggers hardcoded Supabase URL in `lib/prisma.ts` |

### Variables read by Next.js automatically (not explicit in code)
- `VERCEL_URL` — used by Vercel build system, not by application code
- `PORT` — not overridden; Vercel manages this

---

## 2. External Services

### Supabase PostgreSQL (Primary Database)
- **Project ID**: `eacpjbbpwonwmthutxow`
- **Region**: `aws-1-eu-west-1` (Frankfurt)
- **Connection**: Hardcoded in `lib/prisma.ts` using port **5432** (direct/session mode)
- **Intended**: Port 6543 (transaction pooler / pgbouncer) — not active
- **Plan**: Free tier (~60 direct connection limit)
- **Risk**: Session-mode connections from Vercel serverless functions accumulate; can exhaust limit under real load
- **Auth**: `postgres.eacpjbbpwonwmthutxow` user, password `SinaiInstitute2026!` (in source code)

### Cloudinary (Media Storage)
- **Account**: `dyz4dc6n7`
- **Upload paths**:
  - `sinai-institute/{type}` — `/api/upload` (type from form field: `results`, `schedules`, `news`, etc.)
  - `sinai-institute/news` — `/api/upload-image` (hardcoded folder)
  - Unknown for `/api/upload-media`
- **Resource types**: `auto` for `/api/upload`, `image` only for `/api/upload-image`
- **Access**: API key + secret from env — both committed to git
- **Risk**: `/api/upload-image` has no auth — anyone can write to the institute's Cloudinary account

### Vercel (Hosting / Serverless Runtime)
- **Project**: `sinai-institute` under `tahaspace` org
- **Project ID**: `prj_uIVrMsaHP2QUaYkzsg38Iggl4DlC`
- **Plan**: Hobby (free)
- **Region**: Frankfurt
- **Deployment**: Manual CLI only (`vercel --prod`) — no Git integration
- **Build hooks**: `postinstall: prisma generate`, `build: prisma generate && next build`
- **Function timeout**: 10s (Hobby plan)
- **Filesystem**: Read-only at runtime — `public/` is deployed statically

### Font Awesome (CDN)
- Loaded via `<link>` in `app/layout.tsx` — hardcoded CDN URL
- `integrity` hash is present for SRI, but SRI is currently disabled in `next.config.ts` image policy
- External dependency on CDN availability for icons

### Google Fonts (Tajawal)
- Loaded via `next/font/google` — `Tajawal` family
- Self-hosted by Next.js at build time (no external CDN requests at runtime)

### NextAuth (Auth infrastructure)
- Running in JWT mode (not database sessions)
- Credential provider only
- Custom pages: `/login` (sign-in, sign-out, error)
- JWT stored in HTTP-only cookie (managed by NextAuth)

---

## 3. Storage and Media Surfaces

| Surface | Data stored | Durability | Shared? |
|---------|------------|-----------|---------|
| Supabase PostgreSQL | All application records (news, applications, departments, results, schedules, pages, complaints) | ✅ Persistent | ✅ All users |
| Cloudinary | All uploaded files (PDFs for schedules/results, news images, hero images) | ✅ Persistent | ✅ CDN-served |
| `localStorage` (browser) | Homepage config (slides, stats, news, specializations, social media), nav pages (fallback), Zustand UI state | ❌ Browser only | ❌ Per device |
| `prisma/dev.db` (SQLite) | Development data — 299KB, may contain early dev PII | ✅ Git-tracked static | ❌ Local only |
| `public/uploads/` dirs | Empty — uploads go to Cloudinary, not local FS | ❌ Ephemeral on Vercel | N/A |
| `public/images/` | Static committed images (WhatsApp exports) | ✅ Git-tracked | ✅ Served statically |
| Vercel edge cache | Next.js page responses | Short-lived | Cleared on deploy |

---

## 4. Auth and Session Surfaces

### NextAuth JWT Session
- **Cookie name**: `next-auth.session-token` (production: `__Secure-next-auth.session-token`)
- **Stored**: HTTP-only cookie; signed with `NEXTAUTH_SECRET`
- **Contents**: `{ id, email, name, role }` where role is always `'SUPER_ADMIN'` (from hardcoded auth)
- **Session strategy**: JWT (no DB session table)
- **Expiry**: NextAuth default (30 days)
- **Used by**: `middleware.ts` (checks token presence), `getServerSession()` in API routes

### Middleware Auth Surface
- Runs on: Vercel Edge Network (before serverless function)
- Matcher: `/cms/:path*`, `/login`
- Behavior:
  - `/login` + has session → redirect to `/cms/dashboard`
  - `/cms/*` + no session → redirect to `/login`
  - Everything else → no middleware check (portals pass through)

### API-Level Auth (`getServerSession`)
Routes using session checks:

```
/api/departments    POST, PUT, DELETE → session required
/api/news           POST, PUT, DELETE → session required
/api/applications   GET              → session required; POST → open
/api/complaints     GET              → session required; POST → open
/api/results        POST, PUT, DELETE → session required (but POST is broken)
/api/schedules      POST, PUT, DELETE → session required
/api/upload         POST             → session required
```

Routes with NO session check:
```
/api/upload-image   POST → ⚠️ open
/api/pages          POST, PATCH → ⚠️ open
/api/results        GET → open (expected)
/api/schedules      GET → open (expected)
/api/departments    GET → open (expected)
```

### Zustand Auth Store (Disconnected)
- `useAuthStore.user` / `useAuthStore.isAuthenticated` — Zustand persisted state
- NOT synced with NextAuth `useSession()`
- Portal pages that use `useAuthStore` for auth may show incorrect data
- Portal pages that use `useSession()` would get the correct NextAuth session

---

## 5. Build, Deploy, and Runtime Assumptions

### Build-Time Assumptions
| Assumption | Evidence | Risk if violated |
|-----------|---------|-----------------|
| `NODE_ENV=production` triggers hardcoded Supabase URL | `lib/prisma.ts:6` | Build connects to production DB — running `npm run build` locally hits live Supabase |
| `prisma generate` runs before `next build` | `package.json` build script | Build fails without Prisma client generation |
| `postinstall: prisma generate` runs on Vercel install | `package.json` | Build fails without this (Vercel install step runs before build step) |
| TypeScript errors are suppressed | `next.config.ts` | Silent broken code ships to production |
| ESLint errors are suppressed | `next.config.ts` | Same |

### Runtime Assumptions
| Assumption | Evidence | Risk |
|-----------|---------|------|
| Cloudinary env vars are set in Vercel dashboard | `lib/cloudinary.ts` reads env | Upload endpoints return 500 if missing |
| `NEXTAUTH_SECRET` is set in Vercel dashboard | NextAuth requires it | Auth completely breaks if missing |
| `NEXTAUTH_URL` matches the actual domain | NextAuth uses for callback URLs | Login redirects break on custom domain |
| Prisma client connects to Supabase on cold start | `lib/prisma.ts` singleton | New Prisma instance on each cold start in serverless |
| `public/sw.js` exists | `lib/pwa/register-sw.ts` tries to register it | PWA silently broken (404 on service worker) |
| localStorage is available | All homepage + nav components | SSR shell renders fine; data appears after hydration |

### Database Connection at Build Time
`npm run build` calls `prisma generate` then `next build`. `next build` does not execute API routes. **Prisma is not connected at build time** — the hardcoded URL only activates when API routes execute during runtime. However, any `generateStaticParams` or server component data fetch in Next.js would trigger DB connection at build time. Since no RSC data fetching exists, this is currently safe.

### Local Development vs Production
| Difference | Local | Production |
|-----------|-------|-----------|
| DB URL | `process.env.DATABASE_URL` (from `.env`, points to Supabase port 5432) | Hardcoded Supabase port 5432 in `lib/prisma.ts` |
| NextAuth URL | `http://localhost:3001` (from `.env`) | `vercel.json` value (or dashboard override) |
| Asset storage | Cloudinary (same account) | Cloudinary (same account) |
| Filesystem | Writable | Read-only (ephemeral) |
| Prisma Studio | `npx prisma studio` (port 5555) | N/A |

> ⚠️ **Local builds connect to production Supabase** because `NODE_ENV=production` triggers the hardcoded URL in `lib/prisma.ts`. `npm run build` locally is a production operation.
