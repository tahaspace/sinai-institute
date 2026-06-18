import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { getReport } from '@/lib/reporting/registry';
import { parseFilters } from '@/lib/reporting/filters';
import { toCsv, csvResponseHeaders } from '@/lib/reporting/export';

// Run a single report by id (ClientR3 — R0). ?format=csv → download. Each report carries its own
// permission; required filters are enforced before running.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const report = getReport(id);
    if (!report) return NextResponse.json({ error: 'تقرير غير معروف' }, { status: 404 });

    const guard = await requirePermission(report.permission);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const sp = new URL(request.url).searchParams;
    const filters = parseFilters(sp);
    for (const req of report.requires ?? []) {
      if (!filters[req]) return NextResponse.json({ error: `الفلتر "${req}" مطلوب لهذا التقرير` }, { status: 400 });
    }

    const result = await report.run(filters, { universityId: guard.ctx.universityId ?? null });

    if (sp.get('format') === 'csv') {
      return new NextResponse(toCsv(result), { headers: csvResponseHeaders(report.id) });
    }
    return NextResponse.json({ id, nameAr: report.nameAr, result });
  } catch (e) {
    console.error('Error running report:', e);
    return NextResponse.json({ error: 'فشل في تشغيل التقرير' }, { status: 500 });
  }
}
