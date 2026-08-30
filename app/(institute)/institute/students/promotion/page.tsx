"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpCircle, GraduationCap, Users, Printer, Download, CheckCircle2, ShieldCheck, PlayCircle } from "lucide-react"

type Opt = { id: string; name: string }
type Row = { studentId: string; studentCode: string; name: string; program: string; level: number; cgpa: number; grade: string; result: string; action: string; toLevel: number | null; eligible: boolean; reason: string }
type Stats = { total: number; eligible: number; promote: number; graduate: number; stay: number; skip: number }
type BatchItem = { id: string; studentCode: string; studentName: string; action: string; fromLevel: number | null; toLevel: number | null; cgpa: number | null; resultGrade: string | null; reason: string | null }
type Batch = { id: string; status: string; eligibleCount: number; promotedCount: number; items: BatchItem[] }

const ACTION_LABEL: Record<string, string> = { PROMOTE: "ترحيل لأعلى", GRADUATE: "تخرّج", STAY: "يبقى", SKIP: "لا يُرحّل" }
const ACTION_BADGE: Record<string, string> = { PROMOTE: "bg-green-100 text-green-700", GRADUATE: "bg-teal-100 text-teal-700", STAY: "bg-amber-100 text-amber-700", SKIP: "bg-gray-100 text-gray-600" }

