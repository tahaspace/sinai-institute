"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  BookOpen,
  Users,
  ClipboardCheck,
  Calendar,
  TrendingUp,
  MessageSquare,
  FlaskConical
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

// --- API response shapes (served by /api/faculty/dashboard) ---
interface ScheduleItem {
  id: number
  subject: string
  time: string
  room: string
}
interface RecentStudent {
  name: string
  studentCode: string
}
interface DashboardResponse {
  instructor: { id: string; name: string; title: string }
  stats: { courses: number; students: number; ungraded: number; publications: number }
  todaySchedule: ScheduleItem[]
  recentStudents: RecentStudent[]
}

export default function FacultyDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/faculty/dashboard`)
        if (!res.ok) {
          throw new Error("فشل في جلب لوحة التحكم")
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

  const stats = data?.stats
  const todaySchedule = data?.todaySchedule ?? []
  const recentStudents = data?.recentStudents ?? []
  // No pending-tasks list in the API — derive a single task from ungraded count.
  const pendingTasks =
    stats && stats.ungraded > 0
      ? [{ task: `رصد درجات (${stats.ungraded})`, count: stats.ungraded, deadline: "قريباً" }]
      : []
  const instructorName = data?.instructor?.name ?? ""

  return (
    <div className="space-y-6">
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
      {/* Welcome Header */}
      <div className="bg-gradient-to-l from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">مرحباً {instructorName} 👋</h1>
            <p className="text-indigo-100 mt-1">لديك {todaySchedule.length} محاضرات اليوم و {stats.ungraded} درجة للرصد</p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.courses}</p>
              <p className="text-xs text-indigo-200">مقررات</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.students}</p>
              <p className="text-xs text-indigo-200">طالب</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.ungraded}</p>
              <p className="text-xs text-indigo-200">درجات للرصد</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "المقررات الدراسية", value: stats.courses, icon: BookOpen, color: "indigo", change: "هذا الفصل" },
          { label: "إجمالي الطلاب", value: stats.students, icon: Users, color: "purple", change: "مسجلون" },
          { label: "درجات للرصد", value: stats.ungraded, icon: ClipboardCheck, color: "orange", change: "مهام معلقة" },
          { label: "الأبحاث المنشورة", value: stats.publications, icon: FlaskConical, color: "blue", change: "منشورة" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`border-r-4 border-r-${stat.color}-500 hover:shadow-lg transition-shadow`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-green-600 mt-1">{stat.change}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              جدول اليوم
            </CardTitle>
            <CardDescription>الأحد، 15 يناير 2025</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todaySchedule.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${i === 0 ? 'bg-indigo-50 border-indigo-200' : ''}`}
                >
                  <div className="w-20 text-center">
                    <p className="text-sm font-bold text-indigo-600">{item.time.split(" - ")[0]}</p>
                    <p className="text-xs text-gray-500">{item.time.split(" - ")[1]}</p>
                  </div>
                  <div className="w-1 h-12 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
                  <div className="flex-1">
                    <p className="font-medium">{item.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">القاعة: {item.room}</span>
                    </div>
                  </div>
                  {i === 0 && (
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                      بدء الحصة
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-orange-600" />
              مهام معلقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingTasks.map((task, i) => (
                <div key={i} className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{task.task}</p>
                    <Badge variant="outline" className="text-orange-600 border-orange-300">{task.count}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">الموعد النهائي: {task.deadline}</span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-orange-600">
                      ابدأ
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              تقدم المقررات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { course: "CS101 - مقدمة في البرمجة", progress: 65, students: 45, color: "indigo" },
                { course: "CS201 - هياكل البيانات", progress: 45, students: 35, color: "purple" },
                { course: "CS301 - قواعد البيانات", progress: 30, students: 25, color: "blue" },
                { course: "CS401 - الذكاء الاصطناعي", progress: 20, students: 15, color: "green" },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.course}</span>
                    <span className="text-xs text-gray-500">{item.students} طالب</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.progress} className="flex-1 h-2" />
                    <span className="text-sm font-bold text-gray-600">{item.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Student Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              استفسارات الطلاب الأخيرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentStudents.map((student, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <Avatar>
                    <AvatarFallback className="bg-indigo-100 text-indigo-700">
                      {student.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{student.name}</p>
                    </div>
                    <p className="text-xs text-gray-500">{student.studentCode}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs">رد</Button>
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
