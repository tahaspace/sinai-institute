"use client"

import { useState, useEffect, useCallback } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesAnySystem } from "@/components/shared/academic-system-filter"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BookOpen, Search, Plus, Download, Building2, Pencil, GraduationCap } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CourseRow {
  id: string
  code: string
  name: string
  nameEn: string
  department: string
  departmentId: string | null
  creditHours: number
  /** derived from the study plans this course appears on; empty = not on any plan yet */
  systems: string[]
  instructor: string
  students: number
  countsInGpa: boolean
  requirementType: string
  availableInSummer: boolean
  isGraduationProject: boolean
  gradeSplit: { midterm: number; final: number; practical: number; homework: number }
  /** طبيعة المقرر (جدول 2) — null = لم تُحدَّد، فلا قاعدة توزيع تنطبق */
  courseTypeCode: string | null
  courseTypeName: string | null
  /** أعمدة توزيع الدرجات المخالفة لجدول 2 — تنبيه فقط، لا يمنع الحفظ */
  splitMismatch: string[]
  /** ساعات الاتصال الأسبوعية وما تُكافئه من ساعات معتمدة */
  theoryContactHours: number | null
  practicalContactHours: number | null
  derivedCreditHours: number | null
  /** المستوى الدراسي — the effective level: the course's own, else the study-plan row */
  level: number | null
  /** المستوى المُدخل على المقرر نفسه؛ null = لم يُدخل، فيُعرض المشتق من الخطة الدراسية */
  courseLevel: number | null
  /** متطلبات سابقة, with the bylaw's optional minimum grade («تقدير جيد على الأقل») */
  prerequisites: { id: string; code: string; name: string; minGradeCode: string | null }[]
}

/** صف من جدول 2 كما أدخله المعهد في «لائحة المعهد» */
interface CourseTypeRow {
  code: string
  nameAr: string
  homework: number
  written: number
  practical: number
  total: number
}

interface DepartmentRow {
  id: string
  nameAr: string
}

// The mutable form behind both the Add and Edit dialogs.
interface CourseForm {
  code: string
  nameAr: string
  nameEn: string
  creditHours: string
  departmentId: string | null
  countsInGpa: boolean
  requirementType: "mandatory" | "elective"
  availableInSummer: boolean
  isGraduationProject: boolean
  midtermMax: string
  finalMax: string
  practicalMax: string
  homeworkMax: string
  courseTypeCode: string
  theoryContactHours: string
  practicalContactHours: string
  level: string
  prerequisites: { id: string; minGradeCode: string }[]
}

