"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Download, Plus } from "lucide-react"

// --- API response shapes (served by /api/institute/faculty/schedules) ---
interface Lecture {
  course: string
  room: string
  instructor: string
}
type Schedule = Record<string, Record<string, Lecture>>
interface SchedulesResponse {
  days: string[]
  timeSlots: string[]
  schedule: Schedule
}

export default function SchedulesPage() {
  const [days, setDays] = useState<string[]>([])
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [schedule, setSchedule] = useState<Schedule>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/faculty/schedules`)
        if (!res.ok) {
          throw new Error("فشل في جلب الجداول")
        }
        const json = (await res.json()) as SchedulesResponse
        if (!cancelled) {
          setDays(json.days ?? [])
          setTimeSlots(json.timeSlots ?? [])
          setSchedule(json.schedule ?? {})
        }
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

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الجداول...</CardContent>
        </Card>
      )}

      {!loading && !error && (
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
                  {days.map((day) => (
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
                    {days.map((day) => {
                      const lecture = schedule[day]?.[slot]
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
      )}
    </div>
  )
}
