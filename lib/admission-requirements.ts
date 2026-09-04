/**
 * متطلبات الالتحاق بالبرنامج — per-programme admission requirements the institute TYPES.
 *
 * The bylaw states them per department, e.g. قسم الإرشاد السياحي (reg-full.txt:54-58):
 *   «1-ان يكون طالب حصل علي ثانويه عامه .
 *    2-حصول علي تقدير جيد في اللغة الاجنيبيه الاولي المتخصصه
 *    3-، ناجحا في اللغه الاجنبيه الثانيه وتاريخ مصر القديمه واثارها .
 *    4-اجتياز امتحان القدرات التي تحدده لجنه قطاع المعاهد العليا للساحة والاثار التابعة لقطاع
 *      التعليم بوزارة التعليم العالي ورجال صناعة سياحة في مصر عشان يحددوا تم قبوله من عدمه .»
 *
 * None of that is derivable from what an Application carries — one `highSchoolGrade Float` and a
 * free-text `qualificationType`, with no per-subject grades and no aptitude-test result. So the
 * platform does NOT invent per-subject applicant data: it lets the institute WRITE the four kinds
 * of condition the bylaw uses (qualification type · overall minimum · per-subject minimums ·
 * interview/aptitude) against the programme, and prints them beside the applicant at review time so
 * the reviewer checks the paper file against the rule instead of from memory.
 *
 * Stored as JSON text in Program.admissionRequirements (nullable — a programme that never typed any
 * is byte-identical to today). This module is PURE (no prisma, no server imports) so the review
 * screen can import it from a "use client" file.
 */

/** One named prior subject and what the bylaw demands in it. */
export type AdmissionSubjectRule = {
  subject: string; // «اللغة الأجنبية الأولى المتخصصة»
  // What is demanded: a pass («ناجحا في …») or a named grade/percentage («تقدير جيد في …»).
  // `minGrade` is free text on purpose — a bylaw says «جيد», not a number, and the ثانوية عامة
  // ladder is not this institute's GradeStatus ladder.
  requirement: 'pass' | 'grade' | 'percent';
  minGrade?: string;
  minPercent?: number;
};

export type AdmissionRequirements = {
  /** «ان يكون طالب حصل علي ثانويه عامه» — accepted prior qualifications; empty = any. */
  qualifications: string[];
  /** Minimum overall percentage on the prior certificate; null = the bylaw sets none. */
  minOverallPercent: number | null;
  /** Named prior subjects with their own condition. */
  subjects: AdmissionSubjectRule[];
  /** «اجتياز امتحان القدرات» — an aptitude test the applicant must pass. */
  aptitudeTest: boolean;
  /** A personal interview / مقابلة شخصية. */
  interview: boolean;
  /** Anything the four shapes above cannot hold, in the institute's own words. */
  notes: string;
};

export const EMPTY_ADMISSION_REQUIREMENTS: AdmissionRequirements = {
  qualifications: [],
  minOverallPercent: null,
  subjects: [],
  aptitudeTest: false,
  interview: false,
  notes: '',
};

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse whatever is stored (or posted) into the canonical shape. Never throws: a malformed blob —
 * a hand-edited row, an older shape — reads as "no requirements typed", which is exactly how a
 * programme behaved before this field existed (rule 1).
 */
export function parseAdmissionRequirements(raw: unknown): AdmissionRequirements {
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return { ...EMPTY_ADMISSION_REQUIREMENTS };
    try {
      obj = JSON.parse(raw);
    } catch {
      return { ...EMPTY_ADMISSION_REQUIREMENTS };
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ...EMPTY_ADMISSION_REQUIREMENTS };
  const o = obj as Record<string, unknown>;
  const qualifications = Array.isArray(o.qualifications)
    ? o.qualifications.map(str).filter(Boolean)
    : [];
  const subjects: AdmissionSubjectRule[] = Array.isArray(o.subjects)
    ? o.subjects
        .map((s) => {
          const r = (s ?? {}) as Record<string, unknown>;
          const subject = str(r.subject);
          if (!subject) return null;
          const requirement = r.requirement === 'grade' || r.requirement === 'percent' ? r.requirement : 'pass';
          const rule: AdmissionSubjectRule = { subject, requirement };
          if (requirement === 'grade') rule.minGrade = str(r.minGrade) || undefined;
          if (requirement === 'percent') {
            const p = num(r.minPercent);
            if (p != null) rule.minPercent = p;
          }
          return rule;
        })
        .filter((s): s is AdmissionSubjectRule => s !== null)
    : [];
  return {
    qualifications,
    minOverallPercent: num(o.minOverallPercent),
    subjects,
    aptitudeTest: o.aptitudeTest === true,
    interview: o.interview === true,
    notes: str(o.notes),
  };
}

