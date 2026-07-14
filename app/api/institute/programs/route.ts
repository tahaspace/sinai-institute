import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { normalizeSystem } from '@/lib/academic-system';

// GET /api/institute/programs?search=&departmentId=
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('program.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const departmentId = searchParams.get('departmentId');

    const where: Record<string, unknown> = {};
    if (departmentId && departmentId !== 'all') where.departmentId = departmentId;
    if (search) where.nameAr = { contains: search, mode: 'insensitive' };

    const programs = await prisma.program.findMany({
      where,
      include: { department: true, _count: { select: { students: true } } },
      orderBy: { nameAr: 'asc' },
    });

    return NextResponse.json({
      programs: programs.map((p) => ({
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn ?? '',
        department: p.department?.nameAr ?? '',
        departmentId: p.departmentId,
        degree: p.degree ?? '',
        years: p.years,
        totalCreditHours: p.totalCreditHours,
        description: p.description ?? '',
        isActive: p.isActive,
        academicSystem: normalizeSystem(p.academicSystem),
        students: p._count.students,
      })),
      stats: { total: programs.length },
    });
  } catch (error) {
    console.error('Error listing programs:', error);
    return NextResponse.json({ error: 'فشل في جلب البرامج' }, { status: 500 });
  }
}

// POST /api/institute/programs
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('program.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { nameAr, nameEn, departmentId, degree, years, totalCreditHours, description, academicSystem } = body ?? {};
    if (!nameAr) return NextResponse.json({ error: 'اسم البرنامج مطلوب' }, { status: 400 });

    const program = await prisma.program.create({
      data: {
        nameAr,
        nameEn: nameEn || null,
        departmentId: departmentId || null,
        degree: degree || null,
        years: years ? parseInt(String(years), 10) : 4,
        totalCreditHours: totalCreditHours ? parseInt(String(totalCreditHours), 10) : 0,
        description: description || null,
        academicSystem: normalizeSystem(academicSystem),
      },
    });
    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    console.error('Error creating program:', error);
    return NextResponse.json({ error: 'فشل في إضافة البرنامج' }, { status: 500 });
  }
}

// PATCH /api/institute/programs — update by id.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('program.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, ...data } = body ?? {};
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    if (typeof data.years !== 'undefined') data.years = parseInt(String(data.years), 10);
    if (typeof data.totalCreditHours !== 'undefined') data.totalCreditHours = parseInt(String(data.totalCreditHours), 10);
    if ('academicSystem' in data) data.academicSystem = normalizeSystem(data.academicSystem);

    const program = await prisma.program.update({ where: { id }, data });
    return NextResponse.json(program);
  } catch (error) {
    console.error('Error updating program:', error);
    return NextResponse.json({ error: 'فشل في تحديث البرنامج' }, { status: 500 });
  }
}
