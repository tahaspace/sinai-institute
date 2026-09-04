import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { ACTION_TYPES } from '@/lib/course-result';
import { getRegulations } from '@/lib/regulations';

/**
 * حالات النتيجة — the per-status rules table («جدول قواعد الحالات»), i.e. جدول 3's exceptional
 * half: غائب بعذر / غائب بدون عذر / غير مكتمل / منسحب / منسحب اجباري / راسب لائحة / حرمان تأديبي /
 * مقاصة / محروم … and whatever else an institute's own bylaw carries.
 *
 * Division of labour with /api/institute/exams/result-states/letter-grades (سلّم التقديرات):
 * the LETTER rows are ONE ordered ladder and can only be judged as a whole — bands must not
 * overlap, points must descend with the band, the ladder must cover 0 upward, ناجح must sit on top
 * of راسب, and at least one band must fail. That validation lives in the ladder route, so this
 * route must never let a caller reach around it: `minPercent` and `isLetter` are refused here
 * outright, and `points` / `isPass` are refused on a row that IS a letter. Everything a letter row
 * still owns here (its name and the policy flags) is carried across by the ladder PUT, so the two
 * writers never overwrite each other.
 *
 * Non-letter statuses are fully enterable here — create, edit, delete — because the owner's
 * requirement is that every institute types its own bylaw in: «كل معهد بندخل حالات وتاثيرها هل
 * حاله اجراء منتهي يعني راسب مثلا، ولا تاثيرها اجراء يحتاج قرار». جدول 3 states that same split in
 * its own words: NE «اجراء منتهي»، DN «الاجراء متخذ منتهي»، I «اجراء معلق»، E «تصبح اجراء معلقة
 * لحين اداء الامتحان» — so a state is either terminal (isFinal) or waiting on a decision
 * (needsAction + nextAction), never both and never neither.
 */

// Same sanity bound the ladder route applies to letter points: 4.00 and 5.00 scales are both
// common, nothing legitimate goes past this, and it stops a typo (40 instead of 4.0) from wrecking
// every CGPA. Kept local because a route module cannot export a non-handler symbol.
const MAX_POINTS = 10;

// Codes are stored as free text on Enrollment and listed comma-separated in
// CourseResultReason.appliesTo, so a comma or a space in a code would silently break both links.
const CODE_RE = /^[^\s,]{1,12}$/;

const LADDER_ONLY =
  'حدود النسب («من نسبة %») وعدد النقاط وخانة (ناجح) للتقديرات الحرفية تُعدَّل من تبويب «سلّم التقديرات» — ' +
  'فهي سلّم واحد يُتحقَّق من ترابطه ككل (عدم تداخل النطاقات، تنازل النقاط، تغطية المدى من 0%، ووجود تقدير راسب).';

/** Body flags arrive from JSON: only a real boolean (or its literal string form) counts. */
function boolOf(v: unknown, fallback: boolean): boolean {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return fallback;
}

/** Reasons whose appliesTo names this code (a reason with no appliesTo applies to every state). */
function reasonCodesFor(code: string, reasons: { code: string; appliesTo: string | null }[]): string[] {
  return reasons
    .filter((r) => r.appliesTo !== null && r.appliesTo.split(',').map((x) => x.trim()).includes(code))
    .map((r) => r.code);
}

// GET /api/institute/grade-statuses — the configurable result-state table.
export async function GET() {
  try {
    const guard = await requirePermission('exam.grade.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [statuses, reasons] = await Promise.all([
      prisma.gradeStatus.findMany({ orderBy: { order: 'asc' } }),
      prisma.courseResultReason.findMany({ select: { code: true, appliesTo: true } }),
    ]);
    return NextResponse.json({
      gradeStatuses: statuses.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        points: s.points,
        affectsGpa: s.affectsGpa,
        isPass: s.isPass,
        isLetter: s.isLetter,
        minPercent: s.minPercent,
        // ClientR2 rules-table properties
        countsAttempt: s.countsAttempt,
        needsAction: s.needsAction,
        nextAction: s.nextAction,
        isException: s.isException,
        isFinal: s.isFinal,
        // The reason catalogue behind the state — «راسب بسبب التحريري» vs «بسبب الغياب».
        reasonCodes: reasonCodesFor(s.code, reasons),
      })),
      // Served rather than duplicated in the client so the follow-up vocabulary has one home
      // (lib/course-result.ts ACTION_TYPES — the engine reads the same list).
      nextActions: ACTION_TYPES,
      stats: {
        total: statuses.length,
        letters: statuses.filter((s) => s.isLetter).length,
        special: statuses.filter((s) => !s.isLetter).length,
        exceptions: statuses.filter((s) => s.isException).length,
        pending: statuses.filter((s) => s.needsAction).length,
      },
    });
  } catch (error) {
    console.error('Error listing grade statuses:', error);
    return NextResponse.json({ error: 'فشل في جلب حالات النتيجة' }, { status: 500 });
  }
}

