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
  const [actioning, setActioning] = useState<string | null>(null)
  // Enrolment dialog: the application being accepted, and the programme it will be stamped with.
  const [enrollApp, setEnrollApp] = useState<ApplicationRow | null>(null)
  const [enrollProgramId, setEnrollProgramId] = useState("")

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
      setApiStats(json.stats)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Approving with ENROLLED creates a real Student server-side (intended). programId is sent only
  // when the reviewer picked one — the created Student's programme is what fixes its academic
  // system, so leaving it out is how a student ends up silently on credit-hours.
  async function updateStatus(id: string, status: "ENROLLED" | "REJECTED", programId?: string) {
    setActioning(id)
    try {
      const res = await fetch("/api/institute/admissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, ...(programId ? { programId } : {}) }),
      })
      if (!res.ok) throw new Error("فشل في تحديث طلب الالتحاق")
      await reload()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setActioning(null)
    }
  }

  // Open the accept dialog, preselecting what the server would resolve on its own: the already
  // stored programme, else the single exact name match on the applicant's free-text choice — the
  // same conservative rule as lib/admission-program.ts, so the reviewer sees the real default.
  function openEnroll(app: ApplicationRow) {
    const choice = (app.firstChoice ?? "").trim()
    const hits = choice
      ? programs.filter((p) => p.nameAr.trim() === choice || p.nameEn.trim() === choice)
      : []
    setEnrollProgramId(app.programId ?? (hits.length === 1 ? hits[0].id : ""))
    setEnrollApp(app)
  }

  async function confirmEnroll() {
    if (!enrollApp) return
    // Stay open while the request is in flight so the confirm button's disabled state is visible.
    await updateStatus(enrollApp.id, "ENROLLED", enrollProgramId || undefined)
    setEnrollApp(null)
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
                              onClick={() => updateStatus(app.id, "REJECTED")}
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
            <Label>البرنامج</Label>
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
            {enrollProgram ? (
              <p className="text-xs">
                النظام الأكاديمي:{" "}
                <span className="font-medium">{ACADEMIC_SYSTEM_LABELS[enrollProgram.academicSystem]}</span>
              </p>
            ) : (
              /* Don't promise "no programme": the PATCH still tries an exact name match on the
                 free-text choice, so a programme (and a system) may be assigned anyway. */
              <p className="text-xs text-red-600">
                لم يتم اختيار برنامج — سيحاول النظام مطابقة الرغبة النصية باسم برنامج مطابق تماماً، وإن
                تعذّر ذلك سيُنشأ الطالب بلا برنامج ويُعامل افتراضياً على نظام الساعات المعتمدة.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollApp(null)}>إلغاء</Button>
            <Button onClick={confirmEnroll} disabled={actioning === enrollApp?.id}>
              تأكيد القبول والتسجيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
