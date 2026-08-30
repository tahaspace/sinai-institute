import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/holds/students — the selectable roster for the "hold results"
// screen: students by filter, each with their outstanding fees + current hold state.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('hold.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const g = (k: string) => { const v = searchParams.get(k); return v && v !== 'all' ? v : undefined; };

    const where: Prisma.StudentWhereInput = {};
    const departmentId = g('departmentId'); if (departmentId) where.departmentId = departmentId;
    const programId = g('programId'); if (programId) where.programId = programId;
    const facultyId = g('facultyId'); if (facultyId) where.facultyId = facultyId;
    const level = g('level'); if (level) where.level = parseInt(level, 10);
    const search = searchParams.get('search')?.trim();
    if (search) where.OR = [
      { nameAr: { contains: search, mode: 'insensitive' } },
      { studentCode: { contains: search, mode: 'insensitive' } },
    ];
    const paymentStatus = g('paymentStatus'); // paid | unpaid

    const students = await prisma.student.findMany({
      where,
      select: {
        id: true, studentCode: true, nameAr: true, level: true,
        department: { select: { nameAr: true } },
        program: { select: { nameAr: true } },
        feeAccounts: { select: { totalFees: true, payments: { select: { amount: true, status: true } } } },
        holds: { where: { status: 'ACTIVE' }, select: { id: true, type: true } },
      },
      orderBy: { studentCode: 'asc' },
      take: 500,
    });

    let rows = students.map((s) => {
      let outstanding = 0;
      for (const a of s.feeAccounts) {
        const paid = a.payments.filter((p) => p.status === 'paid').reduce((x, p) => x + p.amount, 0);
        outstanding += Math.max(0, a.totalFees - paid);
      }
      outstanding = Math.round(outstanding * 100) / 100;
      return {
        id: s.id, studentCode: s.studentCode, name: s.nameAr, level: s.level,
        department: s.department?.nameAr ?? '—', program: s.program?.nameAr ?? '—',
        outstanding, paymentStatus: outstanding > 0 ? 'unpaid' : 'paid',
        activeHolds: s.holds.map((h) => h.type), held: s.holds.length > 0,
      };
    });
    if (paymentStatus === 'unpaid') rows = rows.filter((r) => r.paymentStatus === 'unpaid');
    if (paymentStatus === 'paid') rows = rows.filter((r) => r.paymentStatus === 'paid');

    return NextResponse.json({
      students: rows,
      stats: { total: rows.length, withDebt: rows.filter((r) => r.outstanding > 0).length, held: rows.filter((r) => r.held).length },
    });
  } catch (error) {
    console.error('Error listing hold-screen students:', error);
    return NextResponse.json({ error: 'فشل في جلب الطلاب' }, { status: 500 });
  }
}
