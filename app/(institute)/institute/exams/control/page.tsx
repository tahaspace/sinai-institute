"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Award, Users, FileText, CheckCircle, Clock, Settings } from "lucide-react"

interface Committee {
  id: string
  name: string
  department: string
  head: string
  members: number
  courses: number
  status: string
}

interface Task {
  id: string
  title: string
  status: string
  assignee: string
  committee: string
}

interface ControlData {
  committees: Committee[]
  tasks: Task[]
  stats: { committees: number; active: number; pendingTasks: number }
}

export default function ControlPage() {
  const [data, setData] = useState<ControlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/institute/exams/control")
        if (!res.ok) {
          const b = await res.json().catch(() => ({}))
          throw new Error(b.error || "فشل في جلب البيانات")
        }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const committees = data?.committees ?? []
  const tasks = data?.tasks ?? []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "done":
        return <Badge className="bg-institute-blue text-green-700"><CheckCircle className="w-3 h-3 ml-1" />مكتمل</Badge>
      case "in_progress":
      case "inprogress":
        return <Badge className="bg-institute-blue text-blue-700"><Clock className="w-3 h-3 ml-1" />قيد التنفيذ</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 ml-1" />في الانتظار</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-7 h-7 text-institute-blue" />
            الكنترول
          </h1>
          <p className="text-muted-foreground">إدارة لجان الكنترول ومراجعة النتائج</p>
        </div>
        <Button>
          <Settings className="w-4 h-4 ml-2" />
          إعدادات الكنترول
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">جارٍ التحميل...</CardContent>
        </Card>
      )}
      {error && (
        <Card>
          <CardContent className="py-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Committees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              لجان الكنترول
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {committees.map((committee, index) => (
                <motion.div
                  key={committee.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{committee.name}</h4>
                      <p className="text-sm text-muted-foreground">رئيس اللجنة: {committee.head}</p>
                    </div>
                    <Badge className={committee.status === "active" ? "bg-institute-blue text-green-700" : "bg-yellow-100 text-yellow-700"}>
                      {committee.status === "active" ? "نشط" : "معلق"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{committee.members} أعضاء</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>{committee.courses} مقرر</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              مهام الكنترول
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">اللجنة: {task.committee || "—"} · المسؤول: {task.assignee || "—"}</p>
                  </div>
                  {getStatusBadge(task.status)}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
