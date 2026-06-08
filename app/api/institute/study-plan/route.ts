import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import prisma from '@/lib/prisma';

type Course = { code: string; name: string; hours: number };
type Semester = { name: string; courses: Course[] };
type Year = { year: string; semesters: Semester[] };

export async function GET() {
  try {
    const guard = await requirePermission('plan.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const items = await prisma.studyPlanItem.findMany({ orderBy: { order: 'asc' } });

    const program = items[0]?.programName ?? '';
    const totalHours = items.reduce((acc, item) => acc + item.hours, 0);

    // Preserve year-then-semester order as encountered (rows already ordered by `order`).
    const years: Year[] = [];
    const yearByName = new Map<string, Year>();

    for (const item of items) {
      let year = yearByName.get(item.year);
      if (!year) {
        year = { year: item.year, semesters: [] };
        yearByName.set(item.year, year);
        years.push(year);
      }

      let semester = year.semesters.find((s) => s.name === item.semester);
      if (!semester) {
        semester = { name: item.semester, courses: [] };
        year.semesters.push(semester);
      }

      semester.courses.push({
        code: item.courseCode,
        name: item.courseName,
        hours: item.hours,
      });
    }

    return NextResponse.json({ studyPlan: { program, totalHours, years } });
  } catch (e) {
    console.error('GET /api/institute/study-plan failed', e);
    return NextResponse.json({ error: 'fail' }, { status: 500 });
  }
}
