# ClientR2 Implementation Log — Course Result Status & Exceptional Cases

Implementation of the second client requirement document (`ClientR2/اشكل حالات معهد الاسثناءية …docx`):
the **exceptional-case result engine** on top of the ClientR foundation. The bylaw separates the
*normal* control path (scores → total → letter → PASS/FAIL) from the *exceptional* path — when an
exceptional event occurs the system **starts from the STATE, not the scores**, and each state's
configurable properties drive the result.

> All work is on branch `feat/rbac-multitenant-platform`, **local/test only**. Production Supabase is
> **never touched**: schema is validated + `prisma generate`'d (no DB connection); `prisma db push`
> and the seed are staged for an isolated local/test DB (the `.env` `DATABASE_URL` here points at
> production, so no migration was run). Verification = `tsc --noEmit` + ESLint (no `next build`/DB).

Builds directly on [`clientr-implementation.md`](./clientr-implementation.md) (the `GradeStatus`-driven
GPA/standing/reports foundation).

---

## The model in one line

A result state is **not** the result; it is an **input** that decides how the result is produced.
The engine reads each state's properties off its `GradeStatus` row — instead of hardcoding behaviour
per screen ("السيستم يقرأ خصائص الحالة ويقرر") — and hangs a reason + attempt + pending-action +
approval record off the enrollment.

---

## Phase A — Schema (`prisma/schema.prisma`, validated; NOT pushed)

**`GradeStatus` += the rules-table properties** (all configurable per institute):
- `countsAttempt Boolean @default(true)` — does this outcome count as an attempt at the course
- `needsAction   Boolean @default(false)` — result is **held** until a follow-up is done (AB/INC/DEFER)
- `nextAction    String?` — `MAKEUP_EXAM | COMPLETE_ASSESSMENT | REPEAT | NONE`
- `isException   Boolean @default(false)` — control-managed exceptional state vs system letter grade
- `isFinal       Boolean @default(true)` — false for non-terminal states (INC/DEFER) that must resolve

(`affectsGpa` = GPA column, `isPass` = Earn-Credit column — already existed.)

**New `CourseResultReason`** — the configurable "why" (`WrittenFail / AttendanceShortage / MedicalExcuse
/ WithdrawalRequest / DisciplinaryAction …`), tenant-scoped, `@@unique([universityId, code])`. Referenced
**softly** by `Enrollment.reasonCode` (mirrors the `gradeStatusCode` soft-reference — no hard FK, keeps
tenant config swappable).

**`Enrollment` += state-machine columns:** `reasonCode`, `attemptNo`, `resultPending`, `actionType`,
`actionDueDate`, `actionResolvedAt`, `statusSetBy`, `statusApprovalState` (`null|PENDING|APPROVED|REJECTED`),
`statusApprovedBy`, `statusApprovedAt`.

`npx prisma validate` → **valid**; `npx prisma generate` → client regenerated with all fields.

## Phase B — Engine (`lib/`)

**`lib/course-result.ts` (new)** — the single write path + rules resolver for exceptional states:
- `statusEffects(code)` → resolves a code to its configured effects (the rules-table lookup).
- `attemptInfo(studentId, courseId, forEnrollmentId?)` → `{ attempts, fails, passed, thisAttemptNo }`,
  ordered by term. `attempts` counts `countsAttempt` outcomes; `fails` mirrors `lib/registration.ts`
  repeated-failure semantics (graded, non-pass, GPA-affecting) so the dismissal rule and the registration
  block agree.
- `setExceptionStatus(enrollmentId, {code, reasonCode?, actionType?, actionDueDate?, setByUserId?})` —
  validates the code is an exception, sets points/letter/reason/attemptNo from config, sets
  `statusApprovalState='PENDING'` (**soft** two-step approval), and **holds** the result
  (`resultPending=true`, `status='PENDING'`) when `needsAction`. Recomputes CGPA (held/null-point statuses
  are excluded automatically).
- `approveExceptionStatus(enrollmentId, {approve, approverUserId?})` — approver confirms/rejects.
- `resolveAction(enrollmentId, {code?, components?, resolvedByUserId?})` — makeup graded / assessment
  completed → settles via `lib/gpa.setEnrollmentResult` (INC → PASS/FAIL), clears the held flag, stamps
  `actionResolvedAt`. Lazy-imports gpa to keep the dependency one-directional.

**`lib/gpa.ts`** — `setEnrollmentResult` now also records `attemptNo` (1-based among prior
`countsAttempt` outcomes) and a `reasonCode` (explicit, or auto-default for `BL→WrittenFail`,
`DN/NE→AttendanceShortage`, `DS→DisciplinaryAction`, `W/FW→WithdrawalRequest`), and clears any stale
`resultPending`. CGPA math unchanged.

**`lib/standing.ts`** — surfaces `repeatedFailure[]` (courses failed ≥ `maxCourseAttempts`, cleared once
passed) + an Arabic flag. Additive; the running-CGPA/probation/honor/graduation math is untouched.

**`lib/reports.ts`** — `failReasons`, `absenceReasons`, `openActions` (reason/action analytics); `classify()`
extended so the canonical `INC/AB/DEFER` join the legacy `I/E` "incomplete" bucket.

**`lib/regulations.ts`** — `makeupDeadlineWeeks: 2` (INC/AB follow-up window).

## Phase C — RBAC + config seed

**`prisma/rbac/catalog.ts`** — new keys `exam.exception.view | set | approve`. `REGISTRAR` (شؤون الطلاب)
gains `view + approve` (AB/DEFER approver); `EXAMS_CONTROL` & `FACULTY_ADMIN` get them via the `exam.*`
wildcard; `INSTITUTE_ADMIN` via `ALL_TENANT`.

