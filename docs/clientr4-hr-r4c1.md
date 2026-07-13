# ClientR4 · R4c-1 — HR Module: Org Structure + Employee 360 (SHIPPED & LIVE)

**Deployed 2026-07-13** → `sinai-rbac`/Neon (commit `022e309`). Additive schema (11 tables + 19 cols, 0 DROP). tsc 42 baseline (0 introduced), ESLint 0.

## Scope
First of three HR sub-phases (R4c). Extends the existing payroll spine (`Employee`/`PayRun`) with the
organizational foundation + full employee profile from the client HR spec (`ClientR4/نظام ادراة الموارد البشرية…docx`). Soft-link to `Instructor` kept (no migration). Deferred to R4c-2/3: attendance, leave, payroll integration, performance, predictive.

## Schema (additive)
- **Org (distinct from academic `Department`):** `AdminDepartment` (self-nesting, manager soft-ref, isAcademic), `AdminSection`.
- **Job catalogue:** `EmployeeType`, `JobTitle` (jobLevel + isAcademic/isManagerial), `Position` (separate from title).
- **Placement:** `EmployeeAssignment` (dated dept/section/title/position/manager; one `isCurrent`).
- **Employee-owned:** `EmployeeQualification`, `EmployeeExperience`, `EmployeeDocument`, `EmployeeJobHistory`, `AssetCustody` (cascade-delete).
- **`Employee` extended:** nationalId, birthDate, gender, maritalStatus, phone, email, address, employeeTypeId/jobTitleId/positionId/adminDepartmentId/sectionId/managerId (soft refs), contractType/Start/End, `hrStatus` lifecycle, iban, payMethod. Legacy `jobTitle`/`department` strings kept for back-compat.

## APIs (`app/api/institute/hr/*`)
- `org` — GET all 5 config entities; POST (create + `seed-employee-types` for the standard catalogue); PATCH.
- `employees` — GET directory (filter dept/type/status + search; resolved names); POST create (auto-code `EMP-000n`, seeds a HIRE job-history row).
- `employees/[id]` — GET full profile + sub-records; PATCH profile; POST sub-record (`assignment` also updates current placement + logs history); DELETE owned sub-record.

## UI (`/institute/hr/*`)
- `org` — manage types/titles/positions/departments/sections.
- `employees` — directory + inline create.
- `employees/[id]` — 360 profile: editable personal/contact/contract/financial, assignment history, qualifications/experience/documents/custody, job-history log. HR nav group added (`Users` icon).

## RBAC — sync required
Added `hr.org.view/edit`, `hr.employee.view/edit`; broadened `HR` role to `hr.*`. **These grants need the additive RBAC sync (`prisma/rbac/sync-permissions.ts`, ALLOW_REMOTE_SEED=1) run against Neon to take effect** — pending explicit authorization. Until then usable by the super-admin.

## Live verification (2026-07-13)
`hr/org`, `hr/employees`, `hr/employees/[id]` APIs → 401 (exist, auth-gated); `/institute/hr/employees` → 307 (login redirect). App root 200.

## Next: R4c-2 — employee attendance + leave.
