import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/partnerships — partners + stats.
export async function GET() {
  try {
    const guard = await requirePermission('partnerships.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const rows = await prisma.partnership.findMany({ orderBy: { createdAt: 'desc' } });

    const partners = rows.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type ?? '',
      contact: p.contact ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      website: p.website ?? '',
      trainees: p.trainees,
      programs: p.programs,
      status: p.status,
      since: p.since ? p.since.toISOString().slice(0, 10) : '',
    }));

    return NextResponse.json({
      partners,
      stats: {
        total: rows.length,
        active: rows.filter((p) => p.status === 'active').length,
        totalTrainees: rows.reduce((s, p) => s + p.trainees, 0),
        totalPrograms: rows.reduce((s, p) => s + p.programs, 0),
      },
    });
  } catch (error) {
    console.error('Error building partnerships:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الشراكات' }, { status: 500 });
  }
}
