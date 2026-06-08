import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/student';

// GET /api/lms/assignments — assignments with submission stats + recent submissions.
export async function GET() {
  try {
    const guard = await requireSession();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const items = await prisma.assignment.findMany({
      include: { course: { include: { _count: { select: { enrollments: true } } } }, submissions: { include: { student: true } } },
      orderBy: { dueDate: 'desc' },
    });

    const now = Date.now();
    const assignments = items.map((a) => {
      const graded = a.submissions.filter((s) => s.status === 'graded').length;
      return {
        id: a.id,
        title: a.title,
        subject: a.course.nameAr,
        dueDate: a.dueDate.toISOString().slice(0, 10),
        maxGrade: a.maxGrade,
        submissions: a.submissions.length,
        total: a.course._count.enrollments,
        graded,
        status: a.dueDate.getTime() >= now ? 'active' : 'completed',
      };
    });

    // recent submissions across all assignments (for the grading queue)
    const submissions = items
      .flatMap((a) => a.submissions.map((s) => ({
        id: s.id,
        student: s.student.nameAr,
        assignment: a.title,
        submittedAt: s.submittedAt ? s.submittedAt.toISOString().slice(0, 16).replace('T', ' ') : '',
        status: s.status === 'submitted' ? 'pending' : s.status,
        grade: s.grade,
      })))
      .slice(0, 12);

    const pendingGrading = items.flatMap((a) => a.submissions).filter((s) => s.status === 'submitted' || s.status === 'late').length;
    const gradedSubs = items.flatMap((a) => a.submissions).filter((s) => s.grade != null);
    return NextResponse.json({
      assignments,
      submissions,
      stats: {
        total: assignments.length,
        active: assignments.filter((a) => a.status === 'active').length,
        completed: assignments.filter((a) => a.status === 'completed').length,
        pendingGrading,
        avgGrade: gradedSubs.length ? Math.round(gradedSubs.reduce((s, x) => s + (x.grade ?? 0), 0) / gradedSubs.length) : 0,
      },
    });
  } catch (error) {
    console.error('Error listing lms assignments:', error);
    return NextResponse.json({ error: 'فشل في جلب الواجبات' }, { status: 500 });
  }
}
