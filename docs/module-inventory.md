# Module Inventory

**Source**: Direct inspection of `app/`, `components/`, `lib/`, `store/`, `prisma/`, `public/`, `i18n/`  
**Last updated**: 2026-03-28

---

## `lib/` — Core Server Utilities

### `lib/prisma.ts`
**Responsibility**: Prisma client singleton  
**Key export**: `prisma` (default + named)  
**Coupling**: Imported by every API route handler  
**Critical**: Contains production DB URL hardcoded as a string literal when `NODE_ENV === 'production'`. Dev path reads `process.env.DATABASE_URL`. The global singleton pattern prevents multiple client instances in dev hot-reload.

```typescript
// Active production path:
const hardcodedUrl = 'postgresql://postgres.eacpjbbpwonwmthutxow:SinaiInstitute2026!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
```

### `lib/auth.ts`
**Responsibility**: NextAuth configuration — providers, JWT callbacks, session shape  
**Key export**: `authOptions` (NextAuthOptions)  
**Coupling**: Imported by all API routes using `getServerSession(authOptions)`, and by `app/api/auth/[...nextauth]/route.ts`  
**State**: `PrismaAdapter` imported but non-functional (JWT mode doesn't use adapter for session). DB auth block is commented out. Only active auth: hardcoded credential check.

### `lib/cloudinary.ts`
**Responsibility**: Cloudinary v2 SDK configured from environment  
**Key export**: `cloudinary` (default)  
**Coupling**: Imported by `/api/upload`, `/api/upload-image`, `/api/upload-media`  
**Side effect**: Logs cloud name prefix to stdout **on every module import** (runs at server startup and on each cold start in Vercel).

### `lib/utils.ts`
**Responsibility**: Tailwind class merging utility  
**Key export**: `cn(...inputs: ClassValue[])` — `clsx` + `tailwind-merge`  
**Coupling**: Imported by nearly every UI component; no side effects.

### `lib/pwa/`
**Responsibility**: PWA service worker management  
**Files**: `index.ts`, `register-sw.ts`, `network-status.ts`, `offline-storage.ts`, `push-notifications.ts`  
**Key exports**: `registerServiceWorker()`, `unregisterServiceWorker()`, `skipWaiting()`  
**Status**: `register-sw.ts` tries to register `/sw.js`. No `sw.js` file exists in `public/`. PWA functionality is broken at runtime. Push notification infrastructure code exists but is not connected to any notification service.

---

## `store/` — Client State Management (Zustand)

### `store/use-app-store.ts`
**Responsibility**: Global UI state  
**Pattern**: Zustand with `persist` middleware → `localStorage['edusaas-app-storage']`  
**Exports**:
- `useAppStore` — language (ar/en), direction (rtl/ltr), sidebar collapsed, mobile menu open, loading flag
- `useAuthStore` — user/institution state, isAuthenticated — **disconnected from NextAuth**; uses types from `types/index.ts` (SaaS scaffold types, not Prisma types)
- `useUIStore` — theme, sidebar width, notifications

**Critical coupling issue**: `useAuthStore.user` and `useAuthStore.isAuthenticated` reflect Zustand state only. They are not synced with NextAuth `useSession()`. Any portal page that checks `useAuthStore` for auth may show wrong user data or incorrect auth state.

**Persisted keys**:
- `edusaas-app-storage` — language, direction, sidebarCollapsed
- Note: `useAuthStore` and `useUIStore` appear to use separate `persist` configs — check `store/index.ts` for combined exports

### `store/index.ts`
**Responsibility**: Re-exports from `use-app-store.ts`  
**Key exports**: unknown; likely re-exports all three stores

---

## `components/` — UI Component Library

### `components/ui/` — 54 shadcn/ui Components
**Responsibility**: Radix UI primitive wrappers styled with Tailwind  
**Key components**: accordion, alert-dialog, avatar, badge, button, calendar, card, checkbox, command (cmdk), dialog, drawer (Vaul), dropdown-menu, form, input, label, pagination, popover, progress, radio-group, scroll-area, select, separator, sheet (slide-over), skeleton, slider, sonner (toast), switch, table, tabs, textarea, tooltip  
**Also includes**: `accessibility.tsx`, `performance.tsx`, `responsive-container.tsx` — purpose not confirmed  
**Coupling**: No business logic; pure UI primitives used throughout all portals and CMS

### `components/layouts/`
**Responsibility**: Page-level layout shells

| File | Scope | Key features |
|------|-------|-------------|
| `public-header.tsx` | Public pages | Polls `/api/pages` every 5 seconds for nav; `'use client'`; renders CMS dynamic nav; includes `NewsTicker` |
| `public-footer.tsx` | Public pages | Reads social media links from `localStorage['homepage_social_media']`; hardcodes WhatsApp and phone numbers |
| `dashboard-header.tsx` | All portals | Notifications, search, user dropdown |
| `dashboard-sidebar.tsx` | All portals | Collapsible; used in some portals where layout doesn't self-contain sidebar |
| `dashboard-footer.tsx` | All portals | Footer |
| `auth-layout.tsx` | Login page | Center-aligned auth form wrapper |

### `components/providers/`
**Responsibility**: App context providers

| File | What it wraps |
|------|--------------|
| `index.tsx` (Providers) | `SessionProvider` → `ThemeProvider` → `QueryClientProvider` → `Toaster` |
| `session-provider.tsx` | Thin wrapper around `next-auth/react SessionProvider` |
| `theme-provider.tsx` | `next-themes` provider; attribute=`"class"` (dark mode via class toggle) |

**`QueryClientProvider` confirmed in providers** — `@tanstack/react-query` IS wired at app level. Whether any component actually calls `useQuery` is unconfirmed.

### `components/page-builder/`

| File | Responsibility |
|------|---------------|
| `grapes-builder.tsx` | Wraps GrapesJS — static import inside `'use client'` component. GrapesJS is a browser-only library; using it inside `'use client'` is safe (blocked from SSR). Loads GrapesJS plugins: grapesjs-preset-webpage, grapesjs-blocks-basic, grapesjs-custom-code, grapesjs-navbar, grapesjs-tabs, grapesjs-tooltip, grapesjs-tui-image-editor, grapesjs-lory-slider, + additional plugins. |

### `components/shared/`
**Responsibility**: Reusable application-level components

| File | Responsibility |
|------|---------------|
| `news-ticker.tsx` | Horizontal scrolling news bar; fetches from `/api/news?published=true` |
| `stat-card.tsx` | Stat display card (number + label + icon) |
| `empty-state.tsx` | Empty placeholder with icon + message |
| `confirm-dialog.tsx` | Confirmation modal |
| `loading-spinner.tsx` | Spinner |

### `components/gamification/`
**Responsibility**: Gamification UI for student portal  
**Files**: `achievement-notification.tsx`, `badge-card.tsx`, `leaderboard-table.tsx`, `level-progress.tsx`, `points-display.tsx`, `rewards-shop.tsx`  
**Status**: UI components only; no API routes or DB models back gamification data

### `components/exam/`
**Responsibility**: Exam-taking UI  
**Files**: `answer-input.tsx`, `exam-progress.tsx`, `exam-result.tsx`, `exam-submit-dialog.tsx`, `exam-timer.tsx`, `question-display.tsx`, `question-navigator.tsx`  
**Status**: Built; used in `app/(lms)/lms/exams/take/[id]/page.tsx` (scaffold — no API backing)

### `components/charts/`
**Files**: `bar-chart.tsx`, `line-chart.tsx`, `pie-chart.tsx`  
**Status**: Likely using Recharts (in `package.json`); used in portal dashboard pages

### `components/data/`
**Files**: `advanced-list.tsx`, `data-grid.tsx`, `kanban-board.tsx`, `timeline.tsx`, `tree-view.tsx`  
**Status**: Complex UI components for portal data display; no API backing

### `components/drm/`
**Responsibility**: Content protection for LMS  
**Files**: `copy-protection.tsx`, `download-protection.tsx`, `watermark-overlay.tsx`  
**Status**: UI-level DRM (CSS-based, not cryptographic); used in `app/(lms)/lms/settings/protection`

### `components/forms/`
**Files**: `currency-input.tsx`, `email-input.tsx`, `file-upload.tsx`, `number-input.tsx`, `password-input.tsx`, `phone-input.tsx`, `search-input.tsx`, `time-picker.tsx`  
**Status**: Reusable form field components with validation wrappers

### `components/pwa/`
**Files**: `install-prompt.tsx`, `network-status-bar.tsx`, `offline-indicator.tsx`, `update-prompt.tsx`  
**Status**: PWA UI components; non-functional because `sw.js` doesn't exist

### `components/seo/`
**Files**: `metadata.tsx`  
**Purpose**: Client-side SEO metadata injection component

### `components/rich-text-editor.tsx` and `components/rich-text-editor-advanced.tsx`
**Responsibility**: Tiptap editor wrapper  
**Status**: Used in news/content forms in CMS (inferred); functional status in specific pages unconfirmed

---

## `app/api/` — API Route Handlers

All serverless functions. Pattern: `NextRequest → getServerSession (optional) → prisma call → NextResponse.json`.

| Route file | Models touched | Auth pattern |
|-----------|---------------|-------------|
| `api/departments/route.ts` | `Department`, `Specialization` (via include) | Read: public; Writes: session required |
| `api/news/route.ts` | `News` | Read: filtered GET; Writes: session required |
| `api/applications/route.ts` | `Application` | GET: session; POST: open (public form) |
| `api/complaints/route.ts` | `Complaint` | GET: session; POST: open (public form) |
| `api/results/route.ts` | `Result`, `StudentResult` | GET: open; Writes: session; ⚠️ POST broken |
| `api/schedules/route.ts` | `Schedule`, `Lecture` | GET: open; Writes: session |
| `api/upload/route.ts` | — | Session required; → Cloudinary |
| `api/upload-image/route.ts` | — | ⚠️ No auth; → Cloudinary `sinai-institute/news` |
| `api/upload-media/route.ts` | — | Unknown; → Cloudinary |
| `api/pages/route.ts` | `Page` | GET: open; POST/PATCH: ⚠️ No auth |
| `api/pages/[id]/route.ts` | `Page`, `PageBlock`, `PageVersion` | Unknown |
| `api/pages/[id]/blocks/route.ts` | `PageBlock`, `PageVersion` | Unknown; full block replace on POST |
| `api/pages/migrate/route.ts` | `Page` | Unknown (utility) |
| `api/pages/seed/route.ts` | `Page` | Unknown (utility) |
| `api/auth/[...nextauth]/route.ts` | `User` (bypassed) | NextAuth handler |

---

## `prisma/` — Database Layer

| File | Purpose |
|------|---------|
| `schema.prisma` | 14 model definitions; `db push` only (no migration history) |
| `seed.ts` | Creates 1 admin user + 6 departments + sample news; ⚠️ runs `deleteMany` on Department and News first |
| `dev.db` | SQLite database (299KB) from initial dev phase; committed to git; may contain PII |
| `migrations/` | Does not exist — no migration files |

---

## `public/` — Static Assets

| Path | Contents |
|------|---------|
| `manifest.json` | PWA manifest |
| `check-localstorage.html` | ⚠️ Debug tool: publicly accessible developer utility |
| `logo.png` | Institute logo |
| `favicon*.png`, `apple-touch-icon.png` | Icons |
| `uploads/applications/`, `uploads/news/`, `uploads/results/`, `uploads/schedules/` | Empty subdirectories; uploads go to Cloudinary |
| `images/news/`, `images/general-news/` | Committed static images (WhatsApp exports) |
| `sw.js` | ❌ Does not exist (PWA broken) |

---

## `i18n/` — Internationalization

| File | Contents |
|------|---------|
| `i18n/locales/ar.json` | Arabic translations (keys + values) |
| `i18n/locales/en.json` | English translations |

**Status**: Files exist; `next-intl` is installed; `NextIntlClientProvider` is NOT in `app/layout.tsx`; no `useTranslations()` calls observed. Locale files are unused at runtime.

---

## `types/` — TypeScript Types

| File | Contents |
|------|---------|
| `types/index.ts` | Rich SaaS type system: `User`, `Institution`, `Student`, `Faculty`, `Course`, `Department`, `Tenant`, etc. (~243 lines) |

**Coupling risk**: These types do NOT match the Prisma schema. For example, `types/index.ts` defines a `Department` type with different fields from `prisma/schema.prisma Department`. Any API response typed with `types/index.ts` types may silently fail to validate. `useAuthStore` uses `User` from this file — not the Prisma `User`.

---

## Dependency Summary (active packages confirmed in code)

| Package | Active usage confirmed |
|---------|----------------------|
| `next` | Core framework |
| `react`, `react-dom` | Core |
| `@prisma/client`, `prisma` | All API routes |
| `next-auth`, `@next-auth/prisma-adapter` | `lib/auth.ts`, middleware, API routes |
| `cloudinary` | 3 API routes |
| `grapesjs` + 11 plugins | `components/page-builder/grapes-builder.tsx` |
| `zustand` | `store/use-app-store.ts` |
| `framer-motion` | All portal `layout.tsx` files |
| `@tanstack/react-query` | `components/providers/index.tsx` (QueryClientProvider) |
| `react-hot-toast` | `Toaster` in providers |
| `next-themes` | `ThemeProvider` in providers |
| `clsx`, `tailwind-merge` | `lib/utils.ts` |
| `lucide-react` | Pervasive (icons) |
| `@radix-ui/*` | All `components/ui/` components |
| `bcryptjs` | `prisma/seed.ts` only (NOT in auth runtime) |
| `date-fns` | Date formatting in CMS (inferred) |
| `recharts` | Portal dashboards (inferred) |

| Package | Status |
|---------|--------|
| `next-intl` | Installed; not wired |
| `better-sqlite3` | `devDependencies`; unused (SQLite phase was abandoned) |
| `@tiptap/*` | Installed; active usage in specific pages unconfirmed |
