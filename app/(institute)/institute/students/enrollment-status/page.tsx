"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PauseCircle, PlayCircle, AlertTriangle, UserMinus, Clock } from "lucide-react"

// شاشة «حالة القيد» — وقف القيد وإعادته، وتوصية إلغاء القيد والإدراج ضمن الانتساب.
// لا قيمة لائحية مكتوبة هنا: كل الحدود تصل من الـ API كما حفظها المعهد في شاشة اللائحة (limits).

type Limits = {
  suspensionMaxConsecutiveTerms: number
  suspensionMaxSeparateTerms: number
  reenrolmentNoticeWeeks: number
  annulmentConsecutiveMonitoringTerms: number
  annulmentSeparateMonitoringTerms: number
  affiliateMaxTerms: number
  affiliateMinLevel: number
}
type StudentRow = { id: string; studentCode: string; name: string; level: number; department: string; program: string; statusCode: string; academicState: string; academicStateLabel: string; affiliateSince: string | null; affiliateTermsUsed: number; affiliateReason: string; suspensionTermsUsed: number }
type SuspensionRow = { id: string; studentId: string; studentCode: string; name: string; department: string; level: number; startTerm: string; terms: number; reason: string; approvedBy: string; approvedAt: string | null; dueDate: string | null; dueSoon: boolean; overdue: boolean; status: string; reenrolledAt: string | null }
type Candidate = { studentId: string; studentCode: string; name: string; level: number; department: string; cgpa: number; consecutive: number; separate: number; reason: string }
type TermRow = { id: string; academicYear: string; termType: string; isCurrent: boolean; label: string }

const STATE_BADGE: Record<string, string> = {
  انتظام: "bg-green-100 text-green-700",
  "وقف قيد": "bg-amber-100 text-amber-700",
  "المراقبة الأكاديمية": "bg-orange-100 text-orange-700",
  انتساب: "bg-purple-100 text-purple-700",
  مفصول: "bg-red-100 text-red-700",
}
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ar-EG") : "—")

