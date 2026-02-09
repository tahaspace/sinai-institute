"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface WatermarkOverlayProps {
  text?: string
  type?: "text" | "logo" | "user-info"
  position?: "center" | "corner" | "tile"
  opacity?: number
  className?: string
  userId?: string
  userName?: string
}

export function WatermarkOverlay({
  text = "محمي بحقوق الملكية",
  type = "text",
  position = "tile",
  opacity = 0.1,
  className,
  userId,
  userName,
}: WatermarkOverlayProps) {
  const [timestamp, setTimestamp] = useState("")

  useEffect(() => {
    setTimestamp(new Date().toLocaleString("ar-EG"))
  }, [])

  const getDisplayText = () => {
    switch (type) {
      case "user-info":
        return `${userName || "مستخدم"} | ${userId || "ID"} | ${timestamp}`
      case "logo":
        return "🎓 EduSaas"
      default:
        return text
    }
  }

  const getPositionStyles = () => {
    switch (position) {
      case "center":
        return "items-center justify-center"
      case "corner":
        return "items-end justify-end p-8"
      case "tile":
      default:
        return "items-center justify-center"
    }
  }

  if (position === "tile") {
    return (
      <div
        className={cn(
          "absolute inset-0 pointer-events-none overflow-hidden select-none",
          className
        )}
        style={{ opacity }}
      >
        <div
          className="absolute inset-0 flex flex-wrap items-center justify-center gap-16"
          style={{
            transform: "rotate(-30deg) scale(1.5)",
          }}
        >
          {Array.from({ length: 100 }).map((_, i) => (
            <span
              key={i}
              className="text-gray-500 text-lg font-bold whitespace-nowrap"
            >
              {getDisplayText()}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none flex select-none",
        getPositionStyles(),
        className
      )}
      style={{ opacity }}
    >
      <span className="text-gray-500 text-2xl font-bold transform -rotate-30">
        {getDisplayText()}
      </span>
    </div>
  )
}
