# ADR-001: Project Shape — Multi-Portal Monolith

**Date**: 2026-01-28 (inferred from initial scaffold)  
**Status**: Accepted (observed)  
**Context**: Brownfield reconstruction — decision inferred from source code, not from a recorded decision meeting.

---

## Context

The institute needed to digitize: a public marketing website, student enrollment, grade publication, timetables, a CMS for content editors, and administrative portals for multiple staff roles (teaching staff, accountants, library staff, student affairs, etc.).

---

## Decision

Build a **single Next.js application** (monolith with App Router route groups) that serves all personas from one deployed codebase.

Route groups organize the portals without URL overlap:

```
app/
  (public)/      → /
  (cms)/         → /cms/*
  (institute)/   → /institute/*
  (student)/     → /student/*
  (faculty)/     → /faculty/*
  (assistant)/   → /assistant/*
  (parent)/      → /parent/*
  (admin-portals)/ → /library-admin/*, /accountant/*, etc.
  (lms)/         → /lms/*
  (auth)/        → /login
  api/           → /api/*
```

---

## Rationale

- **One deploy** = one Vercel project, one database, one domain.
- **Speed**: Next.js App Router route groups allow persona-separation without infrastructure complexity.
- **Small team**: a single repo is easier to manage than a microservice split.
- **Shared DB access**: all portals read the same Prisma schema — no data synchronization needed.

---

## Consequences

**Positive**:
- Simple deployment; no inter-service calls.
- Shared components (`shadcn/ui`, Framer Motion, Radix) across all portals.
- One `prisma.schema` to maintain.

**Negative / risks**:
- A bug or build failure takes down all portals simultaneously.
- Bundle size grows as portals are built out.
- No isolation between portal domains; a compromised CMS session could theoretically reach all API routes.
- Portal authentication is inconsistent — middleware only guards `/cms/*`. All other portals are currently unauthenticated routes.

---

## Alternatives Not Chosen

| Alternative | Why not chosen |
|------------|---------------|
| Separate Next.js app per portal | Over-engineering for a small institute; more Vercel projects to manage |
| SaaS multi-tenant with separate DB per institute | Single institute target; overkill |
| WordPress + plugins | Not considered; developer preference for modern stack |
