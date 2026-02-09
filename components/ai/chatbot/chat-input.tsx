"use client"

import { useState, KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Paperclip, Mic } from "lucide-react"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "اكتب رسالتك هنا...",
}: ChatInputProps) {
  const [message, setMessage] = useState("")

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage("")
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t p-3 bg-background">
      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10"
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[40px] max-h-[100px] resize-none"
          rows={1}
        />

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10"
          disabled={disabled}
        >
          <Mic className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default ChatInput
