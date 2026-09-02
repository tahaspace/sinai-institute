import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeSystem } from '@/lib/academic-system';
import { requirePermission } from '@/lib/authz';
import { arAging, statementOfAccount } from '@/lib/finance/billing';

// AR read reports (Finance v2 — Phase 2). ?type=aging | statement&studentCode=…
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.report.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const sp = new URL(request.url).searchParams;
    const type = sp.get('type') || 'aging';
    const uni = guard.ctx.universityId ?? null;

    if (type === 'statement') {
      const code = sp.get('studentCode');
      if (!code) return NextResponse.json({ error: 'studentCode مطلوب' }, { status: 400 });
      const student = await prisma.student.findFirst({ where: { studentCode: code, ...(uni ? { universityId: uni } : {}) } });
      if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
      const report = await statementOfAccount(uni, student.id);
      return NextResponse.json({ type, student: { code: student.studentCode, name: student.nameAr }, report });
    }
    const report = await arAging(uni);
    // Tag each aging row with its student's academic system so the registrar can narrow the list.
    // Resolved here rather than in the AR engine: buckets, totals and grandTotal must keep tying to
    // the AR control account, so the system is a row label the client filters on — never a where.
    const codes = [...new Set(report.rows.map((r) => r.studentCode))];
    const students = codes.length
      ? await prisma.student.findMany({
          where: { studentCode: { in: codes } }, // studentCode is globally unique
          select: { studentCode: true, program: { select: { academicSystem: true } } },
        })
      : [];
    const systemByCode = new Map(students.map((s) => [s.studentCode, normalizeSystem(s.program?.academicSystem)] as const));
    const rows = report.rows.map((r) => ({ ...r, system: systemByCode.get(r.studentCode) ?? 'CREDIT_HOURS' }));
    return NextResponse.json({ type: 'aging', report: { ...report, rows } });
  } catch (e) {
    console.error('Error building AR report:', e);
    return NextResponse.json({ error: 'فشل في إنشاء تقرير المدينين' }, { status: 500 });
  }
}
