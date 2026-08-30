import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { requireStaff } from '@/lib/student';
import { getAcademicYears, addAcademicYear, removeAcademicYear, setCurrentYear } from '@/lib/academic-years';

// GET — the managed academic-years list (any staff: consumed by import/promotion dropdowns).
export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json(await getAcademicYears());
}

// PATCH — manage the list (settings edit). { action: 'add'|'remove'|'setCurrent', year }.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('institute.settings.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const b = await request.json().catch(() => ({}));
    const year = String(b.year ?? '').trim();
    if (!year) return NextResponse.json({ error: 'السنة مطلوبة' }, { status: 400 });
    let result;
    if (b.action === 'add') result = await addAcademicYear(year);
    else if (b.action === 'remove') result = await removeAcademicYear(year);
    else if (b.action === 'setCurrent') result = await setCurrentYear(year);
    else return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 422 });
  }
}
