import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// Default teaching-load ceiling by academic title.
const maxHoursByTitle = (title: string | null) => {
  if (!title) return 12;
  if (title.includes('معيد')) return 8;
  if (title.includes('مساعد')) return 14;
  if (title.includes('مدرس')) return 16;
  return 12; // professor
};

// GET /api/institute/faculty/workload — teaching load per instructor.
export async function GET() {
  try {
    const guard = await requirePermission('workload.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const instructors = await prisma.instructor.findMany({
      include: { department: true, courses: { include: { _count: { select: { enrollments: true } } } } },
      orderBy: { name: 'asc' },
    });

    const facultyWorkload = instructors.map((i) => {
      const creditHours = i.courses.reduce((s, c) => s + c.creditHours, 0);
      return {
        name: i.name,
        title: i.title ?? '',
        department: i.department?.nameAr ?? '',
        courses: i.courses.length,
        creditHours,
        maxHours: maxHoursByTitle(i.title),
        students: i.courses.reduce((s, c) => s + c._count.enrollments, 0),
      };
    });

    const totalHours = facultyWorkload.reduce((s, f) => s + f.creditHours, 0);
    const totalMax = facultyWorkload.reduce((s, f) => s + f.maxHours, 0);
    return NextResponse.json({
      facultyWorkload,
      stats: {
        totalHours,
        avgLoad: facultyWorkload.length ? Math.round(totalHours / facultyWorkload.length) : 0,
        facultyCount: facultyWorkload.length,
        coveragePct: totalMax > 0 ? Math.round((totalHours / totalMax) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Error building workload:', error);
    return NextResponse.json({ error: 'فشل في جلب العبء التدريسي' }, { status: 500 });
  }
}
