"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { ClipboardCheck, Search, Save, Users, BarChart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- API shapes ---
interface FacultyCourseLite { id: string; code: string; name: string; students: number }
interface CourseMax { id: string; code: string; nameAr: string; midtermMax: number; finalMax: number; practicalMax: number; homeworkMax: number }
interface RosterRow {
  enrollmentId: string
  studentCode: string
  name: string
  midterm: number | null
  final: number | null
  practical: number | null
  homework: number | null
  letterGrade: string | null
}
type Component = "midterm" | "final" | "practical" | "homework"
type Edits = Record<string, Partial<Record<Component, number>>>

export default function FacultyGradesPage() {
  const [passFloor, setPassFloor] = useState<number | null>(null)
  const [courses, setCourses] = useState<FacultyCourseLite[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [course, setCourse] = useState<CourseMax | null>(null)
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [edits, setEdits] = useState<Edits>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedNote, setSavedNote] = useState("")

  // Load the instructor's courses once, then select the first.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/faculty/courses`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب المقررات")
        const json = await res.json()
        if (cancelled) return
        setCourses(json.courses ?? [])
        if (json.courses?.[0]) setSelectedCourseId(json.courses[0].id)
        else setLoading(false)
      } catch (e) {
        if (!cancelled) { setError((e as Error).message); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load the roster whenever the selected course changes.
  const loadRoster = useCallback(async (courseId: string) => {
    setLoading(true)
    setError(null)
    setEdits({})
    try {
      const res = await fetch(`/api/faculty/grades?courseId=${courseId}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب الدرجات")
      const json = await res.json()
      setCourse(json.course)
      setRoster(json.roster ?? [])
      setPassFloor(typeof json.passFloor === 'number' ? json.passFloor : null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedCourseId) loadRoster(selectedCourseId)
  }, [selectedCourseId, loadRoster])

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

  // Save all edited rows via PATCH — this is what the Student portal then reads.
  const saveAll = async () => {
    const ids = Object.keys(edits)
    if (!ids.length) return
    setSaving(true)
    setSavedNote("")
    try {
      for (const enrollmentId of ids) {
        await fetch(`/api/faculty/grades`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enrollmentId, ...edits[enrollmentId] }),
        })
      }
      await loadRoster(selectedCourseId)
      setSavedNote(`تم حفظ ${ids.length} سجل — ستظهر الدرجات للطلاب فوراً`)
    } catch {
      setError("فشل في حفظ الدرجات")
    } finally {
      setSaving(false)
    }
  }

  const dirtyCount = Object.keys(edits).length
  const filtered = roster.filter(
    (r) => r.name.includes(searchTerm) || r.studentCode.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-indigo-600" />
            الدرجات والتقييم
          </h1>
          <p className="text-gray-500 mt-1">رصد درجات الطلاب وإدارة التقييمات</p>
        </div>
        <div className="flex items-center gap-3">
          {savedNote && <span className="text-sm text-green-600">{savedNote}</span>}
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={saveAll} disabled={saving || dirtyCount === 0}>
            <Save className="w-4 h-4 ml-2" />
            {saving ? "جارٍ الحفظ..." : `حفظ${dirtyCount ? ` (${dirtyCount})` : ""}`}
          </Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}

      {/* Course selector cards (the instructor's courses) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {courses.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card
              className={`cursor-pointer transition-all ${selectedCourseId === c.id ? "ring-2 ring-indigo-500" : "hover:shadow-md"}`}
              onClick={() => setSelectedCourseId(c.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{c.code}</Badge>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-4 h-4" />{c.students}</span>
                </div>
                <p className="text-sm font-medium truncate">{c.name}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">رصد الدرجات</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>رصد درجات — {course?.nameAr ?? ""}</CardTitle>
                  <CardDescription>
                    {course
                      ? `أعمال الفصل: ${course.midtermMax} | النهائي: ${course.finalMax} | عملي: ${course.practicalMax} | أعمال السنة: ${course.homeworkMax}`
                      : ""}
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="بحث بالاسم..." className="pr-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-gray-500">جارٍ تحميل القائمة...</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-gray-500">لا يوجد طلاب مسجلون في هذا المقرر</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الطالب</TableHead>
                      <TableHead className="text-center">أعمال الفصل ({course?.midtermMax})</TableHead>
                      <TableHead className="text-center">النهائي ({course?.finalMax})</TableHead>
                      <TableHead className="text-center">عملي ({course?.practicalMax})</TableHead>
                      <TableHead className="text-center">أعمال السنة ({course?.homeworkMax})</TableHead>
                      <TableHead className="text-center">المجموع ({courseMaxTotal})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => {
                      const total = rowTotal(row)
                      const pct = courseMaxTotal > 0 ? (total / courseMaxTotal) * 100 : 0
                      const cols: { c: Component; max: number }[] = [
                        { c: "midterm", max: course?.midtermMax ?? 0 },
                        { c: "final", max: course?.finalMax ?? 0 },
                        { c: "practical", max: course?.practicalMax ?? 0 },
                        { c: "homework", max: course?.homeworkMax ?? 0 },
                      ]
                      return (
                        <TableRow key={row.enrollmentId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{row.name}</p>
                              <p className="text-xs text-gray-500">{row.studentCode}</p>
                            </div>
                          </TableCell>
                          {cols.map(({ c, max }) => (
                            <TableCell key={c} className="text-center">
                              <Input
                                type="number"
                                className="w-16 h-8 text-center mx-auto"
                                value={valueOf(row, c)}
                                max={max}
                                min={0}
                                disabled={max === 0}
                                onChange={(e) => setEdit(row.enrollmentId, c, e.target.value)}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            {/* the configured pass floor, not a literal: جدول 3 puts it at 50%, and each institute may set
                                its own. With no ladder saved yet we make no pass claim at all. */}
                            <Badge className={passFloor == null ? "bg-muted text-muted-foreground" : pct >= passFloor ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                              {total}/{courseMaxTotal}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card><CardContent className="p-6 text-center text-gray-500"><BarChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />تقارير تحليل الأداء</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
