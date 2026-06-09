import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { courseResults, gradeSheet, standingReport, ministryPrep, passFailRoster, studentStatus, ministrySheet, successStats, type MinistryStage } from '@/lib/reports';
import { computeAcademicStanding } from '@/lib/standing';

// GET /api/institute/reports?type=&courseId=&studentCode=&academicYear=&semester=
// Registrar report suite. type ∈ course-results | grade-sheet | pass-fail | warned |
// expected-graduates | ministry-prep | ministry-transitional | ministry-final |
// ministry-deprived | student-status | success-stats | transcript.
// Returns the course picker list too.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('reports.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'course-results';
    const courseId = searchParams.get('courseId') || undefined;
    const studentCode = searchParams.get('studentCode') || undefined;
    const f = {
      academicYear: searchParams.get('academicYear') || undefined,
      semester: searchParams.get('semester') || undefined,
    };

    const courses = await prisma.course.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, nameAr: true } });

    let report: unknown = null;
    switch (type) {
      case 'course-results':
        report = await courseResults(f);
        break;
      case 'grade-sheet':
        report = courseId ? await gradeSheet(courseId, f) : { error: 'courseId مطلوب' };
        break;
      case 'warned':
        report = await standingReport('warned');
        break;
      case 'expected-graduates':
        report = await standingReport('expected-graduates');
        break;
      case 'ministry-prep':
        report = courseId ? await ministryPrep(courseId, f) : { error: 'courseId مطلوب' };
        break;
      case 'pass-fail':
        report = courseId ? await passFailRoster(courseId, f) : { error: 'courseId مطلوب' };
        break;
      case 'student-status':
        report = studentCode ? await studentStatus(studentCode) : { error: 'studentCode مطلوب' };
        break;
      case 'ministry-transitional':
      case 'ministry-final':
      case 'ministry-deprived': {
        const stage = type.replace('ministry-', '') as MinistryStage;
        report = await ministrySheet(stage, f);
        break;
      }
      case 'success-stats':
        report = await successStats(f);
        break;
      case 'transcript': {
        if (!studentCode) { report = { error: 'studentCode مطلوب' }; break; }
        report = await buildTranscript(studentCode);
        break;
      }
      default:
        return NextResponse.json({ error: 'نوع تقرير غير معروف' }, { status: 400 });
    }

    return NextResponse.json({ type, courses, report });
  } catch (error) {
    console.error('Error building report:', error);
    return NextResponse.json({ error: 'فشل في إنشاء التقرير' }, { status: 500 });
  }
}

// Full academic transcript (كشف الدرجات) for one student: terms with courses + standing.
async function buildTranscript(studentCode: string) {
  const student = await prisma.student.findUnique({ where: { studentCode } });
  if (!student) return { error: 'الطالب غير موجود' };
  const [enrollments, statuses, standing] = await Promise.all([
    prisma.enrollment.findMany({ where: { studentId: student.id }, include: { course: true }, orderBy: [{ academicYear: 'asc' }, { semester: 'asc' }, { course: { code: 'asc' } }] }),
    prisma.gradeStatus.findMany(),
    computeAcademicStanding(student.id),
  ]);
  const nameByCode = new Map(statuses.map((s) => [s.code, s.name]));

  const terms = new Map<string, { academicYear: string; semester: string; courses: { code: string; name: string; creditHours: number; statusCode: string | null; statusName: string | null; points: number | null }[] }>();
  for (const e of enrollments) {
    const key = `${e.academicYear}|${e.semester}`;
    const t = terms.get(key) ?? { academicYear: e.academicYear, semester: e.semester, courses: [] };
    t.courses.push({
      code: e.course.code,
      name: e.course.nameAr,
      creditHours: e.course.creditHours,
      statusCode: e.gradeStatusCode,
      statusName: e.gradeStatusCode ? nameByCode.get(e.gradeStatusCode) ?? null : null,
      points: e.points,
    });
    terms.set(key, t);
  }

  return {
    student: { studentCode: student.studentCode, name: student.nameAr, level: student.level },
    standing,
    terms: [...terms.values()],
  };
}
