import { PrismaClient } from '@prisma/client';

// Phase E seed — per-course attendance for CS201 (2024-2025 first), idempotent.
// Crafted so the report shows one banned student (>25% absence) and each warning stage.
const prisma = new PrismaClient();
const TERM = { academicYear: '2024-2025', semester: 'first' };
const SESSIONS = 20;

// absences keyed by studentCode (out of 20 sessions)
const ABSENCES: Record<string, number> = {
  '2024-107': 7, // 35% → banned (حرمان)
  '2024-103': 4, // 20% → stage 3
  '2024-104': 3, // 15% → stage 2
  '2024-101': 2, // 10% → stage 1
};

async function main() {
  const course = await prisma.course.findUnique({ where: { code: 'CS201' } });
  if (!course) throw new Error('CS201 not found');

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: course.id, academicYear: TERM.academicYear, semester: TERM.semester },
    include: { student: true },
  });

  // fresh slate for this course+term
  await prisma.attendance.deleteMany({ where: { courseId: course.id, academicYear: TERM.academicYear, semester: TERM.semester } });

  let created = 0;
  for (const e of enrollments) {
    const absent = ABSENCES[e.student.studentCode] ?? 0;
    for (let i = 0; i < SESSIONS; i++) {
      const date = new Date(2025, 1, 1 + i); // Feb 2025 + i days
      await prisma.attendance.create({
        data: {
          studentId: e.studentId,
          courseId: course.id,
          academicYear: TERM.academicYear,
          semester: TERM.semester,
          date,
          status: i < absent ? 'absent' : 'present',
        },
      });
      created++;
    }
  }
  console.log(`seeded ${created} attendance sessions for CS201 across ${enrollments.length} students`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
