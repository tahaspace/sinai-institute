"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Scale, TrendingUp, ShieldCheck, CheckCircle2, Users, HeartHandshake, Save } from "lucide-react"

type Opt = { id: string; name: string }
type RCourse = { courseId: string; code: string; marks: number }
type Row = {
  studentId: string; studentCode: string; name: string; yearGroup: number
  originalResult: string; originalGrade: string | null; originalPct: number | null; failedCourses: string[]
  rafaaCourses: RCourse[]; rafaaTotal: number; postResult: string; postFailed: number
  improvementMarks: number; fromGrade: string | null; toGrade: string | null
  finalStatus: string; finalGrade: string | null
  benefitedRafaa: boolean; benefitedImprovement: boolean; priorBeneficiary: boolean
}
type Stats = { total: number; rafaa: number; improvement: number; rescued: number }
type BatchItem = { id: string; studentCode: string; studentName: string; benefitedRafaa: boolean; rafaaMarks: number; fromStatus: string; toStatus: string; benefitedImprovement: boolean; improvementMarks: number; fromGrade: string | null; toGrade: string | null }
type Batch = { id: string; status: string; rafaaCount: number; improvementCount: number; items: BatchItem[] }
type RafaaCfg = { enabled: boolean; maxTotalMarks: number; maxPerCourse: number; writtenExamMinPct: number; excludeNoWrittenCourses: boolean; maxCourses: number; includeDeferred: boolean; includeDismissed: boolean; includePriorBeneficiary: boolean; affectsTotal: boolean; affectsGrade: boolean }
type ImpCfg = { enabled: boolean; maxRaisePct: number; maxGapToBandPct: number; scope: string; requirePassedAll: boolean; requireNoPriorFail: boolean; requireNoRafaa: boolean }

const STATUS_BADGE: Record<string, string> = { "منقول": "bg-green-100 text-green-700", "له دور ثانٍ": "bg-amber-100 text-amber-700", "باقٍ للإعادة": "bg-red-100 text-red-700", "راسب": "bg-red-100 text-red-700", "قيد الرصد": "bg-gray-100 text-gray-600" }

