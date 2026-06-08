"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClipboardList, Save, Upload, Download, Search } from "lucide-react"

// --- API shapes ---
interface CourseLite { id: string; code: string; nameAr: string }
interface CourseMax {
  id: string
  code: string
  nameAr: string
  midtermMax: number
  finalMax: number
  practicalMax: number
  homeworkMax: number
}
interface RosterRow {
  enrollmentId: string
  studentCode: string
  name: string
  midterm: number | null
  final: number | null
  practical: number | null
  homework: number | null
  total: number
  letterGrade: string | null
  gradeStatusCode: string | null
  statusName: string | null
}
interface StatusOption { code: string; name: string }
type Component = "midterm" | "final" | "practical" | "homework"
type Edits = Record<string, Partial<Record<Component, number>>>

export default function GradesPage() {
  const [courses, setCourses] = useState<CourseLite[]>([])
  const [statuses, setStatuses] = useState<StatusOption[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [course, setCourse] = useState<CourseMax | null>(null)
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [edits, setEdits] = useState<Edits>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Initial load: no courseId → the API defaults to the first course and returns the full course list.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/institute/exams/grades`)
        if (!res.ok) throw new Error("فشل في جلب الدرجات")
        const json = await res.json()
        if (cancelled) return
        setCourses(json.courses ?? [])
        setStatuses(json.statuses ?? [])
        setCourse(json.course ?? null)
        setRoster(json.roster ?? [])
        if (json.course?.id) setSelectedCourseId(json.course.id)
        setLoading(false)
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message)
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Refetch the roster for a specific course (used on course change and after save).
  const loadCourse = useCallback(async (courseId: string) => {
    setLoading(true)
    setError(null)
    setEdits({})
    try {
      const res = await fetch(`/api/institute/exams/grades?courseId=${courseId}`)
      if (!res.ok) throw new Error("فشل في جلب الدرجات")
      const json = await res.json()
      setCourse(json.course ?? null)
      setRoster(json.roster ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Refetch whenever the selected course changes (skip the very first selection — initial load already has it).
  useEffect(() => {
    if (selectedCourseId && course && selectedCourseId !== course.id) {
      loadCourse(selectedCourseId)
    }
  }, [selectedCourseId, course, loadCourse])

  const valueOf = (row: RosterRow, c: Component): number =>
    edits[row.enrollmentId]?.[c] ?? (row[c] ?? 0)

  const setEdit = (enrollmentId: string, c: Component, raw: string) => {
    const n = Math.max(0, Number(raw) || 0)
    setEdits((prev) => ({ ...prev, [enrollmentId]: { ...prev[enrollmentId], [c]: n } }))
  }

  const rowTotal = (row: RosterRow) =>
    valueOf(row, "midterm") + valueOf(row, "final") + valueOf(row, "practical") + valueOf(row, "homework")

  const courseMaxTotal = course
    ? course.midtermMax + course.finalMax + course.practicalMax + course.homeworkMax
    : 100

  const dirtyCount = Object.keys(edits).length

  // Save each edited enrollment via PATCH, then refetch the roster and clear edits.
  // The PATCH flows straight into the student's grades — intended.
  const saveAll = async () => {
    const ids = Object.keys(edits)
    if (!ids.length) return
    setSaving(true)
    setError(null)
    try {
      for (const enrollmentId of ids) {
        await fetch(`/api/institute/exams/grades`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enrollmentId, ...edits[enrollmentId] }),
        })
      }
      await loadCourse(selectedCourseId)
    } catch {
      setError("فشل في حفظ الدرجات")
    } finally {
      setSaving(false)
    }
  }

  // Control-head verbal grade: set a result-state code directly (I/E/W/NE/DN/FW/DS/BL/TR),
  // or "__auto" to re-derive the letter from the recorded scores. Recomputes CGPA server-side.
  const setStatus = async (row: RosterRow, value: string) => {
    setSaving(true)
    setError(null)
    try {
      const body = value === "__auto"
        ? { enrollmentId: row.enrollmentId, midterm: row.midterm ?? 0, final: row.final ?? 0, practical: row.practical ?? 0, homework: row.homework ?? 0 }
        : { enrollmentId: row.enrollmentId, statusCode: value }
      const res = await fetch(`/api/institute/exams/grades`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "فشل في تحديث الحالة")
      }
      await loadCourse(selectedCourseId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const specialCodes = new Set(statuses.map((s) => s.code))

  const filtered = roster.filter(
    (r) => r.name.includes(searchTerm) || r.studentCode.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-institute-blue" />
            إدخال الدرجات
          </h1>
          <p className="text-muted-foreground">رصد درجات الطلاب</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 ml-2" />
            استيراد
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button onClick={saveAll} disabled={saving || dirtyCount === 0}>
            <Save className="w-4 h-4 ml-2" />
            {saving ? "جارٍ الحفظ..." : `حفظ${dirtyCount ? ` (${dirtyCount})` : ""}`}
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}

      {/* Course Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="اختر المقرر" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن طالب..."
                className="pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle>درجات الطلاب</CardTitle>
          <CardDescription>
            {course
              ? `${course.code} - ${course.nameAr} | أعمال الفصل: ${course.midtermMax} | النهائي: ${course.finalMax} | عملي: ${course.practicalMax} | أعمال السنة: ${course.homeworkMax}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">جارٍ تحميل القائمة...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">لا يوجد طلاب مسجلون في هذا المقرر</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطالب</TableHead>
                  <TableHead>اسم الطالب</TableHead>
                  <TableHead className="text-center">أعمال الفصل ({course?.midtermMax ?? 0})</TableHead>
                  <TableHead className="text-center">النهائي ({course?.finalMax ?? 0})</TableHead>
                  <TableHead className="text-center">عملي ({course?.practicalMax ?? 0})</TableHead>
                  <TableHead className="text-center">أعمال السنة ({course?.homeworkMax ?? 0})</TableHead>
                  <TableHead className="text-center">المجموع ({courseMaxTotal})</TableHead>
                  <TableHead className="text-center">التقدير</TableHead>
                  <TableHead className="text-center">الحالة (الكنترول)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const total = rowTotal(row)
                  const cols: { c: Component; max: number }[] = [
                    { c: "midterm", max: course?.midtermMax ?? 0 },
                    { c: "final", max: course?.finalMax ?? 0 },
                    { c: "practical", max: course?.practicalMax ?? 0 },
                    { c: "homework", max: course?.homeworkMax ?? 0 },
                  ]
                  return (
                    <TableRow key={row.enrollmentId}>
                      <TableCell className="font-mono">{row.studentCode}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      {cols.map(({ c, max }) => (
                        <TableCell key={c}>
                          <Input
                            type="number"
                            className="w-20 text-center mx-auto"
                            value={valueOf(row, c)}
                            max={max}
                            min={0}
                            disabled={max === 0}
                            onChange={(e) => setEdit(row.enrollmentId, c, e.target.value)}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {total}/{courseMaxTotal}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{row.letterGrade ?? "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={row.gradeStatusCode && specialCodes.has(row.gradeStatusCode) ? row.gradeStatusCode : "__auto"}
                          onValueChange={(v) => setStatus(row, v)}
                          disabled={saving}
                        >
                          <SelectTrigger className="w-36 mx-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__auto">تلقائي (من الدرجات)</SelectItem>
                            {statuses.map((s) => (
                              <SelectItem key={s.code} value={s.code}>
                                {s.code} — {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
