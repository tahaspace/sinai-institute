import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { getHoldSettings, HOLD_SETTINGS_KEY, HOLD_TYPES, HOLD_TYPE_DEFAULTS, HOLD_SCOPES, SCOPE_LABELS } from '@/lib/holds';

// GET — current hold settings + the type catalog (per-type default message/scopes + any override).
export async function GET() {
  try {
    const guard = await requirePermission('hold.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const settings = await getHoldSettings();
    const types = HOLD_TYPES.map((t) => ({
      code: t,
      nameAr: HOLD_TYPE_DEFAULTS[t].nameAr,
      defaultMessageAr: HOLD_TYPE_DEFAULTS[t].messageAr,
      defaultScopes: HOLD_TYPE_DEFAULTS[t].scopes,
      override: settings.types[t] ?? null,
    }));
    return NextResponse.json({
      settings,
      types,
      scopes: HOLD_SCOPES.map((s) => ({ key: s, label: SCOPE_LABELS[s] })),
    });
  } catch (error) {
    console.error('Error loading hold settings:', error);
    return NextResponse.json({ error: 'فشل في جلب إعدادات الحجب' }, { status: 500 });
  }
}

// PATCH — merge into the settings JSON (autoFinanceHold/Release + per-type message/scope overrides).
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('hold.config');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json().catch(() => ({}));
    const current = await getHoldSettings();
    const next = {
      ...current,
      ...(typeof body.autoFinanceHold === 'boolean' ? { autoFinanceHold: body.autoFinanceHold } : {}),
      ...(typeof body.autoFinanceRelease === 'boolean' ? { autoFinanceRelease: body.autoFinanceRelease } : {}),
      types: { ...current.types, ...(body.types ?? {}) },
    };
    // Setting has a compound unique [universityId, key]; mirror getHoldSettings' key-only read.
    const existing = await prisma.setting.findFirst({ where: { key: HOLD_SETTINGS_KEY } });
    if (existing) {
      await prisma.setting.update({ where: { id: existing.id }, data: { value: JSON.stringify(next) } });
    } else {
      await prisma.setting.create({ data: { key: HOLD_SETTINGS_KEY, value: JSON.stringify(next), universityId: guard.ctx.universityId } });
    }
    return NextResponse.json({ ok: true, settings: next });
  } catch (error) {
    console.error('Error saving hold settings:', error);
    return NextResponse.json({ error: 'فشل في حفظ إعدادات الحجب' }, { status: 500 });
  }
}
