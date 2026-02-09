"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { X, Sparkles, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import confetti from "canvas-confetti"

interface AchievementNotificationProps {
  badge: {
    name: string
    description: string
    icon: string
    rarity: "common" | "rare" | "epic" | "legendary"
  }
  points?: number
  isVisible: boolean
  onClose: () => void
  onShare?: () => void
}

const rarityConfig = {
  common: {
    bg: "from-gray-500 to-gray-600",
    text: "عادية",
    confetti: ["#6b7280", "#9ca3af"],
  },
  rare: {
    bg: "from-blue-500 to-blue-600",
    text: "نادرة",
    confetti: ["#3b82f6", "#60a5fa"],
  },
  epic: {
    bg: "from-purple-500 to-purple-600",
    text: "ملحمية",
    confetti: ["#8b5cf6", "#a78bfa"],
  },
  legendary: {
    bg: "from-yellow-400 to-orange-500",
    text: "أسطورية",
    confetti: ["#f59e0b", "#fbbf24", "#f97316"],
  },
}

export function AchievementNotification({
  badge,
  points = 0,
  isVisible,
  onClose,
  onShare,
}: AchievementNotificationProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const config = rarityConfig[badge.rarity]

  useEffect(() => {
    if (isVisible && !showConfetti) {
      setShowConfetti(true)
      
      // Fire confetti
      const duration = badge.rarity === "legendary" ? 3000 : 2000
      const end = Date.now() + duration

      const colors = config.confetti

      ;(function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      })()
    }
  }, [isVisible, badge.rarity, config.confetti, showConfetti])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div
                className={cn(
                  "relative p-6 text-white bg-gradient-to-br",
                  config.bg
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 text-white/80 hover:text-white hover:bg-white/20"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </Button>

                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="flex items-center justify-center mb-4"
                >
                  <Sparkles className="w-8 h-8" />
                </motion.div>

                <p className="text-center text-sm opacity-90">
                  🎉 تهانينا! حصلت على شارة جديدة!
                </p>
              </div>

              {/* Badge Display */}
              <div className="p-6 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className={cn(
                    "w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl mb-4 shadow-lg bg-gradient-to-br",
                    config.bg
                  )}
                >
                  {badge.icon}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h2 className="text-2xl font-bold mb-1">{badge.name}</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {badge.description}
                  </p>
                  <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10">
                    <span
                      className={cn(
                        "font-medium",
                        badge.rarity === "legendary" && "text-yellow-600",
                        badge.rarity === "epic" && "text-purple-600",
                        badge.rarity === "rare" && "text-blue-600"
                      )}
                    >
                      شارة {config.text}
                    </span>
                  </div>
                </motion.div>

                {/* Points earned */}
                {points > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20"
                  >
                    <p className="text-yellow-700 dark:text-yellow-300 font-medium">
                      +{points} نقطة
                    </p>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-6">
                  <Button className="flex-1" onClick={onClose}>
                    رائع!
                  </Button>
                  {onShare && (
                    <Button variant="outline" size="icon" onClick={onShare}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AchievementNotification
