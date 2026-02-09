"use client"

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
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  Wallet,
  BarChart3,
  PieChart,
} from "lucide-react"

export default function InstituteDashboard() {
  // إحصائيات المعهد
  const stats = [
    {
      title: "إجمالي الطلاب",
      value: "2,548",
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "text-institute-blue",
      bgColor: "bg-gradient-to-br from-institute-blue/10 to-institute-blue/20 dark:bg-institute-blue/20",
    },
    {
      title: "أعضاء هيئة التدريس",
      value: "124",
      change: "+3",
      trend: "up",
      icon: GraduationCap,
      color: "text-institute-gold",
      bgColor: "bg-gradient-to-br from-institute-gold/10 to-institute-gold/20 dark:bg-institute-gold/20",
    },
    {
      title: "الأقسام العلمية",
      value: "8",
      change: "0",
      trend: "stable",
      icon: Building2,
      color: "text-institute-blue",
      bgColor: "bg-gradient-to-br from-institute-blue/20 to-institute-gold/10 dark:bg-institute-blue/30",
    },
    {
      title: "المقررات النشطة",
      value: "156",
      change: "+8",
      trend: "up",
      icon: BookOpen,
      color: "text-institute-gold",
      bgColor: "bg-gradient-to-br from-institute-gold/20 to-institute-blue/10 dark:bg-institute-gold/30",
    },
  ]

  // الأقسام العلمية
  const departments = [
    { name: "قسم الهندسة", students: 520, faculty: 25, color: "bg-institute-blue" },
    { name: "قسم الحاسبات", students: 480, faculty: 22, color: "bg-institute-gold" },
    { name: "قسم إدارة الأعمال", students: 420, faculty: 18, color: "bg-institute-blue" },
    { name: "قسم المحاسبة", students: 380, faculty: 16, color: "bg-institute-gold" },
    { name: "قسم السياحة", students: 250, faculty: 12, color: "bg-institute-blue" },
    { name: "قسم الإعلام", students: 220, faculty: 14, color: "bg-institute-gold" },
    { name: "قسم اللغات", students: 180, faculty: 10, color: "bg-institute-blue" },
    { name: "قسم الخدمة الاجتماعية", students: 98, faculty: 7, color: "bg-institute-gold" },
  ]

  // الأحداث القادمة
  const upcomingEvents = [
    { title: "بدء امتحانات نصف الفصل", date: "15 يناير 2025", type: "exam" },
    { title: "آخر موعد لتسجيل المقررات", date: "20 يناير 2025", type: "registration" },
    { title: "اجتماع مجلس المعهد", date: "25 يناير 2025", type: "meeting" },
    { title: "ورشة عمل أكاديمية", date: "1 فبراير 2025", type: "workshop" },
  ]

  // الإنذارات الأكاديمية
  const academicAlerts = [
    { student: "أحمد محمود", type: "إنذار أول", gpa: "1.8", department: "الهندسة" },
    { student: "سارة أحمد", type: "إنذار ثاني", gpa: "1.5", department: "الحاسبات" },
    { student: "محمد علي", type: "إنذار أول", gpa: "1.9", department: "إدارة الأعمال" },
  ]

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
            الفصل الدراسي الأول 2024/2025
          </Badge>
          <Badge className="gap-1 bg-institute-gold text-white hover:bg-institute-gold/90">
            <Clock className="w-3 h-3" />
            الأسبوع الدراسي: 12
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
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
                  <div className={`flex items-center gap-1 text-sm ${
                    stat.trend === "up" ? "text-institute-blue" : stat.trend === "down" ? "text-red-600" : "text-gray-600"
                  }`}>
                    {stat.trend === "up" && <TrendingUp className="w-4 h-4" />}
                    {stat.trend === "down" && <TrendingDown className="w-4 h-4" />}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{stat.value}</p>
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
                  key={dept.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4"
                >
                  <div className={`w-3 h-3 rounded-full ${dept.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{dept.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {dept.students} طالب | {dept.faculty} عضو
                      </span>
                    </div>
                    <Progress value={(dept.students / 520) * 100} className="h-2" />
                  </div>
                </motion.div>
              ))}
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
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    event.type === "exam" ? "bg-red-100 text-red-600 dark:bg-red-900/30" :
                    event.type === "registration" ? "bg-institute-blue/10 text-institute-blue" :
                    event.type === "meeting" ? "bg-institute-gold/10 text-institute-gold" :
                    "bg-institute-blue text-institute-blue dark:bg-institute-blue/30"
                  }`}>
                    {event.type === "exam" ? <FileText className="w-4 h-4" /> :
                     event.type === "registration" ? <UserPlus className="w-4 h-4" /> :
                     event.type === "meeting" ? <Users className="w-4 h-4" /> :
                     <BookOpen className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                  </div>
                </motion.div>
              ))}
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
              {academicAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
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
                    <p className="text-sm text-muted-foreground mt-1">GPA: {alert.gpa}</p>
                  </div>
                </div>
              ))}
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
                <p className="text-2xl font-bold text-institute-blue">2,180</p>
                <p className="text-sm text-muted-foreground">طالب مسجل</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-institute-gold/10 to-institute-gold/5 dark:bg-institute-gold/20 text-center border border-institute-gold/20">
                <FileText className="w-8 h-8 text-institute-gold mx-auto mb-2" />
                <p className="text-2xl font-bold text-institute-gold">156</p>
                <p className="text-sm text-muted-foreground">مقرر مطروح</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-institute-blue/10 to-institute-gold/10 dark:bg-institute-blue/20 text-center border border-institute-blue/20">
                <Award className="w-8 h-8 text-institute-blue mx-auto mb-2" />
                <p className="text-2xl font-bold text-institute-blue">89%</p>
                <p className="text-sm text-muted-foreground">نسبة النجاح</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-institute-gold/10 to-institute-blue/10 dark:bg-institute-gold/20 text-center border border-institute-gold/20">
                <Wallet className="w-8 h-8 text-institute-gold mx-auto mb-2" />
                <p className="text-2xl font-bold text-institute-gold">92%</p>
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
