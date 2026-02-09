"use client"

import { useState } from "react"
import {
  Calendar,
  Download,
  Clock,
  MapPin,
  User,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Week Schedule
const weekSchedule = {
  الأحد: [
    { period: 1, subject: "الرياضيات", teacher: "أ. محمد أحمد", room: "101", time: "8:00 - 8:45" },
    { period: 2, subject: "اللغة العربية", teacher: "أ. سارة خالد", room: "101", time: "9:00 - 9:45" },
    { period: 3, subject: "الفيزياء", teacher: "أ. أحمد علي", room: "معمل 1", time: "10:00 - 10:45" },
    { period: 4, subject: "استراحة", teacher: "", room: "", time: "10:45 - 11:00" },
    { period: 5, subject: "الإنجليزية", teacher: "أ. نورا محمد", room: "101", time: "11:00 - 11:45" },
    { period: 6, subject: "الكيمياء", teacher: "أ. خالد سعيد", room: "معمل 2", time: "12:00 - 12:45" },
  ],
  الاثنين: [
    { period: 1, subject: "الفيزياء", teacher: "أ. أحمد علي", room: "معمل 1", time: "8:00 - 8:45" },
    { period: 2, subject: "الرياضيات", teacher: "أ. محمد أحمد", room: "101", time: "9:00 - 9:45" },
    { period: 3, subject: "الإنجليزية", teacher: "أ. نورا محمد", room: "101", time: "10:00 - 10:45" },
    { period: 4, subject: "استراحة", teacher: "", room: "", time: "10:45 - 11:00" },
    { period: 5, subject: "اللغة العربية", teacher: "أ. سارة خالد", room: "101", time: "11:00 - 11:45" },
    { period: 6, subject: "الأحياء", teacher: "أ. هالة محمود", room: "معمل 3", time: "12:00 - 12:45" },
  ],
  الثلاثاء: [
    { period: 1, subject: "الكيمياء", teacher: "أ. خالد سعيد", room: "معمل 2", time: "8:00 - 8:45" },
    { period: 2, subject: "الفيزياء", teacher: "أ. أحمد علي", room: "معمل 1", time: "9:00 - 9:45" },
    { period: 3, subject: "الرياضيات", teacher: "أ. محمد أحمد", room: "101", time: "10:00 - 10:45" },
    { period: 4, subject: "استراحة", teacher: "", room: "", time: "10:45 - 11:00" },
    { period: 5, subject: "التربية الدينية", teacher: "أ. علي حسن", room: "101", time: "11:00 - 11:45" },
    { period: 6, subject: "الإنجليزية", teacher: "أ. نورا محمد", room: "101", time: "12:00 - 12:45" },
  ],
  الأربعاء: [
    { period: 1, subject: "اللغة العربية", teacher: "أ. سارة خالد", room: "101", time: "8:00 - 8:45" },
    { period: 2, subject: "الكيمياء", teacher: "أ. خالد سعيد", room: "معمل 2", time: "9:00 - 9:45" },
    { period: 3, subject: "الأحياء", teacher: "أ. هالة محمود", room: "معمل 3", time: "10:00 - 10:45" },
    { period: 4, subject: "استراحة", teacher: "", room: "", time: "10:45 - 11:00" },
    { period: 5, subject: "الرياضيات", teacher: "أ. محمد أحمد", room: "101", time: "11:00 - 11:45" },
    { period: 6, subject: "الفيزياء", teacher: "أ. أحمد علي", room: "معمل 1", time: "12:00 - 12:45" },
  ],
  الخميس: [
    { period: 1, subject: "الإنجليزية", teacher: "أ. نورا محمد", room: "101", time: "8:00 - 8:45" },
    { period: 2, subject: "اللغة العربية", teacher: "أ. سارة خالد", room: "101", time: "9:00 - 9:45" },
    { period: 3, subject: "الرياضيات", teacher: "أ. محمد أحمد", room: "101", time: "10:00 - 10:45" },
    { period: 4, subject: "استراحة", teacher: "", room: "", time: "10:45 - 11:00" },
    { period: 5, subject: "نشاط", teacher: "", room: "الملعب", time: "11:00 - 11:45" },
    { period: 6, subject: "نشاط", teacher: "", room: "الملعب", time: "12:00 - 12:45" },
  ],
}

const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"]

const subjectColors: Record<string, string> = {
  "الرياضيات": "bg-blue-100 border-blue-300 text-blue-800",
  "اللغة العربية": "bg-green-100 border-green-300 text-green-800",
  "الفيزياء": "bg-purple-100 border-purple-300 text-purple-800",
  "الكيمياء": "bg-orange-100 border-orange-300 text-orange-800",
  "الإنجليزية": "bg-pink-100 border-pink-300 text-pink-800",
  "الأحياء": "bg-teal-100 border-teal-300 text-teal-800",
  "التربية الدينية": "bg-amber-100 border-amber-300 text-amber-800",
  "استراحة": "bg-gray-100 border-gray-300 text-gray-600",
  "نشاط": "bg-yellow-100 border-yellow-300 text-yellow-800",
}

export default function StudentSchedulePage() {
  const [selectedDay, setSelectedDay] = useState("الأحد")

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الجدول الدراسي</h1>
          <p className="text-muted-foreground">الفصل الدراسي الأول 2024/2025</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 ml-2" />
          تحميل الجدول
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="week">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="week">عرض أسبوعي</TabsTrigger>
          <TabsTrigger value="day">عرض يومي</TabsTrigger>
        </TabsList>

        {/* Week View */}
        <TabsContent value="week" className="mt-6">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-right font-medium text-muted-foreground">الحصة</th>
                    {days.map((day) => (
                      <th key={day} className="p-4 text-center font-medium">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map((period) => (
                    <tr key={period} className="border-b">
                      <td className="p-4 text-right">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{period}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {weekSchedule["الأحد"][period - 1]?.time}
                          </span>
                        </div>
                      </td>
                      {days.map((day) => {
                        const lesson = weekSchedule[day as keyof typeof weekSchedule][period - 1]
                        const colorClass = subjectColors[lesson?.subject] || "bg-gray-100"
                        
                        return (
                          <td key={day} className="p-2">
                            {lesson && (
                              <div className={cn(
                                "p-3 rounded-lg border text-center",
                                colorClass
                              )}>
                                <p className="font-medium text-sm">{lesson.subject}</p>
                                {lesson.teacher && (
                                  <p className="text-xs mt-1 opacity-75">{lesson.teacher}</p>
                                )}
                                {lesson.room && (
                                  <p className="text-xs opacity-75">{lesson.room}</p>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Day View */}
        <TabsContent value="day" className="mt-6">
          {/* Day Selector */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const currentIndex = days.indexOf(selectedDay)
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : days.length - 1
                setSelectedDay(days[prevIndex])
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="flex gap-2">
              {days.map((day) => (
                <Button
                  key={day}
                  variant={selectedDay === day ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDay(day)}
                >
                  {day}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const currentIndex = days.indexOf(selectedDay)
                const nextIndex = currentIndex < days.length - 1 ? currentIndex + 1 : 0
                setSelectedDay(days[nextIndex])
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Day Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>جدول يوم {selectedDay}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weekSchedule[selectedDay as keyof typeof weekSchedule].map((lesson, index) => {
                  const colorClass = subjectColors[lesson.subject] || "bg-gray-100"
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border",
                        colorClass
                      )}
                    >
                      <div className="text-center w-20">
                        <Badge variant="outline" className="mb-1">{lesson.period}</Badge>
                        <p className="text-xs">{lesson.time}</p>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{lesson.subject}</h4>
                        {lesson.teacher && (
                          <div className="flex items-center gap-4 mt-1 text-sm opacity-75">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {lesson.teacher}
                            </span>
                            {lesson.room && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {lesson.room}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



