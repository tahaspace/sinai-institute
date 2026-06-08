# Data Flow Map

**Source**: Direct code reads — `app/api/*/route.ts`, `app/(public)/page.tsx`, `components/layouts/`, `lib/prisma.ts`, `prisma/schema.prisma`  
**Last updated**: 2026-03-28

---

## 1. Public Website Read Flows

### 1.1 Homepage (`/`)
```
Browser load
  → HTML shell (empty, client-only)
  → Hydration triggers useEffect chains:
      └── localStorage.getItem('homepage_slides')     → Hero slider images
      └── localStorage.getItem('homepage_stats')      → Statistics section
      └── localStorage.getItem('homepage_specializations') → Specialization cards
      └── localStorage.getItem('homepage_institute_news')  → Institute news section
      └── localStorage.getItem('homepage_general_news')    → General news section
      └── localStorage.getItem('homepage_social_media')    → Footer social links (PublicFooter)

No server-side data fetch on homepage.
DB is NOT queried on page load.
```

### 1.2 Public Header Navigation
```
PublicHeader component mounts ('use client')
  → useEffect: fetch('/api/pages?published=true')  [no cache]
      → GET /api/pages → Prisma: Page.findMany({ where: { isPublished: true }, include: { parent, children } })
      → Returns array of published Page records
  → Filter: showInHeader = true, level = 1 (parents), level 2 (children)
  → Builds dropdown nav dynamically from DB

Polling: setInterval(loadPages, 5000) — refetches every 5 seconds while header is mounted
localStorage fallback: getCmsPages from 'cms_pages' key if API fails
```

### 1.3 News Ticker (`NewsTicker` component)
```
NewsTicker component mounts ('use client')
  → useEffect: fetch('/api/news?isInTicker=true&isPublished=true') [unclear params — confirm]
      → GET /api/news → Prisma: News.findMany({ where: { isPublished, category } })
  → Renders scrolling news bar
```

### 1.4 Dynamic Page Render (`/[slug]`)
```
Browser navigates to /some-slug
  → HTML shell (loading spinner)
  → useEffect: fetch('/api/pages?slug=some-slug&_t={timestamp}', { cache: 'no-store' })
      → GET /api/pages → Prisma: Page.findMany({ where: { slug }, include: { blocks, parent, children } })
      → Returns Page with blocks array
  → If page.isPublished = false → notFound()
  → Renders page.contentAr via dangerouslySetInnerHTML
  → Injects page.customCSS via <style dangerouslySetInnerHTML>
  → 15+ debug console.log statements execute in production
```

### 1.5 Schedule Viewer (`/schedules`)
```
'use client' page
  → useEffect: GET /api/schedules?departmentId=X&year=Y&semester=Z
      → Prisma: Schedule.findMany({ where, include: { department, lectures } })
  → Filter by department (client-side select)
  → Display schedule or PDF link
```

### 1.6 Results Viewer (`/results`)
```
Directories exist: app/(public)/results/  — but no page.tsx
→ Route 404s
```

---

## 2. Public Write Flows

### 2.1 Application Submission (`/apply`)
```
User fills 3-step form
  → Client: POST /api/applications
      body: { fullName, nationalId, birthDate, phone, email, address,
              highSchoolGrade, highSchoolYear, firstChoice, secondChoice?, thirdChoice? }
      → Check: Application.findUnique({ where: { nationalId } }) — 409 if duplicate
      → Application.create({ data: { ...fields, status: 'PENDING' } })
  → Returns: { id, nationalId, status: 'PENDING' }
  → No email notification sent (no mailer configured)
  → No auth required
```

### 2.2 Complaint Submission (`/complaints`)
```
User fills complaint form
  → Client: POST /api/complaints
      body: { studentName, studentId?, phone, email?, type, subject, message, attachments? }
      → Complaint.create({ data: { ...fields, status: 'PENDING' } })
  → Returns: created Complaint
  → No email notification sent
  → No auth required
```

---

## 3. CMS Data Flows (Authenticated)

Single credential: `admin@sainaiinstitute.com / admin123` → JWT cookie → used by all CMS operations.

### 3.1 Department Management
```
GET /cms/departments
  → fetch('/api/departments')
      → Prisma: Department.findMany({ where: { isActive: true }, include: { specializations, _count } })

POST/PUT /cms/departments  (session required)
  → fetch('/api/departments', { method: 'POST'|'PUT', body: { nameAr, nameEn, ... } })
      → Prisma: Department.create | Department.update

DELETE /cms/departments  (session required)
  → Prisma: Department.delete({ where: { id } })
      → CASCADE: deletes all Specializations, Results, Schedules for that department
      ⚠️ Cascade delete is irreversible and immediate
```