// PATCH /api/institute/grade-statuses — edit one status row (policy properties, and points/isPass
// for NON-letter states only).
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    // The ladder is the ONLY writer of the band and of the letter/non-letter nature of a row.
    if ('minPercent' in body) return NextResponse.json({ error: LADDER_ONLY }, { status: 400 });
    if ('isLetter' in body) {
      return NextResponse.json(
        { error: 'لا يمكن تحويل حالة إلى تقدير حرفي (أو العكس) بعد إنشائها — أضِف التقدير من «سلّم التقديرات» أو أنشئ حالة جديدة.' },
        { status: 400 },
      );
    }

    const row = await prisma.gradeStatus.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: 'الحالة غير موجودة' }, { status: 404 });
    // …and of the points/ناجح of a letter row: those two are what the ladder validates as a set,
    // and the ladder tab was loaded from a snapshot, so a per-row edit here would be silently
    // reverted by the next «حفظ السلّم».
    if (row.isLetter && ('points' in body || 'isPass' in body)) {
      return NextResponse.json({ error: LADDER_ONLY }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: 'اسم الحالة مطلوب' }, { status: 400 });
      data.name = name;
    }
    if (body.points === null) data.points = null;
    else if (body.points !== undefined) {
      const p = Number(body.points);
      if (!Number.isFinite(p) || p < 0 || p > MAX_POINTS) {
        return NextResponse.json({ error: `عدد النقاط يجب أن يكون بين 0 و ${MAX_POINTS}.` }, { status: 400 });
      }
      data.points = p;
    }
    if (typeof body.affectsGpa === 'boolean') data.affectsGpa = body.affectsGpa;
    if (typeof body.isPass === 'boolean') data.isPass = body.isPass;
    // ClientR2 rules-table properties
    if (typeof body.countsAttempt === 'boolean') data.countsAttempt = body.countsAttempt;
    if (typeof body.needsAction === 'boolean') data.needsAction = body.needsAction;
    if (typeof body.isException === 'boolean') data.isException = body.isException;
    if (typeof body.isFinal === 'boolean') data.isFinal = body.isFinal;
    if (body.nextAction !== undefined) {
      // "NONE" is the canonical no-action value; null is accepted from older callers and normalised.
      const next = body.nextAction === null ? 'NONE' : String(body.nextAction);
      if (!(ACTION_TYPES as readonly string[]).includes(next)) {
        return NextResponse.json({ error: 'الإجراء التالي غير معروف.' }, { status: 400 });
      }
      data.nextAction = next;
    }

    // Terminal vs waiting-on-a-decision is a binary in the bylaw, so it must stay one in the data:
    // a state that still needs an action has not settled, and a state that never settles must be
    // waiting on something. Only checked when the patch actually touches the pair, so an already
    // inconsistent legacy row can still have its name or flags fixed.
    if ('needsAction' in data || 'isFinal' in data) {
      const needsAction = (data.needsAction as boolean | undefined) ?? row.needsAction;
      const isFinal = (data.isFinal as boolean | undefined) ?? row.isFinal;
      if (needsAction === isFinal) {
        return NextResponse.json(
          { error: 'الحالة إمّا «إجراء منتهي» (منتهية ولا تحتاج إجراءً) أو «تحتاج قرار/إجراء» (غير منتهية) — لا الاثنان معًا ولا لا شيء منهما.' },
          { status: 400 },
        );
      }
      const nextAction = (data.nextAction as string | undefined) ?? row.nextAction ?? 'NONE';
      if (needsAction && nextAction === 'NONE') {
        return NextResponse.json(
          { error: 'حدّد الإجراء الذي تنتظره الحالة (امتحان تكميلي / استكمال تقييم / إعادة المقرر) قبل جعلها «تحتاج قرار».' },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.gradeStatus.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating grade status:', error);
    return NextResponse.json({ error: 'فشل في تحديث حالة النتيجة' }, { status: 500 });
  }
}

// POST /api/institute/grade-statuses — add a NON-letter status the institute's bylaw carries.
// Body: { code, name, points?, affectsGpa?, isPass?, countsAttempt?, isException?,
//          needsAction?, nextAction?, isFinal?, reasonCodes?: string[] }
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });

    const code = String(body.code ?? '').trim();
    const name = String(body.name ?? '').trim();
    if (!code || !name) return NextResponse.json({ error: 'الكود والاسم مطلوبان' }, { status: 400 });
    if (!CODE_RE.test(code)) {
      return NextResponse.json(
        { error: 'الكود يجب ألّا يحتوي مسافة أو فاصلة وألّا يتجاوز 12 خانة — يُخزَّن مع كل نتيجة ويُربط به سبب النتيجة.' },
        { status: 400 },
      );
    }
    // A new letter belongs to the ladder, where it is validated against the whole سلّم.
    if (boolOf(body.isLetter, false) || 'minPercent' in body) {
      return NextResponse.json({ error: `${LADDER_ONLY} أضِف التقدير الحرفي من هناك، لا من هذه الشاشة.` }, { status: 400 });
    }

    const points = body.points === undefined || body.points === null || body.points === '' ? null : Number(body.points);
    if (points !== null && (!Number.isFinite(points) || points < 0 || points > MAX_POINTS)) {
      return NextResponse.json({ error: `عدد النقاط يجب أن يكون بين 0 و ${MAX_POINTS}، أو اتركه فارغًا لحالة بلا نقاط.` }, { status: 400 });
    }

    const needsAction = boolOf(body.needsAction, false);
    // isFinal defaults to the complement rather than to `true`: the two are one decision.
    const isFinal = body.isFinal === undefined ? !needsAction : boolOf(body.isFinal, !needsAction);
    if (needsAction === isFinal) {
      return NextResponse.json(
        { error: 'الحالة إمّا «إجراء منتهي» (منتهية ولا تحتاج إجراءً) أو «تحتاج قرار/إجراء» (غير منتهية) — اختر واحدة.' },
        { status: 400 },
      );
    }
    const nextAction = body.nextAction === undefined || body.nextAction === null ? 'NONE' : String(body.nextAction);
    if (!(ACTION_TYPES as readonly string[]).includes(nextAction)) {
      return NextResponse.json({ error: 'الإجراء التالي غير معروف.' }, { status: 400 });
    }
    if (needsAction && nextAction === 'NONE') {
      return NextResponse.json(
        { error: 'حدّد الإجراء الذي تنتظره الحالة (امتحان تكميلي / استكمال تقييم / إعادة المقرر).' },
        { status: 400 },
      );
    }

    const reasonCodes = Array.isArray(body.reasonCodes)
      ? body.reasonCodes.filter((c): c is string => typeof c === 'string' && c.trim() !== '').map((c) => c.trim())
      : [];

    const created = await prisma.$transaction(async (tx) => {
      // Duplicate check spans every tenant on purpose: the engine resolves a stored result with
      // findFirst({ where: { code } }) and no tenant filter, so two rows sharing a code would make
      // a student's own result ambiguous.
      const dup = await tx.gradeStatus.findFirst({ where: { code } });
      if (dup) return null;

      // universityId stays null — the global row set the engine actually grades from. A
      // tenant-scoped row would take part in everyone's grading anyway (lib/gpa.ts and
      // lib/standing.ts query GradeStatus unscoped), which would hide the sharing rather than fix
      // it; real per-institute isolation has to change those two engines in the same commit.
      const last = await tx.gradeStatus.findFirst({ where: { isLetter: false }, orderBy: { order: 'desc' } });
      const row = await tx.gradeStatus.create({
        data: {
          universityId: null,
          code,
          name,
          points,
          affectsGpa: boolOf(body.affectsGpa, false),
          isPass: boolOf(body.isPass, false),
          isLetter: false,
          minPercent: null,
          countsAttempt: boolOf(body.countsAttempt, true),
          needsAction,
          nextAction,
          isException: boolOf(body.isException, true), // a hand-added state is an exceptional case
          isFinal,
          order: typeof body.order === 'number' ? body.order : (last?.order ?? 40) + 1,
        },
      });

      // Attach the chosen reasons («لماذا حصلت الحالة») by appending the code to their appliesTo
      // list. A reason with appliesTo = null already applies to every state, so it is left alone —
      // writing the code into it would NARROW it to this state only.
      if (reasonCodes.length) {
        const reasons = await tx.courseResultReason.findMany({ where: { code: { in: reasonCodes } } });
        for (const r of reasons) {
          if (r.appliesTo === null) continue;
          const list = r.appliesTo.split(',').map((x) => x.trim()).filter(Boolean);
          if (list.includes(code)) continue;
          await tx.courseResultReason.update({ where: { id: r.id }, data: { appliesTo: [...list, code].join(',') } });
        }
      }
      return row;
    });

    if (!created) return NextResponse.json({ error: `الكود ${code} مستخدم بالفعل في حالة أخرى — اختر رمزًا مختلفًا.` }, { status: 409 });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating grade status:', error);
    return NextResponse.json({ error: 'فشل في إضافة حالة النتيجة' }, { status: 500 });
  }
}

