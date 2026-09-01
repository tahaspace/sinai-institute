import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { getReport } from '@/lib/reporting/registry';
import { parseFilters } from '@/lib/reporting/filters';
import { getProgramSystem } from '@/lib/academic-system';
import { toCsv, csvResponseHeaders, toExcelXml, excelResponseHeaders } from '@/lib/reporting/export';

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

    // Resolve the active academic system server-side from the selected program (if any), so
    // "both"-system reports can branch credit-hours vs annual. No program selected → undefined
    // (the report spans both / segregates per-row via academicSystemWhere).
    const academicSystem = filters.programId ? await getProgramSystem(filters.programId) : undefined;
    const result = await report.run(filters, { universityId: guard.ctx.universityId ?? null, academicSystem });

    const format = sp.get('format');
    if (format === 'csv') {
      return new NextResponse(toCsv(result), { headers: csvResponseHeaders(report.id) });
    }
    if (format === 'xlsx' || format === 'excel') {
      return new NextResponse(toExcelXml(result, report.nameAr), { headers: excelResponseHeaders(report.id) });
    }
    return NextResponse.json({ id, nameAr: report.nameAr, result });
  } catch (e) {
    console.error('Error running report:', e);
    return NextResponse.json({ error: 'فشل في تشغيل التقرير' }, { status: 500 });
  }
}
