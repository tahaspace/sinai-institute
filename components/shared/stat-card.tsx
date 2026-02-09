"use client"

import { motion } from "framer-motion"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: "primary" | "secondary" | "accent" | "success" | "warning" | "destructive"
  className?: string
}

const colorStyles = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    icon: "bg-primary",
  },
  secondary: {
    bg: "bg-secondary/10",
    text: "text-secondary",
    icon: "bg-secondary",
  },
  accent: {
    bg: "bg-accent/10",
    text: "text-accent",
    icon: "bg-accent",
  },
  success: {
    bg: "bg-green-500/10",
    text: "text-green-600",
    icon: "bg-green-500",
  },
  warning: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-600",
    icon: "bg-yellow-500",
  },
  destructive: {
    bg: "bg-red-500/10",
    text: "text-red-600",
    icon: "bg-red-500",
  },
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = "primary",
  className,
}: StatCardProps) {
  const styles = colorStyles[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold">{value}</h3>
                {trend && (
                  <span
                    className={cn(
                      "flex items-center text-sm font-medium",
                      trend.isPositive ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {trend.isPositive ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    {trend.value}%
                  </span>
                )}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                styles.icon
              )}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

