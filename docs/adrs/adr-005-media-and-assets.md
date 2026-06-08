# ADR-005: Media and Asset Storage

**Date**: ~2026-02-03 (inferred from Cloudinary integration chat)  
**Status**: Partially implemented — inconsistent across features  
**Context**: Brownfield reconstruction.

---

## Context

The application needs to handle multiple types of user-uploaded files:
- News article images
- Hero Slider background images
- Schedule documents (PDF or image)
- Student application documents
- General CMS media

Vercel's serverless runtime does **not** provide a persistent writable filesystem. Any file written to disk at request time is lost after the serverless function exits (certainly after redeploy).

---

## Decision

Use **Cloudinary** as the primary media storage and CDN for all uploads.

Two API endpoints were created:
- `POST /api/upload-image` — images (news, hero, etc.)
- `POST /api/upload-media` — general media

**However, this was only partially applied.** Some features use local file system writes instead.

---

## Actual State (Observed)

| Feature | Upload Target | Evidence | Production-safe |
|---------|--------------|----------|----------------|
| News images (CMS) | Cloudinary via `/api/upload-image` | `cloudinary` package, env vars set | ✅ |
| General media (CMS) | Cloudinary via `/api/upload-media` | | ✅ |
| Schedule documents | `public/uploads/schedules/` (local) | `cursor_ 02.md`, `/api/upload` route | ❌ |
| Hero Slider images | Uncertain — likely local `public/images/news/` | `cursor_hero_slider.md` | ❌ |
| Application documents | `documentsUrl` field (URL string) | Prisma schema | ✅ if Cloudinary URL |

---

## Cloudinary Configuration

```
Cloud name:  dyz4dc6n7
API Key:     137484848333568
API Secret:  oaC-TNAKAqP1-tOkvCask5TGTmY  ⚠️ committed in .env.production
```

Credentials are set in Vercel environment variables but also exist in `.env.production` (committed).

---

## Local Upload API (`/api/upload`)

A third upload route exists that writes to the local filesystem:
```
POST /api/upload → writes to public/uploads/
```
This route powers schedule uploads. Files uploaded via this endpoint **will be lost** on Vercel redeploy.

---

## Consequences

**Positive**:
- Cloudinary provides a global CDN, transformation API, and persistent storage.
- No cost for current media volume (free tier).
- News images survive redeploys.

**Negative / risks**:
- **Schedule PDFs are lost on every redeploy** (KI-005).
- **Hero Slider images may be lost** depending on which handler is used (OQ-009).
- Three upload handlers with inconsistent behavior create a maintenance trap.
- Cloudinary API secret committed to git (KI-001).

---

## Recommended Resolution

1. **Audit** `/api/upload/route.ts` to confirm it writes locally.
2. **Audit** the Hero Slider upload handler to confirm destination.
3. **Migrate** both to use the existing Cloudinary-backed `/api/upload-image` endpoint.
4. **Update** schedule and hero image `pdfUrl` / `imageUrl` fields to store Cloudinary URLs.
5. **Remove** `/api/upload` (local handler) once migration complete.
6. **Rotate** Cloudinary credentials and remove from `.env.production` in git.

---

## Alternatives Not Chosen

| Alternative | Notes |
|-------------|-------|
| AWS S3 | Standard choice; Cloudinary preferred for image transformation capabilities |
| Supabase Storage | Available alongside Supabase DB; not used — likely not evaluated |
| Vercel Blob | Vercel's native storage; not used — may not have been available or known at time |
| UploadThing | Not mentioned |
