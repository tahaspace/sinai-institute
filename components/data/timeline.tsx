"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { CheckCircle, Circle, Clock, AlertCircle } from "lucide-react"

export interface TimelineItem {
  id: string
  title: string
  description?: string
  date?: string
  time?: string
  icon?: React.ReactNode
  status?: "completed" | "current" | "pending" | "error"
  color?: string
}

interface TimelineProps {
  items: TimelineItem[]
  orientation?: "vertical" | "horizontal"
  showConnector?: boolean
  animated?: boolean
  className?: string
}

const statusIcons = {
  completed: <CheckCircle className="h-5 w-5 text-green-500" />,
  current: <Clock className="h-5 w-5 text-blue-500" />,
  pending: <Circle className="h-5 w-5 text-gray-400" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
}

const statusColors = {
  completed: "bg-green-500",
  current: "bg-blue-500",
  pending: "bg-gray-300",
  error: "bg-red-500",
}

export function Timeline({
  items,
  orientation = "vertical",
  showConnector = true,
  animated = true,
  className,
}: TimelineProps) {
  if (orientation === "horizontal") {
    return (
      <div className={cn("flex items-start overflow-x-auto pb-4", className)}>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={animated ? { opacity: 0, x: -20 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col items-center min-w-[150px] px-4"
          >
            {/* Icon */}
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2",
                item.status === "completed" && "border-green-500 bg-green-50",
                item.status === "current" && "border-blue-500 bg-blue-50",
                item.status === "pending" && "border-gray-300 bg-gray-50",
                item.status === "error" && "border-red-500 bg-red-50",
                !item.status && "border-primary bg-primary/10"
              )}
            >
              {item.icon || statusIcons[item.status || "pending"]}
            </div>

            {/* Connector */}
            {showConnector && index < items.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-full mt-5 absolute right-0 transform translate-x-1/2",
                  statusColors[item.status || "pending"]
                )}
                style={{ width: "calc(100% - 40px)", marginTop: "20px" }}
              />
            )}

            {/* Content */}
            <div className="mt-3 text-center">
              <h4 className="font-medium text-sm">{item.title}</h4>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              )}
              {(item.date || item.time) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.date} {item.time && `- ${item.time}`}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={animated ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex gap-4 mb-6 last:mb-0"
        >
          {/* Timeline indicator */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0",
                item.status === "completed" && "border-green-500 bg-green-50",
                item.status === "current" && "border-blue-500 bg-blue-50",
                item.status === "pending" && "border-gray-300 bg-gray-50",
                item.status === "error" && "border-red-500 bg-red-50",
                !item.status && "border-primary bg-primary/10"
              )}
            >
              {item.icon || statusIcons[item.status || "pending"]}
            </div>
            {showConnector && index < items.length - 1 && (
              <div
                className={cn(
                  "w-0.5 flex-1 min-h-[24px]",
                  statusColors[item.status || "pending"]
                )}
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{item.title}</h4>
              {(item.date || item.time) && (
                <span className="text-sm text-muted-foreground">
                  {item.date} {item.time && `- ${item.time}`}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default Timeline
