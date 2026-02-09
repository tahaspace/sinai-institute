"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Flag, FlagOff } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface Question {
  id: number
  type: "multiple-choice" | "true-false" | "short-answer" | "essay"
  text: string
  options?: { id: string; text: string }[]
  points: number
  image?: string
}

interface QuestionDisplayProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  isFlagged: boolean
  onToggleFlag: () => void
  children: React.ReactNode // Answer input component
  className?: string
}

const questionTypeLabels = {
  "multiple-choice": "اختيار من متعدد",
  "true-false": "صح أو خطأ",
  "short-answer": "إجابة قصيرة",
  essay: "إجابة مقالية",
}

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  isFlagged,
  onToggleFlag,
  children,
  className,
}: QuestionDisplayProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-base px-3 py-1">
              سؤال {questionNumber} من {totalQuestions}
            </Badge>
            <Badge variant="outline">{questionTypeLabels[question.type]}</Badge>
            <Badge variant="default" className="bg-primary">
              {question.points} {question.points === 1 ? "درجة" : "درجات"}
            </Badge>
          </div>
          <Button
            variant={isFlagged ? "default" : "outline"}
            size="sm"
            onClick={onToggleFlag}
            className={cn(
              isFlagged && "bg-yellow-500 hover:bg-yellow-600"
            )}
          >
            {isFlagged ? (
              <>
                <FlagOff className="w-4 h-4 ml-2" />
                إزالة العلامة
              </>
            ) : (
              <>
                <Flag className="w-4 h-4 ml-2" />
                تعليم للمراجعة
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question Text */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-lg leading-relaxed">{question.text}</p>
        </div>

        {/* Question Image if exists */}
        {question.image && (
          <div className="flex justify-center">
            <img
              src={question.image}
              alt="صورة السؤال"
              className="max-w-full max-h-80 rounded-lg border"
            />
          </div>
        )}

        {/* Answer Section */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-4 text-muted-foreground">إجابتك:</h4>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

export default QuestionDisplay
