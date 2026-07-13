import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// HR employee directory (ClientR4 — R4c-1). List + create the employee 360 record. View =
// hr.employee.view, create = hr.employee.edit. Org config entities are resolved by lookup.

const PROFILE_KEYS = ['nameAr', 'nameEn', 'nationalId', 'birthDate', 'gender', 'maritalStatus', 'phone', 'email', 'address', 'employeeTypeId', 'jobTitleId', 'positionId', 'adminDepartmentId', 'sectionId', 'managerId', 'contractType', 'contractStart', 'contractEnd', 'hrStatus', 'iban', 'payMethod', 'bankAccount', 'taxCardNo', 'insuranceNo', 'baseSalary', 'hireDate'];
const DATE_KEYS = new Set(['birthDate', 'contractStart', 'contractEnd', 'hireDate']);

function buildProfileData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const k of PROFILE_KEYS) {
    if (!(k in body)) continue;
    const v = body[k];
    if (DATE_KEYS.has(k)) data[k] = v ? new Date(v as string) : null;
    else if (k === 'baseSalary') data[k] = v == null || v === '' ? 0 : Number(v);
    else data[k] = v === '' ? null : v;
  }
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.employee.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const sp = new URL(request.url).searchParams;
    const where: Record<string, unknown> = { universityId: uid };
    if (sp.get('adminDepartmentId')) where.adminDepartmentId = sp.get('adminDepartmentId');
    if (sp.get('employeeTypeId')) where.employeeTypeId = sp.get('employeeTypeId');
    if (sp.get('hrStatus')) where.hrStatus = sp.get('hrStatus');
    const q = sp.get('q');
    if (q) where.OR = [{ nameAr: { contains: q } }, { code: { contains: q } }, { nationalId: { contains: q } }];

    const [employees, types, titles, depts] = await Promise.all([
      prisma.employee.findMany({ where, orderBy: { code: 'asc' }, take: 500 }),
      prisma.employeeType.findMany({ where: { universityId: uid }, select: { id: true, nameAr: true } }),
      prisma.jobTitle.findMany({ where: { universityId: uid }, select: { id: true, nameAr: true } }),
      prisma.adminDepartment.findMany({ where: { universityId: uid }, select: { id: true, nameAr: true } }),
    ]);
    const tName = new Map(types.map((t) => [t.id, t.nameAr]));
    const jName = new Map(titles.map((t) => [t.id, t.nameAr]));
    const dName = new Map(depts.map((d) => [d.id, d.nameAr]));
    return NextResponse.json({
      employees: employees.map((e) => ({
        id: e.id, code: e.code, nameAr: e.nameAr, phone: e.phone, hrStatus: e.hrStatus, isActive: e.isActive,
        type: e.employeeTypeId ? tName.get(e.employeeTypeId) ?? '—' : '—',
        jobTitle: e.jobTitleId ? jName.get(e.jobTitleId) ?? '—' : e.jobTitle ?? '—',
        department: e.adminDepartmentId ? dName.get(e.adminDepartmentId) ?? '—' : e.department ?? '—',
      })),
    });
  } catch (e) {
    console.error('Error listing employees:', e);
    return NextResponse.json({ error: 'فشل في جلب العاملين' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.employee.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const body = await request.json();
    if (!body?.nameAr) return NextResponse.json({ error: 'اسم الموظف مطلوب' }, { status: 400 });
    let code = body.code as string | undefined;
    if (!code) {
      const n = await prisma.employee.count({ where: { universityId: uid } });
      code = `EMP-${(n + 1).toString().padStart(4, '0')}`;
    }
    const dup = await prisma.employee.findFirst({ where: { universityId: uid, code } });
    if (dup) return NextResponse.json({ error: 'كود الموظف مستخدم بالفعل' }, { status: 409 });
    const created = await prisma.employee.create({
      data: { universityId: uid, code, ...buildProfileData(body), hrStatus: body.hrStatus ?? 'NEW' } as never,
    });
    await prisma.employeeJobHistory.create({ data: { employeeId: created.id, action: 'HIRE', note: 'إنشاء ملف الموظف' } });
    await writeAudit('hr.employee.create', { targetType: 'Employee', targetId: created.id, universityId: uid, metadata: { code } });
    return NextResponse.json({ id: created.id, code }, { status: 201 });
  } catch (e) {
    console.error('Error creating employee:', e);
    return NextResponse.json({ error: 'فشل في إنشاء ملف الموظف' }, { status: 500 });
  }
}
