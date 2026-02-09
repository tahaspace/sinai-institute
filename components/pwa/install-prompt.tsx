"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Download, X, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

interface InstallPromptProps {
  className?: string
  onInstalled?: () => void
  onDismissed?: () => void
}

export function InstallPrompt({
  className,
  onInstalled,
  onDismissed,
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone

    if (isStandalone) {
      console.log("[PWA] App is already installed")
      return
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem("pwa-install-dismissed")
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      
      // Don't show again for 7 days
      if (daysSinceDismissed < 7) {
        return
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show prompt after a delay (better UX)
      setTimeout(() => setShowPrompt(true), 3000)
    }

    const handleAppInstalled = () => {
      console.log("[PWA] App installed")
      setShowPrompt(false)
      setDeferredPrompt(null)
      onInstalled?.()
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [onInstalled])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    setIsInstalling(true)

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        console.log("[PWA] User accepted install prompt")
        onInstalled?.()
      } else {
        console.log("[PWA] User dismissed install prompt")
        handleDismiss()
      }
    } catch (error) {
      console.error("[PWA] Install error:", error)
    } finally {
      setIsInstalling(false)
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString())
    onDismissed?.()
  }

  return (
    <AnimatePresence>
      {showPrompt && deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className={cn(
            "fixed bottom-4 inset-x-4 z-50 max-w-lg mx-auto",
            className
          )}
        >
          <div className="bg-card border rounded-xl shadow-2xl p-4 relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10" />

            <div className="relative flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg">تثبيت EduSaas</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  قم بتثبيت التطبيق للوصول السريع والعمل بدون اتصال بالإنترنت
                </p>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    disabled={isInstalling}
                  >
                    {isInstalling ? (
                      <>جاري التثبيت...</>
                    ) : (
                      <>
                        <Download className="w-4 h-4 ml-2" />
                        تثبيت
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

export default InstallPrompt
