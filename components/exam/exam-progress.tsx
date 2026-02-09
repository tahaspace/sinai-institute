"use client"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Circle, Flag } from "lucide-react"

interface ExamProgressProps {
  totalQuestions: number
  answeredQuestions: number
  flaggedQuestions: number
  className?: string
}

export function ExamProgress({
  totalQuestions,
  answeredQuestions,
  flaggedQuestions,
  className,
}: ExamProgressProps) {
  const progress = (answeredQuestions / totalQuestions) * 100
  const unanswered = totalQuestions - answeredQuestions

  return (
    <div className={cn("bg-card rounded-lg border p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">تقدم الامتحان</h4>
        <span className="text-sm text-muted-foreground">
          {answeredQuestions} من {totalQuestions}
        </span>
      </div>

      <Progress value={progress} className="h-3 mb-4" />

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <span className="text-lg font-bold">{answeredQuestions}</span>
          <span className="text-xs text-muted-foreground">تمت الإجابة</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800">
            <Circle className="w-5 h-5 text-gray-500" />
          </div>
          <span className="text-lg font-bold">{unanswered}</span>
          <span className="text-xs text-muted-foreground">متبقي</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <Flag className="w-5 h-5 text-yellow-600" />
          </div>
          <span className="text-lg font-bold">{flaggedQuestions}</span>
          <span className="text-xs text-muted-foreground">للمراجعة</span>
        </div>
      </div>

      {progress === 100 && (
        <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
          <span className="text-green-600 font-medium">
            🎉 أحسنت! أجبت على جميع الأسئلة
          </span>
        </div>
      )}
    </div>
  )
}

export default ExamProgress
