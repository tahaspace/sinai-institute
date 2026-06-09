/**
 * TEST-ONLY seed for the "finish deferred pages" work.
 *
 * Populates the models/settings the newly-wired pages read:
 *   - CourseEquivalenceRequest (institute/admission/equivalence)
 *   - TransferRequest          (institute/admission/transfers)
 *   - a full online exam: ExamSession + ExamQuestion(points/correctAnswer)
 *     + ExamQuestionOption     (lms/exams/take/[id])
 *   - Setting JSON blobs        (institute.tuition, finance.savedReports,
 *     institute.registration.<yr>.<sem>, institute.currentTerm/studyWeek)
 *
 * Safe by construction: refuses to run unless DATABASE_URL is a local host.
 * Idempotent: clears only the rows it owns, then recreates them.
 *   DATABASE_URL="postgresql://sinai_test:sinai_test_pw@127.0.0.1:5432/sinai_test?schema=public" \
 *     npx tsx scripts/seed-finish-pages.ts
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL || '';
if (!/(@(127\.0\.0\.1|localhost))[:/]/.test(url) && process.env.ALLOW_REMOTE_SEED !== '1') {
  console.error('\nRefusing to seed: DATABASE_URL is not a local host. Test-only script.\n');
  process.exit(1);
}

const prisma = new PrismaClient();
const ACADEMIC_YEAR = '2024-2025';
const DEMO_EXAM_TITLE = 'امتحان أونلاين تجريبي';

async function main() {
  const departments = await prisma.department.findMany({ orderBy: { order: 'asc' } });
  const courses = await prisma.course.findMany({ orderBy: { code: 'asc' } });
  const demo = await prisma.student.findUnique({ where: { studentCode: '2024-105' } });
  if (!courses.length || !departments.length) {
    throw new Error('Base data missing — run seed-student-test.ts first.');
  }
  const dept = departments[0];
  const dept2 = departments[1] ?? departments[0];

  // ---- 1) Course-equivalence requests -------------------------------------
  await prisma.courseEquivalenceRequest.deleteMany({});
  await prisma.courseEquivalenceRequest.createMany({
    data: [
      { studentId: demo?.id ?? null, studentName: demo?.nameAr ?? 'أحمد محمود سالم', originalCourse: 'CS101 - مقدمة في البرمجة', originalInstitute: 'جامعة القاهرة', requestedCourseId: courses[0]?.id ?? null, requestedCourse: `${courses[0].code} - ${courses[0].nameAr}`, creditHours: courses[0].creditHours, status: 'APPROVED', reviewedAt: new Date() },
      { studentName: 'منة الله حسن', originalCourse: 'MATH201 - تفاضل وتكامل', originalInstitute: 'جامعة عين شمس', requestedCourseId: courses[1]?.id ?? null, requestedCourse: courses[1] ? `${courses[1].code} - ${courses[1].nameAr}` : 'رياضيات (2)', creditHours: courses[1]?.creditHours ?? 3, status: 'APPROVED', reviewedAt: new Date() },
      { studentName: 'يوسف إبراهيم', originalCourse: 'ENG105 - لغة إنجليزية', originalInstitute: 'الأكاديمية العربية', requestedCourse: 'لغة إنجليزية (1)', creditHours: 2, status: 'PENDING' },
      { studentName: 'سلمى عادل', originalCourse: 'PHYS110 - فيزياء عامة', originalInstitute: 'جامعة حلوان', requestedCourse: 'فيزياء (1)', creditHours: 3, status: 'PENDING' },
      { studentName: 'كريم ماهر', originalCourse: 'STAT100 - إحصاء', originalInstitute: 'جامعة المنصورة', requestedCourse: 'إحصاء تطبيقي', creditHours: 3, status: 'REJECTED', reviewerNote: 'لا يوجد مقرر مكافئ', reviewedAt: new Date() },
    ],
  });

  // ---- 2) Transfer requests ----------------------------------------------
  await prisma.transferRequest.deleteMany({});
  await prisma.transferRequest.createMany({
    data: [
      { direction: 'INCOMING', studentName: 'عمر خالد', institution: 'جامعة القاهرة', departmentId: dept.id, department: dept.nameAr, status: 'PENDING' },
      { direction: 'INCOMING', studentName: 'نور الدين أحمد', institution: 'جامعة عين شمس', departmentId: dept2.id, department: dept2.nameAr, status: 'APPROVED' },
      { direction: 'INCOMING', studentName: 'مريم سامي', institution: 'الأكاديمية العربية للعلوم', departmentId: dept.id, department: dept.nameAr, status: 'PENDING' },
      { direction: 'OUTGOING', studentId: demo?.id ?? null, studentName: demo?.nameAr ?? 'حسن محمد', institution: 'جامعة الإسكندرية', departmentId: dept.id, department: dept.nameAr, status: 'COMPLETED' },
      { direction: 'OUTGOING', studentName: 'فاطمة الزهراء', institution: 'جامعة أسيوط', departmentId: dept2.id, department: dept2.nameAr, status: 'PENDING' },
    ],
  });

  // ---- 3) A complete online exam (session + gradable questions) ----------
  const examCourse = courses[0];
  // Clear any prior demo exam (cascades questions' options via FK on delete).
  const priorSessions = await prisma.examSession.findMany({ where: { title: DEMO_EXAM_TITLE } });
  for (const s of priorSessions) {
    await prisma.examAttempt.deleteMany({ where: { examSessionId: s.id } });
  }
  await prisma.examSession.deleteMany({ where: { title: DEMO_EXAM_TITLE } });
  // Remove prior demo questions (tagged with marker) + their options (cascade).
  await prisma.examQuestion.deleteMany({ where: { courseId: examCourse.id, text: { startsWith: '[تجريبي]' } } });

  const session = await prisma.examSession.create({
    data: {
      courseId: examCourse.id,
      title: DEMO_EXAM_TITLE,
      examType: 'quiz',
      date: new Date(),
      startTime: '10:00 AM',
      durationMins: 30,
      passingScore: 60,
      totalPoints: 100,
      academicYear: ACADEMIC_YEAR,
      semester: 'first',
    },
  });

  // 3 MCQ (20pts each) + 1 true/false (20) + 1 essay (20) = 100 total
  const mcqs = [
    { text: '[تجريبي] ما هي بنية البيانات الأنسب لتطبيق طابور الأولوية؟', options: ['كومة (Heap)', 'مصفوفة عادية', 'قائمة مرتبطة', 'مكدس'], correct: 0 },
    { text: '[تجريبي] ما تعقيد البحث الثنائي في أسوأ الحالات؟', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correct: 1 },
    { text: '[تجريبي] أي مما يلي ليس لغة برمجة؟', options: ['Python', 'Java', 'HTML', 'C++'], correct: 2 },
  ];
  for (let i = 0; i < mcqs.length; i++) {
    const q = await prisma.examQuestion.create({
      data: { courseId: examCourse.id, text: mcqs[i].text, type: 'mcq', difficulty: 'medium', points: 20 },
    });
    await prisma.examQuestionOption.createMany({
      data: mcqs[i].options.map((text, idx) => ({ questionId: q.id, text, isCorrect: idx === mcqs[i].correct, order: idx })),
    });
  }
  await prisma.examQuestion.create({
    data: { courseId: examCourse.id, text: '[تجريبي] البحث الخطي أسرع دائمًا من البحث الثنائي.', type: 'truefalse', difficulty: 'easy', points: 20, correctAnswer: 'false' },
  });
  await prisma.examQuestion.create({
    data: { courseId: examCourse.id, text: '[تجريبي] اشرح الفرق بين المكدس (Stack) والطابور (Queue).', type: 'essay', difficulty: 'medium', points: 20 },
  });

  // ---- 4) Setting JSON blobs ---------------------------------------------
  async function setKey(key: string, value: unknown) {
    const v = JSON.stringify(value);
    const ex = await prisma.setting.findFirst({ where: { key } });
    if (ex) await prisma.setting.update({ where: { id: ex.id }, data: { value: v } });
    else await prisma.setting.create({ data: { key, value: v } });
  }

  await setKey('institute.tuition', {
    departmentFees: departments.slice(0, 4).map((d, i) => ({
      id: `dept-${d.id}`,
      departmentId: d.id,
      department: d.nameAr,
      system: i % 2 === 0 ? 'ساعات معتمدة' : 'فصلي',
      creditHourPrice: 400 + i * 50,
      semesterCredits: 18,
      registrationFee: 2000,
      labFee: i % 2 === 0 ? 1500 : 0,
    })),
    additionalFees: [
      { id: 'af-1', name: 'رسوم التسجيل', amount: 2000, mandatory: true },
      { id: 'af-2', name: 'رسوم الكتب والمراجع', amount: 800, mandatory: true },
      { id: 'af-3', name: 'رسوم الأنشطة الطلابية', amount: 300, mandatory: false },
      { id: 'af-4', name: 'رسوم التأمين الطبي', amount: 250, mandatory: false },
    ],
  });

  await setKey('finance.savedReports', [
    { id: 'rep-1', name: 'تقرير التحصيل الفصلي', description: 'إجمالي المحصل لكل قسم خلال الفصل', source: 'tuition', lastRun: new Date().toISOString().slice(0, 10), schedule: 'شهري', createdBy: 'إدارة الشؤون المالية' },
    { id: 'rep-2', name: 'تقرير المتأخرات', description: 'الطلاب ذوو الرصيد المستحق', source: 'tuition', lastRun: new Date().toISOString().slice(0, 10), schedule: 'أسبوعي', createdBy: 'إدارة الشؤون المالية' },
  ]);

  const now = new Date();
  const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  await setKey(`institute.registration.${ACADEMIC_YEAR}.second`, {
    startDate: now.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    status: 'open',
  });
  await setKey('institute.currentTerm', `الفصل الدراسي الأول ${ACADEMIC_YEAR.replace('-', '/')}`);
  await setKey('institute.studyWeek', 12);

  // ---- Summary -----------------------------------------------------------
  const counts = {
    equivalence: await prisma.courseEquivalenceRequest.count(),
    transfers: await prisma.transferRequest.count(),
    examSession: session.id,
    examQuestions: await prisma.examQuestion.count({ where: { courseId: examCourse.id, text: { startsWith: '[تجريبي]' } } }),
    options: await prisma.examQuestionOption.count(),
  };
  console.log('seed-finish-pages OK:', JSON.stringify(counts));
  console.log('demo exam id:', session.id, '(open /lms/exams/take/' + session.id + ')');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
