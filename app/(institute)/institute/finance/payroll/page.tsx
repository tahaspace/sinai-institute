"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Plus, CheckCircle2, Banknote, Play, Download } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const n = (v: number) => (v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ST: Record<string, string> = { PAID: "bg-green-100 text-green-700", APPROVED: "bg-blue-100 text-blue-700", DRAFT: "bg-amber-100 text-amber-700" }

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Any[]>([])
  const [components, setComponents] = useState<Any[]>([])
  const [runs, setRuns] = useState<Any[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [ne, setNe] = useState({ code: "", nameAr: "", jobTitle: "", baseSalary: "" })
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [e, c, r] = await Promise.all([fetch("/api/institute/finance/payroll/employees"), fetch("/api/institute/finance/payroll/components"), fetch("/api/institute/finance/payroll/runs")])
      if (e.ok) setEmployees((await e.json()).employees ?? [])
      if (c.ok) setComponents((await c.json()).components ?? [])
      if (r.ok) setRuns((await r.json()).runs ?? [])
    } catch (err) { setError((err as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  async function act(url: string, opts: RequestInit, msg: string) {
    setBusy(true); setError(null); setNotice(null)
    try { const res = await fetch(url, opts); const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(j.error || "فشل الإجراء"); setNotice(msg); await load(); return j }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const J = (b: Any, m = "POST") => ({ method: m, headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) })

  const importInstructors = () => act("/api/institute/finance/payroll/employees", J({ action: "import-instructors" }), "تم استيراد الموظفين من هيئة التدريس")
  const seedComponents = () => act("/api/institute/finance/payroll/components", J({ action: "seed-default" }), "تم إنشاء مكونات الراتب الافتراضية")
  const addEmp = async () => { if (!ne.code || !ne.nameAr) return; const r = await act("/api/institute/finance/payroll/employees", J({ ...ne, baseSalary: Number(ne.baseSalary) || 0 }), "تمت إضافة الموظف"); if (r?.ok) setNe({ code: "", nameAr: "", jobTitle: "", baseSalary: "" }) }
  const runPayroll = () => act("/api/institute/finance/payroll/runs", J({ month }), "تم إنشاء مسير الرواتب")
  const runAction = (id: string, action: string) => act(`/api/institute/finance/payroll/runs/${id}`, J({ action }), action === "pay" ? "تم صرف الرواتب" : "تم اعتماد المسير")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-7 h-7 text-institute-gold" /> الرواتب والأجور</h1>
        <p className="text-muted-foreground">الموظفون · مكونات الراتب · مسير شهري بقسائم رواتب (تأمينات + ضريبة) — مرحّل للأستاذ العام</p>
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}
      {notice && <Card><CardContent className="p-4 text-center text-green-700">{notice}</CardContent></Card>}

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs"><Play className="w-4 h-4 ml-1" /> مسيرات الرواتب</TabsTrigger>
          <TabsTrigger value="employees">الموظفون</TabsTrigger>
          <TabsTrigger value="components">مكونات الراتب</TabsTrigger>
        </TabsList>

        {/* Runs */}
        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>تشغيل مسير رواتب</CardTitle><CardDescription>يحسب قسائم كل الموظفين النشطين عن الشهر المحدد.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end">
                <div><label className="text-xs text-muted-foreground">الشهر</label><Input type="month" className="w-40" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
                <Button onClick={runPayroll} disabled={busy || employees.length === 0}><Play className="w-4 h-4 ml-1" /> تشغيل</Button>
                {employees.length === 0 && <span className="text-sm text-amber-600">أضِف موظفين أولًا</span>}
              </div>
            </CardContent>
          </Card>
          {runs.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">مسير {r.month} <Badge className={ST[r.status]}>{r.status}</Badge></CardTitle>
                  <CardDescription>إجمالي {n(r.gross)} · تأمينات {n(r.insurance)} · ضريبة {n(r.tax)} · صافي <b>{n(r.net)}</b></CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}><Download className="w-4 h-4 ml-1" /> القسائم</Button>
                  {r.status === "DRAFT" && <Button size="sm" onClick={() => runAction(r.id, "approve")} disabled={busy}><CheckCircle2 className="w-4 h-4 ml-1" /> اعتماد</Button>}
                  {r.status === "APPROVED" && <Button size="sm" variant="outline" onClick={() => runAction(r.id, "pay")} disabled={busy}><Banknote className="w-4 h-4 ml-1" /> صرف</Button>}
                </div>
              </CardHeader>
              {open === r.id && (
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead className="text-center">الإجمالي</TableHead><TableHead className="text-center">تأمينات</TableHead><TableHead className="text-center">ضريبة</TableHead><TableHead className="text-center">الصافي</TableHead></TableRow></TableHeader>
                    <TableBody>{r.payslips.map((p: Any, i: number) => <TableRow key={i}><TableCell>{p.employee}</TableCell><TableCell className="text-center">{n(p.gross)}</TableCell><TableCell className="text-center">{n(p.insurance)}</TableCell><TableCell className="text-center">{n(p.tax)}</TableCell><TableCell className="text-center font-bold">{n(p.net)}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Employees */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>موظف جديد</CardTitle></div>
              <Button variant="outline" size="sm" onClick={importInstructors} disabled={busy}>استيراد من هيئة التدريس</Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 items-end">
                <div><label className="text-xs text-muted-foreground">الكود</label><Input className="w-28" value={ne.code} onChange={(e) => setNe((p) => ({ ...p, code: e.target.value }))} /></div>
                <div className="flex-1 min-w-36"><label className="text-xs text-muted-foreground">الاسم</label><Input value={ne.nameAr} onChange={(e) => setNe((p) => ({ ...p, nameAr: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground">الوظيفة</label><Input className="w-32" value={ne.jobTitle} onChange={(e) => setNe((p) => ({ ...p, jobTitle: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground">الراتب الأساسي</label><Input type="number" className="w-28" value={ne.baseSalary} onChange={(e) => setNe((p) => ({ ...p, baseSalary: e.target.value }))} /></div>
                <Button onClick={addEmp} disabled={busy || !ne.code || !ne.nameAr}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>الموظفون</CardTitle><CardDescription>{employees.length} موظف</CardDescription></CardHeader>
            <CardContent>
              {employees.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا يوجد موظفون</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>الوظيفة</TableHead><TableHead className="text-center">الراتب الأساسي</TableHead></TableRow></TableHeader>
                  <TableBody>{employees.map((e) => <TableRow key={e.id}><TableCell className="font-mono text-xs">{e.code}</TableCell><TableCell>{e.nameAr}</TableCell><TableCell>{e.jobTitle ?? "—"}</TableCell><TableCell className="text-center font-bold">{n(e.baseSalary)}</TableCell></TableRow>)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Components */}
        <TabsContent value="components">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>مكونات الراتب</CardTitle><CardDescription>البدلات والخصومات</CardDescription></div>
              {components.length === 0 && <Button size="sm" onClick={seedComponents} disabled={busy}><Plus className="w-4 h-4 ml-1" /> مكونات افتراضية</Button>}
            </CardHeader>
            <CardContent>
              {components.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا توجد مكونات</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">النوع</TableHead><TableHead className="text-center">خاضع للضريبة</TableHead></TableRow></TableHeader>
                  <TableBody>{components.map((c) => <TableRow key={c.id}><TableCell className="font-mono">{c.code}</TableCell><TableCell>{c.nameAr}</TableCell><TableCell className="text-center"><Badge variant="outline">{c.kind === "EARNING" ? "استحقاق" : "خصم"}</Badge></TableCell><TableCell className="text-center">{c.isTaxable ? "نعم" : "لا"}</TableCell></TableRow>)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
