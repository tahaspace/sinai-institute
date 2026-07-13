import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// HR org-structure config (ClientR4 — R4c-1): administrative departments, sections, employee types,
// job titles, positions. One route for the five config entities. View = hr.org.view, edit = hr.org.edit.

const EMPLOYEE_TYPES_SEED = [
  { code: 'FACULTY', nameAr: 'أعضاء هيئة تدريس', order: 1 },
  { code: 'ASSISTANT', nameAr: 'هيئة معاونة', order: 2 },
  { code: 'ADMIN', nameAr: 'إداريون', order: 3 },
  { code: 'LABOR', nameAr: 'عمال وخدمات', order: 4 },
  { code: 'SECURITY', nameAr: 'أمن', order: 5 },
  { code: 'TECH', nameAr: 'فنيون', order: 6 },
  { code: 'LEADERSHIP', nameAr: 'قيادات إدارية', order: 7 },
];

export async function GET() {
  try {
    const guard = await requirePermission('hr.org.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const [adminDepartments, sections, employeeTypes, jobTitles, positions] = await Promise.all([
      prisma.adminDepartment.findMany({ where: { universityId: uid }, orderBy: { code: 'asc' } }),
      prisma.adminSection.findMany({ where: { universityId: uid }, orderBy: { nameAr: 'asc' } }),
      prisma.employeeType.findMany({ where: { universityId: uid }, orderBy: { order: 'asc' } }),
      prisma.jobTitle.findMany({ where: { universityId: uid }, orderBy: [{ jobLevel: 'asc' }, { code: 'asc' }] }),
      prisma.position.findMany({ where: { universityId: uid }, orderBy: { code: 'asc' } }),
    ]);
    return NextResponse.json({ adminDepartments, sections, employeeTypes, jobTitles, positions });
  } catch (e) {
    console.error('Error loading HR org:', e);
    return NextResponse.json({ error: 'فشل في جلب الهيكل الإداري' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.org.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const body = await request.json();
    const entity = body?.entity as string;

    // one-shot seed of the standard employee-type catalogue
    if (entity === 'seed-employee-types') {
      let added = 0;
      for (const t of EMPLOYEE_TYPES_SEED) {
        const exists = await prisma.employeeType.findFirst({ where: { universityId: uid, code: t.code } });
        if (!exists) { await prisma.employeeType.create({ data: { universityId: uid, ...t } }); added++; }
      }
      return NextResponse.json({ ok: true, added });
    }

    if (!body?.nameAr) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    let created: unknown;
    switch (entity) {
      case 'adminDepartment':
        created = await prisma.adminDepartment.create({ data: { universityId: uid, code: body.code, nameAr: body.nameAr, nameEn: body.nameEn ?? null, parentId: body.parentId || null, isAcademic: !!body.isAcademic } });
        break;
      case 'section':
        if (!body.adminDepartmentId) return NextResponse.json({ error: 'الإدارة مطلوبة' }, { status: 400 });
        created = await prisma.adminSection.create({ data: { universityId: uid, adminDepartmentId: body.adminDepartmentId, code: body.code ?? null, nameAr: body.nameAr, nameEn: body.nameEn ?? null } });
        break;
      case 'employeeType':
        created = await prisma.employeeType.create({ data: { universityId: uid, code: body.code, nameAr: body.nameAr, order: body.order ?? 50 } });
        break;
      case 'jobTitle':
        created = await prisma.jobTitle.create({ data: { universityId: uid, code: body.code, nameAr: body.nameAr, nameEn: body.nameEn ?? null, employeeTypeId: body.employeeTypeId || null, jobLevel: body.jobLevel ?? 1, isAcademic: !!body.isAcademic, isManagerial: !!body.isManagerial } });
        break;
      case 'position':
        created = await prisma.position.create({ data: { universityId: uid, code: body.code, nameAr: body.nameAr, nameEn: body.nameEn ?? null } });
        break;
      default:
        return NextResponse.json({ error: 'نوع غير معروف' }, { status: 400 });
    }
    await writeAudit('hr.org.create', { targetType: entity, universityId: uid, metadata: { nameAr: body.nameAr } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Error creating HR org entity:', e);
    return NextResponse.json({ error: 'فشل في الإضافة (تحقق من عدم تكرار الكود)' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.org.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    const { entity, id } = body ?? {};
    if (!entity || !id) return NextResponse.json({ error: 'النوع والمعرف مطلوبان' }, { status: 400 });
    const pick = (keys: string[]) => Object.fromEntries(keys.filter((k) => k in body).map((k) => [k, body[k]]));
    let updated: unknown;
    switch (entity) {
      case 'adminDepartment': updated = await prisma.adminDepartment.update({ where: { id }, data: pick(['nameAr', 'nameEn', 'isActive', 'isAcademic', 'parentId']) }); break;
      case 'section': updated = await prisma.adminSection.update({ where: { id }, data: pick(['nameAr', 'nameEn', 'isActive', 'adminDepartmentId']) }); break;
      case 'employeeType': updated = await prisma.employeeType.update({ where: { id }, data: pick(['nameAr', 'order', 'isActive']) }); break;
      case 'jobTitle': updated = await prisma.jobTitle.update({ where: { id }, data: pick(['nameAr', 'nameEn', 'isActive', 'isAcademic', 'isManagerial', 'jobLevel', 'employeeTypeId']) }); break;
      case 'position': updated = await prisma.position.update({ where: { id }, data: pick(['nameAr', 'nameEn', 'isActive']) }); break;
      default: return NextResponse.json({ error: 'نوع غير معروف' }, { status: 400 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Error updating HR org entity:', e);
    return NextResponse.json({ error: 'فشل في التحديث' }, { status: 500 });
  }
}
