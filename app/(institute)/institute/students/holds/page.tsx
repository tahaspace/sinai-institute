"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Lock, Unlock, ShieldAlert, Users, DollarSign, Settings, Plus, Trash2, CheckCircle, XCircle } from "lucide-react"

// نوع الحجب + سكوبه — self-contained so the screen doesn't depend on settings to render.
const TYPE_LIST = [
  { code: "FINANCIAL", label: "حجب مالي" },
  { code: "DOCUMENT", label: "حجب مستندات" },
  { code: "DISCIPLINARY", label: "حجب تأديبي" },
  { code: "ACADEMIC", label: "حجب أكاديمي" },
  { code: "ADMINISTRATIVE", label: "حجب إداري" },
  { code: "GRADUATION", label: "حجب متطلبات تخرج" },
  { code: "LIBRARY", label: "حجب مكتبة / عهدة" },
  { code: "CUSTOM", label: "حجب مخصص" },
]
const SCOPE_LIST = [
  { key: "blockResult", label: "حجب ظهور النتيجة" },
  { key: "blockRegistration", label: "منع تسجيل المقررات" },
  { key: "blockEnrollmentLetter", label: "منع استخراج إفادة" },
  { key: "blockTranscript", label: "منع استخراج بيان درجات" },
  { key: "blockCertificate", label: "منع استخراج شهادة" },
  { key: "blockGraduation", label: "منع التقديم للتخرج" },
] as const
const TYPE_DEFAULT_SCOPES: Record<string, string[]> = {
  FINANCIAL: ["blockResult", "blockRegistration"],
  GRADUATION: ["blockGraduation", "blockCertificate"],
}
const defaultScopesFor = (t: string) =>
  Object.fromEntries(SCOPE_LIST.map((s) => [s.key, (TYPE_DEFAULT_SCOPES[t] ?? ["blockResult"]).includes(s.key)]))

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-red-100 text-red-700", PENDING: "bg-amber-100 text-amber-700",
  RELEASED: "bg-green-100 text-green-700", CANCELLED: "bg-gray-100 text-gray-600", EXPIRED: "bg-gray-100 text-gray-500",
}

type StudentRow = { id: string; studentCode: string; name: string; level: number; department: string; program: string; outstanding: number; paymentStatus: string; held: boolean; activeHolds: string[] }
type HoldRow = { id: string; student: string; studentCode: string; department: string; type: string; typeLabel: string; reason: string; scopes: string[]; status: string; statusLabel: string; source: string; startDate: string; endDate: string | null; releasedAt: string | null }
type Candidate = { id: string; studentCode: string; nameAr: string; level: number; outstanding: number }
type Reason = { id: string; nameAr: string; nameEn: string | null; defaultType: string; active: boolean }
type Opt = { id: string; name: string }

