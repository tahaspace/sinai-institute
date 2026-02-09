"use client"

import { motion } from "framer-motion"
import { 
  BookOpen, 
  Users, 
  ClipboardCheck, 
  Calendar,
  Clock,
  FileText,
  TrendingUp,
  Award,
  MessageSquare,
  Bell,
  FlaskConical,
  GraduationCap
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

const todaySchedule = [
  { time: "09:00 - 10:30", course: "مقدمة في البرمجة", type: "محاضرة", hall: "A101", students: 45 },
  { time: "11:00 - 12:30", course: "هياكل البيانات", type: "معمل", hall: "Lab 3", students: 30 },
  { time: "14:00 - 15:00", course: "ساعات مكتبية", type: "إرشاد", hall: "مكتب 205", students: null },
]

const pendingTasks = [
  { task: "تصحيح واجبات CS101", count: 15, deadline: "غداً" },
  { task: "رصد درجات المنتصف", count: 45, deadline: "بعد 3 أيام" },
  { task: "مراجعة طلب تحويل", count: 2, deadline: "اليوم" },
]

const recentStudents = [
  { name: "أحمد محمد", course: "CS101", query: "استفسار عن المشروع", time: "منذ ساعة" },
  { name: "سارة علي", course: "CS201", query: "طلب موعد", time: "منذ 3 ساعات" },
  { name: "محمود حسن", course: "CS101", query: "تظلم في الدرجات", time: "أمس" },
]

export default function FacultyDashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-l from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">مرحباً د. محمد 👋</h1>
            <p className="text-indigo-100 mt-1">لديك 3 محاضرات اليوم و 15 واجب للتصحيح</p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">4</p>
              <p className="text-xs text-indigo-200">مقررات</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold">120</p>
              <p className="text-xs text-indigo-200">طالب</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold">12</p>
              <p className="text-xs text-indigo-200">ساعة تدريسية</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "المقررات الدراسية", value: 4, icon: BookOpen, color: "indigo", change: "+1 هذا الفصل" },
          { label: "إجمالي الطلاب", value: 120, icon: Users, color: "purple", change: "+15 طالب" },
          { label: "الأبحاث المنشورة", value: 8, icon: FlaskConical, color: "blue", change: "+2 هذا العام" },
          { label: "طلاب الدراسات العليا", value: 5, icon: GraduationCap, color: "green", change: "تحت الإشراف" },
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
                  key={i} 
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
                    <p className="font-medium">{item.course}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{item.type}</Badge>
                      <span className="text-xs text-gray-500">القاعة: {item.hall}</span>
                      {item.students && <span className="text-xs text-gray-500">• {item.students} طالب</span>}
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
                      <span className="text-xs text-gray-400">{student.time}</span>
                    </div>
                    <p className="text-xs text-gray-500">{student.course}</p>
                    <p className="text-sm text-gray-600 mt-1">{student.query}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs">رد</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
