import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Survey / evaluation definitions (ClientR3 — polish). The Quality function owns these: it creates
// satisfaction + course-evaluation surveys; the captured responses feed the quality KPIs. View is
// gated by quality.view, creation by quality.edit.

const TYPES = ['STUDENT_SATISFACTION', 'FACULTY_SATISFACTION', 'COURSE_EVALUATION'];

// GET — list surveys for the tenant (optionally ?active=1) with response counts.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('quality.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const onlyActive = new URL(request.url).searchParams.get('active') === '1';
    const surveys = await prisma.survey.findMany({
      where: { universityId: guard.ctx.universityId ?? null, ...(onlyActive ? { isActive: true } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { responses: true } } },
    });
    return NextResponse.json({
      surveys: surveys.map((s) => ({ id: s.id, title: s.title, type: s.type, academicYear: s.academicYear, semester: s.semester, isActive: s.isActive, responses: s._count.responses, createdAt: s.createdAt })),
      types: TYPES,
    });
  } catch (error) {
    console.error('Error listing surveys:', error);
    return NextResponse.json({ error: 'فشل في جلب الاستبيانات' }, { status: 500 });
  }
}

// POST — create a survey.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('quality.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { title } = body ?? {};
    if (!title || typeof title !== 'string') return NextResponse.json({ error: 'عنوان الاستبيان مطلوب' }, { status: 400 });
    const type = TYPES.includes(body.type) ? body.type : null;
    if (!type) return NextResponse.json({ error: 'نوع الاستبيان غير صالح' }, { status: 400 });

    const created = await prisma.survey.create({
      data: {
        universityId: guard.ctx.universityId ?? null,
        title, type,
        academicYear: typeof body.academicYear === 'string' ? body.academicYear : null,
        semester: typeof body.semester === 'string' ? body.semester : null,
        isActive: body.isActive ?? true,
      },
    });
    await writeAudit('survey.create', { targetType: 'Survey', targetId: created.id, universityId: guard.ctx.universityId ?? null, metadata: { type } });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json({ error: 'فشل في إنشاء الاستبيان' }, { status: 500 });
  }
}

// PATCH — toggle/edit a survey (e.g. close it).
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('quality.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id } = body ?? {};
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    const existing = await prisma.survey.findFirst({ where: { id, universityId: guard.ctx.universityId ?? null } });
    if (!existing) return NextResponse.json({ error: 'الاستبيان غير موجود' }, { status: 404 });

    const data: { title?: string; isActive?: boolean } = {};
    if (typeof body.title === 'string') data.title = body.title;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    const updated = await prisma.survey.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating survey:', error);
    return NextResponse.json({ error: 'فشل في تحديث الاستبيان' }, { status: 500 });
  }
}
