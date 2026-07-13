# ClientR4 · R4c-2 — HR Module: Attendance + Leave (SHIPPED & LIVE)

**Deployed 2026-07-13** → `sinai-rbac`/Neon (commit `7ca49af`). Additive schema (11 new tables, 0 DROP). tsc 42 baseline (0 introduced), ESLint 0.

## Scope
Second HR sub-phase. Employee attendance (config + daily operations + review workflow) and leave, plus the adjustment modules (penalties / overtime / permissions-missions) that feed R4c-3 payroll integration. Live biometric-device import deferred (manual + CSV import shipped).

## Schema (additive)
- **Config:** `WorkSchedule` (FIXED/FLEXIBLE/BY_LECTURES + grace), `Shift`, `Holiday`, `AttendancePolicy` (grace/late-deduct/min-overtime).
- **Operations:** `EmployeeAttendance` (daily, `@@unique([employeeId,date])`, review state DRAFT→REVIEWED→APPROVED→LOCKED, source MANUAL/IMPORT/DEVICE, derived late/worked minutes).
- **Leave:** `LeaveType`, `LeaveRequest`, `LeaveBalance` (per employee/type/year).
- **Adjustments:** `Penalty`, `Overtime`, `AttendancePermission` (EARLY_LEAVE/LATE_ARRIVAL/PERMISSION/MISSION). Employee gains all back-relations.

## APIs (`app/api/institute/hr/*`)
- `attendance/config` — schedules/shifts/holidays/policy (policy is upsert-singleton).
- `attendance` — GET by day/range; POST manual entry or `rows[]` bulk import (resolves by employee code, upserts by day, auto-derives late/worked minutes from the default `WorkSchedule`); PATCH review-state transitions (approve/lock require `hr.attendance.approve`).
- `leave` — GET types+requests+balances; POST `kind:type|request` (auto day-count); PATCH decide → on approve rolls days into `LeaveBalance`.
- `adjustments` — GET/POST/PATCH penalties/overtime/permissions by `kind`.

## UI (`/institute/hr/*`)
- `attendance` — collapsible config, daily record table + manual entry + review buttons + paste-import, and an adjustments card. `leave` — types + request submission + approve/reject + balances. Nav entries added.

## RBAC — sync required
Added `hr.attendance.view/edit/approve`, `hr.leave.view/edit/approve`. HR role already `hr.*`; INSTITUTE_ADMIN `ALL_TENANT`. **Grants need the additive RBAC sync (`sync-permissions.ts`) run against Neon** — pending explicit authorization. Super-admin works meanwhile.

## Live verification (2026-07-13)
`hr/attendance`, `hr/attendance/config`, `hr/leave`, `hr/adjustments` → 401 (exist); attendance page → 307 (login). App root 200.

## Next: R4c-3 — payroll integration (attendance/leave/overtime/penalties/loans) + HR reports.
