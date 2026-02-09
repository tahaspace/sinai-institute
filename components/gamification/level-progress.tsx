"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Star, Sparkles } from "lucide-react"

interface LevelProgressProps {
  currentLevel: number
  currentXP: number
  requiredXP: number
  levelName?: string
  nextLevelName?: string
  className?: string
}

const levelNames: Record<number, string> = {
  1: "مبتدئ",
  2: "متعلم",
  3: "نشيط",
  4: "متميز",
  5: "خبير",
  6: "محترف",
  7: "أسطوري",
  8: "بطل",
  9: "أسطورة",
  10: "أيقونة",
}

export function LevelProgress({
  currentLevel,
  currentXP,
  requiredXP,
  levelName,
  nextLevelName,
  className,
}: LevelProgressProps) {
  const progress = Math.min((currentXP / requiredXP) * 100, 100)
  const currentLevelName = levelName || levelNames[currentLevel] || `مستوى ${currentLevel}`
  const nextLevel = nextLevelName || levelNames[currentLevel + 1] || `مستوى ${currentLevel + 1}`

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        {/* Level display */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <span className="text-2xl font-bold text-white">{currentLevel}</span>
              </motion.div>
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </motion.div>
            </div>
            <div>
              <p className="font-bold text-lg">{currentLevelName}</p>
              <p className="text-sm text-muted-foreground">
                {currentXP.toLocaleString("ar-EG")} / {requiredXP.toLocaleString("ar-EG")} XP
              </p>
            </div>
          </div>

          <div className="text-left">
            <p className="text-xs text-muted-foreground">المستوى التالي</p>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">{nextLevel}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          
          {/* Progress percentage */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 text-xs font-bold text-white"
            style={{ right: `calc(${Math.max(progress - 5, 5)}% - 10px)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(progress)}%
          </motion.div>
        </div>

        {/* XP needed */}
        <p className="text-xs text-center text-muted-foreground mt-2">
          يحتاج <span className="font-bold text-primary">{(requiredXP - currentXP).toLocaleString("ar-EG")}</span> XP للمستوى التالي
        </p>
      </CardContent>
    </Card>
  )
}

export default LevelProgress
