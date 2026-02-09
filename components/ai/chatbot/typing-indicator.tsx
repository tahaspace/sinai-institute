"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot } from "lucide-react"

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 bg-gradient-to-br from-primary to-secondary">
        <AvatarFallback>
          <Bot className="h-4 w-4 text-white" />
        </AvatarFallback>
      </Avatar>

      <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground/50"
              animate={{
                y: [0, -6, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TypingIndicator
