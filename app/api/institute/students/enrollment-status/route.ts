import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { tenantOrGlobalWhere } from '@/lib/tenant';
import { getRegulations } from '@/lib/regulations';
import { normalizeSystem } from '@/lib/academic-system';
import {
  ACADEMIC_STATE_LABELS,
  AFFILIATE_STATUS,
  DISMISSED_STATUS,
  SUSPENDED_STATUS,
  academicStateOf,
  annulmentRecommendation,
  computeStandingForStudents,
  monitoringGpaFloor,
} from '@/lib/standing';

// وقف القيد / إعادة القيد / إلغاء القيد والإدراج ضمن الانتساب — the enrolment-state desk.
//
// The bylaw sentences this route enforces, none of them as a literal (all from Regulations):
//  «ايقاف قيد الطالب : يسمح بايقاف قيد طالب تحت اذنه او طلبه لمده ( فصلين متالين او 3 فصول
//   منفصله ) ، عند انتهاء المده يطلب اعاده القيد باسبوعين علي الاقل»
//  «يلغي قيد الطالب ويتم ادراجه ضمن الانتساب : اذا كان تحت المراقبه ( ثلاث فصول متصله او اربعه
//   فصول منفصله )»
//  «اذا كان طالب من طلاب المستوي الثاني او الثالث او الرابع وتم فصله فيمكن اعاده القيد كطالب من
//   خارج مع حضور دروس عمليه ويكون اعاده القيد بحد اقصي ثلاث فصول متاليية»
//
// Relationship to Student.status — deliberately ONE truth, not two:
//   · وقف القيد writes Student.status = 'SUSPENDED', the value lib/registration.ts ALREADY refuses
//     registration for through reg.blockedRegistrationStatuses ('WITHDRAWN,DISMISSED,SUSPENDED'),
//     and lib/promotion.ts already skips. No second gate is introduced.
//   · StudentEnrollmentSuspension is the HISTORY behind that value (from which term, how many terms,
//     why, who approved, when re-enrolment is due). Student.status stays the current state; the rows
//     are the episodes that produced it, which is what makes the bylaw's two limits countable.
//   · الانتساب writes Student.status = 'AFFILIATE' — deliberately NOT in blockedRegistrationStatuses,
//     because the bylaw keeps the منتسب attending («مع حضور دروس عمليه»).

const SEM_AR: Record<string, string> = { first: 'الفصل الأول', second: 'الفصل الثاني', summer: 'الفصل الصيفي' };
const termLabel = (year: string, sem: string) => `${SEM_AR[sem] ?? sem} ${year}`;

type SuspensionRow = {
  id: string;
  studentId: string;
  startAcademicYear: string;
  startSemester: string;
  terms: number;
  reason: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  dueDate: Date | null;
  status: string;
  reenrolledAt: Date | null;
  // The registration state this suspension REPLACED, so re-enrolment restores the student instead of
  // normalising him to ACTIVE. Optional because the column may not exist yet — see HAS_PREVIOUS_STATUS.
  previousStatus?: string | null;
};

// وقف القيد must not be a one-way door. Restoring the prior Student.status needs a column to remember
// it in; until `StudentEnrollmentSuspension.previousStatus` exists in the schema this reads false and
// every path below behaves exactly as it does today (restore to 'ACTIVE'). Detected from the client's
// own data model rather than guessed, so the feature turns itself on the moment the column is added.
const HAS_PREVIOUS_STATUS: boolean = (() => {
  try {
    return (
      Prisma.dmmf.datamodel.models
        .find((m) => m.name === 'StudentEnrollmentSuspension')
        ?.fields.some((f) => f.name === 'previousStatus') ?? false
    );
  } catch {
    return false;
  }
})();

/** The status a suspension row should hand back. NULL/absent reads as today's 'ACTIVE'. */
const restoredStatus = (row: { previousStatus?: string | null } | null | undefined) =>
  row?.previousStatus && row.previousStatus !== SUSPENDED_STATUS ? row.previousStatus : 'ACTIVE';

