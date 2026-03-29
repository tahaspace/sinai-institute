# Infrastructure Assumption Correction

**Date**: 2026-03-29  
**Status**: Adopted as core working assumption  

## 1. Hosting Model Correction

**Incorrect Assumption**: Previous conversations or initial contextual evaluations may have inadvertently implied or assumed that the database is managed by Vercel (e.g., Vercel Postgres, Vercel KV) due to the use of the Vercel platform for deployments.

**Corrected Hosting Model**:
- **Application Runtime**: **Vercel** exclusively hosts the application runtime (Edge/Serverless functions), handles deployment orchestration, serves static assets (CDN), and manages DNS routing. 
- **Database Layer**: The production database is **NOT** hosted on Vercel. It is externally hosted and fully managed by **Supabase**.
- **Media Storage**: Media files are hosted on **Cloudinary**, not on Vercel.

## 2. Platform Responsibilities

### What Vercel is Responsible For:
- Running the Next.js runtime (Serverless components, Edge middleware, API routes).
- Serving static CDN assets (`public/` directory).
- Orchestrating builds via the Vercel CLI (`vercel --prod`).
- Providing runtime environment variables configured in the Vercel project dashboard.
- Domain routing and TLS/SSL termination for `test.sinaiinstitute.com`.

### What the External Database Provider (Supabase) is Responsible For:
- Hosting the primary PostgreSQL 15 relational database (eu-west-1, Frankfurt).
- Providing TCP connection pools (port 6543 via pgbouncer).
- Persisting all structured dynamic content, user credentials (for the bypass), CMS pages, and application state.
- Database backups and restoration. Vercel rollbacks do *not* affect database state.

## 3. Invalidated Assumptions

The following assumptions must be treated as **invalid** in all future planning and code generation:
- ❌ *Invalid*: "Use Vercel Postgres or `@vercel/postgres` SDK." (Fact: We use Prisma pointing to Supabase).
- ❌ *Invalid*: "Vercel rollback will revert a bad database migration." (Fact: Supabase maintains independent state. Schema changes are one-way and irreversible via Vercel).
- ❌ *Invalid*: "The database connection shares Vercel's internal network." (Fact: Serverless functions make public internet TCP connections to Supabase).

## 4. Documentation Review

A review of the core documentation (`CLAUDE.md`, `docs/platform-topology.md`, `docs/deployment-vercel.md`) confirms that the **code-verified documentation already accurately reflects Supabase as the DB provider**. 

- `CLAUDE.md` correctly lists Supabase under the Tech Stack and Prisma Safety Rules.
- `docs/platform-topology.md` accurately diagrams Supabase operating in Frankfurt and outlines the topology separation.
- `docs/deployment-vercel.md` accurately describes the TCP connection behavior over the public internet to Supabase limits.

Therefore, **no earlier core documentation files require structural correction** regarding this specific fact, as they represent the code-verified truth. However, all AI agents, reasoning models, and operators Must prioritize these documents over any generalized assumptions about Next.js/Vercel default stacks.
