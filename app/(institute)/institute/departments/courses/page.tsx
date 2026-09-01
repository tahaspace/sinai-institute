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
}

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [allCourses, setAllCourses] = useState<CourseRow[]>([])
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [apiStats, setApiStats] = useState<{ total: number; totalCreditHours: number }>({ total: 0, totalCreditHours: 0 })
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
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const updateField = <K extends keyof CourseForm>(key: K, value: CourseForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

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
                <TableHead>الساعات</TableHead>
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
                    <Badge className="bg-institute-blue text-institute-blue">{course.creditHours}</Badge>
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