// Defaults mirror the Course model column defaults (midterm 50 / final 100 / practical 0 / homework 20).
const EMPTY_FORM: CourseForm = {
  code: "",
  nameAr: "",
  nameEn: "",
  creditHours: "3",
  departmentId: null,
  countsInGpa: true,
  requirementType: "mandatory",
  availableInSummer: true,
  isGraduationProject: false,
  midtermMax: "50",
  finalMax: "100",
  practicalMax: "0",
  homeworkMax: "20",
  courseTypeCode: "",
  theoryContactHours: "",
  practicalContactHours: "",
  level: "",
  prerequisites: [],
}

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [allCourses, setAllCourses] = useState<CourseRow[]>([])
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [apiStats, setApiStats] = useState<{ total: number; totalCreditHours: number }>({ total: 0, totalCreditHours: 0 })
  // جدول 2 ومعامل تحويل ساعات الاتصال يأتيان من اللائحة عبر الـ API: هذه الصفحة "use client" فلا
  // يجوز لها استيراد lib/regulations.ts (بريزما في المتصفح يُفشل بناء الإنتاج).
  const [courseTypes, setCourseTypes] = useState<CourseTypeRow[]>([])
  const [contactRatio, setContactRatio] = useState<{ theory: number; practical: number }>({ theory: 1, practical: 2 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog + form state. editingId === null ⇒ Add mode; otherwise Edit that course.
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true)
    setError(null)
    try {
      const [coursesRes, deptRes] = await Promise.all([
        fetch(`/api/institute/courses`),
        fetch(`/api/departments`),
      ])
      if (!coursesRes.ok) throw new Error("فشل في جلب المقررات")
      const json = await coursesRes.json()
      // Departments are only needed for the dialog dropdown — don't fail the page if they're unavailable.
      const deptJson = deptRes.ok ? await deptRes.json() : []
      if (!signal?.cancelled) {
        setAllCourses(json.courses ?? [])
        setApiStats(json.stats ?? { total: 0, totalCreditHours: 0 })
        setCourseTypes(Array.isArray(json.courseTypes) ? json.courseTypes : [])
        if (json.contactHoursPerCredit) setContactRatio(json.contactHoursPerCredit)
        setDepartments(Array.isArray(deptJson) ? deptJson : [])
      }
    } catch (e) {
      if (!signal?.cancelled) setError((e as Error).message)
    } finally {
      if (!signal?.cancelled) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const signal = { cancelled: false }
    load(signal)
    return () => { signal.cancelled = true }
  }, [load])

  const courses = allCourses.filter((c) => {
    const matchesSearch = !searchQuery || c.name.includes(searchQuery) || c.code.includes(searchQuery)
    const matchesDepartment = departmentFilter === "all" || c.departmentId === departmentFilter
    return matchesSearch && matchesDepartment && matchesAnySystem(c.systems, systemFilter)
  })

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (course: CourseRow) => {
    setEditingId(course.id)
    setForm({
      code: course.code,
      nameAr: course.name,
      nameEn: course.nameEn ?? "",
      creditHours: String(course.creditHours),
      departmentId: course.departmentId,
      countsInGpa: course.countsInGpa,
      requirementType: course.requirementType === "elective" ? "elective" : "mandatory",
      availableInSummer: course.availableInSummer,
      isGraduationProject: course.isGraduationProject,
      midtermMax: String(course.gradeSplit.midterm),
      finalMax: String(course.gradeSplit.final),
      practicalMax: String(course.gradeSplit.practical),
      homeworkMax: String(course.gradeSplit.homework),
      courseTypeCode: course.courseTypeCode ?? "",
      theoryContactHours: course.theoryContactHours != null ? String(course.theoryContactHours) : "",
      practicalContactHours: course.practicalContactHours != null ? String(course.practicalContactHours) : "",
      level: course.courseLevel != null ? String(course.courseLevel) : "",
      prerequisites: (course.prerequisites ?? []).map((p) => ({ id: p.id, minGradeCode: p.minGradeCode ?? "" })),
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const updateField = <K extends keyof CourseForm>(key: K, value: CourseForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // اختيار طبيعة المقرر يملأ توزيع الدرجات من جدول 2 مرّة واحدة («توزيع الدرجات يُحدَّد طبقاً
  // لطبيعة المقرر»)، ويبقى قابلاً للتعديل يدوياً بعدها — التوزيع المخالف يُنبَّه عليه ولا يُمنع.
  const applyCourseType = (code: string) => {
    const t = courseTypes.find((x) => x.code === code)
    setForm((f) => ({
      ...f,
      courseTypeCode: code,
      // جدول 2 لا يحمل عمود «نصفي» أصلاً (أعمال سنه | تحريري | شفوي/تطبيقي/عملي | الاجمالي 100)،
      // فقيمته تحت طبيعة مقرر من الجدول = صفر لا «غير محدد»؛ بدون تصفيره يصبح المجموع 150.
      ...(t
        ? { homeworkMax: String(t.homework), finalMax: String(t.written), practicalMax: String(t.practical), midtermMax: "0" }
        : {}),
    }))
  }

  // ما تُكافئه ساعات الاتصال المُدخلة من ساعات معتمدة — «ساعة نظريا و(2-3) عملي او تطبيقي».
  const formDerivedCredit = (() => {
    const t = Number(form.theoryContactHours) || 0
    const p = Number(form.practicalContactHours) || 0
    if (form.theoryContactHours.trim() === "" && form.practicalContactHours.trim() === "") return null
    const tDiv = contactRatio.theory > 0 ? contactRatio.theory : 1
    const pDiv = contactRatio.practical > 0 ? contactRatio.practical : 2
    return Math.round((t / tDiv + p / pDiv) * 100) / 100
  })()

  // صف جدول 2 المختار في النموذج — لعرض التوزيع المتوقّع بجانب المُدخل.
  const selectedType = courseTypes.find((t) => t.code === form.courseTypeCode) ?? null
  const formSplitMismatch = selectedType
    ? [
        Number(form.homeworkMax) !== selectedType.homework ? `أعمال السنة ${form.homeworkMax} بدل ${selectedType.homework}` : "",
        Number(form.finalMax) !== selectedType.written ? `التحريري ${form.finalMax} بدل ${selectedType.written}` : "",
        Number(form.practicalMax) !== selectedType.practical ? `العملي/الشفوي ${form.practicalMax} بدل ${selectedType.practical}` : "",
        Number(form.midtermMax) !== 0 ? `النصفي ${form.midtermMax} بدل 0 (لا عمود له في جدول 2)` : "",
        (() => {
          const sum =
            (Number(form.homeworkMax) || 0) + (Number(form.midtermMax) || 0) + (Number(form.finalMax) || 0) + (Number(form.practicalMax) || 0)
          return sum !== selectedType.total ? `الإجمالي ${sum} بدل ${selectedType.total}` : ""
        })(),
      ].filter(Boolean)
    : []

  // Build the JSON payload shared by POST (add) and PATCH (edit). Caps go as numbers.
  const buildPayload = () => ({
    code: form.code.trim(),
    nameAr: form.nameAr.trim(),
    nameEn: form.nameEn.trim() || null,
    creditHours: Number(form.creditHours) || 0,
    departmentId: form.departmentId,
    countsInGpa: form.countsInGpa,
    requirementType: form.requirementType,
    availableInSummer: form.availableInSummer,
    isGraduationProject: form.isGraduationProject,
    midtermMax: Number(form.midtermMax) || 0,
    finalMax: Number(form.finalMax) || 0,
    practicalMax: Number(form.practicalMax) || 0,
    homeworkMax: Number(form.homeworkMax) || 0,
    // فارغ = لم تُحدَّد طبيعة المقرر / لم تُدخل ساعات الاتصال، فتُخزَّن null كما كانت
    courseTypeCode: form.courseTypeCode || null,
    theoryContactHours: form.theoryContactHours.trim() === "" ? null : Number(form.theoryContactHours),
    practicalContactHours: form.practicalContactHours.trim() === "" ? null : Number(form.practicalContactHours),
    // فارغ = لا مستوى محدد للمقرر، فيُقرأ من الخطة الدراسية إن وُجد
    level: form.level.trim() === "" ? null : Number(form.level),
    // An empty minGradeCode means «النجاح يكفي» — sent as null so the engine reads it that way.
    prerequisites: form.prerequisites
      .filter((p) => p.id)
      .map((p) => ({ id: p.id, minGradeCode: p.minGradeCode.trim() || null })),
  })

  const handleSave = async () => {
    if (!form.code.trim() || !form.nameAr.trim()) {
      setFormError("الكود والاسم مطلوبان")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = buildPayload()
      const res = await fetch(`/api/institute/courses`, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || (editingId ? "فشل في تحديث المقرر" : "فشل في إضافة المقرر"))
      }
      setDialogOpen(false)
      await load()
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-institute-blue" />
            المقررات الدراسية
          </h1>
          <p className="text-muted-foreground">إدارة المقررات والساعات المعتمدة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة مقرر
          </Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل المقررات...</CardContent></Card>}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الكود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-48" />
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Building2 className="w-4 h-4 ml-2" />
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأقسام</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المقررات</CardTitle>
          <CardDescription>إجمالي {apiStats.total} مقرر · {apiStats.totalCreditHours} ساعة معتمدة</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>كود المقرر</TableHead>
                <TableHead>اسم المقرر</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>المستوى</TableHead>
                <TableHead>الساعات</TableHead>
                <TableHead>ساعات الاتصال (نظري/عملي)</TableHead>
                <TableHead>طبيعة المقرر</TableHead>
                <TableHead>متطلب سابق</TableHead>
                <TableHead>يدخل في المعدل</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الفصل الصيفي</TableHead>
                <TableHead>مشروع التخرج</TableHead>
                <TableHead>تقسيم الدرجات (أعمال/تحريري/عملي/نصفي)</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-mono font-bold">{course.code}</TableCell>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{course.department}</Badge>
                  </TableCell>
                  <TableCell>
                    {course.level != null
                      ? <Badge variant="outline">المستوى {course.level}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-institute-blue text-institute-blue">{course.creditHours}</Badge>
                  </TableCell>
                  {/* ساعات الاتصال الأسبوعية وما تُكافئه؛ اختلافها عن الساعات المخزَّنة تنبيه لا أكثر */}
                  <TableCell className="text-sm">
                    {course.theoryContactHours != null || course.practicalContactHours != null ? (
                      <span className="font-mono">
                        {course.theoryContactHours ?? 0}/{course.practicalContactHours ?? 0}
                        {course.derivedCreditHours != null && (
                          <span className={course.derivedCreditHours !== course.creditHours ? "text-amber-700 mr-1" : "text-muted-foreground mr-1"}>
                            (= {course.derivedCreditHours} س.م)
                          </span>
                        )}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {course.courseTypeName
                      ? <Badge variant="outline">{course.courseTypeName}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                    {course.splitMismatch?.length > 0 && (
                      <div className="text-xs text-amber-700 mt-1" title={course.splitMismatch.join("، ")}>
                        ⚠ توزيع مخالف لجدول 2
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {course.prerequisites?.length
                      ? course.prerequisites.map((p) => `${p.code}${p.minGradeCode ? ` (${p.minGradeCode} فأعلى)` : ""}`).join("، ")
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {course.countsInGpa
                      ? <Badge className="bg-green-100 text-green-700">✓ نعم</Badge>
                      : <Badge className="bg-gray-100 text-gray-600">نجاح/رسوب</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{course.requirementType === "elective" ? "اختياري" : "إجباري"}</Badge>
                  </TableCell>
                  <TableCell>
                    {course.availableInSummer
                      ? <Badge className="bg-blue-100 text-blue-700">✓</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {course.isGraduationProject
                      ? <Badge className="bg-amber-100 text-amber-800"><GraduationCap className="w-3 h-3 ml-1" />مشروع تخرج</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {course.gradeSplit.homework}/{course.gradeSplit.final}/{course.gradeSplit.practical}/{course.gradeSplit.midterm}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(course)} aria-label="تعديل">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit dialog — same form for both; editingId decides POST vs PATCH. */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormError(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل المقرر" : "إضافة مقرر جديد"}</DialogTitle>
            <DialogDescription>أدخل بيانات المقرر وتقسيم الدرجات والإعدادات اللائحية</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>كود المقرر</Label>
                <Input value={form.code} onChange={(e) => updateField("code", e.target.value)} placeholder="مثال: CS101" />
              </div>
              <div className="space-y-2">
                <Label>الساعات المعتمدة</Label>
                <Input type="number" value={form.creditHours} onChange={(e) => updateField("creditHours", e.target.value)} />
              </div>
            </div>

            {/* المستوى — «المستوي الاول … الرابع» في جداول الخطة الدراسية باللائحة. تركه فارغاً يعني
                قراءة المستوى من الخطة الدراسية كما كان. */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المستوى</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.level}
                  onChange={(e) => updateField("level", e.target.value)}
                  placeholder="اتركه فارغاً ليُقرأ من الخطة الدراسية"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم بالعربية</Label>
                <Input value={form.nameAr} onChange={(e) => updateField("nameAr", e.target.value)} placeholder="اسم المقرر" />
              </div>
              <div className="space-y-2">
                <Label>الاسم بالإنجليزية</Label>
                <Input value={form.nameEn} onChange={(e) => updateField("nameEn", e.target.value)} placeholder="Course name" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>القسم</Label>
                <Select value={form.departmentId ?? undefined} onValueChange={(v) => updateField("departmentId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نوع المقرر</Label>
                <Select
                  value={form.requirementType}
                  onValueChange={(v) => updateField("requirementType", v === "elective" ? "elective" : "mandatory")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mandatory">إجباري</SelectItem>
                    <SelectItem value="elective">اختياري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* اللائحة: يدخل في المعدل / متاح صيفًا / مشروع التخرج */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="countsInGpa" className="cursor-pointer">يدخل في المعدل</Label>
                <Switch id="countsInGpa" checked={form.countsInGpa} onCheckedChange={(v) => updateField("countsInGpa", v)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="availableInSummer" className="cursor-pointer">متاح في الصيف</Label>
                <Switch id="availableInSummer" checked={form.availableInSummer} onCheckedChange={(v) => updateField("availableInSummer", v)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="isGraduationProject" className="cursor-pointer">مشروع التخرج</Label>
                <Switch id="isGraduationProject" checked={form.isGraduationProject} onCheckedChange={(v) => updateField("isGraduationProject", v)} />
              </div>
            </div>

            {/* طبيعة المقرر — جدول 2 «مقررات دراسية توزيع الدرجات»: «المقرر النظري 40/60»،
                «المقرر العملي 40/–/60»، «المقرر المشترك 40/40/20»، «مشروع التخرج 50/–/50».
                القائمة تُدخَل في «لائحة المعهد» فتزيد عليها المعاهد ما شاءت. */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>طبيعة المقرر</Label>
                <Select value={form.courseTypeCode || undefined} onValueChange={applyCourseType}>
                  <SelectTrigger><SelectValue placeholder="غير محددة" /></SelectTrigger>
                  <SelectContent>
                    {courseTypes.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        {t.nameAr} ({t.homework}/{t.written}/{t.practical})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedType && (
                  <p className="text-xs text-muted-foreground">
                    توزيع اللائحة: أعمال سنة {selectedType.homework} / تحريري {selectedType.written} / عملي {selectedType.practical} = {selectedType.total}
                  </p>
                )}
              </div>
              {/* «اسبوعيا : ساعة نظريا و(2-3) عملي او تطبيقي» — الساعات المعتمدة أعلاه تبقى هي
                  المخزَّنة، وهذه ساعات الاتصال وما تُكافئه بمعامل اللائحة. */}
              <div className="space-y-2">
                <Label>ساعات الاتصال الأسبوعية</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">نظري</Label>
                    <Input type="number" min={0} value={form.theoryContactHours} onChange={(e) => updateField("theoryContactHours", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">عملي / تطبيقي</Label>
                    <Input type="number" min={0} value={form.practicalContactHours} onChange={(e) => updateField("practicalContactHours", e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formDerivedCredit != null
                    ? `تُكافئ ${formDerivedCredit} ساعة معتمدة (نظري ÷ ${contactRatio.theory}، عملي ÷ ${contactRatio.practical})`
                    : `التحويل: ساعة نظري ÷ ${contactRatio.theory}، ساعة عملي ÷ ${contactRatio.practical}`}
                </p>
              </div>
            </div>

            {/* الحد الأقصى لمكوّنات الدرجة */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">الحد الأقصى لمكوّنات الدرجة</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">أعمال السنة</Label>
                  <Input type="number" value={form.homeworkMax} onChange={(e) => updateField("homeworkMax", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">التحريري النهائي</Label>
                  <Input type="number" value={form.finalMax} onChange={(e) => updateField("finalMax", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">العملي</Label>
                  <Input type="number" value={form.practicalMax} onChange={(e) => updateField("practicalMax", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">النصفي</Label>
                  <Input type="number" value={form.midtermMax} onChange={(e) => updateField("midtermMax", e.target.value)} />
                </div>
              </div>
              {formSplitMismatch.length > 0 && (
                <p className="text-xs text-amber-700">
                  ⚠ التوزيع يخالف جدول 2 لطبيعة المقرر المختارة: {formSplitMismatch.join("، ")}
                </p>
              )}
            </div>

            {/* متطلبات سابقة — «متطلب سابق» عمود في كل جداول الخطة الدراسية باللائحة.
                يجوز اشتراط تقدير أدنى في المتطلب («حصول علي تقدير جيد في اللغة الاجنيبيه الاولي
                المتخصصه» لقسم الإرشاد السياحي)؛ تركه فارغاً يعني أن النجاح يكفي. */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">المتطلبات السابقة</Label>
              {form.prerequisites.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_150px_auto] gap-2 items-center">
                  <Select
                    value={p.id || undefined}
                    onValueChange={(v) => updateField("prerequisites", form.prerequisites.map((x, j) => (j === i ? { ...x, id: v } : x)))}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر المقرر" /></SelectTrigger>
                    <SelectContent>
                      {allCourses.filter((c) => c.id !== editingId).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={p.minGradeCode}
                    onChange={(e) => updateField("prerequisites", form.prerequisites.map((x, j) => (j === i ? { ...x, minGradeCode: e.target.value } : x)))}
                    placeholder="أدنى تقدير (اختياري)"
                  />
                  <Button variant="outline" size="sm" onClick={() => updateField("prerequisites", form.prerequisites.filter((_, j) => j !== i))}>حذف</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => updateField("prerequisites", [...form.prerequisites, { id: "", minGradeCode: "" }])}>
                <Plus className="w-4 h-4 ml-1" />إضافة متطلب سابق
              </Button>
              <p className="text-xs text-muted-foreground">
                أدنى تقدير = كود من سلّم التقديرات (جدول 3) مثل C أو B؛ اتركه فارغاً إذا كان النجاح كافياً.
              </p>
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving || !form.code.trim() || !form.nameAr.trim()}>
              {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة المقرر"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
