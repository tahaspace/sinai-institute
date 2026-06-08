# ADR-003: Data Model and Prisma ORM

**Date**: 2026-01-28 (inferred)  
**Status**: Accepted (observed)  
**Context**: Brownfield reconstruction.

---

## Context

The application needed persistent storage for: academic departments, student results, timetables, news, enrollment applications, complaints, CMS pages, and site settings. A database abstraction layer was needed for Next.js API routes.

---

## Decision

Use **Prisma ORM 5** with a **PostgreSQL** datasource. Schema stored in `prisma/schema.prisma`. All DB access goes through the Prisma Client (`@prisma/client`).

---

## Schema Design Choices

### 1. Bilingual fields as parallel columns
Rather than a separate i18n/translations table, every content entity has `nameAr`/`nameEn` (or `titleAr`/`titleEn`, `contentAr`/`contentEn`) columns.

**Trade-off**: Simple queries; adding a third language requires schema migration + application changes.

### 2. No `Student` or `Faculty` user models
Only `User` (CMS admin) exists in the DB. The student/faculty portals are UI-only scaffolds with no backing identity records.

**Impact**: Portal authentication is not implementable without adding `Student` and `Faculty` models.

### 3. Settings as key/value store
`Setting` model stores arbitrary key/value pairs. Intended as a general-purpose config store but currently underused — homepage sections still use `localStorage`.

### 4. Self-referential `Page` model for hierarchy
`Page.parentId` references `Page.id` (cascade delete on parent removal). Supports up to 3 navigation levels.

### 5. `PageBlock` format — JSON strings in `content` and `settings`
Block content is stored as serialized JSON in `String` columns, not JSONB. This limits queryability but avoids a Prisma-specific JSONB handling complexity.

### 6. No enum types — roles and statuses as plain strings
`User.role`, `Application.status`, `News.category`, etc. are raw strings, not Prisma enums.

**Risk**: No compile-time enforcement of valid status values. Values currently in use: `"PENDING"`, `"ACCEPTED"`, `"REJECTED"` (applications); `"EDITOR"`, `"ADMIN"` (users).

---

## Migration Strategy

No formal Prisma migrations (`prisma migrate`) are used. Schema changes are applied with:
```bash
npx prisma db push
```

This means there is **no migration history file** and no rollback mechanism.

---

## Consequences

**Positive**:
- Type-safe DB access in TypeScript.
- `prisma generate` produces a client that matches the schema exactly.
- `dev.db` SQLite for local development; same schema works against PostgreSQL.

**Negative / risks**:
- `prisma db push` is destructive on incompatible schema changes — no migration history.
- JSON strings in `PageBlock.content` — no server-side querying of block content.
- No student/faculty DB identity — portals cannot implement real auth without a schema extension.
- Development DB (`dev.db`) is committed to git.
- Prisma client cached a stale connection URL at build time (historical bug, currently worked around with hardcoded URL).

---

## Outstanding Questions

- Does `HomepageSpecialization` model currently exist in production schema? (OQ-005)
- Are `Page`, `PageBlock`, `PageVersion`, `WidgetTemplate` synced to production? (OQ-006)

---

## Alternatives Not Chosen

| Alternative | Reason |
|-------------|--------|
| Drizzle ORM | Prisma was the developer's existing choice |
| Raw `pg` client | Less type safety; more boilerplate |
| Supabase client SDK | Would bypass Prisma; inconsistent with ORM pattern |
| MySQL (original) | Migrated to PostgreSQL for Vercel/Supabase compatibility |
