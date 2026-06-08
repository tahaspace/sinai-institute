import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/marketing — marketing campaigns with aggregate stats.
export async function GET() {
  try {
    const guard = await requirePermission('marketing.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const rows = await prisma.marketingCampaign.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const campaigns = rows.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      budget: c.budget,
      spent: c.spent,
      leads: c.leads,
      conversions: c.conversions,
      status: c.status,
      startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : '',
    }));

    return NextResponse.json({
      campaigns,
      stats: {
        total: campaigns.length,
        active: campaigns.filter((c) => c.status === 'active').length,
        totalBudget: campaigns.reduce((s, c) => s + c.budget, 0),
        totalSpent: campaigns.reduce((s, c) => s + c.spent, 0),
        totalLeads: campaigns.reduce((s, c) => s + c.leads, 0),
      },
    });
  } catch (error) {
    console.error('Error listing marketing campaigns:', error);
    return NextResponse.json({ error: 'فشل في جلب الحملات التسويقية' }, { status: 500 });
  }
}
