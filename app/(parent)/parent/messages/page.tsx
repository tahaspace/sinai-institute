"use client"

import { useState, useEffect } from "react"
import {
  Send,
  Calendar,
  Plus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface MessageRow {
  id: string
  from: string
  role: string
  subject: string
  body: string
  read: boolean
  date: string
}

export default function ParentMessagesPage() {
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [showNewAppointment, setShowNewAppointment] = useState(false)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [apiStats, setApiStats] = useState<{ total: number; unread: number }>({ total: 0, unread: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/messages`)
      if (!res.ok) throw new Error("فشل في جلب الرسائل")
      const json = await res.json()
      setMessages(json.messages ?? [])
      setApiStats(json.stats ?? { total: 0, unread: 0 })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadGuarded() {
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
    loadGuarded()
    return () => { cancelled = true }
  }, [])

  async function handleOpenMessage(msg: MessageRow) {
    if (msg.read) return
    try {
      const res = await fetch(`/api/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, read: true }),
      })
      if (!res.ok) throw new Error("فشل في تحديث الرسالة")
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">التواصل</h1>
          <p className="text-muted-foreground">مراسلة المعلمين وحجز المواعيد</p>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الرسائل...</CardContent></Card>}

      {/* Tabs */}
      <Tabs defaultValue="messages">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="messages">الرسائل</TabsTrigger>
          <TabsTrigger value="appointments">المواعيد</TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowNewMessage(!showNewMessage)}>
              <Plus className="w-4 h-4 ml-2" />
              رسالة جديدة
            </Button>
          </div>

          {showNewMessage && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>رسالة جديدة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>إلى</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المعلم" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">أ. محمد أحمد - الرياضيات</SelectItem>
                        <SelectItem value="2">أ. سارة خالد - اللغة العربية</SelectItem>
                        <SelectItem value="3">أ. أحمد علي - الفيزياء</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الموضوع</Label>
                    <Input placeholder="موضوع الرسالة" />
                  </div>
                  <div className="space-y-2">
                    <Label>الرسالة</Label>
                    <Textarea placeholder="اكتب رسالتك هنا..." rows={4} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button>
                      <Send className="w-4 h-4 ml-2" />
                      إرسال
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewMessage(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>صندوق الوارد</CardTitle>
              <CardDescription>{apiStats.total} رسالة · {apiStats.unread} غير مقروءة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!loading && messages.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">لا توجد رسائل</p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => handleOpenMessage(msg)}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors",
                      !msg.read ? "bg-blue-50 dark:bg-blue-950/20" : "bg-muted/50"
                    )}
                  >
                    <Avatar>
                      <AvatarFallback className="bg-pink-100 text-pink-600">
                        {msg.from.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{msg.from}</span>
                          <Badge variant="outline">{msg.role}</Badge>
                          {!msg.read && <Badge className="bg-blue-500">جديد</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.date).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{msg.subject}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{msg.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowNewAppointment(!showNewAppointment)}>
              <Plus className="w-4 h-4 ml-2" />
              حجز موعد
            </Button>
          </div>

          {showNewAppointment && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>حجز موعد جديد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المعلم</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المعلم" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">أ. محمد أحمد - الرياضيات</SelectItem>
                        <SelectItem value="2">أ. سارة خالد - اللغة العربية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الطالب</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الطالب" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">أحمد محمد علي</SelectItem>
                        <SelectItem value="2">سارة محمد علي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>التاريخ</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>الوقت</Label>
                    <Input type="time" />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <Button>حجز الموعد</Button>
                    <Button variant="outline" onClick={() => setShowNewAppointment(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>المواعيد المحجوزة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">لا توجد مواعيد</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



