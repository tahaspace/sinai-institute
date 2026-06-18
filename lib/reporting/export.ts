import type { ReportResult, TableResult } from '@/lib/reporting/types';

/**
 * Export engine (ClientR3 — R0). Dependency-free CSV now (UTF-8 BOM so Excel reads Arabic); the
 * hub does print-to-PDF via the browser for the official ministry sheet layouts. Excel (.xlsx via
 * exceljs) is an R7 polish item.
 */
function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(result: ReportResult): string {
  if (result.kind === 'kpi') {
    const header = 'المؤشر,القيمة';
    const lines = result.cards.map((c) => `${csvCell(c.label)},${csvCell(c.value)}`);
    return '﻿' + [header, ...lines].join('\n');
  }
  const t = result as TableResult;
  const header = t.columns.map((c) => csvCell(c.label)).join(',');
  const body = t.rows.map((r) => t.columns.map((c) => csvCell(r[c.key])).join(',')).join('\n');
  const totals = t.totals ? '\n' + t.columns.map((c) => csvCell(t.totals![c.key] ?? '')).join(',') : '';
  return '﻿' + header + '\n' + body + totals;
}

export function csvResponseHeaders(filename: string): HeadersInit {
  return { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.csv"` };
}
