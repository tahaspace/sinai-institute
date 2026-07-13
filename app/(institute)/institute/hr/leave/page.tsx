"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, Plus, Check, X } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

export default function LeavePage() {
  const [data, setData] = useState<Any>({ types: [], requests: [], balances: [] })
  const [staff, setStaff] = useState<Any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [typeForm, setTypeForm] = useState<Record<string, string>>({})
  const [reqForm, setReqForm] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await fetch("/api/institute/hr/leave"); const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setData(j)
    } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { (async () => { try { const s = await fetch("/api/institute/hr/employees"); if (s.ok) setStaff((await s.json()).employees ?? []) } catch { /* optional */ } })() }, [])

  const post = async (payload: Any, done: () => void) => {
    setError(null)
    const r = await fetch("/api/institute/hr/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const j = await r.json(); if (!r.ok) { setError(j.error || "فشل"); return }
    done(); load()
  }
  const decide = async (id: string, status: string) => {
    const r = await fetch("/api/institute/hr/leave", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) })
    if (!r.ok) { setError((await r.json()).error || "فشل"); return }
    load()
  }
  const typeName = (id: string) => data.types.find((t: Any) => t.id === id)?.nameAr ?? id
  const staffName = (id: string) => staff.find((s: Any) => s.id === id)?.nameAr ?? id

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="w-7 h-7 text-institute-blue" /> الإجازات</h1>
        <p className="text-muted-foreground">أنواع الإجازات وطلباتها واعتمادها وأرصدة العاملين</p></div>
      {error && <Card><CardContent className="p-3 text-center text-red-600">{error}</CardContent></Card>}

      <Card><CardHeader className="pb-2"><CardTitle className="text-base">أنواع الإجازات</CardTitle><CardDescription>مدفوعة/غير مدفوعة والرصيد السنوي</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <Input className="w-24" placeholder="الكود" value={typeForm.code ?? ""} onChange={(e) => setTypeForm((p) => ({ ...p, code: e.target.value }))} />
            <Input className="w-44" placeholder="الاسم (اعتيادية/مرضية…)" value={typeForm.nameAr ?? ""} onChange={(e) => setTypeForm((p) => ({ ...p, nameAr: e.target.value }))} />
            <Input className="w-28" placeholder="رصيد سنوي" value={typeForm.annualQuota ?? ""} onChange={(e) => setTypeForm((p) => ({ ...p, annualQuota: e.target.value }))} />
            <Select value={typeForm.isPaid ?? "yes"} onValueChange={(v) => setTypeForm((p) => ({ ...p, isPaid: v }))}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">مدفوعة</SelectItem><SelectItem value="no">بدون راتب</SelectItem></SelectContent></Select>
            <Button onClick={() => post({ kind: "type", code: typeForm.code, nameAr: typeForm.nameAr, annualQuota: typeForm.annualQuota, isPaid: (typeForm.isPaid ?? "yes") === "yes" }, () => setTypeForm({}))}><Plus className="w-4 h-4 ml-1" /> إضافة نوع</Button>
          </div>
          <div className="flex flex-wrap gap-2">{data.types.map((t: Any) => <Badge key={t.id} variant="outline">{t.nameAr} {t.isPaid ? "" : "(بدون راتب)"} {t.annualQuota ? `· ${t.annualQuota} يوم` : ""}</Badge>)}</div>
        </CardContent>
      </Card>

      <Card><CardHeader className="pb-2"><CardTitle className="text-base">طلبات الإجازة</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end border-b pb-3">
            <Select value={reqForm.employeeId ?? ""} onValueChange={(v) => setReqForm((p) => ({ ...p, employeeId: v }))}><SelectTrigger className="w-52"><SelectValue placeholder="الموظف" /></SelectTrigger><SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.nameAr}</SelectItem>)}</SelectContent></Select>
            <Select value={reqForm.leaveTypeId ?? ""} onValueChange={(v) => setReqForm((p) => ({ ...p, leaveTypeId: v }))}><SelectTrigger className="w-40"><SelectValue placeholder="نوع الإجازة" /></SelectTrigger><SelectContent>{data.types.map((t: Any) => <SelectItem key={t.id} value={t.id}>{t.nameAr}</SelectItem>)}</SelectContent></Select>
            <div><label className="text-xs text-muted-foreground">من</label><Input type="date" className="w-40" value={reqForm.fromDate ?? ""} onChange={(e) => setReqForm((p) => ({ ...p, fromDate: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">إلى</label><Input type="date" className="w-40" value={reqForm.toDate ?? ""} onChange={(e) => setReqForm((p) => ({ ...p, toDate: e.target.value }))} /></div>
            <Button disabled={!reqForm.employeeId || !reqForm.leaveTypeId || !reqForm.fromDate || !reqForm.toDate} onClick={() => post({ ...reqForm }, () => setReqForm({}))}><Plus className="w-4 h-4 ml-1" /> تقديم طلب</Button>
          </div>
          <div className="overflow-x-auto">
            {data.requests.length === 0 ? <p className="p-4 text-center text-muted-foreground">لا توجد طلبات</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead>النوع</TableHead><TableHead className="text-center">من</TableHead><TableHead className="text-center">إلى</TableHead><TableHead className="text-center">أيام</TableHead><TableHead className="text-center">الحالة</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>{data.requests.map((r: Any) => (
                  <TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell>{r.leaveType}</TableCell><TableCell className="text-center">{String(r.fromDate).slice(0, 10)}</TableCell><TableCell className="text-center">{String(r.toDate).slice(0, 10)}</TableCell><TableCell className="text-center">{r.days}</TableCell>
                    <TableCell className="text-center"><Badge variant={r.status === "APPROVED" ? "default" : r.status === "REJECTED" ? "destructive" : "outline"}>{r.status === "APPROVED" ? "معتمدة" : r.status === "REJECTED" ? "مرفوضة" : "معلّقة"}</Badge></TableCell>
                    <TableCell>{r.status === "PENDING" && <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => decide(r.id, "APPROVED")}><Check className="w-4 h-4" /></Button><Button size="sm" variant="outline" onClick={() => decide(r.id, "REJECTED")}><X className="w-4 h-4" /></Button></div>}</TableCell>
                  </TableRow>))}</TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {data.balances.length > 0 && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">أرصدة الإجازات ({new Date().getFullYear()})</CardTitle></CardHeader>
          <CardContent><Table>
            <TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead>النوع</TableHead><TableHead className="text-center">المستحق</TableHead><TableHead className="text-center">المستهلك</TableHead><TableHead className="text-center">المتبقي</TableHead></TableRow></TableHeader>
            <TableBody>{data.balances.map((b: Any) => <TableRow key={b.id}><TableCell>{staffName(b.employeeId)}</TableCell><TableCell>{typeName(b.leaveTypeId)}</TableCell><TableCell className="text-center">{b.entitled}</TableCell><TableCell className="text-center">{b.used}</TableCell><TableCell className="text-center font-bold">{b.entitled - b.used}</TableCell></TableRow>)}</TableBody>
          </Table></CardContent>
        </Card>
      )}
    </div>
  )
}
