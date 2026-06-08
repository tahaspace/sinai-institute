"use client"

import { useState, useEffect } from "react"
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
  Share2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

interface VirtualClass {
  id: string
  title: string
  date: string
  time: string
  durationMins: number
  platform: "zoom" | "teams" | "meet"
  status: "live" | "upcoming" | "scheduled" | "ended"
  recordingUrl: string | null
}

const statusConfig = {
  live: { label: "مباشر الآن", color: "bg-red-500", textColor: "text-red-600" },
  upcoming: { label: "قريباً", color: "bg-orange-500", textColor: "text-orange-600" },
  scheduled: { label: "مجدول", color: "bg-blue-500", textColor: "text-blue-600" },
  ended: { label: "مكتمل", color: "bg-green-500", textColor: "text-green-600" },
}

const platformIcon = {
  zoom: "🎥",
  teams: "📺",
  meet: "📹",
}

export default function VirtualClassesPage() {
  const [showNewForm, setShowNewForm] = useState(false)
  const [virtualClasses, setVirtualClasses] = useState<VirtualClass[]>([])
  const [recordings, setRecordings] = useState<VirtualClass[]>([])
  const [apiStats, setApiStats] = useState<{ total: number; live: number; upcoming: number; ended: number }>({
    total: 0,
    live: 0,
    upcoming: 0,
    ended: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/lms/virtual-classes`)
        if (!res.ok) throw new Error("فشل في جلب الفصول الافتراضية")
        const json = await res.json()
        if (!cancelled) {
          setVirtualClasses(json.virtualClasses ?? [])
          setRecordings(json.recordings ?? [])
          setApiStats(json.stats ?? { total: 0, live: 0, upcoming: 0, ended: 0 })
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الفصول الافتراضية...</CardContent></Card>}

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
            <p className="text-2xl font-bold text-red-600">{apiStats.live}</p>
            <p className="text-sm text-muted-foreground">مباشر الآن</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-10 h-10 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{apiStats.upcoming}</p>
            <p className="text-sm text-muted-foreground">قادمة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-10 h-10 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{apiStats.total}</p>
            <p className="text-sm text-muted-foreground">إجمالي الفصول</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-10 h-10 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{apiStats.ended}</p>
            <p className="text-sm text-muted-foreground">منتهية</p>
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
              const status = cls.status in statusConfig ? statusConfig[cls.status] : null
              const icon = cls.platform in platformIcon ? platformIcon[cls.platform] : "🎥"

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
                            <span>{icon}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold">{cls.title}</h3>
                            {status && (
                              <Badge className={cn(
                                "text-white",
                                status.color
                              )}>
                                {status.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(cls.date).toLocaleDateString("ar-EG")} • {cls.time}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {cls.durationMins} دقيقة
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
                        {cls.status === "ended" && cls.recordingUrl && (
                          <Button variant="outline" asChild>
                            <Link href={cls.recordingUrl}>
                              <Video className="w-4 h-4 ml-2" />
                              مشاهدة التسجيل
                            </Link>
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
                          {new Date(recording.date).toLocaleDateString("ar-EG")} • {recording.durationMins} دقيقة
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {recording.recordingUrl && (
                        <Button variant="outline" asChild>
                          <Link href={recording.recordingUrl}>
                            <Play className="w-4 h-4 ml-2" />
                            تشغيل
                          </Link>
                        </Button>
                      )}
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



