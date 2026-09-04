import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission, type AuthContext } from '@/lib/authz';
import { DEFAULT_REGULATIONS, REGULATIONS_KEY, findRegulationsRow, getRegulations } from '@/lib/regulations';
import { GROUPS, CROSS_RULES, COMPONENT_OPTIONS, buildFields, validateAndNormalize, type BuildOptions } from './schema';

/**
 * The bylaw (اللائحة) settings endpoint — the single WRITE path for Setting "institute.regulations".
 *
 * The screen that consumes it is a "use client" file and cannot import lib/regulations.ts (Prisma
 * would land in the browser bundle), so this route ships the whole picture over the wire:
 * the platform defaults, this institute's stored overrides, the field & group schema, and the
 * validation rules — see ./schema.ts for why the field list is derived rather than hand-listed.
 *
 * The generic /api/settings PATCH deliberately refuses this key, so every write of a bylaw value
 * passes the validation below.
 */

/**
 * Reads the raw stored blob (only the keys this institute actually overrode) FOR THIS TENANT.
 *
 * Multi-tenant: the row is resolved by lib/regulations.findRegulationsRow — the very function
 * getRegulations() reads through — so the screen and the engines can never end up on different
 * rows. An institute that has not saved yet inherits the untenanted row (the one a pre-multi-tenant
 * deployment has); its first save creates its own, and institute B can no longer overwrite A.
 */
async function readStored(ctx: AuthContext): Promise<Record<string, unknown>> {
  const row = await findRegulationsRow(ctx);
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Live result-state codes, so «حالة النتيجة عند الحرمان» is a real list and not a free-text guess. */
async function buildOptions(): Promise<BuildOptions> {
  try {
    const statuses = await prisma.gradeStatus.findMany({ orderBy: { order: 'asc' }, select: { code: true, name: true } });
    return { gradeStatuses: statuses };
  } catch {
    return {}; // a tenant with no result-state table yet still gets an editable free-text field
  }
}

// GET /api/institute/settings/regulations — schema + defaults + this institute's overrides.
export async function GET() {
  try {
    const guard = await requirePermission('institute.settings.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [stored, opts, effective] = await Promise.all([
      readStored(guard.ctx),
      buildOptions(),
      // What the ENGINES actually read: getRegulations() normalises the saved blob (sorts the جدول-4
      // bands, drops a nameless band, resets an all-components exemption). The screen hydrates from
      // this so it can never show a table the engines silently rewrote.
      getRegulations(guard.ctx),
    ]);
    return NextResponse.json({
      groups: GROUPS,
      fields: buildFields(stored, opts),
      defaults: DEFAULT_REGULATIONS,
      stored,
      effective,
      rules: CROSS_RULES,
      componentOptions: COMPONENT_OPTIONS,
    });
  } catch (error) {
    console.error('Error reading regulations:', error);
    return NextResponse.json({ error: 'فشل في جلب اللائحة' }, { status: 500 });
  }
}

// PATCH /api/institute/settings/regulations { value } — validates, then replaces the override blob.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('institute.settings.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => null);
    const incoming = (body as { value?: unknown } | null)?.value;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return NextResponse.json({ error: 'صيغة اللائحة غير صحيحة' }, { status: 400 });
    }

    const [previouslyStored, opts] = await Promise.all([readStored(guard.ctx), buildOptions()]);
    const result = validateAndNormalize(incoming as Record<string, unknown>, previouslyStored, opts);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.errors[0].message, errors: result.errors },
        { status: 400 },
      );
    }

    const serialized = JSON.stringify(result.value);
    // Write THIS institute's own row. A platform admin (no university) edits the shared row, which
    // is also the fallback every institute inherits until it saves its own bylaw for the first time.
    const universityId = guard.ctx.isPlatformAdmin ? null : guard.ctx.universityId ?? null;
    const existing = await findRegulationsRow(guard.ctx);
    if (existing && existing.universityId === universityId) {
      await prisma.setting.update({ where: { id: existing.id }, data: { value: serialized } });
    } else {
      // findFirst + create rather than upsert: @@unique([universityId, key]) has a NULLABLE
      // universityId, which Prisma's `universityId_key` filter cannot express (SQL NULL never
      // matches itself) — the same reason lib/reporting/snapshot.ts avoids upsert. `existing` here
      // is the inherited untenanted row, which must stay untouched: it is another institute's
      // fallback, not this one's to overwrite.
      await prisma.setting.create({ data: { universityId, key: REGULATIONS_KEY, value: serialized } });
    }

    return NextResponse.json({ ok: true, stored: result.value });
  } catch (error) {
    console.error('Error saving regulations:', error);
    return NextResponse.json({ error: 'فشل في حفظ اللائحة' }, { status: 500 });
  }
}
