"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Calendar, Clock, Download, MapPin, Users, BookOpen, Printer } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// --- API response shapes (served by /api/faculty/schedule) ---
interface Lesson {
  period: number
  subject: string
  room: string
  time: string
}
type WeekSchedule = Record<string, Lesson[]>
interface ScheduleResponse {
  instructor: { id: string; name: string }
  days: string[]
  weekSchedule: WeekSchedule
}

const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"]
const typeColors: { [key: string]: string } = {
  "محاضرة": "border-indigo-400 bg-indigo-50",
  "معمل": "border-green-400 bg-green-50",
  "إرشاد": "border-purple-400 bg-purple-50",
}

export default function FacultySchedulePage() {
  const [data, setData] = useState<ScheduleResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/faculty/schedule`)
        if (!res.ok) {
          throw new Error("فشل في جلب الجدول")
        }
        const json = (await res.json()) as ScheduleResponse
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const weekSchedule: WeekSchedule = data?.weekSchedule ?? {}

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

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الجدول...</CardContent>
        </Card>
      )}

      {/* Schedule Grid */}
      {!loading && !error && (
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
                  {(weekSchedule[day] ?? []).map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-3 rounded-lg border-r-4 ${typeColors["محاضرة"]}`}
                    >
                      <p className="text-xs font-bold text-gray-600">{item.time}</p>
                      <p className="text-sm font-medium mt-1">{item.subject}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">الحصة {item.period}</Badge>
                      </div>
                      {item.room && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {item.room}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {(weekSchedule[day] ?? []).length === 0 && (
                    <div className="text-center text-gray-300 py-8">لا توجد حصص</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
