# خريطة الموديولز — الوعي بالنظام الأكاديمي (ساعات معتمدة / سنوي)

> **الغرض:** فهم شامل وعميق لكل موديول في المنصة قبل أي تعديل — وظيفته، الـ workflow بتاعه، هل بيعرض طلاب، هل يحتاج فلتر «النظام الأكاديمي» وفين، وهل فيه منطق لازم يختلف بين النظامين.

> **القاعدتان المتفق عليهما:** (1) الفلتر **اختياري وليس إخفاءً** — الافتراضي «الكل» ولا يُخفى أي صف تلقائياً. (2) الموديولز التي **لا بُعد طلابي** لها (موظفون، رواتب، موردون، كتب المكتبة، تسويق، بنوك) **لا** تأخذ فلتراً.

> **مصدر البيانات:** فحص آلي بـ 12 وكيلاً متوازياً قرأوا الكود الفعلي — **192 موديول**.


## الملخص التنفيذي

| | العدد |
|---|---|
| إجمالي الموديولز المفحوصة | **192** |
| تعرض طلاب / بيانات أكاديمية | **111** |
| تحتاج فلتر «النظام الأكاديمي» | **99** |
| بها منطق يجب أن يختلف بين النظامين | **159** |


> ⚠️ الأرقام أعلاه **قبل** تطبيق تصحيحات وكيل المراجعة (انظر قسم التصحيحات في نهاية الملف) — بعض الموديولز عُلِّمت «تحتاج فلتر» رغم عدم وجود ربط فعلي بالطالب في قاعدة البيانات.


---

## الفهرس

