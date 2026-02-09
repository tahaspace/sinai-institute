"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Coins, TrendingUp, Star, Zap } from "lucide-react"

interface PointsDisplayProps {
  totalPoints: number
  weeklyPoints?: number
  monthlyPoints?: number
  streak?: number
  className?: string
}

export function PointsDisplay({
  totalPoints,
  weeklyPoints = 0,
  monthlyPoints = 0,
  streak = 0,
  className,
}: PointsDisplayProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        {/* Main points display */}
        <div className="relative bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-white">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-4 left-4">
              <Coins className="w-24 h-24" />
            </div>
          </div>
          
          <div className="relative">
            <p className="text-sm opacity-90 mb-1">إجمالي النقاط</p>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="flex items-baseline gap-2"
            >
              <span className="text-5xl font-bold">
                {totalPoints.toLocaleString("ar-EG")}
              </span>
              <Coins className="w-8 h-8" />
            </motion.div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 divide-x divide-border rtl:divide-x-reverse">
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{weeklyPoints}</p>
            <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
          </div>

          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Star className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{monthlyPoints}</p>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </div>

          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
              <Zap className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{streak}</p>
            <p className="text-xs text-muted-foreground">يوم متواصل</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PointsDisplay
