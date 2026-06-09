import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';
import { computeStandingForStudents } from '@/lib/standing';

// POST /api/institute/academic-standing/apply
//   { action: 'promote' }   → promote every student the engine marks canPromote
//                             (Student.level := qualifiedLevel)
//   { action: 'escalate' }  → for students whose escalation has reached
//                             'track-change-or-dismissal', record an ACADEMIC warning
//                             and set the student's status to DISMISSED.
//   Optional { studentCodes: string[] } narrows either action to a subset; otherwise
//   it runs over all active students (the same population the dashboard computes).
//
// These are bylaw write-backs, so they sit behind student.write rather than the
// read-only student.view used by the GET dashboard.
type Action = 'promote' | 'escalate';

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('student.write');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => ({}));
    const action = body?.action as Action | undefined;
    const studentCodes: string[] | undefined = Array.isArray(body?.studentCodes) ? body.studentCodes : undefined;
    if (action !== 'promote' && action !== 'escalate') {
      return NextResponse.json({ error: 'الإجراء غير صالح' }, { status: 400 });
    }

    // Same active population the dashboard scores (terminal statuses excluded), then
    // optionally narrowed to the requested student codes.
    const students = await prisma.student.findMany({
      where: {
        status: { notIn: ['GRADUATED', 'WITHDRAWN', 'DISMISSED'] },
        ...(studentCodes ? { studentCode: { in: studentCodes } } : {}),
      },
      select: { id: true, studentCode: true, nameAr: true, level: true, status: true },
    });

    const standings = await computeStandingForStudents(students.map((s) => s.id));

    let applied = 0;
    const affected: { studentCode: string; name: string; from: number | string; to: number | string }[] = [];

    if (action === 'promote') {
      for (const s of students) {
        const st = standings.get(s.id);
        if (!st || !st.canPromote || st.qualifiedLevel <= s.level) continue;
        await prisma.student.update({ where: { id: s.id }, data: { level: st.qualifiedLevel } });
        await writeAudit('institute.academic-standing.promote', {
          targetType: 'Student',
          targetId: s.id,
          metadata: { studentCode: s.studentCode, fromLevel: s.level, toLevel: st.qualifiedLevel, cgpa: st.cgpa },
        });
        affected.push({ studentCode: s.studentCode, name: s.nameAr, from: s.level, to: st.qualifiedLevel });
        applied += 1;
      }
      return NextResponse.json({ action, applied, affected, message: `تمت ترقية ${applied} طالب` });
    }

    // action === 'escalate'
    for (const s of students) {
      const st = standings.get(s.id);
      if (!st || st.escalation !== 'track-change-or-dismissal') continue;
      const reason = `إنذار نهائي — ${st.probationConsecutive} فصول متتالية تحت الملاحظة (المعدل ${st.cgpa.toFixed(2)}): تحويل مسار أو فصل`;
      await prisma.studentWarning.create({
        data: { studentId: s.id, type: 'ACADEMIC', reason, gpa: st.cgpa, status: 'ACTIVE' },
      });
      await prisma.student.update({ where: { id: s.id }, data: { status: 'DISMISSED' } });
      await writeAudit('institute.academic-standing.escalate', {
        targetType: 'Student',
        targetId: s.id,
        metadata: {
          studentCode: s.studentCode,
          cgpa: st.cgpa,
          probationConsecutive: st.probationConsecutive,
          probationTotal: st.probationTermsTotal,
          fromStatus: s.status,
          toStatus: 'DISMISSED',
        },
      });
      affected.push({ studentCode: s.studentCode, name: s.nameAr, from: s.status, to: 'DISMISSED' });
      applied += 1;
    }
    return NextResponse.json({ action, applied, affected, message: `تم تطبيق الفصل/الإنذار النهائي على ${applied} طالب` });
  } catch (error) {
    console.error('Error applying academic-standing action:', error);
    return NextResponse.json({ error: 'فشل في تطبيق الإجراء' }, { status: 500 });
  }
}
