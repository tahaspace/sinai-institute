import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/finance/scholarships — list + summary.
export async function GET() {
  try {
    const guard = await requirePermission('finance.scholarship.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const scholarships = await prisma.scholarship.findMany({
      include: { student: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      scholarships: scholarships.map((s) => ({
        id: s.id,
        student: s.student.nameAr,
        studentCode: s.student.studentCode,
        type: s.type,
        amount: s.amount,
        percentage: s.percentage,
        academicYear: s.academicYear,
        reason: s.reason ?? '',
        status: s.status,
      })),
      stats: {
        total: scholarships.length,
        active: scholarships.filter((s) => s.status === 'ACTIVE').length,
        totalAmount: scholarships.reduce((sum, s) => sum + s.amount, 0),
      },
    });
  } catch (error) {
    console.error('Error listing scholarships:', error);
    return NextResponse.json({ error: 'فشل في جلب المنح' }, { status: 500 });
  }
}

// POST /api/institute/finance/scholarships — grant a scholarship/exemption.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.scholarship.approve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { studentId, studentCode, type, amount, percentage, academicYear, reason } = body ?? {};
    let sid = studentId;
    if (!sid && studentCode) {
      const s = await prisma.student.findUnique({ where: { studentCode } });
      sid = s?.id;
    }
    if (!sid || !type) return NextResponse.json({ error: 'الطالب والنوع مطلوبان' }, { status: 400 });

    const scholarship = await prisma.scholarship.create({
      data: {
        studentId: sid,
        type,
        amount: amount ? Number(amount) : 0,
        percentage: percentage ? parseInt(String(percentage), 10) : null,
        academicYear: academicYear || '2024-2025',
        reason: reason || null,
        status: 'ACTIVE',
      },
    });
    return NextResponse.json(scholarship, { status: 201 });
  } catch (error) {
    console.error('Error creating scholarship:', error);
    return NextResponse.json({ error: 'فشل في إضافة المنحة' }, { status: 500 });
  }
}
