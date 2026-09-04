import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

/**
 * سلّم التقديرات — read + atomic full-replace of the LETTER rows of GradeStatus (جدول 3).
 *
 * Why this is not the per-row PATCH on /api/institute/grade-statuses: a ladder is not a bag of
 * independent rows, it is ONE ordered structure. "bands don't overlap / points descend with the
 * band / the ladder covers 0 upward" can only be judged against the whole set, and an institute
 * typing a brand-new bylaw needs the old ladder swapped out in one shot — a half-applied ladder
 * would mis-grade every result recorded in between. So the write verb is a validated PUT of the
 * complete ladder; create, update and delete are all expressed through it.
 *
 * The engine (lib/gpa.ts letterForPercent) reads letter rows WITHOUT a tenant filter, so this
 * route deliberately reads and writes the same global (universityId = null) ladder the engine
 * grades from: what the screen shows is exactly what grades students. Any letter row that carries
 * a universityId is reported back as a warning rather than silently edited — see GET below.
 */

// Sanity bound on grade points. 4.00 and 5.00 scales are both common in Egyptian bylaws;
// nothing legitimate goes past this, and it stops a typo (40 instead of 4.0) from wrecking every CGPA.
const MAX_POINTS = 10;

type LadderInput = { code: string; name: string; minPercent: number; points: number; isPass: boolean };

/**
 * Validate the ladder as a whole. Returns Arabic messages (empty = valid).
 * Invariants, in the owner's terms:
 *   - كل صف له رمز واسم وحد نسبة صحيح ونقاط داخل المدى المعقول
 *   - لا يتكرر رمز ولا يتكرر حد نسبة (حدّان متساويان = نطاقان متداخلان لا يمكن الفصل بينهما)
 *   - النقاط تنازلية مع النطاق (نطاق أدنى لا يساوي نقاطًا أعلى مما فوقه) — التساوي مسموح، الانعكاس ممنوع
 *   - أدنى نطاق يبدأ من 0% حتى لا تسقط درجة خارج السلّم بلا تقدير
 *   - تقديرات النجاح تشكّل قمة متصلة: لا يقع تقدير ناجح تحت تقدير راسب
 */
