import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// Attendance rate counts present + late as "attended" (late students were present).
const attendedRate = (present: number, late: number, total: number) =>
  total > 0 ? Math.round(((present + late) / total) * 100) : 0;

// GET /api/student/attendance?studentCode=
// Returns recent records, monthly summary, and overall stats.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const records = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: 'desc' },
    });

    // Recent records list (most recent 8) for the UI feed.
    const recent = records.slice(0, 8).map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      day: AR_DAYS[r.date.getUTCDay()],
      status: r.status,
      note: r.note ?? '',
    }));

    // Overall stats
    const presentDays = records.filter((r) => r.status === 'present').length;
    const absentDays = records.filter((r) => r.status === 'absent').length;
    const lateDays = records.filter((r) => r.status === 'late').length;
    const totalDays = records.length;

    // Monthly summary (grouped by year-month, most recent first)
    const buckets = new Map<string, { present: number; absent: number; late: number; y: number; m: number }>();
    for (const r of records) {
      const y = r.date.getUTCFullYear();
      const m = r.date.getUTCMonth();
      const key = `${y}-${m}`;
      const b = buckets.get(key) || { present: 0, absent: 0, late: 0, y, m };
      if (r.status === 'present') b.present++;
      else if (r.status === 'absent') b.absent++;
      else if (r.status === 'late') b.late++;
      buckets.set(key, b);
    }
    const monthlyStats = [...buckets.values()]
      .sort((a, b) => b.y - a.y || b.m - a.m)
      .map((b) => ({
        month: AR_MONTHS[b.m],
        present: b.present,
        absent: b.absent,
        late: b.late,
        percentage: attendedRate(b.present, b.late, b.present + b.absent + b.late),
      }));

    return NextResponse.json({
      student: { id: student.id, studentCode: student.studentCode, name: student.nameAr },
      stats: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        percentage: attendedRate(presentDays, lateDays, totalDays),
      },
      records: recent,
      monthlyStats,
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'فشل في جلب سجل الحضور' }, { status: 500 });
  }
}
