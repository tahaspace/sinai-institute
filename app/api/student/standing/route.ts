import { NextRequest, NextResponse } from 'next/server';
import { resolveStudent } from '@/lib/student';
import { computeAcademicStanding } from '@/lib/standing';

// GET /api/student/standing — the logged-in student's own academic standing
// (probation/warnings, honor roll, promotion, graduation progress).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });

    const standing = await computeAcademicStanding(student.id);
    return NextResponse.json({
      student: { studentCode: student.studentCode, name: student.nameAr, level: student.level },
      standing,
    });
  } catch (error) {
    console.error('Error computing student standing:', error);
    return NextResponse.json({ error: 'فشل في حساب الحالة الأكاديمية' }, { status: 500 });
  }
}