function validateLadder(rows: LadderInput[]): string[] {
  const errs: string[] = [];
  if (rows.length === 0) return ['سلّم التقديرات لا يمكن أن يكون فارغًا — يجب أن يبقى تقدير واحد على الأقل.'];

  for (const r of rows) {
    const label = r.code?.trim() || '(بدون رمز)';
    if (!r.code?.trim()) errs.push('الرمز مطلوب لكل تقدير في السلّم.');
    if (!r.name?.trim()) errs.push(`الاسم (التقدير) مطلوب للرمز ${label}.`);
    if (!Number.isInteger(r.minPercent) || r.minPercent < 0 || r.minPercent > 100) {
      errs.push(`حد النسبة للتقدير ${label} يجب أن يكون عددًا صحيحًا بين 0 و 100.`);
    }
    if (!Number.isFinite(r.points) || r.points < 0 || r.points > MAX_POINTS) {
      errs.push(`عدد نقاط التقدير ${label} يجب أن يكون بين 0 و ${MAX_POINTS}.`);
    }
  }
  if (errs.length) return errs; // the ordering checks below assume well-formed numbers

  const seenCode = new Set<string>();
  const seenMin = new Set<number>();
  for (const r of rows) {
    const code = r.code.trim();
    if (seenCode.has(code)) errs.push(`الرمز ${code} مكرر في السلّم.`);
    seenCode.add(code);
    if (seenMin.has(r.minPercent)) errs.push(`حد النسبة ${r.minPercent}% مكرر — نطاقان متداخلان لا يمكن الفصل بينهما.`);
    seenMin.add(r.minPercent);
  }

  // 'a' and 'A' are two different rows for the @@unique([universityId, code]) key, but a stored
  // result is resolved back by code with findFirst — which of the two it lands on is arbitrary.
  // Refuse the ambiguity instead of letting it decide a student's points.
  const byUpper = new Map<string, Set<string>>();
  for (const r of rows) {
    const u = r.code.trim().toUpperCase();
    const bucket = byUpper.get(u) ?? new Set<string>();
    bucket.add(r.code.trim());
    byUpper.set(u, bucket);
  }
  for (const variants of byUpper.values()) {
    if (variants.size > 1) {
      errs.push(`الرموز (${[...variants].join('، ')}) تختلف في حالة الأحرف فقط — اختر رمزًا مميزًا لكل تقدير.`);
    }
  }

  // A ladder that is ناجح all the way down makes failing impossible and pins the derived pass
  // floor at 0 — جدول 3 gives every ladder its «راسب — اقل من 50 %» counterpart, so require one.
  if (!rows.some((r) => !r.isPass)) {
    errs.push('يجب أن يحتوي السلّم على تقدير راسب واحد على الأقل — وإلا لا يمكن رسوب أي طالب.');
  }

  const sorted = [...rows].sort((a, b) => b.minPercent - a.minPercent);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].points > sorted[i - 1].points) {
      errs.push(
        `النقاط يجب أن تتنازل مع النطاق: التقدير ${sorted[i].code.trim()} (${sorted[i].minPercent}%) ` +
        `يحمل ${sorted[i].points} نقطة وهي أعلى من ${sorted[i - 1].code.trim()} (${sorted[i - 1].minPercent}%).`
      );
    }
  }

  if (sorted[sorted.length - 1].minPercent !== 0) {
    errs.push(
      `يجب أن يبدأ أدنى تقدير في السلّم من 0% حتى يُغطّى كل مدى الدرجات — ` +
      `أدنى تقدير حاليًا (${sorted[sorted.length - 1].code.trim()}) يبدأ من ${sorted[sorted.length - 1].minPercent}%.`
    );
  }

  const firstFail = sorted.findIndex((r) => !r.isPass);
  if (firstFail >= 0) {
    for (let i = firstFail + 1; i < sorted.length; i++) {
      if (sorted[i].isPass) {
        errs.push(
          `ترتيب النجاح/الرسوب غير سليم: التقدير ${sorted[i].code.trim()} (${sorted[i].minPercent}%) ناجح ` +
          `بينما التقدير الأعلى منه ${sorted[firstFail].code.trim()} (${sorted[firstFail].minPercent}%) راسب.`
        );
      }
    }
  }
  return errs;
}

// The pass floor is never written down: it is the lowest band the institute marked as ناجح.
function passFloorOf(rows: { minPercent: number; isPass: boolean }[]): number | null {
  const passing = rows.filter((r) => r.isPass).map((r) => r.minPercent);
  return passing.length ? Math.min(...passing) : null;
}

// How many already-recorded results carry each code. setEnrollmentResult writes gradeStatusCode
// and letterGrade to the same token, so the max of the two counts is the real figure; older seeded
// rows only carry letterGrade, which is why both are counted.
async function usageByCode(): Promise<Record<string, number>> {
  const [byStatus, byLetter] = await Promise.all([
    prisma.enrollment.groupBy({ by: ['gradeStatusCode'], _count: { _all: true } }),
    prisma.enrollment.groupBy({ by: ['letterGrade'], _count: { _all: true } }),
  ]);
  const out: Record<string, number> = {};
  for (const r of byStatus) if (r.gradeStatusCode) out[r.gradeStatusCode] = r._count._all;
  for (const r of byLetter) {
    if (!r.letterGrade) continue;
    out[r.letterGrade] = Math.max(out[r.letterGrade] ?? 0, r._count._all);
  }
  return out;
}

// GET — the ladder exactly as the grading engine reads it, plus its health.

/**
 * The tenant whose ladder this screen edits.
 *
 * Writing to universityId=null unconditionally made the feature DEAD in production: the eight rows
 * live there are bound to the institute (GradeStatus is @@unique([universityId, code])), so the
 * screen listed nothing and could not edit the ladder the engine actually reads. On a single-tenant
 * deployment we therefore resolve to that one university, exactly as lib/regulations.ts does, so the
 * screen edits the same rows lib/gpa.ts and lib/standing.ts consume.
 */
async function ladderTenantId(ctxUniversityId: string | null | undefined): Promise<string | null> {
  if (ctxUniversityId) return ctxUniversityId;
  const unis = await prisma.university.findMany({ select: { id: true }, take: 2 });
  return unis.length === 1 ? unis[0].id : null;
}

