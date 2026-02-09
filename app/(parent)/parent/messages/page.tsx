"use client"

import { useState } from "react"
import {
  MessageSquare,
  Send,
  Calendar,
  User,
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

// Messages
const messages = [
  {
    id: 1,
    from: "أ. محمد أحمد",
    role: "معلم الرياضيات",
    subject: "بخصوص مستوى أحمد",
    message: "أحمد يتقدم بشكل ممتاز في مادة الرياضيات...",
    date: "2024-12-24",
    read: true,
  },
  {
    id: 2,
    from: "إدارة المدرسة",
    role: "إدارة",
    subject: "موعد اجتماع أولياء الأمور",
    message: "يسرنا دعوتكم لحضور اجتماع أولياء الأمور...",
    date: "2024-12-22",
    read: true,
  },
  {
    id: 3,
    from: "أ. سارة خالد",
    role: "معلمة اللغة العربية",
    subject: "ملاحظة على سارة",
    message: "سارة طالبة مجتهدة ولكنها تحتاج...",
    date: "2024-12-20",
    read: false,
  },
]

// Appointments
const appointments = [
  { id: 1, teacher: "أ. محمد أحمد", subject: "الرياضيات", date: "2024-12-28", time: "10:00", status: "confirmed" },
  { id: 2, teacher: "أ. سارة خالد", subject: "اللغة العربية", date: "2024-12-30", time: "11:00", status: "pending" },
]

export default function ParentMessagesPage() {
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [showNewAppointment, setShowNewAppointment] = useState(false)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">التواصل</h1>
          <p className="text-muted-foreground">مراسلة المعلمين وحجز المواعيد</p>
        </div>
      </div>

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
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
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
                      <p className="text-sm text-muted-foreground line-clamp-1">{msg.message}</p>
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
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-pink-600" />
                      </div>
                      <div>
                        <p className="font-medium">{apt.teacher}</p>
                        <p className="text-sm text-muted-foreground">{apt.subject}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">
                        {new Date(apt.date).toLocaleDateString("ar-EG")}
                      </p>
                      <p className="text-sm text-muted-foreground">{apt.time}</p>
                    </div>
                    <Badge className={cn(
                      apt.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    )}>
                      {apt.status === "confirmed" ? "مؤكد" : "قيد المراجعة"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



