"use client"

import { useState, useEffect } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL } from "@/components/shared/academic-system-filter"
import { ACADEMIC_SYSTEM_LABELS, type AcademicSystem } from "@/lib/academic-system-shared"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  admissionRequirementLines,
  checkOverallPercent,
  priorCertificatePercent,
  isEmptyAdmissionRequirements,
  parseAdmissionRequirements,
  EMPTY_ADMISSION_REQUIREMENTS,
  type AdmissionRequirements,
  type AdmissionSubjectRule,
} from "@/lib/admission-requirements"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import {
  UserPlus,
  Search,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Filter,
  Calendar,
  GraduationCap,
  Building2,
} from "lucide-react"

// --- API response shapes (served by /api/institute/admissions) ---
interface ApplicationRow {
  id: string
  fullName: string
  nationalId: string
  email: string
  phone: string
  highSchoolGrade: number
  // The prior certificate the bylaw's first admission condition speaks about, plus the file check.
  qualificationType: string | null
  highSchoolYear: number
  documentsComplete: boolean
  firstChoice: string
  // The applicant's programme, resolved server-side. null ⇒ still unlinked (free-text choice only),
  // so the row belongs to neither academic system and is labelled "—".
  programId: string | null
  system: AcademicSystem | null
  status: "PENDING" | "APPROVED" | "REJECTED" | "ENROLLED"
  statusLabel: string
  createdAt: string
}
interface ProgramOption {
  id: string
  nameAr: string
  nameEn: string
  academicSystem: AcademicSystem
  // «متطلبات الالتحاق بقسم …» as the institute typed them. Always present (an empty set when
  // nothing was typed) — the server normalizes before sending.
  admissionRequirements: AdmissionRequirements
}
interface AdmissionStats {
  total: number
  pending: number
  approved: number
  rejected: number
  enrolled: number
  // applications in the current tab with no programme — invisible to any system-narrowed view
  unlinked: number
}
interface AdmissionsResponse {
  applications: ApplicationRow[]
  programs: ProgramOption[]
  // Whether this reviewer may SAVE requirements (they live on Program ⇒ `program.edit`). Optional so
  // an older/cached response simply reads as "may not", which only ever hides a button.
  canEditPrograms?: boolean
  // «مجموع الثانوية العامة (من …)» — the prior certificate's own maximum as configured in the bylaw
  // settings. null = not configured ⇒ no percentage may be computed or printed.
  priorCertificateMaxTotal?: number | null
  stats: AdmissionStats
}

/**
 * The applicant's total, printed the ONLY way it may be printed: as the raw mark over its own
 * maximum, with the percentage in brackets. `Application.highSchoolGrade` is a raw ثانوية عامة total
 * (the public form asks for «مجموع الثانوية العامة (من 410)»), so a bare `380%` was both wrong and
 * the reason the overall-minimum check passed everybody. With no configured maximum only the raw
 * total is shown — never an invented percentage.
 */
function GradeTotal({ grade, maxTotal }: { grade: number | null | undefined; maxTotal: number | null }) {
  if (grade == null) return <>—</>
  const pct = priorCertificatePercent(grade, maxTotal)
  return (
    <>
      {grade}
      {maxTotal ? ` / ${maxTotal}` : ""}
      {pct != null ? ` (${pct.toFixed(1)}%)` : ""}
    </>
  )
}

// Tab value (lowercase) → API status code (uppercase). "all" means no filter.
const tabToStatus: Record<string, string> = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
}

// This page already refetches whenever a filter changes, and the stat cards are computed by the API
// over whatever it returned — so the academic-system filter has to go to the server too, or the
// tiles would keep counting rows the table no longer shows. "all" is never sent, which keeps the
// unfiltered request identical to what it has always been.
function buildUrl(tab: string, system: string) {
  const params = new URLSearchParams()
  const status = tabToStatus[tab]
  if (status) params.set("status", status)
  if (system !== ACADEMIC_SYSTEM_ALL) params.set("system", system)
  const qs = params.toString()
  return qs ? `/api/institute/admissions?${qs}` : `/api/institute/admissions`
}


