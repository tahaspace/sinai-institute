import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { setEnrollmentResult } from '@/lib/gpa';
import { getRegulations } from '@/lib/regulations';
import { bandsFromRegulations, gradeFromBands } from '@/lib/annual';
import { COMPONENT_KEYS, parseComponentCsv, resolveApplicableComponents, toComponentCsv } from '@/lib/grade-components';
import { writeAudit } from '@/lib/audit';

// GET /api/institute/exams/grades?courseId= — staff grade entry roster for any course.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    let courseId = searchParams.get('courseId');
    if (!courseId) {
      const first = await prisma.course.findFirst({ orderBy: { code: 'asc' } });
      courseId = first?.id ?? null;
    }
    if (!courseId) return NextResponse.json({ course: null, roster: [], courses: [], statuses: [] });

    const [course, enrollments, courses, statuses, reg] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId } }),
      prisma.enrollment.findMany({ where: { courseId }, include: { student: { include: { program: { select: { academicSystem: true } } } } }, orderBy: { student: { studentCode: 'asc' } } }),
      prisma.course.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, nameAr: true } }),
      prisma.gradeStatus.findMany({ orderBy: { order: 'asc' } }),
      getRegulations(),
    ]);
    const nameByCode = new Map(statuses.map((s) => [s.code, s.name]));
    // Dual-system: annual students have no letter grade — derive the تقدير band from % so the
    // entry roster shows a meaningful grade for them (the marks are stored raw; see lib/gpa Phase C).
    const bands = bandsFromRegulations(reg);
    const courseMax = course ? course.midtermMax + course.finalMax + course.practicalMax + course.homeworkMax : 0;

    return NextResponse.json({
      courses,
      // result-state codes the control head may set verbally (non-letter): W/E/I/NE/FW/BL/DN/DS/TR…
      statuses: statuses.filter((s) => !s.isLetter).map((s) => ({ code: s.code, name: s.name })),
      course: course && { id: course.id, code: course.code, nameAr: course.nameAr, midtermMax: course.midtermMax, finalMax: course.finalMax, practicalMax: course.practicalMax, homeworkMax: course.homeworkMax, maxTotal: courseMax },
      // the bylaw's default repeat exemption, so the screen can explain where a pre-applied
      // exemption came from without guessing
      repeatExemptComponents: parseComponentCsv(reg.repeatExemptComponents),
      roster: enrollments.map((e) => {
        // Effective denominator for THIS student: components he is exempt from (طالب عايد barred
        // from أعمال السنة …) leave both the numerator and the «من ...» out of the total.
        const app = course
          ? resolveApplicableComponents({ ...e, academicSystem: e.student.program?.academicSystem }, course, reg)
          : { applicable: { midterm: false, final: false, practical: false, homework: false }, applicableKeys: [], countedKeys: COMPONENT_KEYS, excludedKeys: [], maxTotal: 0, source: 'none' as const };
        const total = app.countedKeys.reduce((sum, k) => sum + (e[k] ?? 0), 0);
        const isAnnual = e.student.program?.academicSystem === 'ANNUAL';
        const anyMark = app.countedKeys.some((k) => e[k] != null);
        return {
          enrollmentId: e.id,
          studentCode: e.student.studentCode,
          name: e.student.nameAr,
          system: isAnnual ? 'ANNUAL' : 'CREDIT_HOURS',
          midterm: e.midterm,
          final: e.final,
          practical: e.practical,
          homework: e.homework,
          total,
          // the row's own denominator — never let «من ٧٠» hide behind the course's «من ١٠٠»
          maxTotal: app.maxTotal,
          attemptNo: e.attemptNo ?? 1,
          // null = undecided (the bylaw default applies from the 2nd attempt); '' = explicitly none
          excludedComponents: e.excludedComponents,
          effectiveExcluded: app.excludedKeys,
          exemptionSource: app.source,
          // credit → stored letter; annual → تقدير band derived from % (no letter/points stored)
          letterGrade: isAnnual ? (anyMark && app.maxTotal > 0 ? gradeFromBands((total / app.maxTotal) * 100, bands) : null) : e.letterGrade,
          gradeStatusCode: e.gradeStatusCode,
          statusName: e.gradeStatusCode ? nameByCode.get(e.gradeStatusCode) ?? null : null,
          resultLocked: e.resultLocked,
          academicYear: e.academicYear,
          semester: e.semester,
        };
      }),
    });
  } catch (error) {
    console.error('Error listing exam grades:', error);
    return NextResponse.json({ error: 'فشل في جلب الدرجات' }, { status: 500 });
  }
}

