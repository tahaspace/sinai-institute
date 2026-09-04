import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { currentUserId } from '@/lib/student';
import { getRegulations, type Regulations } from '@/lib/regulations';


/**
 * التدريب الصيفي / الميداني — «التدريب الصيفي للطالب : يكون شرط من شروط النجاح ويكون التدريب عبارة
 * عن 4 اسابيع لمدة شهر ويكون بعد المستوي الثاني بعد الفصل الدراسي الرابع وتدريب اخر بعد المستوي
 * الثالث بعد الفصل الدراسي السادس»، ودرجته «(50% لجه التدريب موقع تدريب ، 50% للمعهد تعقسم (25%
 * للتقرير الذي يقدمه الطالب ، 25% للمناقشه وتبادل الخبرات)».
 *
 * النتيجة نجاح/رسوب خارج المعدل التراكمي — «يعتبر التدريب الميداني ماده نجاح او رسوب ولكن لا تضاف
 * الي التقدير التراكمي». هذا السجل لا يخترع آلية ثانية: الحكم يُخزَّن بكود حالة من سلّم التقديرات
 * (P/NP المبذورتان في scripts/seed-result-states.ts)، والمقرر المرتبط — إن وُجد — هو مقرر
 * Course.countsInGpa = false كما في جدول 3 «مواد الاجتياز وعدم الاجتياز».
 */

/**
 * Explicit tenant scope. NOT tenantOrGlobalWhere: that helper returns `{}` — completely unfiltered —
 * when the caller has no universityId, which would let one institute read, overwrite and sign
 * another's training records. With no tenant we look only at the untenanted (shared) rows.
 */
// The no-tenant case is EXPLICIT: lib/tenant.ts tenantOrGlobalWhere returns {} there — completely
// unfiltered — which is how this module was showing every institute's trainings to every registrar.
// Not `as const`: a readonly literal is not assignable to a Prisma where input.
const tenantScope = (uid: string | null): Record<string, unknown> =>
  uid ? { OR: [{ universityId: uid }, { universityId: null }] } : { universityId: null };

/**
 * حدّ النجاح ليس ثابتاً في الكود: هو أدنى نسبة في سلّم التقديرات مؤشَّر عليها بالنجاح — نفس القاعدة
 * التي يقرأ بها lib/gpa.ts. سلّم بلا بند ناجح ⇒ null، فلا يُصدر حكم مخترع.
 */
async function passFloor(universityId: string | null): Promise<number | null> {
  const rows = await prisma.gradeStatus.findMany({
    where: { AND: [{ isLetter: true, isPass: true, minPercent: { not: null } }, tenantScope(universityId)] },
    select: { minPercent: true },
  });
  const floors = rows.map((r) => r.minPercent as number);
  return floors.length ? Math.min(...floors) : null;
}

/** إجمالي درجة التدريب كما توزّعها اللائحة: جهة التدريب + التقرير + المناقشة. */
function trainingTotal(t: { externalMark: number | null; reportMark: number | null; discussionMark: number | null }): number | null {
  const parts = [t.externalMark, t.reportMark, t.discussionMark];
  // لا حكم قبل رصد المكوّنات الثلاثة — تدريب نصف مرصود يبقى «قيد الرصد» لا راسباً.
  if (parts.some((p) => p == null)) return null;
  // every part is non-null past the guard above; the cast on the accumulator keeps that explicit
  return parts.reduce<number>((sum, p) => sum + (p as number), 0);
}

/** سقف الدرجة من اللائحة (50+25+25 = 100). يُقرأ من المفاتيح كي لا يُكتب 100 في الكود. */
function trainingMaxOf(reg: Regulations): number {
  const max = Number(reg.trainingExternalPercent) + Number(reg.trainingReportPercent) + Number(reg.trainingDiscussionPercent);
  return max > 0 ? max : 100;
}

