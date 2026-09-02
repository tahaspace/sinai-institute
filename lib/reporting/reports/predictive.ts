import prisma from '@/lib/prisma';
import type { Filters, ReportDef } from '@/lib/reporting/types';
import { computeStandingForStudents } from '@/lib/standing';
import { computeAnnualForStudents } from '@/lib/annual';
import { getRegulations } from '@/lib/regulations';
import { getAcademicYears } from '@/lib/academic-years';
import { studentWhere } from '@/lib/reporting/filters';
import { academicSystemWhere, studentSystemWhere } from '@/lib/academic-system';

/**
 * Predictive analytics + Early Warning (ClientR3 — R6). TRANSPARENT, RULE-BASED heuristics — NOT
 * certainties. Each risk is a weighted score from real signals (GPA, attendance, past failures,
 * payment delay) with the reason shown. Labeled as an estimate, auditable, no black box.
 */
const VIEW = 'reports.predictive.view';

// ─────────── student-risk: ONE 0–100 scale, two scoring bases ───────────
// Credit-hours students are scored on CGPA / probation / repeated failure. ANNUAL students store no
// CGPA at all, so they are scored on what lib/annual.ts already produces — the year result and the
// aggregate percentage's own تقدير band. The weights mirror each other so both halves of the list
// stay comparable, and each row's Arabic reasons name the basis it was judged on.
const RISK_CUTOFF = 25; // below this a row is not a warning worth showing
const RISK_EXCLUDED_STATUS = ['GRADUATED', 'WITHDRAWN', 'DISMISSED'];

type RiskStudent = { id: string; studentCode: string; nameAr: string };
type RiskRow = { studentCode: string; name: string; risk: number; reasons: string };

const riskRow = (s: RiskStudent, score: number, reasons: string[]): RiskRow =>
  ({ studentCode: s.studentCode, name: s.nameAr, risk: Math.min(100, score), reasons: reasons.join('، ') || '—' });

/** Credit-hours basis: CGPA bands + probation escalation + repeated failure (unchanged model). */
async function creditRiskRows(f: Filters, universityId: string | null): Promise<RiskRow[]> {
  // studentWhere applies the declared departmentId/programId (and the tenant) — composed under AND
  // because both fragments can carry an `OR`. With nothing selected it collapses to the tenant scope,
  // i.e. exactly the query this report ran before.
  const students = await prisma.student.findMany({ where: { AND: [studentWhere(f, universityId), academicSystemWhere('CREDIT_HOURS')], status: { notIn: RISK_EXCLUDED_STATUS } }, select: { id: true, studentCode: true, nameAr: true } });
  const standings = await computeStandingForStudents(students.map((s) => s.id));
  return students.map((s) => {
    const st = standings.get(s.id);
    let score = 0; const reasons: string[] = [];
    if (st) {
      if (st.cgpa > 0 && st.cgpa < 2.0) { score += 45; reasons.push('المعدل أقل من 2.00'); }
      else if (st.cgpa < 2.5) { score += 20; reasons.push('معدل منخفض'); }
      if (st.escalation === 'track-change-or-dismissal') { score += 30; reasons.push('إنذار نهائي'); }
      else if (st.escalation === 'warning') { score += 15; reasons.push('تحت الإنذار'); }
      if (st.repeatedFailure.length) { score += 25; reasons.push(`رسوب متكرر (${st.repeatedFailure.length})`); }
    }
    return riskRow(s, score, reasons);
  });
}

/**
 * Annual basis: the same weights read off the سنوي result instead of the CGPA — باقٍ للإعادة carries
 * the sub-2.00 weight, له دور ثانٍ the final-warning weight, and the year's تقدير band plays the part
 * of the CGPA bands. No new academic policy is invented here: the bands, the pass mark and the
 * carry-over allowance all come from the bylaw via lib/annual.ts — this only weights them.
 */
