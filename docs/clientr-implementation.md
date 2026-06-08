# ClientR Implementation Log

Implementation of the client requirement documents in `ClientR/` (Arabic bylaw + course
registration + result-state model). All work is in the **isolated local test DB**
(`sinai_test` on 127.0.0.1:5432) — production is never touched.

Decisions confirmed with the client:
- **Sequencing:** the implementer sequences all phases.
- **Configurable + defaults:** result states live in a `GradeStatus` table and bylaw
  thresholds in a `Setting` JSON blob; documented defaults apply when unset (no hardcoded
  bylaw numbers in business logic).

---

## Phase A — Foundation (DONE ✅, runtime-verified)

**Schema** (`prisma/schema.prisma`, pushed to test DB):
- `GradeStatus { code @unique, name, points Float?, affectsGpa, isPass, isLetter, minPercent Int?, order }`
- `Course += countsInGpa, requirementType ("mandatory"|"elective"), availableInSummer`
- `Enrollment += gradeStatusCode String?`

**Config defaults** (`lib/regulations.ts` — `DEFAULT_REGULATIONS`, overridable via
`Setting["institute.regulations"]`): probationGpa 2.0, probationHourCap 12,
maxConsecutiveProbation 3, maxSeparateProbation 4, honorCgpa 3.33, honorTermGpa 3.0,
absenceBanPercent 25, attendanceWarnThreshold 75, withdrawWeek 12, writtenMinPercent 30,
incompleteCourseworkPercent 60, graduationHours 132, levelMinHours {1:0,2:30,3:66,4:99}.

**GPA engine** (`lib/gpa.ts`): `letterForPercent`, `computeStanding` (CGPA honours
`status.affectsGpa && course.countsInGpa && points!=null`; earned hours from `isPass`),
`recomputeStudentGpa`.

**APIs/UI:** `/api/institute/grade-statuses` (GET/PATCH/POST), `/api/institute/courses`
exposes the new flags + grade split, `institute/departments/courses` page shows them.

**Seed** (`scripts/seed-student-test.ts`): 19 GradeStatus rows; struggling student 2024-107
seeded with CS201:F / CS202:I / CS203:W.

**Runtime proof:** demo 2024-105 CGPA **3.77** (letters only); struggling 2024-107 CGPA
**0.0** (F=0 counted, I/W excluded, earned hours 0).

---

## Phase B — Result states wired into grade entry (DONE ✅, runtime-verified)

**Shared write path** (`lib/gpa.ts`):
- `deriveGradeCode(course, components)` — letter from total %, **but** a written/final exam
  below `writtenMinPercent` (30%) with a passing total → **`BL` board fail**.
- `setEnrollmentResult(enrollmentId, {code?, components?})` — single write path used by both
  faculty and institute entry: an explicit `code` (control-head verbal grade) overrides the
  derived letter; sets `letterGrade`/`points` from the GradeStatus row; **recomputes CGPA**.

**Endpoints:**
- `PATCH /api/faculty/grades` — numeric entry → shared path (removed the old hardcoded
  `gradeFromPct`). GET roster now returns `gradeStatusCode` + `statusName`.
- `PATCH /api/institute/exams/grades` — numeric entry **or** `statusCode` override
  (control-head: I/E/W/NE/DN/FW/DS/BL/TR). Incomplete (I) is rejected (422) when recorded
  coursework < `incompleteCourseworkPercent`. GET returns per-row status + the list of
  special status codes for the dropdown.
- `GET /api/student/grades` — each subject carries `gradeStatusCode/statusName/affectsGpa/
  isPass`; `stats` now uses the engine (`gpa`, `earnedHours`, `gpaHours`).

**UI:** institute grade-entry page gained a **"الحالة (الكنترول)"** dropdown per student
(auto / verbal status); student grades page gained a **"الحالة"** column (color-coded by
pass / counts-but-fails / excluded).

**Runtime proof:** auto-BL fired (final 25%<30%, total 62.5% → BL, CGPA 3.77→3.06); override
→W excluded the course (→3.72); Incomplete reject returned 422 with the bylaw message;
restore→A returned CGPA to 3.77; student read-back showed status + earnedHours 17.

