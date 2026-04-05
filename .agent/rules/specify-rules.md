# eduhigher-institute Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-05

## Active Technologies
- TypeScript / Node 24.x (Vercel) + React 18 (Next.js 15 App Router) + Next.js 15, Prisma 6.x, NextAuth v4, Supabase PostgreSQL (external) (002-cms-pages-fix)
- External Supabase PostgreSQL. Local `.env` uses port 5432 (direct session mode). Vercel production uses port 6543 + pgbouncer. (002-cms-pages-fix)
- TypeScript 5.x / Next.js 14 App Router (React Server + Client Components) + Next.js 14, Prisma ORM, NextAuth v4, Supabase PostgreSQL (003-news-homepage-sync)
- Production Supabase PostgreSQL (remote, port 6543 pgbouncer) · Cloudinary (media) (003-news-homepage-sync)

- (001-security-triage-phase-0)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for 

## Code Style

: Follow standard conventions

## Recent Changes
- 003-news-homepage-sync: Added TypeScript 5.x / Next.js 14 App Router (React Server + Client Components) + Next.js 14, Prisma ORM, NextAuth v4, Supabase PostgreSQL
- 002-cms-pages-fix: Added TypeScript / Node 24.x (Vercel) + React 18 (Next.js 15 App Router) + Next.js 15, Prisma 6.x, NextAuth v4, Supabase PostgreSQL (external)

- 001-security-triage-phase-0: Added

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
