import prisma from '@/lib/prisma';
import type { Filters, FilterKey } from '@/lib/reporting/types';
import { ACADEMIC_SYSTEM_LABELS, academicSystemWhere, normalizeSystemFilter } from '@/lib/academic-system';

// academicSystemWhere now lives in lib/academic-system.ts next to the other resolvers; re-exported
// here so the reports that already import it from this module keep working unchanged.
export { academicSystemWhere } from '@/lib/academic-system';

/**
 * Shared filter helpers (ClientR3 — R0). Reads/validates the filter querystring and provides the
 * option lists the hub UI needs (year/term/faculty/dept/program/course/advisor), tenant-scoped.
 */
export const SEMESTERS = [
  { value: 'first', label: 'الفصل الأول' },
  { value: 'second', label: 'الفصل الثاني' },
  { value: 'summer', label: 'الصيفي' },
];

export function parseFilters(sp: URLSearchParams): Filters {
  // NOTE: 'academicSystem' must stay in this list — parseFilters silently drops unknown keys, so a
  // typo (e.g. the near-identical 'academicYear') would return UNFILTERED data with no error.
  const keys: FilterKey[] = ['academicYear', 'semester', 'facultyId', 'departmentId', 'programId', 'level', 'courseId', 'advisorId', 'instructorId', 'studentCode', 'dateFrom', 'dateTo', 'status', 'qualification', 'academicSystem'];
  const f: Filters = {};
  for (const k of keys) {
    const v = sp.get(k);
    if (v != null && v !== '' && v !== 'all') f[k] = v;
  }
  return f;
}

/** Prisma where-fragment for the common term filter. */
export function termWhere(f: Filters): { academicYear?: string; semester?: string } {
  const w: { academicYear?: string; semester?: string } = {};
  if (f.academicYear) w.academicYear = f.academicYear;
  if (f.semester) w.semester = f.semester;
  return w;
}

/** Prisma where-fragment scoping Students by the structural filters. */
export function studentWhere(f: Filters, universityId: string | null): Record<string, unknown> {
  const w: Record<string, unknown> = {};
  if (universityId) w.universityId = universityId;
  if (f.departmentId) w.departmentId = f.departmentId;
  if (f.facultyId) w.facultyId = f.facultyId;
  if (f.programId) w.programId = f.programId;
  if (f.level) w.level = parseInt(f.level, 10);
  if (f.advisorId) w.advisorId = f.advisorId;
  if (f.qualification) w.entryQualification = f.qualification;
  if (f.status) w.status = f.status;
  // Optional academic-system narrowing — absent/'all' contributes nothing, so the default stays "both".
  // Composed under AND (not spread) because the CREDIT_HOURS fragment is an `OR`, and a report that
  // hard-scopes its own system would otherwise silently overwrite this one's `OR` key.
  const sys = academicSystemWhere(normalizeSystemFilter(f.academicSystem));
  if (Object.keys(sys).length) w.AND = [...(Array.isArray(w.AND) ? w.AND : []), sys];
  return w;
}

/** Option lists for the hub filter bar (tenant-scoped). */
export async function filterOptions(universityId: string | null) {
  const scope = universityId ? { universityId } : {};
  const [faculties, departments, programs, courses, advisors, years] = await Promise.all([
    prisma.faculty.findMany({ where: scope, select: { id: true, nameAr: true }, orderBy: { nameAr: 'asc' } }),
    prisma.department.findMany({ where: scope, select: { id: true, nameAr: true, facultyId: true }, orderBy: { nameAr: 'asc' } }),
    prisma.program.findMany({ where: scope, select: { id: true, nameAr: true, departmentId: true }, orderBy: { nameAr: 'asc' } }),
    prisma.course.findMany({ where: scope, select: { id: true, code: true, nameAr: true }, orderBy: { code: 'asc' } }),
    prisma.instructor.findMany({ where: scope, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.enrollment.findMany({ where: universityId ? {} : {}, distinct: ['academicYear'], select: { academicYear: true }, orderBy: { academicYear: 'desc' } }),
  ]);
  return {
    faculties: faculties.map((x) => ({ value: x.id, label: x.nameAr })),
    departments: departments.map((x) => ({ value: x.id, label: x.nameAr, facultyId: x.facultyId })),
    programs: programs.map((x) => ({ value: x.id, label: x.nameAr, departmentId: x.departmentId })),
    courses: courses.map((x) => ({ value: x.id, label: `${x.code} — ${x.nameAr}` })),
    advisors: advisors.map((x) => ({ value: x.id, label: x.name })),
    semesters: SEMESTERS,
    academicYears: [...new Set(years.map((y) => y.academicYear))].map((y) => ({ value: y, label: y })),
    levels: [1, 2, 3, 4, 5, 6].map((l) => ({ value: String(l), label: `المستوى ${l}` })),
    // No 'all' entry here — every filter select in the hub renders its own «الكل» option, which is
    // the default. The filter narrows the view; it never hides rows by itself.
    academicSystems: [
      { value: 'CREDIT_HOURS', label: ACADEMIC_SYSTEM_LABELS.CREDIT_HOURS },
      { value: 'ANNUAL', label: ACADEMIC_SYSTEM_LABELS.ANNUAL },
    ],
  };
}
