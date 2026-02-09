"use client"

import { useState, useEffect, useCallback } from "react"
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
  type Question,
} from "@/components/exam"
import {
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  BookOpen,
} from "lucide-react"
import { toast } from "sonner"

// Mock exam data
const mockExam = {
  id: "exam-001",
  title: "امتحان منتصف الفصل - الرياضيات",
  subject: "الرياضيات",
  duration: 60, // minutes
  passingScore: 60,
  totalPoints: 100,
  questions: [
    {
      id: 1,
      type: "multiple-choice" as const,
      text: "ما هو ناتج 15 × 8؟",
      options: [
        { id: "a", text: "100" },
        { id: "b", text: "120" },
        { id: "c", text: "110" },
        { id: "d", text: "130" },
      ],
      points: 10,
    },
    {
      id: 2,
      type: "true-false" as const,
      text: "مجموع زوايا المثلث يساوي 180 درجة.",
      points: 10,
    },
    {
      id: 3,
      type: "short-answer" as const,
      text: "ما هو اسم الشكل الهندسي الذي له 6 أضلاع متساوية؟",
      points: 10,
    },
    {
      id: 4,
      type: "multiple-choice" as const,
      text: "أي من الأعداد التالية عدد أولي؟",
      options: [
        { id: "a", text: "15" },
        { id: "b", text: "21" },
        { id: "c", text: "17" },
        { id: "d", text: "27" },
      ],
      points: 10,
    },
    {
      id: 5,
      type: "essay" as const,
      text: "اشرح بالتفصيل كيفية حل معادلة من الدرجة الثانية باستخدام القانون العام. قدم مثالاً عملياً.",
      points: 20,
    },
    {
      id: 6,
      type: "true-false" as const,
      text: "الجذر التربيعي للعدد 144 يساوي 14.",
      points: 10,
    },
    {
      id: 7,
      type: "multiple-choice" as const,
      text: "ما هي مساحة مستطيل طوله 12 سم وعرضه 5 سم؟",
      options: [
        { id: "a", text: "17 سم²" },
        { id: "b", text: "60 سم²" },
        { id: "c", text: "34 سم²" },
        { id: "d", text: "50 سم²" },
      ],
      points: 10,
    },
    {
      id: 8,
      type: "short-answer" as const,
      text: "ما هي قيمة π (باي) مقربة لأقرب رقمين عشريين؟",
      points: 10,
    },
    {
      id: 9,
      type: "multiple-choice" as const,
      text: "إذا كان x + 5 = 12، فما قيمة x؟",
      options: [
        { id: "a", text: "5" },
        { id: "b", text: "7" },
        { id: "c", text: "17" },
        { id: "d", text: "12" },
      ],
      points: 5,
    },
    {
      id: 10,
      type: "true-false" as const,
      text: "كل مربع هو مستطيل.",
      points: 5,
    },
  ] as Question[],
}

type Answer = string | boolean | null

export default function TakeExamPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [examStarted, setExamStarted] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")

  const exam = mockExam
  const question = exam.questions.find((q) => q.id === currentQuestion)!

  // Calculate question statuses
  const questionStatuses: QuestionStatus[] = exam.questions.map((q) => {
    const hasAnswer = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== ""
    const isFlagged = flaggedQuestions.has(q.id)

    let status: QuestionStatus["status"] = "unanswered"
    if (hasAnswer && isFlagged) status = "answered-flagged"
    else if (hasAnswer) status = "answered"
    else if (isFlagged) status = "flagged"

    return { id: q.id, status }
  })

  const answeredCount = questionStatuses.filter(
    (q) => q.status === "answered" || q.status === "answered-flagged"
  ).length

  // Auto-save effect
  useEffect(() => {
    if (!examStarted || Object.keys(answers).length === 0) return

    setAutoSaveStatus("saving")
    const timeout = setTimeout(() => {
      // Simulate auto-save
      localStorage.setItem(`exam-${exam.id}-answers`, JSON.stringify(answers))
      setAutoSaveStatus("saved")
      setTimeout(() => setAutoSaveStatus("idle"), 2000)
    }, 1000)

    return () => clearTimeout(timeout)
  }, [answers, examStarted, exam.id])

  // Prevent leaving page
  useEffect(() => {
    if (!examStarted) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [examStarted])

  const handleAnswerChange = useCallback((questionId: number, answer: Answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }, [])

  const toggleFlag = useCallback((questionId: number) => {
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

  const handleTimeUp = useCallback(() => {
    toast.error("انتهى الوقت! جاري تسليم الامتحان تلقائياً...")
    handleSubmit()
  }, [])

  const handleTimeWarning = useCallback((minutesLeft: number) => {
    toast.warning(`تنبيه: متبقي ${minutesLeft} دقائق فقط!`)
  }, [])

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true)
    // Simulate submission
    setTimeout(() => {
      setIsSubmitting(false)
      setShowResult(true)
    }, 2000)
  }, [])

  // Result calculation (mock)
  const calculateResults = () => {
    // This would normally come from the backend
    return {
      correctAnswers: 7,
      wrongAnswers: 2,
      unansweredQuestions: 1,
      earnedPoints: 75,
      timeTaken: "45:23",
    }
  }

  if (showResult) {
    const results = calculateResults()
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <ExamResult
          examTitle={exam.title}
          totalQuestions={exam.questions.length}
          correctAnswers={results.correctAnswers}
          wrongAnswers={results.wrongAnswers}
          unansweredQuestions={results.unansweredQuestions}
          totalPoints={exam.totalPoints}
          earnedPoints={results.earnedPoints}
          timeTaken={results.timeTaken}
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
                <p className="font-medium">{exam.questions.length} سؤال</p>
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
              onClick={() => setExamStarted(true)}
            >
              بدء الامتحان
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
              <p className="text-sm text-muted-foreground">
                {autoSaveStatus === "saving" && "جاري الحفظ..."}
                {autoSaveStatus === "saved" && "✓ تم الحفظ"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ExamTimer
                initialMinutes={exam.duration}
                onTimeUp={handleTimeUp}
                onTimeWarning={handleTimeWarning}
                warningThreshold={5}
              />
              <ExamSubmitDialog
                totalQuestions={exam.questions.length}
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
              totalQuestions={exam.questions.length}
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
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <QuestionDisplay
                question={question}
                questionNumber={currentQuestion}
                totalQuestions={exam.questions.length}
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
                {currentQuestion} / {exam.questions.length}
              </span>

              <Button
                variant="outline"
                onClick={() =>
                  setCurrentQuestion((prev) => Math.min(exam.questions.length, prev + 1))
                }
                disabled={currentQuestion === exam.questions.length}
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
