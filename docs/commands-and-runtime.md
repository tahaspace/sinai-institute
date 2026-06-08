# Commands and Runtime

**Source**: `package.json`, `vercel.json`, `next.config.ts`, `tsconfig.json`, `prisma/schema.prisma`, `prisma/seed.ts`, `.env.example`, direct code reads  
**Last updated**: 2026-03-28

---

## Script Reference

All scripts are in `package.json`. No `Makefile`, no shell scripts. The runner is `npm`.

```json
{
  "dev":             "next dev",
  "build":           "prisma generate && next build",
  "start":           "next start",
  "lint":            "eslint",
  "prisma:generate": "prisma generate",
  "prisma:push":     "prisma db push",
  "prisma:seed":     "tsx prisma/seed.ts",
  "prisma:studio":   "prisma studio",
  "postinstall":     "prisma generate"
}
```

---

## Dev Commands

### `npm run dev`
**What it does**: Starts Next.js development server  
**Default port**: 3000 (falls to 3001, 3002 if occupied)  
**Prerequisites**:
- Node 18+ (20 recommended — matches Vercel)
- `node_modules` installed
- `.env` file with `DATABASE_URL` pointing to a valid DB
- Prisma client must exist: `postinstall` runs `prisma generate` on `npm install`

**Local DB behavior**:
- `lib/prisma.ts` checks `NODE_ENV`. In dev (`next dev`), `NODE_ENV` is NOT `production`
- Therefore, `DATABASE_URL` from `.env` is used
- Current `.env`'s `DATABASE_URL` points to **production Supabase** (port 5432)
- **Running `npm run dev` queries the live production database**

**Auth behavior**:
- `NEXTAUTH_URL` in `.env` should be `http://localhost:3000` or `:3001` (observed `.env.example` shows `:3000`)
- NextAuth cookie domain is bound to `NEXTAUTH_URL`; mismatched port causes auth failures
- Only valid credential: `admin@sainaiinstitute.com` / `admin123` (hardcoded in `lib/auth.ts`)

**Assumption risk**: Hot reload restarts the Prisma client singleton. In dev, the global `globalForPrisma.prisma` persists across HMR. However, the connection still points to production Supabase.

---

### `npm run build`
**What it does**: `prisma generate && next build`  
**Step 1 — `prisma generate`**: Regenerates the Prisma client from `schema.prisma`  
**Step 2 — `next build`**: Compiles, bundles, exports static/dynamic pages

**Critical production-connection risk**:
```typescript
// lib/prisma.ts — triggers during next build if any RSC/getStaticProps runs
if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
  return HARDCODED_SUPABASE_URL; // production DB
}
```
Current build script does NOT set `NODE_ENV=production` explicitly — Next.js does this internally during `next build`. **All builds connect to live Supabase if they execute any DB-touching server code.**

**TypeScript errors**: `next.config.ts` sets `ignoreBuildErrors: true` — build never fails from TS errors  
**ESLint errors**: `next.config.ts` sets `ignoreDuringBuilds: true` — no linting in build

**Output**: `.next/` directory. Vercel uses this.

**Prerequisites**:
- `@prisma/client` generated (handled by step 1)
- Cloudinary env vars set (server-side; only needed at runtime, not build time)
- SMTP env vars: not needed (no mailer installed)
- Supabase reachable if any page uses server-side data fetch (no RSC pages found → likely safe)

---

### `npm start`
**What it does**: Starts Next.js production server from `.next/` build output  
**Port**: 3000 by default  
**Prerequisite**: `npm run build` must have been run first  
**Not used on Vercel**: Vercel runs its own serverless handlers from `.next/`. This command is for self-hosted Node servers only.

---

## Lint and Type Check

### `npm run lint`
**Command**: `eslint` (no file path argument, no config path in the script)  
**Config file**: `eslint.config.*` (Next.js 16 uses flat config via `eslint-config-next`)  
**Behavior**: ESLint runs on project files using Next.js recommended config  
**NOT run during build**: `ignoreDuringBuilds: true` in `next.config.ts`  
**Usage**: Must be run manually. `npm run lint` or `npx eslint app/ components/ lib/`  
**Unknown error count**: Has never been run to completion in documented audit

### TypeScript check (no script defined)
**Command**: `npx tsc --noEmit`  
**tsconfig.json**:
- `strict: true` — full strict mode including strictNullChecks
- `noEmit: true` — type-check only, no JS output
- `skipLibCheck: true` — skips type errors in `node_modules`
- Includes: `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`

**NOT run during build**: `ignoreBuildErrors: true`  
**Unknown error count**: Has never been run to completion in documented audit. Given rich SaaS types in `types/index.ts` that don't match Prisma schema, and `any` casts in API routes — likely dozens to hundreds of errors.

---

## Prisma Commands

### `npm run prisma:generate` (`prisma generate`)
**What it does**: Reads `prisma/schema.prisma`, generates TypeScript client into `node_modules/@prisma/client`  
**When to run**: After any change to `schema.prisma`  
**Safe to run**: Yes — read-only from schema perspective  
**Runs automatically**: On `npm install` (via `postinstall`) and as part of `npm run build`

### `npm run prisma:push` (`prisma db push`)
**What it does**: Introspects `schema.prisma` and applies changes directly to the DB without creating migration files  
**Target DB**: Whatever `DATABASE_URL` resolves to (in dev: `.env` value = production Supabase; in production: overridden by `lib/prisma.ts` hardcode)  
**⚠️ Risks**:
- **No migration files created** — no rollback history
- **Additive by default** — new fields/models added safely  
- **Destructive if schema has deletions** — drops columns/tables removed from schema
- **Runs against production when executed locally** because `.env DATABASE_URL` points to production Supabase

