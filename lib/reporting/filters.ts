import prisma from '@/lib/prisma';
import type { Filters, FilterKey } from '@/lib/reporting/types';

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
  const keys: FilterKey[] = ['academicYear', 'semester', 'facultyId', 'departmentId', 'programId', 'level', 'courseId', 'advisorId', 'instructorId', 'studentCode', 'dateFrom', 'dateTo', 'status', 'qualification'];
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
  return w;
}

/**
 * Where-fragment restricting students to one academic system via their program. Needed because a dual-system
 * institute shares level/فرقة numbers across a credit-hour AND an annual program — without this, a level-2
 * annual student would leak into the credit-hour level sheet (and vice-versa). CREDIT_HOURS is the default,
 * so students with no program count as credit-hours; ANNUAL requires an explicit ANNUAL program.
 */
export function academicSystemWhere(system: 'CREDIT_HOURS' | 'ANNUAL'): Record<string, unknown> {
  return system === 'ANNUAL'
    ? { program: { academicSystem: 'ANNUAL' } }
    : { OR: [{ program: { academicSystem: 'CREDIT_HOURS' } }, { programId: null }] };
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
  };
}
