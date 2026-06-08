"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Video,
  BookOpen,
  FileText,
  ClipboardList,
  Clock,
  Play,
  TrendingUp,
  ChevronLeft,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// --- API response shapes (served by /api/lms/dashboard) ---
interface DashboardStats {
  content: number
  classes: number
  topics: number
  assignments: number
}
interface UpcomingClass {
  id: string
  title: string
  date: string
  time: string
  platform: string
  status: string
}
interface RecentContentItem {
  id: string
  title: string
  type: string
  unit: string
  views: number
}
interface PendingAssignment {
  id: string
  title: string
  course: string
  dueDate: string
}
interface DashboardResponse {
  stats: DashboardStats
  upcomingClasses: UpcomingClass[]
  recentContent: RecentContentItem[]
  pendingAssignments: PendingAssignment[]
}

interface StatCard {
  title: string
  value: number
  icon: LucideIcon
  color: string
  href: string
}

export default function LMSDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/lms/dashboard`)
        if (!res.ok) {
          throw new Error("فشل في جلب لوحة التعلم")
        }
        const json = (await res.json()) as DashboardResponse
        if (!cancelled) setData(json)
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

  const stats: StatCard[] = data
    ? [
        { title: "الفصول الافتراضية", value: data.stats.classes, icon: Video, color: "from-red-500 to-red-600", href: "/lms/virtual-classes" },
        { title: "المحتوى", value: data.stats.content, icon: BookOpen, color: "from-blue-500 to-blue-600", href: "/lms/content" },
        { title: "الواجبات", value: data.stats.assignments, icon: FileText, color: "from-orange-500 to-orange-600", href: "/lms/assignments" },
        { title: "مواضيع النقاش", value: data.stats.topics, icon: ClipboardList, color: "from-green-500 to-green-600", href: "/lms/discussions" },
      ]
    : []
  const upcomingClasses = data?.upcomingClasses ?? []
  const recentContent = data?.recentContent ?? []
  const pendingAssignments = data?.pendingAssignments ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">نظام التعلم الإلكتروني</h1>
          <p className="text-muted-foreground">مرحباً بك في منصة التعلم الإلكتروني</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/lms/content">
              <BookOpen className="w-4 h-4 ml-2" />
              رفع محتوى
            </Link>
          </Button>
          <Button className="bg-violet-500 hover:bg-violet-600" asChild>
            <Link href="/lms/virtual-classes/new">
              <Video className="w-4 h-4 ml-2" />
              إنشاء فصل
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل لوحة التعلم...</CardContent>
        </Card>
      )}

      {!loading && !error && data && (
      <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={stat.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br text-white mb-3",
                    stat.color
                  )}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Classes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                الفصول القادمة
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/lms/virtual-classes">
                  عرض الكل
                  <ChevronLeft className="w-4 h-4 mr-2" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingClasses.map((cls) => (
                <div
                  key={cls.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    cls.status === "live" && "bg-red-50 border-red-200 dark:bg-red-950/30"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      cls.status === "live" ? "bg-red-100" : "bg-violet-100"
                    )}>
                      {cls.status === "live" ? (
                        <div className="relative">
                          <Video className="w-6 h-6 text-red-600" />
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <Clock className="w-6 h-6 text-violet-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{cls.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(cls.date).toLocaleDateString("ar-EG")} • {cls.time} • {cls.platform}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {cls.status === "live" ? (
                      <Button className="bg-red-500 hover:bg-red-600">
                        <Play className="w-4 h-4 ml-2" />
                        انضمام
                      </Button>
                    ) : (
                      <Button variant="outline">بدء</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              النشاط الأخير
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">لا يوجد نشاط حديث</p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                المحتوى الأخير
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/lms/content">عرض الكل</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentContent.map((content) => (
                <div
                  key={content.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      content.type === "video" ? "bg-red-100" : "bg-blue-100"
                    )}>
                      {content.type === "video" ? (
                        <Video className="w-5 h-5 text-red-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{content.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {content.views} مشاهدة
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{content.type === "video" ? "فيديو" : "PDF"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Assignments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                الواجبات المعلقة
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/lms/assignments">عرض الكل</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingAssignments.map((assignment) => (
                <div key={assignment.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.course} • موعد التسليم: {new Date(assignment.dueDate).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      </>
      )}
    </div>
  )
}



