"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  ArrowLeft,
  Download,
  Share2,
} from "lucide-react"

interface ExamResultProps {
  examTitle: string
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  unansweredQuestions: number
  totalPoints: number
  earnedPoints: number
  timeTaken: string // formatted time
  passingScore: number // percentage
  onReviewAnswers?: () => void
  onBackToDashboard?: () => void
  className?: string
}

export function ExamResult({
  examTitle,
  totalQuestions,
  correctAnswers,
  wrongAnswers,
  unansweredQuestions,
  totalPoints,
  earnedPoints,
  timeTaken,
  passingScore,
  onReviewAnswers,
  onBackToDashboard,
  className,
}: ExamResultProps) {
  const percentage = Math.round((earnedPoints / totalPoints) * 100)
  const passed = percentage >= passingScore

  const getGrade = (pct: number) => {
    if (pct >= 90) return { grade: "ممتاز", color: "text-green-600" }
    if (pct >= 80) return { grade: "جيد جداً", color: "text-blue-600" }
    if (pct >= 70) return { grade: "جيد", color: "text-cyan-600" }
    if (pct >= 60) return { grade: "مقبول", color: "text-yellow-600" }
    return { grade: "ضعيف", color: "text-red-600" }
  }

  const { grade, color } = getGrade(percentage)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn("max-w-2xl mx-auto", className)}
    >
      <Card>
        <CardHeader className="text-center pb-2">
          {/* Result Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto mb-4"
          >
            {passed ? (
              <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Trophy className="w-12 h-12 text-green-600" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Target className="w-12 h-12 text-red-600" />
              </div>
            )}
          </motion.div>

          <CardTitle className="text-2xl">{examTitle}</CardTitle>
          <p className="text-muted-foreground">
            {passed ? "🎉 تهانينا! لقد نجحت في الامتحان" : "حاول مرة أخرى"}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center p-6 bg-muted rounded-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className={cn("text-6xl font-bold", color)}>{percentage}%</span>
              <p className={cn("text-xl font-medium mt-2", color)}>{grade}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {earnedPoints} من {totalPoints} درجة
              </p>
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>درجة النجاح: {passingScore}%</span>
              <span>درجتك: {percentage}%</span>
            </div>
            <div className="relative">
              <Progress value={percentage} className="h-4" />
              <div
                className="absolute top-0 h-4 border-r-2 border-dashed border-gray-500"
                style={{ right: `${100 - passingScore}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <span className="text-2xl font-bold text-green-600">{correctAnswers}</span>
              <p className="text-xs text-muted-foreground">إجابة صحيحة</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <span className="text-2xl font-bold text-red-600">{wrongAnswers}</span>
              <p className="text-xs text-muted-foreground">إجابة خاطئة</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Target className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <span className="text-2xl font-bold">{unansweredQuestions}</span>
              <p className="text-xs text-muted-foreground">بدون إجابة</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <span className="text-2xl font-bold text-blue-600">{timeTaken}</span>
              <p className="text-xs text-muted-foreground">الوقت المستغرق</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {onReviewAnswers && (
              <Button variant="outline" className="flex-1" onClick={onReviewAnswers}>
                <CheckCircle className="w-4 h-4 ml-2" />
                مراجعة الإجابات
              </Button>
            )}
            <Button variant="outline" className="flex-1">
              <Download className="w-4 h-4 ml-2" />
              تحميل النتيجة
            </Button>
            <Button variant="outline" className="flex-1">
              <Share2 className="w-4 h-4 ml-2" />
              مشاركة
            </Button>
          </div>

          {onBackToDashboard && (
            <Button className="w-full" onClick={onBackToDashboard}>
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للوحة التحكم
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default ExamResult
