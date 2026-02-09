"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Video,
  Plus,
  Play,
  Users,
  Clock,
  Calendar,
  Settings,
  MoreVertical,
  Monitor,
  Mic,
  MicOff,
  VideoOff,
  Share2,
  MessageSquare,
  Hand,
  Grid,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Virtual Classes
const virtualClasses = [
  {
    id: 1,
    title: "مراجعة الرياضيات",
    class: "3/1",
    date: "2024-12-25",
    time: "14:00",
    duration: "60 دقيقة",
    students: 35,
    status: "live",
    platform: "zoom",
  },
  {
    id: 2,
    title: "شرح الفيزياء - قوانين نيوتن",
    class: "3/2",
    date: "2024-12-25",
    time: "15:30",
    duration: "45 دقيقة",
    students: 32,
    status: "upcoming",
    platform: "teams",
  },
  {
    id: 3,
    title: "حصة اللغة الإنجليزية",
    class: "2/1",
    date: "2024-12-25",
    time: "16:30",
    duration: "45 دقيقة",
    students: 30,
    status: "scheduled",
    platform: "meet",
  },
  {
    id: 4,
    title: "مراجعة الكيمياء",
    class: "3/3",
    date: "2024-12-24",
    time: "14:00",
    duration: "60 دقيقة",
    students: 28,
    status: "completed",
    platform: "zoom",
    recording: true,
  },
]

// Recordings
const recordings = [
  { id: 1, title: "مراجعة الكيمياء - 24 ديسمبر", duration: "58:30", views: 45, date: "2024-12-24" },
  { id: 2, title: "شرح التفاضل - 23 ديسمبر", duration: "45:20", views: 89, date: "2024-12-23" },
  { id: 3, title: "اللغة الإنجليزية - 22 ديسمبر", duration: "42:15", views: 56, date: "2024-12-22" },
]

const statusConfig = {
  live: { label: "مباشر الآن", color: "bg-red-500", textColor: "text-red-600" },
  upcoming: { label: "قريباً", color: "bg-orange-500", textColor: "text-orange-600" },
  scheduled: { label: "مجدول", color: "bg-blue-500", textColor: "text-blue-600" },
  completed: { label: "مكتمل", color: "bg-green-500", textColor: "text-green-600" },
}

const platformIcon = {
  zoom: "🎥",
  teams: "📺",
  meet: "📹",
}

export default function VirtualClassesPage() {
  const [showNewForm, setShowNewForm] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الفصول الافتراضية</h1>
          <p className="text-muted-foreground">إدارة الفصول الافتراضية والبث المباشر</p>
        </div>
        <Button className="bg-violet-500 hover:bg-violet-600" onClick={() => setShowNewForm(!showNewForm)}>
          <Plus className="w-4 h-4 ml-2" />
          إنشاء فصل جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-lg bg-red-100 flex items-center justify-center mb-2">
              <div className="relative">
                <Video className="w-5 h-5 text-red-600" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">1</p>
            <p className="text-sm text-muted-foreground">مباشر الآن</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-10 h-10 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">3</p>
            <p className="text-sm text-muted-foreground">مجدولة اليوم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-10 h-10 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">125</p>
            <p className="text-sm text-muted-foreground">إجمالي الطلاب</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-10 h-10 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">45</p>
            <p className="text-sm text-muted-foreground">ساعة تدريس</p>
          </CardContent>
        </Card>
      </div>

      {/* New Class Form */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle>إنشاء فصل افتراضي جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>عنوان الفصل</Label>
                <Input placeholder="مثال: مراجعة الرياضيات" />
              </div>
              <div className="space-y-2">
                <Label>الفصل الدراسي</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفصل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3/1">3/1</SelectItem>
                    <SelectItem value="3/2">3/2</SelectItem>
                    <SelectItem value="3/3">3/3</SelectItem>
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
              <div className="space-y-2">
                <Label>المدة</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المدة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 دقيقة</SelectItem>
                    <SelectItem value="45">45 دقيقة</SelectItem>
                    <SelectItem value="60">60 دقيقة</SelectItem>
                    <SelectItem value="90">90 دقيقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المنصة</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المنصة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="teams">Microsoft Teams</SelectItem>
                    <SelectItem value="meet">Google Meet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>الوصف</Label>
                <Textarea placeholder="وصف محتوى الفصل..." />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Button className="bg-violet-500 hover:bg-violet-600">إنشاء الفصل</Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>إلغاء</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="classes">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="classes">الفصول</TabsTrigger>
          <TabsTrigger value="recordings">التسجيلات</TabsTrigger>
        </TabsList>

        {/* Classes Tab */}
        <TabsContent value="classes" className="mt-6">
          <div className="space-y-4">
            {virtualClasses.map((cls) => {
              const status = statusConfig[cls.status as keyof typeof statusConfig]

              return (
                <Card key={cls.id} className={cn(
                  cls.status === "live" && "border-red-200 bg-red-50/50 dark:bg-red-950/10"
                )}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-14 h-14 rounded-xl flex items-center justify-center text-2xl",
                          cls.status === "live" ? "bg-red-100" : "bg-violet-100"
                        )}>
                          {cls.status === "live" ? (
                            <div className="relative">
                              <Video className="w-7 h-7 text-red-600" />
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            </div>
                          ) : (
                            <span>{platformIcon[cls.platform as keyof typeof platformIcon]}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold">{cls.title}</h3>
                            <Badge className={cn(
                              "text-white",
                              status.color
                            )}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            الفصل {cls.class} • {new Date(cls.date).toLocaleDateString("ar-EG")} • {cls.time}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {cls.students} طالب
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {cls.duration}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cls.status === "live" && (
                          <Button className="bg-red-500 hover:bg-red-600">
                            <Play className="w-4 h-4 ml-2" />
                            انضمام
                          </Button>
                        )}
                        {cls.status === "upcoming" && (
                          <Button className="bg-violet-500 hover:bg-violet-600">
                            بدء الفصل
                          </Button>
                        )}
                        {cls.status === "scheduled" && (
                          <Button variant="outline">
                            تعديل
                          </Button>
                        )}
                        {cls.status === "completed" && cls.recording && (
                          <Button variant="outline">
                            <Video className="w-4 h-4 ml-2" />
                            مشاهدة التسجيل
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Settings className="w-4 h-4 ml-2" />
                              الإعدادات
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="w-4 h-4 ml-2" />
                              مشاركة الرابط
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Recordings Tab */}
        <TabsContent value="recordings" className="mt-6">
          <div className="space-y-4">
            {recordings.map((recording) => (
              <Card key={recording.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Video className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{recording.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {recording.duration} • {recording.views} مشاهدة
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline">
                        <Play className="w-4 h-4 ml-2" />
                        تشغيل
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}



