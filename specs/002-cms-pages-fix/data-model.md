# Data Model: CMS Pages Regression Stabilization

**Branch**: `002-cms-pages-fix`  
**Date**: 2026-03-29  
**Schema changes**: NONE

## Existing Entities (Read-only during this stabilization)

### Page

```prisma
model Page {
  id             String        @id @default(cuid())
  titleAr        String
  titleEn        String
  slug           String        @unique
  contentAr      String?       @db.Text
  contentEn      String?       @db.Text
  customCSS      String?       @db.Text
  customJS       String?       @db.Text
  isPublished    Boolean       @default(false)
  showInHeader   Boolean       @default(false)
  showInFooter   Boolean       @default(false)
  level          Int           @default(1)
  order          Int           @default(1)
  currentVersion Int           @default(1)
  parentId       String?
  parent         Page?         @relation("PageHierarchy", fields: [parentId], references: [id])
  children       Page[]        @relation("PageHierarchy")
  blocks         PageBlock[]
  versions       PageVersion[]
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}
```

### PageBlock

```prisma
model PageBlock {
  id           String  @id @default(cuid())
  pageId       String
  page         Page    @relation(fields: [pageId], references: [id], onDelete: Cascade)
  type         String
  content      String  @db.Text   // JSON stringified
  settings     String  @db.Text   // JSON stringified
  order        Int
  parentBlockId String?
  desktop      String? @db.Text   // JSON responsive config
  tablet       String? @db.Text
  mobile       String? @db.Text
  isVisible    Boolean @default(true)
}
```

## Component State Addition (No DB Impact)

New local state in `app/(cms)/cms/pages/page.tsx`:

| State Variable | Type | Initial | Purpose |
|---------------|------|---------|---------|
| `isError` | `boolean` | `false` | Tracks whether `loadPages()` caught an error |
| `errorMessage` | `string` | `''` | Human-readable error description for display |

These are client-side React states only. They have no database representation and do not alter the Page or PageBlock schema.
