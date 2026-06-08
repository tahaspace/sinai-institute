import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// Platform term — mirrors DEFAULT_TERM in app/api/student/registration/route.ts:7
const DEFAULT_TERM = { academicYear: '2024-2025', semester: 'second' };

const DAY_AR: Record<string, string> = {
  sun: 'الأحد',
  mon: 'الإثنين',
  tue: 'الثلاثاء',
  wed: 'الأربعاء',
  thu: 'الخميس',
  fri: 'الجمعة',
  sat: 'السبت',
};

// Compose the schedule string from Section.day + startMin/endMin (minutes-from-midnight).
// There is NO free-text schedule column, so it is built from the real time columns.
function formatSchedule(day: string | null, startMin: number | null, endMin: number | null): string {
  if (!day || startMin == null || endMin == null) return '';
  const dayLabel = DAY_AR[day] ?? day;
  const hm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  return `${dayLabel} ${hm(startMin)}-${hm(endMin)}`;
}

interface CatalogRow {
  id: string;
  offeringId: string;
  sectionId: string;
  code: string;
  name: string;
  hours: number;
  instructor: string;
  seats: number;
  enrolled: number;
  schedule: string;
}

// GET /api/institute/registration?academicYear=&semester=&search=
// Staff-wide term overview: section-level catalog (seats/enrolled/schedule), three
// institute-wide derived stats, and the registration window from the Setting table.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('admission.registration.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear') || DEFAULT_TERM.academicYear;
    const semester = searchParams.get('semester') || DEFAULT_TERM.semester;
    const search = searchParams.get('search')?.trim() || '';

    const offeringWhere: Record<string, unknown> = { academicYear, semester };
    if (search) {
      offeringWhere.course = {
        OR: [
          { nameAr: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [offerings, periodSetting, offeredCount, registeredStudents] = await Promise.all([
      prisma.courseOffering.findMany({
        where: offeringWhere,
        include: {
          course: { select: { code: true, nameAr: true, creditHours: true, instructor: { select: { name: true } } } },
          sections: {
            include: {
              instructor: { select: { name: true } },
              _count: { select: { items: true } },
            },
            orderBy: { code: 'asc' },
          },
        },
        orderBy: { course: { code: 'asc' } },
      }),
      prisma.setting.findFirst({ where: { key: `institute.registration.${academicYear}.${semester}` } }),
      // مقررات مطروحة — offerings count for the term (unaffected by search filter)
      prisma.courseOffering.count({ where: { academicYear, semester } }),
      // طلاب مسجلين — students with a registration request for the term (real metric, no fake constant)
      prisma.student.count({ where: { registrationRequests: { some: { academicYear, semester } } } }),
    ]);

    // Flatten offerings → one catalog row per section (registration capacity lives per-section).
    const catalog: CatalogRow[] = [];
    for (const o of offerings) {
      for (const s of o.sections) {
        catalog.push({
          id: s.id,
          offeringId: o.id,
          sectionId: s.id,
          code: o.course.code,
          name: o.course.nameAr,
          hours: o.course.creditHours,
          instructor: s.instructor?.name ?? o.course.instructor?.name ?? '',
          seats: s.capacity,
          enrolled: s._count.items, // count of RegistrationItem rows for this section (all states)
          schedule: formatSchedule(s.day, s.startMin, s.endMin),
        });
      }
    }

    // متوسط الساعات — average registered credit-hours per student for the term.
    // Derived: sum(creditHours of every registered section line) / (#students with a request).
    // No backing column exists, so it is computed from real RegistrationItem joins.
    let averageHours = 0;
    if (registeredStudents > 0) {
      const items = await prisma.registrationItem.findMany({
        where: { request: { academicYear, semester } },
        select: { section: { select: { offering: { select: { course: { select: { creditHours: true } } } } } } },
      });
      const totalHours = items.reduce((sum, it) => sum + (it.section.offering.course.creditHours ?? 0), 0);
      averageHours = Math.round(totalHours / registeredStudents);
    }

    // Registration window from the Setting JSON blob (CLAUDE.md: use Setting, not localStorage).
    let period: { startDate: string; endDate: string; status: string; daysLeft: number } | null = null;
    if (periodSetting) {
      try {
        const parsed = JSON.parse(periodSetting.value) as { startDate?: string; endDate?: string; status?: string };
        const startDate = parsed.startDate ?? '';
        const endDate = parsed.endDate ?? '';
        // daysLeft is COMPUTED (endDate - today), there is no daysLeft column.
        let daysLeft = 0;
        if (endDate) {
          const end = new Date(endDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          daysLeft = Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000));
        }
        period = { startDate, endDate, status: parsed.status ?? 'closed', daysLeft };
      } catch {
        period = null;
      }
    }

    return NextResponse.json({
      term: { academicYear, semester },
      period,
      catalog,
      stats: {
        registeredStudents,
        offeredCourses: offeredCount,
        averageHours,
      },
    });
  } catch (error) {
    console.error('Error loading institute registration:', error);
    return NextResponse.json({ error: 'فشل في تحميل بيانات التسجيل' }, { status: 500 });
  }
}
