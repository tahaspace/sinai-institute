"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Clock, AlertTriangle } from "lucide-react"

interface ExamTimerProps {
  initialMinutes: number
  onTimeUp: () => void
  onTimeWarning?: (minutesLeft: number) => void
  warningThreshold?: number // minutes before showing warning
  className?: string
}

export function ExamTimer({
  initialMinutes,
  onTimeUp,
  onTimeWarning,
  warningThreshold = 5,
  className,
}: ExamTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60) // Convert to seconds
  const [isWarning, setIsWarning] = useState(false)
  const [isPulsing, setIsPulsing] = useState(false)

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }, [])

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp()
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1
        
        // Check for warning threshold
        if (newTime === warningThreshold * 60) {
          setIsWarning(true)
          onTimeWarning?.(warningThreshold)
        }

        // Pulse animation for last minute
        if (newTime <= 60 && newTime % 1 === 0) {
          setIsPulsing(true)
          setTimeout(() => setIsPulsing(false), 200)
        }

        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeLeft, warningThreshold, onTimeUp, onTimeWarning])

  const percentage = (timeLeft / (initialMinutes * 60)) * 100

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-lg border",
        isWarning
          ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
          : "bg-card",
        className
      )}
    >
      <div className="relative">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - percentage / 100)}`}
            className={cn(
              "transition-all duration-1000",
              isWarning ? "text-red-500" : "text-primary"
            )}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isWarning ? (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          ) : (
            <Clock className="w-5 h-5 text-primary" />
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">الوقت المتبقي</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={timeLeft}
            initial={isPulsing ? { scale: 1.1 } : { scale: 1 }}
            animate={{ scale: 1 }}
            className={cn(
              "text-lg font-bold font-mono",
              isWarning ? "text-red-600" : "text-foreground"
            )}
          >
            {formatTime(timeLeft)}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ExamTimer
