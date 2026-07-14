# ClientR4 · R4b — Detailed Result Sheets (SHIPPED & LIVE)

**Deployed 2026-07-13** → `sinai-rbac` (commit `94969dc`). **No schema change** (Vercel-only deploy). tsc 42 baseline (0 introduced), ESLint 0.

## What it does
Three official documents modelled on the client's samples (`ClientR4/*.pdf` + `*.jpeg`), added as a new
reporting category **`transcripts`** ("بيانات الحالة وكشوف النتائج"). Pure reuse of the GPA/standing
engines + the ministry print-letterhead (R3) — nothing added to the result schema.

## Reports (`lib/reporting/reports/transcripts.ts`)
1. **`student-transcript` — بيان حالة الطالب**: per-term course table (code/name/hours/الدرجة/النقاط/التقدير), term GPA line per فصل, cumulative in totals. Filter `studentCode` (required). Sheet header = student bio; footer = grade-scale from `GradeStatus`.
   - **Upgraded 2026-07-14 (commit `d157424`) to match `we need the reports of exams like this.jpeg`** (Mansoura/Ibn-Al-Haytham layout): emits `meta.transcript` (per-term blocks computed from enrollments + GradeStatus — registered/earned hours, quality points, running CGPA); hub renders a dedicated `TranscriptView` with per-term section headers + the full six-figure term footer (معدل فصلي/تراكمي، الساعات المسجلة/الحاصل عليها، نقاط الجودة، النقاط الفصلية) + final cumulative summary. Flat `rows` retained for CSV/Excel. NOT yet implemented: Mansoura retake "improved/excluded course" toggles. NB: the JPEG maps to THIS report — NOT to «كشف الوزارة — الفرق الانتقالية» (a batch roster).
2. **`graduates-batch` — كشف الخريجين**: one row per `status='GRADUATED'` student — CGPA (`computeStandingForStudents`), earned hours, تقدير (`cgpaToGrade`); grade distribution in `meta.stats`. Filters departmentId/programId.
3. **`level-result-sheet` — كشف نتيجة المستوى**: course-pivot roster (one column per course in the term), per-student term GPA (from `Enrollment.points`×creditHours) + result (ناجح/راسب/غير مكتمل via `classify`); result distribution + pass-rate in `meta.stats`. Filters level+academicYear+semester (required), dept/program.

## Hub
`ResultView` now renders `result.meta.stats` (`{label,value}[]`) as a distribution chip box above the table (works for any table/sheet report). CSV/Excel/print reuse the existing engine.

## RBAC — action needed for scoped roles
`reports.transcripts.view` added to the catalog + granted to `REGISTRAR` and `EXAMS_CONTROL`. **These grants only take effect once the RBAC catalog is synced to the DB.** Until then the reports are usable by the platform/super-admin (bypasses via `*`). The full `prisma/rbac/seed-rbac-and-backfill.ts` is TEST-ONLY (local-host guarded, also re-stamps tenants/user-roles) — do **not** run it against prod. A targeted, idempotent grant (upsert the permission + findFirst-then-create the two role links) is the safe way to apply it on Neon; flagged for a follow-up.

## Live verification (2026-07-13)
`student-transcript`/`graduates-batch`/`level-result-sheet` → 401 registered (unknown-id control → 404). App root 200.

## Next: R4c — HR module (phased-core).
