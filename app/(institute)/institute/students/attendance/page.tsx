"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, Clock, Users, AlertTriangle, CheckCircle, XCircle, TrendingUp } from "lucide-react"

export default function AttendancePage() {
  const [selectedCourse, setSelectedCourse] = useState("all")

  const attendanceStats = [
    { label: "نسبة الحضور العامة", value: "87%", icon: TrendingUp, color: "text-institute-blue" },
    { label: "طلاب محرومين", value: "12", icon: AlertTriangle, color: "text-red-600" },
    { label: "تحذير حرمان", value: "28", icon: Clock, color: "text-yellow-600" },
    { label: "حضور كامل", value: "850", icon: CheckCircle, color: "text-institute-blue" },
  ]

  const courseAttendance = [
    { code: "CS301", name: "الذكاء الاصطناعي", students: 85, present: 78, absent: 7, rate: 91.8 },
    { code: "MATH301", name: "رياضيات متقدمة", students: 120, present: 98, absent: 22, rate: 81.7 },
    { code: "CS302", name: "شبكات الحاسب", students: 75, present: 65, absent: 10, rate: 86.7 },
    { code: "BUS301", name: "إدارة المشاريع", students: 90, present: 82, absent: 8, rate: 91.1 },
    { code: "ENG301", name: "اللغة الإنجليزية المتقدمة", students: 60, present: 45, absent: 15, rate: 75.0 },
  ]

  const warningStudents = [
    { name: "أحمد محمد", course: "MATH301", absences: 8, maxAllowed: 10, rate: 70 },
    { name: "سارة علي", course: "ENG301", absences: 7, maxAllowed: 10, rate: 65 },
    { name: "محمد حسن", course: "CS302", absences: 9, maxAllowed: 10, rate: 60 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-7 h-7 text-institute-blue" />
            الحضور والغياب
          </h1>
          <p className="text-muted-foreground">متابعة حضور الطلاب في المحاضرات</p>
        </div>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="اختر المقرر" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المقررات</SelectItem>
            <SelectItem value="CS301">CS301 - الذكاء الاصطناعي</SelectItem>
            <SelectItem value="MATH301">MATH301 - رياضيات متقدمة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {attendanceStats.map((stat, index) => (
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Course Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              الحضور حسب المقرر
            </CardTitle>
            <CardDescription>نسب الحضور لكل مقرر اليوم</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courseAttendance.map((course, index) => (
                <motion.div
                  key={course.code}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{course.name}</p>
                      <p className="text-sm text-muted-foreground">{course.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-institute-blue text-green-700">{course.present} حاضر</Badge>
                      <Badge className="bg-red-100 text-red-700">{course.absent} غائب</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={course.rate} 
                      className={`h-2 flex-1 ${course.rate < 80 ? "[&>div]:bg-red-500" : "[&>div]:bg-institute-blue"}`} 
                    />
                    <span className={`text-sm font-bold ${course.rate < 80 ? "text-red-600" : "text-institute-blue"}`}>
                      {course.rate}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Warning Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              تحذير حرمان
            </CardTitle>
            <CardDescription>طلاب قريبون من الحد الأقصى للغياب</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {warningStudents.map((student, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{student.name}</h4>
                    <Badge variant="outline">{student.course}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      غيابات: <span className="font-bold text-red-600">{student.absences}</span> / {student.maxAllowed}
                    </span>
                    <span className="text-muted-foreground">
                      نسبة الحضور: <span className="font-bold text-yellow-600">{student.rate}%</span>
                    </span>
                  </div>
                  <Progress value={student.rate} className="h-2 mt-2 [&>div]:bg-yellow-500" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
