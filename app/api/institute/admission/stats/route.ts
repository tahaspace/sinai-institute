import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { tenantWhere } from '@/lib/tenant';

// Row shape rendered by the admissions dashboard table. Status stays as-is
// (the page maps the raw PENDING/APPROVED/... value to an Arabic badge).
interface RecentApplication {
  fullName: string;
  firstChoice: string;
  status: string;
  date: string;
}

// GET /api/institute/admission/stats
// Admissions KPIs + the 10 newest applications. Every number is a real COUNT
// scoped to the caller's tenant (tenantWhere) — no placeholders.
export async function GET() {
  try {
    const guard = await requirePermission('admission.application.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { ctx } = guard;

    const [pendingApplications, approvedApplications, transfers, pendingEquivalence, recentRows] =
      await Promise.all([
        prisma.application.count({ where: tenantWhere(ctx, { status: 'PENDING' }) }),
        prisma.application.count({ where: tenantWhere(ctx, { status: 'APPROVED' }) }),
        prisma.transferRequest.count({ where: tenantWhere(ctx) }),
        prisma.courseEquivalenceRequest.count({ where: tenantWhere(ctx, { status: 'PENDING' }) }),
        prisma.application.findMany({
          where: tenantWhere(ctx),
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { fullName: true, firstChoice: true, status: true, createdAt: true },
        }),
      ]);

    const recent: RecentApplication[] = recentRows.map((a) => ({
      fullName: a.fullName,
      firstChoice: a.firstChoice,
      status: a.status,
      date: a.createdAt.toISOString().slice(0, 10),
    }));

    return NextResponse.json({
      stats: { pendingApplications, approvedApplications, transfers, pendingEquivalence },
      recent,
    });
  } catch (error) {
    console.error('Error building admission stats:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات القبول' }, { status: 500 });
  }
}
