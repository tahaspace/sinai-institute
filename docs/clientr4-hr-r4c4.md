# ClientR4 · R4c-4 — HR Module: Performance Management (SHIPPED & LIVE)

**Deployed 2026-07-13** → `sinai-rbac`/Neon (commit `25d5a89`). Additive schema (4 new tables, 0 DROP). tsc 42 baseline (0 introduced), ESLint 0. RBAC synced (hr.performance.* → HR + Institute-Admin).

> Note: performance management was in the plan's *deferred* set; built + deployed under explicit user authorization (not on a generic "continue").

## Schema (additive)
`EvaluationTemplate` + `EvaluationCriterion` (weighted forms, target ALL/ADMIN/FACULTY); `PerformanceReview` + `PerformanceScore` (per-criterion snapshot); `Employee.performanceReviews`.

## APIs
- `hr/performance/templates` — GET/POST/PATCH weighted templates (criteria + weights).
- `hr/performance` — POST a review: weighted total = Σ(score×weight)/Σ(weight), graded ممتاز(90+)/جيد جداً(80+)/جيد(70+)/مقبول(60+)/يحتاج تطوير; supports evaluatorType (MANAGER/PEER/SUBORDINATE/SELF) for 360; GET list + detail.

## UI
`/institute/hr/performance` — template builder (criteria with live weight-sum badge), evaluation form (pick employee+template → score each criterion with a live total preview + recommendation), and the reviews list. Nav entry added.

## Report
`hr-performance-summary` (in the `hr` category) — latest review per employee: score, grade, recommendation. Permission `hr.performance.view`.

## RBAC
`hr.performance.view/edit` (HR via `hr.*`, Institute-Admin via ALL_TENANT). Synced additively (2 perms, 6 links).

## Live verification (2026-07-13)
`hr/performance/templates`, `hr/performance` → 401 (exist); `hr-performance-summary` report → 401 (registered); perf page → 307 (login). App root 200.

## Still deferred (optional)
HR predictive analytics; live biometric-device import; ML upgrade for the predictive report scores.