// Quoted verbatim from the bylaw and NEVER interpolated with a configured number — an institute that
// edits its own limits must not end up with a fabricated quotation of the regulation.
const SUSPENSION_BYLAW =
  '«ايقاف قيد الطالب : يسمح بايقاف قيد طالب تحت اذنه او طلبه لمده ( فصلين متالين او 3 فصول منفصله ) ، عند انتهاء المده يطلب اعاده القيد باسبوعين علي الاقل»';
const AFFILIATE_BYLAW =
  '«اذا كان طالب من طلاب المستوي الثاني او الثالث او الرابع وتم فصله فيمكن اعاده القيد كطالب من خارج مع حضور دروس عمليه ويكون اعاده القيد بحد اقصي ثلاث فصول متاليية»';

/** Ordered term sequence for walking the calendar forward from the suspension's start term. */
const TERM_ORDER = ['first', 'second', 'summer'];
/** The (year, term) that follows `count` terms starting at the given one. الصيفي is part of the
 *  calendar walk only when the institute actually configured a صيفي term for that year. */
function advanceTerms(academicYear: string, semester: string, count: number, known: Set<string>) {
  let year = academicYear;
  let idx = TERM_ORDER.indexOf(semester);
  if (idx < 0) return null;
  let moved = 0;
  // Bounded walk — a mis-typed term count must never spin.
  for (let guard = 0; guard < 24 && moved < count; guard += 1) {
    idx += 1;
    if (idx >= TERM_ORDER.length) {
      idx = 0;
      const [a, b] = year.split('-').map((n) => parseInt(n, 10));
      if (!a || !b) return null;
      year = `${a + 1}-${b + 1}`;
    }
    // Skip a صيفي the institute never scheduled: it is not a فصل the suspension consumed.
    if (TERM_ORDER[idx] === 'summer' && !known.has(`${year}|summer`)) continue;
    moved += 1;
  }
  return moved === count ? { academicYear: year, semester: TERM_ORDER[idx] } : null;
}

