"use client"

import { useState, useEffect, useCallback } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Receipt, FileText, Plus, Wallet, CalendarClock, ScrollText } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const n = (v: number) => (v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ST: Record<string, string> = { PAID: "bg-green-100 text-green-700", PARTIAL: "bg-amber-100 text-amber-700", ISSUED: "bg-blue-100 text-blue-700", VOID: "bg-gray-100 text-gray-500", DRAFT: "bg-gray-100 text-gray-500" }

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Any[]>([])
  const [structures, setStructures] = useState<Any[]>([])
  const [receipts, setReceipts] = useState<Any[]>([])
  const [aging, setAging] = useState<Any>(null)
  const [agingSystem, setAgingSystem] = useState(ACADEMIC_SYSTEM_ALL)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // new invoice
  const [code, setCode] = useState("")
  const [structureId, setStructureId] = useState("")
  // statement
  const [stmtCode, setStmtCode] = useState("")
  const [stmt, setStmt] = useState<Any>(null)
  // per-invoice action inputs
  const [pay, setPay] = useState<Record<string, { amount: string; method: string }>>({})
  const [plan, setPlan] = useState<Record<string, { count: string; due: string }>>({})

  const load = useCallback(async () => {
    setError(null)
    try {
      const [i, s, r, a] = await Promise.all([
        fetch("/api/institute/finance/invoices"), fetch("/api/institute/finance/fee-structures"),
        fetch("/api/institute/finance/receipts"), fetch("/api/institute/finance/ar?type=aging"),
      ])
      if (i.ok) setInvoices((await i.json()).invoices ?? [])
      if (s.ok) setStructures((await s.json()).structures ?? [])
      if (r.ok) setReceipts((await r.json()).receipts ?? [])
      if (a.ok) setAging((await a.json()).report)
    } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  async function act(url: string, body: Any, msg: string) {
    setBusy(true); setError(null); setNotice(null)
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "فشل تنفيذ الإجراء")
      setNotice(msg); await load(); return j
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const issue = async () => {
    if (!code || !structureId) { setError("اختر الطالب والهيكل"); return }
    const r = await act("/api/institute/finance/invoices", { studentCode: code, structureId }, "تم إصدار الفاتورة")
    if (r?.ok) { setCode(""); setStructureId("") }
  }
  const recordPay = (inv: Any) => {
    const p = pay[inv.id] ?? { amount: "", method: "CASH" }
    if (!p.amount) return
    act("/api/institute/finance/receipts", { invoiceId: inv.id, amount: Number(p.amount), method: p.method }, "تم تسجيل السند")
  }
  const makePlan = (inv: Any) => {
    const p = plan[inv.id] ?? { count: "", due: "" }
    if (!p.count || !p.due) return
    act(`/api/institute/finance/invoices/${inv.id}`, { action: "plan", count: Number(p.count), firstDueDate: p.due }, "تم إنشاء جدول الأقساط")
  }
  const loadStatement = async () => {
    if (!stmtCode) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/institute/finance/ar?type=statement&studentCode=${stmtCode}`)
      const j = await res.json(); if (!res.ok) throw new Error(j.error)
      setStmt(j)
    } catch (e) { setError((e as Error).message); setStmt(null) } finally { setBusy(false) }
  }

  // Aging is the only list here whose rows carry a server-resolved academic system (see
  // /api/institute/finance/ar). Invoices, receipts and fee structures do not, and filtering them on
  // an absent field would silently read every row as credit-hours — so they stay unfiltered.
  const agingRows: Any[] = (aging?.rows ?? []).filter((r: Any) => matchesSystem(r.system, agingSystem))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="w-7 h-7 text-institute-gold" /> فواتير ومدفوعات الطلاب</h1>
        <p className="text-muted-foreground">إصدار الفواتير · الأقساط · سندات القبض · أعمار الديون · كشوف الحسابات — مرحّلة تلقائيًا لدفتر الأستاذ</p>
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}
      {notice && <Card><CardContent className="p-4 text-center text-green-700">{notice}</CardContent></Card>}

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices"><FileText className="w-4 h-4 ml-1" /> الفواتير</TabsTrigger>
          <TabsTrigger value="structures">هياكل الرسوم</TabsTrigger>
          <TabsTrigger value="receipts"><Wallet className="w-4 h-4 ml-1" /> سندات القبض</TabsTrigger>
          <TabsTrigger value="aging">أعمار الديون</TabsTrigger>
          <TabsTrigger value="statement"><ScrollText className="w-4 h-4 ml-1" /> كشف حساب</TabsTrigger>
        </TabsList>

        {/* Invoices */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>فاتورة جديدة</CardTitle><CardDescription>اختر الطالب وهيكل الرسوم لإصدار الفاتورة وترحيلها محاسبيًا.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 items-end">
                <div><label className="text-xs text-muted-foreground">رقم الطالب</label><Input className="w-40" value={code} onChange={(e) => setCode(e.target.value)} placeholder="2024-105" /></div>
                <div><label className="text-xs text-muted-foreground">هيكل الرسوم</label>
                  <Select value={structureId} onValueChange={setStructureId}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="اختر الهيكل" /></SelectTrigger>
                    <SelectContent>{structures.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.nameAr} ({n(s.total)})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={issue} disabled={busy || !code || !structureId}><Plus className="w-4 h-4 ml-1" /> إصدار</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>الفواتير</CardTitle><CardDescription>{invoices.length} فاتورة</CardDescription></CardHeader>
            <CardContent>
              {invoices.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا توجد فواتير</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>رقم</TableHead><TableHead>الطالب</TableHead><TableHead className="text-center">الإجمالي</TableHead><TableHead className="text-center">المسدد</TableHead><TableHead className="text-center">المتبقي</TableHead><TableHead className="text-center">الحالة</TableHead><TableHead>قبض / أقساط</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                        <TableCell>{inv.student}<div className="text-[11px] text-muted-foreground font-mono">{inv.studentCode}</div></TableCell>
                        <TableCell className="text-center">{n(inv.total)}</TableCell>
                        <TableCell className="text-center text-green-700">{n(inv.paid)}</TableCell>
                        <TableCell className="text-center font-bold">{n(inv.balance)}</TableCell>
                        <TableCell className="text-center"><Badge className={ST[inv.status]}>{inv.status}</Badge></TableCell>
                        <TableCell>
                          {inv.balance > 0 && (
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1 items-center">
                                <Input type="number" className="w-24 h-8" placeholder="مبلغ" value={pay[inv.id]?.amount ?? ""} onChange={(e) => setPay((p) => ({ ...p, [inv.id]: { amount: e.target.value, method: p[inv.id]?.method ?? "CASH" } }))} />
                                <Select value={pay[inv.id]?.method ?? "CASH"} onValueChange={(v) => setPay((p) => ({ ...p, [inv.id]: { amount: p[inv.id]?.amount ?? "", method: v } }))}>
                                  <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="CASH">نقدًا</SelectItem><SelectItem value="BANK">بنك</SelectItem><SelectItem value="GATEWAY">بوابة</SelectItem></SelectContent>
                                </Select>
                                <Button size="sm" className="h-8" onClick={() => recordPay(inv)} disabled={busy}>قبض</Button>
                              </div>
                              <div className="flex gap-1 items-center">
                                <Input type="number" className="w-16 h-8" placeholder="عدد" value={plan[inv.id]?.count ?? ""} onChange={(e) => setPlan((p) => ({ ...p, [inv.id]: { count: e.target.value, due: p[inv.id]?.due ?? "" } }))} />
                                <Input type="date" className="w-32 h-8" value={plan[inv.id]?.due ?? ""} onChange={(e) => setPlan((p) => ({ ...p, [inv.id]: { count: p[inv.id]?.count ?? "", due: e.target.value } }))} />
                                <Button size="sm" variant="outline" className="h-8" onClick={() => makePlan(inv)} disabled={busy}><CalendarClock className="w-3 h-3 ml-1" /> أقساط</Button>
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Structures */}
        <TabsContent value="structures">
          <Card>
            <CardHeader><CardTitle>هياكل الرسوم</CardTitle><CardDescription>قوالب الرسوم القابلة لإعادة الاستخدام</CardDescription></CardHeader>
            <CardContent>
              {structures.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا توجد هياكل — أضِفها عبر API <code>POST /fee-structures</code></p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">المستوى</TableHead><TableHead className="text-center">البنود</TableHead><TableHead className="text-center">الإجمالي</TableHead></TableRow></TableHeader>
                  <TableBody>{structures.map((s) => <TableRow key={s.id}><TableCell className="font-mono">{s.code}</TableCell><TableCell>{s.nameAr}</TableCell><TableCell className="text-center">{s.level ?? "—"}</TableCell><TableCell className="text-center">{s.items.length}</TableCell><TableCell className="text-center font-bold">{n(s.total)}</TableCell></TableRow>)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipts */}
        <TabsContent value="receipts">
          <Card>
            <CardHeader><CardTitle>سندات القبض</CardTitle><CardDescription>{receipts.length} سند</CardDescription></CardHeader>
            <CardContent>
              {receipts.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا توجد سندات</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>رقم</TableHead><TableHead>الطالب</TableHead><TableHead className="text-center">التاريخ</TableHead><TableHead className="text-center">الطريقة</TableHead><TableHead className="text-center">المبلغ</TableHead></TableRow></TableHeader>
                  <TableBody>{receipts.map((r) => <TableRow key={r.id}><TableCell className="font-mono text-xs">{r.number}</TableCell><TableCell>{r.student}</TableCell><TableCell className="text-center">{r.date?.slice(0, 10)}</TableCell><TableCell className="text-center">{r.method}</TableCell><TableCell className="text-center font-bold">{n(r.amount)}</TableCell></TableRow>)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aging */}
        <TabsContent value="aging">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <CardTitle>أعمار الديون</CardTitle>
                  <CardDescription>إجمالي المتأخرات {aging ? n(aging.grandTotal) : "—"}</CardDescription>
                </div>
                <AcademicSystemFilter value={agingSystem} onChange={setAgingSystem} className="w-full md:w-56" />
              </div>
            </CardHeader>
            <CardContent>
              {!aging ? <p className="p-6 text-center text-muted-foreground">جارٍ التحميل...</p> : (
                <>
                  <div className="flex flex-wrap gap-3 mb-4">{aging.labels.map((l: string) => <Badge key={l} variant="outline" className="text-sm">{l}: {n(aging.totals[l])}</Badge>)}</div>
                  {/* The bucket totals above must keep tying to the AR control account, so they are
                      never recomputed from the filtered rows — said plainly rather than left to guess. */}
                  {agingSystem !== ACADEMIC_SYSTEM_ALL && <p className="text-xs text-muted-foreground mb-3">الإجماليات أعلاه محاسبية وتشمل كل الأنظمة؛ التصفية تضيّق قائمة الفواتير فقط.</p>}
                  {/* Empty list vs. empty *selection*: the bucket badges above are unfiltered, so a
                      blank table under non-zero badges must say the filter is what emptied it. */}
                  {agingRows.length === 0 ? <p className="text-center text-muted-foreground p-4">{agingSystem === ACADEMIC_SYSTEM_ALL ? "لا توجد ذمم مدينة مفتوحة" : "لا توجد ذمم مدينة مفتوحة ضمن النظام المحدد"}</p> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>الفاتورة</TableHead><TableHead>الطالب</TableHead><TableHead className="text-center">الرصيد</TableHead><TableHead className="text-center">أيام التأخير</TableHead><TableHead className="text-center">الفئة</TableHead></TableRow></TableHeader>
                      <TableBody>{agingRows.map((r: Any) => <TableRow key={r.number}><TableCell className="font-mono text-xs">{r.number}</TableCell><TableCell>{r.student}</TableCell><TableCell className="text-center font-bold">{n(r.balance)}</TableCell><TableCell className="text-center">{r.daysOverdue}</TableCell><TableCell className="text-center"><Badge variant="outline">{r.bucket}</Badge></TableCell></TableRow>)}</TableBody>
                    </Table>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statement */}
        <TabsContent value="statement">
          <Card>
            <CardHeader><CardTitle>كشف حساب طالب</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 items-end">
                <div><label className="text-xs text-muted-foreground">رقم الطالب</label><Input className="w-44" value={stmtCode} onChange={(e) => setStmtCode(e.target.value)} placeholder="2024-105" /></div>
                <Button onClick={loadStatement} disabled={busy || !stmtCode}>عرض</Button>
              </div>
              {stmt?.report && (
                <div className="space-y-3">
                  <div className="flex gap-4 text-sm font-medium"><span>{stmt.student.name}</span><span>مدين: {n(stmt.report.totals.charged)}</span><span>مسدد: {n(stmt.report.totals.paid)}</span><span>الرصيد: <b>{n(stmt.report.totals.balance)}</b></span></div>
                  <Table>
                    <TableHeader><TableRow><TableHead>المستند</TableHead><TableHead className="text-center">التاريخ</TableHead><TableHead className="text-center">مدين</TableHead><TableHead className="text-center">دائن</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {stmt.report.invoices.map((i: Any) => <TableRow key={i.number}><TableCell className="font-mono text-xs">فاتورة {i.number}</TableCell><TableCell className="text-center">{i.date?.slice(0, 10)}</TableCell><TableCell className="text-center">{n(i.total)}</TableCell><TableCell className="text-center">—</TableCell></TableRow>)}
                      {stmt.report.receipts.map((r: Any) => <TableRow key={r.number}><TableCell className="font-mono text-xs">سند {r.number}</TableCell><TableCell className="text-center">{r.date?.slice(0, 10)}</TableCell><TableCell className="text-center">—</TableCell><TableCell className="text-center text-green-700">{n(r.amount)}</TableCell></TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
