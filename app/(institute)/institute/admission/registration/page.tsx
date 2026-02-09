"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { GraduationCap, Search, Calendar, Clock, BookOpen, CheckCircle, AlertTriangle } from "lucide-react"

export default function RegistrationPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const registrationPeriod = {
    startDate: "2025-01-05",
    endDate: "2025-01-20",
    status: "open",
    daysLeft: 12,
  }

  const availableCourses = [
    { code: "CS301", name: "الذكاء الاصطناعي", hours: 3, instructor: "د. أحمد محمد", seats: 40, enrolled: 35, schedule: "أحد - ثلاثاء 9:00-10:30" },
    { code: "CS302", name: "شبكات الحاسب", hours: 3, instructor: "د. سارة علي", seats: 35, enrolled: 30, schedule: "إثنين - أربعاء 11:00-12:30" },
    { code: "CS303", name: "هندسة البرمجيات", hours: 3, instructor: "د. محمد حسن", seats: 40, enrolled: 25, schedule: "أحد - ثلاثاء 2:00-3:30" },
    { code: "MATH301", name: "رياضيات متقدمة", hours: 3, instructor: "د. نورا سعيد", seats: 50, enrolled: 45, schedule: "إثنين - أربعاء 9:00-10:30" },
    { code: "ELEC301", name: "نظم مدمجة", hours: 3, instructor: "د. علي محمود", seats: 30, enrolled: 28, schedule: "خميس 9:00-12:00" },
  ]

  const stats = [
    { label: "طلاب مسجلين", value: "1,850", icon: GraduationCap, color: "text-institute-blue" },
    { label: "مقررات مطروحة", value: "156", icon: BookOpen, color: "text-institute-blue" },
    { label: "متوسط الساعات", value: "15", icon: Clock, color: "text-institute-gold" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-institute-blue" />
            تسجيل المقررات
          </h1>
          <p className="text-muted-foreground">الفصل الدراسي الثاني 2024/2025</p>
        </div>
        <Badge className={`text-lg px-4 py-2 ${
          registrationPeriod.status === "open" ? "bg-institute-blue text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {registrationPeriod.status === "open" ? "التسجيل مفتوح" : "التسجيل مغلق"}
        </Badge>
      </div>

      {/* Registration Period */}
      <Card className="bg-gradient-to-br from-institute-blue to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">فترة التسجيل</h3>
              <p className="text-white/80">
                من {registrationPeriod.startDate} إلى {registrationPeriod.endDate}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{registrationPeriod.daysLeft}</p>
                <p className="text-white/80 text-sm">يوم متبقي</p>
              </div>
              <Calendar className="w-12 h-12 text-white/50" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث عن مقرر..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Available Courses */}
      <Card>
        <CardHeader>
          <CardTitle>المقررات المتاحة للتسجيل</CardTitle>
          <CardDescription>اختر المقررات التي تريد تسجيلها</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {availableCourses.map((course, index) => {
              const seatPercentage = (course.enrolled / course.seats) * 100
              const isAlmostFull = seatPercentage >= 90
              
              return (
                <motion.div
                  key={course.code}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox id={course.code} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{course.name}</h4>
                      <Badge variant="outline">{course.code}</Badge>
                      <Badge className="bg-institute-blue text-institute-blue">{course.hours} ساعات</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{course.instructor}</span>
                      <span>•</span>
                      <span>{course.schedule}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={seatPercentage} className="h-2 flex-1 max-w-48" />
                      <span className={`text-sm ${isAlmostFull ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        {course.enrolled}/{course.seats}
                      </span>
                      {isAlmostFull && <AlertTriangle className="w-4 h-4 text-red-600" />}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <CheckCircle className="w-4 h-4 ml-2" />
                    تسجيل
                  </Button>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
