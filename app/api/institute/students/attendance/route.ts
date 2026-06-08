import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/students/attendance — institute-wide attendance aggregates.
export async function GET() {
  try {
    const guard = await requirePermission('attendance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const students = await prisma.student.findMany({ include: { attendances: true, department: true } });
    const tracked = students.filter((s) => s.attendances.length > 0);

    const pctOf = (s: (typeof tracked)[number]) => {
      const total = s.attendances.length;
      const present = s.attendances.filter((a) => a.status === 'present').length;
      const late = s.attendances.filter((a) => a.status === 'late').length;
      return total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    };

    const rows = tracked.map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      name: s.nameAr,
      department: s.department?.nameAr ?? '',
      attendance: pctOf(s),
      absences: s.attendances.filter((a) => a.status === 'absent').length,
    }));

    // per-department average attendance (used in place of the old per-course view)
    const byDept = new Map<string, { name: string; sum: number; n: number }>();
    for (const r of rows) {
      const b = byDept.get(r.department) ?? { name: r.department || 'غير محدد', sum: 0, n: 0 };
      b.sum += r.attendance;
      b.n += 1;
      byDept.set(r.department, b);
    }
    const departmentAttendance = [...byDept.values()].map((b) => ({ name: b.name, attendance: Math.round(b.sum / b.n) }));

    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.attendance, 0) / rows.length) : 0;
    const warningStudents = rows.filter((r) => r.attendance < 75).sort((a, b) => a.attendance - b.attendance);

    return NextResponse.json({
      stats: { trackedStudents: rows.length, avgAttendance: avg, atRisk: warningStudents.length },
      departmentAttendance,
      warningStudents,
    });
  } catch (error) {
    console.error('Error aggregating attendance:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الحضور' }, { status: 500 });
  }
}