// PATCH /api/institute/exams/grades — staff/control grade entry for an enrollment.
// Two modes:
//   • numeric components → letter is derived (with the board-fail rule) and CGPA recomputed.
//   • statusCode override → control-head verbal grade (I/E/W/NE/DN/FW/DS/BL/TR). For an
//     Incomplete (I) the bylaw requires a minimum coursework %, validated here when scores exist.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { enrollmentId, midterm, final, practical, homework, statusCode, excludedComponents } = body ?? {};
    if (!enrollmentId) return NextResponse.json({ error: 'معرف التسجيل مطلوب' }, { status: 400 });

    const e = await prisma.enrollment.findUnique({ where: { id: enrollmentId }, include: { course: true, student: { select: { program: { select: { academicSystem: true } } } } } });
    if (!e) return NextResponse.json({ error: 'التسجيل غير موجود' }, { status: 404 });

    // A locked (approved) result cannot be edited — surface a clear 423 (Locked).
    if (e.resultLocked) {
      return NextResponse.json({ error: 'النتيجة معتمدة ومغلقة — يجب إعادة الفتح قبل التعديل' }, { status: 423 });
    }

    // Per-enrolment exemption (المكونات غير المطبقة). Sent as an array (or CSV) of component keys;
    // an empty array persists '' = "explicitly nothing excluded", which is how the desk overrides a
    // bylaw default for one student. `null` clears the decision and hands it back to the bylaw.
    // Validated first and written only after every other check passes, so a rejected save can never
    // leave the denominator moved on a row whose grade was not written.
    let appliedExcluded: string | null | undefined;
    let exemptionCsv: string | null | undefined;
    if (excludedComponents !== undefined) {
      // Changing the denominator a student is judged against is a bylaw-level decision, not data
      // entry — it needs the exception permission, not merely exam.grade.edit.
      const exGuard = await requirePermission('exam.exception.set');
      if (!exGuard.ok) return NextResponse.json({ error: exGuard.error }, { status: exGuard.status });

      exemptionCsv =
        excludedComponents === null
          ? null
          : toComponentCsv(Array.isArray(excludedComponents) ? parseComponentCsv(excludedComponents.join(',')) : parseComponentCsv(String(excludedComponents)));

      // Excluding EVERY component leaves maxTotal 0 — a silent F on the credit path and a permanent
      // «قيد الرصد» on the annual one. Refuse before anything is written.
      const reg = await getRegulations();
      const check = resolveApplicableComponents({ excludedComponents: exemptionCsv, attemptNo: e.attemptNo, academicSystem: e.student?.program?.academicSystem }, e.course, reg);
      if (check.maxTotal <= 0) {
        return NextResponse.json(
          { error: 'لا يمكن استثناء كل مكونات الدرجة — يجب أن يتبقّى مكوّن واحد على الأقل' },
          { status: 400 },
        );
      }
      appliedExcluded = exemptionCsv;

      // an exemption-only save (no marks, no code) is a legitimate standalone edit
      if (midterm === undefined && final === undefined && practical === undefined && homework === undefined && !statusCode) {
        await prisma.enrollment.update({ where: { id: enrollmentId }, data: { excludedComponents: exemptionCsv } });
        // A credit row STORES its letter and points, both derived from the old denominator — changing
        // the exemption without re-scoring would leave the student on a grade the new total no longer
        // produces, and their CGPA stale. Re-derive from the marks already on file (no components
        // supplied = nothing overwritten). Annual rows store no letter, so they need nothing.
        const hasMarks = e.midterm != null || e.final != null || e.practical != null || e.homework != null;
        const isCredit = e.student?.program?.academicSystem !== 'ANNUAL';
        if (isCredit && hasMarks) await setEnrollmentResult(enrollmentId, {});
        await writeAudit('exam.exception.set', {
          targetType: 'Enrollment', targetId: enrollmentId,
          metadata: { from: e.excludedComponents, to: exemptionCsv, courseId: e.courseId, studentId: e.studentId },
        });
        // return the resolved row shape so the screen can patch this one row in place instead of
        // refetching the roster (a refetch discards every unsaved mark on the desk).
        return NextResponse.json({
          ok: true,
          excludedComponents: exemptionCsv,
          effectiveExcluded: check.excludedKeys,
          exemptionSource: check.source,
          maxTotal: check.maxTotal,
        });
      }
    }

    // Validate a manual override code against the configured status table + bylaw rules.
    if (statusCode) {
      const st = await prisma.gradeStatus.findFirst({ where: { code: statusCode } });
      if (!st) return NextResponse.json({ error: 'حالة نتيجة غير معروفة' }, { status: 400 });
      if (statusCode === 'I') {
        const reg = await getRegulations();

        // Coursework % is judged over the coursework components that apply to THIS student.
        // use the exemption as of THIS request, not the row as it was read above
        const app = resolveApplicableComponents(
          { excludedComponents: appliedExcluded !== undefined ? appliedExcluded : e.excludedComponents, attemptNo: e.attemptNo, academicSystem: e.student?.program?.academicSystem },
          e.course,
          reg,
        );
        const courseworkKeys = (['midterm', 'practical', 'homework'] as const).filter((k) => app.applicable[k]);
        const courseworkMax = courseworkKeys.reduce((sum, k) => sum + e.course[`${k}Max` as const], 0);
        const coursework = courseworkKeys.reduce((sum, k) => sum + (e[k] ?? 0), 0);
        const pct = courseworkMax > 0 ? (coursework / courseworkMax) * 100 : 0;
        // Only enforce when coursework has actually been recorded; otherwise the excuse path applies.
        if (courseworkMax > 0 && coursework > 0 && pct < reg.incompleteCourseworkPercent) {
          return NextResponse.json(
            { error: `غير مؤهل لحالة "غير مكتمل": أعمال الفصل ${Math.round(pct)}% أقل من الحد ${reg.incompleteCourseworkPercent}%` },
            { status: 422 },
          );
        }
      }
    }

    // The exemption write is deferred until every validation above has passed, so a rejected save
    // can never leave the denominator moved on a row whose grade was not written (there is no
    // transaction to lean on: setEnrollmentResult opens its own writes).
    if (exemptionCsv !== undefined) {
      await prisma.enrollment.update({ where: { id: enrollmentId }, data: { excludedComponents: exemptionCsv } });
      await writeAudit('exam.exception.set', {
        targetType: 'Enrollment', targetId: enrollmentId,
        metadata: { from: e.excludedComponents, to: exemptionCsv, courseId: e.courseId, studentId: e.studentId },
      });
    }

    const result = await setEnrollmentResult(enrollmentId, {
      code: statusCode || undefined,
      components: statusCode ? undefined : { midterm, final, practical, homework },
    });

    return NextResponse.json({
      ok: true,
      enrollment: {
        id: result.id,
        letterGrade: result.letterGrade,
        gradeStatusCode: result.gradeStatusCode,
        statusName: result.statusName,
      },
      cgpa: result.cgpa,
    });
  } catch (error) {
    console.error('Error updating exam grade:', error);
    // an invalid mark ('40' as text, an empty string) is the CLIENT's error — say so with a 400
    // instead of a generic 500 that reads as a server fault.
    const msg = error instanceof Error ? error.message : '';
    if (msg.startsWith('درجة غير صالحة')) return NextResponse.json({ error: msg }, { status: 400 });
    return NextResponse.json({ error: 'فشل في حفظ الدرجة' }, { status: 500 });
  }
}

