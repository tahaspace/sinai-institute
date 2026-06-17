"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Landmark, ArrowLeftRight, CheckCircle2, PiggyBank, BarChart3 } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const n = (v: number) => (v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function TreasuryPage() {
  const [tr, setTr] = useState<Any>({ accounts: [], transfers: [], reconciliations: [] })
  const [budgets, setBudgets] = useState<Any[]>([])
  const [bva, setBva] = useState<Any>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [xfer, setXfer] = useState({ from: "", to: "", amount: "" })
  const [rec, setRec] = useState({ account: "", date: new Date().toISOString().slice(0, 10), balance: "" })

  const load = useCallback(async () => {
    setError(null)
    try {
      const [t, b] = await Promise.all([fetch("/api/institute/finance/treasury"), fetch("/api/institute/finance/budgets")])
      if (t.ok) setTr(await t.json())
      if (b.ok) setBudgets((await b.json()).budgets ?? [])
    } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  async function act(url: string, body: Any, msg: string) {
    setBusy(true); setError(null); setNotice(null)
    try { const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(j.error || "فشل"); setNotice(msg); await load(); return j }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const doXfer = async () => { if (!xfer.from || !xfer.to || !xfer.amount) return; const r = await act("/api/institute/finance/treasury", { action: "transfer", fromAccountCode: xfer.from, toAccountCode: xfer.to, amount: Number(xfer.amount) }, "تم التحويل"); if (r?.ok) setXfer({ from: "", to: "", amount: "" }) }
  const doRec = async () => { if (!rec.account || !rec.balance) return; const r = await act("/api/institute/finance/treasury", { action: "reconcile", accountCode: rec.account, statementDate: rec.date, statementBalance: Number(rec.balance) }, "تمت التسوية"); if (r?.ok) setRec({ account: "", date: rec.date, balance: "" }) }
  const viewBva = async (id: string) => { setBusy(true); try { const res = await fetch(`/api/institute/finance/budgets/${id}`); const j = await res.json(); if (res.ok) setBva(j.report) } finally { setBusy(false) } }

  const accs = tr.accounts as Any[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Landmark className="w-7 h-7 text-institute-blue" /> الخزينة والموازنات</h1>
        <p className="text-muted-foreground">أرصدة النقدية والبنوك · التحويلات · تسوية البنوك · الموازنة مقابل الفعلي</p>
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}
      {notice && <Card><CardContent className="p-4 text-center text-green-700">{notice}</CardContent></Card>}

      <Tabs defaultValue="treasury">
        <TabsList>
          <TabsTrigger value="treasury"><PiggyBank className="w-4 h-4 ml-1" /> الخزينة</TabsTrigger>
          <TabsTrigger value="budgets"><BarChart3 className="w-4 h-4 ml-1" /> الموازنات</TabsTrigger>
        </TabsList>

        <TabsContent value="treasury" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {accs.map((a) => <Card key={a.code}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{a.code} {a.name}</div><div className="text-xl font-bold">{n(a.balance)}</div></CardContent></Card>)}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">تحويل بين الحسابات</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2 items-end">
                <Select value={xfer.from} onValueChange={(v) => setXfer((p) => ({ ...p, from: v }))}><SelectTrigger className="w-28"><SelectValue placeholder="من" /></SelectTrigger><SelectContent>{accs.map((a) => <SelectItem key={a.code} value={a.code}>{a.code}</SelectItem>)}</SelectContent></Select>
                <ArrowLeftRight className="w-4 h-4 mb-2" />
                <Select value={xfer.to} onValueChange={(v) => setXfer((p) => ({ ...p, to: v }))}><SelectTrigger className="w-28"><SelectValue placeholder="إلى" /></SelectTrigger><SelectContent>{accs.map((a) => <SelectItem key={a.code} value={a.code}>{a.code}</SelectItem>)}</SelectContent></Select>
                <Input type="number" className="w-28" placeholder="مبلغ" value={xfer.amount} onChange={(e) => setXfer((p) => ({ ...p, amount: e.target.value }))} />
                <Button onClick={doXfer} disabled={busy || !xfer.from || !xfer.to || !xfer.amount}>تحويل</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">تسوية بنكية</CardTitle><CardDescription>رصيد الكشف مقابل رصيد الدفاتر</CardDescription></CardHeader>
              <CardContent className="flex flex-wrap gap-2 items-end">
                <Select value={rec.account} onValueChange={(v) => setRec((p) => ({ ...p, account: v }))}><SelectTrigger className="w-28"><SelectValue placeholder="الحساب" /></SelectTrigger><SelectContent>{accs.map((a) => <SelectItem key={a.code} value={a.code}>{a.code}</SelectItem>)}</SelectContent></Select>
                <Input type="date" className="w-36" value={rec.date} onChange={(e) => setRec((p) => ({ ...p, date: e.target.value }))} />
                <Input type="number" className="w-28" placeholder="رصيد الكشف" value={rec.balance} onChange={(e) => setRec((p) => ({ ...p, balance: e.target.value }))} />
                <Button onClick={doRec} disabled={busy || !rec.account || !rec.balance}><CheckCircle2 className="w-4 h-4 ml-1" /> تسوية</Button>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">آخر التسويات</CardTitle></CardHeader>
            <CardContent>
              {tr.reconciliations.length === 0 ? <p className="text-center text-muted-foreground p-4">لا توجد تسويات</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الحساب</TableHead><TableHead className="text-center">التاريخ</TableHead><TableHead className="text-center">رصيد الكشف</TableHead><TableHead className="text-center">رصيد الدفاتر</TableHead><TableHead className="text-center">الفرق</TableHead><TableHead className="text-center">الحالة</TableHead></TableRow></TableHeader>
                  <TableBody>{tr.reconciliations.map((r: Any, i: number) => <TableRow key={i}><TableCell className="font-mono">{r.account}</TableCell><TableCell className="text-center">{r.statementDate?.slice(0, 10)}</TableCell><TableCell className="text-center">{n(r.statementBalance)}</TableCell><TableCell className="text-center">{n(r.glBalance)}</TableCell><TableCell className="text-center font-bold">{n(r.difference)}</TableCell><TableCell className="text-center"><Badge className={r.status === "RECONCILED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{r.status === "RECONCILED" ? "مطابقة" : "فروقات"}</Badge></TableCell></TableRow>)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>الموازنات</CardTitle><CardDescription>{budgets.length} موازنة — أنشئها عبر <code>POST /budgets</code> {`{name, fiscalCode, lines:[{accountCode, amount}]}`}</CardDescription></CardHeader>
            <CardContent>
              {budgets.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا توجد موازنات</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead className="text-center">السنة</TableHead><TableHead className="text-center">البنود</TableHead><TableHead className="text-center">الإجمالي</TableHead><TableHead className="text-center">عرض</TableHead></TableRow></TableHeader>
                  <TableBody>{budgets.map((b) => <TableRow key={b.id}><TableCell>{b.name}</TableCell><TableCell className="text-center">{b.fiscalCode}</TableCell><TableCell className="text-center">{b.lineCount}</TableCell><TableCell className="text-center font-bold">{n(b.total)}</TableCell><TableCell className="text-center"><Button size="sm" variant="outline" onClick={() => viewBva(b.id)} disabled={busy}>الموازنة مقابل الفعلي</Button></TableCell></TableRow>)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {bva && (
            <Card>
              <CardHeader><CardTitle>{bva.name} — الموازنة مقابل الفعلي</CardTitle><CardDescription>موازنة {n(bva.totals.budget)} · فعلي {n(bva.totals.actual)} · فرق {n(bva.totals.variance)}</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>الحساب</TableHead><TableHead className="text-center">الموازنة</TableHead><TableHead className="text-center">الفعلي</TableHead><TableHead className="text-center">الفرق</TableHead><TableHead className="text-center">المنفذ %</TableHead></TableRow></TableHeader>
                  <TableBody>{bva.rows.map((r: Any) => <TableRow key={r.accountCode}><TableCell className="font-mono text-xs">{r.accountCode} {r.accountName}</TableCell><TableCell className="text-center">{n(r.budget)}</TableCell><TableCell className="text-center">{n(r.actual)}</TableCell><TableCell className={`text-center font-bold ${r.variance < 0 ? "text-red-600" : "text-green-700"}`}>{n(r.variance)}</TableCell><TableCell className="text-center"><Badge variant="outline" className={r.usedPct > 100 ? "border-red-500 text-red-600" : ""}>{r.usedPct}%</Badge></TableCell></TableRow>)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