export async function GET() {
  try {
    const guard = await requirePermission('exam.grade.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const tenantId = await ladderTenantId(guard.ctx.universityId);
    const rows = await prisma.gradeStatus.findMany({
      where: { isLetter: true },
      orderBy: [{ minPercent: 'desc' }, { order: 'asc' }],
    });
    // "ours" = the ladder this screen owns and the engine reads; anything under a DIFFERENT tenant is
    // reported as a warning rather than silently edited.
    const globalRows = rows.filter((r) => r.universityId === tenantId);
    const scopedRows = rows.filter((r) => r.universityId !== tenantId);

    // minPercent stays NULLABLE on the way out: a letter row with no band is a real, saved state
    // that the engine ignores (lib/gpa.ts filters minPercent != null). Showing it as 0% would
    // invent a band the institute never typed — and saving the screen back would make that band
    // real, silently moving whatever grade used to own 0%.
    const letters = globalRows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      minPercent: r.minPercent,
      points: r.points ?? 0,
      isPass: r.isPass,
    }));

    // NaN for a missing band so validateLadder names the offending row exactly as a save would.
    const issues = validateLadder(letters.map((l) => ({ ...l, minPercent: l.minPercent ?? NaN })));
    const bandless = globalRows.filter((r) => r.minPercent === null).map((r) => r.code);
    if (bandless.length) {
      issues.unshift(
        `تقديرات بلا حد نسبة (${bandless.join('، ')}) — لا تشارك حاليًا في تحويل الدرجة إلى تقدير؛ أدخل لها حدًا قبل الحفظ.`
      );
    }
    if (scopedRows.length) {
      // Not editable here on purpose: the engine's letter query has no tenant filter, so such rows
      // already take part in grading everyone. Editing them from a single institute's screen would
      // hide that, not fix it.
      issues.push(
        `تحذير: يوجد ${scopedRows.length} تقدير مرتبط بجهة بعينها (${scopedRows.map((r) => r.code).join('، ')}) ` +
        `ويشارك في احتساب النتائج للجميع. لا يمكن تعديله من هذه الشاشة.`
      );
    }

    return NextResponse.json({
      letters,
      // Bandless rows are not part of the mapping the engine performs, so they cannot set a floor.
      passFloor: passFloorOf(
        letters.flatMap((l) => (l.minPercent === null ? [] : [{ minPercent: l.minPercent, isPass: l.isPass }])),
      ),
      usage: await usageByCode(),
      issues,
      maxPoints: MAX_POINTS,
    });
  } catch (error) {
    console.error('Error listing grade ladder:', error);
    return NextResponse.json({ error: 'فشل في جلب سلّم التقديرات' }, { status: 500 });
  }
}

