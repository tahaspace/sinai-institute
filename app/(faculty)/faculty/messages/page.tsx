"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MessageSquare, Search, Plus, Send, Paperclip, Star, Archive, Trash2, Reply, MoreVertical, Inbox, SendHorizontal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const messages = [
  { id: 1, from: "أحمد محمد علي", studentId: "20240001", subject: "استفسار عن مشروع التخرج", preview: "السلام عليكم دكتور، أريد الاستفسار عن متطلبات مشروع التخرج...", date: "منذ 30 دقيقة", unread: true, starred: false },
  { id: 2, from: "سارة أحمد حسن", studentId: "20240002", subject: "طلب موعد", preview: "دكتور، أرجو حجز موعد في الساعات المكتبية لمناقشة...", date: "منذ ساعة", unread: true, starred: true },
  { id: 3, from: "محمود عبدالله", studentId: "20240003", subject: "شكر وتقدير", preview: "شكراً جزيلاً على المساعدة في فهم موضوع...", date: "أمس", unread: false, starred: false },
  { id: 4, from: "فاطمة السيد", studentId: "20240004", subject: "استفسار عن الواجب", preview: "دكتور، هل يمكن توضيح المطلوب في السؤال الثالث...", date: "أمس", unread: false, starred: true },
  { id: 5, from: "عمر خالد", studentId: "20240005", subject: "طلب تأجيل التسليم", preview: "أرجو قبول طلب تأجيل تسليم الواجب بسبب...", date: "منذ يومين", unread: false, starred: false },
]

const selectedMessage = {
  id: 1,
  from: "أحمد محمد علي",
  studentId: "20240001",
  subject: "استفسار عن مشروع التخرج",
  date: "15 يناير 2025 - 10:30 ص",
  content: `السلام عليكم ورحمة الله وبركاته

دكتور محمد، تحية طيبة وبعد،

أريد الاستفسار عن متطلبات مشروع التخرج للفصل القادم. هل يمكنني اختيار موضوع في مجال الذكاء الاصطناعي؟ وما هي المتطلبات الأساسية التي يجب أن أستوفيها قبل البدء؟

شكراً جزيلاً على وقتكم.

مع خالص التقدير،
أحمد محمد علي`
}

export default function MessagesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(1)
  const [replyText, setReplyText] = useState("")

  const unreadCount = messages.filter(m => m.unread).length
  const starredCount = messages.filter(m => m.starred).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-indigo-600" />
            الرسائل
          </h1>
          <p className="text-gray-500 mt-1">التواصل مع الطلاب وإدارة الرسائل</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 ml-2" />
          رسالة جديدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الرسائل", value: messages.length, icon: MessageSquare, color: "indigo" },
          { label: "غير مقروءة", value: unreadCount, icon: Inbox, color: "blue" },
          { label: "مميزة بنجمة", value: starredCount, icon: Star, color: "yellow" },
          { label: "المرسلة", value: 12, icon: SendHorizontal, color: "green" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`border-r-4 border-r-${stat.color}-500`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-10 h-10 text-${stat.color}-500`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Messages Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Messages List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="بحث في الرسائل..." className="pr-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 cursor-pointer transition-colors ${selectedId === msg.id ? 'bg-indigo-50' : 'hover:bg-gray-50'} ${msg.unread ? 'bg-blue-50/50' : ''}`}
                    onClick={() => setSelectedId(msg.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback className={`${msg.unread ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                          {msg.from.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium truncate ${msg.unread ? 'text-gray-900' : 'text-gray-600'}`}>{msg.from}</p>
                          <div className="flex items-center gap-1">
                            {msg.starred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                            <span className="text-xs text-gray-400">{msg.date}</span>
                          </div>
                        </div>
                        <p className={`text-sm truncate ${msg.unread ? 'font-medium' : 'text-gray-500'}`}>{msg.subject}</p>
                        <p className="text-xs text-gray-400 truncate mt-1">{msg.preview}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Content */}
        <Card className="lg:col-span-2">
          {selectedId ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700">
                        {selectedMessage.from.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold">{selectedMessage.from}</p>
                      <p className="text-sm text-gray-500">{selectedMessage.studentId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost"><Star className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost"><Archive className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost"><MoreVertical className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="mt-2">
                  <h2 className="text-lg font-bold">{selectedMessage.subject}</h2>
                  <p className="text-sm text-gray-500">{selectedMessage.date}</p>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700 bg-transparent p-0">{selectedMessage.content}</pre>
                </div>

                {/* Reply Box */}
                <div className="mt-6 border-t pt-6">
                  <p className="text-sm font-medium text-gray-500 mb-2">الرد على الرسالة</p>
                  <Textarea
                    placeholder="اكتب ردك هنا..."
                    className="min-h-[100px]"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <Button variant="outline" size="sm">
                      <Paperclip className="w-4 h-4 ml-1" />
                      إرفاق ملف
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      <Send className="w-4 h-4 ml-2" />
                      إرسال الرد
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>اختر رسالة لعرضها</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
