import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { tenantOrGlobalWhere } from '@/lib/tenant';
import prisma from '@/lib/prisma';

/**
 * إسناد التخصص للطلاب — the write path for the new authoritative Student.specializationId.
 *
 * Until now a student's تخصص existed only as free text in Student.section («علمي رياضة» — a
 * school-track label, not a programme specialisation), which nothing could join on. The FK is the
 * source of truth from here on; `section` is kept untouched as legacy display fallback.
 */

// GET /api/institute/specializations/assign?programId= — students + their effective تخصص.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('student.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const search = searchParams.get('search')?.trim();

    // Student rows predate multi-tenancy exactly like programmes do, so a strict universityId
    // filter would empty the list. The tenant clause is composed under AND — never spread next to
    // the search OR, which would overwrite it.
    const inner: Record<string, unknown> = {};
    if (programId && programId !== 'all') inner.programId = programId;
    if (search) {
      inner.OR = [
        { nameAr: { contains: search, mode: 'insensitive' } },
        { studentCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    const where = { AND: [tenantOrGlobalWhere(guard.ctx.universityId), inner] };

    const students = await prisma.student.findMany({
      where,
      select: { id: true, studentCode: true, nameAr: true, level: true, gpa: true, section: true, specializationId: true, specializationRef: { select: { id: true, nameAr: true, kind: true } } },
      orderBy: { studentCode: 'asc' },
      take: 500,
    });

    return NextResponse.json({
      students: students.map((s) => ({
        id: s.id,
        studentCode: s.studentCode,
        nameAr: s.nameAr,
        level: s.level,
        gpa: s.gpa,
        specializationId: s.specializationId,
        // The FK wins; `section` only shows when no specialisation was ever assigned.
        specializationName: s.specializationRef?.nameAr ?? s.section ?? '',
        isLegacySection: !s.specializationId && !!s.section,
      })),
    });
  } catch (e) {
    console.error('GET /api/institute/specializations/assign failed', e);
    return NextResponse.json({ error: 'فشل في جلب الطلاب' }, { status: 500 });
  }
}

// POST /api/institute/specializations/assign — { studentIds: string[], specializationId: string|null }
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('student.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => ({}));
    const studentIds: string[] = Array.isArray(body?.studentIds) ? body.studentIds.filter((x: unknown) => typeof x === 'string') : [];
    const specializationId: string | null = typeof body?.specializationId === 'string' && body.specializationId ? body.specializationId : null;
    if (!studentIds.length) return NextResponse.json({ error: 'اختر طالبًا واحدًا على الأقل' }, { status: 400 });

    let spec: { id: string; programId: string | null; kind: string | null; minLevel: number | null } | null = null;
    if (specializationId) {
      // Specialization has no universityId; its programme is the tenant anchor, so resolve it only
      // among programmes in scope (or with no programme at all, like any untenanted row).
      const scopedPrograms = await prisma.program.findMany({ where: tenantOrGlobalWhere(guard.ctx.universityId), select: { id: true } });
      spec = await prisma.specialization.findFirst({
        where: { AND: [{ id: specializationId }, { OR: [{ programId: { in: scopedPrograms.map((p) => p.id) } }, { programId: null }] }] },
        select: { id: true, programId: true, kind: true, minLevel: true },
      });
      if (!spec) return NextResponse.json({ error: 'التخصص غير موجود' }, { status: 404 });
    }

    const students = await prisma.student.findMany({
      where: { AND: [tenantOrGlobalWhere(guard.ctx.universityId), { id: { in: studentIds } }] },
      select: { id: true, studentCode: true, level: true, programId: true },
    });
    if (students.length !== studentIds.length) {
      return NextResponse.json({ error: 'بعض الطلاب غير موجودين أو خارج نطاق الصلاحية' }, { status: 404 });
    }

    if (spec) {
      for (const st of students) {
        if (spec.programId && st.programId && st.programId !== spec.programId) {
          return NextResponse.json({ error: `الطالب ${st.studentCode}: التخصص لا يتبع برنامج الطالب` }, { status: 400 });
        }
        // «التخصص الفرعي يكون في المستوي الرابع فقط» — enforced from the specialisation's own
        // minLevel, which the institute typed from its لائحة.
        if (spec.minLevel && st.level < spec.minLevel) {
          return NextResponse.json(
            { error: `الطالب ${st.studentCode}: هذا التخصص متاح من المستوى ${spec.minLevel} فأعلى` },
            { status: 400 },
          );
        }
      }
    }

    const result = await prisma.student.updateMany({
      where: { AND: [tenantOrGlobalWhere(guard.ctx.universityId), { id: { in: studentIds } }] },
      data: { specializationId }, // `section` is deliberately left as-is: legacy text is never rewritten
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (e) {
    console.error('POST /api/institute/specializations/assign failed', e);
    return NextResponse.json({ error: 'فشل في إسناد التخصص' }, { status: 500 });
  }
}
