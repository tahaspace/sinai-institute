import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { currentUserId } from '@/lib/student';
import { parseImportBuffer, validateImportRows, commitImport } from '@/lib/student-import';

// POST /api/institute/students/import — multipart: file + action=preview|commit + cohort opts.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('student.import');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const form = await request.formData();
    const file = form.get('file');
    const action = String(form.get('action') ?? 'preview');
    if (!file || typeof file === 'string' || typeof (file as Blob).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'يرجى رفع ملف Excel/CSV' }, { status: 400 });
    }
    const buf = Buffer.from(await (file as Blob).arrayBuffer());

    let rows: Record<string, string>[];
    try { rows = parseImportBuffer(buf); }
    catch { return NextResponse.json({ error: 'تعذّر قراءة الملف — تأكد أنه Excel/CSV صحيح' }, { status: 400 }); }
    if (!rows.length) return NextResponse.json({ error: 'الملف فارغ أو لا يحتوي على أعمدة معروفة' }, { status: 400 });

    if (action === 'preview') {
      const v = await validateImportRows(rows);
      return NextResponse.json({ preview: v.rows.slice(0, 500), total: rows.length, validCount: v.validCount, errorCount: v.errorCount });
    }

    const opts = {
      academicYear: String(form.get('academicYear') ?? '').trim(),
      semester: String(form.get('semester') ?? 'first'),
      programId: (form.get('programId') as string) || null,
      facultyId: (form.get('facultyId') as string) || null,
      departmentId: (form.get('departmentId') as string) || null,
      level: parseInt(String(form.get('level') ?? '1'), 10) || 1,
      universityId: guard.ctx.universityId,
      fileName: (file as File).name ?? null,
    };
    if (!opts.academicYear) return NextResponse.json({ error: 'العام الأكاديمي مطلوب' }, { status: 400 });
    const res = await commitImport(rows, opts, await currentUserId());
    return NextResponse.json({ ok: true, ...res });
  } catch (error) {
    console.error('Error importing students:', error);
    return NextResponse.json({ error: 'فشل في استيراد الطلاب' }, { status: 500 });
  }
}
