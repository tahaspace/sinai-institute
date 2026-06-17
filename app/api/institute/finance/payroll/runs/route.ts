import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { createPayRun } from '@/lib/finance/payroll';

export async function GET() {
  try {
    const guard = await requirePermission('payroll.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const runs = await prisma.payRun.findMany({ where: { universityId: guard.ctx.universityId ?? null }, include: { payslips: { include: { employee: { select: { nameAr: true } } } } }, orderBy: { month: 'desc' }, take: 60 });
    return NextResponse.json({
      runs: runs.map((r) => ({
        id: r.id, month: r.month, status: r.status,
        gross: Number(r.grossTotal.toFixed(2)), tax: Number(r.taxTotal.toFixed(2)), insurance: Number(r.insuranceTotal.toFixed(2)), net: Number(r.netTotal.toFixed(2)),
        payslips: r.payslips.map((p) => ({ employee: p.employee.nameAr, gross: Number(p.gross.toFixed(2)), tax: Number(p.tax.toFixed(2)), insurance: Number(p.insurance.toFixed(2)), net: Number(p.net.toFixed(2)) })),
      })),
    });
  } catch (e) {
    console.error('Error listing pay runs:', e);
    return NextResponse.json({ error: 'فشل في جلب مسيرات الرواتب' }, { status: 500 });
  }
}

// POST { month: "2026-06" } — create a draft pay run (payroll.run).
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('payroll.run');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const session = await getServerSession(authOptions);
    const uid = (session?.user as { id?: string } | undefined)?.id ?? null;
    const body = await request.json();
    if (!body?.month) return NextResponse.json({ error: 'الشهر مطلوب' }, { status: 400 });
    try {
      const res = await createPayRun({ universityId: guard.ctx.universityId ?? null, month: body.month, createdById: uid });
      return NextResponse.json({ ok: true, ...res }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error creating pay run:', e);
    return NextResponse.json({ error: 'فشل في إنشاء مسير الرواتب' }, { status: 500 });
  }
}