// DELETE /api/institute/grade-statuses?id=…[&force=1] — remove a NON-letter status.
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const params = new URL(request.url).searchParams;
    const id = params.get('id');
    const force = params.get('force') === '1' || params.get('force') === 'true';
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const row = await prisma.gradeStatus.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: 'الحالة غير موجودة' }, { status: 404 });
    if (row.isLetter) {
      return NextResponse.json(
        { error: 'التقديرات الحرفية تُحذف من تبويب «سلّم التقديرات» حتى يُعاد التحقق من السلّم بعد الحذف.' },
        { status: 400 },
      );
    }

    // A status the bylaw itself points at cannot just vanish: the absence engine writes this exact
    // code when a student passes the deprivation threshold, and would then write a state that has
    // no definition. Read from the saved regulations, never from a literal here.
    const reg = await getRegulations();
    // BL is emitted by lib/gpa.ts whenever the written exam falls under writtenMinPercent while the
    // total would otherwise pass — جدول 3's «راسب لائحه». Deleting it leaves the engine writing a
    // code with no definition, so computeStanding can no longer classify those results at all.
    const ENGINE_WRITTEN_CODES = ['BL'];
    if (ENGINE_WRITTEN_CODES.includes(row.code)) {
      return NextResponse.json(
        {
          error:
            `الحالة ${row.code} يكتبها المحرّك تلقائيًا (راسب لائحة: أقل من ${reg.writtenMinPercent}% في الامتحان ` +
            `التحريري) — لا يمكن حذفها، وإلا سُجّلت نتائج بحالة بلا تعريف.`,
        },
        { status: 409 },
      );
    }
    if (reg.absenceBanStatusCode === row.code) {
      return NextResponse.json(
        {
          error:
            `الحالة ${row.code} مضبوطة في «لائحة المعهد» كحالة الحرمان/الانسحاب الإجباري عند تجاوز نسبة الغياب ` +
            `(${reg.absenceBanPercent}%) — غيّر الإعداد أولًا ثم احذفها.`,
        },
        { status: 409 },
      );
    }

    // Same truth as the ladder's delete: Enrollment stores the code as free text with no FK, so a
    // deleted state does not leave its results alone — computeStanding cannot resolve them any more.
    const count = await prisma.enrollment.count({
      where: { OR: [{ gradeStatusCode: row.code }, { letterGrade: row.code }] },
    });
    if (count > 0 && !force) {
      return NextResponse.json(
        {
          error:
            `الحالة ${row.code} مرصودة على ${count} نتيجة. حذفها يستبعد هذه النتائج فورًا من احتساب المعدل ` +
            `التراكمي والساعات المكتسبة لأن السيستم لن يجد تعريفًا لحالتها.`,
          requiresConfirm: true,
          count,
        },
        { status: 409 },
      );
    }

    // Detach the state from its reason catalogue. A reason that named ONLY this state is left
    // untouched and reported back: dropping its last code would silently turn it into a reason that
    // applies to every state, which is a different rule than the one the institute typed.
    const reasons = await prisma.courseResultReason.findMany({ where: { appliesTo: { not: null } } });
    const orphanReasons: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const r of reasons) {
        const list = (r.appliesTo ?? '').split(',').map((x) => x.trim()).filter(Boolean);
        if (!list.includes(row.code)) continue;
        const rest = list.filter((c) => c !== row.code);
        if (rest.length === 0) { orphanReasons.push(r.nameAr); continue; }
        await tx.courseResultReason.update({ where: { id: r.id }, data: { appliesTo: rest.join(',') } });
      }
      await tx.gradeStatus.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true, code: row.code, affectedResults: count, orphanReasons });
  } catch (error) {
    console.error('Error deleting grade status:', error);
    return NextResponse.json({ error: 'فشل في حذف حالة النتيجة' }, { status: 500 });
  }
}
