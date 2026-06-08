import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveInstructor } from '@/lib/student';
import { validateRegistration } from '@/lib/registration';

// GET /api/faculty/registration?status=Pending — requests awaiting the advisor's decision,
// each with its section lines and a fresh validation summary.
export async function GET(request: NextRequest) {
  try {
    const advisor = await resolveInstructor();
    if (!advisor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'Pending';

    const requests = await prisma.registrationRequest.findMany({
      where: { advisorId: advisor.id, status },
      include: {
        student: { select: { studentCode: true, nameAr: true, level: true } },
        items: { include: { section: { include: { offering: { include: { course: true } } } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const rows = [];
    for (const r of requests) {
      const validation = await validateRegistration(r.studentId, r.academicYear, r.semester, r.items.map((i) => i.sectionId));
      rows.push({
        id: r.id,
        student: r.student,
        academicYear: r.academicYear,
        semester: r.semester,
        status: r.status,
        totalHours: validation.totalHours,
        validation,
        items: r.items.map((i) => ({ code: i.section.offering.course.code, name: i.section.offering.course.nameAr, creditHours: i.section.offering.course.creditHours, sectionCode: i.section.code })),
      });
    }

    return NextResponse.json({ rows, count: rows.length });
  } catch (error) {
    console.error('Error loading registration requests:', error);
    return NextResponse.json({ error: 'فشل في جلب طلبات التسجيل' }, { status: 500 });
  }
}

// PATCH /api/faculty/registration — bulk decision.
// body { requestIds: string[], action: 'approve'|'reject'|'return', note?: string }
// approve → materializes Enrollment rows (ENROLLED) from the request's sections.
export async function PATCH(request: NextRequest) {
  try {
    const advisor = await resolveInstructor();
    if (!advisor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    const body = await request.json();
    const requestIds: string[] = Array.isArray(body?.requestIds) ? body.requestIds : [];
    const action: string = body?.action;
    const note: string | undefined = body?.note;
    if (!requestIds.length || !['approve', 'reject', 'return'].includes(action)) {
      return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
    }

    const statusMap: Record<string, string> = { approve: 'Approved', reject: 'Rejected', return: 'Returned' };
    const results: { id: string; status?: string; error?: string; enrolled?: number }[] = [];

    for (const id of requestIds) {
      const req = await prisma.registrationRequest.findFirst({
        where: { id, advisorId: advisor.id },
        include: { items: { include: { section: { include: { offering: true } } } } },
      });
      if (!req) { results.push({ id, error: 'غير موجود' }); continue; }

      if (action === 'approve') {
        // re-validate at decision time; never approve a request with hard errors
        const validation = await validateRegistration(req.studentId, req.academicYear, req.semester, req.items.map((i) => i.sectionId));
        if (!validation.ok) { results.push({ id, error: 'يحتوي على أخطاء تحقق' }); continue; }

        const enrolled = await prisma.$transaction(async (tx) => {
          let count = 0;
          for (const it of req.items) {
            const courseId = it.section.offering.courseId;
            await tx.enrollment.upsert({
              where: { studentId_courseId_academicYear_semester: { studentId: req.studentId, courseId, academicYear: req.academicYear, semester: req.semester } },
              update: { status: 'ENROLLED' },
              create: { studentId: req.studentId, courseId, academicYear: req.academicYear, semester: req.semester, status: 'ENROLLED' },
            });
            count++;
          }
          await tx.registrationRequest.update({ where: { id: req.id }, data: { status: 'Approved', note: note ?? null, decidedAt: new Date() } });
          return count;
        });
        results.push({ id, status: 'Approved', enrolled });
      } else {
        await prisma.registrationRequest.update({ where: { id: req.id }, data: { status: statusMap[action], note: note ?? null, decidedAt: new Date() } });
        results.push({ id, status: statusMap[action] });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('Error deciding registration:', error);
    return NextResponse.json({ error: 'فشل في معالجة الطلبات' }, { status: 500 });
  }
}
