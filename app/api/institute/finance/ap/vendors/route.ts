import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

export async function GET() {
  try {
    const guard = await requirePermission('finance.vendor.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const vendors = await prisma.vendor.findMany({ where: { universityId: guard.ctx.universityId ?? null }, orderBy: { code: 'asc' } });
    return NextResponse.json({ vendors: vendors.map((v) => ({ id: v.id, code: v.code, nameAr: v.nameAr, taxRegNo: v.taxRegNo, withholdingRate: v.withholdingRate, isActive: v.isActive })) });
  } catch (e) {
    console.error('Error listing vendors:', e);
    return NextResponse.json({ error: 'فشل في جلب الموردين' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.vendor.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    if (!body?.code || !body?.nameAr) return NextResponse.json({ error: 'الكود والاسم مطلوبان' }, { status: 400 });
    const dup = await prisma.vendor.findFirst({ where: { universityId: guard.ctx.universityId ?? null, code: body.code } });
    if (dup) return NextResponse.json({ error: 'الكود مستخدم' }, { status: 409 });
    const created = await prisma.vendor.create({
      data: { universityId: guard.ctx.universityId ?? null, code: body.code, nameAr: body.nameAr, nameEn: body.nameEn ?? null, taxRegNo: body.taxRegNo ?? null, phone: body.phone ?? null, email: body.email ?? null, withholdingRate: body.withholdingRate ?? 0 },
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Error creating vendor:', e);
    return NextResponse.json({ error: 'فشل في إضافة المورد' }, { status: 500 });
  }
}
