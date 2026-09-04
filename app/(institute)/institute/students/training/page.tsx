"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Briefcase, CheckCircle, XCircle, Clock, Plus, Stamp } from "lucide-react"

/**
 * التدريب الصيفي / الميداني — «يكون شرط من شروط النجاح ويكون التدريب عبارة عن 4 اسابيع لمدة شهر
 * ويكون بعد المستوي الثاني بعد الفصل الدراسي الرابع وتدريب اخر بعد المستوي الثالث بعد الفصل الدراسي
 * السادس»، والدرجة «50% لجهة التدريب ، 50% للمعهد (25% تقرير ، 25% مناقشة)»، والنتيجة نجاح/رسوب
 * «لا تضاف الي التقدير التراكمي».
 */

type Round = { round: number; nameAr: string; afterLevel: number | null; afterTermNo: number | null }
type Bylaw = {
  rounds: Round[]
  weeks: number
  external: number
  report: number
  discussion: number
  max: number
  passStatusCode: string
  failStatusCode: string
}
type Record_ = {
  id: string
  studentId: string
  student: string
  studentCode: string
  level: number
  department: string
  round: number
  academicYear: string | null
  providerName: string | null
  startDate: string | null
  endDate: string | null
  weeks: number | null
  externalMark: number | null
  reportMark: number | null
  discussionMark: number | null
  totalMark: number | null
  resultCode: string | null
  isPass: boolean | null
  signedByName: string | null
  signedAt: string | null
  notes: string | null
}
type StudentOpt = { id: string; studentCode: string; name: string; levelNum: number; department: string }

const EMPTY = {
  studentId: "",
  round: "",
  academicYear: "",
  providerName: "",
  startDate: "",
  endDate: "",
  weeks: "",
  externalMark: "",
  reportMark: "",
  discussionMark: "",
  notes: "",
}

