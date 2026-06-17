"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Plus, CheckCircle2, Banknote, ReceiptText } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const n = (v: number) => (v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ST: Record<string, string> = { PAID: "bg-green-100 text-green-700", APPROVED: "bg-blue-100 text-blue-700", DRAFT: "bg-amber-100 text-amber-700", PENDING: "bg-amber-100 text-amber-700", REJECTED: "bg-red-100 text-red-700", VOID: "bg-gray-100 text-gray-500" }

export default function AccountsPayablePage() {
  const [vendors, setVendors] = useState<Any[]>([])
  const [bills, setBills] = useState<Any[]>([])
  const [claims, setClaims] = useState<Any[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [nv, setNv] = useState({ code: "", nameAr: "", withholdingRate: "" })
  const [nb, setNb] = useState({ vendorId: "", description: "", amount: "", accountCode: "5900" })
  const [nc, setNc] = useState({ claimantName: "", description: "", amount: "" })

  const load = useCallback(async () => {
    setError(null)
    try {
      const [v, b, c] = await Promise.all([fetch("/api/institute/finance/ap/vendors"), fetch("/api/institute/finance/ap/bills"), fetch("/api/institute/finance/ap/expenses")])
      if (v.ok) setVendors((await v.json()).vendors ?? [])
      if (b.ok) setBills((await b.json()).bills ?? [])
      if (c.ok) setClaims((await c.json()).claims ?? [])
    } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  async function act(url: string, opts: RequestInit, msg: string) {
    setBusy(true); setError(null); setNotice(null)
    try {
      const res = await fetch(url, opts); const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "فشل الإجراء")
      setNotice(msg); await load(); return j
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const J = (b: Any) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) })

  const addVendor = async () => { if (!nv.code || !nv.nameAr) return; const r = await act("/api/institute/finance/ap/vendors", J({ ...nv, withholdingRate: Number(nv.withholdingRate) || 0 }), "تم إضافة المورد"); if (r?.ok) setNv({ code: "", nameAr: "", withholdingRate: "" }) }
  const addBill = async () => { if (!nb.vendorId || !nb.amount) return; const r = await act("/api/institute/finance/ap/bills", J({ vendorId: nb.vendorId, lines: [{ description: nb.description || "مصروف", amount: Number(nb.amount), accountCode: nb.accountCode }] }), "تم إنشاء فاتورة المورد"); if (r?.ok) setNb({ vendorId: "", description: "", amount: "", accountCode: "5900" }) }
  const billAction = (id: string, action: string) => act(`/api/institute/finance/ap/bills/${id}`, J({ action }), action === "pay" ? "تم سداد الفاتورة" : "تم اعتماد الفاتورة")
  const addClaim = async () => { if (!nc.claimantName || !nc.amount) return; const r = await act("/api/institute/finance/ap/expenses", J({ ...nc, amount: Number(nc.amount) }), "تم تسجيل طلب المصروف"); if (r?.ok) setNc({ claimantName: "", description: "", amount: "" }) }
  const decide = (id: string, action: string) => act("/api/institute/finance/ap/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) }, action === "approve" ? "تم الاعتماد والصرف" : "تم الرفض")

  const EXP = [["5100", "رواتب"], ["5200", "مرافق"], ["5300", "صيانة"], ["5400", "مستلزمات"], ["5900", "أخرى"]]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-7 h-7 text-institute-blue" /> الموردون والمصروفات</h1>
        <p className="text-muted-foreground">فواتير الموردين · طلبات المصروفات · اعتماد وصرف — مرحّلة محاسبيًا (مدين مصروف / دائن دائنون-بنك)</p>
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}
      {notice && <Card><CardContent className="p-4 text-center text-green-700">{notice}</CardContent></Card>}

      <Tabs defaultValue="bills">
        <TabsList>
          <TabsTrigger value="bills"><ReceiptText className="w-4 h-4 ml-1" /> فواتير الموردين</TabsTrigger>
          <TabsTrigger value="expenses">طلبات المصروفات</TabsTrigger>
          <TabsTrigger value="vendors">الموردون</TabsTrigger>
        </TabsList>

        {/* Bills */}
        <TabsContent value="bills" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>فاتورة مورد جديدة</CardTitle><CardDescription>تُنشأ كمسودة، ثم تُعتمد (ترحيل مدين مصروف / دائن دائنون) وتُسدَّد.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 items-end">
                <div><label className="text-xs text-muted-foreground">المورد</label>
                  <Select value={nb.vendorId} onValueChange={(v) => setNb((p) => ({ ...p, vendorId: v }))}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                    <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.code} — {v.nameAr}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-40"><label className="text-xs text-muted-foreground">البيان</label><Input value={nb.description} onChange={(e) => setNb((p) => ({ ...p, description: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground">حساب المصروف</label>
                  <Select value={nb.accountCode} onValueChange={(v) => setNb((p) => ({ ...p, accountCode: v }))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{EXP.map(([c, l]) => <SelectItem key={c} value={c}>{c} {l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs text-muted-foreground">المبلغ</label><Input type="number" className="w-28" value={nb.amount} onChange={(e) => setNb((p) => ({ ...p, amount: e.target.value }))} /></div>
                <Button onClick={addBill} disabled={busy || !nb.vendorId || !nb.amount}><Plus className="w-4 h-4 ml-1" /> إنشاء</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>فواتير الموردين</CardTitle><CardDescription>{bills.length} فاتورة</CardDescription></CardHeader>
            <CardContent>
              {bills.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا توجد فواتير</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>رقم</TableHead><TableHead>المورد</TableHead><TableHead className="text-center">الإجمالي</TableHead><TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">إجراء</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {bills.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.number}</TableCell>
                        <TableCell>{b.vendor}</TableCell>
                        <TableCell className="text-center font-bold">{n(b.total)}</TableCell>
                        <TableCell className="text-center"><Badge className={ST[b.status]}>{b.status}</Badge></TableCell>
                        <TableCell className="text-center">
                          {b.status === "DRAFT" && <Button size="sm" onClick={() => billAction(b.id, "approve")} disabled={busy}><CheckCircle2 className="w-4 h-4 ml-1" /> اعتماد</Button>}
                          {b.status === "APPROVED" && <Button size="sm" variant="outline" onClick={() => billAction(b.id, "pay")} disabled={busy}><Banknote className="w-4 h-4 ml-1" /> سداد</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense claims */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>طلب مصروف جديد</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 items-end">
                <div><label className="text-xs text-muted-foreground">مقدم الطلب</label><Input className="w-40" value={nc.claimantName} onChange={(e) => setNc((p) => ({ ...p, claimantName: e.target.value }))} /></div>
                <div className="flex-1 min-w-40"><label className="text-xs text-muted-foreground">الوصف</label><Input value={nc.description} onChange={(e) => setNc((p) => ({ ...p, description: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground">المبلغ</label><Input type="number" className="w-28" value={nc.amount} onChange={(e) => setNc((p) => ({ ...p, amount: e.target.value }))} /></div>
                <Button onClick={addClaim} disabled={busy || !nc.claimantName || !nc.amount}><Plus className="w-4 h-4 ml-1" /> تسجيل</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>طلبات المصروفات</CardTitle><CardDescription>{claims.length} طلب</CardDescription></CardHeader>
            <CardContent>
              {claims.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا توجد طلبات</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>مقدم الطلب</TableHead><TableHead>الوصف</TableHead><TableHead className="text-center">المبلغ</TableHead><TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">قرار</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {claims.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.claimantName}</TableCell>
                        <TableCell>{c.description}</TableCell>
                        <TableCell className="text-center font-bold">{n(c.amount)}</TableCell>
                        <TableCell className="text-center"><Badge className={ST[c.status]}>{c.status}</Badge></TableCell>
                        <TableCell className="text-center">
                          {c.status === "PENDING" && (
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="outline" className="text-green-700 border-green-600" onClick={() => decide(c.id, "approve")} disabled={busy}>اعتماد وصرف</Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-500" onClick={() => decide(c.id, "reject")} disabled={busy}>رفض</Button>
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

        {/* Vendors */}
        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>مورد جديد</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 items-end">
                <div><label className="text-xs text-muted-foreground">الكود</label><Input className="w-32" value={nv.code} onChange={(e) => setNv((p) => ({ ...p, code: e.target.value }))} /></div>
                <div className="flex-1 min-w-40"><label className="text-xs text-muted-foreground">الاسم</label><Input value={nv.nameAr} onChange={(e) => setNv((p) => ({ ...p, nameAr: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground">نسبة الخصم %</label><Input type="number" className="w-24" value={nv.withholdingRate} onChange={(e) => setNv((p) => ({ ...p, withholdingRate: e.target.value }))} /></div>
                <Button onClick={addVendor} disabled={busy || !nv.code || !nv.nameAr}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>الموردون</CardTitle><CardDescription>{vendors.length} مورد</CardDescription></CardHeader>
            <CardContent>
              {vendors.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا يوجد موردون</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">خصم %</TableHead></TableRow></TableHeader>
                  <TableBody>{vendors.map((v) => <TableRow key={v.id}><TableCell className="font-mono">{v.code}</TableCell><TableCell>{v.nameAr}</TableCell><TableCell className="text-center">{v.withholdingRate}%</TableCell></TableRow>)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
