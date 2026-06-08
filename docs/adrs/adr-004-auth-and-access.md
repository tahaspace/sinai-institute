# ADR-004: Authentication and Access Control

**Date**: ~2026-01-30 (inferred from chat — "completing the 20%")  
**Status**: Accepted (observed) — with known gaps  
**Context**: Brownfield reconstruction.

---

## Context

The application serves multiple user personas: CMS admins, students, faculty, teaching assistants, parents, and various specialized admin roles. An authentication system was needed.

---

## Decision

Use **NextAuth.js v4** with the **Credentials provider** (email + bcrypt password) as the only authentication method.

**Middleware** guards only CMS routes:

```typescript
// middleware.ts
export const config = {
  matcher: ['/cms/:path*', '/login'],
}
```

All other routes (`/student/*`, `/faculty/*`, `/institute/*`, etc.) are **publicly accessible**.

---

## Authentication Flow

```
/login page
  → POST /api/auth/callback/credentials
  → bcryptjs compare(inputPassword, User.password)
  → NextAuth creates JWT session
  → middleware redirects authenticated user away from /login
  → protected /cms/* requires valid session
```

---

## Session Strategy

JWT (NextAuth default for Credentials provider). Sessions are not stored in DB — no `Session` model in Prisma.

---

## Password Security

Passwords hashed with `bcryptjs` v3. Seed admin: `admin@sainaiinstitute.com` / `admin123` (hashed at seed time).

---

## Role Model

`User.role` is a plain string. Possible values: `"EDITOR"`, `"ADMIN"` (default: `"EDITOR"`).

**Current enforcement**: None. Middleware does not differentiate between `EDITOR` and `ADMIN`. Role field exists but is unused in access control logic.

---

## Consequences

**Positive**:
- CMS is protected from unauthenticated access.
- Simple single-user admin flow for a small team.
- No OAuth complexity / third-party dependencies.

**Negative / risks**:
- **Portal routes are entirely unprotected** (KI-008). Any user can access `/student/dashboard`, `/faculty/grades`, etc. without credentials.
- `NEXTAUTH_SECRET` is weak and committed to VCS (KI-002).
- Single user type (`User`) — cannot represent students or faculty in the DB. Portal auth cannot be implemented without adding new models.
- No password reset flow.
- No session revocation (JWT — can't invalidate without rotating the secret).
- `User` model is CMS-only — portals are UI scaffolds with no identity backend.

---

## Security Gaps To Address

| Gap | Priority | Action |
|-----|----------|--------|
| Portal routes unprotected | 🟡 Medium | Add to middleware matcher or per-layout auth check |
| Weak `NEXTAUTH_SECRET` | 🔴 Critical | Rotate + remove from VCS (KI-002) |
| No student/faculty identity | 🟠 High | Add `Student` and `Faculty` models (OQ-014, OQ-015) |
| RBAC not enforced | 🟡 Medium | Enforce `USER.role` in middleware or API layer |

---

## Intended Future State (Uncertain)

The platform has UI for student, faculty, and admin portals but no corresponding identity records. It is unclear whether:

1. The portals were planned for demo/prototype only (no real auth needed yet).
2. The intent is to add separate auth for each persona type.
3. A single unified login is planned where role determines the redirect destination.

> This is **OQ-014** and **OQ-015** — must be answered before implementing portal auth.

---

## Alternatives Not Chosen

| Alternative | Notes |
|-------------|-------|
| OAuth (Google, Microsoft) | Not considered — likely no institutional SSO available |
| Supabase Auth | Not used despite Supabase being the DB; NextAuth already integrated |
| Auth0 / Clerk | Not mentioned; would add per-user cost |