export default function StudentHoldsPage() {
  const [tab, setTab] = useState("apply")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  // filter option lists (best-effort)
  const [departments, setDepartments] = useState<Opt[]>([])
  const [programs, setPrograms] = useState<Opt[]>([])

  // apply-screen
  const [filters, setFilters] = useState({ departmentId: "all", programId: "all", level: "all", paymentStatus: "all", search: "" })
  const [students, setStudents] = useState<StudentRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loadingStudents, setLoadingStudents] = useState(false)

  // hold dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [holdType, setHoldType] = useState("FINANCIAL")
  const [holdReasonId, setHoldReasonId] = useState<string>("none")
  const [holdScopes, setHoldScopes] = useState<Record<string, boolean>>(defaultScopesFor("FINANCIAL"))
  const [holdNote, setHoldNote] = useState("")
  const [holdEnd, setHoldEnd] = useState("")

  // current holds
  const [holds, setHolds] = useState<HoldRow[]>([])
  const [holdFilter, setHoldFilter] = useState({ status: "all", type: "all" })

  // candidates + reasons + settings
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [reasons, setReasons] = useState<Reason[]>([])
  const [newReason, setNewReason] = useState("")
  const [settings, setSettings] = useState<{ autoFinanceHold: boolean; autoFinanceRelease: boolean }>({ autoFinanceHold: true, autoFinanceRelease: true })

  // ---- loaders (React19-safe: async fn called from effect with a cancel flag) ----
  const loadOptions = useCallback(async () => {
    try {
      const [dRes, pRes] = await Promise.all([fetch("/api/departments"), fetch("/api/institute/programs")])
      if (dRes.ok) { const j = await dRes.json(); const arr = j.departments ?? j ?? []; setDepartments(arr.map((d: Record<string, string>) => ({ id: d.id, name: d.nameAr ?? d.name ?? d.id }))) }
      if (pRes.ok) { const j = await pRes.json(); const arr = j.programs ?? j ?? []; setPrograms(arr.map((p: Record<string, string>) => ({ id: p.id, name: p.nameAr ?? p.name ?? p.id }))) }
    } catch { /* filters just show الكل */ }
  }, [])

  const loadStudents = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoadingStudents(true)
    try {
      const qs = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v && v !== "all") qs.set(k, v) })
      const res = await fetch(`/api/institute/holds/students?${qs.toString()}`)
      if (!res.ok) throw new Error("فشل في جلب الطلاب")
      const j = await res.json()
      if (!signal?.cancelled) { setStudents(j.students ?? []); setSelected(new Set()) }
    } catch (e) { if (!signal?.cancelled) setError((e as Error).message) }
    finally { if (!signal?.cancelled) setLoadingStudents(false) }
  }, [filters])

  const loadHolds = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const qs = new URLSearchParams()
      if (holdFilter.status !== "all") qs.set("status", holdFilter.status)
      if (holdFilter.type !== "all") qs.set("type", holdFilter.type)
      const res = await fetch(`/api/institute/holds?${qs.toString()}`)
      if (!res.ok) throw new Error("فشل في جلب قائمة الحجب")
      const j = await res.json()
      if (!signal?.cancelled) setHolds(j.holds ?? [])
    } catch (e) { if (!signal?.cancelled) setError((e as Error).message) }
  }, [holdFilter])

  const loadCandidates = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const res = await fetch("/api/institute/holds/candidates")
      if (!res.ok) throw new Error("فشل في جلب المرشحين للحجب")
      const j = await res.json()
      if (!signal?.cancelled) setCandidates(j.candidates ?? [])
    } catch (e) { if (!signal?.cancelled) setError((e as Error).message) }
  }, [])

  const loadConfig = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const [rRes, sRes] = await Promise.all([fetch("/api/institute/holds/reasons"), fetch("/api/institute/holds/settings")])
      if (rRes.ok) { const j = await rRes.json(); if (!signal?.cancelled) setReasons(j.reasons ?? []) }
      if (sRes.ok) { const j = await sRes.json(); if (!signal?.cancelled && j.settings) setSettings({ autoFinanceHold: !!j.settings.autoFinanceHold, autoFinanceRelease: !!j.settings.autoFinanceRelease }) }
    } catch (e) { if (!signal?.cancelled) setError((e as Error).message) }
  }, [])

  useEffect(() => { loadOptions(); loadConfig() }, [loadOptions, loadConfig])
  useEffect(() => { const s = { cancelled: false }; if (tab === "apply") loadStudents(s); return () => { s.cancelled = true } }, [tab, loadStudents])
  useEffect(() => { const s = { cancelled: false }; if (tab === "holds") loadHolds(s); return () => { s.cancelled = true } }, [tab, loadHolds])
  useEffect(() => { const s = { cancelled: false }; if (tab === "candidates") loadCandidates(s); return () => { s.cancelled = true } }, [tab, loadCandidates])

  // ---- actions ----
  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setSelected((prev) => prev.size === students.length ? new Set() : new Set(students.map((s) => s.id)))
  const openDialogFor = (ids?: string[]) => { if (ids) setSelected(new Set(ids)); setHoldType("FINANCIAL"); setHoldScopes(defaultScopesFor("FINANCIAL")); setHoldReasonId("none"); setHoldNote(""); setHoldEnd(""); setDialogOpen(true) }
  const onTypeChange = (t: string) => { setHoldType(t); setHoldScopes(defaultScopesFor(t)) }

  async function submitHold() {
    if (selected.size === 0) return
    setBusy("apply")
    try {
      const res = await fetch("/api/institute/holds", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: [...selected], type: holdType,
          reasonId: holdReasonId === "none" ? null : holdReasonId,
          reasonText: holdNote || null, scopes: holdScopes,
          endDate: holdEnd || null,
        }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || "فشل في تطبيق الحجب") }
      setDialogOpen(false); setSelected(new Set())
      await loadStudents()
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  async function holdAction(id: string, action: "release" | "cancel" | "approve") {
    setBusy(id)
    try {
      const res = await fetch(`/api/institute/holds/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || "فشل في تنفيذ الإجراء") }
      await loadHolds()
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  async function addReason() {
    if (!newReason.trim()) return
    setBusy("reason")
    try {
      const res = await fetch("/api/institute/holds/reasons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nameAr: newReason.trim() }) })
      if (!res.ok) throw new Error("فشل في إضافة السبب")
      setNewReason(""); await loadConfig()
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }
  async function removeReason(id: string) {
    setBusy(id)
    try { await fetch(`/api/institute/holds/reasons?id=${id}`, { method: "DELETE" }); await loadConfig() }
    catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }
  async function saveSettings(patch: Partial<typeof settings>) {
    const next = { ...settings, ...patch }; setSettings(next)
    try { await fetch("/api/institute/holds/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }) }
    catch (e) { setError((e as Error).message) }
  }

  const stat = (label: string, value: number | string, Icon: typeof Lock, cls: string) => (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cls}`}><Icon className="w-5 h-5" /></div>
      <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
    </CardContent></Card>
  )

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="w-7 h-7 text-red-600" /> إدارة القيود والحجب الطلابية</h1>
          <p className="text-muted-foreground">حجب/إتاحة نتيجة الطالب وتسجيله دون المساس بالدرجات — الحجب يتحكم في الظهور فقط.</p>
        </div>
      </div>

      {error && <Card><CardContent className="p-4 text-center text-red-600 flex items-center justify-between"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => setError(null)}>إغلاق</Button></CardContent></Card>}

      <Tabs value={tab} onValueChange={setTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="apply">حجب النتائج</TabsTrigger>
          <TabsTrigger value="holds">المحجوبون</TabsTrigger>
          <TabsTrigger value="candidates">معرضون للحجب</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        {/* ---- TAB: apply / bulk hold ---- */}
        <TabsContent value="apply" className="mt-6 space-y-4">
          <Card>
            <CardHeader><CardTitle>الفلاتر</CardTitle><CardDescription>حدّد الفئة ثم اختر الطلاب لتطبيق الحجب الجماعي</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Select value={filters.departmentId} onValueChange={(v) => setFilters({ ...filters, departmentId: v })}>
                <SelectTrigger><SelectValue placeholder="القسم" /></SelectTrigger>
                <SelectContent><SelectItem value="all">كل الأقسام</SelectItem>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.programId} onValueChange={(v) => setFilters({ ...filters, programId: v })}>
                <SelectTrigger><SelectValue placeholder="البرنامج" /></SelectTrigger>
                <SelectContent><SelectItem value="all">كل البرامج</SelectItem>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.level} onValueChange={(v) => setFilters({ ...filters, level: v })}>
                <SelectTrigger><SelectValue placeholder="المستوى" /></SelectTrigger>
                <SelectContent><SelectItem value="all">كل المستويات</SelectItem>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>المستوى {n}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.paymentStatus} onValueChange={(v) => setFilters({ ...filters, paymentStatus: v })}>
                <SelectTrigger><SelectValue placeholder="حالة السداد" /></SelectTrigger>
                <SelectContent><SelectItem value="all">كل حالات السداد</SelectItem><SelectItem value="unpaid">عليه مديونية</SelectItem><SelectItem value="paid">مسدّد</SelectItem></SelectContent>
              </Select>
              <Input placeholder="بحث بالاسم/الكود" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>الطلاب</CardTitle><CardDescription>{selected.size > 0 ? `${selected.size} طالب محدد` : "فعّل المربعات لتحديد الطلاب"}</CardDescription></div>
              <Button disabled={selected.size === 0} onClick={() => openDialogFor()}><Lock className="w-4 h-4 ml-2" /> حجب المحدد ({selected.size})</Button>
            </CardHeader>
            <CardContent>
              {loadingStudents ? <div className="py-10 text-center text-muted-foreground">جارٍ التحميل...</div> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-10"><Checkbox checked={students.length > 0 && selected.size === students.length} onCheckedChange={toggleAll} /></TableHead>
                      <TableHead>الطالب</TableHead><TableHead>الكود</TableHead><TableHead>القسم</TableHead>
                      <TableHead className="text-center">المستوى</TableHead><TableHead className="text-center">المديونية</TableHead><TableHead className="text-center">الحالة</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {students.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا يوجد طلاب مطابقون</TableCell></TableRow> :
                        students.map((s) => (
                          <TableRow key={s.id} className={selected.has(s.id) ? "bg-red-50/40" : ""}>
                            <TableCell><Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} /></TableCell>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell className="text-muted-foreground">{s.studentCode}</TableCell>
                            <TableCell>{s.department}</TableCell>
                            <TableCell className="text-center">{s.level}</TableCell>
                            <TableCell className="text-center">{s.outstanding > 0 ? <span className="text-red-600 font-semibold">{s.outstanding.toLocaleString()}</span> : <span className="text-green-600">0</span>}</TableCell>
                            <TableCell className="text-center">{s.held ? <Badge className="bg-red-100 text-red-700">محجوب</Badge> : <Badge className="bg-green-100 text-green-700">متاح</Badge>}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- TAB: current holds ---- */}
        <TabsContent value="holds" className="mt-6 space-y-4">
          <div className="flex gap-3">
            <Select value={holdFilter.status} onValueChange={(v) => setHoldFilter({ ...holdFilter, status: v })}>
              <SelectTrigger className="w-44"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="ACTIVE">نشط</SelectItem><SelectItem value="PENDING">قيد المراجعة</SelectItem><SelectItem value="RELEASED">مرفوع</SelectItem><SelectItem value="CANCELLED">ملغى</SelectItem></SelectContent>
            </Select>
            <Select value={holdFilter.type} onValueChange={(v) => setHoldFilter({ ...holdFilter, type: v })}>
              <SelectTrigger className="w-44"><SelectValue placeholder="النوع" /></SelectTrigger>
              <SelectContent><SelectItem value="all">كل الأنواع</SelectItem>{TYPE_LIST.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>الطالب</TableHead><TableHead>النوع</TableHead><TableHead>السبب</TableHead><TableHead>النطاق</TableHead>
                <TableHead className="text-center">المصدر</TableHead><TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">من</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {holds.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد سجلات حجب</TableCell></TableRow> :
                  holds.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell><div className="font-medium">{h.student}</div><div className="text-xs text-muted-foreground">{h.studentCode} — {h.department}</div></TableCell>
                      <TableCell>{h.typeLabel}</TableCell>
                      <TableCell className="max-w-32 truncate" title={h.reason}>{h.reason}</TableCell>
                      <TableCell><div className="flex flex-wrap gap-1">{h.scopes.map((sc) => <Badge key={sc} variant="secondary" className="text-[10px]">{SCOPE_LIST.find((x) => x.key === sc)?.label ?? sc}</Badge>)}</div></TableCell>
                      <TableCell className="text-center">{h.source === "AUTOMATIC" ? <Badge variant="outline">تلقائي</Badge> : <Badge variant="outline">يدوي</Badge>}</TableCell>
                      <TableCell className="text-center"><Badge className={STATUS_BADGE[h.status] ?? ""}>{h.statusLabel}</Badge></TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{h.startDate}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          {h.status === "PENDING" && <Button size="sm" variant="ghost" disabled={busy === h.id} onClick={() => holdAction(h.id, "approve")} title="اعتماد (Override)"><CheckCircle className="w-4 h-4 text-blue-600" /></Button>}
                          {(h.status === "ACTIVE" || h.status === "PENDING") && <Button size="sm" variant="ghost" disabled={busy === h.id} onClick={() => holdAction(h.id, "release")} title="رفع الحجب / تفعيل"><Unlock className="w-4 h-4 text-green-600" /></Button>}
                          {(h.status === "ACTIVE" || h.status === "PENDING") && <Button size="sm" variant="ghost" disabled={busy === h.id} onClick={() => holdAction(h.id, "cancel")} title="إلغاء (أُدخل خطأً)"><XCircle className="w-4 h-4 text-gray-500" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ---- TAB: finance candidates ---- */}
        <TabsContent value="candidates" className="mt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stat("مرشحون للحجب", candidates.length, DollarSign, "bg-amber-100 text-amber-700")}
            {stat("إجمالي المديونية", candidates.reduce((s, c) => s + c.outstanding, 0).toLocaleString(), Users, "bg-red-100 text-red-700")}
          </div>
          <Card>
            <CardHeader><CardTitle>طلاب معرضون للحجب</CardTitle><CardDescription>عليهم مديونية دون حجب مالي نشط — راجِع القائمة وأكّد الحجب</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>الطالب</TableHead><TableHead>الكود</TableHead><TableHead className="text-center">المستوى</TableHead><TableHead className="text-center">المديونية</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {candidates.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد مرشحون حاليًا</TableCell></TableRow> :
                    candidates.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nameAr}</TableCell>
                        <TableCell className="text-muted-foreground">{c.studentCode}</TableCell>
                        <TableCell className="text-center">{c.level}</TableCell>
                        <TableCell className="text-center text-red-600 font-semibold">{c.outstanding.toLocaleString()}</TableCell>
                        <TableCell className="text-left"><Button size="sm" variant="outline" onClick={() => openDialogFor([c.id])}><Lock className="w-4 h-4 ml-1" /> حجب مالي</Button></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- TAB: settings ---- */}
        <TabsContent value="settings" className="mt-6 space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> الربط التلقائي بالحسابات</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-3"><Checkbox checked={settings.autoFinanceHold} onCheckedChange={(v) => saveSettings({ autoFinanceHold: Boolean(v) })} /><span>إظهار الطلاب ذوي المديونية كمرشحين للحجب المالي</span></label>
              <label className="flex items-center gap-3"><Checkbox checked={settings.autoFinanceRelease} onCheckedChange={(v) => saveSettings({ autoFinanceRelease: Boolean(v) })} /><span>رفع الحجب المالي تلقائيًا عند سداد كامل المديونية</span></label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>أسباب الحجب</CardTitle><CardDescription>مدخلات قابلة للإضافة تُستخدم في التقارير (أسباب الحجب)</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="أضف سببًا جديدًا (مثال: مصروفات غير مسددة)" value={newReason} onChange={(e) => setNewReason(e.target.value)} />
                <Button disabled={busy === "reason"} onClick={addReason}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
              </div>
              <div className="divide-y rounded-md border">
                {reasons.length === 0 ? <div className="p-4 text-center text-muted-foreground text-sm">لا توجد أسباب مُعرّفة بعد</div> :
                  reasons.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3">
                      <span className={r.active ? "" : "line-through text-muted-foreground"}>{r.nameAr}</span>
                      <Button variant="ghost" size="icon" disabled={busy === r.id} onClick={() => removeReason(r.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
          <Card><CardContent className="p-4 text-sm text-muted-foreground flex gap-2 items-start"><Label className="font-semibold text-foreground">ملاحظة:</Label> رسائل الطالب عند الحجب مرتبطة بنوع الحجب (مالي/مستندات/تأديبي…) ولها نص افتراضي لكل نوع؛ يمكن لاحقًا تخصيص النص لكل نوع.</CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* ---- HOLD dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تطبيق الحجب على {selected.size} طالب</DialogTitle>
            <DialogDescription>الحجب يتحكم في الظهور/الوصول فقط ولا يعدّل الدرجات أو النتيجة.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">نوع الحجب</Label>
              <Select value={holdType} onValueChange={onTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPE_LIST.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">سبب الحجب (اختياري)</Label>
              <Select value={holdReasonId} onValueChange={setHoldReasonId}>
                <SelectTrigger><SelectValue placeholder="بدون سبب محدد" /></SelectTrigger>
                <SelectContent><SelectItem value="none">— بدون —</SelectItem>{reasons.filter((r) => r.active).map((r) => <SelectItem key={r.id} value={r.id}>{r.nameAr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">نطاق الحجب (ماذا يمنع؟)</Label>
              <div className="grid grid-cols-2 gap-2">
                {SCOPE_LIST.map((sc) => (
                  <label key={sc.key} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={!!holdScopes[sc.key]} onCheckedChange={(v) => setHoldScopes({ ...holdScopes, [sc.key]: Boolean(v) })} />
                    <span>{sc.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block">تاريخ انتهاء (اختياري)</Label><Input type="date" value={holdEnd} onChange={(e) => setHoldEnd(e.target.value)} /></div>
            </div>
            <div><Label className="mb-1 block">ملاحظة / تفصيل السبب</Label><Textarea rows={2} value={holdNote} onChange={(e) => setHoldNote(e.target.value)} placeholder="تفاصيل إضافية تُحفظ مع الحجب" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button disabled={busy === "apply" || selected.size === 0} onClick={submitHold}><Lock className="w-4 h-4 ml-1" /> تطبيق الحجب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
