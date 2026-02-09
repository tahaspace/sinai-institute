"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Lock, Check } from "lucide-react"

export interface BadgeData {
  id: string
  name: string
  description: string
  icon: string
  category: "academic" | "attendance" | "activity" | "social" | "special"
  rarity: "common" | "rare" | "epic" | "legendary"
  earnedAt?: string
  progress?: number
  requirement?: string
}

interface BadgeCardProps {
  badge: BadgeData
  onClick?: () => void
  className?: string
}

const rarityColors = {
  common: "from-gray-400 to-gray-500",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-yellow-400 to-orange-500",
}

const rarityLabels = {
  common: "عادية",
  rare: "نادرة",
  epic: "ملحمية",
  legendary: "أسطورية",
}

const categoryLabels = {
  academic: "أكاديمي",
  attendance: "الحضور",
  activity: "النشاط",
  social: "اجتماعي",
  special: "خاص",
}

export function BadgeCard({ badge, onClick, className }: BadgeCardProps) {
  const isEarned = !!badge.earnedAt
  const progress = badge.progress ?? 0

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all overflow-hidden",
          !isEarned && "opacity-60",
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Badge Icon */}
          <div className="relative mb-3">
            <div
              className={cn(
                "w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl",
                "bg-gradient-to-br shadow-lg",
                rarityColors[badge.rarity]
              )}
            >
              {isEarned ? (
                <span>{badge.icon}</span>
              ) : (
                <Lock className="w-8 h-8 text-white/50" />
              )}
            </div>

            {/* Earned checkmark */}
            {isEarned && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Badge Info */}
          <div className="text-center">
            <h4 className="font-bold text-sm mb-1">{badge.name}</h4>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {badge.description}
            </p>

            {/* Badges */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  badge.rarity === "legendary" && "border-yellow-500 text-yellow-600",
                  badge.rarity === "epic" && "border-purple-500 text-purple-600",
                  badge.rarity === "rare" && "border-blue-500 text-blue-600"
                )}
              >
                {rarityLabels[badge.rarity]}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {categoryLabels[badge.category]}
              </Badge>
            </div>

            {/* Progress or date */}
            {isEarned ? (
              <p className="text-xs text-green-600">
                ✓ حصلت عليها في {badge.earnedAt}
              </p>
            ) : (
              <>
                {badge.requirement && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {badge.requirement}
                  </p>
                )}
                <Progress value={progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">
                  {progress}% مكتمل
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default BadgeCard