export default function PromotionPage() {
  const [programs, setPrograms] = useState<Opt[]>([])
  const [departments, setDepartments] = useState<Opt[]>([])
  const [years, setYears] = useState<string[]>([])
  const [f, setF] = useState({ fromYear: "", fromSemester: "second", toYear: "", toSemester: "first", programId: "all", departmentId: "all", fromLevel: "1", toLevel: "2" })
  const [rows, setRows] = useState<Row[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batch, setBatch] = useState<Batch | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadOpts = useCallback(async () => {
    try {
      const [p, d, y] = await Promise.all([fetch("/api/institute/programs"), fetch("/api/departments"), fetch("/api/institute/academic-years")])
      if (p.ok) { const j = await p.json(); setPrograms((j.programs ?? []).map((x: Record<string, string>) => ({ id: x.id, name: x.nameAr ?? x.id }))) }
      if (d.ok) { const j = await d.json(); const arr = j.departments ?? j ?? []; setDepartments(arr.map((x: Record<string, string>) => ({ id: x.id, name: x.nameAr ?? x.name ?? x.id }))) }
      if (y.ok) {
        const j = await y.json(); const ys: string[] = j.years ?? []; setYears(ys)
        const cur = j.current || ys[0] || ""; const idx = ys.indexOf(cur)
        setF((prev) => ({ ...prev, fromYear: prev.fromYear || cur, toYear: prev.toYear || (idx > 0 ? ys[idx - 1] : cur) }))
      }
    } catch { /* optional */ }
  }, [])
  useEffect(() => { loadOpts() }, [loadOpts])

  async function evaluate() {
    setBusy("eval"); setError(null); setBatch(null)
    try {
      const qs = new URLSearchParams({ academicYear: f.fromYear, level: f.fromLevel })
      if (f.programId !== "all") qs.set("programId", f.programId)
      if (f.departmentId !== "all") qs.set("departmentId", f.departmentId)
      const res = await fetch(`/api/institute/promotion?${qs.toString()}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "فشل التقييم")
      setRows(j.rows ?? []); setStats(j.stats ?? null)
      setSelected(new Set((j.rows ?? []).filter((r: Row) => r.eligible).map((r: Row) => r.studentId)))
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setSelected((p) => p.size === rows.length ? new Set() : new Set(rows.map((r) => r.studentId)))

  async function createBatch() {
    if (selected.size === 0) { setError("اختر طلابًا للترحيل"); return }
    setBusy("batch"); setError(null)
    try {
      const res = await fetch("/api/institute/promotion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromYear: f.fromYear, toYear: f.toYear, fromSemester: f.fromSemester, toSemester: f.toSemester, programId: f.programId !== "all" ? f.programId : null, departmentId: f.departmentId !== "all" ? f.departmentId : null, fromLevel: f.fromLevel, toLevel: f.toLevel, studentIds: [...selected] }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "فشل إنشاء الدفعة")
      await loadBatch(j.batchId)  // fetch the batch WITH its items so names show
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  async function loadBatch(id: string) {
    const res = await fetch(`/api/institute/promotion/${id}`)
    const j = await res.json()
    if (res.ok && j.batch) setBatch({ id, status: j.batch.status, eligibleCount: j.batch.eligibleCount, promotedCount: j.batch.promotedCount ?? 0, items: j.batch.items ?? [] })
  }

  async function patchBatch(action: "approve" | "execute") {
    if (!batch) return
    setBusy(action); setError(null)
    try {
      const res = await fetch(`/api/institute/promotion/${batch.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "فشل الإجراء")
      setBatch({ ...batch, status: j.status, promotedCount: j.promoted ?? batch.promotedCount })
      if (action === "execute") await evaluate()
      else await loadBatch(batch.id)
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  function exportCsv() {
    const head = ["الكود", "الاسم", "البرنامج", "المستوى", "التقدير", "المعدل التراكمي", "النتيجة", "حالة الترحيل", "السبب"]
    const lines = rows.map((r) => [r.studentCode, r.name, r.program, r.level, r.grade, r.cgpa, r.result, ACTION_LABEL[r.action] ?? r.action, r.reason].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `promotion-${f.fromYear}-L${f.fromLevel}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  const stat = (label: string, value: number, Icon: typeof Users, cls: string) => (
    <Card><CardContent className="p-3 flex items-center gap-2"><Icon className={`w-5 h-5 ${cls}`} /><div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>
  )

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowUpCircle className="w-7 h-7 text-institute-blue" /> ترحيل الطلاب الناجحين</h1>
        <p className="text-muted-foreground">نقل الطلاب المستوفين للشروط إلى المستوى الأعلى وإنشاء العام الدراسي الجديد — مع خطوة اعتماد قبل التنفيذ. السجل السابق يُحفظ كما هو.</p>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600 flex items-center justify-between"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => setError(null)}>إغلاق</Button></CardContent></Card>}

      {/* Promotion data */}
      <Card>
        <CardHeader><CardTitle>بيانات الترحيل</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label className="mb-1 block">العام الحالي</Label>
              <Select value={f.fromYear} onValueChange={(v) => setF({ ...f, fromYear: v })}><SelectTrigger><SelectValue placeholder="اختر السنة" /></SelectTrigger><SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="mb-1 block">العام الجديد</Label>
              <Select value={f.toYear} onValueChange={(v) => setF({ ...f, toYear: v })}><SelectTrigger><SelectValue placeholder="اختر السنة" /></SelectTrigger><SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="mb-1 block">البرنامج</Label>
              <Select value={f.programId} onValueChange={(v) => setF({ ...f, programId: v })}><SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger><SelectContent><SelectItem value="all">كل البرامج</SelectItem>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="mb-1 block">القسم</Label>
              <Select value={f.departmentId} onValueChange={(v) => setF({ ...f, departmentId: v })}><SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger><SelectContent><SelectItem value="all">كل الأقسام</SelectItem>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div><Label className="mb-1 block">المستوى الحالي</Label>
              <Select value={f.fromLevel} onValueChange={(v) => setF({ ...f, fromLevel: v, toLevel: String(Math.min(5, Number(v) + 1)) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>المستوى {n}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="mb-1 block">المستوى المنقول إليه</Label>
              <Select value={f.toLevel} onValueChange={(v) => setF({ ...f, toLevel: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>المستوى {n}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="mb-1 block">الفصل (من)</Label>
              <Select value={f.fromSemester} onValueChange={(v) => setF({ ...f, fromSemester: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="first">الأول</SelectItem><SelectItem value="second">الثاني</SelectItem><SelectItem value="summer">الصيفي</SelectItem></SelectContent></Select>
            </div>
            <div><Label className="mb-1 block">الفصل (إلى)</Label>
              <Select value={f.toSemester} onValueChange={(v) => setF({ ...f, toSemester: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="first">الأول</SelectItem><SelectItem value="second">الثاني</SelectItem><SelectItem value="summer">الصيفي</SelectItem></SelectContent></Select>
            </div>
          </div>
          <Button disabled={busy !== null} onClick={evaluate}>عرض الطلاب</Button>
        </CardContent>
      </Card>

      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {stat("الإجمالي", stats.total, Users, "text-blue-500")}
          {stat("مؤهل", stats.eligible, CheckCircle2, "text-green-600")}
          {stat("ترحيل", stats.promote, ArrowUpCircle, "text-green-600")}
          {stat("تخرّج", stats.graduate, GraduationCap, "text-teal-600")}
          {stat("يبقى", stats.stay, Users, "text-amber-600")}
          {stat("لا يُرحّل", stats.skip, Users, "text-gray-500")}
        </div>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <div><CardTitle>الطلاب</CardTitle><CardDescription>{selected.size} محدد — راجِع الحالات ثم أنشئ دفعة الترحيل</CardDescription></div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 ml-1" /> تصدير Excel</Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 ml-1" /> طباعة الكشف</Button>
              <Button size="sm" disabled={selected.size === 0 || busy !== null || (batch?.status === "EXECUTED")} onClick={createBatch}>مراجعة / إنشاء دفعة ({selected.size})</Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-10"><Checkbox checked={rows.length > 0 && selected.size === rows.length} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>البرنامج</TableHead>
                <TableHead className="text-center">المستوى</TableHead><TableHead className="text-center">التقدير</TableHead><TableHead className="text-center">التراكمي</TableHead>
                <TableHead className="text-center">النتيجة</TableHead><TableHead className="text-center">حالة الترحيل</TableHead><TableHead>السبب</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.studentId} className={selected.has(r.studentId) ? "bg-green-50/40" : ""}>
                    <TableCell><Checkbox checked={selected.has(r.studentId)} onCheckedChange={() => toggle(r.studentId)} /></TableCell>
                    <TableCell>{r.studentCode}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.program}</TableCell>
                    <TableCell className="text-center">{r.level}{r.toLevel ? ` ← ${r.toLevel}` : ""}</TableCell>
                    <TableCell className="text-center">{r.grade}</TableCell>
                    <TableCell className="text-center font-semibold">{r.cgpa.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{r.result}</TableCell>
                    <TableCell className="text-center"><Badge className={ACTION_BADGE[r.action] ?? ""}>{ACTION_LABEL[r.action] ?? r.action}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-40 truncate" title={r.reason}>{r.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Batch approval / execution */}
      {batch && (
        <Card className="border-r-4 border-r-institute-blue">
          <CardHeader><CardTitle className="flex items-center gap-2">دفعة الترحيل
            <Badge className={batch.status === "EXECUTED" ? "bg-green-100 text-green-700" : batch.status === "APPROVED" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>
              {batch.status === "DRAFT" ? "مسودة" : batch.status === "APPROVED" ? "معتمدة" : batch.status === "EXECUTED" ? "منفّذة" : batch.status}
            </Badge></CardTitle>
            <CardDescription>{f.fromYear} (مستوى {f.fromLevel}) ← {f.toYear} · مؤهلون للترحيل: {batch.eligibleCount}{batch.status === "EXECUTED" ? ` · تم ترحيل ${batch.promotedCount}` : ""}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* the names inside the batch (client asked: batch showed no names) */}
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">من → إلى</TableHead><TableHead className="text-center">الإجراء</TableHead><TableHead>ملاحظة</TableHead></TableRow></TableHeader>
                <TableBody>
                  {batch.items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">لا يوجد طلاب في الدفعة</TableCell></TableRow> :
                    batch.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.studentCode}</TableCell>
                        <TableCell className="font-medium">{it.studentName}</TableCell>
                        <TableCell className="text-center">{it.fromLevel ?? "—"}{it.toLevel ? ` → ${it.toLevel}` : ""}</TableCell>
                        <TableCell className="text-center"><Badge className={ACTION_BADGE[it.action] ?? ""}>{ACTION_LABEL[it.action] ?? it.action}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-40 truncate" title={it.reason ?? ""}>{it.reason ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap gap-2">
              {batch.status === "DRAFT" && <Button disabled={busy !== null} onClick={() => patchBatch("approve")}><ShieldCheck className="w-4 h-4 ml-1" /> اعتماد الترحيل</Button>}
              {batch.status === "APPROVED" && <Button disabled={busy !== null} onClick={() => patchBatch("execute")}><PlayCircle className="w-4 h-4 ml-1" /> تنفيذ الترحيل</Button>}
              {batch.status === "EXECUTED" && <span className="text-green-700 flex items-center gap-1"><CheckCircle2 className="w-5 h-5" /> تم التنفيذ والإقفال — لا يمكن التعديل إلا بإجراء رسمي.</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
