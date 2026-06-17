import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

const DEFAULTS = [
  { code: 'HOUSING', nameAr: 'بدل سكن', kind: 'EARNING', isTaxable: true },
  { code: 'TRANSPORT', nameAr: 'بدل انتقال', kind: 'EARNING', isTaxable: false },
  { code: 'LOAN', nameAr: 'خصم سلفة', kind: 'DEDUCTION', isTaxable: false },
];

export async function GET() {
  try {
    const guard = await requirePermission('payroll.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const components = await prisma.salaryComponent.findMany({ where: { universityId: guard.ctx.universityId ?? null }, orderBy: { order: 'asc' } });
    return NextResponse.json({ components: components.map((c) => ({ id: c.id, code: c.code, nameAr: c.nameAr, kind: c.kind, isTaxable: c.isTaxable, isPercentage: c.isPercentage, defaultValue: Number(c.defaultValue.toFixed(2)) })) });
  } catch (e) {
    console.error('Error listing components:', e);
    return NextResponse.json({ error: 'فشل في جلب مكونات الراتب' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('payroll.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    const uni = guard.ctx.universityId ?? null;
    if (body?.action === 'seed-default') {
      let created = 0;
      for (let i = 0; i < DEFAULTS.length; i++) {
        const d = DEFAULTS[i];
        if (await prisma.salaryComponent.findFirst({ where: { universityId: uni, code: d.code } })) continue;
        await prisma.salaryComponent.create({ data: { universityId: uni, ...d, order: i } });
        created++;
      }
      return NextResponse.json({ ok: true, created });
    }
    if (!body?.code || !body?.nameAr || !body?.kind) return NextResponse.json({ error: 'الكود والاسم والنوع مطلوبة' }, { status: 400 });
    const dup = await prisma.salaryComponent.findFirst({ where: { universityId: uni, code: body.code } });
    if (dup) return NextResponse.json({ error: 'الكود مستخدم' }, { status: 409 });
    const created = await prisma.salaryComponent.create({ data: { universityId: uni, code: body.code, nameAr: body.nameAr, kind: body.kind, isTaxable: body.isTaxable ?? true, isPercentage: body.isPercentage ?? false, defaultValue: body.defaultValue ?? 0 } });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Error creating component:', e);
    return NextResponse.json({ error: 'فشل في إضافة مكوّن الراتب' }, { status: 500 });
  }
}
