import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

const DEFAULTS = [
  { code: 'VAT14', nameAr: 'ضريبة القيمة المضافة 14%', rateType: 'VAT', rate: 14 },
  { code: 'WHT3', nameAr: 'خصم وإضافة 3%', rateType: 'WITHHOLDING', rate: 3 },
];

export async function GET() {
  try {
    const guard = await requirePermission('finance.einvoice.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const rates = await prisma.taxRate.findMany({ where: { universityId: guard.ctx.universityId ?? null }, orderBy: { code: 'asc' } });
    return NextResponse.json({ rates: rates.map((r) => ({ id: r.id, code: r.code, nameAr: r.nameAr, rateType: r.rateType, rate: Number(r.rate), isActive: r.isActive })) });
  } catch (e) {
    console.error('Error listing tax rates:', e);
    return NextResponse.json({ error: 'فشل في جلب نسب الضرائب' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.einvoice.create');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uni = guard.ctx.universityId ?? null;
    const body = await request.json();
    if (body?.action === 'seed-default') {
      let created = 0;
      for (const d of DEFAULTS) {
        if (await prisma.taxRate.findFirst({ where: { universityId: uni, code: d.code } })) continue;
        await prisma.taxRate.create({ data: { universityId: uni, ...d } });
        created++;
      }
      return NextResponse.json({ ok: true, created });
    }
    if (!body?.code || !body?.nameAr || !body?.rateType) return NextResponse.json({ error: 'الكود والاسم والنوع مطلوبة' }, { status: 400 });
    const dup = await prisma.taxRate.findFirst({ where: { universityId: uni, code: body.code } });
    if (dup) return NextResponse.json({ error: 'الكود مستخدم' }, { status: 409 });
    const created = await prisma.taxRate.create({ data: { universityId: uni, code: body.code, nameAr: body.nameAr, rateType: body.rateType, rate: body.rate ?? 0 } });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Error creating tax rate:', e);
    return NextResponse.json({ error: 'فشل في إضافة نسبة الضريبة' }, { status: 500 });
  }
}
