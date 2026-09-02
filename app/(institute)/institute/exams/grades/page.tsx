"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AcademicModeBanner } from "@/components/academic-mode-banner"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
// client-safe: lib/grade-components imports nothing server-side (no Prisma)
import { COMPONENT_KEYS, COMPONENT_LABELS_AR, type ComponentKey } from "@/lib/grade-components"
import { ClipboardList, Save, Upload, Download, Search, Lock, Unlock, SlidersHorizontal } from "lucide-react"

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
  maxTotal: number
}
interface RosterRow {
  enrollmentId: string
  studentCode: string
  name: string
  // resolved server-side from the student's programme; the تقدير shown for ANNUAL rows is the
  // percentage band, not a letter grade (see the GET handler) — this only narrows the view.
  system: string
  midterm: number | null
  final: number | null
  practical: number | null
  homework: number | null
  total: number
  // this row's OWN denominator — a repeating student exempt from أعمال السنة is «من ٧٠», not «من ١٠٠»
  maxTotal: number
  attemptNo: number
  // null = undecided (bylaw default applies from the 2nd attempt) · '' = explicitly no exemption
  excludedComponents: string | null
  effectiveExcluded: ComponentKey[]
  exemptionSource: "enrollment" | "bylaw" | "none"
  letterGrade: string | null
  gradeStatusCode: string | null
  statusName: string | null
  resultLocked: boolean
  academicYear: string
  semester: string
}
interface StatusOption { code: string; name: string }
type Component = ComponentKey
type Edits = Record<string, Partial<Record<Component, number>>>

