import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { getRafaaConfig, getImprovementConfig, saveRafaaConfig, saveImprovementConfig, getModuleConfig, saveModuleConfig } from '@/lib/rafaa';

// GET — the bylaw config for both engines + the master module toggle. PATCH — save (permission gradeadjust.config).
export async function GET() {
  const guard = await requirePermission('gradeadjust.view');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const [rafaa, improvement, module_] = await Promise.all([getRafaaConfig(), getImprovementConfig(), getModuleConfig()]);
  return NextResponse.json({ rafaa, improvement, module: module_ });
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('gradeadjust.config');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const b = await request.json().catch(() => ({}));
    if (b.rafaa && typeof b.rafaa === 'object') await saveRafaaConfig(b.rafaa);
    if (b.improvement && typeof b.improvement === 'object') await saveImprovementConfig(b.improvement);
    if (b.module && typeof b.module === 'object') await saveModuleConfig(b.module);
    const [rafaa, improvement, module_] = await Promise.all([getRafaaConfig(), getImprovementConfig(), getModuleConfig()]);
    return NextResponse.json({ ok: true, rafaa, improvement, module: module_ });
  } catch (error) {
    console.error('Error saving grade-adjustment config:', error);
    return NextResponse.json({ error: 'فشل في حفظ الإعدادات' }, { status: 500 });
  }
}
