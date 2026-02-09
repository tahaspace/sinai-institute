"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Download, Plus } from "lucide-react"

export default function SchedulesPage() {
  const weekDays = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"]
  const timeSlots = ["8:00-9:30", "9:30-11:00", "11:00-12:30", "12:30-2:00", "2:00-3:30", "3:30-5:00"]

  const schedule = {
    "الأحد": {
      "8:00-9:30": { course: "CS301", room: "A101", instructor: "د. أحمد" },
      "11:00-12:30": { course: "MATH201", room: "B202", instructor: "د. سارة" },
    },
    "الإثنين": {
      "9:30-11:00": { course: "BUS101", room: "C303", instructor: "د. محمد" },
      "2:00-3:30": { course: "ACC201", room: "D404", instructor: "د. نورا" },
    },
    "الثلاثاء": {
      "8:00-9:30": { course: "CS301", room: "A101", instructor: "د. أحمد" },
      "11:00-12:30": { course: "ENG301", room: "E505", instructor: "د. هدى" },
    },
    "الأربعاء": {
      "9:30-11:00": { course: "BUS101", room: "C303", instructor: "د. محمد" },
    },
    "الخميس": {
      "8:00-9:30": { course: "MATH201", room: "B202", instructor: "د. سارة" },
    },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-7 h-7 text-institute-blue" />
            الجداول الدراسية
          </h1>
          <p className="text-muted-foreground">جداول المحاضرات لأعضاء هيئة التدريس</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير الجدول
          </Button>
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            إضافة محاضرة
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جدول المحاضرات الأسبوعي</CardTitle>
          <CardDescription>الفصل الدراسي الأول 2024/2025</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted text-sm">الوقت</th>
                  {weekDays.map((day) => (
                    <th key={day} className="border p-2 bg-muted text-sm min-w-[120px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot}>
                    <td className="border p-2 text-center text-sm font-medium bg-muted/50">
                      {slot}
                    </td>
                    {weekDays.map((day) => {
                      const lecture = (schedule as any)[day]?.[slot]
                      return (
                        <td key={`${day}-${slot}`} className="border p-2">
                          {lecture ? (
                            <div className="bg-institute-blue dark:bg-institute-blue/30 p-2 rounded text-sm">
                              <p className="font-bold text-institute-blue dark:text-institute-blue">{lecture.course}</p>
                              <p className="text-xs text-muted-foreground">{lecture.room}</p>
                              <p className="text-xs text-muted-foreground">{lecture.instructor}</p>
                            </div>
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
