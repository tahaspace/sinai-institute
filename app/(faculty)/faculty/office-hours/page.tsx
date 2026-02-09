"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Clock, Search, Plus, Calendar, Users, CheckCircle, XCircle, Edit, Trash2, MapPin, Video, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const officeHoursSchedule = [
  { day: "الأحد", time: "10:00 - 11:00", location: "مكتب 205", type: "in_person", active: true },
  { day: "الثلاثاء", time: "14:00 - 15:00", location: "مكتب 205", type: "in_person", active: true },
  { day: "الأربعاء", time: "11:00 - 12:00", location: "Zoom", type: "online", active: true },
  { day: "الخميس", time: "10:00 - 11:00", location: "مكتب 205", type: "in_person", active: false },
]

const upcomingAppointments = [
  { id: 1, student: "أحمد محمد علي", studentId: "20240001", date: "2025-01-16", time: "10:00", topic: "استفسار عن المشروع", status: "confirmed" },
  { id: 2, student: "سارة أحمد حسن", studentId: "20240002", date: "2025-01-16", time: "10:30", topic: "مناقشة البحث", status: "pending" },
  { id: 3, student: "محمود عبدالله", studentId: "20240003", date: "2025-01-18", time: "14:00", topic: "طلب توصية", status: "confirmed" },
  { id: 4, student: "فاطمة السيد", studentId: "20240004", date: "2025-01-19", time: "11:00", topic: "مراجعة الدرجات", status: "pending" },
]

const statusConfig = {
  confirmed: { label: "مؤكد", color: "bg-green-100 text-green-700" },
  pending: { label: "بانتظار التأكيد", color: "bg-yellow-100 text-yellow-700" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-700" },
}

export default function OfficeHoursPage() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-indigo-600" />
            الساعات المكتبية
          </h1>
          <p className="text-gray-500 mt-1">إدارة الساعات المكتبية وحجوزات الطلاب</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 ml-2" />
          إضافة موعد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "ساعات مكتبية أسبوعية", value: "4 ساعات", icon: Clock, color: "indigo" },
          { label: "المواعيد القادمة", value: upcomingAppointments.length, icon: Calendar, color: "blue" },
          { label: "مواعيد مؤكدة", value: upcomingAppointments.filter(a => a.status === "confirmed").length, icon: CheckCircle, color: "green" },
          { label: "بانتظار التأكيد", value: upcomingAppointments.filter(a => a.status === "pending").length, icon: Users, color: "yellow" },
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

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">جدول الساعات المكتبية</TabsTrigger>
          <TabsTrigger value="appointments">المواعيد</TabsTrigger>
          <TabsTrigger value="history">السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>جدول الساعات المكتبية الأسبوعي</CardTitle>
              <CardDescription>يمكنك تفعيل أو تعطيل الساعات حسب الحاجة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {officeHoursSchedule.map((slot, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-4 rounded-lg border ${slot.active ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                          {slot.type === "online" ? (
                            <Video className="w-6 h-6 text-indigo-600" />
                          ) : (
                            <MapPin className="w-6 h-6 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-lg">{slot.day}</p>
                          <p className="text-gray-500">{slot.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="gap-1">
                          {slot.type === "online" ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                          {slot.location}
                        </Badge>
                        <Badge className={slot.type === "online" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}>
                          {slot.type === "online" ? "أونلاين" : "حضوري"}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">مفعّل</span>
                          <Switch checked={slot.active} />
                        </div>
                        <Button size="icon" variant="ghost"><Edit className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>المواعيد القادمة</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="بحث..." className="pr-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingAppointments.map((apt, i) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-indigo-100 text-indigo-700">
                            {apt.student.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{apt.student}</p>
                          <p className="text-sm text-gray-500">{apt.studentId}</p>
                          <p className="text-sm text-indigo-600 mt-1">{apt.topic}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="font-medium">{apt.date}</p>
                          <p className="text-sm text-gray-500">{apt.time}</p>
                        </div>
                        <Badge className={statusConfig[apt.status as keyof typeof statusConfig].color}>
                          {statusConfig[apt.status as keyof typeof statusConfig].label}
                        </Badge>
                        {apt.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="w-4 h-4 ml-1" />
                              تأكيد
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600">
                              <XCircle className="w-4 h-4 ml-1" />
                              رفض
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card><CardContent className="p-6 text-center text-gray-500"><Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />سجل المواعيد السابقة</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
