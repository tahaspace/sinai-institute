import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';
import { validateRegistration } from '@/lib/registration';
import { computeAcademicStanding } from '@/lib/standing';

const DEFAULT_TERM = { academicYear: '2024-2025', semester: 'second' };

// GET /api/student/registration?academicYear=&semester=
// Returns the offering catalog for the term, the student's current request, hour totals,
// a live validation preview and the student's standing (hour cap).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });

    const academicYear = searchParams.get('academicYear') || DEFAULT_TERM.academicYear;
    const semester = searchParams.get('semester') || DEFAULT_TERM.semester;

    const [offerings, current, standing] = await Promise.all([
      prisma.courseOffering.findMany({
        where: { academicYear, semester },
        include: {
          course: { include: { prerequisites: { select: { code: true } } } },
          sections: { include: { instructor: { select: { name: true } }, _count: { select: { items: true } } } },
        },
        orderBy: { course: { code: 'asc' } },
      }),
      prisma.registrationRequest.findUnique({
        where: { studentId_academicYear_semester: { studentId: student.id, academicYear, semester } },
        include: { items: { include: { section: { include: { offering: { include: { course: true } } } } } } },
      }),
      computeAcademicStanding(student.id),
    ]);

    // courses the student has already passed (drives the "passed" flag + prereq display)
    const [statuses, enr] = await Promise.all([
      prisma.gradeStatus.findMany({ where: { isPass: true }, select: { code: true } }),
      prisma.enrollment.findMany({ where: { studentId: student.id }, select: { courseId: true, gradeStatusCode: true } }),
    ]);
    const passCodes = new Set(statuses.map((s) => s.code));
    const passed = new Set<string>();
    for (const e of enr) if (e.gradeStatusCode && passCodes.has(e.gradeStatusCode)) passed.add(e.courseId);

    const currentSectionIds = current?.items.map((i) => i.sectionId) ?? [];
    const validation = await validateRegistration(student.id, academicYear, semester, currentSectionIds);

    return NextResponse.json({
      term: { academicYear, semester },
      student: { studentCode: student.studentCode, name: student.nameAr, level: student.level },
      standing: standing && { cgpa: standing.cgpa, onProbation: standing.onProbation, hourCap: standing.hourCap },
      catalog: offerings.map((o) => ({
        offeringId: o.id,
        courseId: o.courseId,
        code: o.course.code,
        name: o.course.nameAr,
        creditHours: o.course.creditHours,
        requirementType: o.course.requirementType,
        prerequisites: o.course.prerequisites.map((p) => p.code),
        passed: passed.has(o.courseId),
        sections: o.sections.map((s) => ({
          id: s.id,
          code: s.code,
          instructor: s.instructor?.name ?? '',
          day: s.day,
          startMin: s.startMin,
          endMin: s.endMin,
          room: s.room,
          capacity: s.capacity,
          taken: s._count.items,
        })),
      })),
      request: current && {
        id: current.id,
        status: current.status,
        note: current.note,
        sectionIds: currentSectionIds,
        items: current.items.map((i) => ({ sectionId: i.sectionId, code: i.section.offering.course.code, name: i.section.offering.course.nameAr, creditHours: i.section.offering.course.creditHours, sectionCode: i.section.code })),
      },
      validation,
    });
  } catch (error) {
    console.error('Error loading registration:', error);
    return NextResponse.json({ error: 'فشل في تحميل التسجيل' }, { status: 500 });
  }
}

// POST /api/student/registration — body { academicYear?, semester?, sectionIds?, action }
//   action: 'save' (Draft) | 'submit' (→ Pending, requires no validation errors) | 'cancel'
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const student = await resolveStudent(body?.studentCode);
    if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });

    const academicYear = body.academicYear || DEFAULT_TERM.academicYear;
    const semester = body.semester || DEFAULT_TERM.semester;
    const action: string = body.action || 'save';
    const sectionIds: string[] = Array.isArray(body.sectionIds) ? body.sectionIds : [];

    if (action === 'cancel') {
      const existing = await prisma.registrationRequest.findUnique({ where: { studentId_academicYear_semester: { studentId: student.id, academicYear, semester } } });
      if (!existing) return NextResponse.json({ error: 'لا يوجد طلب تسجيل' }, { status: 404 });
      if (existing.status === 'Approved') return NextResponse.json({ error: 'لا يمكن إلغاء طلب معتمد' }, { status: 422 });
      const updated = await prisma.registrationRequest.update({ where: { id: existing.id }, data: { status: 'Cancelled' } });
      return NextResponse.json({ ok: true, status: updated.status });
    }

    // resolve advisor from the student record (set at seed/admission)
    const advisorId = student.advisorId ?? null;

    // upsert the request and replace its items in a transaction
    const req = await prisma.$transaction(async (tx) => {
      const r = await tx.registrationRequest.upsert({
        where: { studentId_academicYear_semester: { studentId: student.id, academicYear, semester } },
        update: { advisorId },
        create: { studentId: student.id, academicYear, semester, advisorId, status: 'Draft' },
      });
      if (r.status === 'Approved') throw new Error('already-approved');
      await tx.registrationItem.deleteMany({ where: { requestId: r.id } });
      if (sectionIds.length) {
        await tx.registrationItem.createMany({ data: sectionIds.map((sectionId) => ({ requestId: r.id, sectionId })) });
      }
      return r;
    });

    const validation = await validateRegistration(student.id, academicYear, semester, sectionIds);

    let status = 'Draft';
    if (action === 'submit') {
      if (!validation.ok) {
        return NextResponse.json({ ok: false, error: 'لا يمكن إرسال الطلب — توجد أخطاء في التحقق', validation }, { status: 422 });
      }
      await prisma.registrationRequest.update({ where: { id: req.id }, data: { status: 'Pending' } });
      status = 'Pending';
    } else {
      await prisma.registrationRequest.update({ where: { id: req.id }, data: { status: 'Draft' } });
    }

    return NextResponse.json({ ok: true, status, validation });
  } catch (error) {
    if ((error as Error).message === 'already-approved') {
      return NextResponse.json({ error: 'الطلب معتمد بالفعل ولا يمكن تعديله' }, { status: 422 });
    }
    console.error('Error saving registration:', error);
    return NextResponse.json({ error: 'فشل في حفظ التسجيل' }, { status: 500 });
  }
}