export default function GradesPage() {
  const [courses, setCourses] = useState<CourseLite[]>([])
  const [statuses, setStatuses] = useState<StatusOption[]>([])
  // the bylaw's default repeat exemption (لائحة) — shown so a pre-applied exemption is explainable
  const [repeatExempt, setRepeatExempt] = useState<ComponentKey[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [course, setCourse] = useState<CourseMax | null>(null)
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [edits, setEdits] = useState<Edits>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
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
        setRepeatExempt(json.repeatExemptComponents ?? [])
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
      if (json.repeatExemptComponents) setRepeatExempt(json.repeatExemptComponents)
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

  const isExempt = (row: RosterRow, c: Component) => row.effectiveExcluded.includes(c)
  const maxFor = (c: Component) =>
    c === "midterm" ? course?.midtermMax ?? 0
    : c === "final" ? course?.finalMax ?? 0
    : c === "practical" ? course?.practicalMax ?? 0
    : course?.homeworkMax ?? 0
  const applies = (row: RosterRow, c: Component) => maxFor(c) > 0 && !isExempt(row, c)

  // the row's total counts only the components that apply to him — same rule as the engines
  const rowTotal = (row: RosterRow) =>
    COMPONENT_KEYS.filter((c) => !isExempt(row, c)).reduce((sum, c) => sum + valueOf(row, c), 0)

  // Persist a row's exemption immediately: [] = «لا استثناء» (overrides the bylaw), null = back to
  // the bylaw default. The marks themselves are untouched — only the denominator changes.
  const setExemption = async (row: RosterRow, next: ComponentKey[] | null) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/institute/exams/grades`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId: row.enrollmentId, excludedComponents: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "فشل في حفظ المكونات المطبقة")
      // Never refetch the roster while marks are being typed: loadCourse() clears `edits`, so a
      // desk operator who toggles one exemption mid-entry used to lose every unsaved mark on the
      // screen with no warning. The PATCH returns the resolved row, so patch just that row.
      setRoster((prev) =>
        prev.map((r) =>
          r.enrollmentId === row.enrollmentId
            ? {
                ...r,
                excludedComponents: json.excludedComponents ?? null,
                effectiveExcluded: json.effectiveExcluded ?? [],
                exemptionSource: json.exemptionSource ?? "none",
                maxTotal: json.maxTotal ?? r.maxTotal,
              }
            : r
        )
      )
      // The stored التقدير is derived server-side from the new denominator; refresh it only when
      // there is nothing unsaved to lose.
      if (Object.keys(edits).length === 0) await loadCourse(selectedCourseId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

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
      // Re-derive from the marks ALREADY recorded — send only the ones that exist, so an
      // unentered component stays null instead of being written back as a real zero.
      const recorded: Partial<Record<Component, number>> = {}
      for (const c of COMPONENT_KEYS) if (row[c] != null) recorded[c] = row[c] as number
      const body = value === "__auto"
        ? { enrollmentId: row.enrollmentId, ...recorded }
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

  // Approve & lock (or reopen) the whole course's results for the term shown in the roster.
  // The term comes from the roster rows (all rows of one course share course/term here).
  const approveLock = async (lock: boolean) => {
    if (!selectedCourseId) return
    setSaving(true)
    setError(null)
    try {
      const term = roster[0]
      const res = await fetch(`/api/institute/exams/grades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: lock ? "approve" : "unlock",
          courseId: selectedCourseId,
          academicYear: term?.academicYear,
          semester: term?.semester,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || (lock ? "فشل في اعتماد النتائج" : "فشل في إعادة الفتح"))
      }
      await loadCourse(selectedCourseId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const specialCodes = new Set(statuses.map((s) => s.code))

  // A row is eligible for a verbal control grade only when the written/final mark is
  // still missing (final == null) OR the student is already flagged deprived (DN, حرمان
  // due to exceeded absence). For fully-marked rows the letter is derived from the scores.
  const canSetVerbal = (row: RosterRow) => row.final == null || row.gradeStatusCode === "DN"

  // Term-level lock state for the loaded roster (all rows share the course/term here).
  const anyLocked = roster.some((r) => r.resultLocked)
  const allLocked = roster.length > 0 && roster.every((r) => r.resultLocked)

  const filtered = roster.filter(
    (r) =>
      (r.name.includes(searchTerm) || r.studentCode.includes(searchTerm)) &&
      matchesSystem(r.system, systemFilter)
  )

  // saveAll deliberately keeps every edit, including rows the current narrowing hides — dropping a
  // typed mark because of a filter would lose work. So say how many edits are off-screen instead of
  // letting «حفظ (12)» over a 3-row table read as 12 visible rows.
  const hiddenDirty = Object.keys(edits).filter(
    (id) => !filtered.some((r) => r.enrollmentId === id)
  ).length

  return (
    <div className="space-y-6">
      <AcademicModeBanner />
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
          {hiddenDirty > 0 && (
            <span className="self-center text-xs text-muted-foreground">
              {hiddenDirty} تعديل خارج التصفية الحالية
            </span>
          )}
          <Button onClick={saveAll} disabled={saving || dirtyCount === 0 || allLocked}>
            <Save className="w-4 h-4 ml-2" />
            {saving ? "جارٍ الحفظ..." : `حفظ${dirtyCount ? ` (${dirtyCount})` : ""}`}
          </Button>
          {allLocked ? (
            <Button variant="outline" onClick={() => approveLock(false)} disabled={saving || roster.length === 0}>
              <Unlock className="w-4 h-4 ml-2" />
              إعادة فتح
            </Button>
          ) : (
            <Button onClick={() => approveLock(true)} disabled={saving || roster.length === 0 || dirtyCount > 0}>
              <Lock className="w-4 h-4 ml-2" />
              اعتماد وغلق النتائج
            </Button>
          )}
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
            <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-48" />
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
          <CardTitle className="flex items-center gap-2">
            درجات الطلاب
            {anyLocked && (
              <Badge variant="outline" className="gap-1 text-green-700 border-green-600">
                <Lock className="w-3 h-3" />
                {allLocked ? "النتائج معتمدة ومغلقة" : "بعض النتائج معتمدة"}
              </Badge>
            )}
            {/* The lock badge and the اعتماد/إعادة فتح buttons act on the whole course/term (correct),
                but the table under them is narrowed — say so rather than let them look row-scoped. */}
            {filtered.length !== roster.length && (
              <span className="text-xs font-normal text-muted-foreground">
                عرض {filtered.length} من {roster.length} — الاعتماد والغلق يشملان المقرر كاملاً
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {course
              ? `${course.code} - ${course.nameAr} | أعمال الفصل: ${course.midtermMax} | النهائي: ${course.finalMax} | عملي: ${course.practicalMax} | أعمال السنة: ${course.homeworkMax}`
              : ""}
            {repeatExempt.length > 0 && (
              <span className="block text-xs mt-1">
                اللائحة تستثني الطالب العايد (من المحاولة الثانية) من:{" "}
                {repeatExempt.map((c) => COMPONENT_LABELS_AR[c]).join(" / ")} — ويُحسب مجموعه على باقي المكونات.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">جارٍ تحميل القائمة...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {/* An empty roster and an emptied-by-narrowing roster are different facts, and the
                  system filter must not be blamed while it is still on «كل الأنظمة». */}
              {roster.length === 0
                ? "لا يوجد طلاب مسجلون في هذا المقرر"
                : systemFilter === ACADEMIC_SYSTEM_ALL
                  ? "لا توجد نتائج مطابقة للبحث"
                  : "لا توجد نتائج مطابقة ضمن النظام المحدد"}
            </div>
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
                  <TableHead className="text-center">المكونات المطبقة</TableHead>
                  {/* the header shows the COURSE denominator; each row prints its own beside it */}
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
                          {isExempt(row, c) ? (
                            // Barred from this component: it is out of BOTH the numerator and the
                            // denominator. Any mark already recorded stays on file, so say so —
                            // otherwise the desk cannot tell a hidden mark exists.
                            <span className="block text-center text-xs text-muted-foreground">
                              غير مطبق
                              {row[c] != null && ` (${row[c]} محفوظة)`}
                            </span>
                          ) : (
                            <Input
                              type="number"
                              className="w-20 text-center mx-auto"
                              value={valueOf(row, c)}
                              max={max}
                              min={0}
                              disabled={max === 0 || row.resultLocked}
                              onChange={(e) => setEdit(row.enrollmentId, c, e.target.value)}
                            />
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1" disabled={saving || row.resultLocked}>
                              <SlidersHorizontal className="w-3 h-3" />
                              {row.effectiveExcluded.length === 0
                                ? "الكل"
                                : `${row.effectiveExcluded.length} مستثنى`}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 text-right" align="center">
                            <p className="text-sm font-medium mb-1">المكونات المطبقة على الطالب</p>
                            <p className="text-xs text-muted-foreground mb-3">
                              المحاولة رقم {row.attemptNo}
                              {row.exemptionSource === "bylaw" && " — الاستثناء مطبَّق تلقائياً من اللائحة (طالب عايد)"}
                              {row.exemptionSource === "enrollment" && " — استثناء مسجَّل لهذا الطالب"}
                            </p>
                            <div className="space-y-2">
                              {COMPONENT_KEYS.map((c) => (
                                <label key={c} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={applies(row, c)}
                                    // the last applicable component may not be unticked: a total out
                                    // of 0 is a silent F on the credit path (the server refuses it too)
                                    disabled={
                                      maxFor(c) === 0 ||
                                      saving ||
                                      (applies(row, c) &&
                                        COMPONENT_KEYS.filter((k) => applies(row, k)).length === 1)
                                    }
                                    onCheckedChange={(v) => {
                                      const next = v === true
                                        ? row.effectiveExcluded.filter((k) => k !== c)
                                        : [...row.effectiveExcluded, c]
                                      setExemption(row, next)
                                    }}
                                  />
                                  <span className={maxFor(c) === 0 ? "text-muted-foreground" : ""}>
                                    {COMPONENT_LABELS_AR[c]} ({maxFor(c)})
                                    {maxFor(c) === 0 && " — غير مقرر في المادة"}
                                  </span>
                                </label>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                              المجموع الفعّال: من {row.maxTotal} (بدلاً من {courseMaxTotal} للمادة)
                            </p>
                            {row.excludedComponents !== null && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 w-full"
                                disabled={saving}
                                onClick={() => setExemption(row, null)}
                              >
                                العودة إلى افتراضي اللائحة
                              </Button>
                            )}
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-center">
                        {/* the denominator is the student's own, never the course's when they differ */}
                        <Badge variant="outline">
                          {total}/{row.maxTotal}
                        </Badge>
                        {row.maxTotal !== courseMaxTotal && (
                          <div className="text-[11px] text-muted-foreground mt-1">من {row.maxTotal} بدل {courseMaxTotal}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Badge variant="secondary">{row.letterGrade ?? "-"}</Badge>
                          {row.resultLocked && (
                            <Badge variant="outline" className="gap-1 text-green-700 border-green-600">
                              <Lock className="w-3 h-3" />
                              معتمد
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={row.gradeStatusCode && specialCodes.has(row.gradeStatusCode) ? row.gradeStatusCode : "__auto"}
                          onValueChange={(v) => setStatus(row, v)}
                          disabled={saving || row.resultLocked || !canSetVerbal(row)}
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
