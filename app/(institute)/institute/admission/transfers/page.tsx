"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
import { ACADEMIC_SYSTEM_LABELS, type AcademicSystem } from "@/lib/academic-system-shared"
import { Building2, ArrowLeftRight, Plus, Eye, CheckCircle, XCircle, Clock } from "lucide-react"

// --- API response shapes (served by /api/institute/admission/transfers) ---
interface TransferRow {
  id: string
  name: string
  from?: string
  to?: string
  department: string
  date: string
  status: string
  /** Resolved server-side from the linked student's programme, else the request's own programme —
   *  the one it is attributed to: transferred INTO for INCOMING, LEFT for OUTGOING. null = unattributable. */
  system: AcademicSystem | null
}
interface StudentOption {
  id: string
  studentCode: string
  nameAr: string
  department: string
  program: string
  system: AcademicSystem | null
}
interface ProgramOption {
  id: string
  nameAr: string
  academicSystem: AcademicSystem
}
interface TransferStats {
  incoming: number
  outgoing: number
  pending: number
  completed: number
}
interface TransfersResponse {
  incoming: TransferRow[]
  outgoing: TransferRow[]
  stats: TransferStats
  students?: StudentOption[]
  programs?: ProgramOption[]
  canCreate?: boolean
}

export default function TransfersPage() {
  const [incomingTransfers, setIncomingTransfers] = useState<TransferRow[]>([])
  const [outgoingTransfers, setOutgoingTransfers] = useState<TransferRow[]>([])
  const [stats, setStats] = useState<TransferStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [students, setStudents] = useState<StudentOption[]>([])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [canCreate, setCanCreate] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)

  // «طلب تحويل جديد» dialog state.
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<{
    direction: "INCOMING" | "OUTGOING"
    studentId: string
    programId: string
    studentName: string
    institution: string
    notes: string
  }>({ direction: "INCOMING", studentId: "", programId: "", studentName: "", institution: "", notes: "" })
  const [studentQuery, setStudentQuery] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // One loader for the initial fetch and for the reload after a create. `signal` keeps the original
  // unmount guard: the effect flips it so a late response cannot set state on a gone component.
  async function load(signal?: { cancelled: boolean }) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/institute/admission/transfers")
      if (!res.ok) throw new Error("فشل تحميل البيانات")
      const json = (await res.json()) as TransfersResponse
      if (signal?.cancelled) return
      setIncomingTransfers(json.incoming ?? [])
      setOutgoingTransfers(json.outgoing ?? [])
      setStats(json.stats ?? null)
      setCanCreate(!!json.canCreate)
    } catch (e) {
      if (!signal?.cancelled) setError((e as Error).message)
    } finally {
      if (!signal?.cancelled) setLoading(false)
    }
  }

  // The dialog's pickers are the whole live roster with two joins, so they are NOT part of the
  // routine list load — they are fetched once, when the dialog is first opened.
  async function loadOptions() {
    if (students.length || programs.length || optionsLoading) return
    setOptionsLoading(true)
    try {
      const res = await fetch("/api/institute/admission/transfers?options=1")
      if (!res.ok) return
      const json = (await res.json()) as TransfersResponse
      setStudents(json.students ?? [])
      setPrograms(json.programs ?? [])
    } finally {
      setOptionsLoading(false)
    }
  }

  useEffect(() => {
    const signal = { cancelled: false }
    load(signal)
    return () => {
      signal.cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The filter NARROWS: «كل الأنظمة» keeps every row, unattributable ones included.
  //
  // matchesSystem() alone is not enough here. It buckets a null system under CREDIT_HOURS (the
  // platform default), which is right for a student — their programme is simply unset — but wrong
  // for a transfer request that is linked to neither a student nor a programme: listing it under a
  // picked system would assert a system nobody recorded. So attributable rows go through
  // matchesSystem, and unattributable ones are held back and COUNTED below, exactly as the
  // admissions screen reports its programme-less applications instead of implying they do not exist.
  const bySystem = (r: TransferRow) =>
    systemFilter === ACADEMIC_SYSTEM_ALL ? true : r.system !== null && matchesSystem(r.system, systemFilter)

  const visibleIncoming = incomingTransfers.filter(bySystem)
  const visibleOutgoing = outgoingTransfers.filter(bySystem)
  const unattributedIncoming = incomingTransfers.filter((r) => r.system === null).length
  const unattributedOutgoing = outgoingTransfers.filter((r) => r.system === null).length

  const selectedStudent = students.find((s) => s.id === form.studentId)
  const selectedProgram = programs.find((p) => p.id === form.programId)
  // Searchable by code OR name, the same predicate the students screen uses for its own search box.
  const studentMatches = students.filter(
    (s) => !studentQuery || s.nameAr.includes(studentQuery) || s.studentCode.includes(studentQuery),
  )
  const STUDENT_LIST_CAP = 100
  const cappedMatches = studentMatches.slice(0, STUDENT_LIST_CAP)
  const studentsTruncated = studentMatches.length > STUDENT_LIST_CAP
  // The selected student is ALWAYS an item, even when the current query or the 100-row cap excludes
  // them — otherwise the trigger falls back to the placeholder while form.studentId is still set,
  // and the request is submitted for a student the screen is no longer showing.
  const studentItems =
    selectedStudent && !cappedMatches.some((s) => s.id === selectedStudent.id)
      ? [selectedStudent, ...cappedMatches]
      : cappedMatches

  function openCreate() {
    setCreateError(null)
    setStudentQuery("")
    setForm({ direction: "INCOMING", studentId: "", programId: "", studentName: "", institution: "", notes: "" })
    setCreateOpen(true)
    loadOptions()
  }

  async function submitCreate() {
    setCreateError(null)
    setSaving(true)
    try {
      const res = await fetch("/api/institute/admission/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: form.direction,
          institution: form.institution.trim(),
          notes: form.notes.trim() || undefined,
          // Only the link that direction actually uses is sent; the server enforces the same rule.
          studentId: form.direction === "OUTGOING" ? form.studentId : undefined,
          programId: form.programId || undefined,
          studentName: form.direction === "INCOMING" ? form.studentName.trim() : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "فشل إنشاء طلب التحويل")
      setCreateOpen(false)
      await load()
    } catch (e) {
      setCreateError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // Mirrors the server's own validation so the button cannot promise a request the API will refuse.
  // The server refuses a request in either direction that cannot be attributed to a system, so an
  // outgoing request for a student whose file carries no programme needs an explicit one here too.
  const outgoingNeedsProgram = form.direction === "OUTGOING" && !!selectedStudent && selectedStudent.system === null
  const canSubmit =
    !!form.institution.trim() &&
    (form.direction === "OUTGOING"
      ? !!form.studentId && (!outgoingNeedsProgram || !!form.programId)
      : !!form.programId && !!form.studentName.trim())

  // The cards are whole-module counts and do NOT follow the academic-system filter, so while a
  // system is picked each label says so rather than letting «5» sit above a table showing 1.
  const allSystems = systemFilter === ACADEMIC_SYSTEM_ALL
  const cardSuffix = allSystems ? "" : " (كل الأنظمة)"
  const statCards = [
    { label: `طلبات واردة${cardSuffix}`, value: stats?.incoming ?? 0, color: "text-institute-blue" },
    { label: `طلبات صادرة${cardSuffix}`, value: stats?.outgoing ?? 0, color: "text-institute-blue" },
    { label: `في الانتظار${cardSuffix}`, value: stats?.pending ?? 0, color: "text-yellow-600" },
    { label: `مكتملة${cardSuffix}`, value: stats?.completed ?? 0, color: "text-institute-gold" },
  ]

  // «—» when the request is attributable to neither a student's programme nor a target programme —
  // never a defaulted نظام الساعات المعتمدة, which would be a claim the data does not support.
  const getSystemBadge = (system: AcademicSystem | null) => (
    <Badge
      variant="outline"
      className={`text-[10px] font-normal ${
        system === "ANNUAL" ? "border-institute-gold text-institute-gold" : system ? "border-institute-blue text-institute-blue" : ""
      }`}
    >
      {system ? ACADEMIC_SYSTEM_LABELS[system] : "—"}
    </Badge>
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 ml-1" />في الانتظار</Badge>
      case "approved":
        return <Badge className="bg-institute-blue text-green-700"><CheckCircle className="w-3 h-3 ml-1" />مقبول</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 ml-1" />مرفوض</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-institute-blue" />
            التحويلات
          </h1>
          <p className="text-muted-foreground">إدارة طلبات التحويل من وإلى المعهد</p>
        </div>
        {/* Only offered to a registrar the API will actually accept a POST from (transfer.approve). */}
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 ml-2" />
            طلب تحويل جديد
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center text-red-700">{error}</CardContent>
        </Card>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">تحويلات واردة</TabsTrigger>
          <TabsTrigger value="outgoing">تحويلات صادرة</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle>طلبات التحويل الواردة</CardTitle>
                  <CardDescription>طلبات التحويل من مؤسسات أخرى إلى المعهد</CardDescription>
                </div>
                {/* Inline with the list it narrows — never above the stat cards, which stay whole-module counts. */}
                <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-48" />
              </div>
            </CardHeader>
            <CardContent>
              {/* Held-back rows are named, not dropped in silence. */}
              {systemFilter !== ACADEMIC_SYSTEM_ALL && unattributedIncoming > 0 && (
                <p className="mb-3 text-xs text-muted-foreground">
                  {unattributedIncoming} طلب غير منسوب لنظام (لا برنامج محوَّل إليه ولا طالب مرتبط) لا يظهر ضمن تصفية النظام الأكاديمي.
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الطالب</TableHead>
                    <TableHead>المؤسسة السابقة</TableHead>
                    <TableHead>القسم المطلوب</TableHead>
                    <TableHead>تاريخ الطلب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleIncoming.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">{transfer.name}</TableCell>
                      <TableCell>{transfer.from}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{transfer.department}</span>
                          {getSystemBadge(transfer.system)}
                        </div>
                      </TableCell>
                      <TableCell>{transfer.date}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleIncoming.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        {systemFilter !== ACADEMIC_SYSTEM_ALL ? "لا توجد طلبات مطابقة للنظام المحدد" : "لا توجد طلبات تحويل واردة"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outgoing">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle>طلبات التحويل الصادرة</CardTitle>
                  <CardDescription>طلبات التحويل من المعهد إلى مؤسسات أخرى</CardDescription>
                </div>
                <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-48" />
              </div>
            </CardHeader>
            <CardContent>
              {systemFilter !== ACADEMIC_SYSTEM_ALL && unattributedOutgoing > 0 && (
                <p className="mb-3 text-xs text-muted-foreground">
                  {unattributedOutgoing} طلب غير منسوب لنظام (الطالب غير مرتبط ببرنامج) لا يظهر ضمن تصفية النظام الأكاديمي.
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الطالب</TableHead>
                    <TableHead>المؤسسة المطلوبة</TableHead>
                    <TableHead>القسم الحالي</TableHead>
                    <TableHead>تاريخ الطلب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleOutgoing.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">{transfer.name}</TableCell>
                      <TableCell>{transfer.to}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{transfer.department}</span>
                          {getSystemBadge(transfer.system)}
                        </div>
                      </TableCell>
                      <TableCell>{transfer.date}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleOutgoing.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        {systemFilter !== ACADEMIC_SYSTEM_ALL ? "لا توجد طلبات مطابقة للنظام المحدد" : "لا توجد طلبات تحويل صادرة"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create — the module's missing half. The direction decides WHICH link is captured, and that
          link is the only thing that can attribute the request to an academic system: an outgoing
          request rides the student's own programme, an incoming one has no student yet and must name
          the programme it is transferring INTO. */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>طلب تحويل جديد</DialogTitle>
            <DialogDescription>
              يُسجَّل الطلب بحالة «في الانتظار» ثم يمر بنفس مسار الاعتماد الحالي.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>اتجاه التحويل <span className="text-red-600">*</span></Label>
              <Select
                value={form.direction}
                onValueChange={(v) =>
                  // Switching direction clears the other direction's link, so a leftover student or
                  // programme cannot be submitted under a direction that does not use it.
                  setForm((f) => ({ ...f, direction: v as "INCOMING" | "OUTGOING", studentId: "", programId: "", studentName: "" }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOMING">وارد — طالب وافد من جهة أخرى</SelectItem>
                  <SelectItem value="OUTGOING">صادر — طالب بالمعهد ينتقل لجهة أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.direction === "OUTGOING" ? (
              <div className="space-y-2">
                <Label>الطالب <span className="text-red-600">*</span></Label>
                <Input
                  placeholder="بحث بالاسم أو الرقم الأكاديمي..."
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                />
                <Select value={form.studentId} onValueChange={(v) => setForm((f) => ({ ...f, studentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                  <SelectContent>
                    {studentItems.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.studentCode} — {st.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {optionsLoading && <p className="text-xs text-muted-foreground">جارٍ تحميل قائمة الطلاب...</p>}
                {studentQuery && studentMatches.length === 0 && (
                  <p className="text-xs text-muted-foreground">لا يوجد طلاب مطابقون لهذا البحث</p>
                )}
                {studentsTruncated && (
                  <p className="text-xs text-muted-foreground">يتم عرض أول {STUDENT_LIST_CAP} نتيجة — أضف كلمة بحث لتضييق القائمة.</p>
                )}
                {selectedStudent && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{selectedStudent.department} · {selectedStudent.program} · النظام الأكاديمي:</span>
                    {getSystemBadge(selectedStudent.system)}
                  </div>
                )}
                {/* Only when the student's own file names no programme: the server refuses a request
                    that could be attributed to no system, so the programme being LEFT is asked for
                    here instead of failing on save. */}
                {outgoingNeedsProgram && (
                  <div className="space-y-2 pt-1">
                    <Label>البرنامج المحوَّل منه <span className="text-red-600">*</span></Label>
                    <Select value={form.programId} onValueChange={(v) => setForm((f) => ({ ...f, programId: v }))}>
                      <SelectTrigger><SelectValue placeholder="اختر البرنامج" /></SelectTrigger>
                      <SelectContent>
                        {programs.map((pr) => (
                          <SelectItem key={pr.id} value={pr.id}>
                            {pr.nameAr} — {ACADEMIC_SYSTEM_LABELS[pr.academicSystem]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-amber-600">
                      هذا الطالب غير مرتبط ببرنامج — حدِّد البرنامج ليُنسب الطلب لنظام أكاديمي.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>اسم الطالب الوافد <span className="text-red-600">*</span></Label>
                  <Input
                    value={form.studentName}
                    onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
                    placeholder="الاسم كما ورد من الجهة المحوِّل منها"
                  />
                </div>
                <div className="space-y-2">
                  <Label>البرنامج المحوَّل إليه <span className="text-red-600">*</span></Label>
                  <Select value={form.programId} onValueChange={(v) => setForm((f) => ({ ...f, programId: v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر البرنامج" /></SelectTrigger>
                    <SelectContent>
                      {programs.map((pr) => (
                        <SelectItem key={pr.id} value={pr.id}>
                          {pr.nameAr} — {ACADEMIC_SYSTEM_LABELS[pr.academicSystem]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProgram ? (
                    /* Same reveal as the admission enrolment dialog: the system is never picked
                       directly, so show what the choice resolves to at the moment of the decision. */
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">النظام الأكاديمي:</span>
                      {getSystemBadge(selectedProgram.academicSystem)}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">
                      اختيار البرنامج إلزامي — منه وحده يُحدَّد النظام الأكاديمي للطلب الوارد، إذ لا يوجد ملف طالب بعد.
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>
                {form.direction === "INCOMING" ? "الجهة الوافد منها" : "الجهة المحوَّل إليها"}{" "}
                <span className="text-red-600">*</span>
              </Label>
              <Input
                value={form.institution}
                onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                placeholder="اسم المؤسسة التعليمية"
              />
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          {createError && <p className="text-sm text-red-600">{createError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button onClick={submitCreate} disabled={!canSubmit || saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
