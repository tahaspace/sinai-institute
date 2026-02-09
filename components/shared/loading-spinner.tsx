"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  text?: string
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <motion.div
        className={cn(
          "border-4 border-muted border-t-primary rounded-full",
          sizeClasses[size]
        )}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  )
}

// Full page loading
export function PageLoading() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <LoadingSpinner size="xl" text="جاري التحميل..." />
    </div>
  )
}

// Skeleton loader
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("bg-muted rounded-md", className)}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  )
}

