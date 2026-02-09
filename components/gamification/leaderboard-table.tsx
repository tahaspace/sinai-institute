"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Crown, TrendingUp, TrendingDown, Minus } from "lucide-react"

export interface LeaderboardEntry {
  rank: number
  previousRank?: number
  userId: string
  name: string
  avatar?: string
  points: number
  level: number
  badges: number
  isCurrentUser?: boolean
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  title?: string
  showRankChange?: boolean
  className?: string
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="w-6 h-6 text-yellow-500" />
    case 2:
      return <Medal className="w-6 h-6 text-gray-400" />
    case 3:
      return <Medal className="w-6 h-6 text-amber-600" />
    default:
      return <span className="w-6 text-center font-bold">{rank}</span>
  }
}

function getRankChange(current: number, previous?: number) {
  if (!previous) return null

  const change = previous - current

  if (change > 0) {
    return (
      <div className="flex items-center text-green-600 text-xs">
        <TrendingUp className="w-3 h-3" />
        <span>{change}</span>
      </div>
    )
  }

  if (change < 0) {
    return (
      <div className="flex items-center text-red-600 text-xs">
        <TrendingDown className="w-3 h-3" />
        <span>{Math.abs(change)}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center text-gray-400 text-xs">
      <Minus className="w-3 h-3" />
    </div>
  )
}

export function LeaderboardTable({
  entries,
  title = "لوحة المتصدرين",
  showRankChange = true,
  className,
}: LeaderboardTableProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-3 p-4 transition-colors",
                entry.isCurrentUser && "bg-primary/5",
                entry.rank <= 3 && "bg-gradient-to-r",
                entry.rank === 1 && "from-yellow-50/50 dark:from-yellow-900/10",
                entry.rank === 2 && "from-gray-50/50 dark:from-gray-800/10",
                entry.rank === 3 && "from-amber-50/50 dark:from-amber-900/10"
              )}
            >
              {/* Rank */}
              <div className="w-10 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Rank Change */}
              {showRankChange && (
                <div className="w-8">
                  {getRankChange(entry.rank, entry.previousRank)}
                </div>
              )}

              {/* User Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10 border-2 border-background shadow">
                  <AvatarImage src={entry.avatar} />
                  <AvatarFallback>
                    {entry.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    entry.isCurrentUser && "text-primary"
                  )}>
                    {entry.name}
                    {entry.isCurrentUser && " (أنت)"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      مستوى {entry.level}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.badges} شارة
                    </span>
                  </div>
                </div>
              </div>

              {/* Points */}
              <div className="text-left">
                <p className="font-bold text-lg">
                  {entry.points.toLocaleString("ar-EG")}
                </p>
                <p className="text-xs text-muted-foreground">نقطة</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default LeaderboardTable
