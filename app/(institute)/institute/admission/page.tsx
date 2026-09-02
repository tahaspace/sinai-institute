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
  stats: AdmissionStats
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
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          طلب قبول جديد
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
                        {app.highSchoolGrade}%
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
                        <Button variant="ghost" size="icon">
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
    </div>
  )
}
