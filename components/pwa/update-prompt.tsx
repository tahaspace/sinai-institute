"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { registerServiceWorker, skipWaiting, type ServiceWorkerConfig } from "@/lib/pwa"

interface UpdatePromptProps {
  className?: string
}

export function UpdatePrompt({ className }: UpdatePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const config: ServiceWorkerConfig = {
      onUpdate: (reg) => {
        console.log("[PWA] Update available")
        setRegistration(reg)
        setShowPrompt(true)
      },
      onSuccess: () => {
        console.log("[PWA] Content cached for offline use")
      },
      onError: (error) => {
        console.error("[PWA] Service Worker error:", error)
      },
    }

    registerServiceWorker(config)
  }, [])

  const handleUpdate = useCallback(() => {
    setIsUpdating(true)
    skipWaiting()
    
    // The page will reload automatically when controller changes
    // But add a fallback timeout just in case
    setTimeout(() => {
      window.location.reload()
    }, 3000)
  }, [])

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className={cn(
            "fixed top-4 inset-x-4 z-50 max-w-md mx-auto",
            className
          )}
        >
          <div className="bg-card border rounded-xl shadow-2xl p-4 relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10" />

            <div className="relative flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold">تحديث جديد متاح!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  يتوفر إصدار جديد من التطبيق مع تحسينات ومميزات جديدة
                </p>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                        جاري التحديث...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 ml-2" />
                        تحديث الآن
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss}>
                    لاحقاً
                  </Button>
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 h-8 w-8"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default UpdatePrompt
