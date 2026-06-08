"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Users, Bell, Mail, Search, Plus } from "lucide-react"

interface MessageRow {
  id: string
  from: string
  role: string
  subject: string
  body: string
  read: boolean
  date: string
}

export default function CommunicationPage() {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [apiStats, setApiStats] = useState<{ total: number; unread: number }>({ total: 0, unread: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/messages`)
        if (!res.ok) throw new Error("فشل في جلب الرسائل")
        const json = await res.json()
        if (!cancelled) {
          setMessages(json.messages ?? [])
          setApiStats(json.stats ?? { total: 0, unread: 0 })
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const stats = [
    { label: "رسائل جديدة", value: String(apiStats.unread), icon: MessageSquare, color: "text-institute-blue" },
    { label: "إشعارات مرسلة", value: "—", icon: Bell, color: "text-institute-blue" },
    { label: "بريد إلكتروني", value: "—", icon: Mail, color: "text-institute-gold" },
    { label: "مجموعات", value: "—", icon: Users, color: "text-institute-gold" },
  ]

  const recentMessages = messages.map((m) => ({
    from: m.from,
    subject: m.subject,
    time: m.date,
    unread: !m.read,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-institute-blue" />
            التواصل
          </h1>
          <p className="text-muted-foreground">نظام المراسلات والإشعارات</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          رسالة جديدة
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الرسائل...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث في الرسائل..." className="pr-10" />
      </div>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle>الرسائل الأخيرة</CardTitle>
          <CardDescription>صندوق الوارد</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentMessages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                  message.unread ? "bg-institute-blue dark:bg-institute-blue/10 border-institute-blue" : ""
                }`}
              >
                <Avatar>
                  <AvatarFallback className="bg-institute-blue text-institute-blue">
                    {message.from.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${message.unread ? "text-foreground" : "text-muted-foreground"}`}>
                      {message.from}
                    </h4>
                    {message.unread && (
                      <Badge className="bg-institute-blue text-white text-xs">جديد</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{message.subject}</p>
                </div>
                <span className="text-xs text-muted-foreground">{message.time}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
