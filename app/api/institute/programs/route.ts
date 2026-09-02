import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { normalizeSystem, normalizeSystemFilter, programSystemWhere } from '@/lib/academic-system';

// GET /api/institute/programs?search=&departmentId=&system=
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('program.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const departmentId = searchParams.get('departmentId');
    // «النظام الأكاديمي» narrowing. Absent/'all' → normalizeSystemFilter yields undefined and
    // programSystemWhere yields {}, so the unfiltered query stays exactly what it was.
    const system = normalizeSystemFilter(searchParams.get('system'));

    const where: Record<string, unknown> = { ...programSystemWhere(system) };
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
    // Required, never defaulted: the programme IS where a student's academic system comes from, so an
    // omitted value would silently create a credit-hours programme — and every student later admitted
    // or imported into it inherits that, discovered only when they are graded on the wrong engine.
    // A once-per-programme admin decision has no legitimate "unspecified" case.
    if (academicSystem !== 'CREDIT_HOURS' && academicSystem !== 'ANNUAL') {
      return NextResponse.json(
        { error: 'النظام الأكاديمي مطلوب — اختر «نظام الساعات المعتمدة» أو «النظام السنوي (العادي)»' },
        { status: 400 },
      );
    }

    const program = await prisma.program.create({
      data: {
        nameAr,
        nameEn: nameEn || null,
        departmentId: departmentId || null,
        degree: degree || null,
        years: years ? parseInt(String(years), 10) : 4,
        totalCreditHours: totalCreditHours ? parseInt(String(totalCreditHours), 10) : 0,
        description: description || null,
        academicSystem,
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
