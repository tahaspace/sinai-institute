import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { currentUserId } from '@/lib/student';
import { applyHoldBulk, HOLD_SCOPES, HOLD_TYPE_LABELS, HOLD_STATUS_LABELS, type HoldScope } from '@/lib/holds';

// GET /api/institute/holds — list holds (filterable) + summary stats.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('hold.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const g = (k: string) => { const v = searchParams.get(k); return v && v !== 'all' ? v : undefined; };

    const where: Prisma.StudentHoldWhereInput = {};
    const status = g('status'); if (status) where.status = status;
    const type = g('type'); if (type) where.type = type;
    const reasonId = g('reasonId'); if (reasonId) where.reasonId = reasonId;
    const source = g('source'); if (source) where.source = source;
    const student: Prisma.StudentWhereInput = {};
    const departmentId = g('departmentId'); if (departmentId) student.departmentId = departmentId;
    const programId = g('programId'); if (programId) student.programId = programId;
    const facultyId = g('facultyId'); if (facultyId) student.facultyId = facultyId;
    const level = g('level'); if (level) student.level = parseInt(level, 10);
    if (Object.keys(student).length) where.student = student;

    const holds = await prisma.studentHold.findMany({
      where,
      include: {
        student: { select: { studentCode: true, nameAr: true, level: true, department: { select: { nameAr: true } }, program: { select: { nameAr: true } } } },
        reason: { select: { nameAr: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = holds.map((h) => ({
      id: h.id,
      studentId: h.studentId,
      student: h.student.nameAr,
      studentCode: h.student.studentCode,
      level: h.student.level,
      department: h.student.department?.nameAr ?? '—',
      program: h.student.program?.nameAr ?? '—',
      type: h.type,
      typeLabel: HOLD_TYPE_LABELS[h.type] ?? h.type,
      reason: h.reason?.nameAr ?? h.reasonText ?? '—',
      scopes: HOLD_SCOPES.filter((s) => h[s]),
      status: h.status,
      statusLabel: HOLD_STATUS_LABELS[h.status] ?? h.status,
      source: h.source,
      startDate: h.startDate.toISOString().slice(0, 10),
      endDate: h.endDate ? h.endDate.toISOString().slice(0, 10) : null,
      releasedAt: h.releasedAt ? h.releasedAt.toISOString().slice(0, 10) : null,
    }));

    return NextResponse.json({
      holds: rows,
      stats: {
        total: rows.length,
        active: rows.filter((r) => r.status === 'ACTIVE').length,
        pending: rows.filter((r) => r.status === 'PENDING').length,
        released: rows.filter((r) => r.status === 'RELEASED').length,
        auto: rows.filter((r) => r.source === 'AUTOMATIC').length,
      },
    });
  } catch (error) {
    console.error('Error listing holds:', error);
    return NextResponse.json({ error: 'فشل في جلب قائمة الحجب' }, { status: 500 });
  }
}

// POST /api/institute/holds — apply a hold to one or many students (حجب جماعي).
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('hold.apply');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => ({}));
    const studentIds: string[] = Array.isArray(body.studentIds)
      ? body.studentIds
      : body.studentId ? [body.studentId] : [];
    if (!studentIds.length) return NextResponse.json({ error: 'اختر طالبًا واحدًا على الأقل' }, { status: 400 });
    if (!body.type) return NextResponse.json({ error: 'نوع الحجب مطلوب' }, { status: 400 });

    const scopes = body.scopes && typeof body.scopes === 'object'
      ? (body.scopes as Partial<Record<HoldScope, boolean>>)
      : undefined;
    const uid = await currentUserId();

    const ids = await applyHoldBulk(studentIds, {
      type: body.type,
      reasonId: body.reasonId ?? null,
      reasonText: body.reasonText ?? null,
      scopes,
      status: body.status === 'PENDING' ? 'PENDING' : 'ACTIVE',
      source: 'MANUAL',
      endDate: body.endDate ? new Date(body.endDate) : null,
      messageAr: body.messageAr ?? null,
      messageEn: body.messageEn ?? null,
      appliedById: uid,
      universityId: guard.ctx.universityId,
    });
    return NextResponse.json({ ok: true, count: ids.length, ids }, { status: 201 });
  } catch (error) {
    console.error('Error applying hold:', error);
    return NextResponse.json({ error: 'فشل في تطبيق الحجب' }, { status: 500 });
  }
}
