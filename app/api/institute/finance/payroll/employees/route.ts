import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

export async function GET() {
  try {
    const guard = await requirePermission('payroll.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const employees = await prisma.employee.findMany({ where: { universityId: guard.ctx.universityId ?? null }, orderBy: { code: 'asc' } });
    return NextResponse.json({ employees: employees.map((e) => ({ id: e.id, code: e.code, nameAr: e.nameAr, jobTitle: e.jobTitle, department: e.department, baseSalary: Number(e.baseSalary.toFixed(2)), isActive: e.isActive })) });
  } catch (e) {
    console.error('Error listing employees:', e);
    return NextResponse.json({ error: 'فشل في جلب الموظفين' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('payroll.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();

    // Bootstrap employees from existing Instructor records (idempotent).
    if (body?.action === 'import-instructors') {
      const instructors = await prisma.instructor.findMany({ where: guard.ctx.universityId ? { universityId: guard.ctx.universityId } : {} });
      let created = 0;
      for (const ins of instructors) {
        const code = `EMP-${ins.id.slice(-6)}`;
        const exists = await prisma.employee.findFirst({ where: { universityId: guard.ctx.universityId ?? null, code } });
        if (exists) continue;
        await prisma.employee.create({ data: { universityId: guard.ctx.universityId ?? null, code, nameAr: ins.name, instructorId: ins.id, jobTitle: ins.title ?? 'عضو هيئة تدريس', baseSalary: 8000, isActive: true } });
        created++;
      }
      return NextResponse.json({ ok: true, created });
    }

    if (!body?.code || !body?.nameAr) return NextResponse.json({ error: 'الكود والاسم مطلوبان' }, { status: 400 });
    const dup = await prisma.employee.findFirst({ where: { universityId: guard.ctx.universityId ?? null, code: body.code } });
    if (dup) return NextResponse.json({ error: 'الكود مستخدم' }, { status: 409 });
    const created = await prisma.employee.create({
      data: { universityId: guard.ctx.universityId ?? null, code: body.code, nameAr: body.nameAr, jobTitle: body.jobTitle ?? null, department: body.department ?? null, baseSalary: body.baseSalary ?? 0, isActive: true },
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Error creating employee:', e);
    return NextResponse.json({ error: 'فشل في إضافة الموظف' }, { status: 500 });
  }
}
