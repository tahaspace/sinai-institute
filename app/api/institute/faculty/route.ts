import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/faculty?search=&departmentId=
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.staff.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const departmentId = searchParams.get('departmentId');

    const where: Record<string, unknown> = {};
    if (departmentId && departmentId !== 'all') where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const faculty = await prisma.instructor.findMany({
      where,
      include: { department: true, _count: { select: { courses: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      faculty: faculty.map((f) => ({
        id: f.id,
        name: f.name,
        email: f.email ?? '',
        phone: f.phone ?? '',
        title: f.title ?? '',
        department: f.department?.nameAr ?? '',
        departmentId: f.departmentId,
        specialization: f.specialization ?? '',
        courses: f._count.courses,
      })),
      stats: { total: faculty.length },
    });
  } catch (error) {
    console.error('Error listing faculty:', error);
    return NextResponse.json({ error: 'فشل في جلب أعضاء هيئة التدريس' }, { status: 500 });
  }
}

// POST /api/institute/faculty — create an instructor (+ optional FACULTY login later).
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.staff.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { name, email, phone, title, departmentId, specialization } = body ?? {};
    if (!name) return NextResponse.json({ error: 'اسم عضو هيئة التدريس مطلوب' }, { status: 400 });

    const instructor = await prisma.instructor.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        title: title || null,
        departmentId: departmentId || null,
        specialization: specialization || null,
      },
    });
    return NextResponse.json(instructor, { status: 201 });
  } catch (error) {
    console.error('Error creating instructor:', error);
    return NextResponse.json({ error: 'فشل في إضافة عضو هيئة التدريس' }, { status: 500 });
  }
}

// PATCH /api/institute/faculty — update by id.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.staff.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, ...data } = body ?? {};
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const instructor = await prisma.instructor.update({ where: { id }, data });
    return NextResponse.json(instructor);
  } catch (error) {
    console.error('Error updating instructor:', error);
    return NextResponse.json({ error: 'فشل في تحديث عضو هيئة التدريس' }, { status: 500 });
  }
}
