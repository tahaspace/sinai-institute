import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { buildTemplateBuffer } from '@/lib/student-import';

// GET /api/institute/students/import/template — download the .xlsx import template.
export async function GET() {
  const guard = await requirePermission('student.import');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const buf = buildTemplateBuffer();
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="students-import-template.xlsx"',
    },
  });
}