---

## Phase C — Academic standing (DONE ✅, runtime-verified)

**Engine** (`lib/standing.ts`): `computeAcademicStanding(studentId)` + batch variant.
Walks terms chronologically, tracks the **running CGPA after each regular term** (summer
excluded), and derives:
- **Probation / warnings:** `onProbation` (CGPA < probationGpa) → `hourCap` 12; counts the
  longest consecutive run + total separate probation terms; escalates to
  `track-change-or-dismissal` at `maxConsecutiveProbation` (3) consecutive or
  `maxSeparateProbation` (4) separate.
- **Honor roll:** `termHonor` (latest regular term GPA ≥ honorTermGpa, no fail) and
  `cumulativeHonor` (CGPA ≥ honorCgpa **and** all mandatory courses passed).
- **Level promotion:** highest level whose `levelMinHours` ≤ earned hours.
- **Graduation:** `earnedHours ≥ graduationHours` **and** no failed mandatory course
  (retakes honoured — a course passed on any attempt counts as passed).
- Arabic `flags[]` for UI badges / report lines.

**APIs:** `GET /api/institute/academic-standing` (per-student via `?studentCode=`, or a
dashboard list + aggregates over all currently-enrolled students — excludes only
GRADUATED/WITHDRAWN/DISMISSED so probation students appear). `GET /api/student/standing`
(the logged-in student's own).

**UI:** new **institute/exams/academic-standing** page (6 stat cards + filterable table
with colour-coded flag badges), linked from the exams hub; student grades page shows a
colour-coded standing **banner**.

**Runtime proof:** 2024-107 → `warning` + 12h cap + 3 failed mandatory; 2024-105 → honor
(term + cumulative); a synthetic 3-consecutive-fail student → `track-change-or-dismissal`
(consecutive=3); dashboard aggregates warnings:1 / finalWarnings:1 / honor:2.

## Phase D — Course registration + advisor approval (DONE ✅, runtime-verified)

**Schema** (pushed): `CourseOffering` (course × term), `Section` (schedulable شعبة with
day/start/end/room/capacity/instructor), `RegistrationRequest` (workflow status
Draft→Submitted→Pending→Approved/Rejected/Returned/Cancelled, `@@unique` per
student+term), `RegistrationItem` (section line). `Student += advisorId` (→ Instructor),
`Instructor += advisees/sections/advisorRequests`, `Course` prerequisite self-relation
(`CoursePrereq`).

**Seed** (`scripts/seed-registration.ts`, idempotent): links the 6 current students to the
demo faculty advisor; adds higher-level courses CS301/CS302/CS303/CS304 (prereqs
CS201/CS204) + MA202 + elective EN202; creates 6 open offerings/sections for 2024-2025
**second** term — CS301 & MA202 deliberately overlap Sunday morning (time-conflict demo);
CS301/CS303 need CS201 (which the struggling student failed → prereq-block demo).

**Validation engine** (`lib/registration.ts` — `validateRegistration`): min/max hours
(`minRegHours` 12 / `maxRegHours` 18; summer `summerMaxHours` 9), probation hour cap
(`probationHourCap` overrides max when on probation), prerequisites (must be passed),
pairwise time-conflict, repeated-failure (`maxCourseAttempts` 3), summer availability,
offering open + correct term, already-passed warning. Returns structured `issues[]`
(error/warning) + totals.

**APIs:** `GET/POST /api/student/registration` (catalog + current request + live validation;
save Draft / submit→Pending / cancel — submit blocked on any error). `GET /api/faculty/advisees`
(advisee list + standing summary, or `?studentCode=` → full **Student Academic Profile**:
standing + transcript by term + current request). `GET/PATCH /api/faculty/registration`
(pending requests with server-side re-validation; bulk approve/reject/return — **approve
materializes `Enrollment` rows** and re-validates so an errored request can never be approved).

**UI:** `/student/registration` (catalog, one-section-per-course picker, hour meter,
live validation, save/submit/cancel) and `/faculty/advisees` (pending-request approval with
bulk actions + notes, advisee table, inline academic-profile panel). Nav links added to both
sidebars.

**Runtime proof:** time-conflict + min-hours + prereq-fail + probation-cap all flagged;
valid 12h selection → save Draft → submit → Pending; advisor approve → **4 Enrollment rows
(ENROLLED)**; approving an errored request refused (`يحتوي على أخطاء تحقق`); reject with
note → Rejected. Test artifacts reset; offerings/sections preserved for live demo.

## Phase E — Reports suite + attendance 3-stage (DONE ✅, runtime-verified)

**Reports engine** (`lib/reports.ts`): `courseResults` (per-course enrolled/pass/fail/
withdrawn/incomplete + pass rate + totals), `gradeSheet` (كشف رصد — roster with
components + outcome), `standingReport('warned' | 'expected-graduates')`, `ministryPrep`
(exam-board candidates). A shared `classify(status)` keeps pass/fail/withdrawn/incomplete
consistent with the GPA engine.

**API** `GET /api/institute/reports?type=` — `course-results | grade-sheet | warned |
expected-graduates | ministry-prep | transcript` (+ course list for pickers). Transcript
built inline (terms → courses + standing).

**Attendance** (`lib/attendance.ts` — `courseAttendance`): `Attendance` extended with
`courseId/academicYear/semester` (re-keyed `@@unique([studentId, courseId, date])`).
Computes per-student sessions/attended/absent/attendance%, a 3-stage warning (escalating
points at 40/60/80% of the ban threshold) and `banned` (absence > `absenceBanPercent`).
`GET/PATCH /api/institute/attendance-report` — roster + the **apply-deprivation** action
(PATCH → `setEnrollmentResult(DN)` → counts as fail, recomputes CGPA).

**Seed** `scripts/seed-attendance.ts` (20 sessions × CS201 first-term roster): 2024-107 35%
→ banned; 2024-103 20% → stage 3; 2024-104 15% → stage 2; 2024-101 10% → stage 1.

**UI:** `/institute/reports` (report-type selector + adaptive tables + print) and
`/institute/exams/attendance` (attendance roster with stage badges + apply-deprivation
button). Both linked from the exams hub.

**Runtime proof:** course-results (CS201 67% pass rate, 1 fail, CS203 1 withdrawal, overall
88%); warned = 2024-107; transcript 2024-105 full; grade-sheet CS201 outcomes; attendance
stages 1/2/3 + banned exactly as seeded; apply-deprivation → DN + CGPA recompute. Demo data
restored (2024-107 CS201 back to F).

---

## Build status (`/goal` gate)

`npm run build` → **EXIT 0**, `BUILD_ID` written, **139/139 static pages**, all new routes
compiled. `tsc --noEmit` = 42 pre-existing errors in untouched files (build-suppressed),
**0 introduced**; ESLint on all new files = **0 errors**.

> Gotcha discovered: a running `npm run dev` server races `next build` over `.next` and
> corrupts the production build (missing routes, exit 1, no `BUILD_ID`). **Stop the dev
> server before `npm run build`.** With a clean `.next` and no dev server, the build is green.

Everything remains in the **isolated local test DB** — production untouched throughout.

## Middleware — admin portal preview (2026-06-08)

`middleware.ts` role-gates each portal. Updated so **staff/admin roles (SUPER_ADMIN, etc.)
may preview ANY portal** (`/student/*`, `/faculty/*`, `/parent/*`, `/institute/*`) without
re-logging-in; **portal users (STUDENT/FACULTY/PARENT) remain locked to their own portal**
and out of staff areas. In dev/test the student/faculty APIs fall back to the demo records,
so an admin previewing `/student/registration` sees the demo student (2024-105); in
production those APIs require a session-linked record. Reverting = restore the original two
gate checks (a portal area is only for its exact role).

## Phase E — Reports suite + attendance 3-stage (PENDING)

---

## Known environmental note
`npm run build` (Turbopack) currently fails offline because `next/font/google` (Tajawal)
cannot reach `fonts.gstatic.com`. This is **environmental, not a code error** — `tsc --noEmit`
and ESLint are clean on all touched files, and the dev server runs fine with the font
fallback. To be revisited when the environment has network or the font is self-hosted.