// POST /api/institute/exams/grades — approve & lock (or reopen) a whole course's results.
// Body: { action: 'approve' | 'unlock', courseId, academicYear?, semester? }
//   • approve → resultLocked=true + approvedAt=now on every enrollment of that course/term (اعتماد وغلق)
//   • unlock  → resultLocked=false + approvedAt=null, reopening grade entry (إعادة فتح)
// Optional academicYear/semester narrow the scope to a single term; omit to cover all of the course's enrollments.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.result.publish');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { action, courseId, academicYear, semester } = body ?? {};
    if (!courseId) return NextResponse.json({ error: 'معرف المقرر مطلوب' }, { status: 400 });
    if (action !== 'approve' && action !== 'unlock') {
      return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
    }

    const where: { courseId: string; academicYear?: string; semester?: string } = { courseId };
    if (academicYear) where.academicYear = academicYear;
    if (semester) where.semester = semester;

    const locking = action === 'approve';
    const result = await prisma.enrollment.updateMany({
      where,
      data: {
        resultLocked: locking,
        approvedAt: locking ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, action, locked: locking, count: result.count });
  } catch (error) {
    console.error('Error approving/locking exam grades:', error);
    return NextResponse.json({ error: 'فشل في اعتماد النتائج' }, { status: 500 });
  }
}
