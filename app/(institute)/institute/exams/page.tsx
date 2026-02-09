"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import {
  FileText,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  Plus,
  Download,
  BookOpen,
  Award,
  BarChart3,
  ClipboardList,
} from "lucide-react"

export default function ExamsPage() {
  const [activeTab, setActiveTab] = useState("schedules")

  const examSchedules = [
    {
      id: 1,
      course: "الرياضيات (1)",
      code: "MATH101",
      department: "الهندسة",
      date: "2025-01-15",
      time: "9:00 AM",
      duration: "3 ساعات",
      hall: "قاعة A1",
      students: 120,
    },
    {
      id: 2,
      course: "البرمجة المتقدمة",
      code: "CS201",
      department: "الحاسبات",
      date: "2025-01-16",
      time: "11:00 AM",
      duration: "2 ساعات",
      hall: "معمل 3",
      students: 85,
    },
    {
      id: 3,
      course: "مبادئ الإدارة",
      code: "BUS101",
      department: "إدارة الأعمال",
      date: "2025-01-17",
      time: "9:00 AM",
      duration: "2 ساعات",
      hall: "قاعة B2",
      students: 95,
    },
  ]

  const stats = [
    { label: "امتحانات الفصل", value: "156", icon: FileText, color: "text-institute-blue" },
    { label: "امتحانات هذا الأسبوع", value: "12", icon: Calendar, color: "text-institute-blue" },
    { label: "طلاب مسجلين", value: "2,180", icon: Users, color: "text-institute-gold" },
    { label: "نتائج معلنة", value: "89", icon: CheckCircle, color: "text-institute-gold" },
  ]

  const quickLinks = [
    { title: "جداول الامتحانات", href: "/institute/exams", icon: Calendar, color: "text-institute-blue", desc: "عرض وتحميل الجداول" },
    { title: "بنك الأسئلة", href: "/institute/exams/question-bank", icon: BookOpen, color: "text-institute-gold", desc: "إدارة الأسئلة" },
    { title: "إدخال الدرجات", href: "/institute/exams/grades", icon: ClipboardList, color: "text-institute-blue", desc: "رصد الدرجات" },
    { title: "الكنترول", href: "/institute/exams/control", icon: Award, color: "text-institute-gold", desc: "لجان الكنترول" },
    { title: "النتائج", href: "/institute/exams/results", icon: BarChart3, color: "text-institute-blue", desc: "إعلان النتائج" },
    { title: "التظلمات", href: "/institute/exams/appeals", icon: AlertTriangle, color: "text-red-600", desc: "طلبات التظلم" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-7 h-7 text-institute-blue" />
            الامتحانات والتقييم
          </h1>
          <p className="text-muted-foreground">
            إدارة الامتحانات والدرجات والنتائج
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير الجداول
          </Button>
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            إضافة امتحان
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickLinks.map((link, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={link.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 text-center">
                  <link.icon className={`w-8 h-8 mx-auto mb-2 ${link.color}`} />
                  <p className="font-medium text-sm">{link.title}</p>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Exam Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            جدول الامتحانات القادمة
          </CardTitle>
          <CardDescription>امتحانات نهاية الفصل الدراسي الأول 2024/2025</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {examSchedules.map((exam, index) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-institute-blue dark:bg-institute-blue/30 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-institute-blue" />
                  </div>
                  <div>
                    <h4 className="font-medium">{exam.course}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{exam.code}</Badge>
                      <span>•</span>
                      <span>{exam.department}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{exam.date}</p>
                    <p className="text-muted-foreground">{exam.time}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{exam.duration}</p>
                    <p className="text-muted-foreground">{exam.hall}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-institute-blue">{exam.students}</p>
                    <p className="text-muted-foreground">طالب</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