// PUT — replace the whole ladder atomically. Body: { letters: LadderInput[], force?: boolean }.
export async function PUT(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    // Same resolution as GET, so the screen writes back the rows it just showed.
    const tenantId = await ladderTenantId(guard.ctx.universityId);

    const body = await request.json().catch(() => null);
    const raw = (body as { letters?: unknown })?.letters;
    if (!Array.isArray(raw)) return NextResponse.json({ error: 'قائمة التقديرات مطلوبة' }, { status: 400 });

    // Coerce before validating: the settings form posts strings from <Input type="number">.
    // An empty box is a MISSING number, not a zero — NaN so validateLadder rejects it by name.
    const num = (v: unknown) => (typeof v === 'string' ? (v.trim() === '' ? NaN : Number(v.trim())) : Number(v));
    const letters: LadderInput[] = raw.map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        code: String(o.code ?? '').trim(),
        name: String(o.name ?? '').trim(),
        minPercent: num(o.minPercent),
        points: num(o.points),
        // Boolean("false") is true — a non-form client could flip a failing grade to passing.
        isPass: o.isPass === true || o.isPass === 'true',
      };
    });

    const errs = validateLadder(letters);
    if (errs.length) return NextResponse.json({ error: errs[0], errors: errs }, { status: 400 });

    // Everything the decision depends on is read INSIDE the transaction: the special-status codes,
    // the ladder being replaced, and the usage counts behind the in-use refusal. Read outside, a row
    // created between the count and the delete would be dropped without the in-use check ever
    // seeing it, and two administrators saving at once would last-write-wins in silence.
    const force = (body as { force?: boolean })?.force === true;
    const outcome = await prisma.$transaction(async (tx) => {
      // A letter code must not collide with a special status (W/E/I/TR…). The clash matters whoever
      // owns the row: the engine resolves a code with findFirst and no tenant filter.
      const specials = await tx.gradeStatus.findMany({ where: { isLetter: false }, select: { code: true } });
      const clash = letters.find((l) => specials.some((s2) => s2.code === l.code));
      if (clash) return { kind: 'clash' as const, code: clash.code };

      const existing = await tx.gradeStatus.findMany({ where: { isLetter: true, universityId: tenantId } });
      const keptCodes = new Set(letters.map((l) => l.code));
      const removed = existing.filter((e) => !keptCodes.has(e.code));

      // Dropping a code that already sits on recorded results does NOT leave them alone: Enrollment
      // stores the code as free text (no FK), and computeStanding skips a row whose code it cannot
      // resolve — so those hours and points leave the CGPA the moment this saves. Refuse unless the
      // institute confirms.
      if (removed.length && !force) {
        const inUse: { code: string; count: number }[] = [];
        for (const r of removed) {
          const count = await tx.enrollment.count({
            where: { OR: [{ gradeStatusCode: r.code }, { letterGrade: r.code }] },
          });
          if (count > 0) inUse.push({ code: r.code, count });
        }
        if (inUse.length) return { kind: 'inUse' as const, inUse };
      }

      // The ClientR2 rules-table properties the institute tuned per letter (محاولة / إجراء / استثنائية /
      // منتهية) are carried over by code; a brand-new letter gets the standard letter policy.
      const prevProps = new Map(existing.map((e) => [e.code, e]));
      const sorted = [...letters].sort((a, b) => b.minPercent - a.minPercent);

      // Delete-then-recreate is safe here: Enrollment references a status by CODE, never by id,
      // so re-issuing ids breaks no stored result. It also guarantees the saved ladder is exactly
      // what was submitted, with no leftover row from the previous bylaw.
      await tx.gradeStatus.deleteMany({ where: { isLetter: true, universityId: tenantId } });
      await tx.gradeStatus.createMany({
        data: sorted.map((l, i) => {
          const p = prevProps.get(l.code);
          return {
            universityId: tenantId,
            code: l.code,
            name: l.name,
            points: l.points,
            minPercent: l.minPercent,
            isLetter: true,
            isPass: l.isPass,
            affectsGpa: p?.affectsGpa ?? true,
            countsAttempt: p?.countsAttempt ?? true,
            needsAction: p?.needsAction ?? false,
            nextAction: p?.nextAction ?? (l.isPass ? 'NONE' : 'REPEAT'),
            isException: p?.isException ?? false,
            isFinal: p?.isFinal ?? true,
            order: i + 1,
          };
        }),
      });
      return { kind: 'saved' as const, sorted, removed: removed.map((r) => r.code) };
    }, { timeout: 20000 });

    if (outcome.kind === 'clash') {
      return NextResponse.json(
        { error: `الرمز ${outcome.code} مستخدم بالفعل كحالة نتيجة خاصة — اختر رمزًا آخر.` },
        { status: 409 },
      );
    }
    if (outcome.kind === 'inUse') {
      return NextResponse.json(
        {
          error:
            `سيتم حذف تقدير مستخدم في نتائج مرصودة: ` +
            outcome.inUse.map((u) => `${u.code} (${u.count} نتيجة)`).join('، ') +
            `. سيتم استبعاد هذه النتائج من احتساب المعدل التراكمي والساعات المكتسبة فورًا لأن السيستم ` +
            `لن يجد تعريفًا لتقديرها، وسيظهر المقرر بتقدير غير معرّف في الكشوف.`,
          requiresConfirm: true,
          inUse: outcome.inUse,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      saved: outcome.sorted.length,
      passFloor: passFloorOf(outcome.sorted),
      removed: outcome.removed,
    });
  } catch (error) {
    console.error('Error saving grade ladder:', error);
    return NextResponse.json({ error: 'فشل في حفظ سلّم التقديرات' }, { status: 500 });
  }
}
