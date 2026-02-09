"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { WifiOff, Wifi, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { observeNetworkStatus, type NetworkStatus } from "@/lib/pwa"

interface OfflineIndicatorProps {
  position?: "top" | "bottom"
  className?: string
}

export function OfflineIndicator({
  position = "bottom",
  className,
}: OfflineIndicatorProps) {
  const [status, setStatus] = useState<NetworkStatus>("online")
  const [showOnlineMessage, setShowOnlineMessage] = useState(false)

  useEffect(() => {
    const cleanup = observeNetworkStatus((newStatus) => {
      const wasOffline = status !== "online"

      setStatus(newStatus)

      // Show "back online" message briefly
      if (wasOffline && newStatus === "online") {
        setShowOnlineMessage(true)
        setTimeout(() => setShowOnlineMessage(false), 3000)
      }
    })

    return cleanup
  }, [status])

  const isVisible = status !== "online" || showOnlineMessage

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: position === "top" ? -100 : 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === "top" ? -100 : 100 }}
          className={cn(
            "fixed inset-x-0 z-50 p-4",
            position === "top" ? "top-0" : "bottom-0",
            className
          )}
        >
          <div
            className={cn(
              "mx-auto max-w-md rounded-lg px-4 py-3 shadow-lg flex items-center gap-3",
              status === "offline" && "bg-red-600 text-white",
              status === "slow" && "bg-yellow-500 text-white",
              showOnlineMessage && "bg-green-600 text-white"
            )}
          >
            {status === "offline" && (
              <>
                <WifiOff className="h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">لا يوجد اتصال بالإنترنت</p>
                  <p className="text-sm opacity-90">
                    يمكنك الاستمرار في العمل، وسيتم مزامنة التغييرات عند عودة الاتصال
                  </p>
                </div>
              </>
            )}

            {status === "slow" && (
              <>
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">اتصال بطيء</p>
                  <p className="text-sm opacity-90">
                    قد يستغرق تحميل المحتوى وقتاً أطول
                  </p>
                </div>
              </>
            )}

            {showOnlineMessage && (
              <>
                <Wifi className="h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">تم استعادة الاتصال</p>
                  <p className="text-sm opacity-90">جاري مزامنة التغييرات...</p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default OfflineIndicator
