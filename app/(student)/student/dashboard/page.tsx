"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Calendar,
  GraduationCap,
  ClipboardCheck,
  FileText,
  BookOpen,
  Clock,
  Bell,
  ChevronLeft,
  CheckCircle2,
  Play,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// --- API response shapes (served by /api/student/dashboard) ---
interface TodayLesson {
  id: number
  subject: string
  time: string
  teacher: string
  room: string
  status: string
}
interface UpcomingAssignment {
  id: string
  subject: string
  title: string
  dueDate: string
  status: string
}
interface RecentGrade {
  id: string
  subject: string
  exam: string
  grade: number
  total: number
  date: string
}
interface DashboardNotification {
  id: string
  type: string
  message: string
  time: string
}
interface DashboardResponse {
  student: { id: string; studentCode: string; name: string }
  stats: { attendance: number; gpa: number; completedAssignments: number; totalAssignments: number }
  todaySchedule: TodayLesson[]
  upcomingAssignments: UpcomingAssignment[]
  recentGrades: RecentGrade[]
  notifications: DashboardNotification[]
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/student/dashboard`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || "فشل في جلب لوحة التحكم")
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

  const todaySchedule = data?.todaySchedule ?? []
  const upcomingAssignments = data?.upcomingAssignments ?? []
  const recentGrades = data?.recentGrades ?? []
  const notifications = data?.notifications ?? []
  const stats = data?.stats
  const firstName = data?.student?.name?.split(" ")[0] ?? ""

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">مرحباً، {firstName} 👋</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("ar-EG", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Badge variant="outline" className="gap-1 w-fit">
          <Calendar className="w-3 h-3" />
          الفصل الدراسي الأول 2024/2025
        </Badge>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل لوحة التحكم...</CardContent>
        </Card>
      )}

      {!loading && !error && stats && (
      <>
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardCheck className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold text-green-600">{stats.attendance}%</p>
              <p className="text-sm text-muted-foreground">نسبة الحضور</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <GraduationCap className="w-8 h-8 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-blue-600">{stats.gpa}</p>
              <p className="text-sm text-muted-foreground">المعدل التراكمي</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold text-orange-600">
                {stats.completedAssignments}/{stats.totalAssignments}
              </p>
              <p className="text-sm text-muted-foreground">الواجبات المكتملة</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold text-purple-600">+5%</p>
              <p className="text-sm text-muted-foreground">تحسن الأداء</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              جدول اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySchedule.map((lesson) => (
                <div
                  key={lesson.id}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border",
                    lesson.status === "current" && "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
                    lesson.status === "completed" && "opacity-60"
                  )}
                >
                  <div className="text-center w-20">
                    <p className="text-xs text-muted-foreground">الحصة</p>
                    <p className="text-sm font-medium">{lesson.time.split(" - ")[0]}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{lesson.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {lesson.teacher} • {lesson.room}
                    </p>
                  </div>
                  <div>
                    {lesson.status === "completed" && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {lesson.status === "current" && (
                      <Badge className="bg-blue-500">الآن</Badge>
                    )}
                    {lesson.status === "upcoming" && (
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/student/schedule">
                عرض الجدول الكامل
                <ChevronLeft className="w-4 h-4 mr-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              الإشعارات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.map((notif) => (
                <div key={notif.id} className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    notif.type === "assignment" && "bg-orange-100 text-orange-600",
                    notif.type === "grade" && "bg-green-100 text-green-600",
                    notif.type === "announcement" && "bg-blue-100 text-blue-600"
                  )}>
                    {notif.type === "assignment" && <FileText className="w-4 h-4" />}
                    {notif.type === "grade" && <GraduationCap className="w-4 h-4" />}
                    {notif.type === "announcement" && <Bell className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{notif.message}</p>
                    <p className="text-xs text-muted-foreground">{notif.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Assignments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                الواجبات القادمة
              </CardTitle>
              <Badge variant="destructive">{upcomingAssignments.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAssignments.map((assignment) => {
                const dueDate = new Date(assignment.dueDate)
                const today = new Date()
                const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                const isUrgent = diffDays <= 2

                return (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isUrgent ? "bg-red-100" : "bg-orange-100"
                      )}>
                        <FileText className={cn(
                          "w-5 h-5",
                          isUrgent ? "text-red-600" : "text-orange-600"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium">{assignment.title}</p>
                        <p className="text-sm text-muted-foreground">{assignment.subject}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <Badge variant={isUrgent ? "destructive" : "outline"}>
                        {diffDays === 0 ? "اليوم" : diffDays === 1 ? "غداً" : `${diffDays} أيام`}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/student/assignments">
                عرض جميع الواجبات
                <ChevronLeft className="w-4 h-4 mr-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Grades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              آخر الدرجات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentGrades.map((grade) => {
                const percentage = (grade.grade / grade.total) * 100

                return (
                  <div key={grade.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{grade.subject}</p>
                        <p className="text-sm text-muted-foreground">{grade.exam}</p>
                      </div>
                      <div className="text-left">
                        <p className={cn(
                          "font-bold",
                          percentage >= 90 ? "text-green-600" :
                          percentage >= 75 ? "text-blue-600" :
                          percentage >= 60 ? "text-yellow-600" :
                          "text-red-600"
                        )}>
                          {grade.grade}/{grade.total}
                        </p>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/student/grades">
                عرض جميع الدرجات
                <ChevronLeft className="w-4 h-4 mr-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* E-Learning Quick Access */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">التعلم الإلكتروني</h3>
              <p className="text-blue-100 mb-4">
                تابع دروسك وأكمل الاختبارات الإلكترونية
              </p>
              <div className="flex items-center gap-4">
                <Button variant="secondary" asChild>
                  <Link href="/student/elearning">
                    <Play className="w-4 h-4 ml-2" />
                    متابعة التعلم
                  </Link>
                </Button>
                <div className="text-sm">
                  <span className="font-bold">12</span> درس متاح
                </div>
              </div>
            </div>
            <BookOpen className="w-24 h-24 text-blue-300 opacity-50" />
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  )
}