export default function GradeAdjustmentsPage() {
  const [tab, setTab] = useState("review")
  const [programs, setPrograms] = useState<Opt[]>([])
  const [departments, setDepartments] = useState<Opt[]>([])
  const [f, setF] = useState({ academicYear: "2024-2025", level: "2", programId: "all", departmentId: "all" })
  const [rows, setRows] = useState<Row[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batch, setBatch] = useState<Batch | null>(null)
  const [rafaa, setRafaa] = useState<RafaaCfg | null>(null)
  const [imp, setImp] = useState<ImpCfg | null>(null)
  const [moduleEnabled, setModuleEnabled] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const loadOpts = useCallback(async () => {
    try {
      const [p, d, c] = await Promise.all([fetch("/api/institute/programs"), fetch("/api/departments"), fetch("/api/institute/grade-adjustments/config")])
      if (p.ok) { const j = await p.json(); setPrograms((j.programs ?? []).map((x: Record<string, string>) => ({ id: x.id, name: x.nameAr ?? x.id }))) }
      if (d.ok) { const j = await d.json(); const arr = j.departments ?? j ?? []; setDepartments(arr.map((x: Record<string, string>) => ({ id: x.id, name: x.nameAr ?? x.name ?? x.id }))) }
      if (c.ok) { const j = await c.json(); setRafaa(j.rafaa); setImp(j.improvement); setModuleEnabled(j.module?.enabled ?? true) }
    } catch { /* optional */ }
  }, [])
  useEffect(() => { loadOpts() }, [loadOpts])

  async function evaluate() {
    setBusy("eval"); setError(null); setBatch(null)
    try {
      const qs = new URLSearchParams({ academicYear: f.academicYear, yearGroup: f.level })
      if (f.programId !== "all") qs.set("programId", f.programId)
      if (f.departmentId !== "all") qs.set("departmentId", f.departmentId)
      const res = await fetch(`/api/institute/grade-adjustments?${qs.toString()}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "فشل الحساب")
      if (typeof j.moduleEnabled === "boolean") setModuleEnabled(j.moduleEnabled)
      setRows(j.rows ?? []); setStats(j.stats ?? null)
      setSelected(new Set((j.rows ?? []).filter((r: Row) => r.benefitedRafaa || r.benefitedImprovement).map((r: Row) => r.studentId)))
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  // only students who qualify under the bylaw rules can be selected
  const isEligible = (r: Row) => r.benefitedRafaa || r.benefitedImprovement
  const eligibleIds = rows.filter(isEligible).map((r) => r.studentId)
  const allSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id))
  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setSelected(() => allSelected ? new Set() : new Set(eligibleIds))

  async function loadBatch(id: string) {
    const res = await fetch(`/api/institute/grade-adjustments/${id}`)
    const j = await res.json()
    if (res.ok && j.batch) setBatch({ id, status: j.batch.status, rafaaCount: j.batch.rafaaCount, improvementCount: j.batch.improvementCount, items: j.batch.items ?? [] })
  }

  async function createBatch() {
    if (selected.size === 0) { setError("لا يوجد طلاب مستحقون محددون"); return }
    setBusy("batch"); setError(null)
    try {
      const res = await fetch("/api/institute/grade-adjustments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ academicYear: f.academicYear, yearGroup: f.level, programId: f.programId !== "all" ? f.programId : null, departmentId: f.departmentId !== "all" ? f.departmentId : null, studentIds: [...selected] }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "فشل إنشاء الدفعة")
      await loadBatch(j.batchId)  // fetch the batch WITH its items so names show
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }
  async function patchBatch(action: "approve" | "cancel") {
    if (!batch) return
    setBusy(action); setError(null)
    try {
      const res = await fetch(`/api/institute/grade-adjustments/${batch.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "فشل الإجراء")
      await loadBatch(batch.id)  // refresh status + items (keeps the batch card visible after اعتماد)
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }
  async function saveConfig() {
    setBusy("config"); setError(null); setSaved(false)
    try {
      const res = await fetch("/api/institute/grade-adjustments/config", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rafaa, improvement: imp, module: { enabled: moduleEnabled } }) })
      if (!res.ok) throw new Error("فشل الحفظ")
      setSaved(true)
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  const stat = (label: string, value: number, Icon: typeof Users, cls: string) => (
    <Card><CardContent className="p-3 flex items-center gap-2"><Icon className={`w-5 h-5 ${cls}`} /><div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>
  )
  const numField = (label: string, val: number, on: (n: number) => void) => (
    <div><Label className="mb-1 block text-xs">{label}</Label><Input type="number" value={val} onChange={(e) => on(Number(e.target.value))} /></div>
  )
  const boolField = (label: string, val: boolean, on: (b: boolean) => void) => (
    <label className="flex items-center gap-2 text-sm"><Checkbox checked={val} onCheckedChange={(v) => on(Boolean(v))} /><span>{label}</span></label>
  )

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="w-7 h-7 text-institute-blue" /> الرأفة ورفع التقدير</h1>
        <p className="text-muted-foreground">تُطبَّق بعد رصد واعتماد الدرجات الأصلية: <b>الرأفة</b> تُغيّر حالة الطالب الراسب/الباقي، و<b>رفع التقدير</b> يرفع الناجح لتقدير أعلى. قواعد قابلة للتهيئة حسب لائحة المعهد.</p>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600 flex items-center justify-between"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => setError(null)}>إغلاق</Button></CardContent></Card>}

      <Tabs value={tab} onValueChange={setTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="review">المراجعة والاعتماد</TabsTrigger>
          <TabsTrigger value="config">إعدادات اللائحة</TabsTrigger>
        </TabsList>

        {/* Review */}
        <TabsContent value="review" className="mt-6 space-y-4">
          {!moduleEnabled && (
            <Card className="border-r-4 border-r-amber-500 bg-amber-50/60">
              <CardContent className="p-4 text-amber-800">موديول الرأفة ورفع التقدير <b>غير مُفعّل</b> حسب لائحة المعهد. يمكن تفعيله من تبويب «إعدادات اللائحة».</CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>الفرقة / العام</CardTitle><CardDescription>على نتيجة العام (الفصلين معًا) بعد الرصد</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div><Label className="mb-1 block">العام الدراسي</Label><Input value={f.academicYear} onChange={(e) => setF({ ...f, academicYear: e.target.value })} /></div>
              <div><Label className="mb-1 block">الفرقة</Label><Select value={f.level} onValueChange={(v) => setF({ ...f, level: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>الفرقة {n}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="mb-1 block">البرنامج</Label><Select value={f.programId} onValueChange={(v) => setF({ ...f, programId: v })}><SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger><SelectContent><SelectItem value="all">كل البرامج</SelectItem>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="mb-1 block">القسم</Label><Select value={f.departmentId} onValueChange={(v) => setF({ ...f, departmentId: v })}><SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger><SelectContent><SelectItem value="all">كل الأقسام</SelectItem>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex items-end"><Button className="w-full" disabled={busy !== null || !moduleEnabled} onClick={evaluate}>عرض النتائج</Button></div>
            </CardContent>
          </Card>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stat("إجمالي الطلاب", stats.total, Users, "text-blue-500")}
              {stat("مستحقو الرأفة", stats.rafaa, HeartHandshake, "text-green-600")}
              {stat("غيّرت حالتهم", stats.rescued, CheckCircle2, "text-teal-600")}
              {stat("رفع تقدير", stats.improvement, TrendingUp, "text-blue-600")}
            </div>
          )}

          {rows.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <div><CardTitle>الطلاب</CardTitle><CardDescription>{selected.size} محدد — راجِع ثم أنشئ دفعة للاعتماد</CardDescription></div>
                <Button size="sm" disabled={selected.size === 0 || busy !== null || batch?.status === "APPROVED"} onClick={createBatch}>مراجعة / إنشاء دفعة ({selected.size})</Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-8"><Checkbox checked={allSelected} disabled={eligibleIds.length === 0} onCheckedChange={toggleAll} title="تحديد كل المستحقين" /></TableHead><TableHead>الكود</TableHead><TableHead>الاسم</TableHead>
                    <TableHead className="text-center">النتيجة الأصلية</TableHead><TableHead className="text-center">التقدير</TableHead>
                    <TableHead className="text-center">الرأفة</TableHead><TableHead className="text-center">بعد الرأفة</TableHead>
                    <TableHead className="text-center">رفع التقدير</TableHead><TableHead className="text-center">النهائي</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const eligible = r.benefitedRafaa || r.benefitedImprovement
                      return (
                        <TableRow key={r.studentId} className={r.benefitedRafaa ? "bg-green-50/40" : r.benefitedImprovement ? "bg-blue-50/40" : ""}>
                          <TableCell><Checkbox checked={selected.has(r.studentId)} disabled={!eligible} onCheckedChange={() => toggle(r.studentId)} title={eligible ? "تحديد للاعتماد" : "لا يستوفي شروط اللائحة"} className={!eligible ? "opacity-30" : ""} /></TableCell>
                          <TableCell>{r.studentCode}</TableCell>
                          <TableCell className="font-medium">{r.name}{r.priorBeneficiary && <Badge variant="outline" className="mr-1 text-[10px]">استفاد سابقًا</Badge>}</TableCell>
                          <TableCell className="text-center"><Badge className={STATUS_BADGE[r.originalResult] ?? ""}>{r.originalResult}</Badge></TableCell>
                          <TableCell className="text-center">{r.originalGrade ?? "—"}{r.originalPct != null ? ` (${r.originalPct}%)` : ""}</TableCell>
                          <TableCell className="text-center">
                            {r.benefitedRafaa ? <span className="text-green-700 text-xs">{r.rafaaCourses.map((c) => `${c.code}+${c.marks}`).join("، ")} <b>(={r.rafaaTotal})</b></span> : <span className="text-gray-400">—</span>}
                          </TableCell>
                          <TableCell className="text-center">{r.benefitedRafaa ? <Badge className={STATUS_BADGE[r.postResult] ?? ""}>{r.postResult}</Badge> : <span className="text-gray-400">—</span>}</TableCell>
                          <TableCell className="text-center">{r.benefitedImprovement ? <span className="text-blue-700 text-xs">{r.fromGrade} ← {r.toGrade} <b>(+{r.improvementMarks})</b></span> : <span className="text-gray-400">—</span>}</TableCell>
                          <TableCell className="text-center font-semibold">{r.finalGrade ?? "—"} · <Badge className={STATUS_BADGE[r.finalStatus] ?? ""}>{r.finalStatus}</Badge></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {batch && (
            <Card className="border-r-4 border-r-institute-blue">
              <CardHeader><CardTitle className="flex items-center gap-2">دفعة الرأفة/الرفع
                <Badge className={batch.status === "APPROVED" ? "bg-green-100 text-green-700" : batch.status === "CANCELLED" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"}>{batch.status === "DRAFT" ? "مسودة" : batch.status === "APPROVED" ? "معتمدة" : "ملغاة"}</Badge></CardTitle>
                <CardDescription>رأفة: {batch.rafaaCount} · رفع تقدير: {batch.improvementCount}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* the students inside the batch — so the control sees WHO is being approved (client: batch showed no names) */}
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">الرأفة</TableHead><TableHead className="text-center">رفع التقدير</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {batch.items.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">لا يوجد طلاب في الدفعة</TableCell></TableRow> :
                        batch.items.map((it) => (
                          <TableRow key={it.id}>
                            <TableCell>{it.studentCode}</TableCell>
                            <TableCell className="font-medium">{it.studentName}</TableCell>
                            <TableCell className="text-center text-xs">{it.benefitedRafaa ? <span className="text-green-700">{it.fromStatus} ← {it.toStatus} <b>(+{it.rafaaMarks})</b></span> : "—"}</TableCell>
                            <TableCell className="text-center text-xs">{it.benefitedImprovement ? <span className="text-blue-700">{it.fromGrade} ← {it.toGrade} <b>(+{it.improvementMarks})</b></span> : "—"}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-wrap gap-2">
                  {batch.status === "DRAFT" && <Button disabled={busy !== null} onClick={() => patchBatch("approve")}><ShieldCheck className="w-4 h-4 ml-1" /> اعتماد الكنترول</Button>}
                  {batch.status === "DRAFT" && <Button variant="outline" disabled={busy !== null} onClick={() => patchBatch("cancel")}>إلغاء</Button>}
                  {batch.status === "APPROVED" && <span className="text-green-700 flex items-center gap-1"><CheckCircle2 className="w-5 h-5" /> تم الاعتماد — انعكست الرأفة على الدرجات والكشوف. (يمكن التراجع بالإلغاء)</span>}
                  {batch.status === "APPROVED" && <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => patchBatch("cancel")}>تراجع (إلغاء الاعتماد)</Button>}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Config */}
        <TabsContent value="config" className="mt-6 space-y-4">
          {rafaa && imp ? (
            <>
              <Card className={moduleEnabled ? "border-r-4 border-r-green-500" : "border-r-4 border-r-gray-400"}>
                <CardHeader><CardTitle>تفعيل الموديول</CardTitle><CardDescription>حسب لائحة المعهد وسياسته — بعض المعاهد (نظام الساعات المعتمدة) لا تطبّق الرأفة/الرفع نهائيًا. عند الإيقاف تُعطَّل شاشة المراجعة والاعتماد بالكامل.</CardDescription></CardHeader>
                <CardContent>{boolField("تفعيل موديول الرأفة ورفع التقدير", moduleEnabled, setModuleEnabled)}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><HeartHandshake className="w-5 h-5 text-green-600" /> قواعد الرأفة</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {boolField("تفعيل الرأفة", rafaa.enabled, (v) => setRafaa({ ...rafaa, enabled: v }))}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {numField("الحد الأقصى الإجمالي (درجات)", rafaa.maxTotalMarks, (n) => setRafaa({ ...rafaa, maxTotalMarks: n }))}
                    {numField("الحد الأقصى للمادة", rafaa.maxPerCourse, (n) => setRafaa({ ...rafaa, maxPerCourse: n }))}
                    {numField("الحد الأدنى للتحريري %", rafaa.writtenExamMinPct, (n) => setRafaa({ ...rafaa, writtenExamMinPct: n }))}
                    {numField("عدد المواد (0=بلا حد)", rafaa.maxCourses, (n) => setRafaa({ ...rafaa, maxCourses: n }))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {boolField("استبعاد المواد بلا تحريري", rafaa.excludeNoWrittenCourses, (v) => setRafaa({ ...rafaa, excludeNoWrittenCourses: v }))}
                    {boolField("يشمل المؤجل", rafaa.includeDeferred, (v) => setRafaa({ ...rafaa, includeDeferred: v }))}
                    {boolField("يشمل المفصول", rafaa.includeDismissed, (v) => setRafaa({ ...rafaa, includeDismissed: v }))}
                    {boolField("يشمل المستفيد سابقًا", rafaa.includePriorBeneficiary, (v) => setRafaa({ ...rafaa, includePriorBeneficiary: v }))}
                    {boolField("تؤثر على المجموع", rafaa.affectsTotal, (v) => setRafaa({ ...rafaa, affectsTotal: v }))}
                    {boolField("تؤثر على التقدير", rafaa.affectsGrade, (v) => setRafaa({ ...rafaa, affectsGrade: v }))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" /> قواعد رفع التقدير</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {boolField("تفعيل رفع التقدير", imp.enabled, (v) => setImp({ ...imp, enabled: v }))}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {numField("الحد الأقصى للرفع %", imp.maxRaisePct, (n) => setImp({ ...imp, maxRaisePct: n }))}
                    {numField("أقصى فرق للتقدير الأعلى %", imp.maxGapToBandPct, (n) => setImp({ ...imp, maxGapToBandPct: n }))}
                    <div><Label className="mb-1 block text-xs">نطاق الرفع</Label><Select value={imp.scope} onValueChange={(v) => setImp({ ...imp, scope: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="year">تقدير الفرقة</SelectItem><SelectItem value="graduation">تقدير التخرج</SelectItem><SelectItem value="cumulative">التراكمي</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {boolField("يشترط النجاح في كل المواد", imp.requirePassedAll, (v) => setImp({ ...imp, requirePassedAll: v }))}
                    {boolField("يشترط عدم رسوب سابق", imp.requireNoPriorFail, (v) => setImp({ ...imp, requireNoPriorFail: v }))}
                    {boolField("من أخذ رأفة لا يأخذ رفع", imp.requireNoRafaa, (v) => setImp({ ...imp, requireNoRafaa: v }))}
                  </div>
                </CardContent>
              </Card>
              <div className="flex items-center gap-3">
                <Button disabled={busy !== null} onClick={saveConfig}><Save className="w-4 h-4 ml-1" /> حفظ الإعدادات</Button>
                {saved && <span className="text-green-700 text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> تم الحفظ</span>}
              </div>
            </>
          ) : <Card><CardContent className="p-8 text-center text-muted-foreground">جارٍ التحميل...</CardContent></Card>}
        </TabsContent>
      </Tabs>
    </div>
  )
}
