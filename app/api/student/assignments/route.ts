import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';

// GET /api/student/assignments — the student's assignments (with submission state) + stats.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const subs = await prisma.assignmentSubmission.findMany({
      where: { studentId: student.id },
      include: { assignment: { include: { course: true } } },
      orderBy: { assignment: { dueDate: 'desc' } },
    });

    const assignments = subs.map((s) => ({
      id: s.id,
      title: s.assignment.title,
      subject: s.assignment.course.nameAr,
      teacher: s.assignment.instructor ?? '',
      dueDate: s.assignment.dueDate.toISOString().slice(0, 10),
      status: s.status,
      grade: s.grade,
      maxGrade: s.assignment.maxGrade,
    }));

    const count = (st: string) => assignments.filter((a) => a.status === st).length;
    const gradedWithScore = subs.filter((s) => s.grade != null && s.assignment.maxGrade > 0);
    const averageGrade = gradedWithScore.length
      ? Math.round(
          (gradedWithScore.reduce((acc, s) => acc + (s.grade! / s.assignment.maxGrade) * 100, 0) /
            gradedWithScore.length)
        )
      : 0;

    return NextResponse.json({
      student: { id: student.id, studentCode: student.studentCode, name: student.nameAr },
      assignments,
      stats: {
        total: assignments.length,
        pending: count('pending'),
        submitted: count('submitted'),
        graded: count('graded'),
        late: count('late'),
        averageGrade,
      },
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'فشل في جلب الواجبات' }, { status: 500 });
  }
}
