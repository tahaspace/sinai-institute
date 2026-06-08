"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  Users,
  GraduationCap,
  Building2,
  FileText,
  Calendar,
  Clock,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  Wallet,
  BarChart3,
} from "lucide-react"

interface DashboardStats {
  students: number
  instructors: number
  departments: number
  courses: number
}

interface DepartmentRow {
  id: string
  name: string
  students: number
  faculty: number
}

interface UpcomingEvent {
  id: string
  title: string
  date: string
  type: "exam"
}

interface AcademicAlert {
  id: string
  student: string
  type: string
  gpa: number | null
  department: string
}

interface TermStats {
  enrolledStudents: number
  offeredCourses: number
  passRate: number
  collectionRate: number
}

interface TermInfo {
  label: string
  studyWeek: string | null
}

export default function InstituteDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [academicAlerts, setAcademicAlerts] = useState<AcademicAlert[]>([])
  const [termStats, setTermStats] = useState<TermStats | null>(null)
  const [term, setTerm] = useState<TermInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/institute/dashboard")
        if (!res.ok) throw new Error("فشل تحميل البيانات")
        const json = await res.json()
        if (!cancelled) {
          setStats(json.stats ?? null)
          setDepartments(json.departments ?? [])
          setUpcomingEvents(json.upcomingEvents ?? [])
          setAcademicAlerts(json.academicAlerts ?? [])
          setTermStats(json.termStats ?? null)
          setTerm(json.term ?? null)
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

  // KPI cards — values come from the API; presentation (icon/colors) stays here.
  const statCards = [
    {
      title: "إجمالي الطلاب",
      value: stats?.students ?? 0,
      icon: Users,
      color: "text-institute-blue",
      bgColor: "bg-gradient-to-br from-institute-blue/10 to-institute-blue/20 dark:bg-institute-blue/20",
    },
    {
      title: "أعضاء هيئة التدريس",
      value: stats?.instructors ?? 0,
      icon: GraduationCap,
      color: "text-institute-gold",
      bgColor: "bg-gradient-to-br from-institute-gold/10 to-institute-gold/20 dark:bg-institute-gold/20",
    },
    {
      title: "الأقسام العلمية",
      value: stats?.departments ?? 0,
      icon: Building2,
      color: "text-institute-blue",
      bgColor: "bg-gradient-to-br from-institute-blue/20 to-institute-gold/10 dark:bg-institute-blue/30",
    },
    {
      title: "المقررات النشطة",
      value: stats?.courses ?? 0,
      icon: BookOpen,
      color: "text-institute-gold",
      bgColor: "bg-gradient-to-br from-institute-gold/20 to-institute-blue/10 dark:bg-institute-gold/30",
    },
  ]

  // Progress-bar denominator: largest department headcount in the response.
  const maxDeptStudents = Math.max(1, ...departments.map((d) => d.students))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-institute-blue to-institute-gold bg-clip-text text-transparent">
            لوحة متابعة المعهد العالي
          </h1>
          <p className="text-muted-foreground">
            مرحباً بك في نظام إدارة المعهد العالي للهندسة والتكنولوجيا
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-institute-blue text-institute-blue">
            <Calendar className="w-3 h-3" />
            {term?.label ?? "الفصل الدراسي الحالي"}
          </Badge>
          {term?.studyWeek && (
            <Badge className="gap-1 bg-institute-gold text-white hover:bg-institute-gold/90">
              <Clock className="w-3 h-3" />
              الأسبوع الدراسي: {term.studyWeek}
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">جارٍ التحميل...</CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{stat.value.toLocaleString("ar-EG")}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* الأقسام العلمية */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              الأقسام العلمية
            </CardTitle>
            <CardDescription>توزيع الطلاب وأعضاء هيئة التدريس على الأقسام</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departments.map((dept, index) => (
                <motion.div
                  key={dept.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4"
                >
                  <div className={`w-3 h-3 rounded-full ${index % 2 === 0 ? "bg-institute-blue" : "bg-institute-gold"}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{dept.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {dept.students} طالب | {dept.faculty} عضو
                      </span>
                    </div>
                    <Progress value={(dept.students / maxDeptStudents) * 100} className="h-2" />
                  </div>
                </motion.div>
              ))}
              {!loading && departments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد أقسام</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* الأحداث القادمة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              الأحداث القادمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100 text-red-600 dark:bg-red-900/30">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                  </div>
                </motion.div>
              ))}
              {!loading && upcomingEvents.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد امتحانات قادمة</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* الإنذارات الأكاديمية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              الإنذارات الأكاديمية
            </CardTitle>
            <CardDescription>طلاب بحاجة لمتابعة أكاديمية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {academicAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-institute-gold/20 to-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-institute-gold" />
                    </div>
                    <div>
                      <p className="font-medium">{alert.student}</p>
                      <p className="text-sm text-muted-foreground">{alert.department}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <Badge variant={alert.type === "إنذار ثاني" ? "destructive" : "secondary"}>
                      {alert.type}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      GPA: {alert.gpa !== null ? alert.gpa.toFixed(2) : "—"}
                    </p>
                  </div>
                </div>
              ))}
              {!loading && academicAlerts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد إنذارات نشطة</p>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/institute/students/warnings">عرض جميع الإنذارات</Link>
            </Button>
          </CardContent>
        </Card>

        {/* إحصائيات سريعة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              إحصائيات الفصل الدراسي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-institute-blue/10 to-institute-blue/5 dark:bg-institute-blue/20 text-center border border-institute-blue/20">
                <CheckCircle className="w-8 h-8 text-institute-blue mx-auto mb-2" />
                <p className="text-2xl font-bold text-institute-blue">
                  {(termStats?.enrolledStudents ?? 0).toLocaleString("ar-EG")}
                </p>
                <p className="text-sm text-muted-foreground">طالب مسجل</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-institute-gold/10 to-institute-gold/5 dark:bg-institute-gold/20 text-center border border-institute-gold/20">
                <FileText className="w-8 h-8 text-institute-gold mx-auto mb-2" />
                <p className="text-2xl font-bold text-institute-gold">
                  {(termStats?.offeredCourses ?? 0).toLocaleString("ar-EG")}
                </p>
                <p className="text-sm text-muted-foreground">مقرر مطروح</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-institute-blue/10 to-institute-gold/10 dark:bg-institute-blue/20 text-center border border-institute-blue/20">
                <Award className="w-8 h-8 text-institute-blue mx-auto mb-2" />
                <p className="text-2xl font-bold text-institute-blue">{termStats?.passRate ?? 0}%</p>
                <p className="text-sm text-muted-foreground">نسبة النجاح</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-institute-gold/10 to-institute-blue/10 dark:bg-institute-gold/20 text-center border border-institute-gold/20">
                <Wallet className="w-8 h-8 text-institute-gold mx-auto mb-2" />
                <p className="text-2xl font-bold text-institute-gold">{termStats?.collectionRate ?? 0}%</p>
                <p className="text-sm text-muted-foreground">نسبة التحصيل</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-institute-blue hover:bg-institute-blue/5" asChild>
              <Link href="/institute/admission">
                <UserPlus className="w-6 h-6 text-institute-blue" />
                <span>قبول طالب جديد</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-institute-gold hover:bg-institute-gold/5" asChild>
              <Link href="/institute/exams/grades">
                <FileText className="w-6 h-6 text-institute-gold" />
                <span>إدخال الدرجات</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-institute-blue hover:bg-institute-blue/5" asChild>
              <Link href="/institute/finance/collection">
                <Wallet className="w-6 h-6 text-institute-blue" />
                <span>تحصيل رسوم</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-institute-gold hover:bg-institute-gold/5" asChild>
              <Link href="/institute/students/graduation">
                <Award className="w-6 h-6 text-institute-gold" />
                <span>طلبات التخرج</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
