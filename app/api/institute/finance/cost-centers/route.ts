import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Cost-centre management (ClientR4). The profitability dimension: each centre optionally links to a
// programme / faculty / branch so the profitability reports can roll up. View = finance.costcenter.view,
// create/edit = finance.costcenter.edit.
const TYPES = ['ACADEMIC', 'ADMIN', 'OPERATIONAL', 'BRANCH'];

export async function GET() {
  try {
    const guard = await requirePermission('finance.costcenter.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const [centres, branches, programs, faculties] = await Promise.all([
      prisma.costCenter.findMany({ where: { universityId: uid }, orderBy: [{ type: 'asc' }, { code: 'asc' }] }),
      prisma.branch.findMany({ where: { universityId: uid, isActive: true }, select: { id: true, nameAr: true } }),
      prisma.program.findMany({ where: { universityId: uid ?? undefined }, select: { id: true, nameAr: true } }),
      prisma.faculty.findMany({ where: { universityId: uid ?? undefined }, select: { id: true, nameAr: true } }),
    ]);
    return NextResponse.json({
      centres: centres.map((c) => ({ id: c.id, code: c.code, nameAr: c.nameAr, nameEn: c.nameEn, type: c.type, parentId: c.parentId, branchId: c.branchId, programId: c.programId, facultyId: c.facultyId, isActive: c.isActive })),
      options: { types: TYPES, branches, programs, faculties },
    });
  } catch (e) {
    console.error('Error listing cost centres:', e);
    return NextResponse.json({ error: 'فشل في جلب مراكز التكلفة' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.costcenter.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const body = await request.json();
    if (!body?.code || !body?.nameAr) return NextResponse.json({ error: 'الكود والاسم مطلوبان' }, { status: 400 });
    const type = TYPES.includes(body.type) ? body.type : 'ADMIN';
    const dup = await prisma.costCenter.findFirst({ where: { universityId: uid, code: body.code } });
    if (dup) return NextResponse.json({ error: 'الكود مستخدم بالفعل' }, { status: 409 });
    const created = await prisma.costCenter.create({
      data: { universityId: uid, code: body.code, nameAr: body.nameAr, nameEn: body.nameEn ?? null, type, parentId: body.parentId || null, branchId: body.branchId || null, programId: body.programId || null, facultyId: body.facultyId || null },
    });
    await writeAudit('finance.costcenter.create', { targetType: 'CostCenter', targetId: created.id, universityId: uid, metadata: { code: body.code, type } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Error creating cost centre:', e);
    return NextResponse.json({ error: 'فشل في إنشاء مركز التكلفة' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.costcenter.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const body = await request.json();
    if (!body?.id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    const existing = await prisma.costCenter.findFirst({ where: { id: body.id, universityId: uid } });
    if (!existing) return NextResponse.json({ error: 'مركز التكلفة غير موجود' }, { status: 404 });
    const data: { nameAr?: string; nameEn?: string | null; type?: string; parentId?: string | null; branchId?: string | null; programId?: string | null; facultyId?: string | null; isActive?: boolean } = {};
    if (typeof body.nameAr === 'string') data.nameAr = body.nameAr;
    if (body.nameEn === null || typeof body.nameEn === 'string') data.nameEn = body.nameEn;
    if (TYPES.includes(body.type)) data.type = body.type;
    if ('parentId' in body) data.parentId = body.parentId || null;
    if ('branchId' in body) data.branchId = body.branchId || null;
    if ('programId' in body) data.programId = body.programId || null;
    if ('facultyId' in body) data.facultyId = body.facultyId || null;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    const updated = await prisma.costCenter.update({ where: { id: body.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Error updating cost centre:', e);
    return NextResponse.json({ error: 'فشل في تحديث مركز التكلفة' }, { status: 500 });
  }
}
