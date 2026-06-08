# ADR-002: Deployment Model — Vercel + Supabase

**Date**: 2026-01-31 (inferred from Vercel deployment chat)  
**Status**: Accepted (observed, with caveats)  
**Context**: Brownfield reconstruction.

---

## Context

The project needed a production hosting platform. The developer was working in a Node.js/Next.js ecosystem and needed a PostgreSQL database accessible from serverless functions.

### Migration history

1. **Initial**: Local SQLite (`prisma/dev.db`) — development only.
2. **First production attempt**: Neon PostgreSQL (Frankfurt). Quota exceeded within weeks.
3. **Current production**: Supabase PostgreSQL (`aws-1-eu-west-1`) — pgbouncer transaction mode, port 6543.

---

## Decision

Deploy the Next.js application to **Vercel** (serverless, Frankfurt region) with **Supabase PostgreSQL** as the managed database.

Key configuration:
- Database URL uses pgbouncer transaction pooler (`port 6543`, `?pgbouncer=true&connection_limit=1`)
- Session mode (`port 5432`) used for schema migrations
- Media stored on **Cloudinary** (not Vercel filesystem)
- Custom domain via CNAME record in A2Hosting DNS

---

## Rationale

- **Vercel**: Zero-config Next.js deployment. Frankfurt region close to the DB and institute users.
- **Supabase**: Free tier with pgbouncer support for serverless connection pooling. PostgreSQL-compatible with Prisma.
- **Cloudinary**: Persistent CDN for media — avoids Vercel's ephemeral filesystem limitation.
- **Hobby plan**: Zero cost for current traffic level.

---

## Consequences

**Positive**:
- Automatic SSL, edge caching, serverless scaling.
- No server administration.
- DB infrastructure managed by Supabase.

**Negative / risks**:
- Vercel **Hobby plan** has bandwidth and execution limits. Real student load may hit limits.
- Serverless cold starts add latency (~300ms first request).
- Vercel **ephemeral filesystem** — any upload to `public/uploads/` or `public/images/` is lost on redeploy. Schedule and hero slider uploads are affected.
- **Prisma + pgbouncer** required a workaround: connection string was hardcoded in `lib/prisma.ts` because Vercel env vars weren't picked up correctly at runtime. This is a maintenance liability.
- Manual deploys only — no CI/CD.

---

## Outstanding Issues

- `vercel.json` contains plaintext credentials (see KI-001).
- File upload strategy is inconsistent — migrate schedule/hero uploads to Cloudinary.
- Upgrade to Vercel Pro if production traffic is real student load.

---

## Alternatives Not Chosen

| Alternative | Reason not selected |
|-------------|-------------------|
| A2Hosting (cPanel Node.js) | Mentioned in early planning; rejected likely due to process management complexity vs. Vercel simplicity |
| Railway / Render | Not mentioned in history |
| Self-hosted VPS | No server management desired |
| Neon PostgreSQL | Quota exceeded on free tier |
