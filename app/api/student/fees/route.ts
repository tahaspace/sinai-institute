import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';

// GET /api/student/fees?studentCode=&academicYear=
// Returns fee summary, breakdown, and payment history for one student.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear') || '2024-2025';
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const account = await prisma.feeAccount.findUnique({
      where: { studentId_academicYear: { studentId: student.id, academicYear } },
      include: {
        items: true,
        payments: { orderBy: { dueDate: 'desc' } },
      },
    });

    if (!account) {
      return NextResponse.json({
        student: { id: student.id, studentCode: student.studentCode, name: student.nameAr },
        feesData: { academicYear, totalFees: 0, paid: 0, remaining: 0, nextDueDate: null, installments: 0, paidInstallments: 0 },
        feeBreakdown: [],
        paymentHistory: [],
      });
    }

    const paid = account.payments
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + p.amount, 0);
    const paidInstallments = account.payments.filter((p) => p.status === 'paid').length;
    const nextDue = account.payments
      .filter((p) => p.status !== 'paid' && p.dueDate)
      .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))[0];

    return NextResponse.json({
      student: { id: student.id, studentCode: student.studentCode, name: student.nameAr },
      feesData: {
        academicYear: account.academicYear,
        totalFees: account.totalFees,
        paid,
        remaining: account.totalFees - paid,
        nextDueDate: nextDue?.dueDate ? nextDue.dueDate.toISOString().slice(0, 10) : null,
        installments: account.installments,
        paidInstallments,
      },
      feeBreakdown: account.items.map((i) => ({ item: i.label, amount: i.amount })),
      paymentHistory: account.payments.map((p) => ({
        id: p.id,
        date: (p.paidAt ?? p.dueDate)?.toISOString().slice(0, 10) ?? null,
        amount: p.amount,
        method: p.method ?? '-',
        receipt: p.receipt ?? '-',
        status: p.status,
      })),
    });
  } catch (error) {
    console.error('Error fetching fees:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات المصروفات' }, { status: 500 });
  }
}
