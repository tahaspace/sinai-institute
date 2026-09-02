"use client"

import { useCallback, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
import { ACADEMIC_SYSTEM_LABELS } from "@/lib/academic-system-shared"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { BookOpen, Users, Clock, GraduationCap, Plus, Pencil } from "lucide-react"

// --- API response shape (served by GET /api/institute/programs) ---
interface ProgramRow {
  id: string
  nameAr: string
  nameEn: string
  department: string
  departmentId: string | null
  degree: string
  years: number
  totalCreditHours: number
  description: string
  isActive: boolean
  /** Program.academicSystem, server-normalized: 'CREDIT_HOURS' | 'ANNUAL'. Intrinsic to the row here. */
  academicSystem: string
  students: number
}

interface ProgramsResponse {
  programs: ProgramRow[]
  stats: { total: number }
}

/** Only what the dialog's department dropdown needs (GET /api/departments returns the full rows). */
interface DepartmentRow {
  id: string
  nameAr: string
}

interface ProgramForm {
  nameAr: string
  nameEn: string
  departmentId: string | null
  degree: string
  years: string
  totalCreditHours: string
  academicSystem: string
  description: string
}

// Defaults mirror the schema's own (Program.years @default(4), totalCreditHours @default(0),
// academicSystem @default("CREDIT_HOURS")), so an untouched form creates the row Prisma would.
const EMPTY_FORM: ProgramForm = {
  nameAr: "",
  nameEn: "",
  departmentId: null,
  degree: "",
  years: "4",
  totalCreditHours: "0",
  academicSystem: "CREDIT_HOURS",
  description: "",
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog + form state. editingId === null ⇒ Add mode; otherwise Edit that programme.
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProgramForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true)
    setError(null)
    try {
      const [res, deptRes] = await Promise.all([
        fetch("/api/institute/programs"),
        fetch("/api/departments"),
      ])
      if (!res.ok) {
        throw new Error("فشل تحميل البيانات")
      }
      const json = (await res.json()) as ProgramsResponse
      // Departments only feed the dialog dropdown — never fail the list over them.
      const deptJson = deptRes.ok ? await deptRes.json() : []
      if (!signal?.cancelled) {
        setPrograms(json.programs ?? [])
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
    return () => {
      signal.cancelled = true
    }
  }, [load])

  // The list is fetched whole and uncapped, so narrowing happens in the browser (house pattern).
  // "كل الأنظمة" → matchesSystem keeps every row, i.e. visiblePrograms === programs.
  const visiblePrograms = programs.filter((p) => matchesSystem(p.academicSystem, systemFilter))

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (program: ProgramRow) => {
    setEditingId(program.id)
    setForm({
      nameAr: program.nameAr,
      nameEn: program.nameEn ?? "",
      departmentId: program.departmentId,
      degree: program.degree ?? "",
      years: String(program.years),
      totalCreditHours: String(program.totalCreditHours),
      academicSystem: program.academicSystem === "ANNUAL" ? "ANNUAL" : "CREDIT_HOURS",
      description: program.description ?? "",
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const updateField = <K extends keyof ProgramForm>(key: K, value: ProgramForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Payload shared by POST (add) and PATCH (edit) — every key is a Program scalar the route accepts.
  // totalCreditHours is always sent, even for an annual programme whose input is hidden, so switching
  // a programme to the annual system never silently zeroes a stored figure.
  const buildPayload = () => ({
    nameAr: form.nameAr.trim(),
    nameEn: form.nameEn.trim() || null,
    departmentId: form.departmentId,
    degree: form.degree.trim() || null,
    // A blank/invalid years box falls back to the schema default (4) rather than storing a 0 the
    // card would then print as «0 سنوات».
    years: Number(form.years) > 0 ? Number(form.years) : 4,
    totalCreditHours: Number(form.totalCreditHours) || 0,
    academicSystem: form.academicSystem,
    description: form.description.trim() || null,
  })

  const handleSave = async () => {
    if (!form.nameAr.trim()) {
      setFormError("اسم البرنامج مطلوب")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = buildPayload()
      const res = await fetch("/api/institute/programs", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || (editingId ? "فشل في تحديث البرنامج" : "فشل في إضافة البرنامج"))
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-institute-blue" />
            البرامج الأكاديمية
          </h1>
          <p className="text-muted-foreground">إدارة البرامج الدراسية المتاحة</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة برنامج
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            جارٍ تحميل البرامج...
          </CardContent>
        </Card>
      )}

      {/* Filters — the academic system is a property of the programme itself, so this is the screen
          where a registrar discovers which programme runs which system (and, via the dialog, sets it). */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-48" />
          </div>
        </CardContent>
      </Card>

      {!loading && !error && visiblePrograms.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            {/* Never assert absence while a filter is narrowing the list. */}
            {programs.length === 0 ? "لا توجد برامج" : "لا توجد برامج مطابقة للتصفية"}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visiblePrograms.map((program, index) => (
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Badge variant="secondary">{program.degree || "—"}</Badge>
                  <Badge variant="outline">{program.department || "—"}</Badge>
                </div>
                <CardTitle className="text-lg mt-2">{program.nameAr}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{`${program.years} سنوات`}</span>
                  </div>
                  {/* Credit hours are a credit-hours-system concept. An annual programme's stored 0
                      would read as a real figure next to «النظام السنوي», so the cell is dropped —
                      «سنوات» above is the annual system's own measure. */}
                  {program.academicSystem !== "ANNUAL" && (
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      <span>{program.totalCreditHours} ساعة</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">النظام الأكاديمي</span>
                  <Badge variant={program.academicSystem === "ANNUAL" ? "secondary" : "outline"}>
                    {ACADEMIC_SYSTEM_LABELS[program.academicSystem === "ANNUAL" ? "ANNUAL" : "CREDIT_HOURS"]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-institute-blue" />
                    <span className="font-bold text-institute-blue">{program.students}</span>
                    <span className="text-sm text-muted-foreground">طالب</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(program)} aria-label="تعديل">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Add / Edit dialog — same form for both; editingId decides POST vs PATCH. */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormError(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل البرنامج" : "إضافة برنامج جديد"}</DialogTitle>
            <DialogDescription>أدخل بيانات البرنامج والنظام الأكاديمي الذي يسير عليه</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم بالعربية</Label>
                <Input value={form.nameAr} onChange={(e) => updateField("nameAr", e.target.value)} placeholder="اسم البرنامج" />
              </div>
              <div className="space-y-2">
                <Label>الاسم بالإنجليزية</Label>
                <Input value={form.nameEn} onChange={(e) => updateField("nameEn", e.target.value)} placeholder="Program name" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>القسم</Label>
                <Select
                  value={form.departmentId ?? "none"}
                  onValueChange={(v) => updateField("departmentId", v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون قسم</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الدرجة</Label>
                <Input value={form.degree} onChange={(e) => updateField("degree", e.target.value)} placeholder="بكالوريوس / دبلوم / ماجستير" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {/* The programme's system decides how every downstream engine judges its students
                    (letters + CGPA vs percentage + تقدير), so it is set here, on the programme. */}
                <Label>النظام الأكاديمي</Label>
                <Select value={form.academicSystem} onValueChange={(v) => updateField("academicSystem", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREDIT_HOURS">{ACADEMIC_SYSTEM_LABELS.CREDIT_HOURS}</SelectItem>
                    <SelectItem value="ANNUAL">{ACADEMIC_SYSTEM_LABELS.ANNUAL}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>عدد السنوات</Label>
                <Input type="number" value={form.years} onChange={(e) => updateField("years", e.target.value)} />
              </div>
            </div>

            {/* Hidden for the annual system, where a credit-hours total means nothing. The stored
                value still travels in the payload, so it survives a round-trip through this form. */}
            {form.academicSystem !== "ANNUAL" && (
              <div className="space-y-2">
                <Label>إجمالي الساعات المعتمدة</Label>
                <Input
                  type="number"
                  value={form.totalCreditHours}
                  onChange={(e) => updateField("totalCreditHours", e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving || !form.nameAr.trim()}>
              {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة البرنامج"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
