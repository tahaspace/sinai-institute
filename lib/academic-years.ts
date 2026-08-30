/**
 * ClientR6 note — managed list of academic years («السنوات الدراسية»).
 * The import/promotion screens must pick the academic year from THIS list (a
 * dropdown activated in system settings), not free-text, so all data files under
 * one consistent year name. Stored in Setting["institute.academicYears"]; when
 * unset it self-seeds from years already present in the data so the dropdown is
 * never empty before an admin configures it.
 */
import prisma from '@/lib/prisma';

export const ACADEMIC_YEARS_KEY = 'institute.academicYears';
export type AcademicYears = { years: string[]; current: string };

const yearRe = /^\d{4}\s*[/-]\s*\d{4}$/;
const normYear = (s: string) => s.replace(/\s/g, '').replace('/', '-');

/** Distinct years already present in the DB (enrollments + registrations + enrollYear). */
async function yearsFromData(): Promise<string[]> {
  const [enr, reg] = await Promise.all([
    prisma.enrollment.findMany({ select: { academicYear: true }, distinct: ['academicYear'] }),
    prisma.registrationRequest.findMany({ select: { academicYear: true }, distinct: ['academicYear'] }),
  ]);
  const set = new Set<string>();
  for (const r of [...enr, ...reg]) if (r.academicYear && yearRe.test(r.academicYear)) set.add(normYear(r.academicYear));
  return [...set];
}

const sortDesc = (ys: string[]) => [...new Set(ys)].sort((a, b) => b.localeCompare(a));

/** The managed year list. Self-seeds from data (∪ a couple of sensible defaults) when unset. */
export async function getAcademicYears(): Promise<AcademicYears> {
  const row = await prisma.setting.findFirst({ where: { key: ACADEMIC_YEARS_KEY } });
  if (row) {
    try {
      const p = JSON.parse(row.value) as Partial<AcademicYears>;
      const years = sortDesc((p.years ?? []).filter((y) => yearRe.test(y)).map(normYear));
      if (years.length) return { years, current: p.current && years.includes(p.current) ? p.current : years[0] };
    } catch { /* fall through to seed */ }
  }
  const data = await yearsFromData();
  const now = new Date().getFullYear();
  const seed = sortDesc([...data, `${now - 1}-${now}`, `${now}-${now + 1}`]);
  return { years: seed, current: data[0] ? sortDesc(data)[0] : `${now - 1}-${now}` };
}

async function save(next: AcademicYears): Promise<AcademicYears> {
  const value = JSON.stringify(next);
  const existing = await prisma.setting.findFirst({ where: { key: ACADEMIC_YEARS_KEY } });
  if (existing) await prisma.setting.update({ where: { id: existing.id }, data: { value } });
  else await prisma.setting.create({ data: { key: ACADEMIC_YEARS_KEY, value } });
  return next;
}

export async function addAcademicYear(year: string): Promise<AcademicYears> {
  const y = normYear(year.trim());
  if (!yearRe.test(y)) throw new Error('صيغة السنة غير صحيحة — مثال: 2026-2027');
  const cur = await getAcademicYears();
  const years = sortDesc([...cur.years, y]);
  return save({ years, current: cur.current || y });
}

export async function removeAcademicYear(year: string): Promise<AcademicYears> {
  const cur = await getAcademicYears();
  const years = cur.years.filter((x) => x !== year);
  return save({ years, current: years.includes(cur.current) ? cur.current : (years[0] ?? '') });
}

export async function setCurrentYear(year: string): Promise<AcademicYears> {
  const cur = await getAcademicYears();
  const years = cur.years.includes(year) ? cur.years : sortDesc([...cur.years, normYear(year)]);
  return save({ years, current: year });
}
