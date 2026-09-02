import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeSystem } from '@/lib/academic-system';
import { requirePermission } from '@/lib/authz';
import { currentUserId } from '@/lib/student';
import { releaseFinancialHoldsIfPaid } from '@/lib/holds';

// GET /api/institute/finance/collection — recent payments (collection feed).
export async function GET() {
  try {
    const guard = await requirePermission('finance.collection.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const payments = await prisma.payment.findMany({
      include: {
        account: {
          include: { student: { include: { department: true, program: { select: { academicSystem: true } } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const recentPayments = payments.map((p) => ({
      id: p.id,
      student: p.account.student.nameAr,
      studentCode: p.account.student.studentCode,
      // Display dimension only — the collection feed may be narrowed by it, the money never is.
      system: normalizeSystem(p.account.student.program?.academicSystem),
      department: p.account.student.department?.nameAr ?? 'غير محدد',
      amount: p.amount,
      method: p.method ?? '-',
      receipt: p.receipt ?? '-',
      status: p.status,
      date: (p.paidAt ?? p.dueDate ?? p.createdAt).toISOString().slice(0, 10),
    }));

    const collectedToday = 0; // not tracked per-day in test data
    const stats = {
      totalPayments: payments.length,
      collected: payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
      pending: payments.filter((p) => p.status !== 'paid').reduce((s, p) => s + p.amount, 0),
      collectedToday,
    };

    // Department-level collection breakdown (accounting/collection page).
    // Iterate every FeeAccount so departments with no payments still appear.
    const accounts = await prisma.feeAccount.findMany({
      include: { payments: true, student: { include: { department: true } } },
    });
    const deptMap = new Map<
      string,
      { name: string; studentIds: Set<string>; totalFees: number; collected: number }
    >();
    for (const a of accounts) {
      const name = a.student.department?.nameAr ?? 'غير محدد';
      const bucket =
        deptMap.get(name) ?? { name, studentIds: new Set<string>(), totalFees: 0, collected: 0 };
      bucket.studentIds.add(a.studentId);
      bucket.totalFees += a.totalFees;
      bucket.collected += a.payments
        .filter((p) => p.status === 'paid')
        .reduce((s, p) => s + p.amount, 0);
      deptMap.set(name, bucket);
    }
    const departmentStats = [...deptMap.values()]
      .map((b) => {
        const pending = Math.max(b.totalFees - b.collected, 0);
        const rate = b.totalFees > 0 ? Math.round((b.collected / b.totalFees) * 100) : 0;
        return {
          name: b.name,
          students: b.studentIds.size,
          totalFees: b.totalFees,
          collected: b.collected,
          pending,
          rate,
        };
      })
      .sort((x, y) => y.totalFees - x.totalFees);

    // Payment-method breakdown over paid payments (count + summed amount).
    const allPaidPayments = accounts.flatMap((a) =>
      a.payments.filter((p) => p.status === 'paid')
    );
    const methodMap = new Map<string, { name: string; count: number; amount: number }>();
    for (const p of allPaidPayments) {
      const name = p.method ?? 'غير محدد';
      const bucket = methodMap.get(name) ?? { name, count: 0, amount: 0 };
      bucket.count += 1;
      bucket.amount += p.amount;
      methodMap.set(name, bucket);
    }
    const paymentMethods = [...methodMap.values()].sort((x, y) => y.amount - x.amount);

    return NextResponse.json({ recentPayments, stats, departmentStats, paymentMethods });
  } catch (error) {
    console.error('Error listing collection:', error);
    return NextResponse.json({ error: 'فشل في جلب التحصيل' }, { status: 500 });
  }
}

// POST /api/institute/finance/collection — record a payment against a student's fee account.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.collection.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { studentCode, amount, method, academicYear } = body ?? {};
    if (!studentCode || !amount) return NextResponse.json({ error: 'الطالب والمبلغ مطلوبان' }, { status: 400 });

    const student = await prisma.student.findUnique({ where: { studentCode } });
    if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });

    const year = academicYear || '2024-2025';
    const account = await prisma.feeAccount.upsert({
      where: { studentId_academicYear: { studentId: student.id, academicYear: year } },
      update: {},
      create: { studentId: student.id, academicYear: year, totalFees: 0, installments: 1 },
    });

    const payment = await prisma.payment.create({
      data: {
        accountId: account.id,
        amount: Number(amount),
        method: method || 'نقدي',
        receipt: `RCP-${Date.now()}`,
        status: 'paid',
        paidAt: new Date(),
      },
    });

    // ClientR5 — finance link: if this payment clears the balance, auto-release the
    // student's active financial hold(s) (source=AUTOMATIC). Never re-holds automatically.
    const holdsReleased = await releaseFinancialHoldsIfPaid(student.id, await currentUserId());
    return NextResponse.json({ ...payment, holdsReleased }, { status: 201 });
  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json({ error: 'فشل في تسجيل الدفعة' }, { status: 500 });
  }
}
