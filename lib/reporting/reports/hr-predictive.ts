import prisma from '@/lib/prisma';
import type { ReportDef, ReportRow } from '@/lib/reporting/types';
import { NO_DATA } from '@/lib/reporting/kpi';

/**
 * HR predictive analytics (ClientR4 — R4c-5). Transparent, RULE-BASED estimates (not ML) computed
 * from signals we actually store — each row carries the reason behind its score, and anything with
 * no backing data returns NO_DATA. Same honesty contract as the ClientR3 predictive reports: these
 * are decision-support estimates, explicitly labelled, never fabricated.
 */
const EMP = 'hr.employee.view';
const ATT = 'hr.attendance.view';
const PAY = 'payroll.view';
const RETIREMENT_AGE = 60;
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

export const hrPredictiveReports: ReportDef[] = [
  {
    id: 'hr-predict-attrition', category: 'hr', nameAr: 'توقع ترك العمل (تقدير)',
    description: 'تقدير قائم على قواعد من إشارات فعلية: الغياب، الجزاءات، قرب انتهاء العقد، آخر تقييم — ليس تنبؤًا آليًا',
    permission: EMP, filters: [],
    run: async (_f, ctx) => {
      const uid = ctx.universityId ?? null;
      const emps = await prisma.employee.findMany({ where: { universityId: uid, isActive: true }, select: { id: true, code: true, nameAr: true, contractEnd: true } });
      if (!emps.length) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: NO_DATA } };
      const ids = emps.map((e) => e.id);
      const since = daysAgo(90);
      const [absences, penalties, reviews] = await Promise.all([
        prisma.employeeAttendance.groupBy({ by: ['employeeId'], where: { employeeId: { in: ids }, status: 'A', date: { gte: since } }, _count: { _all: true } }),
        prisma.penalty.groupBy({ by: ['employeeId'], where: { employeeId: { in: ids }, date: { gte: daysAgo(180) } }, _count: { _all: true } }),
        prisma.performanceReview.findMany({ where: { employeeId: { in: ids } }, orderBy: { createdAt: 'desc' }, select: { employeeId: true, totalScore: true } }),
      ]);
      const absMap = new Map(absences.map((a) => [a.employeeId, a._count._all]));
      const penMap = new Map(penalties.map((p) => [p.employeeId, p._count._all]));
      const scoreMap = new Map<string, number>();
      for (const r of reviews) if (!scoreMap.has(r.employeeId)) scoreMap.set(r.employeeId, r.totalScore);
      const soon = new Date(Date.now() + 90 * 86400000);
      const rows: ReportRow[] = [];
      for (const e of emps) {
        const reasons: string[] = [];
        let score = 0;
        const abs = absMap.get(e.id) ?? 0;
        if (abs >= 3) { score += Math.min(35, abs * 7); reasons.push(`غياب متكرر (${abs})`); }
        const pen = penMap.get(e.id) ?? 0;
        if (pen > 0) { score += Math.min(25, pen * 12); reasons.push(`جزاءات (${pen})`); }
        if (e.contractEnd && e.contractEnd <= soon) { score += 25; reasons.push('عقد قارب الانتهاء'); }
        const perf = scoreMap.get(e.id);
        if (perf != null && perf < 60) { score += 20; reasons.push('تقييم منخفض'); }
        if (score > 0) rows.push({ code: e.code, name: e.nameAr, risk: Math.min(100, score), level: score >= 60 ? 'مرتفع' : score >= 30 ? 'متوسط' : 'منخفض', reason: reasons.join('، ') });
      }
      rows.sort((a, b) => (b.risk as number) - (a.risk as number));
      if (!rows.length) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا توجد إشارات خطر حالية' } };
      return { kind: 'table', columns: [{ key: 'code', label: 'الكود' }, { key: 'name', label: 'الاسم' }, { key: 'risk', label: 'درجة الخطر (تقدير)', align: 'center', numeric: true }, { key: 'level', label: 'المستوى', align: 'center' }, { key: 'reason', label: 'المؤشرات' }], rows };
    },
  },
  {
    id: 'hr-predict-absence', category: 'hr', nameAr: 'الأكثر عرضة للغياب (تقدير)',
    description: 'ترتيب حسب معدل الغياب والتأخير خلال آخر 90 يومًا', permission: ATT, filters: [],
    run: async (_f, ctx) => {
      const uid = ctx.universityId ?? null;
      const since = daysAgo(90);
      const recs = await prisma.employeeAttendance.findMany({ where: { universityId: uid, date: { gte: since } }, include: { employee: { select: { code: true, nameAr: true } } } });
      if (!recs.length) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: NO_DATA } };
      const m = new Map<string, { code: string; name: string; total: number; absent: number; late: number }>();
      for (const r of recs) { const g = m.get(r.employeeId) ?? { code: r.employee.code, name: r.employee.nameAr, total: 0, absent: 0, late: 0 }; g.total++; if (r.status === 'A') g.absent++; if (r.lateMinutes > 0) g.late++; m.set(r.employeeId, g); }
      const rows = [...m.values()].map((g) => ({ code: g.code, name: g.name, absent: g.absent, late: g.late, rate: g.total ? `${Math.round(((g.absent + g.late) / g.total) * 100)}%` : '0%', score: g.total ? Math.round(((g.absent * 2 + g.late) / (g.total * 2)) * 100) : 0 }))
        .filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
      return { kind: 'table', columns: [{ key: 'code', label: 'الكود' }, { key: 'name', label: 'الاسم' }, { key: 'absent', label: 'غياب', align: 'center', numeric: true }, { key: 'late', label: 'تأخير', align: 'center', numeric: true }, { key: 'rate', label: 'المعدل', align: 'center' }, { key: 'score', label: 'مؤشر الخطر', align: 'center', numeric: true }], rows };
    },
  },
  {
    id: 'hr-predict-retirement', category: 'hr', nameAr: 'القريبون من سن المعاش',
    description: `حساب فعلي من تاريخ الميلاد (سن التقاعد ${RETIREMENT_AGE})`, permission: EMP, filters: [],
    run: async (_f, ctx) => {
      const uid = ctx.universityId ?? null;
      const emps = await prisma.employee.findMany({ where: { universityId: uid, isActive: true, birthDate: { not: null } }, select: { code: true, nameAr: true, birthDate: true } });
      if (!emps.length) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: NO_DATA } };
      const now = Date.now();
      const rows = emps.map((e) => { const age = Math.floor((now - new Date(e.birthDate as Date).getTime()) / (365.25 * 86400000)); return { code: e.code, name: e.nameAr, age, yearsLeft: RETIREMENT_AGE - age }; })
        .filter((r) => r.yearsLeft <= 5).sort((a, b) => a.yearsLeft - b.yearsLeft);
      if (!rows.length) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا يوجد من يقترب من سن المعاش خلال 5 سنوات' } };
      return { kind: 'table', columns: [{ key: 'code', label: 'الكود' }, { key: 'name', label: 'الاسم' }, { key: 'age', label: 'العمر', align: 'center', numeric: true }, { key: 'yearsLeft', label: 'سنوات حتى المعاش', align: 'center', numeric: true }], rows };
    },
  },
  {
    id: 'hr-predict-payroll-cost', category: 'hr', nameAr: 'توقع تكلفة الرواتب',
    description: 'إسقاط من آخر مسير رواتب (بافتراض ثبات العمالة والأجور) — تقدير', permission: PAY, filters: [],
    run: async (_f, ctx) => {
      const run = await prisma.payRun.findFirst({ where: { universityId: ctx.universityId ?? null }, orderBy: { month: 'desc' } });
      if (!run) return { kind: 'kpi', cards: [{ key: 'na', label: 'توقع تكلفة الرواتب', value: NO_DATA }] };
      const monthly = Number(run.netTotal);
      return {
        kind: 'kpi',
        cards: [
          { key: 'month', label: `آخر مسير (${run.month})`, value: monthly.toFixed(2), unit: 'ج.م' },
          { key: 'year', label: 'تكلفة سنة (تقدير)', value: (monthly * 12).toFixed(2), unit: 'ج.م' },
          { key: 'three', label: 'تكلفة 3 سنوات (تقدير)', value: (monthly * 36).toFixed(2), unit: 'ج.م' },
        ],
      };
    },
  },
];
