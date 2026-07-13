import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Branch / campus management (ClientR4) — the location dimension for branch-comparison profitability.
export async function GET() {
  try {
    const guard = await requirePermission('finance.costcenter.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const branches = await prisma.branch.findMany({ where: { universityId: guard.ctx.universityId ?? null }, orderBy: { code: 'asc' } });
    return NextResponse.json({ branches: branches.map((b) => ({ id: b.id, code: b.code, nameAr: b.nameAr, nameEn: b.nameEn, isActive: b.isActive })) });
  } catch (e) {
    console.error('Error listing branches:', e);
    return NextResponse.json({ error: 'فشل في جلب الفروع' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.costcenter.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const body = await request.json();
    if (!body?.code || !body?.nameAr) return NextResponse.json({ error: 'الكود والاسم مطلوبان' }, { status: 400 });
    const dup = await prisma.branch.findFirst({ where: { universityId: uid, code: body.code } });
    if (dup) return NextResponse.json({ error: 'الكود مستخدم بالفعل' }, { status: 409 });
    const created = await prisma.branch.create({ data: { universityId: uid, code: body.code, nameAr: body.nameAr, nameEn: body.nameEn ?? null } });
    await writeAudit('finance.branch.create', { targetType: 'Branch', targetId: created.id, universityId: uid, metadata: { code: body.code } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Error creating branch:', e);
    return NextResponse.json({ error: 'فشل في إنشاء الفرع' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.costcenter.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const body = await request.json();
    if (!body?.id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    const existing = await prisma.branch.findFirst({ where: { id: body.id, universityId: uid } });
    if (!existing) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    const data: { nameAr?: string; nameEn?: string | null; isActive?: boolean } = {};
    if (typeof body.nameAr === 'string') data.nameAr = body.nameAr;
    if (body.nameEn === null || typeof body.nameEn === 'string') data.nameEn = body.nameEn;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    const updated = await prisma.branch.update({ where: { id: body.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Error updating branch:', e);
    return NextResponse.json({ error: 'فشل في تحديث الفرع' }, { status: 500 });
  }
}
