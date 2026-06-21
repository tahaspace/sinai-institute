import type { ReportResult } from '@/lib/reporting/types';

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
  const t = result; // table | sheet — both carry columns/rows/totals
  const header = t.columns.map((c) => csvCell(c.label)).join(',');
  const body = t.rows.map((r) => t.columns.map((c) => csvCell(r[c.key])).join(',')).join('\n');
  const totals = t.totals ? '\n' + t.columns.map((c) => csvCell(t.totals![c.key] ?? '')).join(',') : '';
  return '﻿' + header + '\n' + body + totals;
}

export function csvResponseHeaders(filename: string): HeadersInit {
  return { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.csv"` };
}

// ---- Excel (SpreadsheetML 2003 — dependency-free, Excel opens it natively, RTL-friendly) ----
function xmlEsc(v: unknown): string {
  const s = v == null ? '' : String(v);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function xlCell(v: unknown, numeric: boolean): string {
  if (numeric && v != null && v !== '' && !Number.isNaN(Number(v))) {
    return `<Cell><Data ss:Type="Number">${xmlEsc(v)}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${xmlEsc(v)}</Data></Cell>`;
}

export function toExcelXml(result: ReportResult, title: string): string {
  let header: string[] = [];
  let rows: string[][] = [];
  let numericCols: boolean[] = [];
  if (result.kind === 'kpi') {
    header = ['المؤشر', 'القيمة']; numericCols = [false, false];
    rows = result.cards.map((c) => [c.label, String(c.value)]);
  } else {
    const t = result; // table | sheet
    header = t.columns.map((c) => c.label);
    numericCols = t.columns.map((c) => !!c.numeric);
    rows = t.rows.map((r) => t.columns.map((c) => (r[c.key] == null ? '' : String(r[c.key]))));
    if (t.totals) rows.push(t.columns.map((c) => (t.totals![c.key] == null ? '' : String(t.totals![c.key]))));
  }
  const headerRow = `<Row>${header.map((h) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${xmlEsc(h)}</Data></Cell>`).join('')}</Row>`;
  const bodyRows = rows.map((r) => `<Row>${r.map((v, i) => xlCell(v, numericCols[i])).join('')}</Row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles><Style ss:ID="hdr"><Font ss:Bold="1"/><Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/></Style></Styles>
 <Worksheet ss:Name="${xmlEsc(title).slice(0, 28)}"><Table>${headerRow}${bodyRows}</Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><DisplayRightToLeft/></WorksheetOptions>
 </Worksheet>
</Workbook>`;
}

export function excelResponseHeaders(filename: string): HeadersInit {
  return { 'Content-Type': 'application/vnd.ms-excel; charset=utf-8', 'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.xls"` };
}