export default function EnrollmentStatusPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [students, setStudents] = useState<StudentRow[]>([])
  const [suspensions, setSuspensions] = useState<SuspensionRow[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [terms, setTerms] = useState<TermRow[]>([])
  const [limits, setLimits] = useState<Limits | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ studentId: "", termKey: "", terms: "1", reason: "", dueDate: "" })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/institute/students/enrollment-status?search=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "تعذر جلب البيانات")
      setStudents(data.students ?? [])
      setSuspensions(data.suspensions ?? [])
      setCandidates(data.annulmentCandidates ?? [])
      setTerms(data.terms ?? [])
      setLimits(data.limits ?? null)
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع")
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const act = async (payload: Record<string, unknown>) => {
    setBusy(true)
    try {
      const res = await fetch("/api/institute/students/enrollment-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "فشل الإجراء")
      setError("")
      setDialogOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع")
    } finally {
      setBusy(false)
    }
  }

  const activeSuspensions = useMemo(() => suspensions.filter((s) => s.status === "ACTIVE"), [suspensions])
  const dueBack = useMemo(() => activeSuspensions.filter((s) => s.dueSoon || s.overdue), [activeSuspensions])
  // صفوف بلا تاريخ استحقاق — تُعرض بدل أن تختفي: تقويم المعهد لم يُضبط لفصل العودة ولم يُكتب تاريخ.
  const noDueDate = useMemo(() => activeSuspensions.filter((s) => !s.dueDate), [activeSuspensions])
  const affiliates = useMemo(() => students.filter((s) => s.statusCode === "AFFILIATE"), [students])
  const dismissed = useMemo(() => students.filter((s) => s.statusCode === "DISMISSED"), [students])
  // الفصول المتبقية من رصيد «3 فصول منفصلة» — يُحسب من نفس الصفوف التي يعدّها الـ API.
  // الرصيد المستهلك يصل محسوباً من الخادم على كل صفوف المعهد، لا على الصفوف الظاهرة بعد البحث،
  // حتى لا يَعِد الرصيد المعروض بوقفٍ يرفضه الخادم.
  const usedTermsByStudent = useMemo(
    () => new Map(students.map((s) => [s.id, s.suspensionTermsUsed ?? 0])),
    [students],
  )
  const usedTerms = (studentId: string) => usedTermsByStudent.get(studentId) ?? 0

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">حالة القيد — الوقف وإعادة القيد والانتساب</h1>
        <p className="text-muted-foreground text-sm mt-1">
          «ايقاف قيد الطالب : يسمح بايقاف قيد طالب تحت اذنه او طلبه لمده ( فصلين متالين او 3 فصول منفصله ) ، عند انتهاء
          المده يطلب اعاده القيد باسبوعين علي الاقل» — و«يلغي قيد الطالب ويتم ادراجه ضمن الانتساب : اذا كان تحت المراقبه
          ( ثلاث فصول متصله او اربعه فصول منفصله )».
        </p>
        {limits && (
          <p className="text-xs text-muted-foreground mt-2">
            الحدود المطبَّقة من اللائحة: وقف القيد {limits.suspensionMaxConsecutiveTerms} فصلين متتاليين /{" "}
            {limits.suspensionMaxSeparateTerms} فصول منفصلة · التنبيه لإعادة القيد قبل {limits.reenrolmentNoticeWeeks}{" "}
            أسبوعين · إلغاء القيد عند {limits.annulmentConsecutiveMonitoringTerms} فصول متصلة أو{" "}
            {limits.annulmentSeparateMonitoringTerms} منفصلة تحت المراقبة · الانتساب بحد أقصى {limits.affiliateMaxTerms}{" "}
            فصول من المستوى {limits.affiliateMinLevel} فأعلى.
          </p>
        )}
      </div>

      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3">
        <Input placeholder="بحث بالاسم أو الرقم الأكاديمي…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Button onClick={() => setDialogOpen(true)}>
          <PauseCircle className="w-4 h-4 ml-2" /> وقف قيد طالب
        </Button>
      </div>

      <Tabs defaultValue="suspensions">
        <TabsList>
          <TabsTrigger value="suspensions">الموقوف قيدهم ({activeSuspensions.length})</TabsTrigger>
          <TabsTrigger value="due">المستحق إعادة قيدهم ({dueBack.length})</TabsTrigger>
          <TabsTrigger value="annulment">توصيات إلغاء القيد ({candidates.length})</TabsTrigger>
          <TabsTrigger value="affiliate">الانتساب ({affiliates.length})</TabsTrigger>
          <TabsTrigger value="history">سجل الوقف ({suspensions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suspensions">
          <Card>
            <CardHeader>
              <CardTitle>وقف القيد الساري</CardTitle>
              <CardDescription>الطالب الموقوف قيده ممنوع من تسجيل المقررات — تُطبَّق من قائمة الحالات المحجوبة في اللائحة.</CardDescription>
            </CardHeader>
            <CardContent>
              <SuspensionTable rows={activeSuspensions} onReenrol={(r) => act({ action: "reenrol", studentId: r.studentId, suspensionId: r.id })} onCancel={(r) => act({ action: "cancel", studentId: r.studentId, suspensionId: r.id })} busy={busy} usedTerms={usedTerms} limits={limits} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="due">
          <Card>
            <CardHeader>
              <CardTitle>مستحقو إعادة القيد</CardTitle>
              <CardDescription>«عند انتهاء المده يطلب اعاده القيد باسبوعين علي الاقل» — تظهر هنا قبل الاستحقاق بمدة الإخطار.</CardDescription>
            </CardHeader>
            <CardContent>
              <SuspensionTable rows={dueBack} onReenrol={(r) => act({ action: "reenrol", studentId: r.studentId, suspensionId: r.id })} onCancel={(r) => act({ action: "cancel", studentId: r.studentId, suspensionId: r.id })} busy={busy} usedTerms={usedTerms} limits={limits} />
              {noDueDate.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2 text-sm">بلا تاريخ استحقاق ({noDueDate.length})</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    يُشتق تاريخ الاستحقاق من فصل بداية الوقف وعدد الفصول على تقويم المعهد؛ هذه الصفوف لم يُضبط لفصل
                    عودتها تقويم ولم يُكتب لها تاريخ، فتظهر هنا بدل أن تختفي من الاستحقاق.
                  </p>
                  <SuspensionTable rows={noDueDate} onReenrol={(r) => act({ action: "reenrol", studentId: r.studentId, suspensionId: r.id })} onCancel={(r) => act({ action: "cancel", studentId: r.studentId, suspensionId: r.id })} busy={busy} usedTerms={usedTerms} limits={limits} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annulment">
          <Card>
            <CardHeader>
              <CardTitle>توصية بإلغاء القيد والإدراج ضمن الانتساب</CardTitle>
              <CardDescription>
                توصية فقط — لا يُلغى قيد أحد تلقائياً. الأعداد مأخوذة من محرك الحالة الأكاديمية (فصول المراقبة المتصلة
                والمنفصلة، دون احتساب الفصل الصيفي).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد حالات تنطبق عليها اللائحة.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الطالب</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>المعدل</TableHead>
                      <TableHead>فصول المراقبة</TableHead>
                      <TableHead>السبب اللائحي</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((c) => (
                      <TableRow key={c.studentId}>
                        <TableCell>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.studentCode} — المستوى {c.level}</div>
                        </TableCell>
                        <TableCell>{c.department}</TableCell>
                        <TableCell>{c.cgpa.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{c.consecutive} متصلة</Badge>{" "}
                          <Badge variant="outline">{c.separate} منفصلة</Badge>
                        </TableCell>
                        <TableCell className="max-w-[28rem] text-xs">{c.reason}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="destructive" disabled={busy} onClick={() => act({ action: "annul-to-affiliate", studentId: c.studentId })}>
                            <UserMinus className="w-4 h-4 ml-1" /> إلغاء القيد وإدراج ضمن الانتساب
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="affiliate">
          <Card>
            <CardHeader>
              <CardTitle>طلاب الانتساب</CardTitle>
              <CardDescription>
                «اذا كان طالب من طلاب المستوي الثاني او الثالث او الرابع وتم فصله فيمكن اعاده القيد كطالب من خارج مع حضور
                دروس عمليه ويكون اعاده القيد بحد اقصي ثلاث فصول متاليية ، علي ان يتحول الي طالب نظامي مره اخري بعد
                انتقاء سبب فصله من المعهد».
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الطالب</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>المستوى</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>رصيد فصول الانتساب</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">لا يوجد طلاب ضمن الانتساب.</TableCell></TableRow>
                  )}
                  {affiliates.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.studentCode}</div>
                      </TableCell>
                      <TableCell>{s.department}</TableCell>
                      <TableCell>{s.level}</TableCell>
                      <TableCell><Badge className={STATE_BADGE[s.academicStateLabel] ?? ""}>{s.academicStateLabel}</Badge></TableCell>
                      <TableCell className="text-xs">
                        استُهلك {s.affiliateTermsUsed ?? 0}
                        {limits ? ` من ${limits.affiliateMaxTerms}` : ""}
                        {limits && limits.affiliateMaxTerms > 0 && (s.affiliateTermsUsed ?? 0) >= limits.affiliateMaxTerms && (
                          <Badge className="bg-red-100 text-red-700 mr-2">استُنفد الحد</Badge>
                        )}
                        <div className="text-muted-foreground">منذ {fmt(s.affiliateSince)}</div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "affiliate-restore", studentId: s.id })}>
                          إعادته طالباً نظامياً
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div>
                <h3 className="font-semibold mb-2 text-sm">إعادة قيد مفصول ضمن الانتساب</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الطالب</TableHead>
                      <TableHead>المستوى</TableHead>
                      <TableHead>رصيد فصول الانتساب</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dismissed.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">لا يوجد طلاب مفصولون.</TableCell></TableRow>
                    )}
                    {dismissed.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.studentCode}</div>
                        </TableCell>
                        <TableCell>{s.level}</TableCell>
                        <TableCell className="text-xs">
                          استُهلك {s.affiliateTermsUsed ?? 0}
                          {limits ? ` من ${limits.affiliateMaxTerms}` : ""}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              busy ||
                              (limits ? s.level < limits.affiliateMinLevel : false) ||
                              (limits && limits.affiliateMaxTerms > 0
                                ? (s.affiliateTermsUsed ?? 0) >= limits.affiliateMaxTerms
                                : false)
                            }
                            onClick={() => act({ action: "affiliate-reenrol", studentId: s.id })}
                          >
                            إعادة قيد بالانتساب
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>سجل وقف القيد</CardTitle></CardHeader>
            <CardContent>
              <SuspensionTable rows={suspensions} busy={busy} usedTerms={usedTerms} limits={limits} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>وقف قيد طالب</DialogTitle>
            <DialogDescription>
              «يسمح بايقاف قيد طالب تحت اذنه او طلبه» — السبب إلزامي، والحدود مأخوذة من اللائحة ويرفضها الخادم عند
              التجاوز.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الطالب</Label>
              <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                <SelectContent>
                  {students.filter((s) => s.statusCode === "ACTIVE").slice(0, 200).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.studentCode} — {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>فصل بداية الوقف</Label>
              <Select value={form.termKey} onValueChange={(v) => setForm({ ...form, termKey: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
                <SelectContent>
                  {terms.map((t) => (
                    <SelectItem key={t.id} value={`${t.academicYear}|${t.termType}`}>{t.label}{t.isCurrent ? " (الحالي)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>عدد الفصول{limits ? ` (بحد أقصى ${limits.suspensionMaxConsecutiveTerms} متتاليين)` : ""}</Label>
              <Input type="number" min={1} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
            </div>
            <div>
              <Label>تاريخ استحقاق إعادة القيد (اختياري)</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">
                إن تُرك فارغاً يُشتق تلقائياً من فصل بداية الوقف وعدد الفصول على تقويم المعهد، ويُنبَّه قبله بمدة
                الإخطار المقررة في اللائحة.
              </p>
            </div>
            <div>
              <Label>سبب الوقف</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="طلب الطالب / إذن…" />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={busy || !form.studentId || !form.termKey || !form.reason.trim()}
              onClick={() => {
                const [academicYear, semester] = form.termKey.split("|")
                act({ action: "suspend", studentId: form.studentId, academicYear, semester, terms: Number(form.terms), reason: form.reason.trim(), dueDate: form.dueDate || null })
              }}
            >
              تنفيذ وقف القيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
    </div>
  )
}

function SuspensionTable({
  rows, onReenrol, onCancel, busy, usedTerms, limits,
}: {
  rows: SuspensionRow[]
  onReenrol?: (r: SuspensionRow) => void
  onCancel?: (r: SuspensionRow) => void
  busy: boolean
  usedTerms: (studentId: string) => number
  limits: Limits | null
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">لا توجد سجلات.</p>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>الطالب</TableHead>
          <TableHead>من فصل</TableHead>
          <TableHead>المدة</TableHead>
          <TableHead>الرصيد المستهلك</TableHead>
          <TableHead>الاستحقاق</TableHead>
          <TableHead>السبب</TableHead>
          <TableHead>المعتمد</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.studentCode} — {r.department}</div>
            </TableCell>
            <TableCell>{r.startTerm}</TableCell>
            <TableCell>{r.terms} فصل</TableCell>
            <TableCell className="text-xs">
              {usedTerms(r.studentId)}{limits ? ` / ${limits.suspensionMaxSeparateTerms}` : ""}
            </TableCell>
            <TableCell>
              <span className={r.overdue ? "text-red-600 font-medium" : r.dueSoon ? "text-amber-600" : ""}>{fmt(r.dueDate)}</span>
              {r.overdue && <Badge className="bg-red-100 text-red-700 mr-2"><AlertTriangle className="w-3 h-3 ml-1" />انتهت المدة</Badge>}
              {!r.overdue && r.dueSoon && <Badge className="bg-amber-100 text-amber-700 mr-2"><Clock className="w-3 h-3 ml-1" />قارب الاستحقاق</Badge>}
            </TableCell>
            <TableCell className="max-w-[16rem] text-xs">{r.reason}</TableCell>
            <TableCell className="text-xs">{r.approvedBy || "—"}<div className="text-muted-foreground">{fmt(r.approvedAt)}</div></TableCell>
            <TableCell className="whitespace-nowrap">
              {r.status === "ACTIVE" ? (
                <>
                  {onReenrol && (
                    <Button size="sm" disabled={busy} onClick={() => onReenrol(r)}>
                      <PlayCircle className="w-4 h-4 ml-1" /> إعادة القيد
                    </Button>
                  )}
                  {onCancel && (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => onCancel(r)}>إلغاء الوقف</Button>
                  )}
                </>
              ) : (
                <Badge variant="secondary">{r.status === "COMPLETED" ? `أُعيد قيده ${fmt(r.reenrolledAt)}` : "ملغى"}</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
