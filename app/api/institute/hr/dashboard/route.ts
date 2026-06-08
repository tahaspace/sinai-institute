import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { tenantWhere } from '@/lib/tenant';

// GET /api/institute/hr/dashboard — HR overview built from Instructor + Payroll (tenant-scoped).
export async function GET() {
  try {
    const guard = await requirePermission('hr.staff.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { ctx } = guard;

    const [instructors, payroll] = await Promise.all([
      prisma.instructor.findMany({ where: tenantWhere(ctx) }),
      prisma.payroll.findMany({ where: tenantWhere(ctx) }),
    ]);

    // Staff (instructors) grouped by academic title.
    const titleMap = new Map<string, number>();
    for (const ins of instructors) {
      const title = ins.title?.trim() || 'غير محدد';
      titleMap.set(title, (titleMap.get(title) ?? 0) + 1);
    }
    const byTitle = [...titleMap.entries()]
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);

    // Payroll aggregates: net total, status counts, and per-role net + counts.
    let netTotal = 0;
    let completed = 0;
    let pending = 0;
    const roleMap = new Map<string, { count: number; net: number }>();
    for (const p of payroll) {
      netTotal += p.netSalary;
      if (p.status === 'completed') completed += 1;
      else if (p.status === 'pending') pending += 1;
      const role = p.role?.trim() || 'staff';
      const r = roleMap.get(role) ?? { count: 0, net: 0 };
      r.count += 1;
      r.net += p.netSalary;
      roleMap.set(role, r);
    }
    const byRole = [...roleMap.entries()]
      .map(([role, v]) => ({ role, count: v.count, net: v.net }))
      .sort((a, b) => b.net - a.net);

    return NextResponse.json({
      staff: {
        total: instructors.length,
        byTitle,
      },
      payroll: {
        netTotal,
        completed,
        pending,
        byRole,
      },
    });
  } catch (error) {
    console.error('Error building HR dashboard:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الموارد البشرية' }, { status: 500 });
  }
}
