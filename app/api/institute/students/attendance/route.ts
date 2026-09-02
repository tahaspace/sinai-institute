import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { academicSystemWhere, normalizeSystemFilter } from '@/lib/academic-system';
import { getRegulations } from '@/lib/regulations';

// GET /api/institute/students/attendance?system= — institute-wide attendance aggregates.
// `system` narrows the population to one academic system; omitted/'all' narrows nothing.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('attendance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    // The warning cut-off belongs to the bylaw, not to this route: hardcoding 75 here would make
    // this card disagree with the deprivation screen the moment an institute edits the rule.
    const reg = await getRegulations();

    // This payload is aggregates, not rows: the stats, the per-department averages and the warning
    // list all fall out of the SAME population. So the narrowing goes on the population query — a
    // browser-side pass over the warning list would leave the cards above it quoting institute-wide
    // figures. `undefined` → {} → an unconstrained findMany, i.e. byte-identical to before.
    const system = normalizeSystemFilter(new URL(request.url).searchParams.get('system'));
    const students = await prisma.student.findMany({
      where: academicSystemWhere(system) as Prisma.StudentWhereInput,
      include: { attendances: true, department: true },
    });
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
    const warningStudents = rows.filter((r) => r.attendance < reg.attendanceWarnThreshold).sort((a, b) => a.attendance - b.attendance);

    return NextResponse.json({
      // echoed so the screen can label an empty result "no matches" rather than "no students"
      system: system ?? null,
      stats: { trackedStudents: rows.length, avgAttendance: avg, atRisk: warningStudents.length },
      departmentAttendance,
      warningStudents,
    });
  } catch (error) {
    console.error('Error aggregating attendance:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الحضور' }, { status: 500 });
  }
}