/**
 * متطلبات الالتحاق بالبرنامج، مطبوعة بجوار بيانات المتقدم.
 * The bylaw states them per department — «متطلبات الالتحاق بقسم الارشاد السياحي : 1-ان يكون طالب
 * حصل علي ثانويه عامه . 2-حصول علي تقدير جيد في اللغة الاجنيبيه الاولي المتخصصه 3-، ناجحا في اللغه
 * الاجنبيه الثانيه وتاريخ مصر القديمه واثارها . 4-اجتياز امتحان القدرات …» — and an Application
 * carries none of the per-subject data those conditions speak about. Only the overall percentage can
 * be decided from stored data; every other line is shown as «يُراجَع يدوياً» rather than ticked on a
 * guess.
 */
function RequirementsPanel({
  req,
  app,
  maxTotal,
}: {
  req: AdmissionRequirements
  app: ApplicationRow | null
  // The prior certificate's configured maximum; null ⇒ the overall condition cannot be decided.
  maxTotal: number | null
}) {
  if (isEmptyAdmissionRequirements(req)) {
    return (
      <p className="text-xs text-muted-foreground">
        لم تُسجَّل متطلبات التحاق لهذا البرنامج بعد — أضِفها من «متطلبات الالتحاق» ليراها المراجع مع كل طلب.
      </p>
    )
  }
  // The RAW total goes in; checkOverallPercent does the one and only conversion (see
  // lib/admission-requirements.ts). Nothing on this screen divides by the maximum itself.
  const overall = checkOverallPercent(req, app?.highSchoolGrade ?? null, maxTotal)
  return (
    <div className="rounded-md border p-3 space-y-2">
      <p className="text-xs font-semibold">متطلبات الالتحاق بالبرنامج</p>
      <ul className="space-y-1 text-xs">
        {admissionRequirementLines(req).map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-[2px] text-muted-foreground">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {req.minOverallPercent != null && app && overall !== null && (
        <p className={overall === false ? "text-xs text-red-600" : "text-xs text-institute-blue"}>
          مجموع المتقدم <GradeTotal grade={app.highSchoolGrade} maxTotal={maxTotal} /> مقابل حد أدنى{" "}
          {req.minOverallPercent}% — {overall === false ? "غير مستوفٍ" : "مستوفٍ"}
        </p>
      )}
      {req.minOverallPercent != null && app && overall === null && (
        /* No configured «مجموع الشهادة الكلي» ⇒ the raw total cannot be turned into a percentage.
           Saying so is the only safe answer: comparing the raw total to the minimum would tick
           «مستوفٍ» for every applicant. */
        <p className="text-xs text-amber-600">
          مجموع المتقدم <GradeTotal grade={app.highSchoolGrade} maxTotal={maxTotal} /> — يُراجَع يدوياً:
          لم يُضبط «مجموع الشهادة الكلي» في إعدادات اللائحة، فلا يمكن حساب النسبة المئوية.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        بقية الشروط (المواد والقدرات والمقابلة) تُراجَع على ملف المتقدم الورقي — لا يحتفظ الطلب بدرجات المواد.
      </p>
    </div>
  )
}

/** The typed form behind those requirements — one programme at a time. */
function RequirementsEditor({
  value,
  onChange,
}: {
  value: AdmissionRequirements
  onChange: (next: AdmissionRequirements) => void
}) {
  const set = (patch: Partial<AdmissionRequirements>) => onChange({ ...value, ...patch })
  const setSubject = (i: number, patch: Partial<AdmissionSubjectRule>) =>
    set({ subjects: value.subjects.map((s, k) => (k === i ? { ...s, ...patch } : s)) })
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>المؤهلات المقبولة</Label>
        <Input
          value={value.qualifications.join("، ")}
          placeholder="ثانوية عامة، شهادة معادلة"
          onChange={(e) =>
            set({ qualifications: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })
          }
        />
        <p className="text-xs text-muted-foreground">افصل بين المؤهلات بفاصلة. اتركه فارغاً لقبول أي مؤهل.</p>
      </div>
      <div className="space-y-2">
        <Label>الحد الأدنى للمجموع (%)</Label>
        <Input
          type="number"
          value={value.minOverallPercent ?? ""}
          placeholder="بدون حد أدنى"
          onChange={(e) => set({ minOverallPercent: e.target.value === "" ? null : Number(e.target.value) })}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>شروط المواد</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set({ subjects: [...value.subjects, { subject: "", requirement: "pass" }] })}
          >
            <Plus className="w-3 h-3 ml-1" /> إضافة مادة
          </Button>
        </div>
        {value.subjects.length === 0 && (
          <p className="text-xs text-muted-foreground">لا توجد شروط مواد — مثال اللائحة: «النجاح في تاريخ مصر القديمة وآثارها».</p>
        )}
        {value.subjects.map((s, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input
              className="flex-1 min-w-[180px]"
              value={s.subject}
              placeholder="اسم المادة"
              onChange={(e) => setSubject(i, { subject: e.target.value })}
            />
            <Select value={s.requirement} onValueChange={(v) => setSubject(i, { requirement: v as AdmissionSubjectRule["requirement"] })}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">النجاح فقط</SelectItem>
                <SelectItem value="grade">تقدير محدد</SelectItem>
                <SelectItem value="percent">نسبة مئوية</SelectItem>
              </SelectContent>
            </Select>
            {s.requirement === "grade" && (
              <Input
                className="w-[120px]"
                value={s.minGrade ?? ""}
                placeholder="جيد"
                onChange={(e) => setSubject(i, { minGrade: e.target.value })}
              />
            )}
            {s.requirement === "percent" && (
              <Input
                className="w-[110px]"
                type="number"
                value={s.minPercent ?? ""}
                placeholder="60"
                onChange={(e) => setSubject(i, { minPercent: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
            )}
            <Button type="button" variant="ghost" size="icon" onClick={() => set({ subjects: value.subjects.filter((_, k) => k !== i) })}>
              <XCircle className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={value.aptitudeTest} onCheckedChange={(c) => set({ aptitudeTest: c === true })} />
          اجتياز امتحان القدرات
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={value.interview} onCheckedChange={(c) => set({ interview: c === true })} />
          مقابلة شخصية
        </label>
      </div>
      <div className="space-y-2">
        <Label>ملاحظات إضافية</Label>
        <Textarea
          rows={3}
          value={value.notes}
          placeholder="أي شرط آخر تنص عليه اللائحة بنصّه"
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
    </div>
  )
}

export default function AdmissionPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("pending")
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [apiStats, setApiStats] = useState<AdmissionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Whether the programme catalogue below is what the server actually sent, or just "nothing yet".
  // An empty list means two very different things — "you may not enrol" vs "the request failed" —
  // and the dialog must not blame permissions for a network error.
  const [programsLoaded, setProgramsLoaded] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)
  // Enrolment dialog: the application being accepted, and the programme it will be stamped with.
  const [enrollApp, setEnrollApp] = useState<ApplicationRow | null>(null)
  const [enrollProgramId, setEnrollProgramId] = useState("")
  // The dialog owns its own failure line. Sharing the page-level `error` meant opening the dialog
  // had to clear the page banner (erasing a real "فشل في جلب طلبات الالتحاق"), and any fetch failure
  // leaked into the modal as if it were this enrolment's reason.
  const [enrollError, setEnrollError] = useState<string | null>(null)
  // Review dialog: the applicant being looked at (Eye), shown beside the admission requirements of
  // the programme they applied to — the bylaw's conditions the reviewer has to check the file against.
  const [reviewApp, setReviewApp] = useState<ApplicationRow | null>(null)
  // Requirements editor: which programme is being typed, its draft, and its own failure line.
  const [reqProgramId, setReqProgramId] = useState("")
  const [reqDraft, setReqDraft] = useState<AdmissionRequirements>(EMPTY_ADMISSION_REQUIREMENTS)
  const [reqOpen, setReqOpen] = useState(false)
  const [reqSaving, setReqSaving] = useState(false)
  const [reqError, setReqError] = useState<string | null>(null)
  const [reqSaved, setReqSaved] = useState(false)
  // Saving requirements writes Program.admissionRequirements, which needs `program.edit` — a
  // permission the ADMISSIONS role does not hold. The server says whether this user has it, so the
  // editor can be shown read-only instead of offering a save that can only 403 with the draft lost.
  const [canEditPrograms, setCanEditPrograms] = useState(false)
  // The prior certificate's configured maximum, from the bylaw settings via the API.
  const [maxTotal, setMaxTotal] = useState<number | null>(null)

  // The requirements of a given programme id — an empty set for "no programme resolved yet" and for
  // a catalogue the reviewer was not sent (view-only), so the panel degrades to a plain notice.
  const requirementsOf = (programId: string | null | undefined): AdmissionRequirements =>
    programs.find((p) => p.id === programId)?.admissionRequirements ?? EMPTY_ADMISSION_REQUIREMENTS

  // Opening the dialog from the toolbar must not inherit the previous visit's outcome: a stale
  // «تم حفظ متطلبات الالتحاق.» (or a stale red error) against a programme not yet chosen reads as a
  // save that just happened.
  function openRequirementsDialog() {
    setReqProgramId("")
    setReqDraft(EMPTY_ADMISSION_REQUIREMENTS)
    setReqError(null)
    setReqSaved(false)
    setReqOpen(true)
  }

  function openRequirements(programId: string) {
    setReqProgramId(programId)
    setReqDraft(parseAdmissionRequirements(requirementsOf(programId)))
    setReqError(null)
    setReqSaved(false)
    setReqOpen(true)
  }

  // Requirements live on the Program, so saving them needs `program.edit`. A reviewer who only holds
  // the admissions permissions gets the API's own 403 message rather than a silent no-op.
  async function saveRequirements() {
    if (!reqProgramId) return
    setReqSaving(true)
    setReqError(null)
    try {
      const res = await fetch("/api/institute/programs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reqProgramId, admissionRequirements: reqDraft }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "فشل في حفظ متطلبات الالتحاق")
      }
      // Reflect the save locally: the admissions GET is the only source of this catalogue, and it is
      // refetched on the next filter change anyway.
      setPrograms((prev) => prev.map((p) => (p.id === reqProgramId ? { ...p, admissionRequirements: reqDraft } : p)))
      setReqSaved(true)
    } catch (e) {
      setReqError((e as Error).message)
    } finally {
      setReqSaving(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(buildUrl(activeTab, systemFilter))
        if (!res.ok) throw new Error("فشل في جلب طلبات الالتحاق")
        const json = (await res.json()) as AdmissionsResponse
        if (!cancelled) {
          setApplications(json.applications)
          setPrograms(json.programs ?? [])
          setProgramsLoaded(true)
          setCanEditPrograms(json.canEditPrograms === true)
          setMaxTotal(json.priorCertificateMaxTotal ?? null)
          setApiStats(json.stats)
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
  }, [activeTab, systemFilter])

  // Re-fetch the current tab after a mutation. The stats card counts always
  // reflect the filtered result set returned by the API for that status (and academic system).
  async function reload() {
    setError(null)
    try {
      const res = await fetch(buildUrl(activeTab, systemFilter))
      if (!res.ok) throw new Error("فشل في جلب طلبات الالتحاق")
      const json = (await res.json()) as AdmissionsResponse
      setApplications(json.applications)
      setPrograms(json.programs ?? [])
      setProgramsLoaded(true)
      setCanEditPrograms(json.canEditPrograms === true)
      setMaxTotal(json.priorCertificateMaxTotal ?? null)
      setApiStats(json.stats)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Approving with ENROLLED creates a real Student server-side (intended). The programme travels
  // with it because the created Student's programme is what fixes its academic system — the API now
  // refuses an ENROLLED transition without an explicit one, so nothing gets silently defaulted.
  // Returns null on success, else the failure message — the CALLER decides where it is shown, so a
  // dialog failure lands in the dialog and a row action lands in the page banner.
  async function updateStatus(id: string, status: "ENROLLED" | "REJECTED", programId?: string): Promise<string | null> {
    setActioning(id)
    try {
      const res = await fetch("/api/institute/admissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, ...(programId ? { programId } : {}) }),
      })
      // Show the server's own Arabic message (e.g. "يجب اختيار البرنامج…") instead of flattening
      // every failure into one generic line — the reason is the whole point of the new 400.
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "فشل في تحديث طلب الالتحاق")
      }
      await reload()
      return null
    } catch (e) {
      return (e as Error).message
    } finally {
      setActioning(null)
    }
  }

  // Open the accept dialog, preselecting what the server would resolve on its own: the already
  // stored programme, else the single exact name match on the applicant's free-text choice — the
  // same conservative rule as lib/admission-program.ts, so the reviewer sees the real default.
  function openEnroll(app: ApplicationRow) {
    // Clear only THIS dialog's line. The page banner may be reporting a failed fetch — the very
    // reason the programme list can be empty — and wiping it would leave the reviewer reading the
    // "no programmes available" note as if permissions, not a broken request, were the cause.
    setEnrollError(null)
    const choice = (app.firstChoice ?? "").trim()
    const hits = choice
      ? programs.filter((p) => p.nameAr.trim() === choice || p.nameEn.trim() === choice)
      : []
    setEnrollProgramId(app.programId ?? (hits.length === 1 ? hits[0].id : ""))
    setEnrollApp(app)
  }

  async function confirmEnroll() {
    // The programme is mandatory: it is what decides the student's academic system. The button is
    // disabled without one; this guard covers the keyboard/Enter path too.
    if (!enrollApp || !enrollProgramId) return
    setEnrollError(null)
    // Stay open while the request is in flight so the confirm button's disabled state is visible,
    // and stay open on failure so the reason is read next to the field that caused it.
    const message = await updateStatus(enrollApp.id, "ENROLLED", enrollProgramId)
    if (message) setEnrollError(message)
    else setEnrollApp(null)
  }

  const enrollProgram = programs.find((p) => p.id === enrollProgramId)

  const stats = [
    { label: "إجمالي الطلبات", value: String(apiStats?.total ?? 0), icon: FileText, color: "text-institute-blue" },
    { label: "في الانتظار", value: String(apiStats?.pending ?? 0), icon: Clock, color: "text-yellow-600" },
    { label: "مقبول", value: String(apiStats?.approved ?? 0), icon: CheckCircle, color: "text-institute-blue" },
    { label: "مرفوض", value: String(apiStats?.rejected ?? 0), icon: XCircle, color: "text-red-600" },
  ]

  const getStatusBadge = (app: ApplicationRow) => {
    switch (app.status) {
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-700">{app.statusLabel}</Badge>
      case "APPROVED":
        return <Badge className="bg-institute-blue text-green-700">{app.statusLabel}</Badge>
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-700">{app.statusLabel}</Badge>
      default:
        return <Badge variant="secondary">{app.statusLabel}</Badge>
    }
  }

  // The API already filters by status (?status=) and academic system (?system=), so the rows and the
  // stat cards above always agree. Search narrows further client-side.
  const filteredApplications = applications.filter((app) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    return (
      app.fullName.toLowerCase().includes(q) ||
      app.nationalId.toLowerCase().includes(q) ||
      app.id.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-institute-blue" />
            القبول والتسجيل
          </h1>
          <p className="text-muted-foreground">
            إدارة طلبات القبول وتسجيل الطلاب الجدد
          </p>
        </div>
        <div className="flex gap-2">
          {/* Typing the bylaw's admission conditions needs the programme catalogue; a reviewer who was
              not sent one (view-only) has nothing to edit, so the entry point simply is not offered. */}
          {programs.length > 0 && (
            <Button variant="outline" onClick={openRequirementsDialog}>
              <FileText className="w-4 h-4 ml-2" />
              {canEditPrograms ? "متطلبات الالتحاق" : "عرض متطلبات الالتحاق"}
            </Button>
          )}
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            طلب قبول جديد
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
          <CardContent className="p-12 text-center text-muted-foreground">
            جارٍ تحميل الطلبات...
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/institute/admission/registration">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 text-institute-blue" />
              <p className="font-medium">تسجيل المقررات</p>
              <p className="text-xs text-muted-foreground">فتح باب التسجيل</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/institute/admission/transfers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-institute-blue" />
              <p className="font-medium">التحويلات</p>
              <p className="text-xs text-muted-foreground">من وإلى المعهد</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/institute/admission/equivalence">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-institute-gold" />
              <p className="font-medium">المعادلات</p>
              <p className="text-xs text-muted-foreground">معادلة المقررات</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-institute-gold" />
            <p className="font-medium">التقويم الأكاديمي</p>
            <p className="text-xs text-muted-foreground">مواعيد مهمة</p>
          </CardContent>
        </Card>
      </div>

      {/* Applications */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>طلبات القبول</CardTitle>
              <CardDescription>إدارة ومتابعة طلبات القبول للطلاب الجدد</CardDescription>
            </div>
            {/* Same wrapper as the shipped house pattern (students page): stacking on small
                viewports is what makes the filter's `w-full md:w-48` correct here too. */}
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 w-64"
                />
              </div>
              <AcademicSystemFilter
                value={systemFilter}
                onChange={setSystemFilter}
                className="w-full md:w-48"
              />
              <Button variant="outline">
                <Filter className="w-4 h-4 ml-2" />
                تصفية
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 ml-2" />
                تصدير
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">الكل</TabsTrigger>
              <TabsTrigger value="pending">في الانتظار</TabsTrigger>
              <TabsTrigger value="approved">مقبول</TabsTrigger>
              <TabsTrigger value="rejected">مرفوض</TabsTrigger>
            </TabsList>

            {/* Legacy applications carry only the applicant's free-text choice, so no system filter
                can reach them. Say how many are being left out rather than let the narrowed list
                read as the whole picture. Running scripts/backfill-application-program.ts links them. */}
            {systemFilter !== ACADEMIC_SYSTEM_ALL && (apiStats?.unlinked ?? 0) > 0 && (
              <p className="mb-3 text-xs text-muted-foreground">
                {apiStats?.unlinked} طلب غير مرتبط ببرنامج لا يظهر ضمن تصفية النظام الأكاديمي.
              </p>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>اسم الطالب</TableHead>
                  <TableHead>الرقم القومي</TableHead>
                  <TableHead>المجموع</TableHead>
                  <TableHead>القسم المطلوب</TableHead>
                  <TableHead>تاريخ التقديم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono">{app.id}</TableCell>
                    <TableCell className="font-medium">{app.fullName}</TableCell>
                    <TableCell className="font-mono text-sm">{app.nationalId || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold">
                        <GradeTotal grade={app.highSchoolGrade} maxTotal={maxTotal} />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p>{app.firstChoice || "—"}</p>
                          {/* System comes from the programme applied to; "—" = no programme resolved. */}
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {app.system ? ACADEMIC_SYSTEM_LABELS[app.system] : "—"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {app.email || app.phone || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{app.createdAt}</TableCell>
                    <TableCell>{getStatusBadge(app)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setReviewApp(app)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {app.status === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-institute-blue"
                              disabled={actioning === app.id}
                              onClick={() => openEnroll(app)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              disabled={actioning === app.id}
                              onClick={async () => {
                                const message = await updateStatus(app.id, "REJECTED")
                                if (message) setError(message)
                              }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {systemFilter !== ACADEMIC_SYSTEM_ALL && filteredApplications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      لا توجد طلبات مطابقة للتصفية الحالية
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Tabs>
        </CardContent>
      </Card>

      {/* Accept + enrol. The programme is the whole point of this dialog: it is what the created
          Student inherits, and therefore what decides whether they are graded on credit hours or on
          the annual system. Before this existed the PATCH could only guess from the free-text choice. */}
      <Dialog open={!!enrollApp} onOpenChange={(open) => { if (!open) setEnrollApp(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>قبول وتسجيل الطالب</DialogTitle>
            <DialogDescription>
              سيتم إنشاء ملف طالب باسم «{enrollApp?.fullName}». البرنامج المختار هو ما يحدد نظامه الأكاديمي.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label>
              البرنامج <span className="text-red-600">*</span>
            </Label>
            {/* value must never be undefined: Radix reads that as UNCONTROLLED, so the trigger would
                keep the previous applicant's programme while state says none. "" is controlled and
                still renders the placeholder. */}
            <Select value={enrollProgramId} onValueChange={setEnrollProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر البرنامج" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nameAr} — {ACADEMIC_SYSTEM_LABELS[p.academicSystem]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              رغبة الطالب كما كتبها: {enrollApp?.firstChoice || "—"}
            </p>
            {/* The catalogue only ships to reviewers holding admission.application.decide, so an
                empty list means "you cannot enrol", not "no programmes exist" — say which. And only
                once a request actually succeeded: before that, empty means "not loaded", and naming
                permissions there would be a guess at the reason for a permanently disabled button. */}
            {programs.length === 0 && (
              <p className="text-xs text-amber-600">
                {programsLoaded
                  ? "لا توجد برامج متاحة للاختيار — تأكد من صلاحية اعتماد طلبات الالتحاق ومن إضافة البرامج أولاً."
                  : "تعذّر تحميل قائمة البرامج — أعد تحميل الصفحة ثم حاول مرة أخرى."}
              </p>
            )}
            {enrollProgram ? (
              /* The decision the registrar is actually making. The system is never picked directly —
                 it is read off the chosen programme — so show the resolved value here, at the moment
                 of the decision, rather than letting it be discovered months later at grading. */
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">النظام الأكاديمي:</span>
                <Badge
                  variant="outline"
                  className={
                    enrollProgram.academicSystem === "ANNUAL"
                      ? "border-institute-gold text-institute-gold"
                      : "border-institute-blue text-institute-blue"
                  }
                >
                  {ACADEMIC_SYSTEM_LABELS[enrollProgram.academicSystem]}
                </Badge>
              </div>
            ) : (
              /* No silent fallback any more: without a programme the API refuses the enrolment, so
                 say that plainly instead of describing a guess the server will make. */
              <p className="text-xs text-amber-600">
                اختيار البرنامج إلزامي — منه يُحدَّد النظام الأكاديمي للطالب (نظام الساعات المعتمدة أو
                النظام السنوي)، ولا يمكن إتمام التسجيل بدونه.
              </p>
            )}
            {/* The bylaw's own admission conditions for the chosen programme, beside the applicant —
                so the decision is taken against the rule rather than from memory. */}
            {enrollProgram && (
              /* Through the same null-safe accessor as every other call site, so a payload without
                 the key can never blow up mid-decision. */
              <RequirementsPanel req={requirementsOf(enrollProgram.id)} app={enrollApp} maxTotal={maxTotal} />
            )}
          </div>

          {/* The page-level error card sits behind the modal overlay, and the dialog now stays open
              when the API refuses (e.g. no programme) — so show THIS enrolment's own reason here.
              Deliberately not the page-level `error`: that one may belong to a failed list fetch. */}
          {enrollError && <p className="text-sm text-red-600">{enrollError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollApp(null)}>إلغاء</Button>
            {/* Disabled until a programme is chosen: enrolling is exactly the moment the student's
                academic system is fixed, so it must be an explicit pick, never an accepted default. */}
            <Button onClick={confirmEnroll} disabled={!enrollProgramId || actioning === enrollApp?.id}>
              تأكيد القبول والتسجيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* مراجعة الطلب — the applicant's file beside what the bylaw demands of the programme they
          applied to. Read-only: no field here decides anything, it is the reviewer's checklist. */}
      <Dialog open={!!reviewApp} onOpenChange={(open) => { if (!open) setReviewApp(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>مراجعة طلب الالتحاق</DialogTitle>
            <DialogDescription>بيانات المتقدم ومتطلبات الالتحاق بالبرنامج المطلوب.</DialogDescription>
          </DialogHeader>
          {reviewApp && (
            <div className="space-y-3 py-1 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">الاسم: </span>{reviewApp.fullName}</div>
                <div><span className="text-muted-foreground">الرقم القومي: </span>{reviewApp.nationalId || "—"}</div>
                <div><span className="text-muted-foreground">المؤهل: </span>{reviewApp.qualificationType || "—"}</div>
                <div><span className="text-muted-foreground">سنة المؤهل: </span>{reviewApp.highSchoolYear || "—"}</div>
                <div><span className="text-muted-foreground">المجموع: </span><GradeTotal grade={reviewApp.highSchoolGrade} maxTotal={maxTotal} /></div>
                <div><span className="text-muted-foreground">الأوراق: </span>{reviewApp.documentsComplete ? "مكتملة" : "غير مكتملة"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">الرغبة: </span>{reviewApp.firstChoice || "—"}</div>
              </div>
              {reviewApp.programId ? (
                <RequirementsPanel req={requirementsOf(reviewApp.programId)} app={reviewApp} maxTotal={maxTotal} />
              ) : (
                /* No resolved programme ⇒ no requirements to check against; say which, rather than
                   showing an empty checklist that reads as «لا شروط». */
                <p className="text-xs text-amber-600">
                  الطلب غير مرتبط ببرنامج بعد — لا يمكن عرض متطلبات الالتحاق حتى يُحدَّد البرنامج.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewApp(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* متطلبات الالتحاق — typed per programme, because the bylaw states them per department and no
          two departments share them. Stored on Program, so saving needs صلاحية تعديل البرامج. */}
      <Dialog
        open={reqOpen}
        onOpenChange={(open) => {
          // Closing clears the outcome lines too, so nothing survives to the next visit.
          if (!open) { setReqError(null); setReqSaved(false) }
          setReqOpen(open)
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>متطلبات الالتحاق بالبرنامج</DialogTitle>
            <DialogDescription>
              {canEditPrograms
                ? "اكتب شروط اللائحة كما وردت — تظهر للمراجع مع كل طلب على هذا البرنامج."
                : "عرض فقط — حفظ المتطلبات يحتاج صلاحية «تعديل البرامج»؛ اطلب من إدارة المعهد إضافتها أو تعديل المتطلبات."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>البرنامج</Label>
            <Select value={reqProgramId} onValueChange={openRequirements}>
              <SelectTrigger>
                <SelectValue placeholder="اختر البرنامج" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reqProgramId ? (
            <div className="pt-2">
              {canEditPrograms ? (
                <RequirementsEditor value={reqDraft} onChange={(v) => { setReqDraft(v); setReqSaved(false) }} />
              ) : (
                /* No `program.edit` ⇒ no editable form. Showing the typed conditions read-only is
                   honest; showing inputs and a save button that can only 403 is not. */
                <RequirementsPanel req={reqDraft} app={null} maxTotal={maxTotal} />
              )}
            </div>
          ) : (
            <p className="pt-2 text-xs text-muted-foreground">اختر برنامجاً لتحرير متطلبات الالتحاق به.</p>
          )}
          {reqError && <p className="text-sm text-red-600">{reqError}</p>}
          {reqSaved && !reqError && <p className="text-sm text-institute-blue">تم حفظ متطلبات الالتحاق.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReqError(null); setReqSaved(false); setReqOpen(false) }}>إغلاق</Button>
            {canEditPrograms && (
              <Button onClick={saveRequirements} disabled={!reqProgramId || reqSaving}>
                {reqSaving ? "جارٍ الحفظ…" : "حفظ المتطلبات"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
