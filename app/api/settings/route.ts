import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/student';

// Generic namespaced settings store over the Setting key/value table.
// Each settings page owns a key (e.g. "institute.ai") whose value is a JSON blob.

// GET /api/settings?key=<ns> — returns the parsed JSON value (or {} if unset).
export async function GET(request: NextRequest) {
  try {
    const guard = await requireSession();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'المفتاح مطلوب' }, { status: 400 });

    const row = await prisma.setting.findFirst({ where: { key } });
    let value: unknown = {};
    if (row) {
      try {
        value = JSON.parse(row.value);
      } catch {
        value = row.value; // tolerate a plain-string legacy value
      }
    }
    return NextResponse.json({ key, value });
  } catch (error) {
    console.error('Error reading settings:', error);
    return NextResponse.json({ error: 'فشل في جلب الإعدادات' }, { status: 500 });
  }
}

// PATCH /api/settings { key, value } — upserts the JSON blob for a namespace.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireSession();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { key, value } = body ?? {};
    if (!key) return NextResponse.json({ error: 'المفتاح مطلوب' }, { status: 400 });

    const serialized = typeof value === 'string' ? value : JSON.stringify(value ?? {});
    // Setting.key is no longer globally unique (now unique per [universityId,key]);
    // find-then-write. TODO(P5): scope by the session's universityId.
    const existing = await prisma.setting.findFirst({ where: { key } });
    const row = existing
      ? await prisma.setting.update({ where: { id: existing.id }, data: { value: serialized } })
      : await prisma.setting.create({ data: { key, value: serialized } });
    return NextResponse.json({ key: row.key, value, ok: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'فشل في حفظ الإعدادات' }, { status: 500 });
  }
}
