import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { currentUserId } from '@/lib/student';
import { previewAdjustments, createAdjustmentBatch, getModuleConfig } from '@/lib/rafaa';

// GET /api/institute/grade-adjustments?academicYear=&yearGroup=&programId=&departmentId= — رأفة/رفع preview for a فرقة.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('gradeadjust.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear') || '';
    const yearGroup = parseInt(searchParams.get('yearGroup') || searchParams.get('level') || '', 10);
    if (!academicYear || !yearGroup) return NextResponse.json({ error: 'العام الدراسي والفرقة مطلوبان' }, { status: 400 });
    const g = (k: string) => { const v = searchParams.get(k); return v && v !== 'all' ? v : null; };

    // Master toggle: if the institute's bylaw disables the module, return an empty, flagged result.
    if (!(await getModuleConfig()).enabled) {
      return NextResponse.json({ moduleEnabled: false, rows: [], stats: { total: 0, rafaa: 0, improvement: 0, rescued: 0 } });
    }

    const rows = await previewAdjustments({ academicYear, yearGroup, programId: g('programId'), departmentId: g('departmentId') });
    return NextResponse.json({
      moduleEnabled: true,
      rows,
      stats: {
        total: rows.length,
        rafaa: rows.filter((r) => r.benefitedRafaa).length,
        improvement: rows.filter((r) => r.benefitedImprovement).length,
        rescued: rows.filter((r) => r.benefitedRafaa && r.originalResult !== r.postResult).length,
      },
    });
  } catch (error) {
    console.error('Error previewing grade adjustments:', error);
    return NextResponse.json({ error: 'فشل في حساب الرأفة/رفع التقدير' }, { status: 500 });
  }
}

// POST /api/institute/grade-adjustments — create a DRAFT adjustment batch from the selection.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('gradeadjust.apply');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const b = await request.json().catch(() => ({}));
    if (!b.academicYear || !b.yearGroup) return NextResponse.json({ error: 'العام الدراسي والفرقة مطلوبان' }, { status: 400 });
    if (!(await getModuleConfig()).enabled) return NextResponse.json({ error: 'موديول الرأفة ورفع التقدير غير مُفعّل حسب لائحة المعهد' }, { status: 403 });

    const batch = await createAdjustmentBatch(
      { academicYear: String(b.academicYear), yearGroup: parseInt(String(b.yearGroup), 10), programId: b.programId ?? null, departmentId: b.departmentId ?? null, universityId: guard.ctx.universityId },
      Array.isArray(b.studentIds) ? b.studentIds : [],
      await currentUserId()
    );
    return NextResponse.json({ ok: true, batchId: batch.id, rafaaCount: batch.rafaaCount, improvementCount: batch.improvementCount, items: batch.items.length }, { status: 201 });
  } catch (error) {
    console.error('Error creating grade-adjustment batch:', error);
    return NextResponse.json({ error: 'فشل في إنشاء دفعة الرأفة/الرفع' }, { status: 500 });
  }
}
