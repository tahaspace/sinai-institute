"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, Search, Users, Clock, Calendar, FileText, Video, ClipboardCheck, Eye, BarChart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const coursesData = [
  { 
    code: "CS101", 
    name: "مقدمة في البرمجة", 
    students: 45, 
    hours: 3, 
    schedule: "أحد/ثلاثاء 9-10:30",
    progress: 65,
    assignments: 5,
    pendingGrades: 15,
    nextClass: "غداً 9:00 ص"
  },
  { 
    code: "CS201", 
    name: "هياكل البيانات", 
    students: 35, 
    hours: 3, 
    schedule: "إثنين/أربعاء 11-12:30",
    progress: 45,
    assignments: 4,
    pendingGrades: 0,
    nextClass: "بعد غد 11:00 ص"
  },
  { 
    code: "CS301", 
    name: "قواعد البيانات", 
    students: 25, 
    hours: 3, 
    schedule: "أحد/ثلاثاء 2-3:30",
    progress: 30,
    assignments: 3,
    pendingGrades: 8,
    nextClass: "غداً 2:00 م"
  },
  { 
    code: "CS401", 
    name: "الذكاء الاصطناعي", 
    students: 15, 
    hours: 3, 
    schedule: "إثنين/أربعاء 3-4:30",
    progress: 20,
    assignments: 2,
    pendingGrades: 0,
    nextClass: "بعد غد 3:00 م"
  },
]

export default function FacultyCoursesPage() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            المقررات الدراسية
          </h1>
          <p className="text-gray-500 mt-1">إدارة المقررات والمحتوى التعليمي</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "المقررات", value: coursesData.length, icon: BookOpen, color: "indigo" },
          { label: "إجمالي الطلاب", value: coursesData.reduce((s, c) => s + c.students, 0), icon: Users, color: "purple" },
          { label: "الساعات التدريسية", value: coursesData.reduce((s, c) => s + c.hours, 0), icon: Clock, color: "blue" },
          { label: "واجبات معلقة", value: coursesData.reduce((s, c) => s + c.pendingGrades, 0), icon: ClipboardCheck, color: "orange" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`border-r-4 border-r-${stat.color}-500`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-10 h-10 text-${stat.color}-500`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input placeholder="بحث في المقررات..." className="pr-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {coursesData.map((course, i) => (
          <motion.div key={course.code} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="hover:shadow-lg transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className="bg-indigo-100 text-indigo-700 mb-2">{course.code}</Badge>
                    <CardTitle className="text-lg">{course.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4" />
                      {course.schedule}
                    </CardDescription>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-500">الحصة القادمة</p>
                    <p className="text-sm font-medium text-indigo-600">{course.nextClass}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">تقدم المقرر</span>
                    <span className="text-sm font-medium">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Users className="w-5 h-5 mx-auto text-gray-500 mb-1" />
                    <p className="text-lg font-bold">{course.students}</p>
                    <p className="text-xs text-gray-500">طالب</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 mx-auto text-gray-500 mb-1" />
                    <p className="text-lg font-bold">{course.assignments}</p>
                    <p className="text-xs text-gray-500">واجب</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <ClipboardCheck className="w-5 h-5 mx-auto text-gray-500 mb-1" />
                    <p className="text-lg font-bold">{course.pendingGrades}</p>
                    <p className="text-xs text-gray-500">للتصحيح</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                    <Eye className="w-4 h-4 ml-2" />
                    عرض المقرر
                  </Button>
                  <Button variant="outline">
                    <BarChart className="w-4 h-4" />
                  </Button>
                  <Button variant="outline">
                    <Video className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
