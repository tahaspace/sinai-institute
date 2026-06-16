import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { seedChartOfAccounts } from '@/lib/finance/coa';

// Chart of Accounts (Finance v2 — Phase 1). Tenant-scoped via the caller's universityId.

export async function GET() {
  try {
    const guard = await requirePermission('finance.gl.account.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const accounts = await prisma.chartOfAccount.findMany({
      where: { universityId: guard.ctx.universityId ?? null },
      orderBy: { code: 'asc' },
    });
    return NextResponse.json({
      accounts: accounts.map((a) => ({
        id: a.id, code: a.code, nameAr: a.nameAr, nameEn: a.nameEn, type: a.type,
        normalSide: a.normalSide, parentId: a.parentId, isPostable: a.isPostable, isActive: a.isActive,
      })),
      stats: { total: accounts.length, postable: accounts.filter((a) => a.isPostable).length },
    });
  } catch (e) {
    console.error('Error listing accounts:', e);
    return NextResponse.json({ error: 'فشل في جلب دليل الحسابات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.gl.account.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();

    // Bootstrap the default chart for this tenant.
    if (body?.action === 'seed-default') {
      const created = await seedChartOfAccounts(guard.ctx.universityId ?? null);
      return NextResponse.json({ ok: true, created });
    }

    const { code, nameAr, type, normalSide } = body ?? {};
    if (!code || !nameAr || !type || !normalSide) return NextResponse.json({ error: 'الكود والاسم والنوع والطبيعة مطلوبة' }, { status: 400 });
    const dup = await prisma.chartOfAccount.findFirst({ where: { universityId: guard.ctx.universityId ?? null, code } });
    if (dup) return NextResponse.json({ error: 'كود الحساب مستخدم بالفعل' }, { status: 409 });
    let parentId: string | null = null;
    if (body.parentCode) {
      const parent = await prisma.chartOfAccount.findFirst({ where: { universityId: guard.ctx.universityId ?? null, code: body.parentCode } });
      parentId = parent?.id ?? null;
    }
    const created = await prisma.chartOfAccount.create({
      data: { universityId: guard.ctx.universityId ?? null, code, nameAr, nameEn: body.nameEn ?? null, type, normalSide, parentId, isPostable: body.isPostable ?? true, isActive: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Error creating account:', e);
    return NextResponse.json({ error: 'فشل في إضافة الحساب' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.gl.account.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    if (!body?.id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    const data: Record<string, unknown> = {};
    if (typeof body.nameAr === 'string') data.nameAr = body.nameAr;
    if (body.nameEn === null || typeof body.nameEn === 'string') data.nameEn = body.nameEn;
    if (typeof body.isPostable === 'boolean') data.isPostable = body.isPostable;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    const updated = await prisma.chartOfAccount.update({ where: { id: body.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Error updating account:', e);
    return NextResponse.json({ error: 'فشل في تحديث الحساب' }, { status: 500 });
  }
}
