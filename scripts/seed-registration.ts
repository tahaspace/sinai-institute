import { PrismaClient } from '@prisma/client';

// Phase D seed — course registration domain (idempotent).
// Creates advisor links, prerequisites, and next-term (2024-2025 second) offerings/sections.
const prisma = new PrismaClient();

const TERM = { academicYear: '2024-2025', semester: 'second' };

async function main() {
  // 1) advisor: the demo faculty advises every current student
  const advisor = await prisma.instructor.findFirst({ where: { email: 'demo.faculty@sinaiinstitute.test' } });
  if (!advisor) throw new Error('demo faculty instructor not found — run seed-student-test first');
  const students = await prisma.student.findMany({ where: { status: { notIn: ['GRADUATED'] } } });
  for (const s of students) {
    await prisma.student.update({ where: { id: s.id }, data: { advisorId: advisor.id } });
  }
  console.log(`linked ${students.length} students to advisor ${advisor.name}`);

  // 2) ensure the base courses exist + add higher-level courses to register into next term
  const base = await prisma.course.findMany({ where: { code: { in: ['CS201', 'CS202', 'CS203', 'CS204', 'MA201'] } } });
  const byCode = new Map(base.map((c) => [c.code, c]));
  const deptId = base[0]?.departmentId ?? null;

  const newCourses = [
    { code: 'CS301', nameAr: 'خوارزميات متقدمة', creditHours: 3, prereq: 'CS201' },
    { code: 'CS302', nameAr: 'نظم التشغيل', creditHours: 3, prereq: 'CS204' },
    { code: 'CS303', nameAr: 'هندسة البرمجيات', creditHours: 3, prereq: 'CS201' },
    { code: 'CS304', nameAr: 'شبكات الحاسب', creditHours: 3, prereq: 'CS204' },
    { code: 'MA202', nameAr: 'الإحصاء والاحتمالات', creditHours: 3, prereq: 'MA201' },
    { code: 'EN202', nameAr: 'اللغة الإنجليزية الفنية (2)', creditHours: 2, prereq: null, elective: true },
  ];
  for (const nc of newCourses) {
    const c = await prisma.course.upsert({
      where: { code: nc.code },
      update: {},
      create: {
        code: nc.code,
        nameAr: nc.nameAr,
        creditHours: nc.creditHours,
        departmentId: deptId,
        instructorId: advisor.id,
        requirementType: nc.elective ? 'elective' : 'mandatory',
        practicalMax: 0,
      },
    });
    byCode.set(nc.code, c);
    // prerequisite link
    if (nc.prereq && byCode.get(nc.prereq)) {
      await prisma.course.update({
        where: { id: c.id },
        data: { prerequisites: { connect: { id: byCode.get(nc.prereq)!.id } } },
      });
    }
  }
  console.log('upserted higher-level courses + prerequisite links');

  // 3) offerings + sections for the next term. Schedules are crafted so CS301 and MA202
  //    overlap on Sunday morning (time-conflict demo); CS302 sits on Monday (no conflict).
  const offerSpec: { code: string; sections: { code: string; day: string; startMin: number; endMin: number; room: string; capacity: number }[] }[] = [
    { code: 'CS301', sections: [{ code: 'ش1', day: 'sun', startMin: 540, endMin: 630, room: 'A101', capacity: 30 }] },
    { code: 'CS302', sections: [{ code: 'ش1', day: 'mon', startMin: 540, endMin: 630, room: 'A102', capacity: 30 }] },
    { code: 'CS303', sections: [{ code: 'ش1', day: 'tue', startMin: 540, endMin: 630, room: 'A103', capacity: 30 }] },
    { code: 'CS304', sections: [{ code: 'ش1', day: 'wed', startMin: 540, endMin: 630, room: 'A104', capacity: 30 }] },
    { code: 'MA202', sections: [{ code: 'ش1', day: 'sun', startMin: 600, endMin: 690, room: 'B201', capacity: 40 }] },
    { code: 'EN202', sections: [{ code: 'ش1', day: 'thu', startMin: 660, endMin: 720, room: 'C301', capacity: 50 }] },
  ];
  for (const spec of offerSpec) {
    const course = byCode.get(spec.code)!;
    const offering = await prisma.courseOffering.upsert({
      where: { courseId_academicYear_semester: { courseId: course.id, academicYear: TERM.academicYear, semester: TERM.semester } },
      update: { status: 'open' },
      create: { courseId: course.id, academicYear: TERM.academicYear, semester: TERM.semester, status: 'open' },
    });
    for (const sec of spec.sections) {
      const existing = await prisma.section.findFirst({ where: { offeringId: offering.id, code: sec.code } });
      if (!existing) {
        await prisma.section.create({
          data: { offeringId: offering.id, instructorId: advisor.id, ...sec },
        });
      }
    }
  }
  console.log('created offerings + sections for', TERM);

  const summary = {
    offerings: await prisma.courseOffering.count(),
    sections: await prisma.section.count(),
    advisees: await prisma.student.count({ where: { advisorId: advisor.id } }),
  };
  console.log('SUMMARY', summary);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
