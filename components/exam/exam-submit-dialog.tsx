"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Send, AlertTriangle, CheckCircle, Flag, Circle } from "lucide-react"

interface ExamSubmitDialogProps {
  totalQuestions: number
  answeredQuestions: number
  flaggedQuestions: number
  onSubmit: () => void
  isSubmitting?: boolean
  children?: React.ReactNode
}

export function ExamSubmitDialog({
  totalQuestions,
  answeredQuestions,
  flaggedQuestions,
  onSubmit,
  isSubmitting = false,
  children,
}: ExamSubmitDialogProps) {
  const [confirmed, setConfirmed] = useState(false)
  const unansweredQuestions = totalQuestions - answeredQuestions
  const hasUnanswered = unansweredQuestions > 0

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children || (
          <Button size="lg" className="gap-2">
            <Send className="w-5 h-5" />
            تسليم الامتحان
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasUnanswered ? (
              <>
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                تأكيد تسليم الامتحان
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6 text-green-500" />
                هل أنت متأكد من التسليم؟
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-lg font-bold block">{answeredQuestions}</span>
                  <span className="text-xs text-muted-foreground">تمت الإجابة</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 mb-1">
                    <Circle className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-lg font-bold block">{unansweredQuestions}</span>
                  <span className="text-xs text-muted-foreground">بدون إجابة</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-1">
                    <Flag className="w-4 h-4 text-yellow-600" />
                  </div>
                  <span className="text-lg font-bold block">{flaggedQuestions}</span>
                  <span className="text-xs text-muted-foreground">للمراجعة</span>
                </div>
              </div>

              {/* Warning Messages */}
              {hasUnanswered && (
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                    ⚠️ لديك <strong>{unansweredQuestions}</strong> سؤال بدون إجابة.
                    هل أنت متأكد أنك تريد التسليم؟
                  </p>
                </div>
              )}

              {flaggedQuestions > 0 && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    📌 لديك <strong>{flaggedQuestions}</strong> سؤال مُعلَّم للمراجعة.
                  </p>
                </div>
              )}

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="confirm-submit"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(!!checked)}
                />
                <Label htmlFor="confirm-submit" className="text-sm leading-relaxed cursor-pointer">
                  أؤكد أنني راجعت جميع إجاباتي وأريد تسليم الامتحان.
                  <span className="block text-muted-foreground mt-1">
                    لن تتمكن من تعديل إجاباتك بعد التسليم.
                  </span>
                </Label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>العودة للامتحان</AlertDialogCancel>
          <AlertDialogAction
            onClick={onSubmit}
            disabled={!confirmed || isSubmitting}
            className="bg-primary"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin ml-2">⏳</span>
                جاري التسليم...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 ml-2" />
                تأكيد التسليم
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ExamSubmitDialog