- [لوحات المتابعة والمناهج (الأقسام/البرامج/المقررات/الخطط)](#dashboard-curriculum) — 15 موديول، 12 يحتاج فلتر
- [القبول والتسجيل](#admission-registration) — 8 موديول، 8 يحتاج فلتر
- [شؤون الطلاب](#student-affairs) — 9 موديول، 8 يحتاج فلتر
- [الامتحانات والتقييم](#exams-assessment) — 11 موديول، 8 يحتاج فلتر
- [الامتحانات الأونلاين ومنصة التعلم](#online-exams-lms) — 12 موديول، 4 يحتاج فلتر
- [التقارير والتحليلات](#reporting) — 26 موديول، 22 يحتاج فلتر
- [المالية والحسابات](#finance-accounting) — 22 موديول، 12 يحتاج فلتر
- [هيئة التدريس وبوابة عضو هيئة التدريس](#faculty-teaching) — 16 موديول، 9 يحتاج فلتر
- [بوابة الطالب وولي الأمر](#student-parent-portals) — 21 موديول، 5 يحتاج فلتر
- [الموديولز المساندة](#support-modules) — 10 موديول، 4 يحتاج فلتر
- [الإعدادات والموارد البشرية والإدارة والموقع](#settings-admin-hr-cms) — 42 موديول، 7 يحتاج فلتر

---

<a id="dashboard-curriculum"></a>

## لوحات المتابعة والمناهج (الأقسام/البرامج/المقررات/الخطط)

*15 موديول · 11 يعرض طلاب · 12 يحتاج فلتر*


### لوحة متابعة المعهد — Institute Dashboard (page)

**المسار:** `/institute/dashboard  → app/(institute)/institute/dashboard/page.tsx`


**الوظيفة والـ workflow:**
Client component ('use client') that fetches GET /api/institute/dashboard once on mount and renders the institute-wide overview: 4 KPI cards (students / instructors / departments / courses), a per-department breakdown table (students + faculty per dept, colors assigned by index, purely presentational), an 'upcoming events' list built from ExamSession rows, an 'academic alerts' list of active StudentWarning rows (student nameAr, warning type in Arabic, gpa, department), and a term quick-stats block (enrolledStudents, offeredCourses, passRate, collectionRate) plus a term header label/study-week from Setting. Read-only; no mutations, no filters of any kind — no search box, no dropdown. Audience: institute-level admin/registrar leadership.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add a «النظام الأكاديمي» Select (الكل / ساعات معتمدة / سنوي) in the page header next to the term label, bound to a `system` query param on the fetch: /api/institute/dashboard?system=CREDIT_HOURS|ANNUAL|all. In the route, translate it into a Student where-clause `program: { academicSystem }` applied to prisma.student.count, to the department `_count.students`, to the StudentWarning query (via `student: { program: { academicSystem } }`), and to the term enrollment set (via `student: { program: ... }`). Default must be 'all' so nothing is hidden by default.


**منطق يجب أن يختلف بين النظامين:** Yes. (1) passRate is computed generically from GradeStatus.isPass over Enrollment.gradeStatusCode — the grade-status catalog and pass rules differ between CREDIT_HOURS (letter/points) and ANNUAL (percentage bands / منقول-له دور ثانٍ-باقٍ للإعادة), so a single blended pass rate mixes two incompatible scales. (2) academicAlerts surfaces `gpa` (w.gpa ?? student.gpa) — meaningless for ANNUAL students, who need percentage/تقدير instead; the alert row needs a per-system value + label. (3) 'مقرر مطروح' / credit-hour totals are a credit concept. Everything else (counts of students/instructors/depts, collectionRate) is display-only aggregation.


**الوضع الحالي في الكود:** No. The route (app/api/institute/dashboard/route.ts) never imports lib/academic-system, never joins Program, and hardcodes TERM_YEAR='2024-2025'/TERM_SEMESTER='first'. GPA is rendered raw for every student regardless of system.


### API — Institute dashboard aggregate

**المسار:** `GET /api/institute/dashboard  → app/api/institute/dashboard/route.ts`


**الوظيفة والـ workflow:**
Permission-guarded (requirePermission('institute.dashboard.view')) single aggregate endpoint. Runs one Promise.all of 13 queries: Student.count(status ACTIVE), Instructor.count, Department.count(isActive), Course.count, Department.findMany with _count{students,instructors}, next 5 future ExamSession (with course), 3 latest ACTIVE StudentWarning (with student+department), two Setting rows (institute.currentTerm / institute.studyWeek, defensively JSON-parsed by readSetting), Enrollment.findMany for the hardcoded term (studentId + gradeStatusCode), CourseOffering.count(status 'open'), GradeStatus.findMany(code,isPass), FeeAccount.findMany(include payments). Derives passRate from isPass codes and collectionRate from paid payments / totalFees. No tenant scoping (unlike the other two dashboards) and no query params at all.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** New optional `system` search param (CREDIT_HOURS | ANNUAL | all, default all), normalized with normalizeSystem(); folded into the student/warning/enrollment where-clauses via `program: { academicSystem }`. Course/Department/Instructor/FeeAccount counts stay unfiltered unless the param is set (courses have no system of their own).


**منطق يجب أن يختلف بين النظامين:** passRate must be computed per system (pass semantics differ per grade-status catalog); ideally return {passRateCredit, passRateAnnual} or scope it to the selected system. GPA passed through in academicAlerts must become a system-aware value (CGPA vs نسبة/تقدير).


**الوضع الحالي في الكود:** No branching on academicSystem anywhere in the file; no import of lib/academic-system.


### لوحة رئيس القسم — Department Head Dashboard (page)

**المسار:** `/institute/department/dashboard  → app/(institute)/institute/department/dashboard/page.tsx`


**الوظيفة والـ workflow:**
Client page fetching GET /api/institute/department/dashboard on mount. Renders 4 KPI cards (students, instructors, courses, activeWarnings) for the head's scoped department, plus a 'الطلاب المعرضون للخطر' at-risk list of up to 8 students showing name, GPA and department name. Read-only, no filters or search.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** «النظام الأكاديمي» Select in the page header, passed as ?system= to /api/institute/department/dashboard; applied server-side to scopedWhere(ctx, { program: { academicSystem } }) for the student count, the warning count (via student:) and the at-risk query. Default الكل.


**منطق يجب أن يختلف بين النظامين:** Critical. The at-risk definition is hardcoded `gpa < 2 OR active warning` — the 2.0 CGPA probation line is a CREDIT_HOURS rule and is nonsense for ANNUAL students, who should be flagged on percentage/تقدير (e.g. below the ministry pass %, or باقٍ للإعادة status). The at-risk rule and the displayed metric column must branch per system.


**الوضع الحالي في الكود:** No. Route uses scopedWhere(ctx) tenant/department scoping only; no academicSystem awareness; single gpa<2 rule for everyone.


### API — Department head dashboard

**المسار:** `GET /api/institute/department/dashboard  → app/api/institute/department/dashboard/route.ts`


**الوظيفة والـ workflow:**
requirePermission('institute.dashboard.view'), then five parallel queries all wrapped in scopedWhere(ctx, …) (tenant + the head's departmentIds; falls back to whole tenant when the role assignment is unscoped): Student.count, Instructor.count, Course.count, StudentWarning.count(status ACTIVE, student: scopedWhere) and Student.findMany for the at-risk list (OR gpa<2 / warnings.some ACTIVE, orderBy gpa asc, take 8, include department). Returns { stats, atRisk[] }.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** `system` search param merged into scopedWhere's extra clause as `program: { academicSystem }`; keep default unfiltered.


**منطق يجب أن يختلف بين النظامين:** The `gpa: { lt: 2 }` probation threshold and the ordering by gpa must be system-branched (CGPA threshold for CREDIT_HOURS vs percentage/status-based risk for ANNUAL). Returned atRisk rows should carry the system + the right metric.


**الوضع الحالي في الكود:** No — no academicSystem reference; no Program join.


### لوحة وكيل الكلية — Faculty Admin Dashboard (page)

**المسار:** `/institute/faculty-admin/dashboard  → app/(institute)/institute/faculty-admin/dashboard/page.tsx`


**الوظيفة والـ workflow:**
Client page fetching GET /api/institute/faculty-admin/dashboard. Renders 4 KPI cards (departments, students, instructors, courses) faculty-scoped, plus a departments table listing each active department with its student and instructor counts. Read-only, no filter controls.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** «النظام الأكاديمي» Select in the header → ?system= on the fetch; server applies `program: { academicSystem }` to the Student count and to Department._count.students (via a filtered relation count or a separate groupBy on Student.programId). Default الكل.


**منطق يجب أن يختلف بين النظامين:** None today — the page shows only headcounts, no grades or standing. Display-only aggregation; the filter is purely a narrowing lens.


**الوضع الحالي في الكود:** No. Route only uses scopedWhere(ctx) for faculty/tenant scoping.


### API — Faculty admin dashboard

**المسار:** `GET /api/institute/faculty-admin/dashboard  → app/api/institute/faculty-admin/dashboard/route.ts`


**الوظيفة والـ workflow:**
requirePermission('institute.dashboard.view'); five parallel scopedWhere(ctx,…) queries: Department.count(isActive), Student.count, Instructor.count, Course.count, Department.findMany(isActive, order asc, _count{students,instructors}). Returns { stats, departments[] } — no params, no mutations.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Optional `system` param folded into the Student count and the per-department student counts only.


**منطق يجب أن يختلف بين النظامين:** none — display only (counts).


**الوضع الحالي في الكود:** No academicSystem handling.


### الأقسام العلمية — Departments list

**المسار:** `/institute/departments  → app/(institute)/institute/departments/page.tsx (data: GET /api/departments)`


**الوظيفة والـ workflow:**
Client page listing active departments as cards with an Arabic search box (client-side filter on nameAr). Each card shows nameAr/nameEn, head, description, specialization badges and a specializations count, with icons/gradients assigned by array index (presentation only) and links onward to courses/plans/programs. Data comes from the legacy public GET /api/departments (Prisma Department.findMany where isActive, include specializations + _count).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. Departments own courses and specializations, not students-by-system; the page displays no student or academic record. (If a 'students per department' stat is ever added here, it would then need the filter.)


**منطق يجب أن يختلف بين النظامين:** none — display only. Departments deliberately have no academic system of their own; the system lives on Program.


**الوضع الحالي في الكود:** No — and correctly so.


### API — Departments (legacy public CRUD)

**المسار:** `GET/POST/PUT/DELETE /api/departments  → app/api/departments/route.ts`


**الوظيفة والـ workflow:**
The pre-RBAC department CRUD endpoint still used by the institute departments and courses pages. GET is completely UNGUARDED (no requirePermission, no session) and returns all active departments with their specializations. POST/PUT/DELETE only check getServerSession(authOptions) — a plain NextAuth session, not the RBAC permission layer used everywhere else in app/api/institute/*. No tenant scoping (no universityId/facultyId filter). Note: there is NO app/api/institute/departments route — this is the only departments API.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (departments + specializations only).


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No academicSystem handling; none needed. (Separately worth flagging: unguarded GET and session-only writes are inconsistent with the RBAC guards used by sibling routes.)


### المقررات الدراسية — Courses catalog (departments/courses)

**المسار:** `/institute/departments/courses  → app/(institute)/institute/departments/courses/page.tsx`


**الوظيفة والـ workflow:**
The real course-registry admin screen (450 lines). On mount it fetches /api/institute/courses and /api/departments in parallel. Shows stat cards (total courses, total credit hours), a search box and a department Select ('all' + each dept) filtering client-side, and a table of courses: code, nameAr/nameEn, department, creditHours, instructor, enrolled-student count, plus the registrar flags (countsInGpa, requirementType إجباري/اختياري, availableInSummer, isGraduationProject) and the grade-split caps (midterm/final/practical/homework). A dialog handles create/edit, POSTing/PATCHing /api/institute/courses.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Weak/optional case. The only student data is the per-course enrolled-count column. If the owner wants it: add a third Select «النظام الأكاديمي» beside the existing department Select, passed as ?system= to /api/institute/courses, where it filters the `_count.enrollments` (enrollments whose student's program has that system) — NOT the course rows themselves, since Courses belong to departments and have no system. Courses must never be hidden by the filter.


**منطق يجب أن يختلف بين النظامين:** Indirect: the grade-split caps (midtermMax/finalMax/practicalMax/homeworkMax) and countsInGpa are consumed by the grading engines, which score differently per system (points/CGPA vs percentage/تقدير). countsInGpa is a credit-hours concept with no ANNUAL analogue. The page itself only edits the numbers — no computation.


**الوضع الحالي في الكود:** No. Neither the page nor app/api/institute/courses/route.ts imports lib/academic-system or joins Program; the enrollment count is system-blind.


### API — Courses catalog CRUD

**المسار:** `GET/POST/PATCH /api/institute/courses  → app/api/institute/courses/route.ts`


**الوظيفة والـ workflow:**
requirePermission('course.view') for GET, 'course.edit' for POST/PATCH. GET accepts ?search= (OR on nameAr/code, insensitive) and ?departmentId= ('all' ignored), returns each course with department name, instructor name, _count.enrollments as `students`, registrar flags and gradeSplit, plus stats {total, totalCreditHours}. POST validates code+nameAr, restricts requirementType to mandatory|elective, coerces the four grade caps with defaults (50/100/0/20). PATCH coerces numeric fields, deletes empty-string numerics so columns aren't blanked, and nulls empty relation ids.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Optional `system` param applied only to the enrollments _count (`_count: { select: { enrollments: { where: { student: { program: { academicSystem } } } } } }`), never to the course rows.


**منطق يجب أن يختلف بين النظامين:** none in this route — display/CRUD only. The stored caps feed system-specific grading elsewhere.


**الوضع الحالي في الكود:** No academicSystem awareness at all.


### الخطط الدراسية — Study plans

**المسار:** `/institute/departments/plans  → app/(institute)/institute/departments/plans/page.tsx (data: GET /api/institute/study-plan)`


**الوظيفة والـ workflow:**
Client page that fetches the single study plan and renders it as year → semester → course-rows (code, name, hours) inside Tabs, with a total-hours summary and non-functional 'تصدير الخطة' / add buttons. The API (requirePermission('plan.view')) reads ALL StudyPlanItem rows ordered by `order`, takes items[0].programName as THE program name, sums hours, and groups into years/semesters. Effectively single-program: it does not filter by programId even though StudyPlanItem.programId exists, so with plans for more than one program the output is a merged, mislabelled plan.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ✅ نعم |


**مكان الفلتر:** No student rows, but it IS academic curriculum data whose shape is system-defined. The right control is a program selector plus an «النظام الأكاديمي» Select in the header → GET /api/institute/study-plan?programId=&system=, filtering StudyPlanItem by programId in (programs matching that academicSystem). This also fixes the existing multi-program merge bug.


**منطق يجب أن يختلف بين النظامين:** Yes, structurally: a CREDIT_HOURS plan is year+semester with credit hours summing to Program.totalCreditHours; an ANNUAL plan is by السنة الدراسية with subject max-marks/percentage weighting rather than credit hours. The 'الساعات' column and the totalHours summary are credit-hours vocabulary and should be relabelled/recomputed for ANNUAL programs.


**الوضع الحالي في الكود:** No. The route never joins Program and never reads academicSystem; StudyPlanItem itself has no system column (it must be inherited via programId → Program.academicSystem).


### البرامج الأكاديمية — Department programs list

**المسار:** `/institute/departments/programs  → app/(institute)/institute/departments/programs/page.tsx (data: GET /api/institute/programs)`


**الوظيفة والـ workflow:**
Simple read-only card grid of academic programs: nameAr/nameEn, department, degree (بكالوريوس/دبلوم/ماجستير), years, totalCreditHours, description, active badge, and the enrolled-student count per program. No search, no filters; the 'إضافة برنامج' button is inert.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** «النظام الأكاديمي» Select in the header → /api/institute/programs?system=…; since the system lives ON Program this is a direct `where.academicSystem` filter. Each card should ALSO display the program's system as a badge (the API already returns academicSystem — the page's ProgramRow interface simply omits the field).


**منطق يجب أن يختلف بين النظامين:** Display-only here, but this is the AUTHORITATIVE screen for the system: Program.academicSystem is what every student inherits (resolveStudentSystem). totalCreditHours is meaningless for ANNUAL programs and should be hidden/relabelled per system.


**الوضع الحالي في الكود:** Partially — the API returns normalizeSystem(p.academicSystem), but this page's ProgramRow type drops it and nothing is rendered or filtered. No ?system= support in the route.


### البرامج والدورات — Programs & courses hub

**المسار:** `/institute/programs  → app/(institute)/institute/programs/page.tsx`


**الوظيفة والـ workflow:**
A larger tabbed screen (429 lines) that is half real, half mock. It fetches /api/institute/programs and derives stats (totalPrograms, activePrograms, totalTrainees = Σ students, totalHours = Σ totalCreditHours) and a program list filtered client-side by a search box and a department Select ('all' + department name). Its other tabs render HARDCODED module-level arrays: a 'courses/batches' list (CRS001… with batch, trainer, trainees count, progress %, dates, schedule) and a 'content' list — none of which touch the DB. Uses training vocabulary (متدرب / ساعة تدريبية) over real academic Program rows.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add «النظام الأكاديمي» as a third Select next to the search + department filters, passed as ?system= to /api/institute/programs (direct where.academicSystem), and surface the system as a badge on each program card. The hardcoded batches/content tabs need real data before any filter is meaningful there.


**منطق يجب أن يختلف بين النظامين:** The 'totalHours = Σ totalCreditHours' stat and the 'ساعة تدريبية' label only apply to CREDIT_HOURS programs; mixing ANNUAL programs into that sum produces a wrong number. Otherwise display-only.


**الوضع الحالي في الكود:** No — academicSystem is neither read, displayed nor filtered on.


### مقررات البرامج — Program courses view

**المسار:** `/institute/programs/courses  → app/(institute)/institute/programs/courses/page.tsx`


**الوظيفة والـ workflow:**
Lightweight read-only table over GET /api/institute/courses (no departmentId param passed — it pulls the whole catalog) with a client-side search box. Shows course code, name, department, credit hours, instructor and the enrolled-student count. Despite living under /programs it is not program-scoped at all.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Same as the departments/courses screen: an «النظام الأكاديمي» Select feeding ?system= on /api/institute/courses, narrowing the enrolled-student count only (courses have no system). Ideally this page should also gain the missing programId scoping.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No academicSystem handling.


### محتوى البرامج — Program content (LMS)

**المسار:** `/institute/programs/content  → app/(institute)/institute/programs/content/page.tsx (data: GET /api/lms/content)`


**الوظيفة والـ workflow:**
Content-library screen fetching /api/lms/content and mapping items to rows (title, type video/pdf/image/audio→file, unit shown as 'program', size in MB, views, date) rendered in a table with type badges, a search box, a type Select, and Upload/Download/Eye/Edit/Trash action buttons. Stats cards show total items, videos, pdfs and totalViews. The unit/'program' column is a free-text string from the LMS item, not a Program FK.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. Rows are learning materials with aggregate view counts; no student, grade or enrollment is displayed. (Only if content is ever linked to a real programId, and per-student progress shown, would a system filter become meaningful — and then it would filter by the linked program's academicSystem.)


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No — and none required.


---

<a id="admission-registration"></a>

## القبول والتسجيل

*8 موديول · 7 يعرض طلاب · 8 يحتاج فلتر*


### Admissions inbox (القبول والتسجيل)

**المسار:** `/institute/admission (page: app/(institute)/institute/admission/page.tsx) → GET/PATCH /api/institute/admissions`


**الوظيفة والـ workflow:**
Registrar-facing inbox of applicants. Client page fetches /api/institute/admissions?status=PENDING|APPROVED|REJECTED (tab-driven; 'all' tab sends no status), renders 4 KPI tiles (total/pending/approved/rejected computed by the API from the RETURNED — i.e. already status-filtered — set, so the tiles are misleading on a narrow tab) and a table of applicants (id, fullName, nationalId, highSchoolGrade %, firstChoice, createdAt, status badge). Search box narrows client-side on name/nationalId/id. Per-row actions call PATCH with ENROLLED or REJECTED; ENROLLED is the admission→student conversion point: the API creates a real Student (studentCode `${year}-${count+1 padded}`, nameAr, email, phone, nationalId, departmentId from body — the page never sends one, so it lands null — level 1, enrollYear, status ACTIVE) and then flips Application.status. Guards: requirePermission('admission.application.view' / 'admission.application.decide'). The 'طلب قبول جديد', 'تصفية', 'تصدير' and Eye buttons are inert. Quick-link cards route to registration/transfers/equivalence.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add a «النظام الأكاديمي» Select (الكل / ساعات معتمدة / سنوي) in the CardHeader toolbar next to the search Input and the existing تصفية button, bound to a new `system=CREDIT_HOURS|ANNUAL|all` query param on GET /api/institute/admissions. Applicants have no program yet (Application has only free-text firstChoice/secondChoice/thirdChoice, no programId), so the filter must resolve the system by matching the choice string to a Program/Department, or — better — the page should gain a program picker on the ENROLL action; until then the honest scope of the filter is the enrolled/created students, not raw applicants.


**منطق يجب أن يختلف بين النظامين:** highSchoolGrade is a secondary-school percentage and is system-independent. The one genuinely system-sensitive step is the ENROLL conversion: the created Student gets departmentId only and NO programId, so the student inherits no academic system at all (resolveStudentSystem → getProgramSystem(null) → silent CREDIT_HOURS default). PATCH should require/derive a programId so ANNUAL admits are not silently misclassified as credit-hours. Otherwise display-only.


**الوضع الحالي في الكود:** No. Neither page nor API imports lib/academic-system.ts; no academicSystem reference anywhere in the route. Admissions API also ignores tenantWhere (unlike the stats route) — it queries prisma.application.findMany({where:{status}}) with no tenant scoping.


### Admission dashboard stats API

**المسار:** `GET /api/institute/admission/stats`


**الوظيفة والـ workflow:**
Read-only KPI feed for admissions dashboards: four tenant-scoped COUNTs (pending applications, approved applications, all TransferRequest rows, pending CourseEquivalenceRequest rows) plus the 10 newest applications (fullName, firstChoice, raw status, createdAt date). Uses tenantWhere(ctx) from lib/tenant on every query and requirePermission('admission.application.view'). Note: no page in this area currently calls it — the admission page uses /api/institute/admissions instead — so it is an available but unwired endpoint.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Accept an optional `system` query param and apply it to all five queries (application counts via the resolved program of the choice/program link; transfer and equivalence counts via their student's program.academicSystem), so any dashboard embedding these KPIs can mirror the page-level «النظام الأكاديمي» selector. Default = no filter (show everything).


**منطق يجب أن يختلف بين النظامين:** none — pure counts and a recent list; display only.


**الوضع الحالي في الكود:** No academicSystem awareness. It is the only route in the area that is tenant-scoped.


### Course registration overview (تسجيل المقررات)

**المسار:** `/institute/admission/registration → GET /api/institute/registration?academicYear=&semester=&search=`


**الوظيفة والـ workflow:**
Staff-wide term registration overview. API defaults the term to the hardcoded DEFAULT_TERM {academicYear:'2024-2025', semester:'second'} (mirrors app/api/student/registration/route.ts). It loads CourseOffering rows for that term with course + sections (+ section instructor and _count of RegistrationItem), flattens them into one catalog row PER SECTION (code, nameAr, creditHours, instructor, capacity as seats, enrolled = RegistrationItem count in any state, schedule composed from Section.day + startMin/endMin via formatSchedule — there is no schedule column). Three derived stats: registeredStudents = count of Students having a RegistrationRequest for the term; offeredCourses = CourseOffering count; averageHours = sum of creditHours over every RegistrationItem line / registeredStudents (rounded). The registration window is read from the Setting row keyed `institute.registration.<year>.<semester>` (JSON with startDate/endDate/status); daysLeft is computed from endDate−today. The page renders an open/closed badge, the three stat tiles, and a searchable catalog with checkboxes and a Progress bar; search is applied both server-side (offeringWhere on course nameAr/code) and again client-side. Guard: requirePermission('admission.registration.view'). The page never passes academicYear/semester/search to the API — it fetches the bare URL — so the term is effectively frozen.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add an «النظام الأكاديمي» Select in the page header row beside the open/closed badge (and next to the search Input), wired to a new `system` param on GET /api/institute/registration. Server-side it filters offerings via offering.course/StudyPlanItem→program.academicSystem, and filters registeredStudents/averageHours via student.program.academicSystem. Default 'all'.


**منطق يجب أن يختلف بين النظامين:** Yes — significant. 'متوسط الساعات' (average credit hours) and the whole seats/credit-hours framing are credit-hour concepts; for ANNUAL programs registration is a whole-year course-set enrolment, not an hours budget, so the tile should switch to a system-appropriate metric (e.g. متوسط عدد المقررات / نسبة تسجيل الفرقة) or be suppressed when the filter is ANNUAL. Mixing both systems into one averageHours number (as today) produces a meaningless figure. Registration window/period logic is system-independent.


**الوضع الحالي في الكود:** No. No import of lib/academic-system.ts, no academicSystem field read; every credit-hour assumption (hours, seats, averageHours) is applied unconditionally to all students.


### Transfers (التحويلات — from/to the institute)

**المسار:** `/institute/admission/transfers → GET/PATCH /api/institute/admission/transfers`


**الوظيفة والـ workflow:**
Manages TransferRequest rows in two directions. GET returns incoming (direction INCOMING, includes departmentRel) and outgoing (direction OUTGOING, includes student→department and departmentRel) lists, each row mapped to {id, name, from|to = institution, department, date, status lowercased so the page's badge switch matches}. Outgoing rows prefer the linked Student.nameAr over the denormalized studentName snapshot, and the student's own department over the request's. Four stats are independent COUNTs across both directions: incoming, outgoing, pending, approved+completed. The page renders the 4 tiles and two tabbed tables. PATCH updates one request's status among PENDING/APPROVED/REJECTED/COMPLETED. Double guard: requireFeature('admission.transfers') then requirePermission('transfer.view' / 'transfer.approve'). Note: approving a transfer performs NO side effect — no Student is created, moved, or deactivated; it is a status-tracking log only. Not tenant-scoped.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add an «النظام الأكاديمي» Select in the page header (above/beside the TabsList that switches واردة/صادرة), sending `system` to GET /api/institute/admission/transfers; server-side it filters via student.program.academicSystem for OUTGOING rows and via the requested department/program for INCOMING rows. Default 'all' so both systems still show.


**منطق يجب أن يختلف بين النظامين:** Yes, latently — a transfer that crosses systems (annual program → credit-hour program, or vice versa) needs an explicit conversion decision (which academic history carries over, how prior تقدير maps to grade points or vice versa). Today the module stores no target program at all, so no such logic exists; at minimum the row should surface the source and destination system so a registrar can see a cross-system transfer. Rendering itself is display-only.


**الوضع الحالي في الكود:** No academicSystem reference. TransferRequest has studentId/departmentId but no programId, so even resolving the system per row requires joining student→program.


### Course equivalence / transfer credit (المعادلات)

**المسار:** `/institute/admission/equivalence → GET/PATCH /api/institute/admission/equivalence`


**الوظيفة والـ workflow:**
Reviews CourseEquivalenceRequest rows: each row is a course taken at another institution being credited against a local Course. GET lists all requests newest-first with student (prefers Student.nameAr, falls back to the denormalized studentName) and course (prefers `code - nameAr`, falls back to requestedCourse; creditHours prefers Course.creditHours over the stored value), plus stats {total, approved, pending, approvedHours} where approvedHours is the SUM of credited creditHours over APPROVED requests only. PATCH sets status PENDING/APPROVED/REJECTED and stamps reviewedAt; the page then patches its local rows and recomputes the stat tiles optimistically client-side. Guards: requireFeature('admission.transfers') + requirePermission('equivalence.view'/'equivalence.approve'). No tenant scoping. Approval has no downstream effect — no Enrollment/Grade record is created from an approved equivalence.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add an «النظام الأكاديمي» Select in the CardHeader of the requests table, wired to a new `system` param on GET /api/institute/admission/equivalence, resolved through request.student.program.academicSystem (requests with a null studentId fall back to the requested Course's program via StudyPlanItem, or are always shown).


**منطق يجب أن يختلف بين النظامين:** Yes — the entire module is expressed in ساعات معتمدة (the creditHours column and the 'ساعات معادلة' tile). Under an ANNUAL program a course has no credit-hour weight; equivalence there is per-course/per-year exemption, so the hours column and approvedHours tile must be replaced by an exempted-courses count (or hidden) when the row/filter is ANNUAL. Summing approvedHours across a mixed set (as today) mixes incompatible units.


**الوضع الحالي في الكود:** No. Pure credit-hour assumption throughout; no academicSystem read anywhere in page or route.


### Public application form (تقديم إلكتروني)

**المسار:** `/apply (app/(public)/apply/page.tsx) → POST /api/applications`


**الوظيفة والـ workflow:**
Public multi-step applicant form. Collects fullName, nationalId, birthDate, phone, email, address, highSchoolGrade, highSchoolYear and three ranked choices, then POSTs to /api/applications. The three choice dropdowns are fed from a HARDCODED in-component `departments` array of 7 Arabic strings (إدارة ضيافة، إرشاد سياحي، دراسات سياحية، إنجليزي، فرنسي، محاسبة، تسويق) — they are not read from the Department or Program tables, and the value stored is the free-text label, not an id. POST is unauthenticated by design, validates required fields, rejects a duplicate nationalId (Application.nationalId is @unique), parses grade/year, and creates the Application with status PENDING. A confirmation/review step echoes the entered data back.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ✅ نعم |


**مكان الفلتر:** Not a display filter — this is the capture side. The fix here is upstream of filtering: replace the hardcoded departments array with real Program options loaded from the DB and persist a programId (new Application field) instead of a free-text firstChoice, so that every downstream admission screen and the ENROLL conversion can resolve an academic system at all. Optionally show the system label (نظام الساعات المعتمدة / النظام السنوي) beside each program in the choice dropdown so the applicant knows what they are applying to.


**منطق يجب أن يختلف بين النظامين:** none today — display/capture only. But it is the root cause of the area's system blindness: no program linkage is captured, so no system can be resolved for any applicant.


**الوضع الحالي في الكود:** No. No program, programId, or academicSystem anywhere in the form or the route.


### Applications admin list (CMS)

**المسار:** `/cms/applications (app/(cms)/cms/applications/page.tsx) → GET/PUT /api/applications`


**الوظيفة والـ workflow:**
Legacy CMS-side list of the same Application table, separate from the institute admissions inbox. Fetches /api/applications (optionally ?status=), lists applicants, and updates status via PUT /api/applications {id, status, notes}. Both GET and PUT are gated only by a bare getServerSession(authOptions) check — NOT by requirePermission — so any authenticated CMS session can read every applicant's PII and change decisions, unlike the RBAC-guarded /api/institute/admissions. PUT here does NOT create a Student (no enrollment side effect), so flipping status to ENROLLED via this path silently diverges from the institute path.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Same treatment as the institute inbox: an «النظام الأكاديمي» Select above the table backed by a `system` param on GET /api/applications — dependent on the Application→program linkage described above. Lower priority than the institute inbox; the more urgent issue here is the missing permission guard and the duplicated decision path.


**منطق يجب أن يختلف بين النظامين:** none — display and status update only.


**الوضع الحالي في الكود:** No academicSystem awareness, no tenant scoping, no RBAC guard.


### Admission-admin portal dashboard

**المسار:** `/admission-admin/dashboard (app/(admin-portals)/admission-admin/dashboard/page.tsx)`


**الوظيفة والـ workflow:**
Portal-shell dashboard for the admission-admin role, sitting alongside the institute admission module. It is the intended consumer of GET /api/institute/admission/stats (pending/approved applications, transfers, pending equivalence + 10 recent applicants).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** An «النظام الأكاديمي» Select in the dashboard header that forwards `system` to /api/institute/admission/stats, narrowing all four KPI tiles and the recent-applications list together. Default 'all'.


**منطق يجب أن يختلف بين النظامين:** none — aggregated counts and a recent list; display only.


**الوضع الحالي في الكود:** No academicSystem handling.


---

<a id="student-affairs"></a>

## شؤون الطلاب

*9 موديول · 9 يعرض طلاب · 8 يحتاج فلتر*


### قائمة الطلاب — Students list

**المسار:** `app/(institute)/institute/students/page.tsx + app/api/institute/students/route.ts`


**الوظيفة والـ workflow:**
The central student registry for the registrar/شؤون الطلاب. GET /api/institute/students accepts search/departmentId/level, guards on permission 'student.view', queries prisma.student including department, program and COMPLETED enrollments, and maps each row to {studentCode, nameAr, department, program, level label (الأولى..الخامسة), gpa, creditHours = sum of completed enrollment course.creditHours, status label}. It also returns stats {total, avgGpa}. The page fetches /api/institute/students ONCE with no query string, keeps allStudents in state, and does search+level filtering entirely CLIENT-side (departmentFilter state exists but is never applied in the filter predicate — a live bug). Stat cards show إجمالي الطلاب, عدد الأقسام, متوسط GPA and «تحت الملاحظة» = count(gpa<2). POST creates a student (auto studentCode `${year}-${count+1}`, level default 1, status ACTIVE) under 'student.create'; PATCH updates arbitrary fields under 'student.edit'.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: add a «النظام الأكاديمي» Select next to the existing القسم/المستوى selects (كل الأنظمة / ساعات معتمدة / سنوي). API: new `academicSystem` query param on GET /api/institute/students, applied as where.program = { academicSystem: 'ANNUAL' } (or { not: 'ANNUAL' } for credit, so null/unset programs fall to credit per normalizeSystem). Each row should also carry academicSystem so the table can show a system badge and the client filter can work without a refetch.


**منطق يجب أن يختلف بين النظامين:** Yes. The GPA column, the متوسط GPA stat and the «تحت الملاحظة» (gpa<2) stat are credit-hour-only concepts. Annual students must show النسبة المئوية + التقدير and a وضع (منقول/له دور ثانٍ/باقٍ للإعادة) instead of a 4.0 GPA; the creditHours column is meaningless for annual rows and the avgGpa stat must be computed over credit-hour students only (or split into two stats).


**الوضع الحالي في الكود:** No. Neither the API nor the page reads Program.academicSystem or imports lib/academic-system; program is selected only for its nameAr. Everything is rendered as GPA.


### استيراد الطلاب — Bulk student import

**المسار:** `app/(institute)/institute/students/import/page.tsx + app/api/institute/students/import/route.ts (+ /template) — engine lib/student-import.ts`


**الوظيفة والـ workflow:**
ClientR6 new-student bulk import. Staff pick cohort context on-screen (academicYear from /api/institute/academic-years, semester, programId, level) then upload .xlsx/.csv. POST multipart with action=preview runs parseImportBuffer (SheetJS, raw:true + cellDates to avoid the scientific-notation national-id bug) → mapRow against IMPORT_COLUMNS (Arabic headers + aliases) → validateImportRows (required code/nationalId/nameAr, duplicates within the file AND against DB on studentCode/nationalId/email, email & phone regexes) and returns the first 500 rows with per-row errors plus valid/error counts. action=commit calls commitImport with {academicYear, semester, programId, facultyId, departmentId, level, universityId from the authz ctx, fileName} and the current user id, creating Student + Guardian + FeeAccount (from the level's FeeStructure) + a DRAFT Registration, all audited. Guarded by 'student.import'.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a display filter — the import preview shows only the uploaded file's rows, not the existing roster. The system is DETERMINED here, not filtered: the chosen programId fixes each imported student's academic system. What is needed is a read-only indicator beside the البرنامج select showing the resolved system (getProgramSystem(programId)) so staff see which system the cohort lands in, and a warning when programId is left «بدون تحديد» (students then silently default to CREDIT_HOURS).


**منطق يجب أن يختلف بين النظامين:** Indirect but real: the created FeeAccount/Registration and the level semantics differ (level = مستوى in credit hours vs فرقة in the annual system), and downstream engines resolve the system from the program chosen here. The importer itself does no per-system computation.


**الوضع الحالي في الكود:** No. Neither route nor lib/student-import.ts references academicSystem; programId is stored verbatim and no system is surfaced or validated.


### ترحيل الطلاب — Promotion / rollover

**المسار:** `app/(institute)/institute/students/promotion/page.tsx + app/api/institute/promotion/route.ts + /[id]/route.ts — engine lib/promotion.ts`


**الوظيفة والـ workflow:**
ClientR6 cohort rollover, DRAFT → APPROVED → EXECUTED. The page collects fromYear/toYear, from/to semester, programId, departmentId, fromLevel/toLevel, then GET /api/institute/promotion?academicYear&level&programId&departmentId ('student.promote') runs evaluateCohort: loads all students at that level with their program (academicSystem, years), splits ids into annual vs credit, calls computeAnnualForStudents (with academicYear) and computeStandingForStudents in parallel, and per student decides an action — status short-circuits first (WITHDRAWN/DISMISSED/GRADUATED → SKIP, DEFERRED/SUSPENDED → STAY, transfer admissionType → SKIP manual), then ANNUAL branch maps نتيجة العام (منقول → PROMOTE, or GRADUATE if level >= program.years; له دور ثانٍ / باقٍ للإعادة → STAY; قيد الرصد → STAY) and the CREDIT branch uses standing.graduationEligible / canPromote / qualifiedLevel. Finally, if settings.blockDebtPromotion (Setting key institute.promotion), outstandingFeesFor(studentId) > 0 vetoes an eligible row to SKIP with the debt in the reason. Rows carry system + pct. Staff tick rows (eligible pre-selected) → POST creates a DRAFT PromotionBatch with snapshot items; PATCH {action:'approve'} needs 'promotion.approve'; {action:'execute'} needs 'student.promote', requires APPROVED, bumps level / graduates and opens a new-year registration, all audited.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: an «النظام الأكاديمي» Select alongside البرنامج/القسم/المستوى (default كل الأنظمة). API: `academicSystem` query param on GET /api/institute/promotion, pushed into evaluateCohort's student where as program: { academicSystem: ... }. Rows already return `system`, so the table can additionally filter client-side and label each row. Note the practical need: a mixed-level cohort spans both systems and the metric column changes meaning per row.


**منطق يجب أن يختلف بين النظامين:** Yes — already the deepest per-system branching in this area: annual rows are scored by computeAnnualForStudents (percentage/تقدير, منقول/دور ثانٍ/باقٍ, graduation on final فرقة via program.years) and credit rows by computeStandingForStudents (CGPA, qualifiedLevel, graduationEligible). The UI's metricOf() prints pct% for annual and cgpa.toFixed(2) for credit. The debt veto is system-agnostic and applies to both.


**الوضع الحالي في الكود:** YES — fully. lib/promotion.ts partitions on program.academicSystem, runs both engines, and the page renders the metric per row.system. Only the display FILTER is missing.


### حجب الطلاب — Student holds (apply / list / candidates / config)

**المسار:** `app/(institute)/institute/students/holds/page.tsx + app/api/institute/holds/{route,students,candidates,[id],reasons,settings}.ts — engine lib/holds.ts`


**الوظيفة والـ workflow:**
ClientR5 visibility-only hold engine, one page with four tabs. (a) apply: GET /api/institute/holds/students?departmentId&programId&facultyId&level&search&paymentStatus ('hold.view') returns up to 500 students with outstanding = Σ(feeAccount.totalFees − paid payments) and their ACTIVE hold types; staff multi-select and POST /api/institute/holds ('hold.apply') with type, reasonId/reasonText, scopes (HOLD_SCOPES), status ACTIVE|PENDING, endDate, messages → applyHoldBulk (حجب جماعي). (b) list: GET /api/institute/holds filtered by status/type/reasonId/source and by student departmentId/programId/facultyId/level, returning per-hold rows plus stats {total, active, pending, released, auto}; PATCH /api/institute/holds/[id] with action release ('hold.release') / cancel ('hold.cancel') / approve PENDING→ACTIVE ('hold.override'). (c) candidates: GET /api/institute/holds/candidates → autoHoldCandidates(universityId) — students with unpaid fees and no active financial hold, for staff confirmation. (d) config: HoldReason CRUD (soft-delete via active:false) and hold settings JSON (autoFinanceHold/autoFinanceRelease + per-type message/scope overrides) under 'hold.config'.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: add «النظام الأكاديمي» to the apply-tab filter row (beside القسم/البرنامج/المستوى/حالة السداد) and to the holds-list filter row (beside الحالة/النوع). API: an `academicSystem` param on BOTH /api/institute/holds/students (where.program = { academicSystem }) and /api/institute/holds (where.student.program = { academicSystem }); optionally on /candidates via autoHoldCandidates. Must default to ALL — holds are finance-driven and hiding a system by default would lose debtors.


**منطق يجب أن يختلف بين النظامين:** None — display/administrative only. Hold scopes, outstanding-fee math and release rules are identical in both systems. The only system-sensitive display is the level column (مستوى vs فرقة).


**الوضع الحالي في الكود:** No. None of the holds routes or lib/holds.ts reads academicSystem; program is selected only for nameAr.


### الإرشاد الأكاديمي — Academic advising

**المسار:** `app/(institute)/institute/students/advising/page.tsx + app/api/institute/students/advising/route.ts`


**الوظيفة والـ workflow:**
Read-only at-risk list for academic advisors. GET ('advising.view') selects prisma.student where gpa < 2.5, includes department and ACTIVE warnings, orders by gpa asc, and returns studentsNeedingAdvice [{studentCode, name, department, gpa, level, activeWarnings}], an empty upcomingSessions array (no advising-session model exists — deliberately not fabricated), and stats {needAdvice, totalStudents = student count, sessionsScheduled: 0}. The page just fetches once and renders cards/tables; there are no filters at all.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: introduce a filter bar (none exists today) with «النظام الأكاديمي» as its first control. API: `academicSystem` param applied to the student where clause. Also worth adding department/level filters at the same time.


**منطق يجب أن يختلف بين النظامين:** Yes — and this is a correctness bug, not just display. The at-risk rule is hardcoded `gpa < 2.5`, a 4.0-scale threshold. Annual students have no meaningful gpa field (it is 0/stale), so today they are ALL swept into the at-risk list or all missed depending on the stored value. Annual at-risk must be defined by percentage/تقدير or by result (له دور ثانٍ / باقٍ للإعادة) via lib/annual, and the returned metric column must be % + تقدير for annual rows.


**الوضع الحالي في الكود:** No — zero awareness; program is not even included in the query.


### الإنذارات الأكاديمية — Student warnings

**المسار:** `app/(institute)/institute/students/warnings/page.tsx + app/api/institute/students/warnings/route.ts`


**الوظيفة والـ workflow:**
Issue and track StudentWarning records. GET ('warning.view') lists all warnings with student + department, newest first, mapping type to Arabic labels (إنذار أول/ثاني/أكاديمي/سلوكي) with the gpa snapshot and issuedAt date, plus stats {total, active, resolved}. POST ('warning.create') resolves the student by studentId or studentCode, snapshots the student's current gpa onto the warning, and creates it with status ACTIVE. PATCH (also 'warning.create') resolves a warning (status RESOLVED + resolvedAt). The page fetches once, renders the table, and offers a resolve action; no filters.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: add a filter row with «النظام الأكاديمي» (plus النوع/الحالة). API: `academicSystem` param on GET applied as where.student = { program: { academicSystem } }; include program in the query and return academicSystem per row so the GPA cell can render appropriately.


**منطق يجب أن يختلف بين النظامين:** Yes. The `gpa` snapshot stored on every warning is credit-hour semantics; for an annual student the warning should snapshot the year percentage/تقدير instead, and the الإنذار الأول/الثاني escalation rule differs (CGPA thresholds vs. عدد مواد الرسوب / نتيجة الفرقة). Display must swap the GPA column for %/تقدير on annual rows.


**الوضع الحالي في الكود:** No. Neither route nor page touches academicSystem; gpa is copied blindly from Student.gpa.


### متابعة الحضور والغياب — Attendance overview (institute-wide)

**المسار:** `app/(institute)/institute/students/attendance/page.tsx + app/api/institute/students/attendance/route.ts`


**الوظيفة والـ workflow:**
Institute-wide attendance aggregate. GET ('attendance.view') loads EVERY student with all their attendances and department (no pagination), keeps only students with ≥1 record, computes per-student pct = (present + late)/total, then returns stats {trackedStudents, avgAttendance, atRisk}, departmentAttendance (average per department name), and warningStudents (pct < 75, ascending) with their absence counts. The page renders the stats, the per-department bars and the at-risk table. It also shows a «اختر المقرر» Select whose options are HARDCODED (CS301 …) and whose value is never sent anywhere — dead UI.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: replace/augment the dead course Select with real controls, including «النظام الأكاديمي». API: `academicSystem` param on GET applied to the student where clause (and ideally departmentId/level too). Default all systems.


**منطق يجب أن يختلف بين النظامين:** Mostly display, with one caveat: the 75% attendance/حرمان threshold is a bylaw setting that can differ between the annual bylaw and the credit-hour bylaw, and the annual system's حرمان applies to the whole فرقة/course-year rather than a semester enrollment. The percentage math itself is identical.


**الوضع الحالي في الكود:** No — no academicSystem anywhere; the course Select is hardcoded placeholder data.


### تقرير الحضور للمقرر + الحرمان — Per-course attendance report / deprivation

**المسار:** `app/api/institute/attendance-report/route.ts (engine lib/attendance.ts courseAttendance; write path lib/gpa.ts setEnrollmentResult)`


**الوظيفة والـ workflow:**
The bylaw-facing per-course attendance roster consumed by the attendance/exam-control screens. GET ('attendance.view') lists all courses (code asc), defaults to the first course and to term {2024-2025, first} when unspecified, and calls courseAttendance(courseId, academicYear, semester, {lowOnly}) which returns the roster with the 3-stage warning flags and the ban (حرمان) flag; lowOnly=true narrows to students at/below the warn threshold (the bylaw's حصر). PATCH ('attendance.edit') applies deprivation to one enrollment by calling setEnrollmentResult(enrollmentId, {code:'DN'}) — DN counts as a 0 fail and recomputes the student's CGPA through the shared GPA write path, returning the new cgpa.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** API: add an `academicSystem` param filtering both the course dropdown (courses reachable from programs of that system via StudyPlanItem) and the roster rows (enrollment.student.program.academicSystem). On whichever page consumes it, the filter sits next to the المقرر/العام/الفصل selects.


**منطق يجب أن يختلف بين النظامين:** Yes. The DN write path recomputes a CGPA — wrong for an annual student, whose حرمان must feed the annual percentage/تقدير engine (lib/annual) and produce محروم rather than a 0.00 GPA contribution. The absence thresholds are bylaw-scoped per system, and the term model itself (فصل vs عام كامل) differs.


**الوضع الحالي في الكود:** No. The route hardcodes a default term, does not resolve the student's system, and unconditionally routes deprivation through the credit-hour CGPA path.


### طلبات التخرج — Graduation requests

**المسار:** `app/(institute)/institute/students/graduation/page.tsx + app/api/institute/students/graduation/route.ts`


**الوظيفة والـ workflow:**
Review queue for GraduationRequest records. GET ('graduation.view') lists all requests newest-first with student + department + program, and returns per row {student, studentCode, department, program, academicSystem (derived from program.academicSystem, defaulting to CREDIT_HOURS), completedHours, requiredHours, gpa, status + Arabic label, date} plus stats {total, pending, approved, rejected}. PATCH ('graduation.approve') sets the request status and reviewedAt, and on APPROVED also flips Student.status to GRADUATED — the shared flag other portals read. The page renders the table and per-row approve/reject buttons; for ANNUAL rows it prints «نظام سنوي» instead of a GPA and «اجتياز الفرقة النهائية بتقدير» instead of the hours progress bar. No filters on the page.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: add a filter row with «النظام الأكاديمي» (plus الحالة). API: `academicSystem` param on GET → where.student = { program: { academicSystem } }. The row already carries academicSystem, so a client-side narrowing is also trivially possible.


**منطق يجب أن يختلف بين النظامين:** Yes. Graduation eligibility is credit-hours + CGPA in the credit system vs. passing the final فرقة with a تقدير in the annual system; the completedHours/requiredHours/gpa fields on GraduationRequest are meaningless for annual students and the annual row should instead show the final-year percentage/تقدير and the cumulative تقدير التخرج. The PATCH approval path is system-agnostic.


**الوضع الحالي في الكود:** PARTIAL — the only student-affairs module that already branches: the API derives academicSystem from the program and the page swaps the GPA and hours-progress cells for annual rows. But there is no filter, no annual metric is actually supplied (only placeholder text), and nothing validates eligibility per system.


---

<a id="exams-assessment"></a>

## الامتحانات والتقييم

*11 موديول · 8 يعرض طلاب · 8 يحتاج فلتر*


### جداول الامتحانات — Exam schedule

**المسار:** `/institute/exams  (API: GET/POST /api/institute/exams)`


**الوظيفة والـ workflow:**
Control/exam-affairs landing page. GET lists every ExamSession joined to its Course (+department) and renders date, startTime, durationMins (formatted to hours), hall, examType, and a per-row `students` count taken from course._count.enrollments; stats = total sessions, thisWeek (currently just = total, seeded window), studentsRegistered (sum of enrollment counts), published (hardcoded 0). POST (exam.schedule.edit) creates an ExamSession from {courseId,title,examType,date,startTime,durationMins,hall}. Read gate exam.schedule.view. No student rows are listed individually — only aggregate seat counts.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: a «النظام الأكاديمي» Select next to the existing header actions (كل الأنظمة / ساعات معتمدة / سنوي). API: `?academicSystem=` on GET /api/institute/exams — applied to the enrollment count and to the session list via `course.enrollments.some({ student: academicSystemWhere(sys) })`, i.e. only sessions whose enrolled population matches, and `_count.enrollments` counted with the same where. Default = all.


**منطق يجب أن يختلف بين النظامين:** none — display only (scheduling and halls are system-agnostic; only the seat-count aggregate changes when narrowed).


**الوضع الحالي في الكود:** No. Neither the page nor the route reads Program.academicSystem; enrollments are counted across both systems indiscriminately.


### بنك الأسئلة — Question bank (summary + CRUD)

**المسار:** `/institute/exams/question-bank  (APIs: GET /api/institute/exams/question-bank, GET/POST/DELETE /api/institute/exams/questions)`


**الوظيفة والـ workflow:**
Two cooperating endpoints over ExamQuestion. /question-bank returns per-course counts (total/mcq/essay/truefalse) for every Course ordered by code plus bank-wide stats. /questions lists individual questions filtered by ?courseId=&type= (with the course picker list) and supports POST (add {courseId,text,type,difficulty}) and DELETE ?id=. Gates: exam.questionbank.view / .edit. Data is questions attached to COURSES; no student, enrollment, or grade is touched anywhere in either route.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension


**منطق يجب أن يختلف بين النظامين:** none — display only. (Courses belong to departments and have no academic system of their own, so even a course-level system filter would be ill-defined here.)


**الوضع الحالي في الكود:** No — and correctly so.


### رصد الدرجات — Grade entry roster

**المسار:** `/institute/exams/grades  (GET/PATCH/POST /api/institute/exams/grades)`


**الوظيفة والـ workflow:**
The control room's per-course mark-entry screen and the single most system-sensitive module in the area. GET(?courseId=) returns the course's component maxima (midtermMax/finalMax/practicalMax/homeworkMax), the full course list for the picker, the non-letter GradeStatus codes the control head may set verbally (W/E/I/NE/FW/BL/DN/DS/TR…), and a roster of every Enrollment with student code/name, the four component marks, computed total, letterGrade, gradeStatusCode + Arabic statusName, resultLocked, academicYear, semester. PATCH (exam.grade.edit) writes one enrollment: either numeric components (routed through lib/gpa setEnrollmentResult, which derives the letter + recomputes CGPA) or a statusCode override, refusing edits on a locked row with 423 and validating the bylaw coursework minimum for 'I' (incompleteCourseworkPercent → 422). POST (exam.result.publish) approve/unlock: bulk sets resultLocked/approvedAt over a whole course, optionally narrowed to {academicYear, semester} — اعتماد وغلق / إعادة فتح.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: a «النظام الأكاديمي» Select in the toolbar beside the course picker; because the API already emits a per-row `system` field, the page can filter client-side, but the correct fix is server-side `?academicSystem=` on GET adding `student: academicSystemWhere(sys)` to the enrollment where-clause (and, for consistency, the same param scoping the bulk approve/unlock POST so a control head can lock only one system's rows). A per-row system badge should also be rendered — the API sends it and the UI currently drops it.


**منطق يجب أن يختلف بين النظامين:** YES — heavy. Credit rows carry a stored letterGrade + grade points; annual rows have NO letter (lib/gpa short-circuits ANNUAL students to store RAW marks only, letterGrade:null, no CGPA) and the route instead derives a تقدير band at read time from total/courseMax via bandsFromRegulations + gradeFromBands. Pass/fail, GPA impact, and the meaning of the result column therefore differ per system. The 'I' coursework-percent rule and the verbal status codes are shared.


**الوضع الحالي في الكود:** PARTIALLY — the best-handled module in the area. GET includes `student.program.academicSystem`, sets `isAnnual`, emits `system: 'ANNUAL'|'CREDIT_HOURS'` per row, and derives the annual تقدير band instead of a letter; the write path branches inside lib/gpa. What is missing is any FILTER: the roster always mixes both systems, and the page never surfaces or uses the `system` field.


### الكنترول — Exam control committees & tasks

**المسار:** `/institute/exams/control  (GET /api/institute/exams/control)`


**الوظيفة والـ workflow:**
Read-only dashboard over ExamCommittee and ControlTask. Returns each committee (name, department string, head, members, courses, status) and each task (title, status, assignee, owning committee name), plus stats: committee count, active committees, pending (status != 'done') tasks. Gate exam.control.view. There is no write endpoint and no student, enrollment or grade in the payload.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No — and none needed.


### الحالات الاستثنائية — Exceptional-case control desk (ClientR2)

**المسار:** `/institute/exams/exceptions  (GET/PATCH /api/institute/exams/exceptions)`


**الوظيفة والـ workflow:**
The exception workflow desk. GET returns: the exception GradeStatus catalogue with its rule properties (needsAction, nextAction, affectsGpa, isPass, countsAttempt, isFinal), the letter statuses, the active CourseResultReason catalogue (code/nameAr/category/appliesTo), ACTION_TYPES, the course list, a PENDING-approval queue (up to 200 enrollments with statusApprovalState='PENDING', each with student code/name and course), an open follow-up queue (resultPending=true, ordered by actionDueDate), and — when ?courseId= is given — the full course roster with each row's gradeStatusCode, reasonCode, attemptNo, resultPending, actionType, actionDueDate, approvalState, resultLocked, term. PATCH runs one of four workflow actions gated by two permissions: set/resolve = exam.exception.set (control), approve/reject = exam.exception.approve (control head / student affairs); each delegates to lib/course-result (setExceptionStatus / approveExceptionStatus / resolveAction) and writes an audit record with the tenant id.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: one «النظام الأكاديمي» Select in the desk header applying to all three lists (roster + pending-approval + open-actions). API: `?academicSystem=` on GET, folded as `student: academicSystemWhere(sys)` into the roster, pendingApproval and openActions queries alike. Default = all (a control head must keep seeing every pending case).


**منطق يجب أن يختلف بين النظامين:** YES — resolveAction with numeric components re-enters lib/gpa, which stores letters+GPA for credit students and raw marks only for annual students; attempt counting and the 'second attempt' concept map onto دور ثانٍ in the annual bylaw versus a re-registration in credit hours. The status/reason catalogues themselves are shared. Any future per-system restriction of which exception codes are offerable belongs here.


**الوضع الحالي في الكود:** No. Neither the route nor lib/course-result reads academicSystem; the queues mix both systems and the roster shows no system column.


### جدول حالات النتيجة — Result-state rules table

**المسار:** `/institute/exams/result-states  (GET/PATCH/POST /api/institute/grade-statuses)`


**الوظيفة والـ workflow:**
Configuration screen for the GradeStatus catalogue — the institute's own result-code table. GET (exam.grade.view) lists every status ordered by `order` with points, affectsGpa, isPass, isLetter, minPercent and the ClientR2 rule flags (countsAttempt, needsAction, nextAction, isException, isFinal) plus counts of letters / special / exception / action-requiring codes. PATCH (exam.grade.edit) edits any of those fields on one status; POST adds a custom status with sensible defaults (countsAttempt true, needsAction false, nextAction 'NONE', isFinal true, order 50). This table is what the grade-entry, exceptions and attendance engines read.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (it is a code/policy table, not a roster)


**منطق يجب أن يختلف بين النظامين:** Indirectly: `points`/`affectsGpa` are credit-hour concepts and `minPercent` is the annual/percentage concept, but the table has no system column and one shared catalogue serves both. If the bylaw ever needs different code sets per system, this model would need a `academicSystem` column — a DATA-MODEL question, not a display filter.


**الوضع الحالي في الكود:** No — and no display filter is warranted.


### النتائج — Per-course result aggregates

**المسار:** `/institute/exams/results  (GET /api/institute/exams/results)`


**الوظيفة والـ workflow:**
Results overview. For every Course it loads all enrollments and computes: max = midtermMax+finalMax+practicalMax+homeworkMax; graded = rows with final != null; each row's total = sum of the four components; passed = totals where total/max >= 0.60 (a HARDCODED 60% pass line); passRate; avgGrade = mean percentage. Stats = course count, mean pass rate over graded courses, publishedCourses (= courses with any graded row). Gate exam.result.view. The page is read-only (fetch + cards/progress bars, Download/Eye buttons are inert).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: «النظام الأكاديمي» Select above the course-results table. API: `?academicSystem=` on GET, applied as `enrollments: { where: { student: academicSystemWhere(sys) } }` so the pass-rate/average aggregates are computed over only that system's cohort. Default = all.


**منطق يجب أن يختلف بين النظامين:** YES. The 60% pass constant is wrong for both systems as written: credit-hour pass/fail must come from the letter/GradeStatus (isPass) and the annual pass line must come from Regulations.annualPassPercent (default 50) — the same source lib/rafaa uses. Mixing both cohorts into one pass rate with one hardcoded threshold produces a meaningless number for a dual-system institute; averaging should also present CGPA-side vs نسبة-side separately.


**الوضع الحالي في الكود:** No — zero awareness of academicSystem, and the pass rule is a magic 0.6 rather than regulations- or status-driven.


### الرأفة ورفع التقدير — Grade adjustments (ClientR7)

**المسار:** `/institute/exams/grade-adjustments  (GET/POST /api/institute/grade-adjustments, GET/PATCH /api/institute/grade-adjustments/[id], GET/PATCH /api/institute/grade-adjustments/config)`


**الوظيفة والـ workflow:**
The الرأفة (grace marks that flip a failing year result) and رفع التقدير (bump a student to the next تقدير band) workflow. GET previews a whole فرقة: required ?academicYear & ?yearGroup(level), optional programId/departmentId; a master bylaw toggle (getModuleConfig().enabled) short-circuits to an empty flagged payload. previewAdjustments loads the students at that level, runs computeAnnualForStudents({ignoreGrace:true}) to get each one's untouched annual result, reads Regulations (annualPassPercent, maxCarryOverSubjects), the rafaa/improvement configs and the set of prior approved beneficiaries, then emits per-student rows (original result, grace marks applied per course, post result, from/to تقدير, benefitedRafaa/benefitedImprovement). POST (gradeadjust.apply) freezes the selection into a DRAFT GradeAdjustmentBatch with immutable items; [id] PATCH approve (gradeadjust.approve — persists the grace, overlaid onto results at read time) or cancel (rollback). config GET/PATCH holds both engines' bylaw settings + the module toggle (gradeadjust.config).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: «النظام الأكاديمي» Select alongside the existing academicYear/فرقة/program/department controls — but here it should default to ANNUAL, not all, because the engine is annual-only. API: `?academicSystem=` on GET, and inside previewAdjustments the student query must add academicSystemWhere('ANNUAL') so credit-hour students at the same level cannot enter a batch.


**منطق يجب أن يختلف بين النظامين:** YES — this module is intrinsically ANNUAL-only: it operates on النسبة/التقدير bands and منقول/دور ثانٍ/باقٍ statuses via lib/annual and Regulations.annualPassPercent. There is no credit-hour analogue (a CGPA institute would express grace as a letter/points change, which this engine cannot produce).


**الوضع الحالي في الكود:** NO — and this is the sharpest defect in the area. previewAdjustments filters students only by `level` (+ optional program/department) with NO academicSystemWhere, so in a dual-system institute credit-hour students at the same فرقة number are pulled into computeAnnualForStudents, given a fabricated annual result, and can be written into an approved grace batch.


### التظلمات — Exam appeals

**المسار:** `/institute/exams/appeals  (GET/PATCH /api/institute/exams/appeals)`


**الوظيفة والـ workflow:**
Appeal queue over ExamAppeal. GET(?status=PENDING|APPROVED|REJECTED|all) lists appeals newest-first with the student (nameAr, studentCode), the course (nameAr, code), the student's reason text, status + Arabic label (قيد المراجعة/مقبول/مرفوض), the committee response and the submission date, plus counts per status. PATCH (exam.appeal.resolve) sets status + response and stamps respondedAt. Read gate exam.appeal.view. Note it is a decision record only — resolving an appeal does NOT write back a grade; the correction goes through the grades/exceptions endpoints.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: «النظام الأكاديمي» Select next to the existing status filter tabs. API: `?academicSystem=` on GET, applied as `student: academicSystemWhere(sys)` in the where alongside the status filter (and reflected in the per-status stat counts). Default = all.


**منطق يجب أن يختلف بين النظامين:** none — display only. (The appeal record itself carries no marks; any recomputation happens in the grades path.)


**الوضع الحالي في الكود:** No — the only filter implemented is ?status.


### الحالة الأكاديمية — Academic standing dashboard & write-back

**المسار:** `/institute/exams/academic-standing  (GET /api/institute/academic-standing, POST /api/institute/academic-standing/apply)`


**الوظيفة والـ workflow:**
The CGPA/probation engine's UI. GET with ?studentCode= returns one student's full standing; without it, it loads every non-terminal student (status not in GRADUATED/WITHDRAWN/DISMISSED) and runs computeStandingForStudents, emitting per student: cgpa, earnedHours, onProbation, escalation, termHonor/cumulativeHonor, canPromote, qualifiedLevel, graduationEligible, remainingHours, failedMandatory count and flags — plus dashboard stats (warnings, final warnings, honor, promotable, expected graduates). Gate student.view. POST /apply (student.write) performs bylaw write-backs over the same population, optionally narrowed by studentCodes[]: action 'promote' sets Student.level := qualifiedLevel for every canPromote student, and action 'escalate' creates an ACADEMIC StudentWarning and sets Student.status='DISMISSED' for everyone at escalation 'track-change-or-dismissal'; both write audit records.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: «النظام الأكاديمي» Select in the header — but constrained: since the underlying engine is CGPA-only, the honest UI is a locked/annotated indicator reading نظام الساعات المعتمدة with the annual option either disabled or routed to the annual promotion screen, until an annual standing engine exists. API: today the system is hardcoded, not a param; when annual standing is built it becomes `?academicSystem=` on GET, branching to the annual engine (منقول / له دور ثانٍ / باقٍ للإعادة + تقدير) instead of CGPA.


**منطق يجب أن يختلف بين النظامين:** YES — the deepest per-system divergence in the area. Probation, honors, promotion eligibility, remaining hours and graduation eligibility are all credit-hour CGPA constructs; the annual equivalent is a year-result verdict plus carry-over subject counts, computed by lib/annual, not by lib/standing.


**الوضع الحالي في الكود:** YES — explicitly and defensively, but by HARD SCOPING rather than by a user filter. Both GET and POST /apply add academicSystemWhere('CREDIT_HOURS') (which folds programId:null into credit-hours), with an in-code comment that without it annual students would show a false probation and the escalate action could WRONGLY DISMISS them. Correct as a safety guard; the gap is that the UI never tells the user the dashboard is credit-hours-only and offers no way to view the annual cohort's standing.


### تقرير الحضور والحرمان — Attendance report & deprivation

**المسار:** `/institute/exams/attendance  (GET/PATCH /api/institute/attendance-report)`


**الوظيفة والـ workflow:**
Per-course attendance roster driving the حرمان (deprivation) decision. GET ?courseId=&academicYear=&semester=&lowOnly= (defaults 2024-2025/first, first course by code) calls lib/attendance courseAttendance, which returns the roster with each student's attendance percentage and the bylaw's 3-stage warning + ban flags; lowOnly=true returns only students at/below the warn threshold (the bylaw's حصر list). Gate attendance.view. PATCH (attendance.edit) applies deprivation to one enrollment by calling setEnrollmentResult(enrollmentId, {code:'DN'}) — DN counts as a fail (0) toward GPA and the CGPA is recomputed through the shared write path.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: «النظام الأكاديمي» Select in the filter bar beside the course picker, term and the lowOnly checkbox. API: `?academicSystem=` on GET, threaded into courseAttendance's enrollment query as `student: academicSystemWhere(sys)`. Default = all — attendance is a shared obligation and the control head must see the whole hall by default.


**منطق يجب أن يختلف بين النظامين:** PARTIAL. The absence thresholds and warning stages are shared bylaw rules, so the roster itself is system-neutral. The CONSEQUENCE is not: applying DN routes through lib/gpa, which for a credit student writes a 0-point failing letter and recomputes CGPA, while for an annual student it stores no letter/points at all — so the deprivation's effect on the year result (باقٍ للإعادة / carry-over) must be expressed through the annual engine. Worth verifying that a DN on an annual enrollment actually propagates to the annual result.


**الوضع الحالي في الكود:** No filter and no branching in this route; the only per-system behaviour is whatever lib/gpa does downstream of setEnrollmentResult.


---

<a id="online-exams-lms"></a>

## الامتحانات الأونلاين ومنصة التعلم

*12 موديول · 5 يعرض طلاب · 4 يحتاج فلتر*


### الامتحانات الإلكترونية — قائمة الامتحانات (Online Exams list)

**المسار:** `/institute/online-exams  →  GET /api/institute/online-exams`


**الوظيفة والـ workflow:**
Institute-staff console listing every ExamSession as an "online exam". The API loads ALL prisma.examSession rows (no filtering at all — no term, program, department or course scope), includes course._count.enrollments and course._count.examQuestions, and derives status client-side from date+durationMins (now>end=completed, now>=start=active, else scheduled). Guarded by requireFeature('exams.online') + requirePermission('onlineexam.view'). The page fetches once on mount and does purely client-side search (title/code/course) plus a status tab; statusFilter state is declared but frozen ('all', no setter). Row actions (view/edit/duplicate/delete/publish) are UI-only — no mutation endpoints are wired. Stats cards come from the API stats block.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add an «النظام الأكاديمي» Select in the page header filter row next to the search box (all | credit | annual), wired to a new `system` query param on GET /api/institute/online-exams; server-side translate to `where: { course: { studyPlanItems: { some: { program: { academicSystem } } } } }` (courses have no system of their own) and additionally scope the `participants` enrollment count via `_count: { select: { enrollments: { where: { student: { program: { academicSystem } } } } } }` so the participant number matches the chosen system. Default must stay 'all'.


**منطق يجب أن يختلف بين النظامين:** none — display only. No grade or standing computation happens here; only status from timestamps. The only system-sensitive number is `participants` (enrollment count), which must be scoped when the filter is used.


**الوضع الحالي في الكود:** No. Zero references to academicSystem anywhere in the page or the route; every ExamSession in the DB is returned regardless of the program system.


### إنشاء امتحان إلكتروني — 5-step wizard (Create online exam)

**المسار:** `/institute/online-exams/create  →  reads GET /api/institute/courses, writes POST /api/institute/exams`


**الوظيفة والـ workflow:**
Five-step wizard (basic info → pick questions → schedule → settings → review) that ends in POST /api/institute/exams with { courseId, title, examType:'online', date, startTime, durationMins, hall:null } and redirects back to the list. Only step 1's course dropdown is real data (GET /api/institute/courses, which returns each course with `students` = _count.enrollments). Steps 2's question bank is a HARDCODED in-file array of 8 sample questions (Q001–Q008) — `examData.selectedQuestions` is validated for non-emptiness but is NEVER sent in the POST body, so question selection is decorative. `semesters` and `sections` are hardcoded literals too; the section/semester choice is also not persisted. Exam settings (shuffle, lock, attempts, passing score) are collected in local state and likewise dropped by the submit.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (the only student-derived value is the aggregate `students` count shown beside each course in the course dropdown; no student rows or academic records are listed). If the owner wants the wizard to target one system, the natural place would be the same `system` param on the course dropdown fetch, but that is a scoping nicety, not the required display filter.


**منطق يجب أن يختلف بين النظامين:** none — display only (currently not even persisting the settings it collects). If the wizard is ever completed, passingScore semantics differ per system (CGPA-band vs percentage/تقدير), which would then need branching.


**الوضع الحالي في الكود:** No. No academicSystem awareness; also note the wizard is largely non-functional (mock question bank, dropped fields).


### بنك الأسئلة (Question bank)

**المسار:** `/institute/online-exams/question-bank  →  GET/POST/DELETE /api/institute/exams/questions`


**الوظيفة والـ workflow:**
Full CRUD-ish manager for ExamQuestion rows: lists questions from GET /api/institute/exams/questions, creates via POST (with options for MCQ), deletes via DELETE ?id=. Client-side filters exist for course, question type and difficulty, plus multi-select for bulk actions. Questions are attached to a COURSE (courseId), never to a student.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. Questions belong to courses, and courses belong to departments with no system of their own, so a system filter here would be meaningless (and the owner's rule 3 explicitly excludes it).


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No — and correctly so; nothing here is per-student.


### تقارير الامتحانات الإلكترونية (Online-exam analytics/reports)

**المسار:** `/institute/online-exams/reports  →  GET /api/institute/online-exams/reports?courseId=`


**الوظيفة والـ workflow:**
Per-course exam analytics. The API takes courseId (defaults to the first course alphabetically by code), pulls every Enrollment for that course with final != null, includes the student, and computes per student: score = midterm+final+practical+homework, max = course.midtermMax+finalMax+practicalMax+homeworkMax, percentage, and a letter grade (e.letterGrade, else the module-local `letterOf` ladder A≥90 … F<60). It then builds a letter-grade distribution, a 5-bucket score histogram (90-100/80-89/70-79/60-69/0-59) and stats { participants, average, passRate (pct>=60), highest, lowest }. The page renders named student rows (nameAr + studentCode + score + % + grade) with client-side name/code search and sort by score or name; the «الشعبة» Select next to the course picker is rendered disabled with only 'الكل'.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add «النظام الأكاديمي» as a third Select in the existing filter Card row (it already has المقرر / الشعبة(disabled) / بحث — replace or sit beside the dead الشعبة control), passing `system=all|CREDIT_HOURS|ANNUAL` to GET /api/institute/online-exams/reports; server-side apply it to the enrollment query as `where: { courseId, final: { not: null }, student: { program: { academicSystem: <sys> } } }` and, when narrowing, also filter the `courses` list the dropdown shows. Default 'all' so a mixed course still shows everyone.


**منطق يجب أن يختلف بين النظامين:** YES — this is the most system-sensitive module in the area. The hardcoded `letterOf` A/A-/B+/… ladder and the letterGrade column are CREDIT_HOURS semantics; ANNUAL students must be graded/labelled as percentage + تقدير (ممتاز/جيد جداً/جيد/مقبول/ضعيف) with the annual pass threshold from the bylaw, not the flat pct>=60 used by `passRate`. The grade-distribution chart also needs two shapes (letter bands vs تقدير bands), and mixing both systems in one distribution is currently silently wrong. Pass rate and the 60% cut-off must come from the per-system bylaw config, not a literal.


**الوضع الحالي في الكود:** No. No academicSystem resolution, no resolveStudentSystems batch call; every student in the course is scored on the credit-hour letter ladder regardless of program.


### لوحة نظام التعلم (LMS dashboard)

**المسار:** `/lms/dashboard  →  GET /api/lms/dashboard`


**الوظيفة والـ workflow:**
Read-only LMS overview. Aggregates in one Promise.all: lMSContent.count(), all VirtualClass rows, forumTopic.count(), all Assignment rows (with course), and the 4 newest content items. Returns stats {content, classes, topics, assignments}, up to 4 upcoming/live classes, 4 recent content items and 4 nearest-due assignments (title + course.nameAr + dueDate). Guarded by requireFeature('lms.enabled') + requireSession() (any authenticated session, not permission-scoped).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension; nothing here is per-student (assignment cards show course names and due dates only, never students or grades).


**منطق يجب أن يختلف بين النظامين:** none — display only, pure counts.


**الوضع الحالي في الكود:** No — and none needed.


### المحتوى التعليمي (LMS content library)

**المسار:** `/lms/content  →  GET /api/lms/content`


**الوظيفة والـ workflow:**
Lists all LMSContent rows newest-first as {title, unit, type, url, sizeMb, views}, derives distinct units for the sidebar with per-unit counts, and returns stats {total, videos, pdfs, totalViews}. The page offers grid/list view plus decorative Select filters that have no options wired to the data. No upload/mutation endpoint exists — the library is read-only from the UI.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. LMSContent has no student or program relation at all (only title/unit/type/url/views), so a system filter has nothing to filter on — same category as library books in the owner's rule 3.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No — and none needed.


### الفصول الافتراضية (Virtual classes + recordings)

**المسار:** `/lms/virtual-classes  →  GET /api/lms/virtual-classes`


**الوظيفة والـ workflow:**
Lists all VirtualClass rows date-desc as {title, date, startTime, durationMins, platform, status, recordingUrl}; splits out those with a recordingUrl into a recordings tab and returns stats {total, live, upcoming, ended}. Join/start/record buttons are UI-only — there is no POST endpoint; the platform link is whatever recordingUrl holds.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. VirtualClass carries no student, enrollment, course or program relation in the shape this route returns; attendance is not modelled here.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No — and none needed.


### الواجبات والتسليمات (LMS assignments + grading queue)

**المسار:** `/lms/assignments  →  GET /api/lms/assignments`


**الوظيفة والـ workflow:**
Loads every Assignment with its course (+ enrollment count) and ALL its submissions (+ student). Per assignment it reports title, course.nameAr, dueDate, maxGrade, submissions count, total = course._count.enrollments, graded count, and status (active if dueDate>=now else completed). It then flattens submissions across all assignments into a 12-row grading queue showing STUDENT NAME (s.student.nameAr), assignment title, submittedAt, status ('submitted'→'pending', else late/graded) and grade. Stats include pendingGrading (submitted|late) and avgGrade (mean of non-null grades across every system's students). Read-only — no grading mutation endpoint exists.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add «النظام الأكاديمي» to the filter row above the assignments table (the page already renders three placeholder Selects at ~lines 194/207/228 that are unwired — use one of those slots) and to the submissions tab's own filter (~line 366), driving a `system` query param on GET /api/lms/assignments. Server-side: filter the submissions include with `submissions: { where: { student: { program: { academicSystem } } }, include: { student: true } }` and scope `_count.enrollments` the same way, so submissions/total/graded/avgGrade stay coherent. Default 'all'.


**منطق يجب أن يختلف بين النظامين:** Mostly display, with one caveat: avgGrade is a flat mean of raw submission grades pooled across both systems, which is only meaningful within one system's scale — if the owner ever surfaces it as an academic indicator it must be computed per system. Assignment maxGrade itself is a raw number, not system-specific.


**الوضع الحالي في الكود:** No. No academicSystem resolution; the grading queue mixes credit-hour and annual students with no way to tell them apart.


### الاختبارات (LMS exams list + results)

**المسار:** `/lms/exams  →  GET /api/lms/exams?courseId=`


**الوظيفة والـ workflow:**
Student/faculty-facing LMS mirror of the exam list: all ExamSession rows with course counts, status derived as scheduled/live/completed from date+durationMins. Additionally, for courseId (query param, else the first session's courseId) it loads Enrollments with final != null including the student and returns examResults rows of { student: nameAr, grade = midterm+final+practical+homework, maxGrade = the four *Max fields summed, status:'completed' } — i.e. NAMED STUDENT RESULT ROWS. The page renders exams tabs plus a results table, with three unwired placeholder Selects in the filter bar. Guard is requireFeature('lms.enabled') + requireSession() only — notably weaker than the institute-side onlineexam.view permission for essentially the same data.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add «النظام الأكاديمي» in the exams-page filter bar (one of the three placeholder Selects at ~lines 217/230/263) → `system` param on GET /api/lms/exams. Server-side: `where: { courseId, final: { not: null }, student: { program: { academicSystem } } }` for examResults, and for the exam list scope it through the course→studyPlanItem→program relation plus a scoped enrollment `participants` count. Default 'all'.


**منطق يجب أن يختلف بين النظامين:** YES for the results table: `grade / maxGrade` is presented raw, but how it should be LABELLED and whether it passes differs per system (letter/GPA band vs percentage + تقدير + منقول/له دور ثانٍ/باقٍ للإعادة). The route currently hardcodes status:'completed' for every row and applies no pass rule at all, so any future pass/fail badge must branch on the student's program system.


**الوضع الحالي في الكود:** No. No academicSystem anywhere in page or route.


### المنتديات (LMS forums)

**المسار:** `/lms/forums  →  GET /api/lms/forums`


**الوظيفة والـ workflow:**
Lists ForumCategory rows (ordered by `order`, with topic counts) and all ForumTopic rows (pinned first, then newest) with category name, title, authorName, authorRole, reply count (_count.posts), views, and the pinned/locked/answered flags; stats give categories/topics/posts/answered totals. Read-only — the compose/reply UI has no POST endpoint behind it.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension in the data model used here: ForumTopic stores denormalised `authorName`/`authorRole` STRINGS, not a Student relation, so there is nothing to join to a program or resolve a system from. It is discussion content, not an academic record.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No — and none needed.


### أداء الامتحان (Take exam — student sitting + auto-grading)

**المسار:** `/lms/exams/take/[id]  →  GET & POST /api/lms/exams/[id]/take`


**الوظيفة والـ workflow:**
The only genuinely transactional module in this area. GET returns the exam meta (title, subject, durationMins, passingScore, totalPoints = session.totalPoints ?? sum of question points) plus its questions mapped from ExamQuestion.type (mcq→multiple-choice, truefalse→true-false, short→short-answer, else essay) with MCQ options — deliberately WITHOUT option.isCorrect or question.correctAnswer, so the answer key never reaches the client. POST resolves the logged-in Student via resolveStudent() (403 if the session has no linked Student row), auto-grades: MCQ against the option flagged isCorrect, true/false against the string "true"/"false" in correctAnswer; short-answer and essay (and any ungradeable MCQ/TF) are left isCorrect=null / awardedPoints=null for manual review. It tallies earnedPoints/correct/wrong/unanswered, computes timeTakenSecs from a client-supplied startedAt, then UPSERTS one ExamAttempt per (examSessionId, studentId), deletes and recreates the ExamAnswer rows, and returns the result summary. The page runs a countdown with warning/auto-submit toasts, question flagging, and a results screen.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a for a display filter — this page is single-student, self-scoped (the attempt is owned by resolveStudent()), so there is no list to narrow. The system dimension matters here as COMPUTATION, not filtering.


**منطق يجب أن يختلف بين النظامين:** YES — `passingScore` is returned as a bare percentage and the result screen judges the attempt against it identically for both systems. For an ANNUAL-program student pass/fail and the resulting تقدير must come from the annual bylaw bands, while a CREDIT_HOURS student's attempt should map to the letter/points ladder; if an attempt ever feeds back into Enrollment marks, that write must branch on resolveStudentSystem(student.id). Auto-grading of MCQ/TF itself (points arithmetic) is system-neutral; only the verdict/label is not.


**الوضع الحالي في الكود:** No. resolveStudent() is used for identity, but resolveStudentSystem/getProgramSystem are never called; passingScore is applied flat.


### إعدادات الحماية (LMS exam protection settings)

**المسار:** `/lms/settings/protection  →  GET/POST /api/settings?key=<protection key>`


**الوظيفة والـ workflow:**
A settings screen persisting one JSON blob through the generic /api/settings Setting-table endpoint (single SETTINGS_KEY). It holds anti-cheating toggles (browser lock, tab-switch detection, copy/paste, camera/proctoring-style options) as a flat local state object saved on submit. Institute-wide configuration; no per-student or per-exam overrides.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension; it is a global configuration record in the Setting table.


**منطق يجب أن يختلف بين النظامين:** none — display/config only.


**الوضع الحالي في الكود:** No — and none needed.


---

<a id="reporting"></a>

## التقارير والتحليلات

*26 موديول · 20 يعرض طلاب · 22 يحتاج فلتر*


### مركز التقارير — Reporting Hub (UI)

**المسار:** `/institute/reporting — app/(institute)/institute/reporting/page.tsx`


**الوظيفة والـ workflow:**
Registry-driven reporting center. On mount GETs /api/institute/reporting for {catalogue, options}; renders a right-hand category tree (16 categories, only reports the user's permissions allow), a filter bar generated dynamically from the selected ReportDef.filters (academicYear, semester, facultyId, departmentId, programId, level, courseId, advisorId, instructorId, studentCode, dateFrom/dateTo, status, qualification — date inputs, free-text inputs, or Selects fed by options), a «عرض» run button (blocked while report.requires are unmet), CSV/Excel export (window.open of the same runner URL with format=csv|xlsx) and two print modes: normal print and «طباعة رسمية (للوزارة)» which renders result.meta.ministrySheet.matrix through <MinistryResultMatrix/> in A4/A3 landscape. ResultView renders three result kinds: kpi cards, table, and sheet (title + header letterhead + stats strip + totals/footer + transcript view).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add a «النظام الأكاديمي» Select (الكل / ساعات معتمدة / سنوي) in the filter bar next to the other FilterKey controls (it must be added as FilterKey 'academicSystem' in lib/reporting/types.ts + parseFilters so it is passed as ?academicSystem= to /api/institute/reporting/[id]); optionally also as a client-side filter of the category tree. Note the code deliberately does NOT hide the annual/credit families from the tree (comment at shownCatalogue) — that decision is correct and must stay: the filter narrows rows, not the catalogue.


**منطق يجب أن يختلف بين النظامين:** Display-only in the page itself, except the official-print branch: ministryMatrix is rendered the same for both systems (matrix carries %/تقدير for ANNUAL and GPA columns for CREDIT_HOURS from the server). Header chip shows useActiveProgramSystem() as context only — it does not filter anything.


**الوضع الحالي في الكود:** Partial. It imports useActiveProgramSystem and shows the active system as a text hint ('السياق الحالي: النظام السنوي/الساعات المعتمدة'), but no filter is sent to the API and no rows are narrowed. The system is only resolved server-side from programId.


### Reporting catalogue API

**المسار:** `GET /api/institute/reporting — app/api/institute/reporting/route.ts`


**الوظيفة والـ workflow:**
Guarded by requirePermission('reports.view'); builds reportCatalogue() from the registry, filters each category's reports by hasPermission(ctx, r.permission), drops empty categories, and returns it with filterOptions(universityId) — tenant-scoped option lists for faculties, departments, programs, courses, advisors(Instructor), academicYears (distinct Enrollment.academicYear), semesters, levels 1..6.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ✅ نعم |


**مكان الفلتر:** Metadata endpoint, but it must serve the filter: add 'academicSystem' to the option lists (a static 3-value list) and expose Program.academicSystem on each program option so the UI can grey/segment programs by system.


**منطق يجب أن يختلف بين النظامين:** none — catalogue/metadata only.


**الوضع الحالي في الكود:** No. filterOptions selects only {id, nameAr, departmentId} for programs — academicSystem is not selected or returned.


### Report runner API

**المسار:** `GET /api/institute/reporting/[id] — app/api/institute/reporting/[id]/route.ts`


**الوظيفة والـ workflow:**
Resolves id → ReportDef via getReport(); enforces the report's own permission; parseFilters() from the querystring; rejects with 400 if any report.requires filter is missing; resolves the academic system server-side via getProgramSystem(filters.programId) (undefined when no program is chosen) and passes it as ReportContext.academicSystem; runs the report; then serializes as JSON, CSV (toCsv) or Excel XML (toExcelXml) by ?format=.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Accept an explicit `academicSystem` query param (CREDIT_HOURS | ANNUAL | all). Precedence: explicit param > program-derived getProgramSystem(programId) > undefined (both). Pass it in ReportContext so each family's runner can apply academicSystemWhere(system) instead of the hardcoded constants used today.


**منطق يجب أن يختلف بين النظامين:** It is the single choke point where system resolution happens; it must forward the choice, and CSV/Excel exports must honor the same narrowing.


**الوضع الحالي في الكود:** Partially — it already derives academicSystem from the selected program, but there is no user-facing param, and most report runners ignore ctx.academicSystem entirely (they hardcode academicSystemWhere('CREDIT_HOURS') or ('ANNUAL')).


### Legacy registrar reports page

**المسار:** `/institute/reports — app/(institute)/institute/reports/page.tsx`


**الوظيفة والـ workflow:**
Pre-ClientR3 fixed report suite: a Select of 15 hardcoded types (course-results, grade-sheet, pass-fail, success-stats, fail-reasons, absence-reasons, open-actions, warned, expected-graduates, student-status, ministry-prep, ministry-transitional/final/deprived, transcript), a course picker (for course-scoped types) and a studentCode input (transcript / student-status), fetches /api/institute/reports?type=…, renders per-type tables and a browser print button. Still routable and duplicates several hub reports.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Either retire the page in favour of the hub, or add a «النظام الأكاديمي» Select beside the type/course pickers passed as &academicSystem= to /api/institute/reports. Its ministry-*, warned, expected-graduates, transcript and pass/fail rosters are all student rosters that leak across systems.


**منطق يجب أن يختلف بين النظامين:** Yes — everything here is credit-hour shaped: transcript shows creditHours/points/CGPA standing and the ministry sheets show cgpa/earnedHours; for ANNUAL students these must render %/تقدير/نتيجة (منقول/دور ثانٍ/باق) instead.


**الوضع الحالي في الكود:** No. Zero mention of academicSystem anywhere in the page.


### Legacy reports API

**المسار:** `GET /api/institute/reports — app/api/institute/reports/route.ts`


**الوظيفة والـ workflow:**
requirePermission('reports.view'); switch on ?type= dispatching to lib/reports helpers (courseResults, gradeSheet, passFailRoster, standingReport('warned'|'expected-graduates'), ministryPrep, ministrySheet(stage), studentStatus, successStats, failReasons, absenceReasons, openActions) plus an inline buildTranscript(studentCode) that reads Enrollments + GradeStatus + computeAcademicStanding and groups courses per academicYear|semester. Also always returns the full course list for the picker. Note: it does not scope by universityId (courses findMany has no tenant where).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add an `academicSystem` query param applied to the student-side where clauses of every roster type (via lib/reporting/filters.academicSystemWhere) — standingReport, ministrySheet, passFailRoster, gradeSheet, successStats.


**منطق يجب أن يختلف بين النظامين:** Yes — buildTranscript and computeAcademicStanding are pure credit-hour (points, creditHours, CGPA). Annual students need percentage/تقدير and year-result computation, not GPA.


**الوضع الحالي في الكود:** No. No academicSystem reference; no program/system branching at all.


### Registry + types + filters (shared reporting core)

**المسار:** `lib/reporting/registry.ts, lib/reporting/types.ts, lib/reporting/filters.ts`


**الوظيفة والـ workflow:**
registry.ts flattens 18 report arrays into ALL, builds a BY_ID map, and exposes getReport(id) plus reportCatalogue() ordered by 16 categories. types.ts defines FilterKey, Filters, ReportColumn/Row, the three result kinds (table | kpi | sheet), and ReportContext {universityId, academicSystem?}. filters.ts holds parseFilters (drops '' and 'all'), termWhere, studentWhere (universityId/department/faculty/program/level/advisor/entryQualification/status), academicSystemWhere(system) — the ANNUAL→program.academicSystem='ANNUAL' vs CREDIT_HOURS→(program CREDIT_HOURS OR programId null) predicate — and filterOptions for the hub.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ✅ نعم |


**مكان الفلتر:** This is where the filter must be implemented once: add 'academicSystem' to FilterKey + parseFilters, add an optional system arg to studentWhere so every family inherits it, and make academicSystemWhere accept 'ALL' (returns {}).


**منطق يجب أن يختلف بين النظامين:** academicSystemWhere is the canonical system predicate for the whole reporting layer; the CREDIT_HOURS branch treats program-less students as credit-hour, which is the platform default.


**الوضع الحالي في الكود:** Yes — the primitive exists (academicSystemWhere) and ReportContext.academicSystem is typed, but there is no academicSystem FilterKey, parseFilters ignores it, studentWhere never applies it, and filterOptions does not expose it.


### كشوف الوزارة — ministry family

**المسار:** `lib/reporting/reports/ministry.ts (ministry-transitional | ministry-final | ministry-deprived)`


**الوظيفة والـ workflow:**
Three ministry exam-board rosters. Each reuses lib/reports.ministrySheet(stage, termWhere(f)) and wraps it in a print letterhead built live: institute name from University.nameAr, sheet name, academic year, term label, print date, plus a grade-scale footer read from GradeStatus (isLetter, tenant-scoped, deduped by code). Returns kind:'sheet' — transitional/final columns are رقم الجلوس/الاسم/القسم/المستوى/المعدل التراكمي/الساعات; deprived lists the deprived courses per student.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add academicSystem to filters:[] (currently only academicYear+semester) and pass it into ministrySheet's where so the roster is narrowed; the runner already knows the system when a program is picked but no programId filter is even offered here.


**منطق يجب أن يختلف بين النظامين:** Critical — the columns are CGPA + earned hours, which are meaningless for ANNUAL students (they need النسبة المئوية/التقدير/النتيجة). Today an annual student appearing in these sheets would show a 0.00 CGPA.


**الوضع الحالي في الكود:** No. ministry.ts contains no academicSystem reference and does not call academicSystemWhere; it does not even accept departmentId/programId.


### شؤون الطلاب — student-affairs family

**المسار:** `lib/reporting/reports/student-affairs.ts (enrolled-students, new-students, withdrawn-students, dismissed-students, hold-students, not-registered, transferred-students, incoming-students, guardians-data, graduates)`


**الوظيفة والـ workflow:**
Ten pure student rosters built on studentWhere(f, universityId): enrolled/new/withdrawn/dismissed lists, students carrying a registration hold, students enrolled but with no Enrollment rows for the selected term (requires academicYear), transfer in/out lists (transfer.view permission), guardian contact + bank data, and graduation-eligible students (graduation.view).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add 'academicSystem' to each ReportDef.filters and AND academicSystemWhere(selected) into the studentWhere for all ten runners.


**منطق يجب أن يختلف بين النظامين:** 'graduates' (graduation eligibility) computes differently per system — credit hours+CGPA vs annual year-progression/تقدير التخرج. The other nine are display-only rosters.


**الوضع الحالي في الكود:** Only one of ten: 'graduates' hardcodes ...academicSystemWhere('CREDIT_HOURS') (line 154), silently excluding annual students. The other nine apply no system predicate — they mix both systems.


### القبول — admissions reports

**المسار:** `lib/reporting/reports/admissions.ts (accepted-by-department, accepted-by-qualification, rejection-reasons, incomplete-files) — filed under category 'student-affairs'`


**الوظيفة والـ workflow:**
Four aggregate admission reports over Application/admission records filtered by academicYear: counts of accepted applicants grouped by department, by entry qualification (ثانوية عامة / مدارس فنية …), the most frequent rejection reasons, and the count of incomplete files.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Applicants become students of a program, so add 'academicSystem' to the filters and join through the applied program to narrow — as an optional narrowing only; default must remain all.


**منطق يجب أن يختلف بين النظامين:** none — display/aggregate only.


**الوضع الحالي في الكود:** No.


### حجب الطلاب — holds family

**المسار:** `lib/reporting/reports/holds.ts (held-results, holds-by-reason, released-holds, automatic-holds)`


**الوظيفة والـ workflow:**
ClientR5 hold-engine reporting: currently held students with hold type and reason, distribution of active holds by type/reason with percentages, released holds (who released, when — date range), and automatic system-applied/released holds (finance ↔ result-visibility linkage) over a date range.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** held-results and released-holds already take departmentId/programId/level — add 'academicSystem' alongside and AND academicSystemWhere into the student where; holds-by-reason/automatic-holds should accept it as an optional narrowing of the aggregate.


**منطق يجب أن يختلف بين النظامين:** none — visibility/hold state is system-agnostic (memory: holds are visibility-only).


**الوضع الحالي في الكود:** No — holds.ts has no academicSystem reference.


### النتائج ومتابعة الرصد — results family

**المسار:** `lib/reporting/reports/results.ts (pass-list, fail-list, toppers-level, toppers-batch, grade-distribution, result-statistics, success-stats)`


**الوظيفة والـ workflow:**
Per-course pass/fail name rosters (requires courseId), level toppers (requires level) and batch toppers ranked by standing, grade distribution across a term/department/course, an aggregate result statistics report (إجمالي/ناجح/راسب/منسحب/غير مكتمل/محروم) and institute-wide success statistics.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add 'academicSystem' to all seven and AND academicSystemWhere(chosen) into the student where — toppers already build one (hardcoded), pass/fail lists and distributions build theirs from enrollments and need a student-side program join.


**منطق يجب أن يختلف بين النظامين:** Yes — ranking/توزيع التقديرات differ: credit-hours ranks by CGPA/points, annual ranks by السنة's percentage and maps to تقدير bands. pass/fail classification also differs (annual adds دور ثانٍ).


**الوضع الحالي في الكود:** Partial and hardcoded: toppers-level and toppers-batch spread academicSystemWhere('CREDIT_HOURS') — annual students can never be top-of-level. The other five apply no system predicate.


### التقارير الأكاديمية — academic family

**المسار:** `lib/reporting/reports/academic.ts (programs-most-registered, students-per-program, course-grades-sheet, pass-rate-by-program, course-success-ranking, course-demand-capacity, course-lifecycle)`


**الوظيفة والـ workflow:**
Program/course analytics: most-registered programs by year, per-program student counts with average GPA and hours, a per-course grade sheet listing students with grade, level and attempt number (requires courseId), pass rates by program, best/worst courses by success rate, registered-vs-section-capacity demand, and a single-course lifecycle analysis (fail/withdraw/deprivation/repeat + earned vs registered hours).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** course-grades-sheet is an explicit student roster → add 'academicSystem' filter + academicSystemWhere on the enrolled students; students-per-program / pass-rate-by-program should offer it as an optional grouping/narrowing.


**منطق يجب أن يختلف بين النظامين:** Yes — students-per-program reports 'المعدل والساعات' (credit-hour concepts); for annual programs the equivalent is average percentage, and course-lifecycle's earned/registered hours has no annual analogue.


**الوضع الحالي في الكود:** No academicSystem reference in academic.ts.


### الحضور والغياب — attendance family

**المسار:** `lib/reporting/reports/attendance.ts (attendance-day, deprivation-list, near-deprivation, most-absent-courses, retention-level, attendance-indicators)`


**الوظيفة والـ workflow:**
Attendance analytics: per-day/date-range present/absent/late per course, students who crossed the >25% absence deprivation threshold (requires course+year+semester), students approaching it, courses with the highest absence rates, level→level retention percentages for a program, and headline attendance/absence/warning/deprivation rate indicators.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** deprivation-list, near-deprivation and attendance-day list named students → add 'academicSystem' to their filters and AND academicSystemWhere into the student side of the attendance query.


**منطق يجب أن يختلف بين النظامين:** Deprivation threshold and its consequence are bylaw-driven and can differ per system (annual حرمان feeds النتيجة السنوية); retention-level's 1→2→3 progression is annual-فرقة vs credit-hour level semantics.


**الوضع الحالي في الكود:** No.


### أعضاء هيئة التدريس — faculty family

**المسار:** `lib/reporting/reports/faculty.ts (teaching-load, doctor-success)`


**الوظيفة والـ workflow:**
Instructor teaching load per department (courses/sections/hours) and per-instructor student pass/fail outcomes for a term/department.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ✅ نعم |


**مكان الفلتر:** teaching-load is instructor-only (no student dimension), but doctor-success aggregates student outcomes → offer 'academicSystem' as an optional narrowing on that one report; leave teaching-load without it.


**منطق يجب أن يختلف بين النظامين:** doctor-success's pass/fail classification depends on the system's grading rules.


**الوضع الحالي في الكود:** No.


### الإرشاد الأكاديمي — advisor family

**المسار:** `lib/reporting/reports/advisor.ts (advisor-load, advisor-at-risk, advisor-top)`


**الوظيفة والـ workflow:**
Advisor caseload counts per department, plus per-advisor lists of at-risk advisees (CGPA < 2.00 or under warning) and top-performing advisees (both require advisorId).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add 'academicSystem' to advisor-at-risk and advisor-top (student rosters) and AND academicSystemWhere into studentWhere; advisor-load may take it as an optional count breakdown.


**منطق يجب أن يختلف بين النظامين:** Yes — 'at risk' is defined as CGPA < 2.00, a credit-hour-only rule; the annual equivalent is failing/below-pass percentage or باق للإعادة. 'Top' ranking likewise differs.


**الوضع الحالي في الكود:** No — advisor.ts has no academicSystem reference; the 2.00 threshold is unconditional.


### التقارير المالية — financial family

**المسار:** `lib/reporting/reports/financial.ts (fin-profitability-costcenter/-program/-faculty, fin-branch-comparison, fin-student-cost, fin-trial-balance, fin-income-statement, fin-balance-sheet, fin-cash-flow, fin-ar-aging, fin-defaulters, fin-revenue-by-program, fin-budget-vs-actual)`


**الوظيفة والـ workflow:**
Finance reporting on the double-entry ledger: cost-centre/program/faculty profitability and branch comparison over a date range from posted journal entries, cost-per-student, trial balance, income statement, balance sheet, cash flow, receivables aging, the defaulting-students list (per-student outstanding instalments, filterable by department), revenue by program and budget-vs-actual.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Only the student-dimension reports get an optional filter: fin-defaulters (per-student roster) and, as an optional narrowing, fin-student-cost / fin-revenue-by-program / fin-profitability-program. Per the owner's rule the default MUST stay 'all' — finance must never auto-hide either system. The pure GL statements (trial balance, income statement, balance sheet, cash flow, AR aging, branch comparison, budget-vs-actual, cost-centre/faculty profitability) get no filter.


**منطق يجب أن يختلف بين النظامين:** none — money is money; only the denominator (which students are counted) changes when the user narrows.


**الوضع الحالي في الكود:** No academicSystem reference anywhere in financial.ts.


### اللوحات التنفيذية — executive family

**المسار:** `lib/reporting/reports/executive.ts (executive-dashboard, kpi-academic, kpi-financial, kpi-quality) + lib/reporting/kpi.ts`


**الوظيفة والـ workflow:**
KPI cards for leadership (permission EXEC, no filters): a combined board dashboard plus academic, financial and quality KPI centres. kpi.ts computes them from live data — academicKpis loads all tenant students + all enrollments + GradeStatus, classifies pass/fail, and averages CGPA via computeStandingForStudents over non-withdrawn/dismissed/graduated students; anything with no data source returns the NO_DATA sentinel 'يتطلب مصدر بيانات' rather than a fabricated number.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** These defs currently declare filters: [] — add an optional 'academicSystem' filter and thread it into academicKpis/studentKpis so leadership can view credit-hour vs annual KPIs separately; default all.


**منطق يجب أن يختلف بين النظامين:** Yes and it is currently wrong: avgCgpa averages CGPA across ALL students including annual-program students, who have no meaningful GPA — this silently depresses the institute-wide KPI. Pass/fail classification is also single-scale.


**الوضع الحالي في الكود:** No — kpi.ts has no academicSystem branch and no academicSystemWhere.


### تحليلات استراتيجية — analytical family

**المسار:** `lib/reporting/reports/analytical.ts (student-growth, enrollment-volume-by-year, retake-trend, library-most-borrowed, kpi-trend, marketing-efficiency)`


**الوظيفة والـ workflow:**
Cross-year strategic trends: new-student counts by admission year, enrollment volume per academic year, count of retake registrations (attempt > 1) by year, most-borrowed library books, a KPI time series read from KpiSnapshot via lib/reporting/snapshot.metricTrend, and marketing campaign efficiency.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** student-growth, enrollment-volume-by-year and retake-trend count students/enrollments → add an optional 'academicSystem' filter (they currently declare filters: []). library-most-borrowed and marketing-efficiency have no student dimension worth filtering and should stay unfiltered.


**منطق يجب أن يختلف بين النظامين:** Retake semantics differ (credit-hour course retake vs annual دور ثانٍ / باق للإعادة).


**الوضع الحالي في الكود:** No.


### تحليلات تنبؤية — predictive family

**المسار:** `lib/reporting/reports/predictive.ts (student-risk, graduation-funnel, early-warning)`


**الوظيفة والـ workflow:**
Rule-based (explicitly not ML) forecasting: student-risk scores active students from CGPA and prior failures and lists the at-risk names (filterable by department/program); graduation-funnel counts applicants → enrolled → continuing → expected graduates; early-warning raises alerts on falling success/achievement and rising dropout.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add 'academicSystem' to student-risk's filters (it already has departmentId/programId) and replace the hardcoded academicSystemWhere('CREDIT_HOURS') with the chosen value; graduation-funnel/early-warning take it as an optional narrowing.


**منطق يجب أن يختلف بين النظامين:** Yes — the risk rule is CGPA-based and only valid for credit hours; the annual risk signal is percentage/عدد مواد التخلفات. Graduation-funnel's 'expected graduates' also computes differently per system.


**الوضع الحالي في الكود:** Partially and by exclusion: student-risk hardcodes academicSystemWhere('CREDIT_HOURS') (line 21) so annual students are never flagged at all; graduation-funnel and early-warning apply nothing.


### بيانات الحالة وكشوف النتائج — transcripts family

**المسار:** `lib/reporting/reports/transcripts.ts (student-transcript, graduates-batch, level-result-sheet, graduates-result-sheet)`


**الوظيفة والـ workflow:**
The credit-hour result-sheet suite. student-transcript (requires studentCode) loads the student with program.academicSystem and department and builds a term-by-term كشف درجات with semester GPA, CGPA and earned hours (meta.transcript). graduates-batch lists graduates with CGPA/hours/تقدير and a grade distribution. level-result-sheet (requires level+year+semester) builds a student × course matrix for a level with semester GPA, result and outcome distribution. graduates-result-sheet builds the ministry graduation matrix — final-year courses fully broken into components plus prior years as one total+تقدير per year, CGPA and تقدير التخرج — exported through meta.ministrySheet.matrix for signature.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add 'academicSystem' to the filters of graduates-batch, level-result-sheet and graduates-result-sheet and use it in place of the hardcoded academicSystemWhere('CREDIT_HOURS'); student-transcript should keep resolving from the student's own program (a per-student report should never be filtered, it should branch).


**منطق يجب أن يختلف بين النظامين:** Heavy. This is the most system-sensitive family: GPA/credit-hours everywhere. student-transcript already checks student.program?.academicSystem === 'ANNUAL' (line 85) and diverts/errors for annual students, which is the correct branch shape the others lack.


**الوضع الحالي في الكود:** Best in the codebase but still hardcoded: academicSystemWhere('CREDIT_HOURS') is baked into graduates-batch (line 178), level-result-sheet (213) and graduates-result-sheet (342), so annual students are excluded rather than filtered; student-transcript genuinely branches on program.academicSystem.


### النتائج السنوية (النظام العادي) — annual family

**المسار:** `lib/reporting/reports/annual.ts (annual-result-sheet, annual-second-round, annual-repeaters, annual-transcript)`


**الوظيفة والـ workflow:**
The ANNUAL mirror of the transcripts family. annual-result-sheet (requires level+academicYear) builds the فرقة matrix of student × subject percentages with التقدير and النتيجة, exported in the ministry matrix format for signature; annual-second-round lists students with a دور ثانٍ and the subjects they must retake; annual-repeaters lists الباقون للإعادة (over the تخلفات limit); annual-transcript (requires studentCode) shows a student's subjects, percentages, تقدير and yearly result across years.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** By definition this family is already system-scoped, so the shared 'academicSystem' filter should be pinned/disabled to ANNUAL here rather than offered — or offered but defaulted and locked to ANNUAL so a user cannot ask for credit-hour rows from an annual sheet.


**منطق يجب أن يختلف بين النظامين:** Entirely annual: percentages, تقدير bands, منقول / له دور ثانٍ / باقٍ للإعادة, تخلفات limit — no GPA, no credit hours.


**الوضع الحالي في الكود:** Yes — the only fully system-aware family. It ANDs academicSystemWhere('ANNUAL') into every roster (lines 33, 152) and annual-transcript explicitly rejects a student whose program.academicSystem !== 'ANNUAL' (line 124).


### الموارد البشرية — hr family

**المسار:** `lib/reporting/reports/hr.ts (hr-staff-list, hr-staff-by-department, hr-new-hires, hr-attendance-summary, hr-leave-balances, hr-payroll-latest, hr-payroll-by-department, hr-performance-summary, hr-kpi-center)`


**الوظيفة والـ workflow:**
Employee-side reporting under separate permissions (employee/attendance/leave/payroll/performance): staff roster, headcount by administrative department, new hires by hire date, per-employee attendance/absence/lateness over a period, leave balances, the latest payroll run and payroll cost by department, latest performance appraisal per employee, and an HR KPI centre.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** n/a — correctly has no academicSystem logic.


### تنبؤات الموارد البشرية — hr-predictive family

**المسار:** `lib/reporting/reports/hr-predictive.ts (hr-predict-attrition, hr-predict-absence, hr-predict-retirement, hr-predict-payroll-cost)`


**الوظيفة والـ workflow:**
Rule-based HR forecasting: attrition risk scored from absence, penalties, contract expiry proximity and last appraisal; employees most prone to absence over the last 90 days; employees approaching the retirement age computed from date of birth; and a payroll-cost projection extrapolated from the latest payroll run.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** n/a.


### سجل التدقيق — audit family

**المسار:** `lib/reporting/reports/audit.ts (audit-log)`


**الوظيفة والـ workflow:**
Single report over the audit trail: user, timestamp, device, action type, filterable by date range and status. Operational security/traceability, not academic data.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (rows are user actions, not student records)


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** n/a.


### KPI engine & nightly snapshots

**المسار:** `lib/reporting/kpi.ts, lib/reporting/snapshot.ts`


**الوظيفة والـ workflow:**
kpi.ts computes academic/student/financial KPIs (total students, pass/fail rate, average CGPA, retention, dropout, graduation rate, revenue, expense, collection rate) with a NO_DATA sentinel for unbacked metrics. snapshot.ts captures ten headline metrics per tenant into KpiSnapshot keyed by (metric, dimension='', period=YYYY-MM-DD) via findFirst+update/create (idempotent per day, because the compound unique has a nullable universityId); captureAllTenants iterates University rows (or a single null-tenant row); metricTrend returns the ascending series that feeds the analytical kpi-trend report.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Give academicKpis/studentKpis an optional system argument driven by the executive reports' new 'academicSystem' filter; for snapshots, capture each metric twice using the KpiSnapshot.dimension column (dimension='CREDIT_HOURS' / 'ANNUAL' alongside the existing '') so historical trends can be split per system without a schema change.


**منطق يجب أن يختلف بين النظامين:** Yes — cgpa.avg is only meaningful for credit-hour students; pass/fail classification and graduation/retention definitions differ per system, so a single blended number misstates both.


**الوضع الحالي في الكود:** No — neither file references academicSystem; every metric blends both systems.


### Export & ministry-matrix serializers

**المسار:** `lib/reporting/export.ts, lib/reporting/ministry-matrix.ts`


**الوظيفة والـ workflow:**
export.ts turns any ReportResult into CSV (toCsv + csvResponseHeaders) or Excel XML (toExcelXml + excelResponseHeaders) using the result's columns/rows. ministry-matrix.ts defines the export-only ministry matrix payload — deliberately decoupled from the on-screen columns/rows so the screen keeps the web look while «طباعة رسمية» prints the exact وزارة matrix: MinistryCell (component parts + المجموع + التقدير), course columns with their internal mark components, optional leading grouped columns (prior-year totals), trailing summary columns and the grade-scale rows; config comes from lib/ministry-sheet.getMinistrySheetConfig.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a — pure serializers; they render whatever rows the (filtered) runner produced. The filter belongs upstream in the runner, but the CSV/Excel URL must carry the academicSystem param so exports match the screen.


**منطق يجب أن يختلف بين النظامين:** ministry-matrix is explicitly designed for BOTH systems (its header comment states CREDIT_HOURS uses level/graduates with GPA, ANNUAL uses فرقة with %/تقدير and no GPA) — the per-system column set is decided by the calling report, not here.


**الوضع الحالي في الكود:** System-agnostic by design; ministry-matrix.ts is documented as dual-system and needs no change.


---

<a id="finance-accounting"></a>

## المالية والحسابات

*22 موديول · 12 يعرض طلاب · 12 يحتاج فلتر*


### Finance overview / hub (لوحة الشؤون المالية)

**المسار:** `/institute/finance → GET /api/institute/finance`


**الوظيفة والـ workflow:**
Client page fetches one summary endpoint and renders KPI cards (totalDues, collected, remaining, collectionRate, scholarshipsCount/Total), a per-department collection progress list, and a 'recent transactions' table. The API loads EVERY FeeAccount with payments + student + department, reduces totalFees and paid-Payment amounts, buckets by student.department.nameAr, takes the 10 latest paid payments (each row carries the student's Arabic name), and adds ACTIVE Scholarship counts/sums. Guarded by permission finance.view. Users: finance staff and leadership.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add a «النظام الأكاديمي» Select in the page header next to the export control, bound to a new ?system=CREDIT_HOURS|ANNUAL|all query param on GET /api/institute/finance; in the API translate it into where: { student: { program: { academicSystem } } } on the feeAccount.findMany (and the same on the scholarship query). Default must remain 'all'.


**منطق يجب أن يختلف بين النظامين:** none — display only; money totals are system-agnostic. The only per-system nuance is presentational (credit-hour programs bill per registered hours, annual programs per year) and is not computed here.


**الوضع الحالي في الكود:** No — zero references to academicSystem/resolveStudentSystem anywhere under app/api/institute/finance or the finance pages.


### Billing (الفوترة: invoices, fee structures, receipts, AR aging)

**المسار:** `/institute/finance/billing → /api/institute/finance/invoices, /fee-structures, /receipts, /ar?type=aging|statement, /credit-notes`


**الوظيفة والـ workflow:**
One page with four data sources: (1) invoice list (Invoice + student.studentCode/nameAr, number, issue/due date, status, total/paid/balance, take 300, filterable by ?status); (2) reusable FeeStructure templates (code, nameAr, level, academicYear, line items with VAT) used to issue invoices; (3) Receipts issued against an invoice; (4) AR aging / statement-of-account from lib/finance/billing. POST /invoices resolves a student by studentCode within the university and calls issueInvoice or issueInvoiceFromStructure (which posts to the GL). Credit notes reverse/reduce invoices. Perms: finance.invoice.view/issue, finance.tuition.view/edit, finance.receipt.view/create, finance.report.view.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** A «النظام الأكاديمي» Select on the billing toolbar (alongside the existing status filter) feeding ?system= on GET /api/institute/finance/invoices, /receipts and /ar?type=aging; server side add where.student.program.academicSystem. Fee structures are templates keyed by level/academicYear only — optionally tag them by system, but they carry no student rows.


**منطق يجب أن يختلف بين النظامين:** Potential real branching (not implemented): credit-hour invoices should derive from registered credit hours × rate, annual invoices from a flat yearly fee. Today issueInvoiceFromStructure applies a flat template for both — no per-system computation exists.


**الوضع الحالي في الكود:** No — no academicSystem anywhere in invoices/fee-structures/receipts/ar routes or lib/finance/billing.ts.


### Collection (التحصيل)

**المسار:** `/institute/finance/collection and /institute/accounting/collection → GET/POST /api/institute/finance/collection`


**الوظيفة والـ workflow:**
GET returns the last 50 Payment rows joined account→student→department (student name, code, department, amount, method, receipt, status, date), stats (totalPayments, collected, pending), a per-department breakdown computed over ALL FeeAccounts (distinct students, totalFees, collected, pending, rate), and a payment-method breakdown. POST records a manual payment: finds student by studentCode, upserts their FeeAccount, creates a Payment, then calls releaseFinancialHoldsIfPaid to lift financial holds. Perms finance.collection.view/.edit. Two UIs consume it (finance collection screen with payment-entry form, accounting collection screen).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add the «النظام الأكاديمي» Select above the recent-payments table on BOTH pages, bound to ?system= on GET /api/institute/finance/collection; apply to the payment query (payment.account.student.program.academicSystem) and to the FeeAccount loop building departmentStats. Never applied to the POST path.


**منطق يجب أن يختلف بين النظامين:** none — display only; receipting and hold release are identical for both systems.


**الوضع الحالي في الكود:** No — the route has no system awareness; the page's only Select is payment method.


### Installments (الأقساط)

**المسار:** `/institute/finance/installments → GET /api/institute/finance/installments`


**الوظيفة والـ workflow:**
Derives an installment plan per FeeAccount: student name + code, totalFees, planned installments count, paid installments (count of paid Payments), paid/remaining, next due date (earliest unpaid Payment.dueDate) and a مكتمل/جاري status; plus aggregate stats (total/completed/active plans, outstanding). Read-only list for the collections officer. Perm finance.installment.view.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** «النظام الأكاديمي» Select in the page filter bar → ?system= on GET /api/institute/finance/installments → where: { student: { program: { academicSystem } } } on feeAccount.findMany.


**منطق يجب أن يختلف بين النظامين:** none — display only (installment schedules are a finance construct, not academic).


**الوضع الحالي في الكود:** No.


### Scholarships & exemptions (المنح والإعفاءات)

**المسار:** `/institute/finance/scholarships → GET/POST /api/institute/finance/scholarships`


**الوظيفة والـ workflow:**
Lists every Scholarship joined to its student (name, code, type, amount, percentage, academicYear, reason, status) with stats (total, active, totalAmount). POST grants a scholarship/exemption: resolves the student by studentCode and creates a Scholarship row. Perms finance.scholarship.view/.approve.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** «النظام الأكاديمي» Select next to the status/type filters → ?system= on GET → where: { student: { program: { academicSystem } } } on scholarship.findMany.


**منطق يجب أن يختلف بين النظامين:** Merit scholarships are normally awarded on academic standing, which IS system-specific (CGPA thresholds for credit-hours vs percentage/تقدير for annual). Today nothing here reads standing — amount/percentage are entered manually — so it stays display-only unless eligibility automation is added.


**الوضع الحالي في الكود:** No.


### Electronic payments gateway (الدفع الإلكتروني)

**المسار:** `/institute/finance/payments → GET /api/institute/finance/payments, POST /api/institute/finance/payments/checkout (lib/finance/payments/paymob.ts, provider.ts)`


**الوظيفة والـ workflow:**
Shows gateway configuration status (Paymob/Fawry), the last 50 PaymentIntents, last 50 PaymentTransactions and last 20 WebhookEvents. Checkout creates a PaymentIntent (idempotencyKey, providerRef, checkoutUrl); a signed webhook confirms it and auto-creates a Receipt. PaymentIntent carries studentId and invoiceId, though the current GET projects raw rows without joining the student. Perm finance.payment.view.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Once the intent list joins the student (PaymentIntent.studentId exists): add «النظام الأكاديمي» to the intents/transactions filter row → ?system= on GET /api/institute/finance/payments → where: { student: { program: { academicSystem } } }. Raw webhook events stay unfiltered.


**منطق يجب أن يختلف بين النظامين:** none — display only; gateway flow is identical.


**الوضع الحالي في الكود:** No.


### Student statement of account / AR aging (كشف حساب الطالب — أعمار الديون)

**المسار:** `GET /api/institute/finance/ar?type=aging|statement&studentCode= (surfaced inside the billing page)`


**الوظيفة والـ workflow:**
type=statement resolves one student by studentCode within the university and returns statementOfAccount(uni, studentId) — a chronological invoice/receipt/credit-note ledger with running balance. type=aging returns arAging(uni), receivables aging buckets across all students. Perm finance.report.view.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Aging: add ?system= and apply it inside lib/finance/billing.arAging where it selects invoices/students, exposed as a Select above the aging table. Statement: inherently single-student so no filter — but it should DISPLAY the student's academic system as a label.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No.


### Finance reports (التقارير المالية)

**المسار:** `/institute/finance/reports → GET /api/institute/finance/reports`


**الوظيفة والـ workflow:**
Summary cards (totalDues/collected/remaining/collectionRate over all FeeAccounts), a real 6-month collection time series bucketed from paid Payment.paidAt/createdAt, a dataAsOf timestamp derived from the latest paid payment / scholarship update, and a code-defined list of four report definitions (collection, overdue, scholarships, finance) linking into /api/institute/reports. Perm finance.report.view.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** «النظام الأكاديمي» Select in the reports filter bar → ?system= on GET /api/institute/finance/reports, applied to the feeAccount.findMany feeding both KPIs and the monthly series, and forwarded onto the four report hrefs (&system=).


**منطق يجب أن يختلف بين النظامين:** none — display only; the aggregates are money, not grades.


**الوضع الحالي في الكود:** No.


### Report builder (منشئ التقارير المالية)

**المسار:** `/institute/finance/report-builder → GET/POST /api/institute/finance/report-builder`


**الوظيفة والـ workflow:**
A field-picker report designer. GET returns previewData — flat per-student tuition rows (studentCode, student_name, department, level, total_fees, paid_amount, remaining, derived status مكتمل/جزئي/متأخر) from FeeAccount+Payment+Student+Department, optionally narrowed by ?departmentId — plus savedReports read from the Setting row key 'finance.savedReports' (JSON blob). Only source=tuition yields rows today. Note: the page's department Select is HARDCODED (cs/ba/eng/acc) and not wired to departmentId. Perm finance.report.view.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Add «النظام الأكاديمي» to the filter panel beside the department Select, plus a ?system= param on GET /api/institute/finance/report-builder applied as where: { student: { program: { academicSystem } } }; persist the chosen system into the saved-report definition so it reruns with the same scope, and offer «النظام» as a pickable column.


**منطق يجب أن يختلف بين النظامين:** none — display only, but the `level` column means different things per system (credit-hour level vs annual year), so a system column/label prevents mixing.


**الوضع الحالي في الكود:** No.


### CFO dashboard (لوحة المدير المالي)

**المسار:** `/institute/finance/cfo-dashboard → GET /api/institute/finance/cfo-dashboard`


**الوظيفة والـ workflow:**
Executive overview built from existing models: revenue = paid Payments across all FeeAccounts; expenses = completed Payroll netSalary; profit = revenue − expenses; collectionRate; revenue-by-department (amount + distinct student count + % share); year comparison grouped by FeeAccount.academicYear (revenue + distinct students). Deliberately omits budget/target KPIs since no such model backs them. Perm finance.view.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** «النظام الأكاديمي» Select in the dashboard header → ?system= on GET /api/institute/finance/cfo-dashboard, applied to the feeAccount.findMany feeding revenue/department/year blocks. Payroll-derived expenses must stay unfiltered (no student dimension) and the page should say so when a system is selected, otherwise profit becomes misleading.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No.


### Accounting dashboard (لوحة المحاسبة)

**المسار:** `/institute/accounting/dashboard → GET /api/institute/finance`


**الوظيفة والـ workflow:**
A second, accounting-department-facing rendering of the same /api/institute/finance payload: financial stats cards, department revenue breakdown, and the recent-transactions table (each row a student payment).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Same Select + ?system= on GET /api/institute/finance as the finance hub; both consumers should share one filter component.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No.


### Tuition fee configuration (الرسوم الدراسية)

**المسار:** `/institute/accounting/tuition → GET/POST /api/settings?key=… + GET /api/departments`


**الوظيفة والـ workflow:**
Configuration screen (724 lines) storing a JSON blob of tuition rules in the Setting table: per-department fee rows (department chosen from the real /api/departments list) and additional/optional fees (mandatory vs optional), plus a credit-hours calculator (selectedDepartment × selectedCredits) for estimating a bill. IMPORTANT: it already renders a «النظام» Select with values credit/semester ('ساعات معتمدة'/'فصلي'), but that is a free-text label on the fee row saved into Setting JSON, NOT Program.academicSystem, and nothing reads it back for computation.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student rows; it configures fee templates per department. It should however be reconciled with the real dual system: replace the ad-hoc credit/فصلي label with the real CREDIT_HOURS|ANNUAL enum and key fee rules off program academicSystem.


**منطق يجب أن يختلف بين النظامين:** Yes — real branching belongs here: credit-hour pricing = rate × registered hours (the calculator already assumes this); annual pricing = flat yearly fee. Today only the credit-hour calculator exists and the system label is decorative.


**الوضع الحالي في الكود:** Partially/misleadingly — a local credit/semester string lives in the Setting JSON but never touches Program.academicSystem or lib/academic-system.ts.


### Financial statements (القوائم المالية)

**المسار:** `/institute/finance/statements → GET /api/institute/finance/statements?type=trial-balance|income-statement|balance-sheet|cash-flow&from&to (lib/finance/statements.ts)`


**الوظيفة والـ workflow:**
Renders the four core statements computed from POSTED journal lines only, over an optional date range, scoped to the university. Pure back-office accounting output. Perm finance.report.view.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension; rows are GL accounts.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** n/a — no student dimension.


### General ledger / chart of accounts / fiscal periods (الأستاذ العام)

**المسار:** `/institute/finance/gl → /api/institute/finance/gl/accounts, /gl/journal, /gl/journal/[id]/post, /gl/journal/[id]/reverse, /periods, /periods/[id]/close (lib/finance/ledger.ts, coa.ts, periods.ts, posting-rules.ts)`


**الوظيفة والـ workflow:**
Chart-of-accounts tree (with seed-default), journal-entry draft creation with balanced debit/credit validation (ledger.ts throws unless debits==credits and amount non-zero), posting and reversal of entries, fiscal-year creation and period close/reopen. The accounting backbone every other finance module posts into.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** n/a — no student dimension.


### Accounts payable — vendors, bills, expense claims (الموردون والمصروفات)

**المسار:** `/institute/finance/ap → /api/institute/finance/ap/vendors, /ap/bills, /ap/bills/[id], /ap/expenses (lib/finance/ap.ts, approvals.ts)`


**الوظيفة والـ workflow:**
Vendor master (code, Arabic name, withholding rate), vendor bills with line items and account codes plus approve/pay actions that post to the GL, and employee expense claims with approve/reject decisions that trigger disbursement.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** n/a — no student dimension.


### Payroll (الرواتب)

**المسار:** `/institute/finance/payroll → /api/institute/finance/payroll/employees, /components, /runs, /runs/[id] (lib/finance/payroll.ts)`


**الوظيفة والـ workflow:**
Employee master (with an import-instructors action pulling teaching staff in), salary components (seed-default), monthly PayRun creation optionally tagged with costCenterId/branchId, payslip listing per run (employee, gross, tax, insurance, net) and approve/pay actions posting payroll journals. Perms payroll.view / payroll.run.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — employees, not students.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** n/a — no student dimension.


### Treasury (الخزينة)

**المسار:** `/institute/finance/treasury → GET/POST /api/institute/finance/treasury (lib/finance/treasury.ts)`


**الوظيفة والـ workflow:**
Lists cash/bank GL accounts (postable accounts whose code starts with '12') with computed balances, recent FundTransfers between accounts, and BankReconciliation rows (statement balance vs GL balance vs difference). POST performs a fund transfer or a reconciliation. Perms banking.view / banking.edit / banking.reconciliation.edit.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** n/a — no student dimension.


### Banking dashboard (البنوك)

**المسار:** `/institute/banking/dashboard → GET /api/institute/banking`


**الوظيفة والـ workflow:**
Feature-gated (requireFeature 'finance.banking') plus banking.view. Lists BankAccounts (bank name, account no, type, balance, last updated) and the 20 latest BankTransactions with credit/debit stats and total balance.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** n/a — no student dimension.


### Cost centres & branches (مراكز التكلفة والفروع)

**المسار:** `/institute/finance/cost-centers → /api/institute/finance/cost-centers, /api/institute/finance/branches (lib/finance/profitability.ts)`


**الوظيفة والـ workflow:**
ClientR4 profitability dimension: CRUD for CostCenters (code, Arabic/English name, type ACADEMIC|ADMIN|OPERATIONAL|BRANCH, optional parent, optional links to branch / program / faculty) plus branch CRUD, active/inactive toggles and audit writes. Perms finance.costcenter.view/.edit.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student rows. Note: because a centre can link to a Program, profitability roll-ups could optionally group by that program's academicSystem, but the centre list itself needs no filter.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** No — links to Program but never reads Program.academicSystem.


### Budgets (الموازنات)

**المسار:** `/api/institute/finance/budgets, /budgets/[id] (lib/finance/budget.ts) — no dedicated page; consumed by finance screens`


**الوظيفة والـ workflow:**
Budget headers (name, fiscalCode, status DRAFT|ACTIVE) with BudgetLines, used for budget-vs-actual comparison against GL activity.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** n/a — no student dimension.


### Tax rates (الضرائب)

**المسار:** `/api/institute/finance/tax/rates`


**الوظيفة والـ workflow:**
VAT/withholding rate table used by invoice and vendor-bill line calculations.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** n/a — no student dimension.


### E-invoicing / ETA (الفاتورة الإلكترونية)

**المسار:** `/institute/finance/einvoice → GET/POST /api/institute/finance/einvoice, /einvoice/[id] (lib/finance/eta/client.ts, document.ts, sign.ts)`


**الوظيفة والـ workflow:**
Shows ETA configuration status, the last 100 EInvoiceDocuments (internalId, sourceType, status, uuid, net/vat/total) and a 'buildable' list of ISSUED/PARTIAL/PAID Invoices not yet converted — each buildable row displays the STUDENT's Arabic name. POST builds an ETA document from an invoice; [id] handles sign/submit. Perms finance.einvoice.view/.create. Inert until ETA credentials exist.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Low priority but consistent: «النظام الأكاديمي» Select above the 'buildable invoices' table → ?system= on GET /api/institute/finance/einvoice applied to the invoice.findMany (where.student.program.academicSystem). The submitted-documents table has no student join and stays unfiltered.


**منطق يجب أن يختلف بين النظامين:** none — display only; ETA payloads are identical.


**الوضع الحالي في الكود:** No.


---

<a id="faculty-teaching"></a>

## هيئة التدريس وبوابة عضو هيئة التدريس

*16 موديول · 9 يعرض طلاب · 9 يحتاج فلتر*


### إدارة أعضاء هيئة التدريس (Institute Faculty Registry)

**المسار:** `/institute/faculty · GET/POST/PATCH /api/institute/faculty`


**الوظيفة والـ workflow:**
Institute-side HR-ish registry of Instructor records. GET (guarded by permission hr.staff.view) lists prisma.instructor with department + _count.courses, supports ?search= (name/email contains, insensitive) and ?departmentId=; the page (app/(institute)/institute/faculty/page.tsx) fetches /api/institute/faculty with no params and filters client-side, shows cards/table of name, title, email, phone, department, specialization, course count. POST/PATCH (hr.staff.edit) create/update an instructor. Used by academic administration to maintain teaching staff.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (instructors only; the course count is not per-student)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference anywhere in the route or page.


### العبء التدريسي (Faculty Workload)

**المسار:** `/institute/faculty/workload · GET /api/institute/faculty/workload`


**الوظيفة والـ workflow:**
Teaching-load report. Loads every instructor with department and courses (+ _count.enrollments per course), computes creditHours = sum of course.creditHours, maxHours from a title heuristic (معيد 8 / مساعد 14 / مدرس 16 / else 12), students = sum of enrollment counts, plus stats totalHours/avgLoad/facultyCount/coveragePct. Permission workload.view. Page renders a per-instructor load table with over/under-load colouring.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: a «النظام الأكاديمي» select (الكل / ساعات معتمدة / سنوي) next to the department/search controls; API: new ?system= param narrowing the course→enrollment counting to enrollments whose student.program.academicSystem matches (and optionally courses whose study-plan programs match). It counts aggregated STUDENT numbers, so the count must be filterable; default must remain 'all'.


**منطق يجب أن يختلف بين النظامين:** Credit-hour load is genuinely creditHours-based; an ANNUAL program has no meaningful credit-hour load — for annual courses the load ceiling/hours metric is weekly-hours/course-count, not credit hours. If annual programs are in scope this report's hours column is misleading and needs a per-system computation branch.


**الوضع الحالي في الكود:** No — no academicSystem resolution; treats all credit hours uniformly.


### جداول المحاضرات (Faculty Schedules Grid)

**المسار:** `/institute/faculty/schedules · GET /api/institute/faculty/schedules`


**الوظيفة والـ workflow:**
Builds a day × time-slot lecture grid from prisma.lecture (no relations): days derived from distinct lecture.day sorted by a fixed Arabic day order, timeSlots from distinct `start-end`, schedule[day][slot] = {course, room, instructor}. Permission workload.view. Read-only administrative timetable view.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (Lecture rows carry course/room/instructor strings only, no student or program link)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No.


### الساعات المكتبية (Institute-wide Office Hours)

**المسار:** `/institute/faculty/office-hours · GET /api/institute/faculty/office-hours`


**الوظيفة والـ workflow:**
Lists all OfficeHoursSlot rows with instructor + department; returns name, department, day, time range, office/location, type, available(active) and stats total/active. Permission hr.staff.view. Admin oversight of staff availability.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (slots only; bookings/appointments are not returned by this admin endpoint)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No.


### لوحة وكيل الكلية (Faculty-Admin Dashboard)

**المسار:** `/institute/faculty-admin/dashboard · GET /api/institute/faculty-admin/dashboard`


**الوظيفة والـ workflow:**
College-vice-dean overview. Permission institute.dashboard.view; every query wrapped in scopedWhere(ctx) for tenant/faculty scoping. Returns counts of active departments, students, instructors, courses, plus per-department cards with _count.students and _count.instructors.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: a «النظام الأكاديمي» select in the dashboard header; API: ?system= applied to the student count and to department._count.students (via program.academicSystem on Student.program). Instructor/course/department counts stay unfiltered. Default 'all'.


**منطق يجب أن يختلف بين النظامين:** none — pure counting, but the counted population differs per system when filtered.


**الوضع الحالي في الكود:** No academicSystem handling; counts all students together.


### لوحة عضو هيئة التدريس (Faculty Portal Dashboard)

**المسار:** `/faculty/dashboard · GET /api/faculty/dashboard`


**الوظيفة والـ workflow:**
Per-instructor at-a-glance, identity via resolveInstructor() (lib/student). Loads the instructor's courses with enrollments+students, builds a distinct student map (stats.students), counts ungraded enrollments (final == null), counts publications, and finds today's Lecture rows (matching instructor name OR course nameAr) sorted by start time. Returns stats {courses, students, ungraded, publications}, todaySchedule, and recentStudents (first 5 name+studentCode).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page header select «النظام الأكاديمي»; API ?system= narrowing the enrollment/student aggregation (student.program.academicSystem) for stats.students, ungraded and recentStudents. Default 'all' so an instructor teaching both systems sees everything.


**منطق يجب أن يختلف بين النظامين:** 'ungraded' is system-neutral (final component missing) — display only; no per-system computation required beyond the population filter.


**الوضع الحالي في الكود:** No — no academicSystem awareness.


### مقرراتي (Faculty Courses)

**المسار:** `/faculty/courses · GET /api/faculty/courses`


**الوظيفة والـ workflow:**
Lists courses where course.instructorId = the resolved instructor, with _count of enrollments and assignments; page shows cards per course with code, Arabic/English name, credit hours, student count, assignment count and links into grades.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page toolbar «النظام الأكاديمي» select; API ?system= applied to the enrollments _count (count only enrollments whose student's program matches). Courses themselves have no system (they belong to departments), so the filter narrows the student counts, not the course list. Default 'all'.


**منطق يجب أن يختلف بين النظامين:** creditHours is displayed for every course; for a course delivered inside an ANNUAL program that number is not the governing unit — label/derivation may need a per-program branch if shown as workload.


**الوضع الحالي في الكود:** No.


### طلابي (Faculty Students Roster)

**المسار:** `/faculty/students · GET /api/faculty/students`


**الوظيفة والـ workflow:**
Distinct students enrolled in any course taught by the instructor. API loads enrollments where course.instructorId = instructor, groups by student into rows {id, studentCode, name, level, gpa, courses[]} sorted by studentCode. Page has a text search box, a stat tile «طلاب يحتاجون متابعة» computed as students with gpa < 2.0, and a student table.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: «النظام الأكاديمي» select beside the existing search input; API: ?system= on the enrollment query filtering student.program.academicSystem. Default 'all'.


**منطق يجب أن يختلف بين النظامين:** CRITICAL — the row shows Student.gpa and the at-risk tile hardcodes gpa < 2.0. For ANNUAL students GPA is meaningless; the column must become النسبة المئوية/التقدير and at-risk must come from the annual result (باقٍ للإعادة / له دور ثانٍ) via lib/annual, exactly as /api/faculty/advisees already does.


**الوضع الحالي في الكود:** No — treats every student as credit-hours (raw student.gpa, 2.0 threshold).


### رصد الدرجات (Faculty Grade Entry)

**المسار:** `/faculty/grades · GET+PATCH /api/faculty/grades`


**الوظيفة والـ workflow:**
Course-scoped grade sheet. GET ?courseId= (defaults to the instructor's first course by code) verifies ownership (course.instructorId), returns course component maxima (midtermMax/finalMax/practicalMax/homeworkMax) and a roster of enrollments with midterm/final/practical/homework, letterGrade, gradeStatusCode + Arabic status name from GradeStatus. PATCH writes one enrollment's four components through the shared setEnrollmentResult() in lib/gpa, which resolves letter grade, board-fail status, points and recomputes CGPA; the student portal then reads the same row. Page edits cells inline, shows totals against the sum of maxima.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: «النظام الأكاديمي» select alongside the course picker — it narrows the roster (and can narrow the course dropdown to courses whose enrolled students are of the chosen system); API: ?system= on the enrollment query for the roster. Default 'all' — never hide a student from grade entry by default.


**منطق يجب أن يختلف بين النظامين:** CRITICAL — the response surfaces letterGrade (A/B/C…) and setEnrollmentResult applies credit-hour letter/points/CGPA logic. ANNUAL enrollments must resolve to نسبة مئوية + تقدير (ممتاز/جيد جداً/…) and feed the annual result engine (منقول/له دور ثانٍ/باقٍ للإعادة), not GPA points. The write path must branch on resolveStudentSystem before choosing the grading resolver, and the sheet header must label the column accordingly.


**الوضع الحالي في الكود:** No — no academicSystem branch in the route; entirely credit-hour grading through lib/gpa.


### الإرشاد الأكاديمي — المرشدون (Faculty Advisees)

**المسار:** `/faculty/advisees · GET /api/faculty/advisees`


**الوظيفة والـ workflow:**
The advisor workbench. List mode: students where advisorId = advisor, joined with each student's program.academicSystem; pulls the current-term RegistrationRequest (hardcoded DEFAULT_TERM 2024-2025/second) and, for annual advisees, batch computeAnnualForStudents() against getAcademicYears().current; credit advisees get computeAcademicStanding() per student (N+1 loop). Rows carry either {cgpa, onProbation, escalation, flags} or {result, pct, grade}, plus atRisk and requestStatus; stats total/pending/approved/warnings. Detail mode ?studentCode= returns the student's academic profile: standing (credit only) or annual {result, overallPct, overallGrade, yearGroup}, a transcript grouped by term from Enrollment+Course with GradeStatus names and points, and the current registration request with its section lines. Page renders both, hiding CGPA/hours for annual advisees.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: a «النظام الأكاديمي» select above the advisee table (the row payload already carries `system`, so it can filter client-side today); ideally also API ?system= on the advisee query for large lists. Default 'all'.


**منطق يجب أن يختلف بين النظامين:** Already fully dual: credit → CGPA/probation/escalation via lib/standing; annual → النسبة/التقدير/نتيجة via lib/annual. Remaining gap: the transcript in detail mode is still rendered credit-style (creditHours + points columns) regardless of system, and DEFAULT_TERM is hardcoded.


**الوضع الحالي في الكود:** YES — the only module in this area that resolves academicSystem (getProgramSystem / program.academicSystem) and branches. Missing only the display FILTER.


### اعتماد طلبات التسجيل (Advisor Registration Approvals)

**المسار:** `consumed inside /faculty/advisees · GET+PATCH /api/faculty/registration`


**الوظيفة والـ workflow:**
Advisor decision queue (no page of its own — the advisees page fetches it). GET ?status=Pending lists RegistrationRequests where advisorId = advisor, each with student (code/name/level), its section items (course code/name/creditHours/sectionCode) and a freshly recomputed validateRegistration() summary incl. totalHours. PATCH takes {requestIds[], action: approve|reject|return, note}; approve re-validates and, only if validation.ok, materializes Enrollment rows (upsert to ENROLLED) inside a transaction and stamps the request Approved/decidedAt; reject/return just update status+note.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: the same «النظام الأكاديمي» select on the advisees page should also narrow the pending-requests list; API: ?system= on the RegistrationRequest query via student.program.academicSystem. Default 'all'.


**منطق يجب أن يختلف بين النظامين:** CRITICAL — validateRegistration/totalHours is credit-hour registration logic (min/max load, prerequisites, CGPA-based ceilings). ANNUAL students do not self-register per course/hour: their enrollment set is the year's study plan. Either annual requests must be excluded from this credit validator or a per-system validator branch is needed before approval materializes enrollments.


**الوضع الحالي في الكود:** No — no academicSystem resolution; every request runs the credit-hour validator.


### الساعات المكتبية (Faculty Office Hours)

**المسار:** `/faculty/office-hours · GET/POST/PATCH /api/faculty/office-hours`


**الوظيفة والـ workflow:**
Instructor's own availability. GET returns their OfficeHoursSlot rows (day, start/end, location, type, active, booked count) plus a flattened, date-sorted list of upcoming appointments with the booking student's Arabic name, studentCode, topic, date and status. POST adds a slot (day/start/end required, type defaults in-person). PATCH confirms/cancels one appointment after verifying the appointment's slot belongs to this instructor.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: «النظام الأكاديمي» select above the «المواعيد القادمة» appointments list only (not the slots list); API: ?system= filtering appointments by student.program.academicSystem. Default 'all' — optional narrowing only.


**منطق يجب أن يختلف بين النظامين:** none — display only (appointments have no academic computation)


**الوضع الحالي في الكود:** No.


### الجدول الدراسي (Faculty Schedule)

**المسار:** `/faculty/schedule · GET /api/faculty/schedule`


**الوظيفة والـ workflow:**
The instructor's weekly teaching timetable. Collects the Arabic names of their courses, loads Lecture rows matching instructor name OR course nameAr, buckets them into a fixed 5-day week (الأحد..الخميس), sorts each day by start minute and numbers periods. Read-only.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (Lecture rows have no student/program link)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No.


### الأبحاث والنشر (Faculty Research)

**المسار:** `/faculty/research (+ /faculty/research/publications) · GET/POST /api/faculty/research`


**الوظيفة والـ workflow:**
Instructor's publication record: lists Publication rows (title, venue, year, type, citations, impactFactor, status) ordered by year desc, with stats total/published/underReview/totalCitations and counts by type; researchProjects is deliberately returned empty (no model). POST adds a publication.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No.


### الرسائل (Faculty Messages)

**المسار:** `/faculty/messages · GET /api/messages (shared)`


**الوظيفة والـ workflow:**
Inbox UI in the faculty portal reading the shared /api/messages endpoint: message rows {from, role, subject, body, read, date}, with search, selection, reply textarea and inbox/sent tabs. Not a faculty-specific API.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension in the message payload (sender is a free-text name/role, not a Student relation)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No.


### إعدادات عضو هيئة التدريس (Faculty Settings)

**المسار:** `/faculty/settings · GET/POST /api/settings?key=faculty.preferences`


**الوظيفة والـ workflow:**
Per-portal preference form (notification toggles etc.) persisted as a Setting row under key faculty.preferences via the shared settings API.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No.


---

<a id="student-parent-portals"></a>

## بوابة الطالب وولي الأمر

*21 موديول · 19 يعرض طلاب · 5 يحتاج فلتر*


### بوابة الطالب — لوحة المتابعة (Student Dashboard)

**المسار:** `app/(student)/student/dashboard/page.tsx + app/api/student/dashboard/route.ts`


**الوظيفة والـ workflow:**
Single-student 'my day at a glance'. resolveStudent() (lib/student.ts) maps the NextAuth session to exactly one Student row (strict in production; studentCode param / DEMO_STUDENT_CODE '2024-105' fallback only when NODE_ENV!=='production' or ALLOW_DEMO_FALLBACK=1). The API loads that student's Attendance rows, AssignmentSubmission (+assignment+course), and the newest Schedule for their departmentId, then derives: attendance % (present+late)/total, completed/total assignments, today's lectures with live completed/current/upcoming status by clock minutes, 3 soonest pending assignments, 3 most recent graded submissions, and synthetic notifications (no notifications table). ClientR5 hold: scopeBlock(student.id,'blockResult') empties recentGrades and strips grade notifications, returning resultHeld+holdMessage.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — the page is scoped to exactly ONE student (the viewer). A display filter is meaningless; what it needs instead is per-student BRANCHING (see systemLogic).


**منطق يجب أن يختلف بين النظامين:** Yes — the stats card renders `stats.gpa` labelled «المعدل التراكمي» from the raw Student.gpa column, unconditionally. For an ANNUAL-program student that number is meaningless/false; it must be replaced by النسبة المئوية + التقدير + نتيجة العام (منقول/له دور ثانٍ/باقٍ للإعادة) exactly as /api/student/grades and /api/student/standing already do. The API should return `system` (resolveStudentSystem) and an annual payload via computeAnnualForStudents.


**الوضع الحالي في الكود:** NO — the dashboard route imports neither academic-system nor annual; it never calls resolveStudentSystem. It reads Student.gpa directly. This is the single clearest dual-system defect in the student portal.


### بوابة الطالب — الدرجات والنتائج (Student Grades)

**المسار:** `app/(student)/student/grades/page.tsx + app/api/student/grades/route.ts`


**الوظيفة والـ workflow:**
The student's term result sheet. Loads Enrollment rows for (studentId, academicYear, semester) with course, plus all GradeStatus rows; builds a per-subject breakdown (midterm/final/practical/homework vs course maxima, percentage, letterGrade, gradeStatusCode + Arabic status name, affectsGpa = status.affectsGpa && course.countsInGpa, isPass), a derived trend (subject vs the student's own average), and two exam rollups (منتصف الفصل / نهاية الفصل). Then it computes cumulative stats + a class rank. UI has three tabs: درجات المواد / نتائج الاختبارات / الشهادات (the certificates tab is currently static placeholder buttons — شهادة نصف العام / شهادة نهاية العام — with no backing data). ClientR5: a blockResult hold short-circuits to {held:true, holdMessage, subjects:[], stats:null}.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — one student only. The system is resolved from the viewer's own program, not chosen by them. (If an admin 'view as student' path is ever added, the system would come from the impersonated student, still not a filter.)


**منطق يجب أن يختلف بين النظامين:** Yes, and it is the reference implementation. ANNUAL branch: no CGPA — getAcademicYears().current + computeAnnualForStudents gives result/overallPct/overallGrade; rank is computed among ANNUAL peers in the same departmentId AND same level (الفرقة), ordered by overallPct. CREDIT_HOURS branch: computeStanding() gives cgpa/earnedHours/gpaHours; rank among ACTIVE peers in the department filtered by academicSystemWhere('CREDIT_HOURS'), ordered by gpa desc. `system` is returned in the payload and the page switches the first stat card on data.system === 'ANNUAL'.


**الوضع الحالي في الكود:** YES — fully branched, both API and UI. Imports resolveStudentSystem, computeAnnualForStudents, academicSystemWhere. Gap: the الشهادات tab is system-blind static markup; a real certificate would need CGPA vs نسبة/تقدير wording.


### بوابة الطالب — الحالة الأكاديمية (Student Standing API, no dedicated page)

**المسار:** `app/api/student/standing/route.ts (consumed by portal components; no /student/standing page exists)`


**الوظيفة والـ workflow:**
Returns the viewer's own academic standing: probation/warnings, honor roll, promotion and graduation progress via computeAcademicStanding. Hold-aware: a blockResult hold returns {held:true, standing:null} because CGPA would reveal the withheld result.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — single student; the system is resolved from their program.


**منطق يجب أن يختلف بين النظامين:** Yes — already implemented. For ANNUAL it deliberately returns standing:null plus an `annual` object {result, overallPct, overallGrade, yearGroup} from computeAnnualForStudents, with the explicit comment that the portal must never show an annual student a false CGPA-probation badge. CREDIT_HOURS returns the full computeAcademicStanding payload.


**الوضع الحالي في الكود:** YES — branches on resolveStudentSystem and returns `system` in the response.


### بوابة الطالب — تسجيل المقررات (Course Registration)

**المسار:** `app/(student)/student/registration/page.tsx + app/api/student/registration/route.ts`


**الوظيفة والـ workflow:**
Credit-hour self-registration workflow. GET returns the CourseOffering catalog for (academicYear, semester) with sections (instructor, day, startMin/endMin, room, capacity, taken count), the student's existing RegistrationRequest + items, the set of already-passed courseIds (Enrollment.gradeStatusCode ∈ passing GradeStatus codes), computeAcademicStanding (cgpa, onProbation, hourCap), a live validateRegistration() preview and any ClientR5 blockRegistration hold. POST (action = save | submit | cancel) upserts the request, replaces RegistrationItems in a transaction, refuses to touch an Approved request, sets Draft on save and Pending on submit only when validation.ok; cancel is allowed even under a hold, save/submit return 403 held. UI sums selected creditHours and shows «{n} ساعات».


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — single student. What is needed is a system GATE, not a filter.


**منطق يجب أن يختلف بين النظامين:** Yes, and it is MISSING. The whole module is credit-hours-native: hour caps, prerequisites, section picking, «ساعات» totals. An ANNUAL-program student does not self-register per course — their courses come from the study plan of their فرقة. This route should resolve the student's system and, for ANNUAL, either hide the module entirely or serve the fixed year course list read-only, instead of offering an hour-capped basket. computeAcademicStanding (a CGPA/probation engine) is also called unconditionally, so an annual student gets a CGPA hour cap that has no meaning for them.


**الوضع الحالي في الكود:** NO — no import of lib/academic-system anywhere in the route or the page. Only the ClientR5 hold branches.


### بوابة الطالب — الجدول الدراسي (Weekly Schedule)

**المسار:** `app/(student)/student/schedule/page.tsx + app/api/student/schedule/route.ts`


**الوظيفة والـ workflow:**
Weekly timetable. Takes the newest Schedule row for the student's departmentId, groups its Lecture rows into the five-day map (الأحد…الخميس), sorts each day by start time and numbers the periods. Returns empty when the student has no department. Pure display — no grading, no writes.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — single student, and the schedule is per-department. (Note: the schedule is keyed on departmentId, not on program, so a department hosting both a credit and an annual program serves both the same timetable — a data-modelling issue, not a filter issue.)


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** NO — no academicSystem awareness (and none required for the display itself).


### بوابة الطالب — الحضور والغياب (Attendance)

**المسار:** `app/(student)/student/attendance/page.tsx + app/api/student/attendance/route.ts`


**الوظيفة والـ workflow:**
The student's own attendance record: all Attendance rows for studentId, newest first. Returns the most recent 8 records (date, Arabic day name, status, note), overall counters (present/absent/late/total) and a per-month summary bucketed by year-month with a percentage. Attendance rate counts present+late as attended throughout.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — single student's own record.


**منطق يجب أن يختلف بين النظامين:** none for the percentage itself — but attendance-based حرمان (exclusion from the exam) thresholds differ between the two bylaws in principle; today nothing computes حرمان here at all, so: display only.


**الوضع الحالي في الكود:** NO — no academicSystem reference.


### بوابة الطالب — الواجبات (Assignments)

**المسار:** `app/(student)/student/assignments/page.tsx + app/api/student/assignments/route.ts`


**الوظيفة والـ workflow:**
Lists the student's AssignmentSubmission rows joined to Assignment+Course, ordered by dueDate desc: title, subject, instructor, dueDate, status (pending/submitted/graded/late), grade vs maxGrade. Stats block counts each status and computes averageGrade as the mean of grade/maxGrade percentages over graded submissions.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — single student.


**منطق يجب أن يختلف بين النظامين:** none — display only; the average is a raw percentage of assignment marks, identical under both bylaws and not fed into GPA here.


**الوضع الحالي في الكود:** NO — no academicSystem reference (and none needed).


### بوابة الطالب — التعلم الإلكتروني (E-Learning / LMS)

**المسار:** `app/(student)/student/elearning/page.tsx + app/api/student/elearning/route.ts`


**الوظيفة والـ workflow:**
Aggregates the student's LMS view: their Enrollments (with course + instructor) become the course cards, LMSContent rows are the lessons with per-student status from LessonProgress (defaults to 'locked'), VirtualClass rows are listed with date/time/status, and ExamSession rows become 'online exams' whose grade is back-filled from the student's Enrollment marks (midterm+final+practical+homework) against the course maxima, marked upcoming/completed by date. Note: LMSContent and VirtualClass are fetched globally, not filtered to the student's courses — lessons/virtual-classes leak across courses.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — single student.


**منطق يجب أن يختلف بين النظامين:** Borderline: the online-exam card shows a raw total/max mark, which is bylaw-neutral. No GPA, no تقدير, no promotion. Treat as display only — but note it bypasses the ClientR5 blockResult hold, so a student whose result is withheld can still read their marks here (a real leak, though not a dual-system one).


**الوضع الحالي في الكود:** NO — no academicSystem reference, and no hold check either.


### بوابة الطالب — المصروفات (Student Fees)

**المسار:** `app/(student)/student/fees/page.tsx + app/api/student/fees/route.ts`


**الوظيفة والـ workflow:**
Per-student financial statement for one academicYear (default 2024-2025). Reads the FeeAccount unique on (studentId, academicYear) with its items and payments; computes paid (sum of status==='paid'), remaining = totalFees - paid, paidInstallments, and the next unpaid due date. Returns feeBreakdown (label/amount) and paymentHistory (date, amount, method, receipt, status). Returns a zeroed shell when the student has no account.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER at the portal level — this is one student's own invoice, not a student list. (The owner's 'Finance must still show everything, optionally narrowable' rule applies to the back-office finance modules, not to this self-service view.)


**منطق يجب أن يختلف بين النظامين:** Potentially yes in future — credit-hour tuition is normally billed per registered credit hour while annual tuition is a flat yearly fee. Today the API computes nothing: it just reads FeeAccount.totalFees and FeeItem amounts that were set elsewhere. So: display only as written.


**الوضع الحالي في الكود:** NO — no academicSystem reference.


### بوابة الطالب — الملف الشخصي (Profile)

**المسار:** `app/(student)/student/profile/page.tsx + app/api/student/profile/route.ts`


**الوظيفة والـ workflow:**
GET returns the student's personal record (studentCode, nameAr/nameEn, email, phone, nationalId, birthDate, address, department nameAr as 'grade', section, enrollment date from enrollYear, lowercased status) plus guardian info split into father/mother from the Guardian rows. PATCH lets the student self-edit only nameAr, nameEn, email, phone, address — identity fields (studentCode, nationalId, gpa, level, status, department) are explicitly not self-serviceable.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — the viewer's own record.


**منطق يجب أن يختلف بين النظامين:** none — display/edit only. Worth adding as a DISPLAY field though: the profile never tells the student which academic system («نظام الساعات المعتمدة» / «النظام السنوي») their program places them under, and it shows department but not program at all.


**الوضع الحالي في الكود:** NO — the route does not even select programId; no academicSystem anywhere.


### بوابة الطالب — نظام التحفيز، الصفحة الرئيسية (Gamification Overview)

**المسار:** `app/(student)/student/gamification/page.tsx + app/api/student/gamification/route.ts`


**الوظيفة والـ workflow:**
Feature-gated by requireFeature('gamification.enabled'). Sums the student's PointsLog into totalPoints, weeklyPoints (7d) and monthlyPoints (30d), derives level = floor(total/500)+1 with currentXP/requiredXP, counts StudentBadge rows, computes a global rank by groupBy over every student's PointsLog totals, and returns the 10 most recent points entries (points, reason, category, date).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER on this page — it is the viewer's own points. (The global rank silently pools credit and annual students together; see leaderboard.)


**منطق يجب أن يختلف بين النظامين:** none — points are bylaw-neutral and never feed GPA or تقدير.


**الوضع الحالي في الكود:** NO — no academicSystem reference.


### بوابة الطالب — الشارات (Gamification Badges)

**المسار:** `app/(student)/student/gamification/badges/page.tsx + app/api/student/gamification/badges/route.ts`


**الوظيفة والـ workflow:**
Feature-gated. Lists every Badge (ordered by threshold) with name/description/icon/category/threshold and an `earned` flag + earnedAt resolved from the student's StudentBadge rows; plus stats {total, earned}.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — the viewer's own badge wall.


**منطق يجب أن يختلف بين النظامين:** none — display only, unless a badge is ever awarded on a GPA threshold (none is today).


**الوضع الحالي في الكود:** NO — no academicSystem reference.


### بوابة الطالب — النقاط (Gamification Points)

**المسار:** `app/(student)/student/gamification/points/page.tsx + app/api/student/gamification/points/route.ts`


**الوظيفة والـ workflow:**
Feature-gated. Breaks the student's PointsLog down by category (grade/attendance/assignment/bonus/general, with Arabic labels), returns the total, the 10 most recent entries, and a hardcoded pointsRules list (تسليم واجب / الحضور +5, متأخر +2 / اجتياز مقرر = half the percentage).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — the viewer's own ledger.


**منطق يجب أن يختلف بين النظامين:** none — display only. The 'اجتياز مقرر = نصف النسبة المئوية' rule is percentage-based and therefore already system-neutral.


**الوضع الحالي في الكود:** NO — no academicSystem reference.


### بوابة الطالب — المكافآت (Gamification Rewards)

**المسار:** `app/(student)/student/gamification/rewards/page.tsx + app/api/student/gamification/rewards/route.ts`


**الوظيفة والـ workflow:**
Feature-gated rewards catalog: every Reward ordered by cost with name/description/icon/cost/stock and a canAfford flag against the student's summed PointsLog total. Read-only — there is no redemption POST.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a as a FILTER — one student's affordability view.


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** NO — no academicSystem reference.


### بوابة الطالب — لوحة المتصدرين (Gamification Leaderboard)

**المسار:** `app/(student)/student/gamification/leaderboard/page.tsx + app/api/student/gamification/leaderboard/route.ts`


**الوظيفة والـ workflow:**
Feature-gated. groupBy over PointsLog sums points per studentId across the WHOLE institute, joins Student for nameAr/studentCode, sorts desc, assigns ranks 1..n and marks isCurrent for the viewer; returns currentRank. This is the one student-portal screen that lists MANY students.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: a «النظام الأكاديمي» Select above the leaderboard table (الكل / ساعات معتمدة / سنوي), defaulting to الكل so nothing is hidden. API: a `system` query param on GET /api/student/gamification/leaderboard, applied by filtering the joined prisma.student.findMany with academicSystemWhere(system) (lib/reporting/filters) and re-ranking the remaining rows. Also note the current findMany has no `status` filter, so withdrawn students appear.


**منطق يجب أن يختلف بين النظامين:** none — points ranking is bylaw-neutral; the filter is purely a display narrowing.


**الوضع الحالي في الكود:** NO — no academicSystem reference; credit and annual students are pooled into one ranking with no way to narrow.


### بوابة ولي الأمر — لوحة المتابعة (Parent Dashboard)

**المسار:** `app/(parent)/parent/dashboard/page.tsx + app/api/parent/dashboard/route.ts`


**الوظيفة والـ workflow:**
resolveParentStudents() (lib/student.ts) walks Guardian.userId → Student for the logged-in parent (demo.parent@sinaiinstitute.test fallback outside production). For each child it loads Attendance, the newest FeeAccount with payments, and the count of ACTIVE StudentWarning rows, then returns per-child {gpa, attendance %, activeWarnings, fees{total,paid,remaining}}, an institute-wide-per-parent feesSummary, and derived notifications (outstanding fees, academic warnings). A parent can have children in DIFFERENT programs and therefore different academic systems.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: a «النظام الأكاديمي» Select in the children-cards header (الكل by default) narrowing which children's cards are shown — genuinely useful only for a parent with children in both systems, so render the control only when the returned children span both systems. API: a `system` query param on GET /api/parent/dashboard filtering the resolveParentStudents() result through resolveStudentSystems(). The far more important fix is per-child branching, below.


**منطق يجب أن يختلف بين النظامين:** Yes, and it is MISSING. Every child card prints the raw `Student.gpa` as المعدل التراكمي. For an ANNUAL child that value is false; the API must call resolveStudentSystems(children ids) once (batch, no N+1) and, for annual children, return النسبة المئوية + التقدير + نتيجة العام from computeAnnualForStudents instead of gpa, tagging each child with its `system` so the card renders the right metric. StudentWarning/probation is likewise a credit-hours concept.


**الوضع الحالي في الكود:** NO — imports only prisma and resolveParentStudents; zero academic-system awareness. It also bypasses the ClientR5 blockResult hold, so a parent sees GPA for a child whose result is withheld from the student.


### بوابة ولي الأمر — متابعة الأبناء (Parent Children)

**المسار:** `app/(parent)/parent/children/page.tsx + app/api/parent/children/route.ts`


**الوظيفة والـ workflow:**
The parent's roster of linked children with a per-child summary: studentCode, nameAr, level, gpa, attendance % (present+late over total), and fee totals from the newest FeeAccount. Near-duplicate of the dashboard query minus warnings/notifications.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: a «النظام الأكاديمي» Select above the children list (الكل default, never hiding by default). API: a `system` query param on GET /api/parent/children applied over resolveStudentSystems() of the linked children. Each child row should also carry a system badge («ساعات معتمدة» / «سنوي») so a mixed-system parent can tell them apart.


**منطق يجب أن يختلف بين النظامين:** Yes — same defect as the dashboard: `gpa: s.gpa` is emitted for every child regardless of program. Annual children need overallPct/overallGrade/result instead of a CGPA. `level` is also displayed with credit-hour semantics rather than الفرقة wording.


**الوضع الحالي في الكود:** NO — no academicSystem reference anywhere in the route or page.


### بوابة ولي الأمر — التقارير (Parent Reports)

**المسار:** `app/(parent)/parent/reports/page.tsx + app/api/parent/reports/route.ts`


**الوظيفة والـ workflow:**
Per-child academic report card. For each linked child it loads graded Enrollments (final not null) with course, all Attendance, and the count of ACTIVE StudentWarning rows; builds a grades table of {subject, total (midterm+final+practical+homework), max (sum of course maxima), letter}, the attendance %, and returns the child's gpa. certificates is deliberately returned as [] (no certificate model yet). The page renders per-child tabs with a download button.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: a «النظام الأكاديمي» Select beside the per-child tab strip (الكل default). API: a `system` query param on GET /api/parent/reports narrowing the resolveParentStudents() set via resolveStudentSystems(). Each report header must also state which system the child sits under, since the summary metric differs.


**منطق يجب أن يختلف بين النظامين:** Yes — the strongest case in the parent portal. The report header shows a CGPA for every child; the per-subject `letter` is the credit-hours letterGrade, whereas an annual child's subject line should read النسبة + التقدير and the report should end with نتيجة العام (منقول / له دور ثانٍ / باقٍ للإعادة) from computeAnnualForStudents, not a GPA. This route is the parent-side twin of /api/student/grades and should reuse the same branch.


**الوضع الحالي في الكود:** NO — imports only prisma and resolveParentStudents; no resolveStudentSystem(s), no computeAnnualForStudents, and no ClientR5 hold check (so a withheld result is still visible to the parent through this report).


### بوابة ولي الأمر — المصروفات (Parent Fees)

**المسار:** `app/(parent)/parent/fees/page.tsx + app/api/parent/fees/route.ts`


**الوظيفة والـ workflow:**
Per-child fee detail for the logged-in parent: for each linked child, the newest FeeAccount with its items and payments — total, paid (status==='paid'), remaining, next unpaid due date, the item breakdown (label/amount) and the payment history (date, amount, method, status).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Optional and low-value, but it does carry a student dimension, so per the owner's rule: a «النظام الأكاديمي» Select above the per-child fee cards, defaulting to الكل so all children's money is always shown, plus a `system` query param on GET /api/parent/fees. Never a default narrowing — this is finance.


**منطق يجب أن يختلف بين النظامين:** none as written — it only reads stored FeeAccount/FeeItem/Payment amounts. (Credit-hour vs annual tuition CALCULATION lives in the finance/billing engines, not here.)


**الوضع الحالي في الكود:** NO — no academicSystem reference.


### بوابة ولي الأمر — التواصل (Parent Messages)

**المسار:** `app/(parent)/parent/messages/page.tsx (no api/parent/messages — it calls the shared /api/messages)`


**الوظيفة والـ workflow:**
Parent inbox and outbound messaging. Fetches the shared cross-role /api/messages endpoint (there is NO parent-specific messages route) and renders the thread list with from/role/subject/body/read/date plus a {total, unread} stat block; has UI for composing a new message and requesting an appointment, with tabs and a recipient Select. Purely message rows keyed to the logged-in user — no grades, no enrollments.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. The rows are messages between users; a «النظام الأكاديمي» filter over an inbox is meaningless. (If the compose form's recipient picker is ever changed to list students, that picker — not the inbox — would be the place for one.)


**منطق يجب أن يختلف بين النظامين:** none — display only.


**الوضع الحالي في الكود:** NO — and correctly so; nothing here depends on the academic system.


### إطار بوابة الطالب / ولي الأمر (Portal shells & identity resolution)

**المسار:** `app/(student)/layout.tsx, app/(parent)/layout.tsx, lib/student.ts (resolveStudent / resolveParentStudents)`


**الوظيفة والـ workflow:**
The two portal chromes: sidebar navigation (student: لوحة المتابعة، ملفي الشخصي، الجدول الدراسي، تسجيل المقررات، الدرجات والنتائج، الحضور والغياب، الواجبات، التعلم الإلكتروني، المصروفات، نظام التحفيز — parent: لوحة المتابعة، متابعة الأبناء، المصروفات، التواصل، التقارير), active-route highlighting, RTL layout. lib/student.ts is the single identity chokepoint: resolveStudent() prefers Student.userId from the session and only falls back to a studentCode param / DEMO_STUDENT_CODE outside production (or with ALLOW_DEMO_FALLBACK=1); resolveParentStudents() maps Guardian.userId → Student[].


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a for the chrome itself — but this is the right place to add a global per-viewer system BADGE (e.g. «النظام السنوي» next to the student's name) and, in the student sidebar, to HIDE «تسجيل المقررات» for an ANNUAL student, since credit-hour self-registration does not exist under the annual bylaw.


**منطق يجب أن يختلف بين النظامين:** Navigation visibility only: تسجيل المقررات is credit-hours-only. lib/student.ts is also the natural place for a resolveStudentWithSystem() helper so every portal route stops re-deriving it (or, worse, not deriving it at all).


**الوضع الحالي في الكود:** NO — neither layout nor lib/student.ts references academicSystem; every nav item is shown to every student regardless of program.


---

<a id="support-modules"></a>

## الموديولز المساندة

*10 موديول · 3 يعرض طلاب · 4 يحتاج فلتر*


### المكتبة (Library)

**المسار:** `/institute/library — API GET /api/institute/library`


**الوظيفة والـ workflow:**
Read-only library dashboard. The API (app/api/institute/library/route.ts) is gated by requireFeature('library.enabled') + requirePermission('library.view'); it loads ALL Book rows (prisma.book.findMany orderBy createdAt desc, no universityId scoping in the query) plus a single count of Borrowing where status in ['borrowed','overdue']. It returns only the newest 8 books (title/author/category/available) and four aggregates (titles, totalCopies, available, activeBorrowings). The page (146 lines) fetches once on mount, renders 4 stat cards (two of which are hardcoded '—': e-books, and it also shows 'إعارات نشطة' from the count) plus a grid of book cards. The 'إضافة كتاب' button and the search Input are decorative — no POST route, no onChange handler, no borrowings list, no return/renew action. So today the library module is books-only in the UI; the only student-facing datum is the aggregate active-borrowings number.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ✅ نعم |


**مكان الفلتر:** Not needed for the CURRENT books-only UI, but the Borrowing model (prisma/schema.prisma:1996) carries studentId — the moment the planned إعارات (borrowings) tab/list exists it becomes student-facing. Placement: a «النظام الأكاديمي» Select in the toolbar next to the search box, applied ONLY to the borrowings view, sending ?system=CREDIT_HOURS|ANNUAL|all to /api/institute/library, where the route joins Borrowing.studentId → Student → Program.academicSystem for filtering the borrowings list and the activeBorrowings stat. Books themselves (titles/copies/available) must NEVER be filtered.


**منطق يجب أن يختلف بين النظامين:** none — display only. Borrowing periods/fines are library-policy, not academic-system-dependent.


**الوضع الحالي في الكود:** No. Zero references to academicSystem/resolveStudentSystem anywhere in the page or route. Borrowing.studentId is stored but never joined or surfaced.


### التسويق (Marketing)

**المسار:** `/institute/marketing — API GET /api/institute/marketing`


**الوظيفة والـ workflow:**
Marketing-campaign register. API gated by requirePermission('marketing.manage'); reads all MarketingCampaign rows (name, type, budget, spent, leads, conversions, status, start/end dates) and computes total / active / totalBudget / totalSpent / totalLeads. The 319-line page is a pure read-only dashboard: stat cards, a campaign table with budget-vs-spent progress and conversion counts. No filter Selects at all, no create/edit route (GET only). Leads are anonymous counters (Int), not linked to any applicant or Student record.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference; none needed.


### ضمان الجودة (Quality)

**المسار:** `/institute/quality — API GET /api/institute/quality`


**الوظيفة والـ workflow:**
Accreditation/quality-KPI board. API gated by requireFeature('quality.enabled') + requirePermission('quality.view'); reads QualityIndicator rows (name, score, target, order) ordered by `order`, and derives achievedPct (indicators with score>=target), belowTarget count, avgScore, total. The 158-line page renders 4 stat cards (2 of them hardcoded '—') and a list of indicators, each with a محقق / يحتاج تحسين badge and a Progress bar of score% vs target%. QualityIndicator is a flat scalar table — no student, program, department, or course relation. The 'تقرير الجودة' export button is inert.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. Indicators are institution-level percentages with no student or program link; a system filter would have nothing to filter on. (If indicators were ever recomputed from student data — e.g. graduation rate, satisfaction by cohort — the filter would belong on the KPI computation, not here.)


**منطق يجب أن يختلف بين النظامين:** none — display only. Scores/targets are stored integers, not computed from grades.


**الوضع الحالي في الكود:** No academicSystem handling; none needed at the current data model.


### الشراكات (Partnerships)

**المسار:** `/institute/partnerships — API GET /api/institute/partnerships`


**الوظيفة والـ workflow:**
External partner/employer register. API gated by requirePermission('partnerships.manage'); reads Partnership rows (name, type, contact person, phone, email, website, status, since) plus two DENORMALIZED integer counters, `trainees` and `programs`. Stats: total, active, sum of trainees, sum of programs. The 386-line page has a search box and a 'نوع الشركة' Select (typeFilter, hardcoded Arabic option values like 'شركة تقنية'), a partner card/table, and contact details. The trainees number is a plain Int on the Partnership row — there is no relation to Trainee or Student, so no individual is displayed.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (the `trainees` field is an unlinked counter, not a roster)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference; none needed.


### الأنشطة الطلابية (Student Activities / Clubs)

**المسار:** `/institute/activities — API GET /api/institute/activities`


**الوظيفة والـ workflow:**
Student clubs and events board. API gated by requirePermission('activities.view'); reads all Activity rows (name, members count, type أكاديمي/رياضي/ثقافي/فني, nextEvent text, date, status) and returns active count, totalMembers sum, total. The 166-line page shows 4 stat cards (2 hardcoded '—') and a list of clubs with a type badge, the member count and the next event. Crucially, Activity (schema:580) stores `members Int` — a denormalized counter with NO join table to Student, so no individual student is displayed and membership cannot be filtered by anything today.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ✅ نعم |


**مكان الفلتر:** False today on the data as built (members is a bare Int), but this module is explicitly student-domain and the owner's rule bites as soon as a membership roster exists. Placement: «النظام الأكاديمي» Select in the page header beside the 'نشاط جديد' button, passed as ?system= to /api/institute/activities, filtering an ActivityMember→Student→Program.academicSystem join for both the roster and the members/totalMembers counts. Requires adding the membership relation first.


**منطق يجب أن يختلف بين النظامين:** none — display only; club participation has no per-system computation.


**الوضع الحالي في الكود:** No. No academicSystem reference, and no student linkage to resolve one from.


### الشهادات (Certificates)

**المسار:** `/institute/certificates — API GET /api/institute/certificates`


**الوظيفة والـ workflow:**
Certificate issuance + public verification screen. API gated by requirePermission('certificate.view'); reads all Certificate rows and maps them to {id: code, trainee, program, issueDate, status, verificationCode} with stats total/issued/pending. The 387-line page is tabbed: a certificates table (search by trainee name or code, a status Select all/issued/pending applied client-side), a static `templates` array (3 hardcoded template rows — no API), and a verification tab with a verificationCode input and QR affordance. The action buttons (إصدار شهادة, تصدير, Eye/Printer/Download per row) are inert — the route is GET-only. IMPORTANT: Certificate.trainee (schema:594) is a free-text STRING and `program` a free-text string — there is no FK to Student or Program, so the recipient is not a resolvable student record today.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Yes — certificates are an academic record of a person. Add a «النظام الأكاديمي» Select in the existing filter row of the certificates tab, alongside the search Input and the status Select, and pass ?system=CREDIT_HOURS|ANNUAL|all to GET /api/institute/certificates. Server-side filtering requires first replacing the free-text `trainee`/`program` strings with studentId/programId FKs (or at minimum a programId) so the route can resolve Program.academicSystem via lib/academic-system.ts getProgramSystem. Default must remain 'all'.


**منطق يجب أن يختلف بين النظامين:** Yes, on the certificate CONTENT once issuance is implemented: a credit-hours graduation certificate prints CGPA / earned credit hours / degree classification from GPA bands, while an annual-system certificate prints النسبة المئوية and التقدير العام (ممتاز/جيد جدًا…). Eligibility to issue also differs (credit-hours: earned hours ≥ plan hours and CGPA ≥ minimum; annual: passed the final year with منقول/ناجح status). None of this exists yet — status is a bare 'issued'|'pending' string.


**الوضع الحالي في الكود:** No. No academicSystem reference; no Student/Program relation at all, so nothing can branch today.


### المتدربون (Trainees)

**المسار:** `/institute/trainees — API GET /api/institute/trainees`


**الوظيفة والـ workflow:**
Roster of TRAINING-course participants (short courses / وحدة التدريب), distinct from degree Students. API gated by requirePermission('trainees.manage'); reads all Trainee rows (name, phone, email, program string, batch, progress %, attendance %, status, joinDate, certificates count) and returns total, active, avgProgress, avgAttendance. The 417-line page has a search box plus two client-side Selects — programFilter with HARDCODED Arabic program options ('تطوير الويب', 'التسويق الرقمي', 'إدارة المشاريع') and statusFilter — and a table with progress/attendance bars per trainee. GET-only; add/edit buttons are inert. The Trainee model (schema:544) is completely standalone: no FK to Student, Program, or Enrollment; `program` is free text.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** Borderline, and the honest answer is NO for the module as built: trainees are non-degree participants outside the Program/academicSystem model entirely (no programId, no Student link), so a «النظام الأكاديمي» Select would have nothing to resolve and every row would fall outside both systems. It displays PEOPLE with progress/attendance, but not academic records governed by an academic system. If the client later links trainees to real Programs, the filter goes next to the existing programFilter Select and becomes ?system= on /api/institute/trainees. Recommend flagging this to the owner rather than adding a filter that always returns everything.


**منطق يجب أن يختلف بين النظامين:** none — progress and attendance are stored percentages on the row; no GPA or تقدير computation.


**الوضع الحالي في الكود:** No academicSystem reference and no Program relation to resolve one from.


### المدربون (Trainers)

**المسار:** `/institute/trainers — API GET /api/institute/trainers`


**الوظيفة والـ workflow:**
Trainer/instructor roster for the training unit. API gated by requirePermission('trainers.manage'); reads all Trainer rows (name, specialty, phone, email, courses count, trainees count, rating, status, experience, certifications string[]) with stats total/active/avgRating/totalTrainees/totalCourses. The 366-line page has a search box and a specialtyFilter Select with hardcoded Arabic specialty values, and renders trainer cards with rating stars and certification badges. GET-only. Trainer is standalone (schema:562) with denormalized `courses`/`trainees` Ints — no relation to Instructor, Course, Trainee, or Student.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (staff roster; the trainees/courses fields are unlinked counters)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference; none needed.


### التواصل (Communication / Messaging)

**المسار:** `/institute/communication — API GET /api/messages (NOT under /api/institute)`


**الوظيفة والـ workflow:**
Internal inbox. The 156-line page fetches /api/messages (there is no /api/institute/communication route) and renders 4 stat cards — only 'رسائل جديدة' is live (stats.unread); إشعارات مرسلة / بريد إلكتروني / مجموعات are hardcoded '—' — plus a recent-messages list showing sender avatar/initial, sender name, subject, date and a 'جديد' badge for unread. The search Input and the 'رسالة جديدة' button are decorative: no POST, no compose dialog, no thread view, no mark-as-read action. The Message model (schema:625) is per-inbox: recipientUserId (any role), senderName, senderRole free text (e.g. 'طالب'), subject, body, read, universityId.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — messages address USERS by recipientUserId, not students by academic record; senderRole is free text, and there is no join to Student/Program. A system filter on an inbox would be meaningless. (Only a future bulk-announcement composer targeting a student audience would need one — and that filter belongs on the recipient-picker, as ?system= on the audience query, not on the inbox list.)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference; none needed.


### الاستبيانات / التقييمات (Surveys & Evaluations — API only, no UI page)

**المسار:** `API GET/POST/PATCH /api/institute/surveys and POST /api/institute/surveys/[id]/respond — NO page exists (no app/(institute)/institute/surveys directory; grep for 'surveys' across .tsx returns nothing)`


**الوظيفة والـ workflow:**
ClientR3 quality-function survey engine, owned by the Quality module. GET (requirePermission 'quality.view') lists Survey rows scoped by guard.ctx.universityId — the only route in this area that actually tenant-scopes — optionally ?active=1, with a _count of responses; it also returns the fixed TYPES list ['STUDENT_SATISFACTION','FACULTY_SATISFACTION','COURSE_EVALUATION']. POST (quality.edit) creates a survey (title, validated type, academicYear, semester, isActive) and writes an audit entry 'survey.create'. PATCH (quality.edit) edits title / toggles isActive to close a survey, after a tenant-scoped findFirst. The respond route requires only a NextAuth session (any authenticated member): it rejects a closed survey with 409, validates a 1..5 Likert integer, and writes a SurveyResponse carrying respondentType STUDENT|FACULTY, optional studentId / instructorId / courseId, comment (truncated to 2000 chars), and the survey's academicYear/semester. These rows are documented as the feed for the quality KPIs.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Yes — SurveyResponse stores studentId and courseId, and survey results are reported per academic year/semester per cohort. Placement: a ?system=CREDIT_HOURS|ANNUAL|all query param on GET /api/institute/surveys (and on whatever results/aggregation endpoint the KPI reporting uses), resolved by joining SurveyResponse.studentId → Student → Program.academicSystem; in the UI, when the surveys screen is built, a «النظام الأكاديمي» Select beside the type/active filters in the survey-results view. Survey DEFINITIONS themselves need no filter — only the response/analytics breakdown does. Default 'all'.


**منطق يجب أن يختلف بين النظامين:** none for the Likert scoring itself (1..5 is system-agnostic). The `semester` field is however system-shaped: credit-hours programs have فصل أول/ثاني/صيفي terms while annual programs are year-based, so the academicYear/semester selectors offered when creating a survey — and any per-term response aggregation — must present the right period vocabulary per system.


**الوضع الحالي في الكود:** No. Neither route references academicSystem; studentId is written as an opaque optional string and never joined to Student or Program.


---

<a id="settings-admin-hr-cms"></a>

## الإعدادات والموارد البشرية والإدارة والموقع

*42 موديول · 8 يعرض طلاب · 7 يحتاج فلتر*


### إعدادات المعهد العامة — Institute Settings (general/roles/notifications)

**المسار:** `/institute/settings (app/(institute)/institute/settings/page.tsx, 541 lines) → GET/PATCH /api/settings?key=institute.general`


**الوظيفة والـ workflow:**
Client page with tabs (general info, admin users, roles, notifications, branding/billing). Hydrates instituteName/instituteNameEn/email/phone/address from the Setting key 'institute.general' via GET /api/settings, saves back with PATCH. The admin-users and roles tables on this page are HARDCODED arrays (adminUsers, roles) — not DB-backed; real RBAC lives in /admin/roles and /admin/users. Audience: institute administrator.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (org profile + hardcoded user/role demo tables)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference anywhere in the file.


### النظام الأكاديمي للبرامج — Academic System per Program

**المسار:** `/institute/settings/academic-system → GET /api/institute/programs, PATCH /api/institute/programs {id, academicSystem}`


**الوظيفة والـ workflow:**
THE control surface for the whole dual-system feature. Lists every Program (nameAr, department, student count) and gives each row a Select bound to Program.academicSystem with two options: CREDIT_HOURS (نظام الساعات المعتمدة) / ANNUAL (النظام السنوي). Optimistically updates local state then PATCHes; on failure reloads. Header caption counts how many programs are ANNUAL vs credit. The PATCH is normalized server-side by normalizeSystem() in app/api/institute/programs/route.ts (lines 38/68/89). A footer note admits phase-1 scope. This page is where the per-program system that every other module must read is SET.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — it lists programs, not students; the academicSystem column is the editor, not a display filter. (Optional nicety: a 'show only ANNUAL/CREDIT programs' narrowing on the program list, but not required by the owner's rule.)


**منطق يجب أن يختلف بين النظامين:** none itself — it is the SOURCE of the flag other modules branch on. Its per-row student count is an unfiltered aggregate.


**الوضع الحالي في الكود:** Yes — the only page in this whole area that reads/writes academicSystem.


### السنوات الدراسية — Academic Years

**المسار:** `/institute/settings/academic-years → GET + PATCH /api/institute/academic-years {action: add|remove|setCurrent, year}`


**الوظيفة والـ workflow:**
Manages the managed list of academic-year strings (format 2026-2027) plus which one is 'current'. Used by new-student import (ClientR6) and student promotion/rollover so all records bind to one canonical year label. Simple add / delete / star-as-current list, no DB model of its own beyond the settings store behind the API.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (year labels only)


**منطق يجب أن يختلف بين النظامين:** none — display only. Note both systems share the same academic-year vocabulary, so no per-system split is needed here.


**الوضع الحالي في الكود:** No academicSystem reference.


### إعدادات الساعات المعتمدة — Credit-Hours Settings

**المسار:** `/institute/settings/credit-hours → GET/PATCH /api/settings?key=institute.creditHours`


**الوظيفة والـ workflow:**
Editor for the CREDIT_HOURS-only registration/standing knobs stored as a JSON blob under Setting key 'institute.creditHours': minHours/maxHours/maxHonorsHours/maxWarnedHours, minPassGpa, firstWarningGpa, secondWarningGpa, dismissalGpa, plus toggles allowEarlyRegistration, allowLateRegistration, autoDropOnAbsence, warningNotifications. Loads with merge-over-defaults, saves the whole blob back.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. It is intrinsically credit-hours-scoped configuration, not a student list.


**منطق يجب أن يختلف بين النظامين:** System-SPECIFIC by nature: every value here (GPA thresholds, hour caps) is meaningless for ANNUAL programs. The page does not say so — it should be labelled/scoped as 'يطبق على برامج الساعات المعتمدة فقط'. There is no matching ANNUAL settings page; the annual thresholds live instead inside the Regulations page.


**الوضع الحالي في الكود:** No branch — it is silently credit-only and presented as if global.


### اللائحة والضوابط — Regulations / Bylaw Thresholds

**المسار:** `/institute/settings/regulations → GET/PATCH /api/settings?key=institute.regulations (read at runtime by lib/regulations.ts getRegulations())`


**الوظيفة والـ workflow:**
UI over DEFAULT_REGULATIONS in lib/regulations.ts. Grouped scalar fields: probation (probationGpa, probationHourCap, maxConsecutiveProbation, maxSeparateProbation), registration load (minRegHours, maxRegHours, summerMaxHours, maxCourseAttempts), honors (honorCgpa, honorTermGpa), attendance/exams (absenceBanPercent, attendanceWarnThreshold, withdrawWeek, writtenMinPercent, incompleteCourseworkPercent), graduation (graduationHours, levelMinHours), AND the ANNUAL-system block: annualPassPercent (50), maxCarryOverSubjects (2), annualExcellentMin (85), annualVeryGoodMin (75), annualGoodMin (65). Unset values fall back to defaults shown as placeholders; getRegulations() merges the stored blob over defaults. This is the single bylaw store that BOTH the credit engine and the annual engine (rafaa/grade-improvement, منقول/له دور ثانٍ/باقٍ) read.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. But the page SHOULD visually separate the two systems' field groups (a 'النظام' tab/section split: credit-hour groups vs the annual percentage/تقدير bands), which today are mixed into one flat list.


**منطق يجب أن يختلف بين النظامين:** Holds BOTH systems' thresholds in one blob. Credit fields drive GPA/CGPA probation, honors, hour caps, graduationHours/levelMinHours; annual fields drive pass %, carry-over subject count, and the تقدير bands (ممتاز/جيد جداً/جيد). Any consumer must pick the right subset by the student's program system.


**الوضع الحالي في الكود:** Partially — annual keys EXIST here (annualPassPercent, maxCarryOverSubjects, annual*Min), so the store is dual-system aware, but the page itself does not branch, label, or group by system.


### إعدادات الذكاء الاصطناعي — Institute AI Settings

**المسار:** `/institute/settings/ai → GET/PATCH /api/settings?key=institute.ai`


**الوظيفة والـ workflow:**
Toggle board for AI features: master aiEnabled; career assistant (jobMatching, skillGapAnalysis); learning path (personalizedCourses, certificationGuide); performance (completionPrediction, engagementTracking, alertThreshold slider default 65). Tabs UI, merge-over-defaults hydration, toast on save.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (feature toggles only)


**منطق يجب أن يختلف بين النظامين:** none — display/config only. Downstream AI predictors that consume grades would need per-system logic, but not this page.


**الوضع الحالي في الكود:** No academicSystem reference.


### Generic Settings API

**المسار:** `GET /api/settings?key=<ns> · PATCH /api/settings {key,value} (app/api/settings/route.ts)`


**الوظيفة والـ workflow:**
Namespaced JSON key/value store over the Setting table, used by every settings page above (institute.general, institute.creditHours, institute.regulations, institute.ai). requireSession() guard only (no fine-grained permission). GET returns parsed JSON or {} when unset, tolerating a legacy plain-string value. PATCH does find-then-write because Setting.key is now unique per [universityId,key]; it carries an explicit TODO(P5) that it is NOT yet scoped by the session's universityId — a cross-tenant bleed risk on a multi-tenant deployment.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (generic settings CRUD)


**منطق يجب أن يختلف بين النظامين:** none — opaque JSON passthrough; the per-system meaning lives in the consuming pages/lib.


**الوضع الحالي في الكود:** N/A.


### لوحة الموارد البشرية — HR Dashboard

**المسار:** `/institute/hr/dashboard → GET /api/institute/hr/dashboard (permission hr.staff.view)`


**الوظيفة والـ workflow:**
Tenant-scoped HR overview built from prisma.instructor + prisma.payroll: staff total and breakdown by academic title, payroll netTotal, completed/pending counts, and per-role net + headcount. Read-only aggregate.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (employees/instructors and salaries only)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference. Confirmed from code.


### ملفات الموظفين — HR Employee Directory & 360 Profile

**المسار:** `/institute/hr/employees and /institute/hr/employees/[id] → GET/POST /api/institute/hr/employees, GET/PATCH /api/institute/hr/employees/[id] (hr.employee.view / hr.employee.edit)`


**الوظيفة والـ workflow:**
ClientR4-R4c-1 employee register. List filterable by adminDepartmentId, employeeTypeId, hrStatus and free-text q over nameAr/code/nationalId; rows resolve employeeType/jobTitle/adminDepartment names via lookup maps. Create/edit writes the PROFILE_KEYS set (identity: nameAr/nameEn/nationalId/birthDate/gender/maritalStatus; contact; org links employeeTypeId/jobTitleId/positionId/adminDepartmentId/sectionId/managerId; contract type+dates; hrStatus from a 12-value Arabic map NEW…ACTIVE; payroll identity iban/payMethod/bankAccount/taxCardNo/insuranceNo/baseSalary/hireDate). Audited via writeAudit.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (Employee model only)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference. Confirmed from code.


### الهيكل الإداري — HR Org Structure Config

**المسار:** `/institute/hr/org → GET/POST /api/institute/hr/org (hr.org.view / hr.org.edit)`


**الوظيفة والـ workflow:**
One route managing five config entities: adminDepartment, adminSection, employeeType, jobTitle, position — all tenant-scoped by universityId. Includes a one-shot 'seed-employee-types' action that inserts the standard catalogue (FACULTY أعضاء هيئة تدريس, ASSISTANT هيئة معاونة, ADMIN إداريون, LABOR عمال وخدمات, SECURITY أمن, TECH فنيون, LEADERSHIP قيادات إدارية). These entities are the lookups the employee profile links to.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (administrative org taxonomy)


**منطق يجب أن يختلف بين النظامين:** none — display only. Note these adminDepartments are HR/administrative and distinct from academic Departments that own Courses.


**الوضع الحالي في الكود:** No academicSystem reference.


### حضور وانصراف الموظفين — Employee Attendance

**المسار:** `/institute/hr/attendance → GET/POST /api/institute/hr/attendance, GET/PATCH /api/institute/hr/attendance/config (hr.attendance.view / .edit / .approve)`


**الوظيفة والـ workflow:**
ClientR4-R4c-2 daily employee attendance. GET filters by date, or from/to range, or employeeId, capped at 1000 rows, joined to employee code+nameAr. POST supports single manual entry and CSV-style bulk import of rows [{code,date,checkIn,checkOut}]. derive() computes lateMinutes against the tenant's default WorkSchedule startTime + graceInMin, workedMinutes from checkIn/checkOut, and a derived status (A absent / L late / P present). Review workflow DRAFT → REVIEWED → APPROVED → LOCKED; feeds the payroll integration. Biometric-device import deferred.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. This is EMPLOYEE attendance; student attendance is a separate academic module and is not in this area.


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference. Confirmed from code.


### جزاءات وإضافي وأذونات وسلف — HR Adjustments

**المسار:** `(surfaced under HR attendance) → GET/POST /api/institute/hr/adjustments (hr.attendance.view/.edit/.approve)`


**الوظيفة والـ workflow:**
Consolidated route keyed by `kind` over four models: Penalty (type/reason/deductDays/note/date), Overtime (date/hours/reason/status), AttendancePermission (type PERMISSION/mission, date, fromTime/toTime, reason, status), and Loan (amount/monthlyAmount/remaining/status). All tenant-scoped, optionally narrowed by employeeId, 300 rows each, joined to employee code+nameAr. All four feed the R4c-3 payroll integration.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (employee disciplinary/pay adjustments)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### إدارة الإجازات — HR Leave

**المسار:** `/institute/hr/leave → GET/POST/PATCH /api/institute/hr/leave (hr.leave.view / .edit / .approve)`


**الوظيفة والـ workflow:**
ClientR4-R4c-2 leave management: LeaveType catalogue (code, nameAr, isPaid, annualQuota), LeaveRequest (employee, type, fromDate/toDate, auto-computed days via daysBetween, reason, status), and LeaveBalance rows for the current UTC year. Approving a request rolls the days into the employee's balance.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (employee leave)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### تقييم الأداء — HR Performance Reviews

**المسار:** `/institute/hr/performance → GET/POST /api/institute/hr/performance, /api/institute/hr/performance/templates (hr.performance.view / .edit)`


**الوظيفة والـ workflow:**
ClientR4-R4c-4. Template-driven employee appraisals; weighted score = Σ(score×weight)/Σ(weight), then a bylaw grade band via gradeFor(): ≥90 ممتاز, ≥80 جيد جداً, and lower bands. Templates route manages the criteria/weight definitions.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (employee appraisal)


**منطق يجب أن يختلف بين النظامين:** none for the academic systems. Its ممتاز/جيد جداً banding coincidentally resembles the ANNUAL تقدير bands but is an unrelated HR scale (do NOT wire it to institute.regulations annual*Min).


**الوضع الحالي في الكود:** No academicSystem reference.


### لوحة الرواتب — Payroll Dashboard

**المسار:** `/institute/payroll/dashboard (app/(institute)/institute/payroll/dashboard/page.tsx)`


**الوظيفة والـ workflow:**
Payroll overview cards: totalEmployees, totalPayroll, netPayroll, deductions, facultyCount/facultySalary vs staffCount/staffSalary, plus a per-month payroll-run status table (month, completed|pending, amount) and export affordances. Reads employee/payroll aggregates; audience is finance/HR.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (salaries paid to employees)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference. Confirmed from code.


### لوحة المنصة — Super-Admin Platform Dashboard

**المسار:** `/admin/dashboard → GET /api/admin/platform/stats (permission platform.audit.view)`


**الوظيفة والـ workflow:**
Super-admin landing: counts of universities, faculties, users, roles, plus the 10 most recent AuditLog entries (action, targetType, actorUserId, createdAt) with Arabic action labels (create إنشاء / update تعديل / delete حذف / assign إسناد / revoke إلغاء).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (tenant + RBAC counts)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### إدارة الجامعات والكليات — Universities & Faculties

**المسار:** `/admin/universities, /admin/universities/[id] → /api/admin/platform/universities[/id], /api/admin/platform/faculties[/id]`


**الوظيفة والـ workflow:**
Tenant CRUD: University (nameAr, nameEn, slug, domain, isActive, _count.faculties) and the Faculty rows beneath each university. Creates/edits via dialogs; the tenant chosen here is the universityId that scopes almost every other API in the platform.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (tenant hierarchy)


**منطق يجب أن يختلف بين النظامين:** none — display only. Note: academicSystem is a PROGRAM attribute, not a university/faculty one, so no field belongs here.


**الوضع الحالي في الكود:** No academicSystem reference.


### المستخدمون — Platform Users & Role Assignment

**المسار:** `/admin/users, /admin/users/[id] → /api/admin/platform/users, /users/[id], /users/[id]/roles`


**الوظيفة والـ workflow:**
Directory of User accounts with search and creation dialog, and per-user role assignment/revocation scoped to a university. Audited.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. These are login accounts, not Student academic records; a Student's user account carries no program/system in this view.


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### الأدوار والصلاحيات — Roles & Permissions

**المسار:** `/admin/roles, /admin/roles/[id] → /api/admin/platform/roles[/id], /roles/[id]/permissions, /api/admin/platform/permissions`


**الوظيفة والـ workflow:**
RBAC editor: global vs university-scoped roles, system/locked roles, and the permission matrix attached to each role (the hr.*, student.view, finance.view, cms.page.view, platform.audit.view, library.view keys that guard every API in this area).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### مفاتيح المزايا — Feature Flags

**المسار:** `/admin/feature-flags → GET/PATCH /api/admin/platform/feature-flags`


**الوظيفة والـ workflow:**
Matrix of feature keys (e.g. library.enabled, checked by requireFeature in /api/admin/library) × universities, each cell a Switch writing a FeatureFlag value. This is the natural place a future 'annual-system enabled' capability flag would live.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension


**منطق يجب أن يختلف بين النظامين:** none today — display only.


**الوضع الحالي في الكود:** No academicSystem reference; no annual/credit flag exists (system is per-Program, not per-tenant, by design).


### سجل التدقيق — Audit Log

**المسار:** `/admin/audit-log → GET /api/admin/platform/audit-log`


**الوظيفة والـ workflow:**
Searchable/refreshable AuditLog viewer: createdAt, actorUserId, action, targetType, targetId, universityId, with filter selects. Written to by writeAudit() across HR, admin, and academic routes.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. Entries may reference a student targetId, but the log stores only opaque ids/types with no program join, so a system filter is not implementable or meaningful here.


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### بوابة إداري شؤون الطلاب — Student Affairs Portal Dashboard

**المسار:** `/student-affairs/dashboard → GET /api/admin/student-affairs (permission student.view)`


**الوظيفة والـ workflow:**
Four KPI cards from unfiltered global counts: prisma.student.count(), student.count(status ACTIVE) with activePct, application.count(PENDING), complaint.count(PENDING). Audience: student-affairs administrator. Note it is NOT tenant-scoped (no universityId in the where clauses).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: a «النظام الأكاديمي» Select in the dashboard header (كل الأنظمة / ساعات معتمدة / سنوي), default 'الكل'. API: add ?system=CREDIT_HOURS|ANNUAL to GET /api/admin/student-affairs and narrow the student counts with where.program.academicSystem (ANNUAL matched explicitly; CREDIT_HOURS matched as { in: ['CREDIT_HOURS'] } OR null, mirroring normalizeSystem's default). Applications/complaints have no program link yet, so leave those two cards unfiltered and label them as such.


**منطق يجب أن يختلف بين النظامين:** none for the counts themselves (a headcount is a headcount) — display-only aggregation. Only the WHERE narrows.


**الوضع الحالي في الكود:** No — counts every Student regardless of program system.


### بوابة المحاسب — Accountant Portal Dashboard

**المسار:** `/accountant/dashboard → GET /api/admin/accountant (permission finance.view)`


**الوظيفة والـ workflow:**
Financial KPI cards computed from prisma.feeAccount.findMany({include:{payments:true}}): totalDues (Σ totalFees), collected (Σ paid payments), remaining, collectionRate %, plus a count of Payment rows with status ≠ paid. Read-only.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** FeeAccount is per-student, so this is student financial data. Page: optional «النظام الأكاديمي» Select in the header, DEFAULT 'الكل' — per the owner's rule finance must keep showing everything unless the user narrows. API: ?system= on GET /api/admin/accountant, applied as where.student.program.academicSystem on the feeAccount/payment queries.


**منطق يجب أن يختلف بين النظامين:** none — money is money; no per-system computation. Display/filter only.


**الوضع الحالي في الكود:** No — aggregates all fee accounts unconditionally.


### بوابة إداري المكتبة — Library Admin Dashboard

**المسار:** `/library-admin/dashboard → GET /api/admin/library (requireFeature library.enabled + permission library.view)`


**الوظيفة والـ workflow:**
Library KPIs: distinct titles, totalCopies and available summed over prisma.book, plus Borrowing counts by status ('borrowed', 'overdue'). Feature-flag gated.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a as built — the endpoint returns only book/copy counts and status tallies with no borrower identity. (Books themselves are explicitly out of scope per the owner's rule. If a per-borrower borrowings LIST is added later, that list would then need the filter; the current summary does not.)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### بوابة إداري القبول — Admission Admin Dashboard

**المسار:** `/admission-admin/dashboard (app/(admin-portals)/admission-admin/dashboard/page.tsx)`


**الوظيفة والـ workflow:**
Admission KPIs (pendingApplications, approvedApplications, transfers, pendingEquivalence) plus a recent-applications table (fullName, firstChoice, status→Arabic badge via statusBadge with APPROVED مقبول / REJECTED مرفوض / PENDING fallthrough, date).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Applicants are pre-enrollment (Application model: firstChoice/secondChoice/thirdChoice are program CHOICES, no Student/program FK yet), so the honest filter is by the CHOSEN program's system. Page: «النظام الأكاديمي» Select above the recent-applications table. API: ?system= resolved by joining the choice string/id to Program.academicSystem. Lower priority than the enrolled-student modules; if the choice cannot be resolved to a Program id, skip the filter rather than fake it.


**منطق يجب أن يختلف بين النظامين:** none — display only. (Downstream, an accepted applicant inherits the system from the program they are enrolled into.)


**الوضع الحالي في الكود:** No academicSystem reference.


### بوابة المعيد — Assistant (Teaching Assistant) Dashboard

**المسار:** `/assistant/dashboard → GET /api/assistant/dashboard`


**الوظيفة والـ workflow:**
Per-instructor TA landing: instructor {id,name,title}, stats {courses, students, needsGrading, weeklySections}, and a weeklySchedule of {subject, time, room, day} sorted by day/time using DAY_NAMES + toMinutes. The `students` stat and `needsGrading` queue are student/academic data.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Page: «النظام الأكاديمي» Select in the dashboard header, default الكل, narrowing the students/needsGrading figures (and any drill-down roster). API: ?system= on GET /api/assistant/dashboard applied to the enrollment→student→program join. Since a TA's sections belong to courses that may serve BOTH credit and annual programs, the filter is genuinely useful here.


**منطق يجب أن يختلف بين النظامين:** Yes downstream — the grading queue this dashboard counts must eventually enter marks per the student's system (letter/points+GPA for CREDIT_HOURS vs percentage + تقدير + منقول/له دور ثانٍ/باقٍ للإعادة for ANNUAL). The dashboard itself only counts, but any grading screen it links to must branch on resolveStudentSystem().


**الوضع الحالي في الكود:** No — no academicSystem/resolveStudentSystem reference anywhere under app/(assistant).


### لوحة CMS — CMS Dashboard

**المسار:** `/cms/dashboard → GET /api/cms/dashboard (permission cms.page.view)`


**الوظيفة والـ workflow:**
CMS landing: counts of PENDING applications, PENDING complaints, visible Results (result.count where isVisible), plus a merged time-sorted activity feed of the 5 newest applications, complaints, and published news (top 6 overall) with Arabic labels.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ❌ لا |


**مكان الفلتر:** n/a in practice — the three counts are content-moderation totals with no program join available (Application has no Student FK; Complaint carries a free-text studentName/studentId; Result is per department+year, not per student). A system filter here would be unimplementable rather than merely unhelpful. If a filter is ever wanted, it must first go on the underlying Result model (see CMS Results below).


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### إدارة النتائج (CMS) — Published Result Files

**المسار:** `/cms/results → /api/results (GET/POST/DELETE)`


**الوظيفة والـ workflow:**
Uploads and publishes DEPARTMENT-LEVEL result documents, not per-student marks: {departmentId, year (1..n), semester (FALL/…), academicYear, pdfUrl, isVisible, allowView, allowDownload}. Table lists them with visibility toggles and delete. IMPORTANT: per the project's known-issues, /api/results POST/GET carry a field-name mismatch (published/title/publishedAt vs isVisible/publishDate) — verify before extending. This is the module a parent/public visitor's «النتائج» page reads.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** It publishes academic records (result sheets) keyed by department+year+semester. The correct placement is a «النظام الأكاديمي» Select in the toolbar above the results table, driving ?system= on GET /api/results — but it needs a data change first: Result has no program link, only departmentId, and DEPARTMENTS have no system (only Programs do). So either (a) add programId/academicSystem to Result, or (b) derive the option list from the programs under the selected department. Flag this as the one real schema gap in this area.


**منطق يجب أن يختلف بين النظامين:** Yes, structurally: a credit-hours result sheet and an annual result sheet are different documents (GPA/CGPA columns vs نسبة/تقدير + منقول/له دور ثانٍ/باقٍ للإعادة). The semester field (FALL/SPRING) is itself credit-shaped; ANNUAL programs need a year-level rather than a semester-level result artifact.


**الوضع الحالي في الكود:** No — no academicSystem anywhere; semester is unconditionally required.


### إدارة الجداول (CMS) — Schedules Management

**المسار:** `/cms/schedules → /api/schedules (+ /api/departments, Cloudinary upload)`


**الوظيفة والـ workflow:**
CRUD for timetable documents per {departmentId, year, semester, academicYear, pdfUrl} with isVisible/allowView/allowDownload flags and PDF/image upload + preview. Mirrors the Results module's shape.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (documents keyed to department+year, no per-student record). Optional only: if annual programs need year-based rather than semester-based schedules, the same department→program derivation as Results would apply; not required by the owner's rule.


**منطق يجب أن يختلف بين النظامين:** Mild: the `semester` axis is credit-shaped; ANNUAL programs think in years. Display-only otherwise.


**الوضع الحالي في الكود:** No academicSystem reference.


### إدارة طلبات الالتحاق (CMS) — Applications

**المسار:** `/cms/applications → GET/PATCH /api/applications[?status=]`


**الوظيفة والـ workflow:**
Admissions review queue: table of Application rows (fullName, nationalId, birthDate, phone, email, address, highSchoolGrade/Year, first/second/thirdChoice, status, notes) with an ALL/PENDING/APPROVED/REJECTED status filter and a details dialog that approves or rejects (updateStatus PATCH).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** Pre-enrollment applicants. Page: add a second Select «النظام الأكاديمي» beside the existing status filter; API: ?system= on GET /api/applications, resolved via the applicant's firstChoice → Program.academicSystem. Same caveat as the admission dashboard — only implementable if the choice fields reference Program ids; today they are strings.


**منطق يجب أن يختلف بين النظامين:** none — display only. highSchoolGrade is an admission percentage, unrelated to either academic system's grading.


**الوضع الحالي في الكود:** No academicSystem reference.


### إدارة الشكاوى (CMS) — Complaints

**المسار:** `/cms/complaints → GET/PATCH /api/complaints[?status=]`


**الوظيفة والـ workflow:**
Student-complaint inbox: rows carry studentName, optional studentId, phone, email, type, subject, message, status, response, respondedAt. ALL/PENDING/… filter plus a dialog to write a response (PATCH sets response + status).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ✅ نعم | ✅ نعم |


**مكان الفلتر:** It displays students (by name and an optional student id). Page: an optional «النظام الأكاديمي» Select next to the existing status filter, default الكل. API: ?system= on GET /api/complaints, joined studentId → Student → Program.academicSystem. Because studentId is nullable/free-text, rows that cannot be resolved must remain visible under 'الكل' and be excluded only when the user explicitly narrows — never silently dropped.


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### إدارة الرسائل (CMS) — Contact Messages

**المسار:** `/cms/messages → /api/contact-messages`


**الوظيفة والـ workflow:**
Public contact-form inbox: name, email, phone, subject, message, isRead, response, timestamps; view dialog and read/respond actions.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (anonymous website enquiries)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### إدارة الأقسام (CMS) — Departments

**المسار:** `/cms/departments → /api/departments`


**الوظيفة والـ workflow:**
CRUD for academic Department records (name, code, description, requiredHours) with a specializations count and search. These are the departments that own Courses.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension. Deliberately no system field either: per the platform's model, departments own courses and carry NO academic system — the system belongs to Program. Do not add a system column here.


**منطق يجب أن يختلف بين النظامين:** Worth noting: the `requiredHours` field is credit-hours vocabulary sitting on a system-neutral entity; annual programs express requirements as years/subjects. Otherwise display only.


**الوضع الحالي في الكود:** No academicSystem reference (correctly).


### إدارة الأخبار (CMS) — News

**المسار:** `/cms/news → /api/news`


**الوظيفة والـ workflow:**
News CRUD: title, summary, content, category, published, featured, showInSlider flags; drives the public homepage news/slider sections.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (editorial content)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### إدارة الصفحات (CMS) — Pages / Pages-New / Page Builders

**المسار:** `/cms/pages, /cms/pages-new, /cms/page-builder/[id], /cms/page-builder-grapes/[id] → /api/pages, /api/pages/[id], /api/pages/[id]/blocks`


**الوظيفة والـ workflow:**
Hierarchical CMS page tree (titleAr/titleEn, slug, parentId, level, order, showInHeader/showInFooter, isPublished) plus two block editors — a bespoke builder and a GrapesJS variant — that persist PageBlock rows {type, content, order}. GET /api/pages supports ?includeBlocks, ?published, ?slug and orders by level then order; writes require a NextAuth session. /cms/pages and /cms/pages-new are near-duplicate implementations of the same list — a consolidation candidate.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (marketing/site content)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### ترحيل وبذر الصفحات (CMS) — Migrate / Seed Pages

**المسار:** `/cms/migrate-pages → POST /api/pages/migrate · /cms/seed-pages → POST /api/pages/seed`


**الوظيفة والـ workflow:**
One-shot maintenance utilities. Migrate reads the legacy localStorage key 'cms_pages' in the admin's own browser and pushes those pages into the DB (errors if the key is absent) — the remediation path for the localStorage-backed CMS era. Seed inserts the standard starter page set. Both report per-row results in an alert panel.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (content migration tooling)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference. Note /api/pages/seed matched the student grep only because seeded page copy mentions students.


### إعدادات الموقع (CMS) — Public Site Settings

**المسار:** `/cms/settings → /api/settings (site keys)`


**الوظيفة والـ workflow:**
Public-website identity: siteName, siteDescription, phone, email, address, facebook, aboutText, headerLogo, footerText — edited across tabs and saved to the settings store. Distinct from /institute/settings (which is the institute's operational config).


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (site branding/contact)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### الصفحة الرئيسية العامة — Public Homepage

**المسار:** `/ (app/(public)/page.tsx, 747 lines) + its CMS editor /cms/homepage (2537 lines)`


**الوظيفة والـ workflow:**
Public marketing homepage: hero slider, stats, specializations/programs cards, news. The page still starts from hardcoded defaultSlides and, per the project's known realities, reads localStorage rather than the DB — so different browsers can see different content; the CMS /cms/homepage editor manages Slides/Stats/announcements/specializations into that same store. A default slide even links to http://localhost:3001/apply.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (public marketing content; it advertises programs, it does not list students)


**منطق يجب أن يختلف بين النظامين:** none for grading. Optional content nicety: if the site advertises programs, showing each program's system (ساعات معتمدة / سنوي) is a labelling choice, not the owner's required filter.


**الوضع الحالي في الكود:** No academicSystem reference.


### الجداول الدراسية (عام) — Public Schedules

**المسار:** `/schedules → GET /api/schedules (+ /api/departments)`


**الوظيفة والـ workflow:**
Public-facing timetable browser: visitor picks department / year / semester / academicYear from Selects and gets the matching Schedule documents, honouring isVisible, allowView (dialog preview) and allowDownload.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (public documents keyed by department+year). Its semester Select is credit-shaped; an ANNUAL program's schedule has no FALL/SPRING split, so the same department→program derivation noted for CMS Schedules would apply if annual timetables are published.


**منطق يجب أن يختلف بين النظامين:** Mild — semester vs year axis only. No computation.


**الوضع الحالي في الكود:** No academicSystem reference.


### الشكاوى (عام) — Public Complaint Form

**المسار:** `/complaints → POST /api/complaints`


**الوظيفة والـ workflow:**
Anonymous-ish public submission form: studentName, studentId, email, phone, type, subject, message → creates a Complaint row that lands in the /cms/complaints queue. Client-side validation + success state; no listing of existing complaints.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — a write-only submission form; it displays no student records


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### التقديم الإلكتروني — Public Application Form

**المسار:** `/apply → POST /api/applications`


**الوظيفة والـ workflow:**
Three-step public admission wizard (identity/contact → academic history incl. highSchoolGrade + birthDate picker → program choices + terms checkbox) that creates an Application row consumed by /cms/applications and the admission-admin dashboard.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — write-only form, displays no student records. Its program-choice Selects COULD show each program's academic system as a label so applicants know what they are choosing, but that is a labelling improvement, not the required filter.


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


### الصفحات الديناميكية العامة — Public Dynamic Pages

**المسار:** `/[slug] (app/(public)/[slug]/page.tsx) and /pages/[slug] → GET /api/pages?slug=…&includeBlocks=true`


**الوظيفة والـ workflow:**
Two parallel client-side renderers for CMS-authored pages: /[slug] renders ordered PageBlock rows inside PublicLayout; /pages/[slug] renders contentAr plus an injected customCSS. Both fetch by slug, honour isPublished, and fall back to notFound/loading states. Duplicate routes for the same job — a consolidation candidate, and note app/[slug] also exists outside the (public) group.


| يعرض طلاب؟ | يحتاج فلتر؟ |
|---|---|
| ❌ لا | ❌ لا |


**مكان الفلتر:** n/a — no student dimension (rendered CMS content)


**منطق يجب أن يختلف بين النظامين:** none — display only


**الوضع الحالي في الكود:** No academicSystem reference.


---

## تصحيحات وكيل المراجعة (مهمة — تمنع فلاتر بلا معنى)


- المقررات الدراسية — Courses catalog (/institute/departments/courses + /api/institute/courses): should be showsStudents=FALSE, needsSystemFilter=FALSE-as-a-student-filter. app/api/institute/courses/route.ts does a single prisma.course.findMany with department/instructor includes — no Student, Enrollment or Program touched, and per the model Course has departmentId only (no programId, no academicSystem). If the owner still wants to narrow the catalogue, it can only be done indirectly via StudyPlanItem → Program.academicSystem, which is a different (and more expensive) filter than the student-system filter used everywhere else. Say so explicitly rather than lumping it with the student lists.

- الأنشطة الطلابية — Activities (/institute/activities): marked needsSystemFilter=true, but model Activity has only `members Int` — there are no student rows at all, no studentId, no program. Should be false, 'n/a — no student dimension'.

- المكتبة — Library (/institute/library): marked showsStudents=false yet needsSystemFilter=true, which is self-contradictory. Borrowing DOES carry a loose `studentId String?` with NO Prisma relation to Student, so a system filter is technically possible only via a manual second query. Either mark showsStudents=true + filter=possible-after-adding-a-real-relation, or false/false. As the schema stands today the filter is not implementable in one where-clause.

- الشهادات — Certificates (/institute/certificates): marked needsSystemFilter=true, but model Certificate has `trainee String` and `program String?` as FREE TEXT — no Student FK, no Program FK. Same for Trainee (free-text program/batch). These are training-centre records, not academic students; a Program.academicSystem filter cannot be written. Should be false until the models are linked to Student/Program.

- النموذج العام للتقديم — Public /apply (POST /api/applications) and CMS applications list: marked needsSystemFilter=true. Application has firstChoice/secondChoice/thirdChoice as free-text strings and no programId — applicants are not yet students and have no program, so there is nothing to resolve academicSystem from. Either add programId to Application first, or drop the filter for admissions intake. The same caveat applies to Admission stats and the admission-admin dashboard.

- الشكاوى (CMS) — Complaints: marked showsStudents=true/needsSystemFilter=true. Complaint.studentId is an optional free-text field with no relation; the filter is not writable today. Downgrade to false or gate on adding the relation.

- إدارة النتائج (CMS) — /cms/results: Result is keyed by departmentId+year+semester (a PDF publication), not by program; the per-student rows live in StudentResult. A system filter here would have to run through StudentResult→Student→Program. Mark it as 'filter only via StudentResult join', not as a plain list filter.

- أعضاء هيئة التدريس — faculty reporting family (lib/reporting/reports/faculty.ts): `doctor-success` computes pass rates over student Enrollments, so showsStudents should be TRUE (teaching-load alone is staff-only). Splitting the two would be more honest than one false for the family.

- لوحة CMS — /cms/dashboard: marked showsStudents=true, but app/api/cms/dashboard/route.ts only counts Applications, Complaints, visible Results and News. No student record is displayed. Should be false/false.

- بوابة الطالب — لوحة المتصدرين (gamification leaderboard): the only student-portal page marked needsSystemFilter=true. It is defensible (it ranks students across programs, and comparing a CGPA-ranked credit student against a percentage-ranked annual student is meaningless) — but note it needs the filter for CORRECTNESS of the ranking, not merely display; the fairer fix is to segregate the leaderboard per system by default.

- المتدربون — Trainees: showsStudents=true is a stretch; Trainee is a separate free-text entity that never joins the Student table. Keep filter=false (as the audit has it) but flip showsStudents to false so nobody plans work against it.


## موديولز أضافها وكيل المراجعة (لم تُغطَّ في الفحص الأول)


- تسجيل الدخول — Login page + NextAuth handler · app/(auth)/login/page.tsx + app/api/auth/[...nextauth]/route.ts · shows students: NO (credential form only; lib/auth.ts still the hardcoded-comparison path)

- أسباب حالة النتيجة — Course result-reason catalogue (ClientR2) · GET/POST/PATCH/DELETE /api/institute/course-result-reasons (guards exam.grade.view / exam.grade.edit; categories FAIL|ABSENCE|WITHDRAWAL|DISCIPLINARY|INCOMPLETE|OTHER) · shows students: NO — pure config table feeding the reason reports; sibling of the covered /api/institute/grade-statuses but absent from the audit

- ملخص الرواتب — Payroll summary API · GET /api/institute/payroll (requireFeature finance.payroll + payroll.view; groups prisma.payroll by month) — this is the API behind the listed /institute/payroll/dashboard page, which the audit listed with no route · shows students: NO

- Webhook بوابات الدفع — Payment provider webhook · POST /api/payments/webhook/[provider] (settles student invoices/receipts out-of-band from lib/finance/payments/*) · shows students: YES (writes per-student financial records) — no UI, so no filter, but it is a student-touching write path the audit omits

- مهمة اللقطات الليلية — KPI snapshot cron · GET /api/cron/kpi-snapshot (thin wrapper over lib/reporting/snapshot.ts, which the audit listed only as a lib) · shows students: YES (aggregates student KPIs); must be declared in vercel.json crons and guarded by CRON_SECRET

- الخطط الدراسية (API) — Study-plan CRUD · GET/POST/PATCH/DELETE /api/institute/study-plan (StudyPlanItem program→course) · shows students: NO — the audit listed the page but never the route; this is the ONLY table that ties a course to a program, i.e. the join every 'course by academic system' filter must go through

- تفاصيل الفاتورة — Single invoice detail · GET/PATCH /api/institute/finance/invoices/[id] · shows students: YES (one student's invoice + lines)

- رفع الملفات — Cloudinary upload endpoints · POST /api/upload, /api/upload-image, /api/upload-media · shows students: NO

- الواجهات العامة للمحتوى — Public content APIs not tied to a listed CMS page · /api/news, /api/schedules, /api/contact-messages, /api/complaints (public POST), /api/results (public GET), /api/pages, /api/pages/[id], /api/pages/[id]/blocks, /api/pages/migrate, /api/pages/seed · shows students: NO except /api/results (department result PDFs + StudentResult rows)

- محرك الدرجات المشترك — lib/gpa.ts (setEnrollmentResult / CGPA) · not listed as a module although it is the single write path for every grade and ALREADY branches on academicSystem (line ~158: ANNUAL students store RAW marks only, no letter/points). Any per-system computation work starts here, plus lib/promotion.ts, lib/holds.ts, lib/attendance.ts, lib/regulations.ts, lib/student-import.ts