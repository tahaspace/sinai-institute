import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { normalizeSystem } from '@/lib/academic-system';
import { autoHoldCandidates } from '@/lib/holds';

// GET /api/institute/holds/candidates — finance link: students with outstanding fees
// and no active financial hold yet (طلاب معرضون للحجب). Staff confirm before applying.
export async function GET() {
  try {
    const guard = await requirePermission('hold.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const candidates = await autoHoldCandidates(guard.ctx.universityId);
    // Decorate only — the candidate engine keeps its own semantics; `system` just lets the screen
    // narrow the list by academic system. Every candidate already carries its programId, so the systems
    // come from those programmes (one small query) instead of re-scanning every student row.
    const programIds = [...new Set(candidates.map((c) => c.programId).filter((id): id is string => Boolean(id)))];
    const programs = programIds.length
      ? await prisma.program.findMany({ where: { id: { in: programIds } }, select: { id: true, academicSystem: true } })
      : [];
    const systemByProgram = new Map(programs.map((p) => [p.id, normalizeSystem(p.academicSystem)] as const));
    // no programme (or a programme that vanished) => credit-hours, the platform default
    const rows = candidates.map((c) => ({ ...c, system: systemByProgram.get(c.programId ?? '') ?? 'CREDIT_HOURS' }));
    return NextResponse.json({ candidates: rows, count: rows.length });
  } catch (error) {
    console.error('Error loading hold candidates:', error);
    return NextResponse.json({ error: 'فشل في جلب المرشحين للحجب' }, { status: 500 });
  }
}