async function annualRiskRows(f: Filters, universityId: string | null): Promise<RiskRow[]> {
  const students = await prisma.student.findMany({ where: { AND: [studentWhere(f, universityId), academicSystemWhere('ANNUAL')], status: { notIn: RISK_EXCLUDED_STATUS } }, select: { id: true, studentCode: true, nameAr: true } });
  if (!students.length) return [];
  // lib/annual.ts grades ONE academic year (a فرقة cohort), so a year is ALWAYS supplied: the one
  // picked in the hub, else the managed current year. Left unset the engine would blend every year
  // ever recorded into a single meaningless result — the annual half's marks are per-year, not
  // cumulative like a CGPA. The credit half stays lifetime-scoped, exactly as its engine defines it.
  const year = f.academicYear ?? (await getAcademicYears()).current;
  const [results, reg] = await Promise.all([
    computeAnnualForStudents(students.map((s) => s.id), year ? { academicYear: year } : {}),
    // Read only for the carry-over allowance — the engine does not expose it. Every percentage
    // threshold comes from the engine's own تقدير below, so nothing here can drift from the bylaw.
    getRegulations(),
  ]);
  const maxCarry = reg.maxCarryOverSubjects ?? 2;
  return students.map((s) => {
    const r = results.get(s.id);
    let score = 0; const reasons: string[] = [];
    if (r) {
      if (r.result === 'باقٍ للإعادة') { score += 45; reasons.push(`باقٍ للإعادة (${r.failedCount} مادة راسبة)`); }
      else if (r.result === 'له دور ثانٍ') { score += 30; reasons.push(`له دور ثانٍ (${r.failedCount} مادة راسبة)`); }
      // Recording is still open but failures are already on the board — the earliest annual signal,
      // weighted by where the year is heading: past the bylaw's carry-over allowance it is already a
      // باقٍ للإعادة in the making (45), within the allowance a له دور ثانٍ (30). Same boundary
      // (maxCarryOverSubjects) the engine itself uses once every subject is graded.
      else if (r.result === 'قيد الرصد' && r.failedCount > 0) {
        const pastCarry = r.failedCount > maxCarry;
        score += pastCarry ? 45 : 30;
        reasons.push(`رسوب في ${r.failedCount} مادة والرصد لم يكتمل${pastCarry ? ' (تجاوز حد التخلفات)' : ''}`);
      }
      // Aggregate percentage judged by the engine's OWN تقدير, so the model can never disagree with
      // lib/annual.ts: راسب = under the bylaw pass mark (the sub-2.00 CGPA weight); مقبول = the
      // bylaw's lowest passing band, the twin of the credit «معدل منخفض» tier — 20, deliberately
      // BELOW RISK_CUTOFF, so a merely-low average never lists a student on its own.
      if (r.overallGrade === 'راسب') { score += 45; reasons.push(`المجموع العام ${r.overallPct}% أقل من حد النجاح`); }
      else if (r.overallGrade === 'مقبول') { score += 20; reasons.push(`مجموع عام عند حدّ «مقبول» (${r.overallPct}%)`); }
    }
    return riskRow(s, score, reasons);
  });
}