/** Rows of one student that already consumed suspension terms — ACTIVE plus COMPLETED, never CANCELLED. */
const COUNTED_SUSPENSION_STATUSES = ['ACTIVE', 'COMPLETED'];

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('student.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const reg = await getRegulations(guard.ctx);
    const scope = tenantOrGlobalWhere(guard.ctx.universityId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    // Compose under AND — `scope` may itself carry an OR fragment (tenant / global).
    const studentWhere: Record<string, unknown> = { AND: [scope] as unknown[] };
    if (search) {
      (studentWhere.AND as unknown[]).push({
        OR: [
          { nameAr: { contains: search, mode: 'insensitive' } },
          { studentCode: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const [students, suspensions, terms, consumed] = await Promise.all([
      prisma.student.findMany({
        where: studentWhere,
        select: {
          id: true, studentCode: true, nameAr: true, level: true, status: true, gpa: true,
          affiliateSince: true, affiliateTermsUsed: true, affiliateReason: true,
          department: { select: { nameAr: true } },
          program: { select: { nameAr: true, academicSystem: true } },
        },
        orderBy: { studentCode: 'asc' },
      }),
      prisma.studentEnrollmentSuspension.findMany({
        where: { student: studentWhere },
        orderBy: { createdAt: 'desc' },
      }) as unknown as Promise<SuspensionRow[]>,
      prisma.academicTerm.findMany({
        where: tenantOrGlobalWhere(guard.ctx.universityId),
        orderBy: [{ academicYear: 'desc' }, { termType: 'asc' }],
        select: { id: true, academicYear: true, termType: true, isCurrent: true },
      }),
      // The consumed «3 فصول منفصله» budget per student, computed over ALL of the institute's rows —
      // NOT over the search-filtered list the screen happens to be showing, which understates it and
      // would let the screen promise a suspension the server then refuses.
      prisma.studentEnrollmentSuspension.groupBy({
        by: ['studentId'],
        where: { status: { in: COUNTED_SUSPENSION_STATUSES }, student: { AND: [scope] } },
        _sum: { terms: true },
      }) as unknown as Promise<{ studentId: string; _sum: { terms: number | null } }[]>,
    ]);
    const usedTermsByStudent = new Map(consumed.map((c) => [c.studentId, c._sum.terms ?? 0]));

    const byStudent = new Map(students.map((s) => [s.id, s]));

    // ── إلغاء القيد recommendation ──────────────────────────────────────────────────────────────
    // Only ACTIVE records can be annulled, and only a record already below the probation floor can
    // possibly have monitoring terms — Student.gpa is the cheap prefilter so the standing engine is
    // not run over the whole institute on a screen load.
    // The floor is the MONITORING one — «اذا حصل الطالب علي تقدير تراكمي 1.67 … يوضع تحت المراقبه
    // الاكاديميه» — not the looser إنذار floor, so the prefilter and the recommendation agree.
    const monitoringFloor = monitoringGpaFloor(reg);
    const candidateIds = students
      .filter((s) => s.status === 'ACTIVE' && s.gpa > 0 && s.gpa < monitoringFloor)
      .map((s) => s.id);
    const standings = candidateIds.length ? await computeStandingForStudents(candidateIds) : new Map();
    const annulmentCandidates = candidateIds
      // A standing can be missing (the record vanished between the two reads) — skip it rather than
      // asserting; an annulment recommendation must never rest on a guess.
      .flatMap((id) => {
        const st = standings.get(id);
        return st ? [{ id, rec: annulmentRecommendation(st, reg) }] : [];
      })
      .filter((x) => x.rec.recommended)
      .map(({ id, rec }) => {
        const s = byStudent.get(id)!;
        return {
          studentId: id,
          studentCode: s.studentCode,
          name: s.nameAr,
          level: s.level,
          department: s.department?.nameAr ?? '',
          cgpa: standings.get(id)?.cgpa ?? 0,
          consecutive: rec.consecutive,
          separate: rec.separate,
          reason: rec.reason,
        };
      });

    // Cheap standing stand-in for the list column: monitoring is a CGPA question and Student.gpa is
    // already the stored answer. Never applied to an ANNUAL programme (no CGPA exists there).
    const monitoringShim = (s: { gpa: number; program: { academicSystem: string | null } | null }) =>
      normalizeSystem(s.program?.academicSystem) === 'CREDIT_HOURS' && s.gpa > 0 && s.gpa < monitoringFloor
        ? { onProbation: true }
        : { onProbation: false };

    const now = Date.now();
    const rows = suspensions.map((r) => {
      const s = byStudent.get(r.studentId);
      const due = r.dueDate ? new Date(r.dueDate).getTime() : null;
      return {
        id: r.id,
        studentId: r.studentId,
        studentCode: s?.studentCode ?? '',
        name: s?.nameAr ?? '',
        department: s?.department?.nameAr ?? '',
        level: s?.level ?? 0,
        startTerm: termLabel(r.startAcademicYear, r.startSemester),
        terms: r.terms,
        reason: r.reason,
        approvedBy: r.approvedBy ?? '',
        approvedAt: r.approvedAt ? new Date(r.approvedAt).toISOString() : null,
        dueDate: r.dueDate ? new Date(r.dueDate).toISOString() : null,
        // «عند انتهاء المده يطلب اعاده القيد باسبوعين علي الاقل» — the window opens N weeks BEFORE
        // the due date, so the registrar is prompted while the request is still timely.
        dueSoon:
          r.status === 'ACTIVE' && due != null &&
          due - now <= Number(reg.reenrolmentNoticeWeeks) * 7 * 86400000,
        overdue: r.status === 'ACTIVE' && due != null && due < now,
        status: r.status,
        reenrolledAt: r.reenrolledAt ? new Date(r.reenrolledAt).toISOString() : null,
      };
    });

    return NextResponse.json({
      students: students.map((s) => ({
        id: s.id,
        studentCode: s.studentCode,
        name: s.nameAr,
        level: s.level,
        department: s.department?.nameAr ?? '',
        program: s.program?.nameAr ?? '',
        statusCode: s.status,
        // «حاله الاكاديمية للطالب … ثلاث انواع ( انتظام ، وقف قيد ، المراقبة الاكاديمية )». The third
        // value must be reachable on a plain list, so where the full standing was not computed the
        // stored CGPA answers the monitoring question directly — the same fact, one read cheaper.
        // Annual-system students have no CGPA at all, so they are never judged by it.
        academicState: academicStateOf(s.status, standings.get(s.id) ?? monitoringShim(s)),
        academicStateLabel:
          ACADEMIC_STATE_LABELS[academicStateOf(s.status, standings.get(s.id) ?? monitoringShim(s))],
        // «بحد اقصي ثلاث فصول متاليية» — the الانتساب budget, shown per student so the registrar has
        // the number the server enforces on.
        affiliateSince: s.affiliateSince ? new Date(s.affiliateSince).toISOString() : null,
        affiliateTermsUsed: s.affiliateTermsUsed ?? 0,
        affiliateReason: s.affiliateReason ?? '',
        suspensionTermsUsed: usedTermsByStudent.get(s.id) ?? 0,
      })),
      suspensions: rows,
      annulmentCandidates,
      terms: terms.map((t) => ({ id: t.id, academicYear: t.academicYear, termType: t.termType, isCurrent: t.isCurrent, label: termLabel(t.academicYear, t.termType) })),
      limits: {
        suspensionMaxConsecutiveTerms: Number(reg.suspensionMaxConsecutiveTerms),
        suspensionMaxSeparateTerms: Number(reg.suspensionMaxSeparateTerms),
        reenrolmentNoticeWeeks: Number(reg.reenrolmentNoticeWeeks),
        annulmentConsecutiveMonitoringTerms: Number(reg.annulmentConsecutiveMonitoringTerms),
        annulmentSeparateMonitoringTerms: Number(reg.annulmentSeparateMonitoringTerms),
        affiliateMaxTerms: Number(reg.affiliateMaxTerms),
        affiliateMinLevel: Number(reg.affiliateMinLevel),
      },
    });
  } catch (error) {
    console.error('Error loading enrolment states:', error);
    return NextResponse.json({ error: 'فشل في جلب حالات القيد' }, { status: 500 });
  }
}

// POST — one door, four bylaw actions. Each one is a deliberate registrar decision; nothing on this
// route runs automatically.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('student.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const reg = await getRegulations(guard.ctx);
    const body = await request.json();
    const action = String(body?.action ?? '');
    const studentId = String(body?.studentId ?? '');
    if (!studentId) return NextResponse.json({ error: 'معرف الطالب مطلوب' }, { status: 400 });

    const student = await prisma.student.findFirst({
      where: { AND: [{ id: studentId }, tenantOrGlobalWhere(guard.ctx.universityId)] },
      select: { id: true, status: true, level: true, nameAr: true, affiliateTermsUsed: true },
    });
    if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    // Who approved it. The signed-in user is the authority; a typed name is accepted only as a
    // fallback for a paper decision entered on someone else's behalf.
    const session = await getServerSession(authOptions);
    const actor =
      (session?.user as { email?: string | null; name?: string | null } | undefined)?.email ??
      (session?.user as { name?: string | null } | undefined)?.name ??
      (typeof body?.approvedBy === 'string' && body.approvedBy.trim() ? body.approvedBy.trim() : null);

    if (action === 'suspend') {
      const terms = parseInt(String(body?.terms ?? ''), 10);
      const academicYear = String(body?.academicYear ?? '').trim();
      const semester = String(body?.semester ?? '').trim();
      const reason = String(body?.reason ?? '').trim();
      if (!terms || terms < 1) return NextResponse.json({ error: 'عدد الفصول مطلوب' }, { status: 400 });
      if (!academicYear || !semester) return NextResponse.json({ error: 'فصل بداية الوقف مطلوب' }, { status: 400 });
      // «تحت اذنه او طلبه» — the bylaw grounds the suspension in a request, so a reason is required
      // and stored; it is what the re-enrolment decision is later read against.
      if (!reason) return NextResponse.json({ error: 'سبب الوقف مطلوب — اللائحة تجيز الوقف «تحت اذنه او طلبه»' }, { status: 400 });
      if (student.status === SUSPENDED_STATUS)
        return NextResponse.json({ error: 'قيد الطالب موقوف بالفعل' }, { status: 400 });

      const maxConsecutive = Number(reg.suspensionMaxConsecutiveTerms) || 0;
      const maxSeparate = Number(reg.suspensionMaxSeparateTerms) || 0;
      if (maxConsecutive > 0 && terms > maxConsecutive) {
        return NextResponse.json(
          { error: `لا يجوز وقف القيد أكثر من ${maxConsecutive} فصلاً متتالياً — ${SUSPENSION_BYLAW}` },
          { status: 400 },
        );
      }
      const priorRows = (await prisma.studentEnrollmentSuspension.findMany({
        where: {
          AND: [{ studentId }, { status: { in: COUNTED_SUSPENSION_STATUSES } }, tenantOrGlobalWhere(guard.ctx.universityId)],
        },
        select: { terms: true },
      })) as unknown as { terms: number }[];
      const priorTerms = priorRows.reduce((a, r) => a + (r.terms || 0), 0);
      if (maxSeparate > 0 && priorTerms + terms > maxSeparate) {
        return NextResponse.json(
          { error: `تجاوز الحد: الطالب استنفد ${priorTerms} من ${maxSeparate} فصلاً من رصيد وقف القيد — ${SUSPENSION_BYLAW}` },
          { status: 400 },
        );
      }

      const typedDue = body?.dueDate ? new Date(String(body.dueDate)) : null;
      // «عند انتهاء المده يطلب اعاده القيد باسبوعين علي الاقل» must not depend on a human remembering
      // to type a date. The due date is DERIVED from the two mandatory fields — start term + عدد
      // الفصول — against the institute's own AcademicTerm calendar; a typed date always overrides it,
      // and an unconfigured calendar simply leaves it null exactly as before (the screen then lists
      // those rows under «بلا تاريخ استحقاق» instead of hiding them).
      let dueDate: Date | null = typedDue && !Number.isNaN(typedDue.getTime()) ? typedDue : null;
      if (!dueDate) {
        const calendar = await prisma.academicTerm.findMany({
          where: tenantOrGlobalWhere(guard.ctx.universityId),
          select: { academicYear: true, termType: true, registrationStart: true, registrationEnd: true, teachingStart: true },
        });
        const known = new Set(calendar.map((t) => `${t.academicYear}|${t.termType}`));
        const back = advanceTerms(academicYear, semester, terms, known);
        const returnTerm = back
          ? calendar.find((t) => t.academicYear === back.academicYear && t.termType === back.semester)
          : undefined;
        // The date the student must be back BY: the start of the term he returns to. The «باسبوعين»
        // notice is applied on top of it when the screen flags a row as due soon, so it is not
        // subtracted twice here.
        const derived = returnTerm?.registrationStart ?? returnTerm?.teachingStart ?? returnTerm?.registrationEnd ?? null;
        dueDate = derived ? new Date(derived) : null;
      }
      const row = await prisma.$transaction(async (tx) => {
        const created = await (tx as typeof prisma).studentEnrollmentSuspension.create({
          data: {
            studentId,
            universityId: guard.ctx.universityId ?? null,
            startAcademicYear: academicYear,
            startSemester: semester,
            terms,
            reason,
            approvedBy: actor,
            approvedAt: new Date(),
            dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
            status: 'ACTIVE',
            // What the suspension is REPLACING. Without it re-enrolment cannot tell a منتظم from a
            // student under إنذار ثانٍ and silently clears his warning; with it, وقف القيد is a state
            // the registrar can leave the way he entered it.
            ...(HAS_PREVIOUS_STATUS ? { previousStatus: student.status } : {}),
          } as unknown as Prisma.StudentEnrollmentSuspensionUncheckedCreateInput,
        });
        // The state itself. SUSPENDED is the value the registration engine already blocks on.
        await tx.student.update({ where: { id: studentId }, data: { status: SUSPENDED_STATUS } });
        return created;
      });
      return NextResponse.json({ ok: true, suspension: row });
    }

    if (action === 'reenrol') {
      const suspensionId = String(body?.suspensionId ?? '');
      if (student.status !== SUSPENDED_STATUS)
        return NextResponse.json({ error: 'قيد الطالب غير موقوف' }, { status: 400 });
      // A client-supplied suspension id is never trusted on its own: the row must belong to THIS
      // student and to this tenant. `update`/`updateMany` by id alone is not tenant-rewritten by the
      // prisma extension, so the scope is composed here — under AND, since `scope` carries its own OR.
      const row = (await prisma.studentEnrollmentSuspension.findFirst({
        where: {
          AND: [
            suspensionId ? { id: suspensionId } : { status: 'ACTIVE' },
            { studentId },
            tenantOrGlobalWhere(guard.ctx.universityId),
          ],
        },
        orderBy: { createdAt: 'desc' },
      })) as unknown as SuspensionRow | null;
      if (!row) return NextResponse.json({ error: 'سجل الوقف غير موجود' }, { status: 404 });
      await prisma.$transaction(async (tx) => {
        const t = tx as typeof prisma;
        await t.studentEnrollmentSuspension.updateMany({
          where: { AND: [{ id: row.id }, { studentId }, tenantOrGlobalWhere(guard.ctx.universityId)] },
          data: { status: 'COMPLETED', reenrolledAt: new Date() },
        });
        // Back to what he WAS, not to a normalised ACTIVE — a طالب تحت إنذار ثانٍ returns under it.
        await tx.student.update({ where: { id: studentId }, data: { status: restoredStatus(row) } });
      });
      return NextResponse.json({ ok: true, status: restoredStatus(row) });
    }

    if (action === 'cancel') {
      // The suspension never took effect (withdrawn request / error). CANCELLED rows do not consume
      // any of the bylaw's separate-term budget — that is what distinguishes them from COMPLETED.
      const suspensionId = String(body?.suspensionId ?? '');
      if (!suspensionId) return NextResponse.json({ error: 'معرف الوقف مطلوب' }, { status: 400 });
      const row = (await prisma.studentEnrollmentSuspension.findFirst({
        where: { AND: [{ id: suspensionId }, { studentId }, tenantOrGlobalWhere(guard.ctx.universityId)] },
      })) as unknown as SuspensionRow | null;
      if (!row) return NextResponse.json({ error: 'سجل الوقف غير موجود' }, { status: 404 });
      await prisma.$transaction(async (tx) => {
        const t = tx as typeof prisma;
        await t.studentEnrollmentSuspension.updateMany({
          where: { AND: [{ id: row.id }, { studentId }, tenantOrGlobalWhere(guard.ctx.universityId)] },
          data: { status: 'CANCELLED' },
        });
        // The suspension never took effect, so the student goes back to the exact state it replaced.
        if (student.status === SUSPENDED_STATUS)
          await tx.student.update({ where: { id: studentId }, data: { status: restoredStatus(row) } });
      });
      return NextResponse.json({ ok: true, status: restoredStatus(row) });
    }

    if (action === 'annul-to-affiliate') {
      // «يلغي قيد الطالب ويتم ادراجه ضمن الانتساب» — executed ONLY on a record the engine actually
      // recommends, and the recommendation's own sentence is stored as the decision's reason. The
      // counts come from lib/standing (probationConsecutive / probationTermsTotal); nothing recounts.
      const standing = (await computeStandingForStudents([studentId])).get(studentId);
      if (!standing) return NextResponse.json({ error: 'تعذر حساب الحالة الأكاديمية للطالب' }, { status: 400 });
      const rec = annulmentRecommendation(standing, reg);
      if (!rec.recommended) {
        return NextResponse.json(
          { error: `الطالب لا ينطبق عليه إلغاء القيد: ${rec.consecutive} فصول متصلة و${rec.separate} منفصلة تحت المراقبة (الحدّان ${rec.consecutiveLimit} و${rec.separateLimit})` },
          { status: 400 },
        );
      }
      await prisma.student.update({
        where: { id: studentId },
        data: {
          status: AFFILIATE_STATUS,
          affiliateSince: new Date(),
          // NOT reset: the bylaw's «ثلاث فصول» is a budget over the whole قيد, so re-entering
          // الانتساب must not hand the student a fresh three.
          affiliateReason: rec.reason,
        },
      });
      return NextResponse.json({ ok: true, reason: rec.reason });
    }

    if (action === 'affiliate-reenrol') {
      // «اذا كان طالب من طلاب المستوي الثاني او الثالث او الرابع وتم فصله فيمكن اعاده القيد كطالب من
      //  خارج … بحد اقصي ثلاث فصول متاليية».
      const minLevel = Number(reg.affiliateMinLevel) || 0;
      if (student.status !== DISMISSED_STATUS)
        return NextResponse.json({ error: 'إعادة القيد بالانتساب تخص الطالب المفصول فقط' }, { status: 400 });
      if (minLevel > 0 && student.level < minLevel)
        return NextResponse.json(
          { error: `لا يجوز إعادة القيد بالانتساب قبل المستوى ${minLevel} — «اذا كان طالب من طلاب المستوي الثاني او الثالث او الرابع وتم فصله»` },
          { status: 400 },
        );
      // «ويكون اعاده القيد بحد اقصي ثلاث فصول متاليية» — the cap is real, counted on
      // Student.affiliateTermsUsed. 0 (an institute that configured no cap) imposes nothing.
      const maxAffiliateTerms = Number(reg.affiliateMaxTerms) || 0;
      if (maxAffiliateTerms > 0 && (student.affiliateTermsUsed ?? 0) >= maxAffiliateTerms)
        return NextResponse.json(
          {
            error: `استنفد الطالب ${student.affiliateTermsUsed} من ${maxAffiliateTerms} فصول الانتساب المتاحة — ${AFFILIATE_BYLAW}`,
          },
          { status: 400 },
        );
      const reason = String(body?.reason ?? '').trim() || 'إعادة قيد طالب مفصول كطالب من خارج (انتساب)';
      await prisma.student.update({
        where: { id: studentId },
        // Each إعادة قيد بالانتساب consumes one of the bylaw's «ثلاث فصول متاليية», so the counter the
        // refusal above reads is the counter this action advances. Nothing else in the platform
        // writes it, so without this line the cap could never be reached.
        data: {
          status: AFFILIATE_STATUS,
          affiliateSince: new Date(),
          affiliateReason: reason,
          affiliateTermsUsed: (student.affiliateTermsUsed ?? 0) + 1,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'affiliate-restore') {
      // «علي ان يتحول الي طالب نظامي مره اخري بعد انتقاء [انتفاء] سبب فصله من المعهد» — the way back.
      if (student.status !== AFFILIATE_STATUS)
        return NextResponse.json({ error: 'الطالب ليس ضمن الانتساب' }, { status: 400 });
      await prisma.student.update({
        where: { id: studentId },
        // The way back clears the الانتساب episode but NOT the consumed budget — «بحد اقصي ثلاث فصول»
        // is a limit over the whole قيد, and zeroing it here would hand the student a fresh three.
        data: { status: 'ACTIVE', affiliateSince: null, affiliateReason: null },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('Error updating enrolment state:', error);
    return NextResponse.json({ error: 'فشل في تنفيذ الإجراء' }, { status: 500 });
  }
}
