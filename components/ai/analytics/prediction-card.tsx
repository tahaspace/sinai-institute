"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus, Brain, Target, AlertTriangle } from "lucide-react"

export interface Prediction {
  id: string
  studentName: string
  subject: string
  currentGrade: number
  predictedGrade: number
  confidence: number
  trend: "up" | "down" | "stable"
  riskLevel: "low" | "medium" | "high"
  factors: string[]
}

interface PredictionCardProps {
  prediction: Prediction
  onClick?: () => void
  className?: string
}

const riskColors = {
  low: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-red-100 text-red-700 border-red-200",
}

const riskLabels = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
}

export function PredictionCard({ prediction, onClick, className }: PredictionCardProps) {
  const gradeChange = prediction.predictedGrade - prediction.currentGrade
  const changePercent = Math.abs((gradeChange / prediction.currentGrade) * 100).toFixed(1)

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Card
        className={cn("cursor-pointer transition-shadow hover:shadow-md", className)}
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">{prediction.studentName}</CardTitle>
                <p className="text-xs text-muted-foreground">{prediction.subject}</p>
              </div>
            </div>
            <Badge className={cn("text-xs", riskColors[prediction.riskLevel])}>
              {prediction.riskLevel === "high" && <AlertTriangle className="w-3 h-3 ml-1" />}
              خطر {riskLabels[prediction.riskLevel]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Grade Comparison */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">الحالي</p>
              <p className="text-xl font-bold">{prediction.currentGrade}%</p>
            </div>
            <div className="flex items-center justify-center">
              {prediction.trend === "up" && (
                <TrendingUp className="w-6 h-6 text-green-600" />
              )}
              {prediction.trend === "down" && (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
              {prediction.trend === "stable" && (
                <Minus className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="p-2 rounded-lg bg-primary/5">
              <p className="text-xs text-muted-foreground">المتوقع</p>
              <p className={cn(
                "text-xl font-bold",
                gradeChange > 0 && "text-green-600",
                gradeChange < 0 && "text-red-600"
              )}>
                {prediction.predictedGrade}%
              </p>
            </div>
          </div>

          {/* Change Indicator */}
          <div className="flex items-center justify-center gap-2">
            {gradeChange !== 0 && (
              <span className={cn(
                "text-sm font-medium",
                gradeChange > 0 ? "text-green-600" : "text-red-600"
              )}>
                {gradeChange > 0 ? "+" : ""}{gradeChange}% ({changePercent}%)
              </span>
            )}
          </div>

          {/* Confidence */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">دقة التوقع</span>
              <span className="font-medium">{prediction.confidence}%</span>
            </div>
            <Progress value={prediction.confidence} className="h-1.5" />
          </div>

          {/* Factors */}
          {prediction.factors.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">العوامل المؤثرة:</p>
              <div className="flex flex-wrap gap-1">
                {prediction.factors.slice(0, 3).map((factor, index) => (
                  <Badge key={index} variant="secondary" className="text-[10px]">
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default PredictionCard