// GET /api/institute/training?studentId=&round=&verdict= — سجلات التدريب + جولات اللائحة.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('student.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const g = (k: string) => { const v = searchParams.get(k); return v && v !== 'all' ? v : undefined; };

    // كل قراءة محصورة في معهد المستخدم — تركيب تحت AND كي لا يُداس أي OR.
    const filters: Prisma.StudentTrainingWhereInput = {};
    const studentId = g('studentId'); if (studentId) filters.studentId = studentId;
    const round = g('round'); if (round) filters.round = parseInt(round, 10);
    const verdict = g('verdict');
    if (verdict === 'pass') filters.isPass = true;
    else if (verdict === 'fail') filters.isPass = false;
    else if (verdict === 'pending') filters.isPass = null;
    const student: Prisma.StudentWhereInput = {};
    const departmentId = g('departmentId'); if (departmentId) student.departmentId = departmentId;
    const level = g('level'); if (level) student.level = parseInt(level, 10);
    if (Object.keys(student).length) filters.student = student;
    const where: Prisma.StudentTrainingWhereInput = { AND: [tenantScope(guard.ctx.universityId ?? null), filters] };

    const [rows, reg] = await Promise.all([
      prisma.studentTraining.findMany({
        where,
        include: { student: { select: { studentCode: true, nameAr: true, level: true, department: { select: { nameAr: true } } } } },
        orderBy: [{ round: 'asc' }, { createdAt: 'desc' }],
      }),
      getRegulations(guard.ctx),
    ]);
    const max = trainingMaxOf(reg);

    return NextResponse.json({
      records: rows.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        student: r.student.nameAr,
        studentCode: r.student.studentCode,
        level: r.student.level,
        department: r.student.department?.nameAr ?? '—',
        round: r.round,
        academicYear: r.academicYear,
        providerName: r.providerName,
        startDate: r.startDate ? r.startDate.toISOString().slice(0, 10) : null,
        endDate: r.endDate ? r.endDate.toISOString().slice(0, 10) : null,
        weeks: r.weeks,
        externalMark: r.externalMark,
        reportMark: r.reportMark,
        discussionMark: r.discussionMark,
        totalMark: r.totalMark,
        resultCode: r.resultCode,
        // null = لم تُرصد المكوّنات كاملة بعد، وليس رسوباً
        isPass: r.isPass,
        signedByName: r.signedByName,
        signedAt: r.signedAt ? r.signedAt.toISOString().slice(0, 10) : null,
        notes: r.notes,
      })),
      // ما تنصّ عليه اللائحة، كي ترسمه الشاشة دون أن تستورد lib/regulations.ts.
      bylaw: {
        rounds: reg.trainingRounds,
        weeks: reg.trainingWeeks,
        external: reg.trainingExternalPercent,
        report: reg.trainingReportPercent,
        discussion: reg.trainingDiscussionPercent,
        max,
        passStatusCode: reg.trainingPassStatusCode,
        failStatusCode: reg.trainingFailStatusCode,
      },
      stats: {
        total: rows.length,
        passed: rows.filter((r) => r.isPass === true).length,
        failed: rows.filter((r) => r.isPass === false).length,
        pending: rows.filter((r) => r.isPass == null).length,
      },
    });
  } catch (error) {
    console.error('Error listing trainings:', error);
    return NextResponse.json({ error: 'فشل في جلب سجلات التدريب' }, { status: 500 });
  }
}

/** رقم غير سالب لا يتجاوز سقف مكوّنه في اللائحة؛ '' / null = لم يُرصد بعد. */
function mark(v: unknown, capacity: number): number | null | 'invalid' {
  if (v === null || v === '' || typeof v === 'undefined') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > capacity) return 'invalid';
  return n;
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

