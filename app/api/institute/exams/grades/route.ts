import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { setEnrollmentResult } from '@/lib/gpa';
import { getRegulations } from '@/lib/regulations';
import { bandsFromRegulations, gradeFromBands } from '@/lib/annual';

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
      course: course && { id: course.id, code: course.code, nameAr: course.nameAr, midtermMax: course.midtermMax, finalMax: course.finalMax, practicalMax: course.practicalMax, homeworkMax: course.homeworkMax },
      roster: enrollments.map((e) => {
        const total = (e.midterm ?? 0) + (e.final ?? 0) + (e.practical ?? 0) + (e.homework ?? 0);
        const isAnnual = e.student.program?.academicSystem === 'ANNUAL';
        const anyMark = e.midterm != null || e.final != null || e.practical != null || e.homework != null;
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
          // credit → stored letter; annual → تقدير band derived from % (no letter/points stored)
          letterGrade: isAnnual ? (anyMark && courseMax > 0 ? gradeFromBands((total / courseMax) * 100, bands) : null) : e.letterGrade,
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
    const { enrollmentId, midterm, final, practical, homework, statusCode } = body ?? {};
    if (!enrollmentId) return NextResponse.json({ error: 'معرف التسجيل مطلوب' }, { status: 400 });

    const e = await prisma.enrollment.findUnique({ where: { id: enrollmentId }, include: { course: true } });
    if (!e) return NextResponse.json({ error: 'التسجيل غير موجود' }, { status: 404 });

    // A locked (approved) result cannot be edited — surface a clear 423 (Locked).
    if (e.resultLocked) {
      return NextResponse.json({ error: 'النتيجة معتمدة ومغلقة — يجب إعادة الفتح قبل التعديل' }, { status: 423 });
    }

    // Validate a manual override code against the configured status table + bylaw rules.
    if (statusCode) {
      const st = await prisma.gradeStatus.findFirst({ where: { code: statusCode } });
      if (!st) return NextResponse.json({ error: 'حالة نتيجة غير معروفة' }, { status: 400 });
      if (statusCode === 'I') {
        const reg = await getRegulations();
        const courseworkMax = e.course.midtermMax + e.course.practicalMax + e.course.homeworkMax;
        const coursework = (e.midterm ?? 0) + (e.practical ?? 0) + (e.homework ?? 0);
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
