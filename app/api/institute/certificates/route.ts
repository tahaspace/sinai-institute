import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/certificates — certificate list + issued/pending stats.
export async function GET() {
  try {
    const guard = await requirePermission('certificate.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const all = await prisma.certificate.findMany({ orderBy: { createdAt: 'desc' } });

    const certificates = all.map((c) => ({
      id: c.code,
      trainee: c.trainee,
      program: c.program,
      issueDate: c.issueDate ? c.issueDate.toISOString().slice(0, 10) : null,
      status: c.status,
      verificationCode: c.verificationCode,
    }));

    return NextResponse.json({
      certificates,
      stats: {
        total: all.length,
        issued: all.filter((c) => c.status === 'issued').length,
        pending: all.filter((c) => c.status === 'pending').length,
      },
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json({ error: 'فشل في جلب الشهادات' }, { status: 500 });
  }
}
