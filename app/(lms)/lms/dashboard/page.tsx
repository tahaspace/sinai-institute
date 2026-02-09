"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  Video,
  BookOpen,
  FileText,
  ClipboardList,
  Users,
  Clock,
  Play,
  TrendingUp,
  ChevronLeft,
  Calendar,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// Stats
const stats = [
  { title: "الفصول الافتراضية", value: 12, icon: Video, color: "from-red-500 to-red-600", href: "/lms/virtual-classes" },
  { title: "المحتوى التعليمي", value: 156, icon: BookOpen, color: "from-blue-500 to-blue-600", href: "/lms/content" },
  { title: "الواجبات", value: 24, icon: FileText, color: "from-orange-500 to-orange-600", href: "/lms/assignments" },
  { title: "الاختبارات", value: 8, icon: ClipboardList, color: "from-green-500 to-green-600", href: "/lms/exams" },
]

// Upcoming Classes
const upcomingClasses = [
  { id: 1, title: "مراجعة الرياضيات", class: "3/1", time: "14:00", duration: "60 دقيقة", students: 35, status: "upcoming" },
  { id: 2, title: "شرح الفيزياء", class: "3/2", time: "15:30", duration: "45 دقيقة", students: 32, status: "upcoming" },
  { id: 3, title: "حصة اللغة الإنجليزية", class: "2/1", time: "16:30", duration: "45 دقيقة", students: 30, status: "live" },
]

// Recent Content
const recentContent = [
  { id: 1, title: "شرح التفاضل - الباب الثالث", type: "video", views: 156, date: "2024-12-24" },
  { id: 2, title: "ملخص قوانين نيوتن", type: "pdf", views: 89, date: "2024-12-23" },
  { id: 3, title: "تمارين محلولة", type: "pdf", views: 124, date: "2024-12-22" },
]

// Pending Assignments
const pendingAssignments = [
  { id: 1, title: "واجب الباب الثالث", class: "3/1", submissions: 28, total: 35, deadline: "2024-12-26" },
  { id: 2, title: "تمارين التفاضل", class: "3/2", submissions: 20, total: 32, deadline: "2024-12-27" },
]

// Recent Activity
const recentActivity = [
  { id: 1, type: "submission", message: "أحمد محمد سلم واجب الرياضيات", time: "منذ 5 دقائق" },
  { id: 2, type: "view", message: "45 طالب شاهدوا فيديو التفاضل", time: "منذ ساعة" },
  { id: 3, type: "exam", message: "تم إنشاء اختبار جديد للفصل 3/1", time: "منذ 3 ساعات" },
]

export default function LMSDashboard() {
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
                        الفصل {cls.class} • {cls.time} • {cls.duration}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="font-bold">{cls.students}</p>
                      <p className="text-xs text-muted-foreground">طالب</p>
                    </div>
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
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    activity.type === "submission" && "bg-green-100 text-green-600",
                    activity.type === "view" && "bg-blue-100 text-blue-600",
                    activity.type === "exam" && "bg-orange-100 text-orange-600"
                  )}>
                    {activity.type === "submission" && <FileText className="w-4 h-4" />}
                    {activity.type === "view" && <BookOpen className="w-4 h-4" />}
                    {activity.type === "exam" && <ClipboardList className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
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
              {pendingAssignments.map((assignment) => {
                const progress = (assignment.submissions / assignment.total) * 100

                return (
                  <div key={assignment.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{assignment.title}</p>
                        <p className="text-sm text-muted-foreground">
                          الفصل {assignment.class} • موعد التسليم: {new Date(assignment.deadline).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      <Badge>{assignment.submissions}/{assignment.total}</Badge>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



