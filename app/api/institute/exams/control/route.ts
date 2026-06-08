import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/exams/control
// Returns exam control committees + control tasks (with their committee name)
// and summary stats for the control dashboard.
export async function GET() {
  try {
    const guard = await requirePermission('exam.control.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [committees, tasks] = await Promise.all([
      prisma.examCommittee.findMany(),
      prisma.controlTask.findMany({ include: { committee: true } }),
    ]);

    return NextResponse.json({
      committees: committees.map((c) => ({
        id: c.id,
        name: c.name,
        department: c.department ?? '',
        head: c.head ?? '',
        members: c.members,
        courses: c.courses,
        status: c.status,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assignee: t.assignee || '',
        committee: t.committee?.name || '',
      })),
      stats: {
        committees: committees.length,
        active: committees.filter((c) => c.status === 'active').length,
        pendingTasks: tasks.filter((t) => t.status !== 'done').length,
      },
    });
  } catch (error) {
    console.error('Error listing exam control data:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الكنترول' }, { status: 500 });
  }
}
