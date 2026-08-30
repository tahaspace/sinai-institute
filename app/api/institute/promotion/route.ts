import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { currentUserId } from '@/lib/student';
import { evaluateCohort, createBatch } from '@/lib/promotion';

// GET /api/institute/promotion?academicYear=&level=&programId=&departmentId= — cohort evaluation.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('student.promote');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear') || '';
    const level = parseInt(searchParams.get('level') || '', 10);
    if (!academicYear || !level) return NextResponse.json({ error: 'العام الدراسي والمستوى مطلوبان' }, { status: 400 });
    const g = (k: string) => { const v = searchParams.get(k); return v && v !== 'all' ? v : null; };

    const rows = await evaluateCohort({ academicYear, level, programId: g('programId'), departmentId: g('departmentId') });
    return NextResponse.json({
      rows,
      stats: {
        total: rows.length,
        eligible: rows.filter((r) => r.eligible).length,
        promote: rows.filter((r) => r.action === 'PROMOTE').length,
        graduate: rows.filter((r) => r.action === 'GRADUATE').length,
        stay: rows.filter((r) => r.action === 'STAY').length,
        skip: rows.filter((r) => r.action === 'SKIP').length,
      },
    });
  } catch (error) {
    console.error('Error evaluating promotion cohort:', error);
    return NextResponse.json({ error: 'فشل في تقييم الطلاب للترحيل' }, { status: 500 });
  }
}

// POST /api/institute/promotion — create a DRAFT promotion batch from the selection.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('student.promote');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const b = await request.json().catch(() => ({}));
    if (!b.fromYear || !b.toYear || !b.fromLevel) return NextResponse.json({ error: 'بيانات الترحيل غير مكتملة' }, { status: 400 });

    const batch = await createBatch(
      {
        fromYear: String(b.fromYear), toYear: String(b.toYear),
        fromSemester: b.fromSemester ?? null, toSemester: b.toSemester ?? null,
        programId: b.programId ?? null, departmentId: b.departmentId ?? null,
        fromLevel: parseInt(String(b.fromLevel), 10), toLevel: b.toLevel ? parseInt(String(b.toLevel), 10) : null,
        universityId: guard.ctx.universityId,
      },
      Array.isArray(b.studentIds) ? b.studentIds : [],
      await currentUserId()
    );
    return NextResponse.json({ ok: true, batchId: batch.id, eligibleCount: batch.eligibleCount, items: batch.items.length }, { status: 201 });
  } catch (error) {
    console.error('Error creating promotion batch:', error);
    return NextResponse.json({ error: 'فشل في إنشاء دفعة الترحيل' }, { status: 500 });
  }
}
