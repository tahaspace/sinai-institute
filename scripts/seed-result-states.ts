/**
 * ClientR2 — backfill the result-state "rules table" properties and seed the canonical
 * status/reason catalogue. Idempotent: backfills every tenant's copy of each known code
 * and adds the spec's canonical codes (AB/ABS/INC/DEFER) + CourseResultReason rows only
 * when missing. Production-guarded — refuses to run against the live DB.
 *
 *   DATABASE_URL="<local-test-db>" NODE_ENV=development npx tsx scripts/seed-result-states.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Property backfill for every known status code (applied to all tenants' rows of that code).
// Columns: affectsGpa | isPass(=EarnCredit) | countsAttempt | needsAction | nextAction | isException | isFinal
type Props = {
  affectsGpa: boolean; isPass: boolean; countsAttempt: boolean;
  needsAction: boolean; nextAction: string; isException: boolean; isFinal: boolean;
};
const L = (over: Partial<Props> = {}): Props => ({
  affectsGpa: true, isPass: true, countsAttempt: true, needsAction: false,
  nextAction: 'NONE', isException: false, isFinal: true, ...over,
});

const STATUS_PROPS: Record<string, Props> = {
  // letter grades — pass, count toward GPA + attempt, terminal.
  // All ten passing bands of جدول 3 (A · A- · B+ · B · B- · C+ · C · C- · D+ · D); the ladder itself
  // (bands + points + names) lives in the GradeStatus rows the institute edits from سلّم التقديرات —
  // this map only carries the per-status POLICY columns, which are the same for every letter.
  A: L(), 'A-': L(), 'B+': L(), B: L(), 'B-': L(), 'C+': L(), C: L(), 'C-': L(), 'D+': L(), D: L(),
  // F / board-fail / deprivation — counts as a failed attempt, repeat the course
  F: L({ isPass: false, nextAction: 'REPEAT' }),
  BL: L({ isPass: false, nextAction: 'REPEAT' }), // راسب لائحة (سقوط التحريري) — system-derived, not an exception
  DN: L({ isPass: false, nextAction: 'REPEAT', isException: true }), // محروم (غياب)
  DS: L({ isPass: false, nextAction: 'REPEAT', isException: true }), // حرمان تأديبي
  NE: L({ isPass: false, nextAction: 'REPEAT', isException: true }), // غائب بدون عذر (legacy ABS)
  NP: L({ isPass: false, affectsGpa: false, nextAction: 'REPEAT' }), // لم يجتز (pass/fail course)
  // excused / held states — no GPA, no credit, NOT an attempt, need a follow-up
  E: L({ affectsGpa: false, isPass: false, countsAttempt: false, needsAction: true, nextAction: 'MAKEUP_EXAM', isException: true, isFinal: false }), // غائب بعذر (legacy AB)
  I: L({ affectsGpa: false, isPass: false, countsAttempt: false, needsAction: true, nextAction: 'COMPLETE_ASSESSMENT', isException: true, isFinal: false }), // غير مكتمل (legacy INC)
  // withdrawals — no GPA, no credit, NOT an attempt, terminal
  W: L({ affectsGpa: false, isPass: false, countsAttempt: false, isException: true }),
  FW: L({ affectsGpa: false, isPass: false, isException: true }), // منسحب إجباري — counts as an attempt
  // transfer / summer-pass — earns credit, excluded from GPA, not an attempt at this institute
  TR: L({ affectsGpa: false, countsAttempt: false }),
  P: L({ affectsGpa: false }), // ناجح (صيفي)
};

// Canonical ClientR2 codes added alongside the legacy synonyms (institute may use either).
const NEW_STATUSES: { code: string; name: string; order: number; props: Props; points: number | null }[] = [
  { code: 'AB', name: 'غائب بعذر', order: 31, points: null, props: STATUS_PROPS.E },
  { code: 'ABS', name: 'غائب بدون عذر', order: 32, points: 0, props: STATUS_PROPS.NE },
  { code: 'INC', name: 'غير مكتمل', order: 33, points: null, props: STATUS_PROPS.I },
  { code: 'DEFER', name: 'مؤجل', order: 34, points: null, props: L({ affectsGpa: false, isPass: false, countsAttempt: false, needsAction: true, nextAction: 'COMPLETE_ASSESSMENT', isException: true, isFinal: false }) },
];

const REASONS: { code: string; nameAr: string; nameEn: string; category: string; appliesTo: string | null; order: number }[] = [
  { code: 'WrittenFail', nameAr: 'سقوط في التحريري', nameEn: 'Written Exam Fail', category: 'FAIL', appliesTo: 'F,BL', order: 1 },
  { code: 'TotalFail', nameAr: 'رسوب بالمجموع', nameEn: 'Total Below Pass', category: 'FAIL', appliesTo: 'F', order: 2 },
  { code: 'AttendanceShortage', nameAr: 'نقص نسبة الحضور', nameEn: 'Attendance Shortage', category: 'FAIL', appliesTo: 'DN,NE,ABS', order: 3 },
  { code: 'Cheating', nameAr: 'غش', nameEn: 'Cheating', category: 'DISCIPLINARY', appliesTo: 'DS,F', order: 4 },
  { code: 'DisciplinaryAction', nameAr: 'إجراء تأديبي', nameEn: 'Disciplinary Action', category: 'DISCIPLINARY', appliesTo: 'DS', order: 5 },
  { code: 'IncompleteExpired', nameAr: 'انتهاء مدة غير مكتمل', nameEn: 'Incomplete Expired', category: 'FAIL', appliesTo: 'F', order: 6 },
  { code: 'MedicalExcuse', nameAr: 'عذر طبي / مرض', nameEn: 'Medical Excuse', category: 'ABSENCE', appliesTo: 'AB,E,INC,I,DEFER', order: 7 },
  { code: 'Accident', nameAr: 'حادث', nameEn: 'Accident', category: 'ABSENCE', appliesTo: 'AB,E,INC,I', order: 8 },
  { code: 'ForceMajeure', nameAr: 'ظروف قهرية', nameEn: 'Force Majeure', category: 'ABSENCE', appliesTo: 'AB,E,INC,I,DEFER', order: 9 },
  { code: 'WithdrawalRequest', nameAr: 'طلب انسحاب', nameEn: 'Withdrawal Request', category: 'WITHDRAWAL', appliesTo: 'W,FW', order: 10 },
];

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
    console.error('❌ SEED BLOCKED: refusing to run against production. Set a local DATABASE_URL.');
    process.exit(1);
  }
  console.log('🌱 ClientR2 — backfilling result-state rules table…');

  // 1) Backfill property columns on every existing row of each known code (all tenants).
  let backfilled = 0;
  for (const [code, p] of Object.entries(STATUS_PROPS)) {
    const r = await prisma.gradeStatus.updateMany({
      where: { code },
      data: {
        affectsGpa: p.affectsGpa, isPass: p.isPass, countsAttempt: p.countsAttempt,
        needsAction: p.needsAction, nextAction: p.nextAction, isException: p.isException, isFinal: p.isFinal,
      },
    });
    backfilled += r.count;
  }
  console.log(`✅ backfilled ${backfilled} GradeStatus rows`);

  // 2) Add the canonical ClientR2 codes (global defaults) if missing.
  for (const s of NEW_STATUSES) {
    const exists = await prisma.gradeStatus.findFirst({ where: { code: s.code, universityId: null } });
    if (exists) {
      await prisma.gradeStatus.update({ where: { id: exists.id }, data: { ...s.props, name: s.name, order: s.order, points: s.points } });
    } else {
      await prisma.gradeStatus.create({ data: { code: s.code, name: s.name, order: s.order, points: s.points, isLetter: false, minPercent: null, ...s.props } });
    }
  }
  console.log(`✅ ensured ${NEW_STATUSES.length} canonical statuses (AB/ABS/INC/DEFER)`);

  // 3) Seed the reason catalogue (global defaults) idempotently.
  for (const r of REASONS) {
    const exists = await prisma.courseResultReason.findFirst({ where: { code: r.code, universityId: null } });
    if (exists) {
      await prisma.courseResultReason.update({ where: { id: exists.id }, data: { nameAr: r.nameAr, nameEn: r.nameEn, category: r.category, appliesTo: r.appliesTo, order: r.order } });
    } else {
      await prisma.courseResultReason.create({ data: { ...r, isActive: true } });
    }
  }
  console.log(`✅ ensured ${REASONS.length} CourseResultReason rows`);
  console.log('🎉 ClientR2 result-state seed complete.');
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