export const predictiveReports: ReportDef[] = [
  {
    id: 'student-risk', category: 'predictive', nameAr: 'الطلاب المعرضون للرسوب (تقدير)',
    description: 'تقدير قائم على القواعد — المعدل والرسوب السابق (ساعات معتمدة) أو نتيجة الفرقة والنسبة المئوية (النظام السنوي) — مؤشر إنذار وليس حكمًا', permission: VIEW,
    // academicYear feeds the annual half (the engine grades one year at a time); unset ⇒ the managed
    // current year. The credit half is CGPA-based and stays lifetime-scoped whatever year is picked.
    filters: ['departmentId', 'programId', 'academicYear'], systemAware: true,
    run: async (f, ctx) => {
      const uni = ctx.universityId ?? null;
      // Both bases feed ONE list with one row shape: nothing selected ⇒ credit + annual together
      // (annual students used to be invisible to the early-warning system entirely); a selected
      // system simply drops the other half.
      const [credit, annual] = await Promise.all([
        ctx.academicSystem === 'ANNUAL' ? Promise.resolve<RiskRow[]>([]) : creditRiskRows(f, uni),
        ctx.academicSystem === 'CREDIT_HOURS' ? Promise.resolve<RiskRow[]>([]) : annualRiskRows(f, uni),
      ]);
      // Credit first so the credit-only view keeps today's exact tie order (Array#sort is stable).
      const rows = [...credit, ...annual].filter((r) => r.risk >= RISK_CUTOFF).sort((a, b) => b.risk - a.risk);
      return {
        kind: 'table',
        columns: [{ key: 'studentCode', label: 'الرقم' }, { key: 'name', label: 'الاسم' }, { key: 'risk', label: 'نسبة الخطر %', align: 'center', numeric: true }, { key: 'reasons', label: 'السبب' }],
        rows: rows.map((r) => ({ ...r, risk: `${r.risk}%` })),
        totals: { studentCode: 'عدد الطلاب المعرضين', name: `${rows.length}` },
        meta: { note: 'تقدير قائم على القواعد — مؤشر إنذار مبكر وليس قرارًا نهائيًا' },
      };
    },
  },
  {
    id: 'graduation-funnel', category: 'predictive', nameAr: 'مسار التخرج (Graduation Funnel)',
    description: 'المتقدمون ← المقيدون ← المستمرون ← المتوقع تخرجهم', permission: VIEW, filters: [], systemAware: true,
    run: async (_f, ctx) => {
      const uni = ctx.universityId ?? undefined;
      // Application carries no program link, so the "المقبولون" stage cannot be system-scoped.
      const [accepted, students] = await Promise.all([
        prisma.application.count({ where: { universityId: uni, status: 'ACCEPTED' } }),
        prisma.student.findMany({ where: { universityId: uni, ...academicSystemWhere(ctx.academicSystem) }, select: { id: true, status: true } }),
      ]);
      const registered = students.length;
      const active = students.filter((s) => !['WITHDRAWN', 'DISMISSED', 'GRADUATED'].includes(s.status));
      // The expected-graduates test is earned-hours based, which annual students never accumulate —
      // they would all read "remainingHours = full plan" and silently deflate the stage. Compute it
      // over credit-hours students only (empty set when the view is scoped to ANNUAL).
      const creditActive = ctx.academicSystem === 'ANNUAL' ? [] : await prisma.student.findMany({
        where: { id: { in: active.map((s) => s.id) }, ...academicSystemWhere('CREDIT_HOURS') },
        select: { id: true },
      });
      const standings = await computeStandingForStudents(creditActive.map((s) => s.id));
      const expected = [...standings.values()].filter((s) => s.graduationEligible || s.remainingHours <= 18).length;
      const rows = [
        { stage: 'المقبولون', count: accepted }, { stage: 'المقيدون', count: registered },
        { stage: 'المستمرون', count: active.length }, { stage: 'المتوقع تخرجهم', count: expected },
      ];
      return { kind: 'table', columns: [{ key: 'stage', label: 'المرحلة' }, { key: 'count', label: 'العدد', align: 'center', numeric: true }], rows };
    },
  },
  {
    id: 'early-warning', category: 'predictive', nameAr: 'نظام الإنذار المبكر (Early Warning)',
    description: 'تنبيهات على انخفاض النجاح/التحصيل وزيادة التسرب', permission: VIEW, filters: [], systemAware: true,
    run: async (_f, ctx) => {
      const uni = ctx.universityId ?? undefined;
      // Dropout + collection follow the selected system (invoices via their student); section
      // over-capacity is a scheduling signal with no system dimension, so it stays global.
      const [students, invoices] = await Promise.all([
        prisma.student.findMany({ where: { universityId: uni, ...academicSystemWhere(ctx.academicSystem) }, select: { status: true } }),
        prisma.invoice.aggregate({ where: { universityId: uni, ...studentSystemWhere(ctx.academicSystem) }, _sum: { total: true, paid: true } }),
      ]);
      const total = students.length || 1;
      const dropout = Math.round((students.filter((s) => ['WITHDRAWN', 'DISMISSED'].includes(s.status)).length / total) * 100);
      const billed = Number(invoices._sum.total ?? 0); const collected = Number(invoices._sum.paid ?? 0);
      const collection = billed ? Math.round((collected / billed) * 100) : 100;
      const alerts: { indicator: string; value: string; level: string }[] = [];
      if (dropout > 15) alerts.push({ indicator: 'ارتفاع معدل التسرب', value: `${dropout}%`, level: 'خطر' });
      if (collection < 70) alerts.push({ indicator: 'انخفاض التحصيل المالي', value: `${collection}%`, level: 'تحذير' });
      const overflow = await prisma.section.findMany({ include: { items: true } });
      const over = overflow.filter((s) => s.items.length > s.capacity).length;
      if (over > 0) alerts.push({ indicator: 'تجاوز الطاقة الاستيعابية', value: `${over} شعبة`, level: 'تحذير' });
      if (!alerts.length) alerts.push({ indicator: 'لا توجد تنبيهات حرجة', value: '—', level: 'جيد' });
      return { kind: 'table', columns: [{ key: 'indicator', label: 'المؤشر' }, { key: 'value', label: 'القيمة', align: 'center' }, { key: 'level', label: 'المستوى', align: 'center' }], rows: alerts };
    },
  },
];
