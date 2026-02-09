"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, AlertCircle, CheckCircle, TrendingDown, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface StudentRisk {
  id: string
  name: string
  avatar?: string
  grade: string
  riskScore: number // 0-100
  riskLevel: "low" | "medium" | "high" | "critical"
  reasons: string[]
  lastActivity?: string
}

interface RiskIndicatorProps {
  students: StudentRisk[]
  title?: string
  onViewStudent?: (student: StudentRisk) => void
  className?: string
}

const riskConfig = {
  low: {
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
    icon: CheckCircle,
    label: "منخفض",
  },
  medium: {
    color: "text-yellow-600",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    icon: AlertCircle,
    label: "متوسط",
  },
  high: {
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    icon: AlertTriangle,
    label: "مرتفع",
  },
  critical: {
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/30",
    icon: TrendingDown,
    label: "حرج",
  },
}

export function RiskIndicator({
  students,
  title = "الطلاب المعرضين للخطر",
  onViewStudent,
  className,
}: RiskIndicatorProps) {
  const sortedStudents = [...students].sort((a, b) => b.riskScore - a.riskScore)

  const stats = {
    critical: students.filter((s) => s.riskLevel === "critical").length,
    high: students.filter((s) => s.riskLevel === "high").length,
    medium: students.filter((s) => s.riskLevel === "medium").length,
    low: students.filter((s) => s.riskLevel === "low").length,
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <CardTitle>{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {stats.critical > 0 && (
              <Badge variant="destructive">{stats.critical} حرج</Badge>
            )}
            {stats.high > 0 && (
              <Badge className="bg-orange-500">{stats.high} مرتفع</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Risk Summary */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {(Object.keys(stats) as Array<keyof typeof stats>).map((level) => {
            const config = riskConfig[level]
            return (
              <div
                key={level}
                className={cn("p-2 rounded-lg text-center", config.bg)}
              >
                <p className={cn("text-2xl font-bold", config.color)}>
                  {stats[level]}
                </p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            )
          })}
        </div>

        {/* Students List */}
        <div className="space-y-3">
          {sortedStudents.map((student) => {
            const config = riskConfig[student.riskLevel]
            const Icon = config.icon

            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback>
                        {student.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                      config.bg
                    )}>
                      <Icon className={cn("w-3 h-3", config.color)} />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.grade}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left w-24">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={config.color}>{config.label}</span>
                      <span>{student.riskScore}%</span>
                    </div>
                    <Progress
                      value={student.riskScore}
                      className={cn(
                        "h-1.5",
                        student.riskLevel === "critical" && "[&>div]:bg-red-500",
                        student.riskLevel === "high" && "[&>div]:bg-orange-500",
                        student.riskLevel === "medium" && "[&>div]:bg-yellow-500"
                      )}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onViewStudent?.(student)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default RiskIndicator
