"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileCheck2, CheckCircle2, XCircle, Send, Plus } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const n = (v: number) => (v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ST: Record<string, string> = { VALID: "bg-green-100 text-green-700", SUBMITTED: "bg-blue-100 text-blue-700", DRAFT: "bg-amber-100 text-amber-700", REJECTED: "bg-red-100 text-red-700", CANCELLED: "bg-gray-100 text-gray-500" }

export default function EInvoicePage() {
  const [data, setData] = useState<Any>(null)
  const [rates, setRates] = useState<Any[]>([])
  const [build, setBuild] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [d, r] = await Promise.all([fetch("/api/institute/finance/einvoice"), fetch("/api/institute/finance/tax/rates")])
      if (d.ok) setData(await d.json())
      if (r.ok) setRates((await r.json()).rates ?? [])
    } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  async function act(url: string, body: Any, msg: string) {
    setBusy(true); setError(null); setNotice(null)
    try { const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(j.error || "فشل"); setNotice(msg); await load(); return j }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const buildDoc = async () => { if (!build) return; const r = await act("/api/institute/finance/einvoice", { invoiceId: build }, "تم بناء المستند الضريبي"); if (r?.ok) setBuild("") }
  const submit = (id: string) => act(`/api/institute/finance/einvoice/${id}`, { action: "submit" }, "تم إرسال المستند للمصلحة")
  const cancel = (id: string) => act(`/api/institute/finance/einvoice/${id}`, { action: "cancel" }, "تم إلغاء المستند")
  const seedRates = () => act("/api/institute/finance/tax/rates", { action: "seed-default" }, "تم إنشاء نسب الضرائب الافتراضية")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileCheck2 className="w-7 h-7 text-institute-blue" /> الفاتورة الإلكترونية والضرائب</h1>
        <p className="text-muted-foreground">بناء المستندات الضريبية من الفواتير · ضريبة القيمة المضافة · الإرسال لمصلحة الضرائب المصرية (ETA)</p>
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}
      {notice && <Card><CardContent className="p-4 text-center text-green-700">{notice}</CardContent></Card>}

      {/* ETA status */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          {data?.eta?.configured ? <CheckCircle2 className="w-8 h-8 text-green-600" /> : <XCircle className="w-8 h-8 text-amber-500" />}
          <div>
            <div className="font-bold">{data?.eta?.configured ? "منظومة الفاتورة الإلكترونية مُهيأة" : "منظومة الفاتورة الإلكترونية غير مُهيأة"}</div>
            <div className="text-xs text-muted-foreground">
              {data?.eta?.configured
                ? "يمكن توقيع وإرسال المستندات لمصلحة الضرائب."
                : "بناء المستند وحساب الضريبة يعملان الآن. للإرسال الفعلي أضِف بيانات اعتماد ETA (ETA_CLIENT_ID/SECRET) وشهادة التوقيع (ETA_SIGNING_*) في إعدادات Vercel."}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">المستندات الضريبية</TabsTrigger>
          <TabsTrigger value="rates">نسب الضرائب</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>بناء مستند ضريبي</CardTitle><CardDescription>اختر فاتورة مُصدرة لبناء المستند الضريبي وحساب ضريبة القيمة المضافة.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end">
                <Select value={build} onValueChange={setBuild}>
                  <SelectTrigger className="w-72"><SelectValue placeholder="اختر فاتورة" /></SelectTrigger>
                  <SelectContent>{(data?.buildable ?? []).map((i: Any) => <SelectItem key={i.id} value={i.id}>{i.number} — {i.student} ({n(i.total)})</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={buildDoc} disabled={busy || !build}><Plus className="w-4 h-4 ml-1" /> بناء</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>المستندات</CardTitle><CardDescription>{data?.documents?.length ?? 0} مستند</CardDescription></CardHeader>
            <CardContent>
              {!data?.documents?.length ? <p className="p-6 text-center text-muted-foreground">لا توجد مستندات</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الرقم الداخلي</TableHead><TableHead className="text-center">صافي</TableHead><TableHead className="text-center">ضريبة</TableHead><TableHead className="text-center">الإجمالي</TableHead><TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">إجراء</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.documents.map((d: Any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.internalId}</TableCell>
                        <TableCell className="text-center">{n(d.net)}</TableCell>
                        <TableCell className="text-center">{n(d.vat)}</TableCell>
                        <TableCell className="text-center font-bold">{n(d.total)}</TableCell>
                        <TableCell className="text-center"><Badge className={ST[d.status]}>{d.status}</Badge></TableCell>
                        <TableCell className="text-center">
                          {(d.status === "DRAFT" || d.status === "SIGNED") && (
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" onClick={() => submit(d.id)} disabled={busy}><Send className="w-4 h-4 ml-1" /> إرسال</Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-400" onClick={() => cancel(d.id)} disabled={busy}>إلغاء</Button>
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

        <TabsContent value="rates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>نسب الضرائب</CardTitle><CardDescription>القيمة المضافة والخصم والإضافة</CardDescription></div>
              {rates.length === 0 && <Button size="sm" onClick={seedRates} disabled={busy}><Plus className="w-4 h-4 ml-1" /> نسب افتراضية</Button>}
            </CardHeader>
            <CardContent>
              {rates.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا توجد نسب ضرائب</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">النوع</TableHead><TableHead className="text-center">النسبة %</TableHead></TableRow></TableHeader>
                  <TableBody>{rates.map((r) => <TableRow key={r.id}><TableCell className="font-mono">{r.code}</TableCell><TableCell>{r.nameAr}</TableCell><TableCell className="text-center"><Badge variant="outline">{r.rateType}</Badge></TableCell><TableCell className="text-center font-bold">{r.rate}%</TableCell></TableRow>)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