### 3.2 News Management
```
GET /api/news → Prisma: News.findMany({ where, orderBy: { publishedAt: 'desc' } })

POST /api/news (session required)
  Body: { title, content, summary, category, image, published, featured, showInSlider, ... }
  → Prisma: News.create(...)
  Image upload (separate): POST /api/upload-image (NO auth) → Cloudinary 'sinai-institute/news'
```

### 3.3 Application Processing
```
GET /api/applications (session required)
  → Prisma: Application.findMany({ where: { status? }, orderBy: { createdAt: 'desc' } })

PUT /api/applications (session required)
  Body: { id, status: 'ACCEPTED'|'REJECTED', notes }
  → Prisma: Application.update({ where: { id }, data: { status, notes } })
  No webhook or email on status change.
```

### 3.4 Results Management (BROKEN for create)
```
GET /api/results → Prisma: Result.findMany({ where, include: { department, studentResults } })
                   ⚠️ Orders by publishedAt — field doesn't exist in Result model (orders by undefined)

POST /api/results (session required) — ⚠️ BROKEN
  Body: { departmentId, year, semester, title, pdfUrl, published, allowDownload }
  → Prisma: Result.create({ data: {
        departmentId,
        year: parseInt(year),
        semester: parseInt(semester),   ← Type mismatch: schema has semester as String
        title,                          ← Field does not exist in Result model
        published: ...                  ← Field does not exist; should be isVisible
        publishedAt: new Date()         ← Field does not exist; should be publishDate
      }})
  → THROWS: Prisma "Unknown field 'title'" error
  → Result: CMS cannot create results. This entire feature is broken.

PUT /api/results (session required) — likely has same field name issues
```

**PDF upload for results** (working path):
```
Admin selects PDF → POST /api/upload (session required)
  body: FormData { file, type: 'results' }
  → Cloudinary.upload_stream({ folder: 'sinai-institute/results' })
  → Returns { url, filename }
  → Admin uses returned URL in results form
```

### 3.5 Schedule Management
```
POST /api/schedules (session required)
  Body: { departmentId, year, semester, academicYear, pdfUrl, isVisible, allowView, allowDownload }
  → Prisma: Schedule.create({ data: { ...fields } })
  ⚠️ Same semester String vs Integer issue: API does parseInt(semester), schema has String type

PDF upload for schedules: POST /api/upload → Cloudinary 'sinai-institute/schedules'
```

### 3.6 CMS Page Builder (GrapesJS)
```
List: GET /api/pages (force-dynamic)
  → Prisma: Page.findMany({ include: { blocks, parent, children }, orderBy: [level, order] })

Create page (NO auth required):
  POST /api/pages
  Body: { titleAr, titleEn, slug, parentId?, level, showInHeader, showInFooter, isPublished, ... }
  → Clean slug (strip protocol/domain/slashes, lowercase)
  → Check slug uniqueness: Page.findUnique({ where: { slug } })
  → Prisma: Page.create({ data: { ... } })

Edit page in GrapesJS:
  User edits in browser → GrapesJS manages block state in memory

Save blocks (via GrapesJS builder internal flow):
  POST /api/pages/{id}/blocks
  Body: { blocks: BlockArray, createVersion: boolean, versionComment? }
  → If createVersion:
      Prisma: PageVersion.create({ data: { pageId, version: n+1, blocksData: JSON.stringify(page.blocks) } })
      Prisma: Page.update({ data: { currentVersion: n+1 } })
  → Prisma: PageBlock.deleteMany({ where: { pageId } }) — all blocks deleted
  → Promise.all: PageBlock.create each block in blocks array
  → Atomic? No — delete then create is NOT atomic; if creation fails, blocks are lost

Update page metadata (NO auth required):
  PATCH /api/pages
  → Prisma: Page.update({ where: { slug }, data: { ...metadata } })
```

