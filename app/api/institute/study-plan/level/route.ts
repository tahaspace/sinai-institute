import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { tenantOrGlobalWhere } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { serializeItem, validateItemInput, type ValidatedItem } from '../shared';

/**
 * PUT /api/institute/study-plan/level — replace one (programme, level) of the plan in a single
 * transaction.
 *
 * A plan is entered level by level («المستوي الاول … المستوي الثاني …» and جداول 5-35 are one table
 * per level+term), and a single row is meaningless on its own — the level only makes sense when its
 * hours foot («16 ساعة» per term in the bylaw's own level tables). So the editor sends the whole
 * level and this replaces it atomically: a half-typed level is never persisted.
 *
 * Legacy safety: only rows of THIS programme that carry this levelNo are deleted. Seeded rows have
 * levelNo NULL and are therefore never touched by a level replace.
 */
export async function PUT(request: NextRequest) {
  try {
    const guard = await requirePermission('plan.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => ({}));
    const programId = typeof body?.programId === 'string' ? body.programId : '';
    const levelNo = Number(body?.levelNo);
    const rows: Record<string, unknown>[] = Array.isArray(body?.items) ? body.items : [];
    if (!programId) return NextResponse.json({ error: 'البرنامج مطلوب' }, { status: 400 });
    if (!Number.isInteger(levelNo) || levelNo < 1) return NextResponse.json({ error: 'المستوى مطلوب' }, { status: 400 });

    const uid = guard.ctx.universityId ?? null;
    const program = await prisma.program.findFirst({ where: { AND: [tenantOrGlobalWhere(uid), { id: programId }] } });
    if (!program) return NextResponse.json({ error: 'البرنامج غير موجود' }, { status: 404 });

    // Validate every row BEFORE deleting anything; the batch is also checked against itself so two
    // identical courses inside the same submitted level are rejected, not silently both written.
    const validated: ValidatedItem[] = [];
    const seen: { courseId: string | null; courseCode: string; levelNo: number; termNo: number }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const v = await validateItemInput(
        { ...rows[i], programId, levelNo, order: i },
        uid,
        null,
        false,
        seen,
        true,
      );
      if ('error' in v) return NextResponse.json({ error: `السطر ${i + 1}: ${v.error}` }, { status: 400 });
      validated.push(v);
      seen.push({
        courseId: v.data.courseId,
        courseCode: v.data.courseCode,
        levelNo: v.data.levelNo!,
        termNo: v.data.termNo!,
      });
    }

    const scope = tenantOrGlobalWhere(uid);
    // READ with the OR-null scope (legacy rows must stay visible) but DELETE only what this tenant
    // owns: an untenanted structured row belongs to the platform or to another institute operating
    // without a universityId, and a level save here must never silently remove it. A platform admin
    // (uid === null) has no tenant of its own, so it keeps the previous behaviour.
    const deleteScope = uid ? { universityId: uid } : scope;
    const written = await prisma.$transaction(async (tx) => {
      await tx.studyPlanItem.deleteMany({ where: { AND: [deleteScope, { programId, levelNo }] } });
      for (const v of validated) {
        await tx.studyPlanItem.create({ data: { ...v.data, universityId: uid } });
      }
      return tx.studyPlanItem.findMany({
        where: { AND: [scope, { programId, levelNo }] },
        orderBy: [{ termNo: 'asc' }, { order: 'asc' }],
      });
    });

    return NextResponse.json({ items: written.map(serializeItem), count: written.length });
  } catch (e) {
    console.error('PUT /api/institute/study-plan/level failed', e);
    return NextResponse.json({ error: 'فشل في حفظ مستوى الخطة' }, { status: 500 });
  }
}
