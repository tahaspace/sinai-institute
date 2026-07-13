import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Employee 360 profile (ClientR4 — R4c-1): full record + owned sub-records (qualifications,
// experiences, documents, job history, custody, assignments). View/edit gated by hr.employee.*.

const PROFILE_KEYS = ['nameAr', 'nameEn', 'nationalId', 'birthDate', 'gender', 'maritalStatus', 'phone', 'email', 'address', 'employeeTypeId', 'jobTitleId', 'positionId', 'adminDepartmentId', 'sectionId', 'managerId', 'contractType', 'contractStart', 'contractEnd', 'hrStatus', 'iban', 'payMethod', 'bankAccount', 'taxCardNo', 'insuranceNo', 'baseSalary', 'hireDate', 'isActive'];
const DATE_KEYS = new Set(['birthDate', 'contractStart', 'contractEnd', 'hireDate']);
function profileData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const k of PROFILE_KEYS) {
    if (!(k in body)) continue;
    const v = body[k];
    if (DATE_KEYS.has(k)) data[k] = v ? new Date(v as string) : null;
    else if (k === 'baseSalary') data[k] = v == null || v === '' ? 0 : Number(v);
    else if (k === 'isActive') data[k] = !!v;
    else data[k] = v === '' ? null : v;
  }
  return data;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('hr.employee.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    const e = await prisma.employee.findFirst({
      where: { id, universityId: guard.ctx.universityId ?? null },
      include: {
        qualifications: true, experiences: true, documents: { orderBy: { uploadedAt: 'desc' } },
        jobHistory: { orderBy: { date: 'desc' } }, custody: { orderBy: { assignedAt: 'desc' } },
        assignments: { orderBy: { startDate: 'desc' } },
      },
    });
    if (!e) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    return NextResponse.json({ employee: e });
  } catch (err) {
    console.error('Error loading employee:', err);
    return NextResponse.json({ error: 'فشل في جلب ملف الموظف' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('hr.employee.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    const existing = await prisma.employee.findFirst({ where: { id, universityId: guard.ctx.universityId ?? null } });
    if (!existing) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    const body = await request.json();
    const updated = await prisma.employee.update({ where: { id }, data: profileData(body) as never });
    await writeAudit('hr.employee.update', { targetType: 'Employee', targetId: id, universityId: guard.ctx.universityId ?? null });
    return NextResponse.json({ id: updated.id });
  } catch (err) {
    console.error('Error updating employee:', err);
    return NextResponse.json({ error: 'فشل في تحديث ملف الموظف' }, { status: 500 });
  }
}

// POST { kind, ...data } — add a sub-record. `assignment` also becomes the current placement.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('hr.employee.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    const emp = await prisma.employee.findFirst({ where: { id, universityId: guard.ctx.universityId ?? null } });
    if (!emp) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    const b = await request.json();
    switch (b?.kind) {
      case 'qualification':
        await prisma.employeeQualification.create({ data: { employeeId: id, degree: b.degree, institution: b.institution ?? null, year: b.year ? Number(b.year) : null, grade: b.grade ?? null } });
        break;
      case 'experience':
        await prisma.employeeExperience.create({ data: { employeeId: id, employer: b.employer, title: b.title ?? null, years: b.years ? Number(b.years) : null, note: b.note ?? null } });
        break;
      case 'document':
        await prisma.employeeDocument.create({ data: { employeeId: id, type: b.type ?? 'OTHER', name: b.name, url: b.url ?? null } });
        break;
      case 'custody':
        await prisma.assetCustody.create({ data: { employeeId: id, item: b.item, code: b.code ?? null, note: b.note ?? null } });
        break;
      case 'jobHistory':
        await prisma.employeeJobHistory.create({ data: { employeeId: id, action: b.action ?? 'OTHER', note: b.note ?? null } });
        break;
      case 'assignment':
        await prisma.employeeAssignment.updateMany({ where: { employeeId: id, isCurrent: true }, data: { isCurrent: false, endDate: new Date() } });
        await prisma.employeeAssignment.create({ data: { employeeId: id, adminDepartmentId: b.adminDepartmentId || null, sectionId: b.sectionId || null, jobTitleId: b.jobTitleId || null, positionId: b.positionId || null, managerEmployeeId: b.managerEmployeeId || null, note: b.note ?? null, isCurrent: true } });
        // reflect current placement on the employee record
        await prisma.employee.update({ where: { id }, data: { adminDepartmentId: b.adminDepartmentId || null, sectionId: b.sectionId || null, jobTitleId: b.jobTitleId || null, positionId: b.positionId || null, managerId: b.managerEmployeeId || null } });
        await prisma.employeeJobHistory.create({ data: { employeeId: id, action: 'TRANSFER', note: b.note ?? 'تعيين/نقل' } });
        break;
      default:
        return NextResponse.json({ error: 'نوع السجل غير معروف' }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('Error adding employee sub-record:', err);
    return NextResponse.json({ error: 'فشل في الإضافة' }, { status: 500 });
  }
}

// DELETE ?kind=&subId= — remove an owned sub-record.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('hr.employee.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    const sp = new URL(request.url).searchParams;
    const kind = sp.get('kind'); const subId = sp.get('subId');
    if (!kind || !subId) return NextResponse.json({ error: 'المعطيات ناقصة' }, { status: 400 });
    const owns = async (rec: { employeeId: string } | null) => !!rec && rec.employeeId === id;
    switch (kind) {
      case 'qualification': if (await owns(await prisma.employeeQualification.findUnique({ where: { id: subId } }))) await prisma.employeeQualification.delete({ where: { id: subId } }); break;
      case 'experience': if (await owns(await prisma.employeeExperience.findUnique({ where: { id: subId } }))) await prisma.employeeExperience.delete({ where: { id: subId } }); break;
      case 'document': if (await owns(await prisma.employeeDocument.findUnique({ where: { id: subId } }))) await prisma.employeeDocument.delete({ where: { id: subId } }); break;
      case 'custody': if (await owns(await prisma.assetCustody.findUnique({ where: { id: subId } }))) await prisma.assetCustody.delete({ where: { id: subId } }); break;
      default: return NextResponse.json({ error: 'نوع غير مدعوم' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error deleting employee sub-record:', err);
    return NextResponse.json({ error: 'فشل في الحذف' }, { status: 500 });
  }
}