/** True when the institute typed nothing at all — the screen then says so rather than showing an empty checklist. */
export function isEmptyAdmissionRequirements(r: AdmissionRequirements): boolean {
  return (
    r.qualifications.length === 0 &&
    r.minOverallPercent === null &&
    r.subjects.length === 0 &&
    !r.aptitudeTest &&
    !r.interview &&
    !r.notes
  );
}

/**
 * Serialize for storage. An empty set stores NULL, not "{}" — so "never configured" and "configured
 * to nothing" stay the same row, and clearing the form really clears the requirement.
 */
export function serializeAdmissionRequirements(raw: unknown): string | null {
  const parsed = parseAdmissionRequirements(raw);
  return isEmptyAdmissionRequirements(parsed) ? null : JSON.stringify(parsed);
}

/** One Arabic line per typed condition — the checklist printed beside the applicant. */
export function admissionRequirementLines(r: AdmissionRequirements): string[] {
  const out: string[] = [];
  if (r.qualifications.length) out.push(`المؤهل المقبول: ${r.qualifications.join(' أو ')}`);
  if (r.minOverallPercent != null) out.push(`الحد الأدنى للمجموع: ${r.minOverallPercent}%`);
  for (const s of r.subjects) {
    if (s.requirement === 'grade' && s.minGrade) out.push(`تقدير ${s.minGrade} على الأقل في: ${s.subject}`);
    else if (s.requirement === 'percent' && s.minPercent != null) out.push(`${s.minPercent}% على الأقل في: ${s.subject}`);
    else out.push(`النجاح في: ${s.subject}`);
  }
  if (r.aptitudeTest) out.push('اجتياز امتحان القدرات');
  if (r.interview) out.push('اجتياز المقابلة الشخصية');
  if (r.notes) out.push(r.notes);
  return out;
}

/**
 * The applicant's overall percentage on the PRIOR certificate.
 *
 * `Application.highSchoolGrade` is NOT a percentage: the applicant form asks for
 * «مجموع الثانوية العامة (من 410)» and stores the raw total. The certificate's own maximum is a
 * ministry figure that changes between years, so it is never a literal here — the caller passes the
 * institute's configured value (`priorCertificateMaxTotal` in the bylaw settings).
 *
 * CONVERSION HAPPENS HERE AND ONLY HERE. Callers pass the RAW stored total; nobody divides first.
 *
 * Returns null when either half is missing or the maximum is not usable — an unmeasurable
 * percentage must be reported as «يُراجَع يدوياً», never as a number.
 */
export function priorCertificatePercent(
  highSchoolGrade: number | null | undefined,
  maxTotal: number | null | undefined,
): number | null {
  if (highSchoolGrade == null || !Number.isFinite(highSchoolGrade)) return null;
  if (maxTotal == null || !Number.isFinite(maxTotal) || maxTotal <= 0) return null;
  return (highSchoolGrade / maxTotal) * 100;
}

/**
 * The ONE condition the stored applicant data can actually decide: the overall percentage, against
 * Application.highSchoolGrade. Everything else is checked on the paper file, so it is returned as
 * `null` = «يُراجَع يدوياً» rather than guessed at — a false green tick on an unverifiable rule is
 * worse than no tick.
 *
 * `maxTotal` is the prior certificate's own maximum (see priorCertificatePercent). Until the
 * institute configures it the answer is null — manual review — because comparing a raw 380 against
 * a 70% floor admits every applicant, which is the one direction this must never fail in.
 */
export function checkOverallPercent(
  r: AdmissionRequirements,
  highSchoolGrade: number | null | undefined,
  maxTotal: number | null | undefined,
): boolean | null {
  if (r.minOverallPercent == null) return null;
  const pct = priorCertificatePercent(highSchoolGrade, maxTotal);
  if (pct == null) return null;
  return pct >= r.minOverallPercent;
}
