"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Flag, Check, Circle } from "lucide-react"

export interface QuestionStatus {
  id: number
  status: "unanswered" | "answered" | "flagged" | "answered-flagged"
}

interface QuestionNavigatorProps {
  questions: QuestionStatus[]
  currentQuestion: number
  onQuestionSelect: (questionId: number) => void
  className?: string
}

export function QuestionNavigator({
  questions,
  currentQuestion,
  onQuestionSelect,
  className,
}: QuestionNavigatorProps) {
  const stats = {
    total: questions.length,
    answered: questions.filter((q) => q.status === "answered" || q.status === "answered-flagged").length,
    flagged: questions.filter((q) => q.status === "flagged" || q.status === "answered-flagged").length,
    unanswered: questions.filter((q) => q.status === "unanswered").length,
  }

  const getStatusStyle = (status: QuestionStatus["status"], isCurrent: boolean) => {
    const base = "relative transition-all duration-200"
    
    if (isCurrent) {
      return cn(base, "ring-2 ring-primary ring-offset-2")
    }

    switch (status) {
      case "answered":
        return cn(base, "bg-green-500 text-white hover:bg-green-600")
      case "flagged":
        return cn(base, "bg-yellow-500 text-white hover:bg-yellow-600")
      case "answered-flagged":
        return cn(base, "bg-green-500 text-white hover:bg-green-600")
      default:
        return cn(base, "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600")
    }
  }

  const getStatusIcon = (status: QuestionStatus["status"]) => {
    switch (status) {
      case "answered":
        return <Check className="w-3 h-3" />
      case "flagged":
        return <Flag className="w-3 h-3" />
      case "answered-flagged":
        return (
          <>
            <Check className="w-3 h-3" />
            <Flag className="w-2 h-2 absolute -top-1 -right-1 text-yellow-400" />
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className={cn("bg-card rounded-lg border p-4", className)}>
      <h3 className="font-medium mb-4">الأسئلة</h3>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>تمت الإجابة: {stats.answered}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>مُعلَّم: {stats.flagged}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-300" />
          <span>بدون إجابة: {stats.unanswered}</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="w-3 h-3 text-primary" />
          <span>الإجمالي: {stats.total}</span>
        </div>
      </div>

      {/* Question Grid */}
      <ScrollArea className="h-[300px]">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((question) => (
            <Button
              key={question.id}
              variant="ghost"
              size="icon"
              className={cn(
                "w-10 h-10 text-sm font-medium",
                getStatusStyle(question.status, currentQuestion === question.id)
              )}
              onClick={() => onQuestionSelect(question.id)}
            >
              {question.id}
              <span className="absolute top-0 right-0">
                {getStatusIcon(question.status)}
              </span>
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>التقدم: {Math.round((stats.answered / stats.total) * 100)}%</span>
          <span>
            {stats.answered}/{stats.total}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${(stats.answered / stats.total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default QuestionNavigator
