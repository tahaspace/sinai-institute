import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission, sessionToCtx } from '@/lib/authz';
import { requireStaff } from '@/lib/student';
import { tenantOrGlobalWhere } from '@/lib/tenant';
import { getRegulations } from '@/lib/regulations';
import {
  DATE_FIELDS,
  assertNoDuplicate,
  clearOtherCurrent,
  parseTermBody,
  serializeTerm,
  validateChronology,
} from './_shared';

/**
 * التقويم الأكاديمي — GET (list) و POST (إنشاء فصل دراسي).
 *
 * The calendar is what turns the bylaw's week counts into dates the engines can compare against
 * «اليوم»: «فصل التسجيل اسبوع واحد … الدراسه 12 اسبوع … الامتحانات اسبوعان» و«الفصل الصيفي 8 اسابيع
 * مكثف». lib/registration.ts reads the current term and enforces the windows; where no term is
 * configured it behaves exactly as it did before this screen existed.
 */

// GET /api/institute/academic-terms?academicYear=2026-2027
// Any staff may read it (the registration screens need the windows), scoped to the caller's tenant
// OR untenanted rows — a strict tenant filter matches nothing, since nothing sets universityId yet.
export async function GET(request: NextRequest) {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const ctx = sessionToCtx(await getServerSession(authOptions));
  const academicYear = request.nextUrl.searchParams.get('academicYear');

  // A platform admin reads everything. A tenanted staff account reads its own rows plus the
  // untenanted legacy ones. An UNTENANTED staff account (the normal state today) must be pinned to
  // the untenanted rows — an empty clause there is an unfiltered read of every institute's calendar.
  const scope = ctx.isPlatformAdmin
    ? {}
    : ctx.universityId
      ? tenantOrGlobalWhere(ctx.universityId) // never spread an OR into a where that may hold one
      : { universityId: null };

  const terms = await prisma.academicTerm.findMany({
    where: { AND: [scope, academicYear ? { academicYear } : {}] },
    orderBy: [{ academicYear: 'desc' }, { termType: 'asc' }],
  });
  // `current` lets the UI label الفصل الحالي without a second round trip; null when none is marked.
  const current = terms.find((t) => t.isCurrent) ?? null;
  return NextResponse.json({
    terms: terms.map((t) => serializeTerm(t as unknown as Record<string, unknown>)),
    current: current ? serializeTerm(current as unknown as Record<string, unknown>) : null,
    // The bylaw parameters the calendar screen shows as guidance — this tenant's own values, never
    // Sinai's numbers hardcoded in the page.
    regulations: { withdrawWeek: (await getRegulations()).withdrawWeek ?? null },
  });
}

// POST — create one term.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('institute.settings.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const input = await parseTermBody(body);
    validateChronology(input);

    const universityId = guard.ctx.universityId ?? null;
    await assertNoDuplicate(universityId, input.academicYear, input.termType);

    const data: Record<string, unknown> = {
      universityId,
      academicYear: input.academicYear,
      termType: input.termType,
      nameAr: input.nameAr,
      lateRegistrationFee: input.lateRegistrationFee,
      isCurrent: input.isCurrent,
    };
    for (const f of DATE_FIELDS) data[f] = input[f] ?? null;

    // Invariant 1: marking this one current must clear the siblings in the SAME transaction.
    const term = await prisma.$transaction(async (tx) => {
      if (input.isCurrent) await clearOtherCurrent(universityId, input.academicYear, undefined, tx);
      return tx.academicTerm.create({ data: data as never });
    });
    return NextResponse.json({ ok: true, term: serializeTerm(term as unknown as Record<string, unknown>) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 422 });
  }
}
