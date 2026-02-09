"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Lightbulb } from "lucide-react"

interface ChatSuggestionsProps {
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
}

export function ChatSuggestions({
  suggestions,
  onSuggestionClick,
}: ChatSuggestionsProps) {
  return (
    <div className="px-4 pb-3">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Lightbulb className="w-3 h-3" />
        <span>اقتراحات سريعة</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-auto py-1.5 px-3"
              onClick={() => onSuggestionClick(suggestion)}
            >
              {suggestion}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default ChatSuggestions
