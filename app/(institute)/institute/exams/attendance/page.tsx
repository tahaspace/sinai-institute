"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { CalendarX, Ban, AlertTriangle, CheckCircle2 } from "lucide-react"

interface CourseLite { id: string; code: string; nameAr: string }
interface AttRow {
  enrollmentId: string
  studentCode: string
  name: string
  sessions: number
  attended: number
  absent: number
  attendancePct: number
  absencePct: number
  warningStage: 0 | 1 | 2 | 3
  banned: boolean
  gradeStatusCode: string | null
}
interface Report {
  course: { code: string; name: string }
  thresholds: { warnAt: number; banAbsenceAbove: number }
  rows: AttRow[]
  summary: { total: number; warned: number; banned: number }
}

const STAGE: Record<number, { label: string; cls: string }> = {
  0: { label: "منتظم", cls: "bg-green-100 text-green-700" },
  1: { label: "إنذار أول", cls: "bg-yellow-100 text-yellow-700" },
  2: { label: "إنذار ثانٍ", cls: "bg-orange-100 text-orange-700" },
  3: { label: "إنذار نهائي", cls: "bg-red-100 text-red-700" },
}

export default function AttendanceReportPage() {
  const [courses, setCourses] = useState<CourseLite[]>([])
  const [courseId, setCourseId] = useState("")
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (cid?: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/institute/attendance-report${cid ? `?courseId=${cid}` : ""}`)
      if (!res.ok) throw new Error("فشل في تحميل تقرير الحضور")
      const json = await res.json()
      setCourses(json.courses ?? [])
      setReport(json.report ?? null)
      if (json.selectedCourseId) setCourseId(json.selectedCourseId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onCourse = (cid: string) => { setCourseId(cid); load(cid) }

  const applyBan = async (enrollmentId: string) => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/institute/attendance-report`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "فشل في تطبيق الحرمان") }
      await load(courseId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarX className="w-7 h-7 text-red-600" />
          تقرير الحضور والحرمان
        </h1>
        <p className="text-muted-foreground">
          إنذارات الغياب على ثلاث مراحل، ثم الحرمان (تجاوز نسبة الغياب المسموحة) الذي يُرسب الطالب في المقرر
        </p>
      </div>

      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}

      {report && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center"><CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-600" /><p className="text-2xl font-bold">{report.summary.total}</p><p className="text-xs text-muted-foreground">إجمالي الطلاب</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><AlertTriangle className="w-6 h-6 mx-auto mb-1 text-amber-600" /><p className="text-2xl font-bold">{report.summary.warned}</p><p className="text-xs text-muted-foreground">تحت الإنذار</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><Ban className="w-6 h-6 mx-auto mb-1 text-red-600" /><p className="text-2xl font-bold">{report.summary.banned}</p><p className="text-xs text-muted-foreground">مستحق الحرمان</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <Select value={courseId} onValueChange={onCourse}>
            <SelectTrigger className="md:w-72"><SelectValue placeholder="اختر المقرر" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.nameAr}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{report ? `${report.course.code} - ${report.course.name}` : "تقرير الحضور"}</CardTitle>
          <CardDescription>
            {report ? `حد الإنذار عند الحضور ≤ ${report.thresholds.warnAt}% · الحرمان عند تجاوز الغياب ${report.thresholds.banAbsenceAbove}%` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">جارٍ التحميل...</div>
          ) : !report || report.rows.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">لا توجد بيانات حضور لهذا المقرر</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>الرقم</TableHead><TableHead>الاسم</TableHead>
                <TableHead className="text-center">المحاضرات</TableHead><TableHead className="text-center">حضور</TableHead>
                <TableHead className="text-center">غياب</TableHead><TableHead className="text-center">نسبة الحضور</TableHead>
                <TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">إجراء</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {report.rows.map((r) => (
                  <TableRow key={r.enrollmentId}>
                    <TableCell className="font-mono">{r.studentCode}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-center">{r.sessions}</TableCell>
                    <TableCell className="text-center text-green-700">{r.attended}</TableCell>
                    <TableCell className="text-center text-red-700">{r.absent}</TableCell>
                    <TableCell className="text-center">
                      <span className={r.attendancePct < 75 ? "text-red-600 font-bold" : ""}>{r.attendancePct}%</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.gradeStatusCode === "DN" ? <Badge className="bg-red-200 text-red-800">محروم (DN)</Badge>
                        : r.banned ? <Badge className="bg-red-100 text-red-700">مستحق الحرمان</Badge>
                        : <Badge className={STAGE[r.warningStage].cls}>{STAGE[r.warningStage].label}</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.banned && r.gradeStatusCode !== "DN" ? (
                        <Button size="sm" variant="outline" className="text-red-600" disabled={busy} onClick={() => applyBan(r.enrollmentId)}>
                          <Ban className="w-3.5 h-3.5 ml-1" />تطبيق الحرمان
                        </Button>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
