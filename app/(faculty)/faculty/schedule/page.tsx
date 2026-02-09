"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar, Clock, Download, MapPin, Users, BookOpen, Printer, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const scheduleData = {
  "الأحد": [
    { time: "09:00 - 10:30", course: "CS101 - مقدمة في البرمجة", type: "محاضرة", hall: "A101", students: 45 },
    { time: "14:00 - 15:30", course: "CS301 - قواعد البيانات", type: "محاضرة", hall: "B201", students: 25 },
  ],
  "الإثنين": [
    { time: "11:00 - 12:30", course: "CS201 - هياكل البيانات", type: "معمل", hall: "Lab 3", students: 35 },
    { time: "15:00 - 16:30", course: "CS401 - الذكاء الاصطناعي", type: "محاضرة", hall: "C101", students: 15 },
  ],
  "الثلاثاء": [
    { time: "09:00 - 10:30", course: "CS101 - مقدمة في البرمجة", type: "معمل", hall: "Lab 1", students: 45 },
    { time: "14:00 - 15:30", course: "CS301 - قواعد البيانات", type: "معمل", hall: "Lab 2", students: 25 },
  ],
  "الأربعاء": [
    { time: "11:00 - 12:30", course: "CS201 - هياكل البيانات", type: "محاضرة", hall: "A102", students: 35 },
    { time: "15:00 - 16:30", course: "CS401 - الذكاء الاصطناعي", type: "معمل", hall: "Lab 4", students: 15 },
    { time: "17:00 - 18:00", course: "ساعات مكتبية", type: "إرشاد", hall: "مكتب 205", students: null },
  ],
  "الخميس": [
    { time: "10:00 - 11:00", course: "ساعات مكتبية", type: "إرشاد", hall: "مكتب 205", students: null },
  ],
}

const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"]
const typeColors: { [key: string]: string } = {
  "محاضرة": "border-indigo-400 bg-indigo-50",
  "معمل": "border-green-400 bg-green-50",
  "إرشاد": "border-purple-400 bg-purple-50",
}

export default function FacultySchedulePage() {
  const [selectedWeek, setSelectedWeek] = useState("current")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-indigo-600" />
            الجدول الأكاديمي
          </h1>
          <p className="text-gray-500 mt-1">الفصل الدراسي الأول 2024/2025</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Printer className="w-4 h-4 ml-2" />طباعة</Button>
          <Button variant="outline"><Download className="w-4 h-4 ml-2" />تصدير</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "الساعات التدريسية", value: "12 ساعة", icon: Clock, color: "indigo" },
          { label: "المحاضرات", value: "6", icon: BookOpen, color: "blue" },
          { label: "المعامل", value: "4", icon: Calendar, color: "green" },
          { label: "الساعات المكتبية", value: "2", icon: Users, color: "purple" },
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

      {/* Schedule Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>جدول الأسبوع</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-indigo-400" />
                <span className="text-sm">محاضرة</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-400" />
                <span className="text-sm">معمل</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-400" />
                <span className="text-sm">إرشاد</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {days.map((day) => (
              <div key={day} className="space-y-3">
                <div className="text-center font-bold text-gray-700 pb-2 border-b">{day}</div>
                <div className="space-y-2">
                  {(scheduleData as any)[day]?.map((item: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-3 rounded-lg border-r-4 ${typeColors[item.type]}`}
                    >
                      <p className="text-xs font-bold text-gray-600">{item.time}</p>
                      <p className="text-sm font-medium mt-1">{item.course}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{item.type}</Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {item.hall}
                        {item.students && (
                          <>
                            <span className="mx-1">•</span>
                            <Users className="w-3 h-3" />
                            {item.students}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )) || (
                    <div className="text-center text-gray-300 py-8">لا توجد حصص</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
