/**
 * TEST-ONLY seed for the integrated portals (higher-ed institute).
 *
 * Seeds ONE shared dataset that every portal reads/writes:
 *   - a department + higher-ed courses (each taught by an Instructor)
 *   - a demo Student (login) with enrollments/grades, attendance, fees,
 *     a weekly timetable, assignments + submissions, and guardians
 *   - a Faculty Instructor (login) teaching the courses
 *   - a Parent (login) linked to the demo student via Guardian.userId
 *
 * Safe by construction: refuses to run unless DATABASE_URL is a local host.
 * Run with:
 *   DATABASE_URL="postgresql://sinai_test:sinai_test_pw@127.0.0.1:5432/sinai_test?schema=public" \
 *     npx tsx scripts/seed-student-test.ts
 * Idempotent: upserts by unique keys.
 */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { getRegulations, resolveGraduationHours } from '@/lib/regulations';

const url = process.env.DATABASE_URL || '';
if (!/(@(127\.0\.0\.1|localhost))[:/]/.test(url) && process.env.ALLOW_REMOTE_SEED !== '1') {
  console.error(
    '\nRefusing to seed: DATABASE_URL is not a local host.\n' +
      'This script is test-only. Set DATABASE_URL to the local sinai_test DB first.\n'
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const ACADEMIC_YEAR = '2024-2025';
const SEMESTER = 'first';

// سلّم التقديرات — transcribed verbatim from جدول 3 of the institute's bylaw (معهد سيناء العالي).
// Eleven bands, and the تقدير names are PAIRED exactly as the document pairs them: A and A- are both
// «ممتاز», B+ and B «جيد جدا», B- and C+ «جيد», C / C- / D+ / D «مقبول». They are not invented
// per-band labels. Rows, in the document's own words:
//   ممتاز  | 90 % او اكثر            | 4.00 | A
//   ممتاز  | اقل من90 %الي 85%       | 3.67 | A-
//   جيد جدا | اقل من 85%الي 80%      | 3.33 | B+
//   جيد جدا | اقل من 80 %الي 75 %    | 3.00 | B
//   جيد    | اقل من 75 %الي 70%      | 2.67 | B-
//   جيد    | اقل من 70 %الي 65%      | 2.33 | C+
//   مقبول  | اقل من %65 الي 60%      | 2.00 | C
//   مقبول  | اقل من 60% الي 56%      | 1.67 | C-
//   مقبول  | اقل من 56 %الي 53%      | 1.33 | D+
//   مقبول  | اقل من 53 %الي 50%      | 1.00 | D
//   راسب   | اقل من 50 %             | 1(?) | F
// The pass floor is therefore 50%, not 60%. F's points cell literally reads «1» in the docx while
// every other row carries two decimals; it is seeded as 0 because the rows the bylaw says are equal
// to a fail — BL «راسب لائحه», DS «تتساوي مع راسب في التقدير», DN «تتساوي مع راسب» — all carry 0
// in the same table. Flagged NEEDS_CLARIFICATION; an institute that reads it as 1.00 edits the row
// on the سلّم التقديرات screen, no code change needed.
const BYLAW_LETTER_LADDER: { code: string; name: string; minPercent: number; points: number; isPass: boolean }[] = [
  { code: 'A', name: 'ممتاز', minPercent: 90, points: 4.0, isPass: true },
  { code: 'A-', name: 'ممتاز', minPercent: 85, points: 3.67, isPass: true },
  { code: 'B+', name: 'جيد جدا', minPercent: 80, points: 3.33, isPass: true },
  { code: 'B', name: 'جيد جدا', minPercent: 75, points: 3.0, isPass: true },
  { code: 'B-', name: 'جيد', minPercent: 70, points: 2.67, isPass: true },
  { code: 'C+', name: 'جيد', minPercent: 65, points: 2.33, isPass: true },
  { code: 'C', name: 'مقبول', minPercent: 60, points: 2.0, isPass: true },
  { code: 'C-', name: 'مقبول', minPercent: 56, points: 1.67, isPass: true },
  { code: 'D+', name: 'مقبول', minPercent: 53, points: 1.33, isPass: true },
  { code: 'D', name: 'مقبول', minPercent: 50, points: 1.0, isPass: true },
  { code: 'F', name: 'راسب', minPercent: 0, points: 0, isPass: false },
];

// Demo enrolment grades use the SAME ladder as the seeded config — a second copy of the bands here
// is how the old seed ended up recording C = 2.3 while its own GradeStatus row said C = 2.0.
function gradeFromPct(pct: number): { letter: string; points: number } {
  const band = BYLAW_LETTER_LADDER.find((g) => pct >= g.minPercent) ?? BYLAW_LETTER_LADDER[BYLAW_LETTER_LADDER.length - 1];
  return { letter: band.code, points: band.points };
}

async function main() {
  // 1) Department
  const dept = await prisma.department.upsert({
    where: { id: 'dept-test-cs' },
    update: {},
    create: { id: 'dept-test-cs', nameAr: 'علوم الحاسب', nameEn: 'Computer Science', isActive: true, order: 1 },
  });

  // 1b) Academic program (the institute "catalog" students belong to)
  const program = await prisma.program.upsert({
    where: { id: 'prog-test-cs-bsc' },
    update: { departmentId: dept.id },
    create: {
      id: 'prog-test-cs-bsc',
      nameAr: 'بكالوريوس علوم الحاسب',
      nameEn: 'BSc Computer Science',
      departmentId: dept.id,
      degree: 'بكالوريوس',
      years: 4,
      totalCreditHours: 132,
      description: 'برنامج بكالوريوس في علوم الحاسب',
    },
  });

  // 1c) Grade-status config (configurable result states — client bylaw)
  await prisma.gradeStatus.deleteMany({});
  await prisma.gradeStatus.createMany({
    data: [
      // letter grades — جدول 3 of the bylaw (see BYLAW_LETTER_LADDER above). minPercent drives
      // the numeric→letter mapping in lib/gpa.ts; the institute retunes the whole ladder from
      // الإعدادات ← حالات وقواعد النتائج ← سلّم التقديرات without touching this file.
      ...BYLAW_LETTER_LADDER.map((g, i) => ({
        code: g.code, name: g.name, points: g.points,
        affectsGpa: true, isPass: g.isPass, isLetter: true, minPercent: g.minPercent, order: i + 1,
      })),
      // special statuses
      { code: 'W', name: 'منسحب', points: null, affectsGpa: false, isPass: false, isLetter: false, order: 20 },
      { code: 'E', name: 'غائب بعذر', points: null, affectsGpa: false, isPass: false, isLetter: false, order: 21 },
      { code: 'I', name: 'غير مكتمل', points: null, affectsGpa: false, isPass: false, isLetter: false, order: 22 },
      { code: 'NE', name: 'غائب بدون عذر', points: 0, affectsGpa: true, isPass: false, isLetter: false, order: 23 },
      { code: 'FW', name: 'منسحب إجباري', points: null, affectsGpa: false, isPass: false, isLetter: false, order: 24 },
      { code: 'BL', name: 'راسب لائحة', points: 0, affectsGpa: true, isPass: false, isLetter: false, order: 25 },
      { code: 'DN', name: 'محروم', points: 0, affectsGpa: true, isPass: false, isLetter: false, order: 26 },
      { code: 'DS', name: 'حرمان تأديبي', points: 0, affectsGpa: true, isPass: false, isLetter: false, order: 27 },
      // bylaw جدول 3, صف مقاصة: «تضاف درجه والتقدير الي معدل تراكمي للطالب» — so an equated course DOES
      // carry into the CGPA. The same cell then lists what each institute must still decide (مصدر
      // الدرجة · من يعتمدها · هل تضاف الساعات · تراكمي فقط أم فصلي أيضاً); those are configuration, not
      // a contradiction of the sentence above. points stays null because the equated course carries its
      // OWN grade — the control desk records the letter, and affectsGpa lets it count.
      { code: 'TR', name: 'مقاصة', points: null, affectsGpa: true, isPass: true, isLetter: false, order: 28 },
      { code: 'P', name: 'ناجح (صيفي)', points: null, affectsGpa: false, isPass: true, isLetter: false, order: 29 },
      { code: 'NP', name: 'لم يجتز', points: null, affectsGpa: false, isPass: false, isLetter: false, order: 30 },
    ],
  });

  // 2) Faculty member (Instructor) + login account (role FACULTY)
  const facultyUser = await prisma.user.upsert({
    where: { email: 'demo.faculty@sinaiinstitute.test' },
    update: { role: 'FACULTY', name: 'د. سمير عبد الرحمن' },
    create: {
      email: 'demo.faculty@sinaiinstitute.test',
      name: 'د. سمير عبد الرحمن',
      password: await hash('faculty123', 10),
      role: 'FACULTY',
    },
  });
  const instructor = await prisma.instructor.upsert({
    where: { userId: facultyUser.id },
    update: { departmentId: dept.id },
    create: {
      userId: facultyUser.id,
      name: 'د. سمير عبد الرحمن',
      email: 'demo.faculty@sinaiinstitute.test',
      phone: '01055544433',
      title: 'أستاذ مساعد',
      departmentId: dept.id,
      specialization: 'هندسة البرمجيات',
    },
  });

  // 3) Higher-ed CS courses (level 2), each taught by the instructor.
  const courseDefs = [
    { code: 'CS201', nameAr: 'هياكل البيانات', nameEn: 'Data Structures', practicalMax: 30, credit: 3 },
    { code: 'CS202', nameAr: 'البرمجة الكائنية', nameEn: 'Object-Oriented Programming', practicalMax: 30, credit: 3 },
    { code: 'CS203', nameAr: 'قواعد البيانات', nameEn: 'Databases', practicalMax: 30, credit: 3 },
    { code: 'CS204', nameAr: 'تنظيم وعمارة الحاسب', nameEn: 'Computer Organization', practicalMax: 30, credit: 3 },
    { code: 'MA201', nameAr: 'الرياضيات المتقطعة', nameEn: 'Discrete Mathematics', practicalMax: 0, credit: 3 },
    { code: 'EN201', nameAr: 'اللغة الإنجليزية الفنية', nameEn: 'Technical English', practicalMax: 0, credit: 2 },
  ];
  const courses: Record<string, { id: string }> = {};
  for (const c of courseDefs) {
    const course = await prisma.course.upsert({
      where: { code: c.code },
      update: { practicalMax: c.practicalMax, departmentId: dept.id, instructorId: instructor.id, creditHours: c.credit, isGraduationProject: c.code === 'CS204' },
      create: {
        code: c.code,
        nameAr: c.nameAr,
        nameEn: c.nameEn,
        creditHours: c.credit,
        departmentId: dept.id,
        instructorId: instructor.id,
        midtermMax: 50,
        finalMax: 100,
        practicalMax: c.practicalMax,
        homeworkMax: 20,
        isGraduationProject: c.code === 'CS204',
      },
    });
    courses[c.code] = course;
  }
  // Remove drift: drop any course in this dept that isn't in the current set
  // (cascades to their enrollments/assignments). Keeps re-seeds clean.
  await prisma.course.deleteMany({
    where: { departmentId: dept.id, code: { notIn: courseDefs.map((c) => c.code) } },
  });

  // 4) Classmates (so rank is real) + the demo student.
  const classmates = [
    { code: '2024-101', nameAr: 'سارة أحمد', gpa: 3.95 },
    { code: '2024-102', nameAr: 'محمد علي', gpa: 3.9 },
    { code: '2024-103', nameAr: 'ليلى حسن', gpa: 3.88 },
    { code: '2024-104', nameAr: 'يوسف خالد', gpa: 3.86 },
    { code: '2024-106', nameAr: 'منى سمير', gpa: 3.6 },
  ];
  for (const m of classmates) {
    await prisma.student.upsert({
      where: { studentCode: m.code },
      update: { gpa: m.gpa, departmentId: dept.id, programId: program.id },
      create: { studentCode: m.code, nameAr: m.nameAr, departmentId: dept.id, programId: program.id, level: 2, gpa: m.gpa, enrollYear: 2024 },
    });
  }

  const demoProfile = {
    departmentId: dept.id,
    programId: program.id,
    level: 2,
    gpa: 3.85,
    enrollYear: 2024,
    phone: '01012345678',
    nationalId: '30505150100123',
    birthDate: new Date('2005-05-15T00:00:00.000Z'),
    address: 'القاهرة، مدينة نصر، شارع عباس العقاد',
    section: 'علوم الحاسب - المستوى الثاني',
  };
  const demo = await prisma.student.upsert({
    where: { studentCode: '2024-105' },
    update: { ...demoProfile },
    create: {
      studentCode: '2024-105',
      nameAr: 'أحمد محمود (طالب تجريبي)',
      nameEn: 'Ahmed Mahmoud (Demo)',
      email: 'demo.student@sinaiinstitute.test',
      ...demoProfile,
    },
  });

  // Student login account (role STUDENT) linked via Student.userId
  const studentUser = await prisma.user.upsert({
    where: { email: 'demo.student@sinaiinstitute.test' },
    update: { role: 'STUDENT', name: demo.nameAr },
    create: { email: 'demo.student@sinaiinstitute.test', name: demo.nameAr, password: await hash('student123', 10), role: 'STUDENT' },
  });
  await prisma.student.update({ where: { id: demo.id }, data: { userId: studentUser.id } });

  // 5) Parent login account (role PARENT) linked to the demo student via Guardian.userId
  const parentUser = await prisma.user.upsert({
    where: { email: 'demo.parent@sinaiinstitute.test' },
    update: { role: 'PARENT', name: 'محمود عبد الله' },
    create: { email: 'demo.parent@sinaiinstitute.test', name: 'محمود عبد الله', password: await hash('parent123', 10), role: 'PARENT' },
  });
  await prisma.guardian.deleteMany({ where: { studentId: demo.id } });
  await prisma.guardian.createMany({
    data: [
      { studentId: demo.id, userId: parentUser.id, relation: 'father', name: 'محمود عبد الله', phone: '01098765432', job: 'مهندس' },
      { studentId: demo.id, relation: 'mother', name: 'فاطمة أحمد', phone: '01123456789', job: 'معلمة' },
    ],
  });

  // 6) Enrollments with recorded grades for the demo student
  const grades = [
    { code: 'CS201', midterm: 48, final: 92, practical: 28, homework: 18 },
    { code: 'CS202', midterm: 45, final: 88, practical: 27, homework: 17 },
    { code: 'CS203', midterm: 42, final: 85, practical: 26, homework: 16 },
    { code: 'CS204', midterm: 46, final: 90, practical: 28, homework: 18 },
    { code: 'MA201', midterm: 44, final: 87, practical: 0, homework: 18 },
    { code: 'EN201', midterm: 47, final: 91, practical: 0, homework: 19 },
  ];
  for (const g of grades) {
    const course = courses[g.code];
    const def = courseDefs.find((c) => c.code === g.code)!;
    const total = g.midterm + g.final + g.practical + g.homework;
    const max = 50 + 100 + def.practicalMax + 20;
    const { letter, points } = gradeFromPct((total / max) * 100);
    await prisma.enrollment.upsert({
      where: { studentId_courseId_academicYear_semester: { studentId: demo.id, courseId: course.id, academicYear: ACADEMIC_YEAR, semester: SEMESTER } },
      update: { midterm: g.midterm, final: g.final, practical: g.practical, homework: g.homework, letterGrade: letter, points, status: 'COMPLETED' },
      create: { studentId: demo.id, courseId: course.id, academicYear: ACADEMIC_YEAR, semester: SEMESTER, midterm: g.midterm, final: g.final, practical: g.practical, homework: g.homework, letterGrade: letter, points, status: 'COMPLETED' },
    });
  }
  // Enroll classmates in CS201 too, so faculty grade entry has a roster.
  for (const m of classmates) {
    const s = await prisma.student.findUnique({ where: { studentCode: m.code } });
    if (s) {
      await prisma.enrollment.upsert({
        where: { studentId_courseId_academicYear_semester: { studentId: s.id, courseId: courses['CS201'].id, academicYear: ACADEMIC_YEAR, semester: SEMESTER } },
        update: {},
        create: { studentId: s.id, courseId: courses['CS201'].id, academicYear: ACADEMIC_YEAR, semester: SEMESTER, status: 'ENROLLED' },
      });
    }
  }

  // 7) Attendance
  await prisma.attendance.deleteMany({ where: { studentId: demo.id } });
  const attendanceSeed = [
    { date: '2024-12-25', status: 'present' }, { date: '2024-12-24', status: 'present' },
    { date: '2024-12-23', status: 'present' }, { date: '2024-12-22', status: 'present' },
    { date: '2024-12-19', status: 'late', note: 'تأخر 15 دقيقة' }, { date: '2024-12-18', status: 'present' },
    { date: '2024-12-17', status: 'absent', note: 'عذر مرضي' }, { date: '2024-12-16', status: 'present' },
    { date: '2024-11-28', status: 'present' }, { date: '2024-11-27', status: 'present' },
    { date: '2024-11-26', status: 'absent', note: 'ظرف عائلي' }, { date: '2024-11-25', status: 'present' },
    { date: '2024-10-30', status: 'present' }, { date: '2024-10-29', status: 'late', note: 'تأخر 10 دقائق' },
    { date: '2024-10-28', status: 'present' }, { date: '2024-09-25', status: 'present' },
    { date: '2024-09-24', status: 'absent', note: 'بدون عذر' },
  ];
  await prisma.attendance.createMany({
    data: attendanceSeed.map((a) => ({ studentId: demo.id, date: new Date(`${a.date}T08:00:00.000Z`), status: a.status, note: (a as { note?: string }).note ?? null })),
  });

  // 8) Fees
  const account = await prisma.feeAccount.upsert({
    where: { studentId_academicYear: { studentId: demo.id, academicYear: ACADEMIC_YEAR } },
    update: { totalFees: 25000, installments: 3 },
    create: { studentId: demo.id, academicYear: ACADEMIC_YEAR, totalFees: 25000, installments: 3 },
  });
  await prisma.feeItem.deleteMany({ where: { accountId: account.id } });
  await prisma.feeItem.createMany({
    data: [
      { accountId: account.id, label: 'الرسوم الدراسية', amount: 20000 },
      { accountId: account.id, label: 'رسوم المعامل', amount: 2000 },
      { accountId: account.id, label: 'رسوم الأنشطة', amount: 1500 },
      { accountId: account.id, label: 'رسوم الخدمات', amount: 1500 },
    ],
  });
  await prisma.payment.deleteMany({ where: { accountId: account.id } });
  await prisma.payment.createMany({
    data: [
      { accountId: account.id, amount: 10000, method: 'بطاقة ائتمان', receipt: 'RCP-001', status: 'paid', paidAt: new Date('2024-12-01T10:00:00.000Z'), dueDate: new Date('2024-12-01T00:00:00.000Z') },
      { accountId: account.id, amount: 10000, method: 'فوري', receipt: 'RCP-002', status: 'paid', paidAt: new Date('2024-11-01T10:00:00.000Z'), dueDate: new Date('2024-11-01T00:00:00.000Z') },
      { accountId: account.id, amount: 5000, status: 'pending', dueDate: new Date('2025-01-15T00:00:00.000Z') },
    ],
  });

  // 8b) Fee accounts for classmates + scholarships (so finance aggregates are real)
  for (let i = 0; i < classmates.length; i++) {
    const m = classmates[i];
    const s = await prisma.student.findUnique({ where: { studentCode: m.code } });
    if (!s) continue;
    const acct = await prisma.feeAccount.upsert({
      where: { studentId_academicYear: { studentId: s.id, academicYear: ACADEMIC_YEAR } },
      update: { totalFees: 25000, installments: 3 },
      create: { studentId: s.id, academicYear: ACADEMIC_YEAR, totalFees: 25000, installments: 3 },
    });
    await prisma.payment.deleteMany({ where: { accountId: acct.id } });
    // vary how much each classmate has paid
    const paidInstallments = (i % 3) + 1; // 1..3
    const payMonths = ['2024-09-05', '2024-10-05', '2024-11-05'];
    const payRows = [];
    for (let p = 0; p < paidInstallments; p++) {
      payRows.push({ accountId: acct.id, amount: 8000, method: p % 2 ? 'فوري' : 'بطاقة ائتمان', receipt: `RCP-${m.code}-${p + 1}`, status: 'paid', paidAt: new Date(`${payMonths[p]}T10:00:00.000Z`), dueDate: new Date(`${payMonths[p]}T00:00:00.000Z`) });
    }
    if (paidInstallments < 3) payRows.push({ accountId: acct.id, amount: 25000 - paidInstallments * 8000, status: 'pending', dueDate: new Date('2025-01-15T00:00:00.000Z') });
    await prisma.payment.createMany({ data: payRows });
  }

  // Scholarships
  const sFor = async (code: string) => (await prisma.student.findUnique({ where: { studentCode: code } }))?.id;
  const schStudent1 = await sFor('2024-103');
  const schStudent2 = await sFor('2024-106');
  await prisma.scholarship.deleteMany({ where: { studentId: { in: [schStudent1, schStudent2].filter(Boolean) as string[] } } });
  if (schStudent1) await prisma.scholarship.create({ data: { studentId: schStudent1, type: 'منحة تفوق', amount: 5000, academicYear: ACADEMIC_YEAR, reason: 'تفوق دراسي', status: 'ACTIVE' } });
  if (schStudent2) await prisma.scholarship.create({ data: { studentId: schStudent2, type: 'إعفاء جزئي', amount: 12500, percentage: 50, academicYear: ACADEMIC_YEAR, reason: 'حالة اجتماعية', status: 'ACTIVE' } });

  // 8c) A struggling student + academic warnings + graduation requests
  const struggling = await prisma.student.upsert({
    where: { studentCode: '2024-107' },
    update: { gpa: 1.85, departmentId: dept.id, programId: program.id },
    create: { studentCode: '2024-107', nameAr: 'عبد الله ناجي', departmentId: dept.id, programId: program.id, level: 2, gpa: 1.85, enrollYear: 2024, status: 'WARNING1' },
  });
  await prisma.studentWarning.deleteMany({ where: { studentId: { in: [struggling.id, demo.id] } } });
  await prisma.studentWarning.create({ data: { studentId: struggling.id, type: 'ACADEMIC', reason: 'انخفاض المعدل التراكمي عن 2.0', gpa: 1.85, status: 'ACTIVE' } });
  // low attendance for the struggling student → shows in the attendance warning list
  await prisma.attendance.deleteMany({ where: { studentId: struggling.id } });
  await prisma.attendance.createMany({
    data: [
      { studentId: struggling.id, date: new Date('2024-12-25T08:00:00.000Z'), status: 'present' },
      { studentId: struggling.id, date: new Date('2024-12-24T08:00:00.000Z'), status: 'absent', note: 'بدون عذر' },
      { studentId: struggling.id, date: new Date('2024-12-23T08:00:00.000Z'), status: 'absent', note: 'بدون عذر' },
      { studentId: struggling.id, date: new Date('2024-12-22T08:00:00.000Z'), status: 'present' },
      { studentId: struggling.id, date: new Date('2024-12-19T08:00:00.000Z'), status: 'absent', note: 'بدون عذر' },
      { studentId: struggling.id, date: new Date('2024-12-18T08:00:00.000Z'), status: 'present' },
      { studentId: struggling.id, date: new Date('2024-12-17T08:00:00.000Z'), status: 'late' },
      { studentId: struggling.id, date: new Date('2024-12-16T08:00:00.000Z'), status: 'present' },
      { studentId: struggling.id, date: new Date('2024-12-15T08:00:00.000Z'), status: 'absent', note: 'بدون عذر' },
      { studentId: struggling.id, date: new Date('2024-12-14T08:00:00.000Z'), status: 'present' },
    ],
  });

  // Graduation requests. requiredHours is RESOLVED, never typed: the bylaw value
  // (Regulations.graduationHours = «اجتياز عدد ساعات 130 ساعة») unless the student's programme
  // carries its own total. This seed is the platform's ONLY GraduationRequest create path, so a
  // literal here is what every row in every environment ends up saying — it used to stamp 132 and
  // the graduation screen printed «/ 132 ساعة» however the institute had configured its bylaw.
  const reg = await getRegulations();
  await prisma.graduationRequest.deleteMany({ where: { studentId: { in: [demo.id, struggling.id] } } });
  const gradFor = await prisma.student.findUnique({ where: { studentCode: '2024-101' }, include: { program: { select: { totalCreditHours: true } } } });
  if (gradFor) {
    const requiredHours = resolveGraduationHours(gradFor.program?.totalCreditHours, reg);
    await prisma.graduationRequest.deleteMany({ where: { studentId: gradFor.id } });
    // still two hours short — the "pending, not yet complete" demo row
    await prisma.graduationRequest.create({ data: { studentId: gradFor.id, status: 'PENDING', completedHours: Math.max(0, requiredHours - 2), requiredHours, gpa: 3.95 } });
  }
  const gradFor2 = await prisma.student.findUnique({ where: { studentCode: '2024-102' }, include: { program: { select: { totalCreditHours: true } } } });
  if (gradFor2) {
    const requiredHours = resolveGraduationHours(gradFor2.program?.totalCreditHours, reg);
    await prisma.graduationRequest.deleteMany({ where: { studentId: gradFor2.id } });
    // hours complete — the "ready to approve" demo row
    await prisma.graduationRequest.create({ data: { studentId: gradFor2.id, status: 'PENDING', completedHours: requiredHours, requiredHours, gpa: 3.9 } });
  }

  // 8d) Faculty office hours, appointments, and publications (for the demo instructor)
  await prisma.officeHoursSlot.deleteMany({ where: { instructorId: instructor.id } });
  const slot1 = await prisma.officeHoursSlot.create({ data: { instructorId: instructor.id, day: 'الأحد', startTime: '11:00 AM', endTime: '1:00 PM', location: 'مكتب 204', type: 'in-person', active: true } });
  await prisma.officeHoursSlot.create({ data: { instructorId: instructor.id, day: 'الثلاثاء', startTime: '1:00 PM', endTime: '3:00 PM', location: 'Zoom', type: 'online', active: true } });
  await prisma.officeHoursAppointment.deleteMany({ where: { slotId: slot1.id } });
  await prisma.officeHoursAppointment.createMany({
    data: [
      { slotId: slot1.id, studentId: demo.id, date: new Date('2025-01-12T11:00:00.000Z'), topic: 'مناقشة مشروع هياكل البيانات', status: 'confirmed' },
      { slotId: slot1.id, studentId: struggling.id, date: new Date('2025-01-12T11:30:00.000Z'), topic: 'متابعة المعدل', status: 'pending' },
    ],
  });

  await prisma.publication.deleteMany({ where: { instructorId: instructor.id } });
  await prisma.publication.createMany({
    data: [
      { instructorId: instructor.id, title: 'تحسين أداء خوارزميات الفرز المتوازي', venue: 'IEEE Access', year: 2024, type: 'journal', citations: 12, impactFactor: 3.4, status: 'published' },
      { instructorId: instructor.id, title: 'نموذج تعلّم آلي لاكتشاف التسلل', venue: 'ACM CCS', year: 2023, type: 'conference', citations: 8, status: 'published' },
      { instructorId: instructor.id, title: 'هندسة البرمجيات المدفوعة بالنماذج', venue: 'Springer', year: 2025, type: 'book', citations: 0, status: 'under-review' },
    ],
  });

  // 8e) LMS — content library, forums, and virtual classes
  await prisma.lMSContent.deleteMany({});
  await prisma.lMSContent.createMany({
    data: [
      { courseId: courses['CS201'].id, unit: 'الوحدة 1: مقدمة', title: 'محاضرة: القوائم المترابطة', type: 'video', url: 'https://example.test/v1', sizeMb: 245, views: 132 },
      { courseId: courses['CS201'].id, unit: 'الوحدة 1: مقدمة', title: 'ملخص هياكل البيانات (PDF)', type: 'pdf', url: 'https://example.test/p1', sizeMb: 3.2, views: 210 },
      { courseId: courses['CS203'].id, unit: 'الوحدة 2: SQL', title: 'محاضرة: نمذجة قواعد البيانات', type: 'video', url: 'https://example.test/v2', sizeMb: 310, views: 98 },
      { courseId: courses['CS203'].id, unit: 'الوحدة 2: SQL', title: 'تمارين SQL', type: 'pdf', url: 'https://example.test/p2', sizeMb: 1.1, views: 76 },
      { courseId: courses['CS202'].id, unit: 'الوحدة 1', title: 'مخطط الفصول (صورة)', type: 'image', url: 'https://example.test/i1', sizeMb: 0.8, views: 54 },
      { courseId: courses['CS204'].id, unit: 'الوحدة 3', title: 'محاضرة: المعالجات', type: 'video', url: 'https://example.test/v3', sizeMb: 280, views: 41 },
    ],
  });

  await prisma.forumPost.deleteMany({});
  await prisma.forumTopic.deleteMany({});
  await prisma.forumCategory.deleteMany({});
  const catGeneral = await prisma.forumCategory.create({ data: { name: 'نقاش عام', description: 'مواضيع عامة', order: 1 } });
  const catCourses = await prisma.forumCategory.create({ data: { name: 'أسئلة المقررات', description: 'أسئلة حول المواد الدراسية', order: 2 } });
  const t1 = await prisma.forumTopic.create({ data: { categoryId: catCourses.id, title: 'استفسار حول تعقيد الخوارزميات', authorName: 'أحمد محمود', authorRole: 'student', answered: true, views: 64 } });
  const t2 = await prisma.forumTopic.create({ data: { categoryId: catCourses.id, title: 'مشكلة في استعلام SQL', authorName: 'سارة أحمد', authorRole: 'student', views: 39 } });
  await prisma.forumTopic.create({ data: { categoryId: catGeneral.id, title: 'مواعيد الامتحانات النهائية', authorName: 'د. سمير عبد الرحمن', authorRole: 'faculty', pinned: true, views: 120 } });
  await prisma.forumPost.createMany({
    data: [
      { topicId: t1.id, authorName: 'د. سمير عبد الرحمن', authorRole: 'faculty', body: 'التعقيد الزمني هو O(n log n) في هذه الحالة.', likes: 8 },
      { topicId: t1.id, authorName: 'أحمد محمود', authorRole: 'student', body: 'شكراً، اتضحت الفكرة.', likes: 2 },
      { topicId: t2.id, authorName: 'ليلى حسن', authorRole: 'student', body: 'جرّب استخدام JOIN بدلاً من الاستعلام الفرعي.', likes: 3 },
    ],
  });

  await prisma.virtualClass.deleteMany({});
  await prisma.virtualClass.createMany({
    data: [
      { courseId: courses['CS201'].id, title: 'حصة مباشرة: هياكل البيانات', date: new Date('2025-01-13T10:00:00.000Z'), startTime: '10:00 AM', durationMins: 90, platform: 'zoom', status: 'upcoming' },
      { courseId: courses['CS203'].id, title: 'مراجعة قواعد البيانات', date: new Date('2025-01-10T12:00:00.000Z'), startTime: '12:00 PM', durationMins: 60, platform: 'meet', status: 'ended', recordingUrl: 'https://example.test/rec1' },
      { courseId: courses['CS202'].id, title: 'البرمجة الكائنية - مباشر', date: new Date('2025-01-14T09:00:00.000Z'), startTime: '9:00 AM', durationMins: 90, platform: 'teams', status: 'scheduled' },
    ],
  });

  // 8f) Library — books + borrowings (institute/library + library-admin dashboard)
  await prisma.borrowing.deleteMany({});
  await prisma.book.deleteMany({});
  const b1 = await prisma.book.create({ data: { title: 'مقدمة في الخوارزميات', author: 'Cormen et al.', isbn: '9780262033848', category: 'علوم الحاسب', copies: 5, available: 3 } });
  const b2 = await prisma.book.create({ data: { title: 'أنظمة قواعد البيانات', author: 'Elmasri & Navathe', isbn: '9780133970777', category: 'علوم الحاسب', copies: 4, available: 4 } });
  await prisma.book.create({ data: { title: 'هندسة البرمجيات', author: 'Sommerville', category: 'علوم الحاسب', copies: 3, available: 2 } });
  await prisma.book.create({ data: { title: 'الرياضيات المتقطعة', author: 'Rosen', category: 'رياضيات', copies: 6, available: 6 } });
  await prisma.borrowing.createMany({
    data: [
      { bookId: b1.id, borrowerName: 'أحمد محمود', studentId: demo.id, dueDate: new Date('2025-01-20T00:00:00.000Z'), status: 'borrowed' },
      { bookId: b1.id, borrowerName: 'سارة أحمد', dueDate: new Date('2024-12-30T00:00:00.000Z'), status: 'overdue' },
      { bookId: b2.id, borrowerName: 'محمد علي', dueDate: new Date('2024-12-15T00:00:00.000Z'), returnedAt: new Date('2024-12-14T00:00:00.000Z'), status: 'returned' },
    ],
  });

  // 8g) Payroll (institute/payroll) + Banking (institute/banking)
  await prisma.payroll.deleteMany({});
  const payRowsData = [
    { employeeName: 'د. سمير عبد الرحمن', role: 'faculty', baseSalary: 18000, deductions: 2400, month: 'نوفمبر 2024', status: 'completed' },
    { employeeName: 'د. أحمد علي', role: 'faculty', baseSalary: 16000, deductions: 2100, month: 'نوفمبر 2024', status: 'completed' },
    { employeeName: 'منى إبراهيم', role: 'staff', baseSalary: 7000, deductions: 900, month: 'نوفمبر 2024', status: 'completed' },
    { employeeName: 'خالد فهمي', role: 'staff', baseSalary: 6500, deductions: 850, month: 'نوفمبر 2024', status: 'completed' },
    { employeeName: 'د. سمير عبد الرحمن', role: 'faculty', baseSalary: 18000, deductions: 2400, month: 'ديسمبر 2024', status: 'pending' },
  ];
  await prisma.payroll.createMany({
    data: payRowsData.map((p) => ({ ...p, netSalary: p.baseSalary - p.deductions, paidAt: p.status === 'completed' ? new Date(`2024-11-25T00:00:00.000Z`) : null })),
  });

  await prisma.bankTransaction.deleteMany({});
  await prisma.bankAccount.deleteMany({});
  const acc1 = await prisma.bankAccount.create({ data: { bankName: 'البنك الأهلي المصري', accountNo: '9876543210123', accountType: 'حساب جاري', balance: 8500000 } });
  const acc2 = await prisma.bankAccount.create({ data: { bankName: 'بنك مصر', accountNo: '1234567890987', accountType: 'حساب توفير', balance: 4200000 } });
  await prisma.bankTransaction.createMany({
    data: [
      { accountId: acc1.id, date: new Date('2024-11-20T00:00:00.000Z'), description: 'تحصيل رسوم طلاب - علوم الحاسب', type: 'credit', amount: 125000, reference: 'TRX-00542' },
      { accountId: acc2.id, date: new Date('2024-11-20T00:00:00.000Z'), description: 'تحويل رواتب الموظفين', type: 'debit', amount: 850000, reference: 'TRX-00541' },
      { accountId: acc1.id, date: new Date('2024-11-19T00:00:00.000Z'), description: 'تحصيل رسوم - علوم الحاسب', type: 'credit', amount: 95000, reference: 'TRX-00540' },
      { accountId: acc1.id, date: new Date('2024-11-19T00:00:00.000Z'), description: 'سداد فاتورة كهرباء', type: 'debit', amount: 45000, reference: 'TRX-00539' },
    ],
  });

  // 8h) Gamification — points, badges, rewards + e-learning lesson progress
  // Point rules (documented): grade entry = round(percentage/2); attendance present=5/late=2; assignment graded = grade.
  await prisma.pointsLog.deleteMany({});
  await prisma.studentBadge.deleteMany({});
  await prisma.lessonProgress.deleteMany({});

  // demo points from real data
  const demoEnr = await prisma.enrollment.findMany({ where: { studentId: demo.id, final: { not: null } }, include: { course: true } });
  for (const e of demoEnr) {
    const max = e.course.midtermMax + e.course.finalMax + e.course.practicalMax + e.course.homeworkMax;
    const pct = max > 0 ? ((e.midterm ?? 0) + (e.final ?? 0) + (e.practical ?? 0) + (e.homework ?? 0)) / max * 100 : 0;
    await prisma.pointsLog.create({ data: { studentId: demo.id, points: Math.round(pct / 2), reason: `نتيجة ${e.course.nameAr}`, category: 'grade' } });
  }
  const demoAtt = await prisma.attendance.findMany({ where: { studentId: demo.id } });
  const attPoints = demoAtt.filter((a) => a.status === 'present').length * 5 + demoAtt.filter((a) => a.status === 'late').length * 2;
  await prisma.pointsLog.create({ data: { studentId: demo.id, points: attPoints, reason: 'الحضور والمواظبة', category: 'attendance' } });
  const demoSubs = await prisma.assignmentSubmission.findMany({ where: { studentId: demo.id, grade: { not: null } } });
  for (const s of demoSubs) await prisma.pointsLog.create({ data: { studentId: demo.id, points: s.grade ?? 0, reason: 'تسليم واجب', category: 'assignment' } });

  const demoTotal = (await prisma.pointsLog.findMany({ where: { studentId: demo.id } })).reduce((s, p) => s + p.points, 0);

  // classmate totals (lump bonus) so the leaderboard is real
  const lbTotals: Record<string, number> = { '2024-101': 480, '2024-102': 420, '2024-103': 360, '2024-104': 330, '2024-106': 300 };
  for (const [code, total] of Object.entries(lbTotals)) {
    const s = await prisma.student.findUnique({ where: { studentCode: code } });
    if (s) await prisma.pointsLog.create({ data: { studentId: s.id, points: total, reason: 'إجمالي النقاط', category: 'bonus' } });
  }

  // Badges
  await prisma.badge.deleteMany({});
  const badgeDefs = [
    { name: 'بداية الطريق', description: 'أول تسجيل دخول', icon: '🚀', category: 'general', threshold: 0 },
    { name: 'مجتهد', description: '100 نقطة', icon: '📚', category: 'points', threshold: 100 },
    { name: 'متفوق', description: '300 نقطة', icon: '⭐', category: 'points', threshold: 300 },
    { name: 'نجم الأسبوع', description: '500 نقطة', icon: '🌟', category: 'points', threshold: 500 },
    { name: 'منتظم', description: 'حضور ممتاز', icon: '✅', category: 'attendance', threshold: 0 },
  ];
  const badges = [];
  for (const b of badgeDefs) badges.push(await prisma.badge.create({ data: b }));
  // demo earns badges whose threshold it meets
  for (const b of badges) {
    if (b.threshold <= demoTotal) await prisma.studentBadge.create({ data: { studentId: demo.id, badgeId: b.id } });
  }

  // Rewards catalog
  await prisma.reward.deleteMany({});
  await prisma.reward.createMany({
    data: [
      { name: 'قسيمة كافيتيريا', description: 'خصم في الكافيتيريا', icon: '☕', cost: 200, stock: 50 },
      { name: 'ساعة دراسة إضافية', description: 'جلسة إرشاد خاصة', icon: '⏰', cost: 300, stock: 20 },
      { name: 'شهادة تقدير', description: 'شهادة تفوق', icon: '🏅', cost: 500, stock: 100 },
      { name: 'كتاب مجاني', description: 'من المكتبة', icon: '📖', cost: 800, stock: 10 },
    ],
  });

  // E-learning lesson progress over LMSContent
  const allContent = await prisma.lMSContent.findMany();
  for (let i = 0; i < allContent.length; i++) {
    const status = i < 2 ? 'completed' : i === 2 ? 'current' : 'locked';
    await prisma.lessonProgress.create({
      data: { studentId: demo.id, contentId: allContent[i].id, status, completedAt: status === 'completed' ? new Date('2024-12-20T00:00:00.000Z') : null },
    });
  }

  // 8i) Messaging — inbox messages for parent, faculty, and admin
  await prisma.message.deleteMany({});
  // to the parent (from teachers/admin)
  await prisma.message.createMany({
    data: [
      { recipientUserId: parentUser.id, senderName: 'د. سمير عبد الرحمن', senderRole: 'عضو هيئة تدريس', subject: 'بخصوص مستوى أحمد', body: 'أحمد يتقدم بشكل ممتاز في هياكل البيانات، ننصح بالاستمرار على نفس المستوى.', read: true },
      { recipientUserId: parentUser.id, senderName: 'إدارة المعهد', senderRole: 'إدارة', subject: 'اجتماع أولياء الأمور', body: 'يسرنا دعوتكم لحضور اجتماع أولياء الأمور يوم الخميس القادم.', read: false },
      { recipientUserId: parentUser.id, senderName: 'شؤون الطلاب', senderRole: 'إدارة', subject: 'تذكير بالمصروفات', body: 'نذكركم بسداد القسط المتبقي قبل 2025-01-15.', read: false },
    ],
  });
  // to the faculty (from students)
  await prisma.message.createMany({
    data: [
      { recipientUserId: facultyUser.id, senderName: 'أحمد محمود', senderRole: 'طالب', subject: 'استفسار عن المشروع', body: 'السلام عليكم دكتور، أريد الاستفسار عن متطلبات مشروع هياكل البيانات.', read: false },
      { recipientUserId: facultyUser.id, senderName: 'سارة أحمد', senderRole: 'طالب', subject: 'طلب موعد', body: 'دكتور، أرجو حجز موعد في الساعات المكتبية لمناقشة الواجب.', read: false },
      { recipientUserId: facultyUser.id, senderName: 'منى سمير', senderRole: 'طالب', subject: 'شكر وتقدير', body: 'شكراً جزيلاً على توضيح موضوع الخوارزميات.', read: true },
    ],
  });
  // to the admin (hardcoded super-admin id)
  await prisma.message.createMany({
    data: [
      { recipientUserId: 'dev-admin-001', senderName: 'أحمد محمد - علوم الحاسب', senderRole: 'طالب', subject: 'استفسار عن تسجيل المقررات', body: 'أرجو المساعدة في تسجيل مقرر قواعد البيانات.', read: false },
      { recipientUserId: 'dev-admin-001', senderName: 'د. سمير عبد الرحمن', senderRole: 'عضو هيئة تدريس', subject: 'تحديث جدول المحاضرات', body: 'أرجو تحديث قاعة محاضرة هياكل البيانات.', read: false },
      { recipientUserId: 'dev-admin-001', senderName: 'الشؤون المالية', senderRole: 'إدارة', subject: 'تقرير التحصيل الأسبوعي', body: 'مرفق تقرير التحصيل لهذا الأسبوع.', read: true },
    ],
  });

  // 8j) Batch 4/5 admin entities: study plan, committees, quality, partnerships,
  // trainees, trainers, activities, certificates, marketing.
  await prisma.studyPlanItem.deleteMany({});
  const planY1S1 = [['MA101', 'رياضيات (1)', 3], ['CS101', 'مقدمة في البرمجة', 3], ['EN101', 'لغة إنجليزية', 2], ['PH101', 'فيزياء', 3]] as const;
  const planY1S2 = [['MA102', 'رياضيات (2)', 3], ['CS102', 'برمجة متقدمة', 3], ['CS103', 'منطق رقمي', 3], ['EN102', 'لغة إنجليزية (2)', 2]] as const;
  const planY2S1 = [['CS201', 'هياكل البيانات', 3], ['CS202', 'البرمجة الكائنية', 3], ['MA201', 'الرياضيات المتقطعة', 3]] as const;
  const planY2S2 = [['CS203', 'قواعد البيانات', 3], ['CS204', 'تنظيم وعمارة الحاسب', 3], ['EN201', 'اللغة الإنجليزية الفنية', 2]] as const;
  const planSpec: [string, string, ReadonlyArray<readonly [string, string, number]>][] = [
    ['السنة الأولى', 'الفصل الأول', planY1S1], ['السنة الأولى', 'الفصل الثاني', planY1S2],
    ['السنة الثانية', 'الفصل الأول', planY2S1], ['السنة الثانية', 'الفصل الثاني', planY2S2],
  ];
  let planOrder = 0;
  for (const [year, semester, rows] of planSpec) {
    for (const [courseCode, courseName, hours] of rows) {
      await prisma.studyPlanItem.create({ data: { programId: program.id, programName: program.nameAr, year, semester, courseCode, courseName, hours, order: planOrder++ } });
    }
  }

  await prisma.controlTask.deleteMany({});
  await prisma.examCommittee.deleteMany({});
  const com1 = await prisma.examCommittee.create({ data: { name: 'لجنة كنترول علوم الحاسب', department: 'علوم الحاسب', head: 'د. سمير عبد الرحمن', members: 5, courses: 6, status: 'active' } });
  await prisma.examCommittee.create({ data: { name: 'لجنة كنترول الرياضيات', department: 'علوم الحاسب', head: 'د. سارة خالد', members: 4, courses: 3, status: 'pending' } });
  await prisma.controlTask.createMany({
    data: [
      { committeeId: com1.id, title: 'مراجعة أوراق هياكل البيانات', status: 'inprogress', assignee: 'د. سمير عبد الرحمن' },
      { committeeId: com1.id, title: 'رصد درجات قواعد البيانات', status: 'pending', assignee: 'د. خالد سعيد' },
      { committeeId: com1.id, title: 'اعتماد نتائج الفصل', status: 'pending' },
    ],
  });

  await prisma.qualityIndicator.deleteMany({});
  await prisma.qualityIndicator.createMany({
    data: [
      { name: 'جودة المخرجات التعليمية', score: 88, target: 90, order: 1 },
      { name: 'كفاءة أعضاء هيئة التدريس', score: 92, target: 85, order: 2 },
      { name: 'البنية التحتية والمرافق', score: 78, target: 80, order: 3 },
      { name: 'رضا الطلاب', score: 85, target: 85, order: 4 },
      { name: 'الشراكات المجتمعية', score: 72, target: 75, order: 5 },
      { name: 'البحث العلمي', score: 68, target: 70, order: 6 },
    ],
  });

  await prisma.partnership.deleteMany({});
  await prisma.partnership.createMany({
    data: [
      { name: 'شركة تقنية المستقبل', type: 'شركة تقنية', contact: 'أحمد محمد', phone: '01012345678', email: 'ahmed@futuretech.test', website: 'futuretech.test', trainees: 45, programs: 3, status: 'active', since: new Date('2023-01-15') },
      { name: 'بنك مصر', type: 'قطاع مصرفي', contact: 'سارة خالد', phone: '01123456789', email: 'sara@bank.test', website: 'bank.test', trainees: 120, programs: 5, status: 'active', since: new Date('2022-06-01') },
      { name: 'هيئة تنمية صناعة تكنولوجيا المعلومات', type: 'حكومي', contact: 'محمد علي', phone: '0227000000', email: 'info@itida.test', trainees: 30, programs: 2, status: 'pending', since: new Date('2024-02-01') },
    ],
  });

  await prisma.trainee.deleteMany({});
  await prisma.trainee.createMany({
    data: [
      { name: 'أحمد محمد علي', phone: '01012345678', email: 'ahmed@example.test', program: 'تطوير الويب', batch: 'الدفعة 15', progress: 65, attendance: 92, status: 'active', joinDate: new Date('2024-12-01'), certificates: 0 },
      { name: 'سارة خالد أحمد', phone: '01123456789', email: 'sara@example.test', program: 'التسويق الرقمي', batch: 'الدفعة 10', progress: 85, attendance: 98, status: 'active', joinDate: new Date('2024-11-01'), certificates: 1 },
      { name: 'محمد سعيد حسن', phone: '01234567890', email: 'mohamed@example.test', program: 'إدارة المشاريع', batch: 'الدفعة 12', progress: 100, attendance: 95, status: 'graduated', joinDate: new Date('2024-09-01'), certificates: 1 },
    ],
  });

  await prisma.trainer.deleteMany({});
  await prisma.trainer.createMany({
    data: [
      { name: 'م. أحمد سعيد محمد', specialty: 'تطوير الويب', phone: '01012345678', email: 'ahmed.t@example.test', courses: 5, trainees: 150, rating: 4.9, status: 'active', experience: '8 سنوات', certifications: ['AWS Certified', 'Google Cloud'] },
      { name: 'د. سارة محمود حسن', specialty: 'إدارة المشاريع', phone: '01123456789', email: 'sara.t@example.test', courses: 8, trainees: 220, rating: 4.8, status: 'active', experience: '12 سنة', certifications: ['PMP', 'PRINCE2'] },
    ],
  });

  await prisma.activity.deleteMany({});
  await prisma.activity.createMany({
    data: [
      { name: 'نادي البرمجة', members: 120, type: 'أكاديمي', nextEvent: 'مسابقة البرمجة', date: new Date('2025-01-15'), status: 'active' },
      { name: 'فريق كرة القدم', members: 25, type: 'رياضي', nextEvent: 'مباراة ودية', date: new Date('2025-01-10'), status: 'active' },
      { name: 'جماعة الإعلام', members: 45, type: 'ثقافي', nextEvent: 'ورشة تصوير', date: new Date('2025-01-12'), status: 'active' },
      { name: 'نادي ريادة الأعمال', members: 80, type: 'أكاديمي', nextEvent: 'محاضرة ريادية', date: new Date('2025-01-18'), status: 'active' },
    ],
  });

  await prisma.certificate.deleteMany({});
  await prisma.certificate.createMany({
    data: [
      { code: 'CERT-2024-001', trainee: 'أحمد محمد علي', program: 'تطوير تطبيقات الويب', issueDate: new Date('2024-12-20'), status: 'issued', verificationCode: 'VER-ABC123' },
      { code: 'CERT-2024-002', trainee: 'سارة خالد أحمد', program: 'التسويق الرقمي', issueDate: new Date('2024-12-18'), status: 'issued', verificationCode: 'VER-DEF456' },
      { code: 'CERT-2024-003', trainee: 'محمد سعيد حسن', program: 'إدارة المشاريع PMP', issueDate: null, status: 'pending', verificationCode: null },
    ],
  });

  await prisma.marketingCampaign.deleteMany({});
  await prisma.marketingCampaign.createMany({
    data: [
      { name: 'حملة الشتاء 2024', type: 'إعلانات رقمية', budget: 50000, spent: 35000, leads: 245, conversions: 48, status: 'active', startDate: new Date('2024-12-01'), endDate: new Date('2025-01-31') },
      { name: 'برنامج PMP المكثف', type: 'البريد الإلكتروني', budget: 15000, spent: 12000, leads: 180, conversions: 35, status: 'active', startDate: new Date('2024-12-15'), endDate: new Date('2025-02-15') },
      { name: 'معرض التوظيف', type: 'فعاليات', budget: 30000, spent: 8000, leads: 90, conversions: 12, status: 'scheduled', startDate: new Date('2025-02-01'), endDate: new Date('2025-02-03') },
    ],
  });

  // 9) Weekly timetable (reuses Schedule + Lecture); subjects = course names.
  const instructorOf: Record<string, string> = {
    'هياكل البيانات': 'د. سمير عبد الرحمن', 'البرمجة الكائنية': 'د. أحمد علي', 'قواعد البيانات': 'د. خالد سعيد',
    'تنظيم وعمارة الحاسب': 'د. هالة محمود', 'الرياضيات المتقطعة': 'د. سارة خالد', 'اللغة الإنجليزية الفنية': 'د. نورا محمد',
  };
  const roomOf: Record<string, string> = {
    'هياكل البيانات': 'معمل حاسب 1', 'البرمجة الكائنية': 'معمل حاسب 2', 'قواعد البيانات': 'معمل حاسب 3',
    'تنظيم وعمارة الحاسب': 'معمل حاسب 1', 'الرياضيات المتقطعة': 'قاعة 201', 'اللغة الإنجليزية الفنية': 'قاعة 202',
  };
  const periods = [['8:00', '8:45'], ['9:00', '9:45'], ['10:00', '10:45'], ['11:00', '11:45'], ['12:00', '12:45']];
  const week: Record<string, string[]> = {
    'الأحد': ['هياكل البيانات', 'الرياضيات المتقطعة', 'البرمجة الكائنية', 'اللغة الإنجليزية الفنية', 'قواعد البيانات'],
    'الاثنين': ['البرمجة الكائنية', 'هياكل البيانات', 'اللغة الإنجليزية الفنية', 'الرياضيات المتقطعة', 'تنظيم وعمارة الحاسب'],
    'الثلاثاء': ['قواعد البيانات', 'البرمجة الكائنية', 'هياكل البيانات', 'تنظيم وعمارة الحاسب', 'اللغة الإنجليزية الفنية'],
    'الأربعاء': ['الرياضيات المتقطعة', 'قواعد البيانات', 'تنظيم وعمارة الحاسب', 'هياكل البيانات', 'البرمجة الكائنية'],
    'الخميس': ['اللغة الإنجليزية الفنية', 'الرياضيات المتقطعة', 'هياكل البيانات', 'قواعد البيانات', 'البرمجة الكائنية'],
  };
  await prisma.schedule.deleteMany({ where: { departmentId: dept.id } });
  const schedule = await prisma.schedule.create({
    data: { departmentId: dept.id, year: 2, semester: SEMESTER, academicYear: ACADEMIC_YEAR, isVisible: true },
  });
  const lectureRows = Object.entries(week).flatMap(([day, subjects]) =>
    subjects.map((subject, i) => ({
      scheduleId: schedule.id, day, startTime: periods[i][0], endTime: periods[i][1],
      course: subject, instructor: instructorOf[subject] ?? '', room: roomOf[subject] ?? 'قاعة 201',
    }))
  );
  await prisma.lecture.createMany({ data: lectureRows });

  // 10) Assignments (per course) + the demo student's submissions.
  const day = 86400000;
  const now = Date.now();
  const assignmentDefs = [
    { code: 'CS201', title: 'تنفيذ قائمة مترابطة', due: now + 5 * day, status: 'pending', grade: null },
    { code: 'CS202', title: 'تصميم نظام بالكائنات', due: now + 6 * day, status: 'pending', grade: null },
    { code: 'MA201', title: 'حل تمارين المنطق', due: now + 7 * day, status: 'pending', grade: null },
    { code: 'CS201', title: 'تحليل تعقيد الخوارزميات', due: now - 10 * day, status: 'submitted', grade: 18 },
    { code: 'CS203', title: 'تصميم قاعدة بيانات علائقية', due: now - 14 * day, status: 'graded', grade: 17 },
    { code: 'EN201', title: 'كتابة تقرير تقني', due: now - 18 * day, status: 'late', grade: 12 },
  ];
  await prisma.assignment.deleteMany({ where: { courseId: { in: Object.values(courses).map((c) => c.id) } } });
  for (const a of assignmentDefs) {
    const course = courses[a.code];
    const def = courseDefs.find((c) => c.code === a.code)!;
    const assignment = await prisma.assignment.create({
      data: { courseId: course.id, title: a.title, instructor: instructorOf[def.nameAr] ?? null, dueDate: new Date(a.due), maxGrade: 20 },
    });
    await prisma.assignmentSubmission.create({
      data: { assignmentId: assignment.id, studentId: demo.id, status: a.status, grade: a.grade, submittedAt: a.status === 'pending' ? null : new Date(a.due - day) },
    });
  }

  // 10b) Exam sessions, question bank, and appeals (institute/exams)
  const courseIds = Object.values(courses).map((c) => c.id);
  await prisma.examSession.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.examQuestion.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.examAppeal.deleteMany({ where: { courseId: { in: courseIds } } });

  const examDates = ['2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18', '2025-01-19', '2025-01-20'];
  const halls = ['قاعة A1', 'معمل حاسب 1', 'قاعة B2', 'معمل حاسب 2', 'قاعة A2', 'قاعة B1'];
  let ci = 0;
  for (const c of courseDefs) {
    const course = courses[c.code];
    await prisma.examSession.create({
      data: {
        courseId: course.id,
        title: `امتحان نهاية الفصل - ${c.nameAr}`,
        examType: 'final',
        date: new Date(`${examDates[ci]}T09:00:00.000Z`),
        startTime: '9:00 AM',
        durationMins: 120,
        hall: halls[ci],
        academicYear: ACADEMIC_YEAR,
        semester: SEMESTER,
      },
    });
    // a few questions per course
    await prisma.examQuestion.createMany({
      data: [
        { courseId: course.id, text: `سؤال اختيار من متعدد في ${c.nameAr}`, type: 'mcq', difficulty: 'easy' },
        { courseId: course.id, text: `سؤال مقالي في ${c.nameAr}`, type: 'essay', difficulty: 'hard' },
        { courseId: course.id, text: `سؤال صح/خطأ في ${c.nameAr}`, type: 'truefalse', difficulty: 'medium' },
      ],
    });
    ci++;
  }

  // Two appeals from classmates
  const appealStudent1 = await prisma.student.findUnique({ where: { studentCode: '2024-103' } });
  const appealStudent2 = await prisma.student.findUnique({ where: { studentCode: '2024-104' } });
  if (appealStudent1) await prisma.examAppeal.create({ data: { studentId: appealStudent1.id, courseId: courses['CS203'].id, reason: 'إعادة تصحيح ورقة الامتحان النهائي', status: 'PENDING' } });
  if (appealStudent2) await prisma.examAppeal.create({ data: { studentId: appealStudent2.id, courseId: courses['CS201'].id, reason: 'مراجعة درجة السؤال الثالث', status: 'PENDING' } });

  // 11) Admission applications (for institute/admission)
  const apps = [
    { nationalId: '30101010100111', fullName: 'كريم وليد', firstChoice: 'علوم الحاسب', grade: 92.5, status: 'PENDING' },
    { nationalId: '30202020200222', fullName: 'هبة ناصر', firstChoice: 'علوم الحاسب', grade: 88.0, status: 'PENDING' },
    { nationalId: '30303030300333', fullName: 'طارق فؤاد', firstChoice: 'علوم الحاسب', grade: 95.0, status: 'APPROVED' },
  ];
  for (const a of apps) {
    await prisma.application.upsert({
      where: { nationalId: a.nationalId },
      update: { status: a.status },
      create: {
        fullName: a.fullName,
        nationalId: a.nationalId,
        birthDate: new Date('2006-01-01T00:00:00.000Z'),
        phone: '0100000000',
        email: `${a.nationalId}@applicant.test`,
        address: 'القاهرة',
        highSchoolGrade: a.grade,
        highSchoolYear: 2024,
        firstChoice: a.firstChoice,
        status: a.status,
      },
    });
  }

  // Phase A: backfill result-state codes, course flags, and demo special states
  await prisma.course.update({ where: { code: 'EN201' }, data: { requirementType: 'elective' } }).catch(() => {});
  const gradedEnr = await prisma.enrollment.findMany({ where: { letterGrade: { not: null } } });
  for (const e of gradedEnr) {
    await prisma.enrollment.update({ where: { id: e.id }, data: { gradeStatusCode: e.letterGrade } });
  }
  // struggling student: demonstrate special result states (no GPA points for W/I; F counts as 0)
  const specialStates: [string, string][] = [['CS201', 'F'], ['CS202', 'I'], ['CS203', 'W']];
  for (const [code, statusCode] of specialStates) {
    const course = courses[code];
    if (!course) continue;
    await prisma.enrollment.upsert({
      where: { studentId_courseId_academicYear_semester: { studentId: struggling.id, courseId: course.id, academicYear: ACADEMIC_YEAR, semester: SEMESTER } },
      update: { gradeStatusCode: statusCode, letterGrade: statusCode === 'F' ? 'F' : null, status: 'COMPLETED' },
      create: { studentId: struggling.id, courseId: course.id, academicYear: ACADEMIC_YEAR, semester: SEMESTER, gradeStatusCode: statusCode, letterGrade: statusCode === 'F' ? 'F' : null, status: 'COMPLETED' },
    });
  }

  const enrollCount = await prisma.enrollment.count({ where: { studentId: demo.id } });
  const attCount = await prisma.attendance.count({ where: { studentId: demo.id } });
  console.log(`Seeded dept=${dept.nameAr}, courses=${courseDefs.length} (instructor=${instructor.name})`);
  console.log(`  demo student=${demo.studentCode}: enrollments=${enrollCount}, attendance=${attCount}`);
  console.log('Logins:');
  console.log('  STUDENT  demo.student@sinaiinstitute.test / student123');
  console.log('  FACULTY  demo.faculty@sinaiinstitute.test / faculty123');
  console.log('  PARENT   demo.parent@sinaiinstitute.test  / parent123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
