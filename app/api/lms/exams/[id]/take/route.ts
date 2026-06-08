import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession, resolveStudent } from '@/lib/student';

// Maps the stored ExamQuestion.type to the UI question-type union the
// exam components understand. The schema documents mcq | essay | truefalse | short.
function toUiType(t: string): 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' {
  switch (t) {
    case 'mcq':
      return 'multiple-choice';
    case 'truefalse':
      return 'true-false';
    case 'short':
      return 'short-answer';
    default:
      return 'essay';
  }
}

// Shapes returned to the client. NOTE: option.isCorrect and question.correctAnswer
// are deliberately NOT part of these types — the answer key never leaves the server.
interface ApiOption {
  id: string;
  text: string;
}
interface ApiQuestion {
  id: string; // real cuid
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  text: string;
  points: number;
  options?: ApiOption[];
}
interface ApiExam {
  id: string;
  title: string;
  subject: string;
  duration: number; // minutes
  passingScore: number; // percentage
  totalPoints: number;
  questions: ApiQuestion[];
}

// GET /api/lms/exams/[id]/take — exam meta + questions + MCQ options.
// Never returns isCorrect / correctAnswer (would leak the answer key in the
// network tab). Auto-grading lives entirely in POST.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireSession();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { id } = await params;

    const session = await prisma.examSession.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!session) return NextResponse.json({ error: 'الامتحان غير موجود' }, { status: 404 });

    const questions = await prisma.examQuestion.findMany({
      where: { courseId: session.courseId },
      include: { options: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });

    const apiQuestions: ApiQuestion[] = questions.map((q) => {
      const uiType = toUiType(q.type);
      const base: ApiQuestion = {
        id: q.id,
        type: uiType,
        text: q.text,
        points: q.points,
      };
      if (uiType === 'multiple-choice') {
        base.options = q.options.map((o) => ({ id: o.id, text: o.text }));
      }
      return base;
    });

    // Prefer the explicit cached total; otherwise sum the question points.
    const summed = questions.reduce((acc, q) => acc + q.points, 0);
    const totalPoints = session.totalPoints ?? summed;

    const exam: ApiExam = {
      id: session.id,
      title: session.title ?? `امتحان ${session.course.nameAr}`,
      subject: session.course.nameAr,
      duration: session.durationMins,
      passingScore: session.passingScore,
      totalPoints,
      questions: apiQuestions,
    };

    return NextResponse.json({ exam });
  } catch (error) {
    console.error('Error loading exam to take:', error);
    return NextResponse.json({ error: 'فشل تحميل الامتحان' }, { status: 500 });
  }
}

// A single submitted answer from the client. selectedOptionId for MCQ,
// boolAnswer for true/false, answerText for short-answer/essay.
interface SubmittedAnswer {
  questionId: string;
  selectedOptionId?: string | null;
  boolAnswer?: boolean | null;
  answerText?: string | null;
}

// POST /api/lms/exams/[id]/take — submit answers, auto-grade, persist the
// attempt + per-question answers, and return the computed result.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireSession();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { id } = await params;

    const student = await resolveStudent();
    if (!student) {
      // requireSession passed (some staff/faculty session) but there is no
      // linked Student row to own the attempt — only students sit exams.
      return NextResponse.json({ error: 'لا يوجد طالب مرتبط بهذه الجلسة' }, { status: 403 });
    }

    const body = (await request.json()) as {
      answers?: SubmittedAnswer[];
      startedAt?: string | null;
    };
    const submitted = Array.isArray(body.answers) ? body.answers : [];

    const session = await prisma.examSession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: 'الامتحان غير موجود' }, { status: 404 });

    const questions = await prisma.examQuestion.findMany({
      where: { courseId: session.courseId },
      include: { options: true },
    });

    const byQuestion = new Map(submitted.map((a) => [a.questionId, a]));

    let earnedPoints = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const answerRows = questions.map((q) => {
      const ans = byQuestion.get(q.id);
      const uiType = toUiType(q.type);

      // Determine whether the student actually answered this question.
      const answered =
        !!ans &&
        ((uiType === 'multiple-choice' && !!ans.selectedOptionId) ||
          (uiType === 'true-false' && typeof ans.boolAnswer === 'boolean') ||
          ((uiType === 'short-answer' || uiType === 'essay') &&
            typeof ans.answerText === 'string' &&
            ans.answerText.trim().length > 0));

      if (!answered) unansweredCount += 1;

      let isCorrect: boolean | null = null;
      let awardedPoints: number | null = null;

      if (uiType === 'multiple-choice') {
        // Gradeable only when the question has options. Compare against the
        // option flagged isCorrect — that flag never reaches the client.
        if (q.options.length > 0) {
          const chosen = q.options.find((o) => o.id === ans?.selectedOptionId);
          isCorrect = !!chosen?.isCorrect;
          awardedPoints = isCorrect ? q.points : 0;
        }
      } else if (uiType === 'true-false') {
        // correctAnswer is stored as the string "true"/"false".
        if (q.correctAnswer != null && typeof ans?.boolAnswer === 'boolean') {
          isCorrect = String(ans.boolAnswer) === q.correctAnswer;
          awardedPoints = isCorrect ? q.points : 0;
        }
      }
      // short-answer / essay (and ungradeable MCQ/TF) are left for manual review:
      // isCorrect stays null, awardedPoints stays null, not counted right/wrong.

      if (isCorrect === true) {
        correctCount += 1;
        earnedPoints += awardedPoints ?? 0;
      } else if (isCorrect === false) {
        wrongCount += 1;
      }

      return {
        questionId: q.id,
        answerText: ans?.answerText ?? null,
        selectedOptionId: ans?.selectedOptionId ?? null,
        boolAnswer: typeof ans?.boolAnswer === 'boolean' ? ans.boolAnswer : null,
        isCorrect,
        awardedPoints,
      };
    });

    // timeTaken: from the client-provided start (when valid) to now.
    const now = new Date();
    let timeTakenSecs: number | null = null;
    if (body.startedAt) {
      const startedAt = new Date(body.startedAt);
      if (!Number.isNaN(startedAt.getTime())) {
        timeTakenSecs = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));
      }
    }

    // One attempt per (student, session) — upsert + replace its answers so a
    // resubmit overwrites rather than duplicating.
    const attempt = await prisma.examAttempt.upsert({
      where: { examSessionId_studentId: { examSessionId: session.id, studentId: student.id } },
      create: {
        examSessionId: session.id,
        studentId: student.id,
        status: 'submitted',
        submittedAt: now,
        earnedPoints,
        correctCount,
        wrongCount,
        unansweredCount,
        timeTakenSecs,
      },
      update: {
        status: 'submitted',
        submittedAt: now,
        earnedPoints,
        correctCount,
        wrongCount,
        unansweredCount,
        timeTakenSecs,
      },
    });

    await prisma.examAnswer.deleteMany({ where: { attemptId: attempt.id } });
    if (answerRows.length > 0) {
      await prisma.examAnswer.createMany({
        data: answerRows.map((r) => ({ attemptId: attempt.id, ...r })),
      });
    }

    return NextResponse.json({
      result: {
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        unansweredQuestions: unansweredCount,
        earnedPoints,
        timeTakenSecs,
      },
    });
  } catch (error) {
    console.error('Error submitting exam:', error);
    return NextResponse.json({ error: 'فشل تسليم الامتحان' }, { status: 500 });
  }
}