**`scripts/seed-result-states.ts` (new, idempotent, production-guarded)** — backfills the rules-table
properties onto every existing status row per the spec table, adds the canonical `AB / ABS / INC / DEFER`
codes (alongside the legacy `E / I / NE` synonyms — **nothing is renamed**), and seeds the reason catalogue.
Run order: `seed-student-test.ts` → `seed-result-states.ts`.

### Rules table as seeded (matches the doc)

| Code | GPA | Earn | CountAttempt | NeedAction | NextAction | Exception |
|------|-----|------|--------------|------------|------------|-----------|
| A–D  | ✓ | ✓ | ✓ | — | NONE | — |
| F / BL | ✓ | — | ✓ | — | REPEAT | (BL no) |
| AB / E | — | — | — | ✓ | MAKEUP_EXAM | ✓ |
| INC / I | — | — | — | ✓ | COMPLETE_ASSESSMENT | ✓ |
| DEFER | — | — | — | ✓ | COMPLETE_ASSESSMENT | ✓ |
| W | — | — | — | — | NONE | ✓ |
| FW | — | — | ✓ | — | NONE | ✓ |
| DN / DS / ABS / NE | ✓ | — | ✓ | — | REPEAT | ✓ |

## Phase D — API

- `GET/PATCH/POST /api/institute/grade-statuses` — now expose+edit the 5 new properties.
- `GET/POST/PATCH/DELETE /api/institute/course-result-reasons` — reason catalogue CRUD (`exam.grade.edit`).
- `GET/PATCH /api/institute/exams/exceptions` — the control desk:
  - `GET` → exception status options, reasons, letter options, pending-approval queue, open-action list,
    and (with `?courseId=`) the course roster with each row's state.
  - `PATCH action=set` (`exam.exception.set`) → `setExceptionStatus`; `approve|reject`
    (`exam.exception.approve`) → `approveExceptionStatus`; `resolve` (`exam.exception.set`) →
    `resolveAction`. Each writes an `AuditLog` entry with the actor's user id.
- `GET /api/institute/reports?type=` — adds `fail-reasons | absence-reasons | open-actions`.

## Phase E — UI (`app/(institute)/institute/`)

- **`exams/exceptions`** — set exceptional status + reason + makeup deadline per student; pending-approval
  queue (اعتماد/رفض); open follow-up actions (إنهاء → derive from scores or pick a final grade).
- **`exams/result-states`** — the rules table editor (per-status switches + `nextAction`) and the reason
  catalogue (add/delete). Toggles PATCH live.
- **`reports`** — three new report tabs (أسباب الرسوب / أسباب الغياب / الإجراءات المفتوحة).
- Nav + exams-hub tiles for both new pages.

## Soft-approval semantics (explicit decision)

The owner chose **two-step *soft* approval**. Precise behaviour, by design:
- **`needsAction` states (AB/INC/DEFER):** the result is **held** — `resultPending=true`, points `null`,
  so it is excluded from the settled GPA/earned-hours until `resolveAction` settles it. This is the
  spec's "معلقة لحين تحديث".
- **Terminal exceptional states (DN/FW/W):** applied immediately (DN counts as a fail in GPA at once),
  carrying `statusApprovalState='PENDING'` as a confirmation flag. Approval is a sign-off, not a gate that
  withholds the grade.
- **Reject** sets `statusApprovalState='REJECTED'` (a flag for the control to correct/re-set the status);
  it does **not** auto-revert to a prior grade (no per-enrollment grade history exists to revert to).

A stricter "withhold every pending exceptional status from GPA until approved" variant would require the
GPA/standing hot-loops to read `statusApprovalState` — deferred to avoid regressing the proven engine; the
adversarial review judged the current behaviour consistent with the soft model.

## Build status

`tsc --noEmit` → **42 errors total = the pre-existing baseline** (all in untouched files; the only two in
`lib/` are the pre-existing `lib/pwa/push-notifications.ts` PWA-API errors). **0 introduced.** ESLint on all
new/changed files → **0 errors** (two `layout.tsx` unused-import *warnings* are pre-existing). `next build`
was **not** run (it connects to production Supabase and `next/font/google` fails offline — same
environmental note as ClientR Phase E).

## Adversarial review (2026-06-15)

An 8-dimension adversarial review (each finding independently re-verified against the real code) ran over
the diff. **2 LOW findings confirmed, 13 rejected.** Confirmed + fixed: `nextAction` now `@default("NONE")`
(was nullable → null/'NONE' divergence between seed paths). Confirmed-but-by-design: the exceptions UI
derives the follow-up action from the status' configured `nextAction` (per the rules table) rather than
exposing a per-row override — intended. Forward-consistency hardening applied: `@@index([resultPending])` +
`@@index([statusApprovalState])` for the queue/report scans, and the canonical `AB/ABS` added to the
deprived ministry-sheet code set. Regression check (manual): all three `setEnrollmentResult` callers
(`faculty/grades`, `exams/grades`, `attendance-report`) use only pre-existing return fields — non-breaking.
(Note: several review agents hit the session token limit mid-run; the engine/api/regression dimensions were
re-checked manually.)

## To deploy to a local/test DB

```bash
DATABASE_URL="<local-test-db>" npx prisma db push
DATABASE_URL="<local-test-db>" NODE_ENV=development npx tsx scripts/seed-student-test.ts
DATABASE_URL="<local-test-db>" NODE_ENV=development npx tsx scripts/seed-result-states.ts
DATABASE_URL="<local-test-db>" npx tsx scripts/seed-demo-users.ts   # for RBAC role accounts
```
Production rollout follows the same `prisma db push` + seed, executed against the production `DATABASE_URL`
only after a Supabase backup (per `CLAUDE.md` Prisma Safety Rules).
