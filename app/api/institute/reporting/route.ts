import { NextResponse } from 'next/server';
import { requirePermission, sessionToCtx, hasPermission } from '@/lib/authz';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reportCatalogue } from '@/lib/reporting/registry';
import { filterOptions } from '@/lib/reporting/filters';

// Reporting hub catalogue + filter option lists (ClientR3 — R0).
// Returns only the reports the caller is permitted to run.
export async function GET() {
  try {
    const guard = await requirePermission('reports.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const session = await getServerSession(authOptions);
    const ctx = sessionToCtx(session);

    const catalogue = reportCatalogue()
      .map((cat) => ({ ...cat, reports: cat.reports.filter((r) => hasPermission(ctx, r.permission)) }))
      .filter((cat) => cat.reports.length > 0);

    const options = await filterOptions(guard.ctx.universityId ?? null);
    return NextResponse.json({ catalogue, options });
  } catch (e) {
    console.error('Error loading report catalogue:', e);
    return NextResponse.json({ error: 'فشل في جلب قائمة التقارير' }, { status: 500 });
  }
}
