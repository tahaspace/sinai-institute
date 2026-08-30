import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { autoHoldCandidates } from '@/lib/holds';

// GET /api/institute/holds/candidates — finance link: students with outstanding fees
// and no active financial hold yet (طلاب معرضون للحجب). Staff confirm before applying.
export async function GET() {
  try {
    const guard = await requirePermission('hold.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const candidates = await autoHoldCandidates(guard.ctx.universityId);
    return NextResponse.json({ candidates, count: candidates.length });
  } catch (error) {
    console.error('Error loading hold candidates:', error);
    return NextResponse.json({ error: 'فشل في جلب المرشحين للحجب' }, { status: 500 });
  }
}
