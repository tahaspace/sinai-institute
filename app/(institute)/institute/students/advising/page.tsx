"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { GraduationCap, Users, MessageSquare, Calendar, Clock, TrendingUp, BookOpen } from "lucide-react"

export default function AdvisingPage() {
  const advisingStats = [
    { label: "طلاب تحت الإرشاد", value: "185", icon: Users, color: "text-institute-blue" },
    { label: "جلسات هذا الشهر", value: "42", icon: Calendar, color: "text-institute-blue" },
    { label: "طلاب بحاجة متابعة", value: "12", icon: TrendingUp, color: "text-red-600" },
    { label: "متوسط GPA", value: "2.85", icon: GraduationCap, color: "text-institute-gold" },
  ]

  const studentsNeedingAdvice = [
    { id: 1, name: "أحمد محمد", gpa: 1.8, level: "الثانية", issue: "إنذار أكاديمي", creditHours: 58 },
    { id: 2, name: "سارة علي", gpa: 2.1, level: "الثالثة", issue: "تأخر في التخرج", creditHours: 95 },
    { id: 3, name: "محمد حسن", gpa: 1.5, level: "الأولى", issue: "إنذار ثاني", creditHours: 24 },
    { id: 4, name: "نور سعيد", gpa: 2.3, level: "الرابعة", issue: "اختيار تخصص", creditHours: 120 },
  ]

  const upcomingSessions = [
    { student: "أحمد محمد", date: "2025-01-05", time: "10:00 AM", type: "إرشاد أكاديمي" },
    { student: "سارة علي", date: "2025-01-05", time: "11:30 AM", type: "خطة دراسية" },
    { student: "محمد حسن", date: "2025-01-06", time: "9:00 AM", type: "متابعة إنذار" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-institute-blue" />
            الإرشاد الأكاديمي
          </h1>
          <p className="text-muted-foreground">متابعة ودعم الطلاب أكاديمياً</p>
        </div>
        <Button>
          <Calendar className="w-4 h-4 ml-2" />
          جدولة جلسة إرشاد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {advisingStats.map((stat, index) => (
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
        {/* Students Needing Advice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              طلاب بحاجة لإرشاد
            </CardTitle>
            <CardDescription>طلاب يحتاجون متابعة أكاديمية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentsNeedingAdvice.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                >
                  <Avatar>
                    <AvatarFallback className="bg-institute-blue text-institute-blue">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{student.name}</h4>
                      <Badge variant="outline">{student.level}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-sm font-bold ${student.gpa < 2 ? "text-red-600" : "text-yellow-600"}`}>
                        GPA: {student.gpa}
                      </span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{student.creditHours} ساعة</span>
                    </div>
                    <Badge className="mt-1 bg-red-100 text-red-700">{student.issue}</Badge>
                  </div>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="w-4 h-4 ml-1" />
                    تواصل
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              الجلسات القادمة
            </CardTitle>
            <CardDescription>جلسات الإرشاد المجدولة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingSessions.map((session, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <div className="w-12 h-12 rounded-lg bg-institute-blue flex items-center justify-center">
                    <Clock className="w-6 h-6 text-institute-blue" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{session.student}</h4>
                    <p className="text-sm text-muted-foreground">{session.type}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{session.date}</p>
                    <p className="text-sm text-muted-foreground">{session.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