export default function SummerTrainingPage() {
  const [records, setRecords] = useState<Record_[]>([])
  const [bylaw, setBylaw] = useState<Bylaw | null>(null)
  const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0, pending: 0 })
  const [students, setStudents] = useState<StudentOpt[]>([])
  const [roundFilter, setRoundFilter] = useState("all")
  const [verdictFilter, setVerdictFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // معرّف السجل قيد التعديل. الطالب والجولة مفتاح مركّب: تغييرهما لا يُصحّح السجل بل يُنشئ ثانياً
  // ويترك الأول يتيماً، فيُقفلان أثناء التعديل ويبقى الحذف هو طريق تصحيح سجل رُصد لطالب خاطئ.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (roundFilter !== "all") qs.set("round", roundFilter)
      if (verdictFilter !== "all") qs.set("verdict", verdictFilter)
      const [res, studentsRes] = await Promise.all([
        fetch(`/api/institute/training?${qs.toString()}`),
        fetch(`/api/institute/students`),
      ])
      if (!res.ok) throw new Error("فشل في جلب سجلات التدريب")
      const json = await res.json()
      // قائمة الطلاب للنافذة فقط — لا تُفشل الصفحة إن تعذّرت.
      const sJson = studentsRes.ok ? await studentsRes.json() : { students: [] }
      if (!signal?.cancelled) {
        setRecords(json.records ?? [])
        setBylaw(json.bylaw ?? null)
        setStats(json.stats ?? { total: 0, passed: 0, failed: 0, pending: 0 })
        setStudents(sJson.students ?? [])
      }
    } catch (e) {
      if (!signal?.cancelled) setError((e as Error).message)
    } finally {
      if (!signal?.cancelled) setLoading(false)
    }
  }, [roundFilter, verdictFilter])

  useEffect(() => {
    const signal = { cancelled: false }
    load(signal)
    return () => { signal.cancelled = true }
  }, [load])

  const rows = records.filter(
    (r) => !search || r.student.includes(search) || r.studentCode.includes(search) || (r.providerName ?? "").includes(search),
  )

  const update = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const openAdd = () => {
    setForm({ ...EMPTY, weeks: bylaw ? String(bylaw.weeks) : "" })
    setEditingId(null)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (r: Record_) => {
    setForm({
      studentId: r.studentId,
      round: String(r.round),
      academicYear: r.academicYear ?? "",
      providerName: r.providerName ?? "",
      startDate: r.startDate ?? "",
      endDate: r.endDate ?? "",
      weeks: r.weeks != null ? String(r.weeks) : "",
      externalMark: r.externalMark != null ? String(r.externalMark) : "",
      reportMark: r.reportMark != null ? String(r.reportMark) : "",
      discussionMark: r.discussionMark != null ? String(r.discussionMark) : "",
      notes: r.notes ?? "",
    })
    setEditingId(r.id)
    setFormError(null)
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.studentId || !form.round) {
      setFormError("الطالب وجولة التدريب مطلوبان")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch("/api/institute/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // فارغ = لم يُرصد بعد، فيُرسل null ليبقى السجل «قيد الرصد» لا راسباً
          externalMark: form.externalMark === "" ? null : Number(form.externalMark),
          reportMark: form.reportMark === "" ? null : Number(form.reportMark),
          discussionMark: form.discussionMark === "" ? null : Number(form.discussionMark),
          weeks: form.weeks === "" ? null : Number(form.weeks),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "فشل الحفظ")
      // تحذير غير مانع: حُفظت الدرجات لكن لم يصدر حكم لغياب حدّ النجاح من سلّم التقديرات.
      setNotice(json.warning ?? null)
      setDialogOpen(false)
      setEditingId(null)
      await load()
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const sign = async (r: Record_) => {
    const name = window.prompt("اسم المعتمِد / الموقِّع على التدريب:", r.signedByName ?? "")
    if (name === null) return
    const res = await fetch("/api/institute/training", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, signedByName: name }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error || "فشل الاعتماد")
      return
    }
    await load()
  }

  // رفع الاعتماد — اعتماد بالخطأ، أو تصحيح درجة بعد التوقيع، يجب أن يكون له طريق رجوع.
  const unsign = async (r: Record_) => {
    if (!window.confirm("إلغاء اعتماد سجل التدريب؟")) return
    const res = await fetch("/api/institute/training", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, unsign: true }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error || "فشل إلغاء الاعتماد")
      return
    }
    await load()
  }

  // حذف سجل رُصد لطالب أو جولة خاطئة — المفتاح المركّب يمنع تصحيحهما بالتعديل.
  const remove = async (r: Record_) => {
    if (!window.confirm(`حذف سجل تدريب «${r.student}» — ${r.round}؟`)) return
    const res = await fetch(`/api/institute/training?id=${encodeURIComponent(r.id)}`, { method: "DELETE" })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error || "فشل الحذف")
      return
    }
    await load()
  }

  const verdictBadge = (r: Record_) =>
    r.isPass === true ? <Badge className="bg-green-100 text-green-700">اجتياز {r.resultCode ? `(${r.resultCode})` : ""}</Badge>
    : r.isPass === false ? <Badge className="bg-red-100 text-red-700">عدم اجتياز {r.resultCode ? `(${r.resultCode})` : ""}</Badge>
    : <Badge className="bg-amber-100 text-amber-700">قيد الرصد</Badge>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="w-6 h-6" />التدريب الصيفي / الميداني</h1>
          <p className="text-muted-foreground text-sm">
            {bylaw
              ? `مدة التدريب ${bylaw.weeks} أسابيع — ${bylaw.external}% لجهة التدريب، ${bylaw.report}% للتقرير، ${bylaw.discussion}% للمناقشة. مادة نجاح/رسوب لا تدخل في المعدل التراكمي.`
              : "مادة نجاح/رسوب لا تدخل في المعدل التراكمي."}
          </p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 ml-1" />رصد تدريب</Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{notice}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">إجمالي السجلات</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle className="w-4 h-4" />اجتياز</p><p className="text-2xl font-bold text-green-700">{stats.passed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground flex items-center gap-1"><XCircle className="w-4 h-4" />عدم اجتياز</p><p className="text-2xl font-bold text-red-700">{stats.failed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-4 h-4" />قيد الرصد</p><p className="text-2xl font-bold text-amber-700">{stats.pending}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجلات التدريب</CardTitle>
          <CardDescription>
            {bylaw?.rounds.map((r) => `${r.nameAr}${r.afterTermNo ? ` (بعد الفصل ${r.afterTermNo})` : ""}`).join(" · ")}
          </CardDescription>
          <div className="flex flex-wrap gap-3 pt-2">
            <Input className="w-56" placeholder="بحث بالاسم أو الكود أو جهة التدريب" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={roundFilter} onValueChange={setRoundFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الجولات</SelectItem>
                {(bylaw?.rounds ?? []).map((r) => <SelectItem key={r.round} value={String(r.round)}>{r.nameAr}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={verdictFilter} onValueChange={setVerdictFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل النتائج</SelectItem>
                <SelectItem value="pass">اجتياز</SelectItem>
                <SelectItem value="fail">عدم اجتياز</SelectItem>
                <SelectItem value="pending">قيد الرصد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">جارٍ التحميل…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الجولة</TableHead>
                  <TableHead>جهة التدريب</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>جهة التدريب / التقرير / المناقشة</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>النتيجة</TableHead>
                  <TableHead>الاعتماد</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.student}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.studentCode} — {r.department}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {bylaw?.rounds.find((x) => x.round === r.round)?.nameAr ?? `الجولة ${r.round}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.providerName ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {r.startDate && r.endDate ? `${r.startDate} → ${r.endDate}` : r.weeks ? `${r.weeks} أسابيع` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.externalMark ?? "—"} / {r.reportMark ?? "—"} / {r.discussionMark ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono">{r.totalMark != null ? `${r.totalMark}${bylaw ? ` / ${bylaw.max}` : ""}` : "—"}</TableCell>
                    <TableCell>{verdictBadge(r)}</TableCell>
                    <TableCell className="text-sm">
                      {r.signedAt ? <span>{r.signedByName ?? "—"}<div className="text-xs text-muted-foreground">{r.signedAt}</div></span> : <span className="text-muted-foreground">غير معتمد</span>}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>تعديل</Button>
                      {r.signedAt ? (
                        <Button variant="ghost" size="sm" onClick={() => unsign(r)}>إلغاء الاعتماد</Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => sign(r)} disabled={r.isPass == null}>
                          <Stamp className="w-4 h-4 ml-1" />اعتماد
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r)} disabled={!!r.signedAt}>
                        حذف
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">لا توجد سجلات تدريب</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingId(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>رصد التدريب الصيفي</DialogTitle>
            <DialogDescription>
              {bylaw
                ? `التوزيع طبقاً للائحة: ${bylaw.external}% جهة التدريب + ${bylaw.report}% تقرير + ${bylaw.discussion}% مناقشة = ${bylaw.max}`
                : "توزيع الدرجات طبقاً للائحة المعهد"}
              {editingId ? " — الطالب والجولة لا يُعدَّلان؛ لتصحيحهما احذف السجل وأعد رصده." : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الطالب</Label>
                <Select value={form.studentId || undefined} onValueChange={(v) => update("studentId", v)} disabled={!!editingId}>
                  <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.studentCode} — {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>جولة التدريب</Label>
                <Select value={form.round || undefined} onValueChange={(v) => update("round", v)} disabled={!!editingId}>
                  <SelectTrigger><SelectValue placeholder="اختر الجولة" /></SelectTrigger>
                  <SelectContent>
                    {(bylaw?.rounds ?? []).map((r) => <SelectItem key={r.round} value={String(r.round)}>{r.nameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>جهة التدريب / موقع التدريب</Label>
                <Input value={form.providerName} onChange={(e) => update("providerName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>العام الجامعي</Label>
                <Input value={form.academicYear} onChange={(e) => update("academicYear", e.target.value)} placeholder="مثال: 2025/2026" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>تاريخ البداية</Label>
                <Input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>تاريخ النهاية</Label>
                <Input type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>عدد الأسابيع</Label>
                <Input type="number" min={0} value={form.weeks} onChange={(e) => update("weeks", e.target.value)} />
              </div>
            </div>

            {/* «50% لجه التدريب موقع تدريب ، 50% للمعهد تعقسم (25% للتقرير ، 25% للمناقشه)» */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">درجات التدريب</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">جهة التدريب (من {bylaw?.external ?? "—"})</Label>
                  <Input type="number" min={0} value={form.externalMark} onChange={(e) => update("externalMark", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">التقرير (من {bylaw?.report ?? "—"})</Label>
                  <Input type="number" min={0} value={form.reportMark} onChange={(e) => update("reportMark", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">المناقشة (من {bylaw?.discussion ?? "—"})</Label>
                  <Input type="number" min={0} value={form.discussionMark} onChange={(e) => update("discussionMark", e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                يُحسب الحكم (اجتياز / عدم اجتياز) من سلّم التقديرات بعد رصد المكوّنات الثلاثة، ولا يدخل في المعدل التراكمي.
              </p>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