**Safe pattern** (session-mode, required for schema DDL):
```bash
DATABASE_URL="postgresql://postgres.eacpjbbpwonwmthutxow:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
  npx prisma db push
```

### `npm run prisma:seed` (`tsx prisma/seed.ts`)
**What it does**: Runs `prisma/seed.ts` via `tsx` (TypeScript executor)  
**⚠️ CRITICAL WARNING**:
```typescript
// seed.ts line ~35
await prisma.department.deleteMany({});  // deletes ALL departments
// ...
await prisma.news.deleteMany({});        // deletes ALL news
```
**Cascades from department delete**: All Results, Schedules, Specializations under every department are also deleted  
**Target**: Uses `DATABASE_URL` from `.env` — currently production Supabase  
**Safe to run**: NO — destructive against production. Only safe with `DATABASE_URL=file:./prisma/dev.db` override (but dev.db is SQLite and incompatible with Prisma's PostgreSQL mode).

**Note**: User admin is created via `upsert` (safe). Only departments and news are wiped.

### `npm run prisma:studio` (`prisma studio`)
**What it does**: Starts Prisma GUI at `http://localhost:5555`  
**Target DB**: `DATABASE_URL` from `.env` — production Supabase  
**Safe to read**: Yes. Can also write — exercise caution with mutations.  
**Use case**: Inspect production data, verify schema sync, manual data corrections

---

## Database Setup (No Automated Migration)

There is no `prisma migrate dev` command, no `prisma migrate deploy`, and no `migrations/` directory.

**Complete local setup procedure** (not documented anywhere in the repo; inferred from code):
```bash
# 1. Install dependencies (also runs prisma generate via postinstall)
npm install

# 2. Confirm schema.prisma matches target DB
# (Currently no diff tooling — manual inspection required)

# 3. If tables are missing, push schema (session mode for DDL)
DATABASE_URL="postgresql://postgres.PROJECTID:PASSWORD@HOST:5432/postgres" \
  npx prisma db push

# 4. Verify tables in Supabase dashboard before running app

# 5. Start dev server
npm run dev
```

**No `migrate:reset` script exists**. Running `npx prisma migrate reset` would be catastrophic — drops the entire DB schema and all data.

---

## Root-Level Utility Scripts (Not in package.json)

These exist at the repo root and must be run with `tsx` or `node` directly:

| Script | Purpose | Target | Risk |
|--------|---------|--------|------|
| `migrate-data.ts` | SQLite→PostgreSQL full migration (Prisma→Prisma) | `DATABASE_URL` env | Contains Prisma calls; reads from `prisma/dev.db` |
| `migrate-simple.ts` | SQLite→PostgreSQL via `better-sqlite3` raw SQL reads | `DATABASE_URL` env | Uses `better-sqlite3` to read SQLite directly |
| `sync-to-supabase.js` | Pushes pages from dev.db to Supabase using `sqlite3` CLI | **Hardcoded Supabase URL** (`SinaiInstitute2026!`) in file | Contains prod credentials in source |
| `neon-data-export.js` | Data export from legacy Neon DB | Likely reads `DATABASE_URL` | Neon is defunct; this script is useless |

**None of these are usable in current state** — they were one-time migration tools and should be archived or deleted.

---

## Environment Variables — Runtime Dependency

| Variable | Read by | Critical? | Risk if missing |
|----------|---------|----------|----------------|
| `DATABASE_URL` | `lib/prisma.ts` (dev only) | ✅ Yes (dev) | Prisma cannot connect in dev |
| `VERCEL_ENV` | `lib/prisma.ts` (triggers hardcoded URL) | ⚠️ N/A in prod | Vercel auto-injects |
| `NODE_ENV` | `lib/prisma.ts`, Next.js | ✅ Yes | Auth/Prisma behavior changes |
| `NEXTAUTH_URL` | NextAuth (implicit) | ✅ Yes | Auth callbacks return wrong domain |
| `NEXTAUTH_SECRET` | NextAuth (implicit) | ✅ Yes | All auth fails; sessions un-verifiable |
| `CLOUDINARY_CLOUD_NAME` | `lib/cloudinary.ts` | ✅ Yes | Upload endpoints return 500 |
| `CLOUDINARY_API_KEY` | `lib/cloudinary.ts` | ✅ Yes | Same |
| `CLOUDINARY_API_SECRET` | `lib/cloudinary.ts` | ✅ Yes | Same |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env` only — no code import found | ❓ Uncertain | Likely none |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env` only — no code import found | ❓ Uncertain | Likely none |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` only — no code import found | ❓ Uncertain | Likely none |

**Variables in `.env.example` but not in `.env`** (not used in current code):
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME` — undefined; not read in code
- `UPLOAD_DIR` — `.env.example` says `./public/uploads`; code ignores this; uses Cloudinary
- `SMTP_*` — no mailer library installed; these env vars do nothing

---

## Build and Runtime Tool Versions

| Tool | Version | Notes |
|------|---------|-------|
| Node | 20.x | Vercel config; local must match |
| Next.js | 16.1.5 | Fixed version in `package.json` |
| Prisma | 5.22.0 | Fixed version |
| TypeScript | ^5 | Not pinned |
| tsx | ^4.21.0 | For running seed.ts |
| ESLint | ^9 | Flat config mode |
| tailwindcss | ^3.4.19 | CSS processing |
