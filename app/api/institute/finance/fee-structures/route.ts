import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// Reusable fee-structure templates (Finance v2 — Phase 2).
export async function GET() {
  try {
    const guard = await requirePermission('finance.tuition.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const structures = await prisma.feeStructure.findMany({
      where: { universityId: guard.ctx.universityId ?? null },
      include: { items: { orderBy: { order: 'asc' } } },
      orderBy: { code: 'asc' },
    });
    return NextResponse.json({
      structures: structures.map((s) => ({
        id: s.id, code: s.code, nameAr: s.nameAr, level: s.level, academicYear: s.academicYear, isActive: s.isActive,
        total: Number(s.items.reduce((t, it) => t + Number(it.amount) * (1 + it.vatRate / 100), 0).toFixed(2)),
        items: s.items.map((it) => ({ id: it.id, label: it.label, accountCode: it.accountCode, amount: Number(Number(it.amount).toFixed(2)), vatRate: it.vatRate })),
      })),
    });
  } catch (e) {
    console.error('Error listing fee structures:', e);
    return NextResponse.json({ error: 'فشل في جلب هياكل الرسوم' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.tuition.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    const { code, nameAr, items } = body ?? {};
    if (!code || !nameAr || !Array.isArray(items) || !items.length) return NextResponse.json({ error: 'الكود والاسم والبنود مطلوبة' }, { status: 400 });
    const dup = await prisma.feeStructure.findFirst({ where: { universityId: guard.ctx.universityId ?? null, code } });
    if (dup) return NextResponse.json({ error: 'الكود مستخدم بالفعل' }, { status: 409 });
    const created = await prisma.feeStructure.create({
      data: {
        universityId: guard.ctx.universityId ?? null, code, nameAr, nameEn: body.nameEn ?? null,
        level: body.level ?? null, academicYear: body.academicYear ?? null, isActive: true,
        items: { create: items.map((it: { label: string; amount: number; accountCode?: string; vatRate?: number }, i: number) => ({ label: it.label, amount: it.amount, accountCode: it.accountCode ?? '4100', vatRate: it.vatRate ?? 0, order: i })) },
      },
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Error creating fee structure:', e);
    return NextResponse.json({ error: 'فشل في إضافة هيكل الرسوم' }, { status: 500 });
  }
}
