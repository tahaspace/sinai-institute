# ClientR7 — الرأفة (Rafaa) + رفع التقدير (Grade Improvement)

> Source spec: `ClientR7/الفرق بين الرافة ... ورفع التقدير ...docx`.
> Built on `feat/rbac-multitenant-platform` in the clone. Local build + verify done
> (prisma generate ✓, tsc 42-baseline / 0-introduced, eslint 0). **Deploy:** additive
> `db push` (2 models + `Enrollment.graceMarks`, 0-DROP) → RBAC sync → `vercel --prod`.

## The two engines (the doc's whole point: they are different)
| | **الرأفة (Rafaa)** | **رفع التقدير (Grade Improvement)** |
|---|---|---|
| Purpose | rescue a **failing** status | bump an **already-passing** student's تقدير band |
| Effect | راسب → منقول بمادة/مادتين → ناجح | جيد → جيد جداً |
| Acts on | failing **courses** (adds grace marks) | the **overall %** near a band edge |

Both run **after** control grade entry, per فرقة/year, on the **combined-semesters** result, in the doc's pipeline: *رصد → اعتماد الأصلي → النتيجة الأصلية → **Rafaa** → **Grade Improvement** → التقدير النهائي → اعتماد الكنترول → كشوف الوزارة.* Built on `lib/annual.ts` (annual system — منقول/تقدير %).

## Bylaw config (never hardcoded — `Setting["institute.rafaa"]` / `["institute.gradeImprovement"]`)
- **Rafaa**: max total marks, max per course, **written-exam ≥ % gate**, exclude no-written courses, max #courses, which statuses it changes, include deferred/dismissed/**prior-beneficiary**, affects total/grade.
- **Improvement**: max raise %, max gap to next band, scope (فرقة/تخرج/تراكمي), require passed-all / no-prior-fail / **not-benefited-from-Rafaa** («من أخذ رأفة لا يأخذ رفع» — a toggle, since the doc says it's bylaw-dependent).

## Engine — `lib/rafaa.ts`
- `previewAdjustments({academicYear, yearGroup, program?, dept?})`: from the **original** result (`computeAnnualForStudents(..., {ignoreGrace:true})`), for each student picks failing courses within the per-course/total/written/count limits (closest-to-pass first), recomputes the status, then plans the improvement bump — returns before→after per student.
- `createAdjustmentBatch` → `GradeAdjustmentBatch` (DRAFT) + items. `approveAdjustmentBatch` (**اعتماد الكنترول**): persists رأفة grace to `Enrollment.graceMarks` (so the annual result + ministry sheets reflect it) and records "benefited" for the cross-year rule. `cancelAdjustmentBatch` rolls the grace back.
- `lib/annual.ts` now adds `Enrollment.graceMarks` to the course total (opt-out via `ignoreGrace`) and overlays an approved رفع band via `applyApprovedImprovement`, so downstream results/sheets show the final grade automatically.

## APIs & UI
- APIs `app/api/institute/grade-adjustments/*`: GET preview + POST create batch; `[id]` GET detail + PATCH (approve/cancel); `config` GET/PATCH.
- UI `/institute/exams/grade-adjustments` (under الامتحانات والتقييم): tab **المراجعة والاعتماد** (filters → preview table showing original → رأفة courses+marks → post-status → رفع from→to → final, select → إنشاء دفعة → **اعتماد الكنترول**/تراجع) and tab **إعدادات اللائحة** (both rule sets).

## RBAC (`prisma/rbac/catalog.ts`)
`gradeadjust.view/apply/config` → **EXAMS_CONTROL** (الكنترول); `gradeadjust.approve` = separate resource → INSTITUTE_ADMIN (maker/checker). Needs RBAC sync on Neon at deploy.

## Deploy checklist (held for owner go)
1. `migrate diff` 0-DROP → `db push` Neon direct (`GradeAdjustmentBatch`/`Item` + `Enrollment.graceMarks`).
2. `sync-permissions.ts` (ALLOW_REMOTE_SEED=1) — grants the 4 `gradeadjust.*` keys.
3. `vercel --prod` → live-verify (preview a فرقة, approve a batch, confirm the annual sheet shows the adjusted result).

## Notes
- Scope = the annual system (النظام السنوي), where رأفة/رفع تقدير live. A credit-hour F→D grace variant can be added later.
- `requireNoPriorFail` uses approved-adjustment history; the deep prior-year فرقة-fail check is a light approximation (defaults off).
