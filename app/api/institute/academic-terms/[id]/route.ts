import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import {
  DATE_FIELDS,
  assertNoDuplicate,
  clearOtherCurrent,
  parseTermBody,
  serializeTerm,
  validateChronology,
} from '../_shared';

/** التقويم الأكاديمي — تعديل وحذف فصل دراسي. Same two invariants as the create route. */

async function loadOwn(id: string, universityId: string | null, isPlatformAdmin: boolean) {
  const term = await prisma.academicTerm.findUnique({ where: { id } });
  if (!term) return null;
  // A tenant may touch its own rows or the untenanted legacy ones — never another tenant's.
  if (!isPlatformAdmin && term.universityId && term.universityId !== universityId) return null;
  return term;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('institute.settings.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;

    const existing = await loadOwn(id, guard.ctx.universityId ?? null, guard.ctx.isPlatformAdmin);
    if (!existing) return NextResponse.json({ error: 'الفصل الدراسي غير موجود' }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const input = await parseTermBody(body, { academicYear: existing.academicYear, termType: existing.termType, isCurrent: existing.isCurrent });
    validateChronology(input);
    await assertNoDuplicate(existing.universityId, input.academicYear, input.termType, id);

    const data: Record<string, unknown> = {
      academicYear: input.academicYear,
      termType: input.termType,
      nameAr: input.nameAr,
      lateRegistrationFee: input.lateRegistrationFee,
      isCurrent: input.isCurrent,
    };
    for (const f of DATE_FIELDS) data[f] = input[f] ?? null;

    const term = await prisma.$transaction(async (tx) => {
      if (input.isCurrent) await clearOtherCurrent(existing.universityId, input.academicYear, id, tx);
      return tx.academicTerm.update({ where: { id }, data: data as never });
    });
    return NextResponse.json({ ok: true, term: serializeTerm(term as unknown as Record<string, unknown>) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 422 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('institute.settings.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    const existing = await loadOwn(id, guard.ctx.universityId ?? null, guard.ctx.isPlatformAdmin);
    if (!existing) return NextResponse.json({ error: 'الفصل الدراسي غير موجود' }, { status: 404 });
    await prisma.academicTerm.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 422 });
  }
}
