"use client"

import { useState, useEffect, useCallback, use } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ExamTimer,
  QuestionNavigator,
  QuestionDisplay,
  MultipleChoiceInput,
  TrueFalseInput,
  ShortAnswerInput,
  EssayInput,
  ExamProgress,
  ExamSubmitDialog,
  ExamResult,
  type QuestionStatus,
} from "@/components/exam"
import {
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  BookOpen,
} from "lucide-react"
import { toast } from "sonner"

// Shape returned by GET /api/lms/exams/[id]/take. Question ids are real cuid
// strings (answers/flags are keyed by these); the exam components only accept
// numeric ids, so the UI keys those by 1-based position instead.
interface ApiOption {
  id: string
  text: string
}
interface ApiQuestion {
  id: string
  type: "multiple-choice" | "true-false" | "short-answer" | "essay"
  text: string
  points: number
  options?: ApiOption[]
}
interface ApiExam {
  id: string
  title: string
  subject: string
  duration: number
  passingScore: number
  totalPoints: number
  questions: ApiQuestion[]
}
interface SubmitResult {
  correctAnswers: number
  wrongAnswers: number
  unansweredQuestions: number
  earnedPoints: number
  timeTakenSecs: number | null
}

type Answer = string | boolean | null

function formatDuration(secs: number | null): string {
  if (secs == null || secs < 0) return "--:--"
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function TakeExamPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: examId } = use(params)

  // Fetched exam state
  const [exam, setExam] = useState<ApiExam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sitting state. currentQuestion is a 1-based index (matches the navigator/
  // display components which require numeric ids). answers/flagged are keyed by
  // the real cuid question id.
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [examStarted, setExamStarted] = useState(false)
  const [startedAt, setStartedAt] = useState<string | null>(null)

  // Load the exam (meta + questions + options, no answer key) on mount.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/lms/exams/${examId}/take`)
        if (!res.ok) throw new Error("فشل تحميل الامتحان")
        const json = await res.json()
        if (!cancelled) setExam((json.exam as ApiExam) ?? null)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [examId])

  const questions = exam?.questions ?? []
  const totalQuestions = questions.length
  const question = questions[currentQuestion - 1]

  // Per-question status keyed by 1-based position so the navigator (numeric ids)
  // works while answers/flags stay keyed by the real cuid.
  const questionStatuses: QuestionStatus[] = questions.map((q, idx) => {
    const a = answers[q.id]
    const hasAnswer = a !== undefined && a !== null && a !== ""
    const isFlagged = flaggedQuestions.has(q.id)

    let status: QuestionStatus["status"] = "unanswered"
    if (hasAnswer && isFlagged) status = "answered-flagged"
    else if (hasAnswer) status = "answered"
    else if (isFlagged) status = "flagged"

    return { id: idx + 1, status }
  })

  const answeredCount = questionStatuses.filter(
    (q) => q.status === "answered" || q.status === "answered-flagged"
  ).length

  // Prevent leaving page mid-exam
  useEffect(() => {
    if (!examStarted) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [examStarted])

  const handleAnswerChange = useCallback((questionId: string, answer: Answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }, [])

  const toggleFlag = useCallback((questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) {
        next.delete(questionId)
      } else {
        next.add(questionId)
      }
      return next
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!exam) return
    setIsSubmitting(true)
    try {
      const payload = {
        startedAt,
        answers: exam.questions.map((q) => {
          const a = answers[q.id]
          if (q.type === "multiple-choice") {
            return { questionId: q.id, selectedOptionId: typeof a === "string" ? a : null }
          }
          if (q.type === "true-false") {
            return { questionId: q.id, boolAnswer: typeof a === "boolean" ? a : null }
          }
          return { questionId: q.id, answerText: typeof a === "string" ? a : null }
        }),
      }
      const res = await fetch(`/api/lms/exams/${exam.id}/take`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("فشل تسليم الامتحان")
      const json = await res.json()
      setResult(json.result as SubmitResult)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }, [exam, answers, startedAt])

  const handleTimeUp = useCallback(() => {
    toast.error("انتهى الوقت! جاري تسليم الامتحان تلقائياً...")
    handleSubmit()
  }, [handleSubmit])

  const handleTimeWarning = useCallback((minutesLeft: number) => {
    toast.warning(`تنبيه: متبقي ${minutesLeft} دقائق فقط!`)
  }, [])

  // Loading / error gates
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <p className="text-muted-foreground">جارٍ التحميل...</p>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-red-200 dark:border-red-800">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-xl">تعذر تحميل الامتحان</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">{error ?? "الامتحان غير موجود"}</p>
            <Button onClick={() => router.push("/lms/dashboard")} className="w-full">
              العودة للوحة التحكم
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <ExamResult
          examTitle={exam.title}
          totalQuestions={totalQuestions}
          correctAnswers={result.correctAnswers}
          wrongAnswers={result.wrongAnswers}
          unansweredQuestions={result.unansweredQuestions}
          totalPoints={exam.totalPoints}
          earnedPoints={result.earnedPoints}
          timeTaken={formatDuration(result.timeTakenSecs)}
          passingScore={exam.passingScore}
          onBackToDashboard={() => router.push("/lms/dashboard")}
        />
      </div>
    )
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{exam.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">المادة:</span>
                <p className="font-medium">{exam.subject}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">المدة:</span>
                <p className="font-medium">{exam.duration} دقيقة</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">عدد الأسئلة:</span>
                <p className="font-medium">{totalQuestions} سؤال</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">درجة النجاح:</span>
                <p className="font-medium">{exam.passingScore}%</p>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium mb-2">تعليمات هامة:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>تأكد من اتصالك بالإنترنت قبل البدء</li>
                    <li>لا تغلق النافذة أثناء الامتحان</li>
                    <li>يتم حفظ إجاباتك تلقائياً</li>
                    <li>سينتهي الامتحان تلقائياً عند انتهاء الوقت</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              disabled={totalQuestions === 0}
              onClick={() => {
                setStartedAt(new Date().toISOString())
                setExamStarted(true)
              }}
            >
              {totalQuestions === 0 ? "لا توجد أسئلة" : "بدء الامتحان"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-950 border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg">{exam.title}</h1>
              <p className="text-sm text-muted-foreground">{exam.subject}</p>
            </div>
            <div className="flex items-center gap-4">
              <ExamTimer
                initialMinutes={exam.duration}
                onTimeUp={handleTimeUp}
                onTimeWarning={handleTimeWarning}
                warningThreshold={5}
              />
              <ExamSubmitDialog
                totalQuestions={totalQuestions}
                answeredQuestions={answeredCount}
                flaggedQuestions={flaggedQuestions.size}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigator - Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <ExamProgress
              totalQuestions={totalQuestions}
              answeredQuestions={answeredCount}
              flaggedQuestions={flaggedQuestions.size}
            />
            <QuestionNavigator
              questions={questionStatuses}
              currentQuestion={currentQuestion}
              onQuestionSelect={setCurrentQuestion}
            />
          </div>

          {/* Question Display */}
          <div className="lg:col-span-3">
            {question && (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <QuestionDisplay
                  question={{
                    id: currentQuestion,
                    type: question.type,
                    text: question.text,
                    options: question.options,
                    points: question.points,
                  }}
                  questionNumber={currentQuestion}
                  totalQuestions={totalQuestions}
                  isFlagged={flaggedQuestions.has(question.id)}
                  onToggleFlag={() => toggleFlag(question.id)}
                >
                  {/* Render appropriate input based on question type */}
                  {question.type === "multiple-choice" && question.options && (
                    <MultipleChoiceInput
                      options={question.options}
                      value={answers[question.id] as string | null}
                      onChange={(value) => handleAnswerChange(question.id, value)}
                    />
                  )}
                  {question.type === "true-false" && (
                    <TrueFalseInput
                      value={answers[question.id] as boolean | null}
                      onChange={(value) => handleAnswerChange(question.id, value)}
                    />
                  )}
                  {question.type === "short-answer" && (
                    <ShortAnswerInput
                      value={(answers[question.id] as string) || ""}
                      onChange={(value) => handleAnswerChange(question.id, value)}
                    />
                  )}
                  {question.type === "essay" && (
                    <EssayInput
                      value={(answers[question.id] as string) || ""}
                      onChange={(value) => handleAnswerChange(question.id, value)}
                    />
                  )}
                </QuestionDisplay>
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion((prev) => Math.max(1, prev - 1))}
                disabled={currentQuestion === 1}
              >
                <ChevronRight className="w-4 h-4 ml-2" />
                السؤال السابق
              </Button>

              <span className="text-sm text-muted-foreground">
                {currentQuestion} / {totalQuestions}
              </span>

              <Button
                variant="outline"
                onClick={() =>
                  setCurrentQuestion((prev) => Math.min(totalQuestions, prev + 1))
                }
                disabled={currentQuestion === totalQuestions}
              >
                السؤال التالي
                <ChevronLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
