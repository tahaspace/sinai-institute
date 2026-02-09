"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage, type Message } from "./chat-message"
import { ChatInput } from "./chat-input"
import { ChatSuggestions } from "./chat-suggestions"
import { TypingIndicator } from "./typing-indicator"
import { MessageCircle, X, Minimize2, Maximize2, Sparkles, Bot } from "lucide-react"

interface ChatWidgetProps {
  userType?: "student" | "teacher" | "parent"
  userName?: string
  className?: string
}

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "مرحباً! أنا المساعد الذكي. كيف يمكنني مساعدتك اليوم؟",
    timestamp: new Date(),
  },
]

const suggestions = {
  student: [
    "كيف أحسن درجاتي؟",
    "ما هي الواجبات المطلوبة؟",
    "اشرح لي درس الرياضيات",
    "متى موعد الامتحان القادم؟",
  ],
  teacher: [
    "اقترح نشاط للطلاب",
    "كيف أتعامل مع طالب ضعيف؟",
    "ساعدني في تحضير الدرس",
    "تقرير أداء الفصل",
  ],
  parent: [
    "كيف حال ابني في المدرسة؟",
    "ما هي المصروفات المتبقية؟",
    "متى الاجتماع القادم؟",
    "كيف أتواصل مع المعلم؟",
  ],
}

export function ChatWidget({
  userType = "student",
  userName = "طالب",
  className,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Simulate AI typing
    setIsTyping(true)

    // Simulate API response delay
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000))

    // Add AI response
    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: generateAIResponse(content, userType),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, aiResponse])
    setIsTyping(false)
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={cn("fixed bottom-4 left-4 z-50", className)}
          >
            <Button
              size="lg"
              className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              onClick={() => setIsOpen(true)}
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-4 left-4 z-50",
              isMinimized ? "w-72" : "w-96 h-[500px]",
              className
            )}
          >
            <div className="bg-card rounded-2xl shadow-2xl border overflow-hidden flex flex-col h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-secondary p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold">المساعد الذكي</h3>
                      <p className="text-xs opacity-90">
                        <span className="inline-block w-2 h-2 bg-green-400 rounded-full ml-1" />
                        متصل الآن
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                      onClick={() => setIsMinimized(!isMinimized)}
                    >
                      {isMinimized ? (
                        <Maximize2 className="w-4 h-4" />
                      ) : (
                        <Minimize2 className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chat Content */}
              {!isMinimized && (
                <>
                  <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <ChatMessage key={message.id} message={message} />
                      ))}
                      {isTyping && <TypingIndicator />}
                    </div>
                  </ScrollArea>

                  {/* Suggestions */}
                  {messages.length <= 2 && (
                    <ChatSuggestions
                      suggestions={suggestions[userType]}
                      onSuggestionClick={handleSuggestionClick}
                    />
                  )}

                  {/* Input */}
                  <ChatInput onSend={handleSendMessage} disabled={isTyping} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Simple response generator (mock AI)
function generateAIResponse(input: string, userType: string): string {
  const lowercaseInput = input.toLowerCase()

  if (lowercaseInput.includes("واجب") || lowercaseInput.includes("مطلوب")) {
    return "لديك 3 واجبات مطلوبة هذا الأسبوع:\n\n1. واجب الرياضيات - موعد التسليم: غداً\n2. واجب اللغة العربية - موعد التسليم: الأحد\n3. مشروع العلوم - موعد التسليم: الأربعاء\n\nهل تريد مساعدة في أي منها؟"
  }

  if (lowercaseInput.includes("درجات") || lowercaseInput.includes("أحسن")) {
    return "إليك بعض النصائح لتحسين درجاتك:\n\n✨ خصص وقتاً يومياً للمذاكرة\n📝 حل تمارين إضافية\n👥 ادرس مع زملائك\n🎯 ركز على نقاط ضعفك\n💤 احصل على قسط كافٍ من النوم\n\nهل تريد خطة مذاكرة مخصصة؟"
  }

  if (lowercaseInput.includes("امتحان") || lowercaseInput.includes("اختبار")) {
    return "جدول الامتحانات القادمة:\n\n📚 الرياضيات - الأحد 5 يناير\n📖 اللغة العربية - الثلاثاء 7 يناير\n🔬 العلوم - الخميس 9 يناير\n\nهل تريد مواد مراجعة لأي مادة؟"
  }

  if (lowercaseInput.includes("شرح") || lowercaseInput.includes("درس")) {
    return "سأكون سعيداً بمساعدتك! 📚\n\nأي درس تريد شرحه؟ أخبرني بالمادة واسم الدرس وسأقدم لك شرحاً مبسطاً مع أمثلة."
  }

  return "شكراً على سؤالك! 🌟\n\nأنا هنا لمساعدتك في أي استفسار دراسي. يمكنني:\n\n• شرح الدروس\n• متابعة الواجبات\n• تقديم نصائح للدراسة\n• الإجابة على أسئلتك\n\nكيف يمكنني مساعدتك؟"
}

export default ChatWidget
