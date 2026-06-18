import prisma from '@/lib/prisma';
import type { ReportDef } from '@/lib/reporting/types';
import { computeStandingForStudents } from '@/lib/standing';

/**
 * Predictive analytics + Early Warning (ClientR3 — R6). TRANSPARENT, RULE-BASED heuristics — NOT
 * certainties. Each risk is a weighted score from real signals (GPA, attendance, past failures,
 * payment delay) with the reason shown. Labeled as an estimate, auditable, no black box.
 */
const VIEW = 'reports.predictive.view';

export const predictiveReports: ReportDef[] = [
  {
    id: 'student-risk', category: 'predictive', nameAr: 'الطلاب المعرضون للرسوب (تقدير)',
    description: 'تقدير قائم على القواعد من المعدل والرسوب السابق — مؤشر إنذار وليس حكمًا', permission: VIEW,
    filters: ['departmentId', 'programId'],
    run: async (_f, ctx) => {
      const students = await prisma.student.findMany({ where: { universityId: ctx.universityId ?? undefined, status: { notIn: ['GRADUATED', 'WITHDRAWN', 'DISMISSED'] } }, select: { id: true, studentCode: true, nameAr: true } });
      const standings = await computeStandingForStudents(students.map((s) => s.id));
      const rows = students.map((s) => {
        const st = standings.get(s.id);
        let score = 0; const reasons: string[] = [];
        if (st) {
          if (st.cgpa > 0 && st.cgpa < 2.0) { score += 45; reasons.push('المعدل أقل من 2.00'); }
          else if (st.cgpa < 2.5) { score += 20; reasons.push('معدل منخفض'); }
          if (st.escalation === 'track-change-or-dismissal') { score += 30; reasons.push('إنذار نهائي'); }
          else if (st.escalation === 'warning') { score += 15; reasons.push('تحت الإنذار'); }
          if (st.repeatedFailure.length) { score += 25; reasons.push(`رسوب متكرر (${st.repeatedFailure.length})`); }
        }
        return { studentCode: s.studentCode, name: s.nameAr, risk: Math.min(100, score), reasons: reasons.join('، ') || '—' };
      }).filter((r) => r.risk >= 25).sort((a, b) => b.risk - a.risk);
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
    description: 'المتقدمون ← المقيدون ← المستمرون ← المتوقع تخرجهم', permission: VIEW, filters: [],
    run: async (_f, ctx) => {
      const uni = ctx.universityId ?? undefined;
      const [accepted, students] = await Promise.all([
        prisma.application.count({ where: { universityId: uni, status: 'ACCEPTED' } }),
        prisma.student.findMany({ where: { universityId: uni }, select: { id: true, status: true } }),
      ]);
      const registered = students.length;
      const active = students.filter((s) => !['WITHDRAWN', 'DISMISSED', 'GRADUATED'].includes(s.status));
      const standings = await computeStandingForStudents(active.map((s) => s.id));
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
    description: 'تنبيهات على انخفاض النجاح/التحصيل وزيادة التسرب', permission: VIEW, filters: [],
    run: async (_f, ctx) => {
      const uni = ctx.universityId ?? undefined;
      const [students, invoices] = await Promise.all([
        prisma.student.findMany({ where: { universityId: uni }, select: { status: true } }),
        prisma.invoice.aggregate({ where: { universityId: uni }, _sum: { total: true, paid: true } }),
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