// POST /api/institute/training — رصد/تحديث تدريب طالب في جولة بعينها.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('student.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { studentId, round, academicYear, providerName, startDate, endDate, weeks, externalMark, reportMark, discussionMark, courseId, notes } = body ?? {};
    if (!studentId || !round) return NextResponse.json({ error: 'الطالب والجولة مطلوبان' }, { status: 400 });

    const uid = guard.ctx.universityId ?? null;
    // الطالب يجب أن يكون طالب هذا المعهد — بدون هذا الفحص يستطيع طلب مُلفَّق أن يكتب فوق سجل معهد آخر.
    const owned = await prisma.student.findFirst({
      where: { AND: [{ id: String(studentId) }, tenantScope(uid)] },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: 'الطالب غير موجود في هذا المعهد' }, { status: 404 });

    const reg = await getRegulations(guard.ctx);
    const roundNo = parseInt(String(round), 10);
    // الجولة يجب أن تكون إحدى جولات اللائحة («بعد الفصل الدراسي الرابع … والسادس») — جولة مخترعة
    // كانت ستُنشئ سجلاً لا يقابله شيء في اللائحة ولا في متطلبات التخرج.
    if (!reg.trainingRounds.some((r) => r.round === roundNo)) {
      return NextResponse.json({ error: 'جولة التدريب غير موجودة في اللائحة' }, { status: 400 });
    }

    const ext = mark(externalMark, Number(reg.trainingExternalPercent));
    const rep = mark(reportMark, Number(reg.trainingReportPercent));
    const dis = mark(discussionMark, Number(reg.trainingDiscussionPercent));
    if (ext === 'invalid' || rep === 'invalid' || dis === 'invalid') {
      return NextResponse.json(
        { error: `الدرجات خارج التوزيع: جهة التدريب ${reg.trainingExternalPercent} / التقرير ${reg.trainingReportPercent} / المناقشة ${reg.trainingDiscussionPercent}` },
        { status: 400 },
      );
    }

    const total = trainingTotal({ externalMark: ext, reportMark: rep, discussionMark: dis });
    let isPass: boolean | null = null;
    let resultCode: string | null = null;
    // سلّم بلا حدّ نجاح لا يُصدر حكماً — نُميّز هذه الحالة عن «الدرجات ناقصة» كي لا تُلام الدرجات.
    let noPassFloor = false;
    if (total != null) {
      const floor = await passFloor(uid);
      if (floor == null) noPassFloor = true;
      const max = trainingMaxOf(reg);
      // النسبة المئوية تُقارَن بحدّ النجاح المأخوذ من سلّم التقديرات نفسه — لا رقم في الكود.
      if (floor != null) {
        isPass = (total / max) * 100 >= floor;
        const code = isPass ? reg.trainingPassStatusCode : reg.trainingFailStatusCode;
        // الحالة يجب أن تكون موجودة فعلاً في سلّم هذا المعهد، وإلا فكود لا يقرؤه أحد.
        const exists = await prisma.gradeStatus.findFirst({ where: { AND: [{ code }, tenantScope(uid)] }, select: { code: true } });
        if (!exists) {
          return NextResponse.json({ error: `حالة النتيجة «${code}» غير موجودة في سلّم التقديرات` }, { status: 400 });
        }
        resultCode = code;
      }
    }

    const data = {
      academicYear: academicYear || null,
      providerName: providerName || null,
      startDate: parseDate(startDate),
      endDate: parseDate(endDate),
      // «4 اسابيع لمدة شهر» — المُدخَل يفوز، وإلا مدة اللائحة.
      weeks: weeks ? parseInt(String(weeks), 10) : Number(reg.trainingWeeks),
      externalMark: ext,
      reportMark: rep,
      discussionMark: dis,
      totalMark: total,
      resultCode,
      isPass,
      courseId: courseId || null,
      notes: notes || null,
      universityId: uid,
    };

    // جولة واحدة لكل طالب: إعادة الرصد تُحدِّث السجل بدل أن تُنشئ ثانياً يتعارض معه.
    const saved = await prisma.studentTraining.upsert({
      where: { studentId_round: { studentId, round: roundNo } },
      create: { studentId, round: roundNo, ...data },
      update: data,
    });
    return NextResponse.json(
      {
        ...saved,
        warning: noPassFloor
          ? 'لا يوجد بند ناجح بنسبة محددة في سلّم التقديرات، فتعذّر إصدار حكم التدريب — أضِف حدّ النجاح في «حالات وقواعد النتائج».'
          : null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error saving training:', error);
    return NextResponse.json({ error: 'فشل في حفظ سجل التدريب' }, { status: 500 });
  }
}

// PATCH /api/institute/training — الاعتماد/التوقيع على سجل تدريب («ومن وقّعه»).
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('student.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, signedByName, unsign } = body ?? {};
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    // السجل يجب أن يكون سجل هذا المعهد — findUnique بالمعرّف وحده يسمح بتوقيع سجلات معهد آخر.
    const record = await prisma.studentTraining.findFirst({
      where: { AND: [{ id: String(id) }, tenantScope(guard.ctx.universityId ?? null)] },
      select: { id: true, isPass: true },
    });
    if (!record) return NextResponse.json({ error: 'سجل التدريب غير موجود' }, { status: 404 });
    // لا يُوقَّع على تدريب بلا حكم: التوقيع إقرار بنتيجة، وتدريب «قيد الرصد» لا نتيجة له بعد.
    if (!unsign && record.isPass == null) {
      return NextResponse.json(
        { error: 'لا يمكن الاعتماد: لم يصدر حكم للتدريب بعد (راجع اكتمال الدرجات وحدّ النجاح في سلّم التقديرات)' },
        { status: 400 },
      );
    }

    const updated = await prisma.studentTraining.update({
      where: { id: record.id },
      data: unsign
        ? { signedById: null, signedByName: null, signedAt: null }
        : { signedById: await currentUserId(), signedByName: signedByName || null, signedAt: new Date() },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error signing training:', error);
    return NextResponse.json({ error: 'فشل في اعتماد سجل التدريب' }, { status: 500 });
  }
}

// DELETE /api/institute/training?id= — حذف سجل رُصد بالخطأ (طالب أو جولة خاطئة).
// المفتاح المركّب (studentId, round) يجعل تصحيح الطالب مستحيلاً بالتعديل، فبقي الحذف هو طريق الرجوع.
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requirePermission('student.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const record = await prisma.studentTraining.findFirst({
      where: { AND: [{ id }, tenantScope(guard.ctx.universityId ?? null)] },
      select: { id: true, signedAt: true },
    });
    if (!record) return NextResponse.json({ error: 'سجل التدريب غير موجود' }, { status: 404 });
    // سجل معتمد لا يُحذف قبل رفع الاعتماد — الحذف الصامت لمستند موقّع ليس تصحيحاً.
    if (record.signedAt) {
      return NextResponse.json({ error: 'ألغِ اعتماد السجل أولاً ثم احذفه' }, { status: 400 });
    }

    await prisma.studentTraining.delete({ where: { id: record.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting training:', error);
    return NextResponse.json({ error: 'فشل في حذف سجل التدريب' }, { status: 500 });
  }
}
