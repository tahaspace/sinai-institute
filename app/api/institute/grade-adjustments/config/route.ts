import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { getRafaaConfig, getImprovementConfig, saveRafaaConfig, saveImprovementConfig } from '@/lib/rafaa';

// GET — the bylaw config for both engines. PATCH — save (permission gradeadjust.config).
export async function GET() {
  const guard = await requirePermission('gradeadjust.view');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const [rafaa, improvement] = await Promise.all([getRafaaConfig(), getImprovementConfig()]);
  return NextResponse.json({ rafaa, improvement });
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('gradeadjust.config');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const b = await request.json().catch(() => ({}));
    if (b.rafaa && typeof b.rafaa === 'object') await saveRafaaConfig(b.rafaa);
    if (b.improvement && typeof b.improvement === 'object') await saveImprovementConfig(b.improvement);
    const [rafaa, improvement] = await Promise.all([getRafaaConfig(), getImprovementConfig()]);
    return NextResponse.json({ ok: true, rafaa, improvement });
  } catch (error) {
    console.error('Error saving grade-adjustment config:', error);
    return NextResponse.json({ error: 'فشل في حفظ الإعدادات' }, { status: 500 });
  }
}
