"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, User } from "lucide-react"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className={cn(
        "h-8 w-8 shrink-0",
        isUser ? "bg-primary" : "bg-gradient-to-br from-primary to-secondary"
      )}>
        <AvatarFallback>
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : (
            <Bot className="h-4 w-4 text-white" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-muted rounded-tl-none"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={cn(
            "text-[10px] mt-1",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {message.timestamp.toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  )
}

export default ChatMessage
