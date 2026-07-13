"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Plus, Upload, Settings2, CheckCheck } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const STATUS: Record<string, string> = { P: "حاضر", A: "غياب", L: "تأخير", E: "خروج مبكر", O: "إضافي", H: "عطلة" }
const REVIEW: Record<string, string> = { DRAFT: "مسودة", REVIEWED: "مُراجَع", APPROVED: "معتمد", LOCKED: "مغلق" }
const today = () => new Date().toISOString().slice(0, 10)

export default function AttendancePage() {
  const [date, setDate] = useState(today())
  const [records, setRecords] = useState<Any[]>([])
  const [staff, setStaff] = useState<Any[]>([])
  const [cfg, setCfg] = useState<Any>({ schedules: [], shifts: [], holidays: [], policy: null })
  const [error, setError] = useState<string | null>(null)
  const [entry, setEntry] = useState<Record<string, string>>({})
  const [imp, setImp] = useState("")
  const [showCfg, setShowCfg] = useState(false)

  const loadDay = useCallback(async () => {
    setError(null)
    try { const r = await fetch(`/api/institute/hr/attendance?date=${date}`); const j = await r.json(); if (!r.ok) throw new Error(j.error); setRecords(j.records ?? []) } catch (e) { setError((e as Error).message) }
  }, [date])
  useEffect(() => { loadDay() }, [loadDay])
  useEffect(() => { (async () => {
    try {
      const [s, c] = await Promise.all([fetch("/api/institute/hr/employees"), fetch("/api/institute/hr/attendance/config")])
      if (s.ok) setStaff((await s.json()).employees ?? [])
      if (c.ok) setCfg(await c.json())
    } catch { /* optional */ }
  })() }, [])

  const post = async (url: string, payload: Any, done?: () => void) => {
    setError(null)
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const j = await r.json(); if (!r.ok) { setError(j.error || "فشل"); return }
    done?.(); loadDay()
  }
  const addEntry = () => { if (!entry.employeeId) { setError("اختر الموظف"); return } post("/api/institute/hr/attendance", { ...entry, date }, () => setEntry({})) }
  const review = async (state: string) => { await fetch("/api/institute/hr/attendance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, reviewState: state }) }); loadDay() }
  const runImport = () => {
    const rows = imp.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [code, d, checkIn, checkOut] = l.split(","); return { code, date: d, checkIn, checkOut } })
    if (rows.length) post("/api/institute/hr/attendance", { rows }, () => setImp(""))
  }
  const saveCfg = (entity: string, payload: Any, done?: () => void) => post("/api/institute/hr/attendance/config", { entity, ...payload }, done)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="w-7 h-7 text-institute-blue" /> الحضور والانصراف</h1>
          <p className="text-muted-foreground">التسجيل اليومي والمراجعة والاعتماد + إعدادات المواعيد والعطلات</p></div>
        <Button variant="outline" onClick={() => setShowCfg((s) => !s)}><Settings2 className="w-4 h-4 ml-1" /> الإعدادات</Button>
      </div>
      {error && <Card><CardContent className="p-3 text-center text-red-600">{error}</CardContent></Card>}

      {showCfg && <ConfigCard cfg={cfg} save={saveCfg} reload={async () => { const c = await fetch("/api/institute/hr/attendance/config"); if (c.ok) setCfg(await c.json()) }} />}

      {/* Daily records */}
      <Card>
        <CardHeader className="pb-2"><div className="flex items-center justify-between">
          <CardTitle className="text-base">سجل يوم</CardTitle>
          <div className="flex items-center gap-2">
            <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => review("REVIEWED")}><CheckCheck className="w-4 h-4 ml-1" /> مراجعة اليوم</Button>
            <Button size="sm" onClick={() => review("APPROVED")}>اعتماد اليوم</Button>
          </div>
        </div></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end border-b pb-3">
            <div><label className="text-xs text-muted-foreground">الموظف</label>
              <Select value={entry.employeeId ?? ""} onValueChange={(v) => setEntry((p) => ({ ...p, employeeId: v }))}>
                <SelectTrigger className="w-52"><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.nameAr} ({s.code})</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className="text-xs text-muted-foreground">حضور</label><Input className="w-24" placeholder="09:00" value={entry.checkIn ?? ""} onChange={(e) => setEntry((p) => ({ ...p, checkIn: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">انصراف</label><Input className="w-24" placeholder="15:00" value={entry.checkOut ?? ""} onChange={(e) => setEntry((p) => ({ ...p, checkOut: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">الحالة</label>
              <Select value={entry.status ?? "auto"} onValueChange={(v) => setEntry((p) => ({ ...p, status: v === "auto" ? "" : v }))}>
                <SelectTrigger className="w-28"><SelectValue placeholder="تلقائي" /></SelectTrigger>
                <SelectContent><SelectItem value="auto">تلقائي</SelectItem>{Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select></div>
            <Button onClick={addEntry}><Plus className="w-4 h-4 ml-1" /> تسجيل</Button>
          </div>
          <div className="overflow-x-auto">
            {records.length === 0 ? <p className="p-4 text-center text-muted-foreground">لا توجد سجلات لهذا اليوم</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الموظف</TableHead><TableHead className="text-center">حضور</TableHead><TableHead className="text-center">انصراف</TableHead><TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">تأخير (د)</TableHead><TableHead className="text-center">المراجعة</TableHead></TableRow></TableHeader>
                <TableBody>{records.map((r) => (
                  <TableRow key={r.id}><TableCell className="font-mono">{r.code}</TableCell><TableCell>{r.name}</TableCell><TableCell className="text-center">{r.checkIn ?? "—"}</TableCell><TableCell className="text-center">{r.checkOut ?? "—"}</TableCell>
                    <TableCell className="text-center"><Badge variant={r.status === "A" ? "destructive" : "outline"}>{STATUS[r.status] ?? r.status}</Badge></TableCell>
                    <TableCell className="text-center font-mono">{r.lateMinutes || 0}</TableCell><TableCell className="text-center text-xs">{REVIEW[r.reviewState] ?? r.reviewState}</TableCell>
                  </TableRow>))}</TableBody>
              </Table>
            )}
          </div>
          {/* Import */}
          <div className="border-t pt-3">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Upload className="w-3 h-3" /> استيراد (كل سطر: كود,تاريخ,حضور,انصراف)</label>
            <textarea className="w-full border rounded p-2 text-sm font-mono h-20 mt-1" placeholder="EMP-0001,2026-07-13,09:05,15:00" value={imp} onChange={(e) => setImp(e.target.value)} />
            <Button size="sm" className="mt-1" onClick={runImport} disabled={!imp.trim()}>استيراد</Button>
          </div>
        </CardContent>
      </Card>

      <AdjustmentsCard staff={staff} />
    </div>
  )
}

function ConfigCard({ cfg, save, reload }: { cfg: Any; save: (e: string, p: Any, done?: () => void) => void; reload: () => void }) {
  const [sch, setSch] = useState<Record<string, string>>({})
  const [hol, setHol] = useState<Record<string, string>>({})
  const [pol, setPol] = useState<Record<string, string>>({})
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-base">الإعدادات</CardTitle><CardDescription>مواعيد العمل، العطلات، سياسة السماح والإضافي</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-semibold mb-1">مواعيد العمل</div>
          <div className="flex flex-wrap gap-2 items-end">
            <Input className="w-40" placeholder="اسم الدوام" value={sch.name ?? ""} onChange={(e) => setSch((p) => ({ ...p, name: e.target.value }))} />
            <Input className="w-24" placeholder="من 09:00" value={sch.startTime ?? ""} onChange={(e) => setSch((p) => ({ ...p, startTime: e.target.value }))} />
            <Input className="w-24" placeholder="إلى 15:00" value={sch.endTime ?? ""} onChange={(e) => setSch((p) => ({ ...p, endTime: e.target.value }))} />
            <Button size="sm" disabled={!sch.name} onClick={() => save("schedule", { ...sch, isDefault: cfg.schedules.length === 0 }, () => { setSch({}); reload() })}><Plus className="w-4 h-4" /></Button>
            {cfg.schedules.map((s: Any) => <Badge key={s.id} variant="outline">{s.name} {s.isDefault ? "★" : ""} {s.startTime}-{s.endTime}</Badge>)}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold mb-1">العطلات الرسمية</div>
          <div className="flex flex-wrap gap-2 items-end">
            <Input className="w-40" placeholder="المناسبة" value={hol.name ?? ""} onChange={(e) => setHol((p) => ({ ...p, name: e.target.value }))} />
            <Input type="date" className="w-40" value={hol.date ?? ""} onChange={(e) => setHol((p) => ({ ...p, date: e.target.value }))} />
            <Button size="sm" disabled={!hol.name || !hol.date} onClick={() => save("holiday", hol, () => { setHol({}); reload() })}><Plus className="w-4 h-4" /></Button>
            {cfg.holidays.map((h: Any) => <Badge key={h.id} variant="outline">{h.name}</Badge>)}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold mb-1">سياسة السماح/الإضافي</div>
          <div className="flex flex-wrap gap-2 items-end">
            <div><label className="text-xs text-muted-foreground">سماح حضور (د)</label><Input type="number" className="w-24" value={pol.graceInMin ?? (cfg.policy?.graceInMin ?? "")} onChange={(e) => setPol((p) => ({ ...p, graceInMin: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">تأخير→خصم (د)</label><Input type="number" className="w-24" value={pol.lateToDeductMin ?? (cfg.policy?.lateToDeductMin ?? "")} onChange={(e) => setPol((p) => ({ ...p, lateToDeductMin: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">أقل إضافي (د)</label><Input type="number" className="w-24" value={pol.minOvertimeMin ?? (cfg.policy?.minOvertimeMin ?? "")} onChange={(e) => setPol((p) => ({ ...p, minOvertimeMin: e.target.value }))} /></div>
            <Button size="sm" onClick={() => save("policy", pol, () => { setPol({}); reload() })}>حفظ السياسة</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdjustmentsCard({ staff }: { staff: Any[] }) {
  const [data, setData] = useState<Any>({ penalties: [], overtime: [], permissions: [] })
  const [f, setF] = useState<Record<string, string>>({ kind: "overtime" })
  const [err, setErr] = useState<string | null>(null)
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/institute/hr/adjustments")
      const j = await r.json(); if (!r.ok) throw new Error(j.error)
      setData(j)
    } catch (e) { setErr((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])
  const add = async () => {
    setErr(null)
    if (!f.employeeId) { setErr("اختر الموظف"); return }
    const r = await fetch("/api/institute/hr/adjustments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) })
    if (!r.ok) { setErr((await r.json()).error || "فشل"); return }
    setF({ kind: f.kind }); load()
  }
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-base">الجزاءات والإضافي والأذونات</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <div className="flex flex-wrap gap-2 items-end">
          <Select value={f.kind} onValueChange={(v) => setF({ kind: v })}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="overtime">إضافي</SelectItem><SelectItem value="penalty">جزاء</SelectItem><SelectItem value="permission">إذن/مأمورية</SelectItem></SelectContent></Select>
          <Select value={f.employeeId ?? ""} onValueChange={(v) => setF((p) => ({ ...p, employeeId: v }))}><SelectTrigger className="w-52"><SelectValue placeholder="الموظف" /></SelectTrigger><SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.nameAr}</SelectItem>)}</SelectContent></Select>
          <Input type="date" className="w-40" value={f.date ?? ""} onChange={(e) => setF((p) => ({ ...p, date: e.target.value }))} />
          {f.kind === "overtime" && <Input className="w-24" placeholder="ساعات" value={f.hours ?? ""} onChange={(e) => setF((p) => ({ ...p, hours: e.target.value }))} />}
          {f.kind === "penalty" && <Input className="w-28" placeholder="خصم أيام" value={f.deductDays ?? ""} onChange={(e) => setF((p) => ({ ...p, deductDays: e.target.value }))} />}
          <Input className="w-40" placeholder="السبب/ملاحظة" value={f.reason ?? ""} onChange={(e) => setF((p) => ({ ...p, reason: e.target.value }))} />
          <Button onClick={add}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
        </div>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div><div className="font-semibold mb-1">الإضافي</div>{data.overtime.slice(0, 8).map((o: Any) => <div key={o.id} className="border-b py-1">{o.name} — {o.hours} س <Badge variant="outline" className="text-xs">{o.status}</Badge></div>)}</div>
          <div><div className="font-semibold mb-1">الجزاءات</div>{data.penalties.slice(0, 8).map((p: Any) => <div key={p.id} className="border-b py-1">{p.name} — {p.type} {p.deductDays ? `(${p.deductDays} يوم)` : ""}</div>)}</div>
          <div><div className="font-semibold mb-1">الأذونات/المأموريات</div>{data.permissions.slice(0, 8).map((p: Any) => <div key={p.id} className="border-b py-1">{p.name} — {p.type} <Badge variant="outline" className="text-xs">{p.status}</Badge></div>)}</div>
        </div>
      </CardContent>
    </Card>
  )
}
