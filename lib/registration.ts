import prisma from '@/lib/prisma';
import { getRegulations } from '@/lib/regulations';
import { computeAcademicStanding } from '@/lib/standing';

// Course-registration validation engine. Encodes the bylaw's registration rules:
// min/max hours, prerequisites, time conflict, probation hour cap, repeated failure,
// summer-term restrictions. Returns structured issues so the UI can show each rule.

export type ValidationIssue = { rule: string; message: string; severity: 'error' | 'warning' };

export type RegistrationValidation = {
  ok: boolean; // no errors (warnings are allowed)
  issues: ValidationIssue[];
  totalHours: number;
  maxHours: number;
  minHours: number;
};

type SectionFull = {
  id: string;
  day: string | null;
  startMin: number | null;
  endMin: number | null;
  offering: { academicYear: string; semester: string; status: string; course: { id: string; code: string; nameAr: string; creditHours: number; availableInSummer: boolean; prerequisites: { id: string; code: string }[] } };
};

function overlaps(a: SectionFull, b: SectionFull): boolean {
  if (!a.day || !b.day || a.day !== b.day) return false;
  if (a.startMin == null || a.endMin == null || b.startMin == null || b.endMin == null) return false;
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

export async function validateRegistration(
  studentId: string,
  academicYear: string,
  semester: string,
  sectionIds: string[],
): Promise<RegistrationValidation> {
  const reg = await getRegulations();
  const issues: ValidationIssue[] = [];
  const isSummer = semester === 'summer';

  const sections = (await prisma.section.findMany({
    where: { id: { in: sectionIds } },
    include: { offering: { include: { course: { include: { prerequisites: { select: { id: true, code: true } } } } } } },
  })) as unknown as SectionFull[];

  const totalHours = sections.reduce((s, x) => s + x.offering.course.creditHours, 0);

  // probation hour cap overrides the regular max
  const standing = await computeAcademicStanding(studentId);
  const regularMax = isSummer ? reg.summerMaxHours : reg.maxRegHours;
  const maxHours = standing?.onProbation ? Math.min(regularMax, reg.probationHourCap) : regularMax;
  const minHours = isSummer ? 0 : reg.minRegHours;

  // --- hours bounds ---
  if (totalHours > maxHours) {
    issues.push({ rule: 'max-hours', message: `إجمالي الساعات ${totalHours} يتجاوز الحد الأقصى ${maxHours}${standing?.onProbation ? ' (تحت الملاحظة)' : ''}`, severity: 'error' });
  }
  if (sectionIds.length > 0 && totalHours < minHours) {
    issues.push({ rule: 'min-hours', message: `إجمالي الساعات ${totalHours} أقل من الحد الأدنى ${minHours}`, severity: 'error' });
  }

  // prior enrollments (for prerequisites + repeated failure)
  const [priorEnrollments, statuses] = await Promise.all([
    prisma.enrollment.findMany({ where: { studentId }, include: { course: { select: { id: true } } } }),
    prisma.gradeStatus.findMany(),
  ]);
  const byCode = new Map(statuses.map((s) => [s.code, s]));
  const passedCourseIds = new Set<string>();
  const failCount = new Map<string, number>();
  for (const e of priorEnrollments) {
    const st = e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : undefined;
    if (st?.isPass) passedCourseIds.add(e.courseId);
    // a "fail" = a graded, non-pass, GPA-affecting status (F/NE/BL/DN/DS)
    if (st && !st.isPass && st.affectsGpa && st.points != null) {
      failCount.set(e.courseId, (failCount.get(e.courseId) ?? 0) + 1);
    }
  }

  for (const sec of sections) {
    const c = sec.offering.course;

    // --- offering belongs to the requested term and is open ---
    if (sec.offering.academicYear !== academicYear || sec.offering.semester !== semester) {
      issues.push({ rule: 'wrong-term', message: `${c.code}: الشعبة ليست ضمن الفصل المطلوب`, severity: 'error' });
    }
    if (sec.offering.status !== 'open') {
      issues.push({ rule: 'offering-closed', message: `${c.code}: التسجيل مغلق لهذا المقرر`, severity: 'error' });
    }

    // --- summer availability ---
    if (isSummer && !c.availableInSummer) {
      issues.push({ rule: 'summer-only', message: `${c.code}: غير متاح في الفصل الصيفي`, severity: 'error' });
    }

    // --- already passed ---
    if (passedCourseIds.has(c.id)) {
      issues.push({ rule: 'already-passed', message: `${c.code}: سبق اجتيازه`, severity: 'warning' });
    }

    // --- prerequisites must be passed ---
    const missing = c.prerequisites.filter((p) => !passedCourseIds.has(p.id));
    if (missing.length) {
      issues.push({ rule: 'prerequisite', message: `${c.code}: متطلب سابق غير مجتاز (${missing.map((m) => m.code).join('، ')})`, severity: 'error' });
    }

    // --- repeated failure ---
    if ((failCount.get(c.id) ?? 0) >= reg.maxCourseAttempts) {
      issues.push({ rule: 'repeated-failure', message: `${c.code}: تكرار الرسوب (${failCount.get(c.id)} مرات) — يتطلب موافقة خاصة`, severity: 'error' });
    }
  }

  // --- time conflicts (pairwise) ---
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      if (overlaps(sections[i], sections[j])) {
        issues.push({ rule: 'time-conflict', message: `تعارض في المواعيد: ${sections[i].offering.course.code} و ${sections[j].offering.course.code}`, severity: 'error' });
      }
    }
  }

  return { ok: !issues.some((x) => x.severity === 'error'), issues, totalHours, maxHours, minHours };
}