### 3.7 Homepage CMS Controls (localStorage-only)
```
Admin opens /cms/homepage
  → tabbed UI: Slides | Social Media | Specializations | Stats | News

Save slides tab:
  → localStorage.setItem('homepage_slides', JSON.stringify(slides))
  → NOT persisted to DB
  → Changes visible only in this browser session

Save social media:
  → localStorage.setItem('homepage_social_media', JSON.stringify(links))
  → NOT persisted to DB

Hero image upload:
  → POST /api/upload-image (NO auth)
  → Cloudinary 'sinai-institute/news'  ← wrong folder for hero images
  → URL stored in form state, then saved to localStorage

Public homepage reads:
  → localStorage.getItem('homepage_slides')  ← reads what this browser saved
  → Empty for all other devices/browsers
```

---

## 4. Key Data Model Relationships (Flow-Relevant)

```
Department (1) ──── (many) Specialization
             ──── (many) Result (1) ──── (many) StudentResult
             ──── (many) Schedule (1) ──── (many) Lecture

Page (self-referential tree)
  parent Page (level 1)
    └─ child Page (level 2)
         └─ grandchild Page (level 3)
  ──── (many) PageBlock (GrapesJS blocks)
  ──── (many) PageVersion (snapshots)

Application (standalone — no FK to Department or User)
Complaint (standalone)
News (standalone)
ContactMessage (standalone)
Setting (standalone — key/value)
WidgetTemplate (standalone — unused)
User (standalone — single record; not queried at login)
```

---

## 5. Major Mutations and Side Effects

| Operation | Mutation | Side Effect | Risk |
|-----------|---------|------------|------|
| Delete Department | `Department.delete` | CASCADE deletes all Results, Schedules, Specializations | ⚠️ Irreversible |
| Save GrapesJS blocks | `PageBlock.deleteMany` + `PageBlock.create[]` | Non-atomic — if create fails, page has no blocks | ⚠️ Data loss risk |
| Upload file | Cloudinary `upload_stream` | File lands in Cloudinary regardless of subsequent DB failure | Orphaned media risk |
| POST /api/pages | `Page.create` | No auth guard — anyone can create pages | ⚠️ Security |
| PATCH /api/pages | `Page.update` | No auth guard — anyone can inject customJS/customCSS | ⚠️ XSS |
| POST /api/upload-image | Cloudinary upload | No auth guard — anyone can consume Cloudinary quota | ⚠️ Security |
| Application.create | `Application.create` | nationalId uniqueness enforced, no email sent | Expected behavior |
| POST /api/results | Prisma throws | "Unknown field 'title'" — no result record created | ⚠️ Feature broken |
| `npm run prisma:seed` | `deleteMany(Department)` + `deleteMany(News)` | Wipes all production departments and news | ⚠️ Critical |
| Page version creation | `PageVersion.create` + `Page.update(currentVersion)` | Non-atomic — version record and page counter could diverge | Low risk |

---

## 6. Inferred Workflow Transitions

### Application Lifecycle
```
PENDING (on create via POST /api/applications)
  → ACCEPTED | REJECTED (via PUT /api/applications from CMS)
  
No email, no webhook, no student notification. Status change is silent.
```

### Complaint Lifecycle
```
PENDING (on create via POST /api/complaints)
  → ? (via PATCH /api/complaints — response field in model)

CMS reviewers can write 'response' to a complaint and update 'status'.
No notification to complainant.
```

### Page Publication
```
Draft (isPublished: false)
  → Published (isPublished: true, via PATCH /api/pages or CMS toggle)

Published pages appear in:
  - Header navigation (showInHeader: true)
  - Footer navigation (showInFooter: true)
  - Dynamic route render at /[slug]
```

### Result Visibility
```
Result created (isVisible: false) ← if POST were working
  → isVisible: true (via PUT /api/results)

Currently: POST is broken. Results cannot be created via the CMS UI.
Public can query results via GET /api/results (no auth required).
```

---

## 7. Data Flow — What Does NOT Go to the DB

| Data | Goes to | Notes |
|------|---------|-------|
| Homepage hero slides | `localStorage` | Admin device-local |
| Homepage stats | `localStorage` | Admin device-local |
| Homepage specializations | `localStorage` | Admin device-local |
| Homepage news sections | `localStorage` | Admin device-local |
| Social media links | `localStorage` | Admin device-local |
| Public nav pages (fallback) | `localStorage` read from `cms_pages` | Written nowhere by current code; may be stale |
| CMS UI state (sidebar) | Zustand → `localStorage['edusaas-app-storage']` | Per-browser only |
| User auth state clone | `useAuthStore` Zustand | Disconnected from real NextAuth session |
| PWA push notification preferences | Would go to `lib/pwa/offline-storage.ts` | PWA broken (no sw.js) |
