import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Submit a survey/evaluation response (ClientR3 — polish). Any authenticated member can respond to
// an active survey (students rate courses/satisfaction, faculty rate satisfaction). The response
// inherits the survey's tenant; rating is a 1..5 Likert. These rows power the quality KPIs.

const RESPONDENTS = ['STUDENT', 'FACULTY'];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const { id } = await params;
    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey) return NextResponse.json({ error: 'الاستبيان غير موجود' }, { status: 404 });
    if (!survey.isActive) return NextResponse.json({ error: 'الاستبيان مغلق' }, { status: 409 });

    const body = await request.json();
    const rating = Number(body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'التقييم يجب أن يكون رقمًا من 1 إلى 5' }, { status: 400 });
    }
    const respondentType = RESPONDENTS.includes(body?.respondentType) ? body.respondentType : 'STUDENT';

    const created = await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        universityId: survey.universityId,
        respondentType,
        rating,
        comment: typeof body?.comment === 'string' ? body.comment.slice(0, 2000) : null,
        studentId: typeof body?.studentId === 'string' ? body.studentId : null,
        instructorId: typeof body?.instructorId === 'string' ? body.instructorId : null,
        courseId: typeof body?.courseId === 'string' ? body.courseId : null,
        academicYear: survey.academicYear,
        semester: survey.semester,
      },
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    console.error('Error recording survey response:', error);
    return NextResponse.json({ error: 'فشل في تسجيل الرد' }, { status: 500 });
  }
}
