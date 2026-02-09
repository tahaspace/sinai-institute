"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Lightbulb,
  BookOpen,
  Video,
  FileText,
  Clock,
  ArrowLeft,
  Star,
  Target,
} from "lucide-react"

export interface Recommendation {
  id: string
  type: "lesson" | "video" | "exercise" | "quiz" | "tip"
  title: string
  description: string
  subject?: string
  duration?: string
  difficulty?: "easy" | "medium" | "hard"
  matchScore: number // How well it matches student needs (0-100)
  reason: string
}

interface RecommendationsListProps {
  recommendations: Recommendation[]
  title?: string
  onRecommendationClick?: (recommendation: Recommendation) => void
  className?: string
}

const typeConfig = {
  lesson: { icon: BookOpen, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", label: "درس" },
  video: { icon: Video, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", label: "فيديو" },
  exercise: { icon: FileText, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", label: "تمرين" },
  quiz: { icon: Target, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", label: "اختبار" },
  tip: { icon: Lightbulb, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30", label: "نصيحة" },
}

const difficultyLabels = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
}

export function RecommendationsList({
  recommendations,
  title = "التوصيات الذكية",
  onRecommendationClick,
  className,
}: RecommendationsListProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              توصيات مخصصة بناءً على أدائك
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {recommendations.map((rec, index) => {
            const config = typeConfig[rec.type]
            const Icon = config.icon

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer"
                onClick={() => onRecommendationClick?.(rec)}
              >
                {/* Match Score Indicator */}
                <div
                  className="absolute top-0 right-0 w-1 h-full rounded-r-xl"
                  style={{
                    background: `linear-gradient(to bottom, hsl(var(--primary)) ${rec.matchScore}%, transparent ${rec.matchScore}%)`,
                  }}
                />

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                    <Icon className={cn("w-6 h-6", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{rec.title}</h4>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {config.label}
                      </Badge>
                      {rec.subject && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {rec.subject}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {rec.description}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {rec.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {rec.duration}
                        </span>
                      )}
                      {rec.difficulty && (
                        <span>{difficultyLabels[rec.difficulty]}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        تطابق {rec.matchScore}%
                      </span>
                    </div>

                    {/* Reason */}
                    <p className="text-xs text-primary mt-2">
                      💡 {rec.reason}
                    </p>
                  </div>

                  {/* Arrow */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default RecommendationsList
