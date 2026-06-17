"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreditCard, CheckCircle2, XCircle, ShieldCheck } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const n = (v: number) => (v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ST: Record<string, string> = { PAID: "bg-green-100 text-green-700", PENDING: "bg-amber-100 text-amber-700", CREATED: "bg-gray-100 text-gray-500", FAILED: "bg-red-100 text-red-700", SUCCESS: "bg-green-100 text-green-700" }

export default function PaymentsPage() {
  const [data, setData] = useState<Any>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { const res = await fetch("/api/institute/finance/payments"); const j = await res.json(); if (!res.ok) throw new Error(j.error); setData(j) }
    catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="w-7 h-7 text-institute-gold" /> الدفع الإلكتروني</h1>
        <p className="text-muted-foreground">بوابة الدفع (Paymob/Fawry) · جلسات الدفع · المعاملات المؤكدة عبر Webhook</p>
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}

      {/* Gateway status */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          {data?.gateway?.configured ? <CheckCircle2 className="w-8 h-8 text-green-600" /> : <XCircle className="w-8 h-8 text-amber-500" />}
          <div>
            <div className="font-bold">{data?.gateway?.configured ? `بوابة الدفع مُفعّلة (${data.gateway.provider})` : "بوابة الدفع غير مُفعّلة"}</div>
            <div className="text-xs text-muted-foreground">
              {data?.gateway?.configured
                ? "يمكن إنشاء جلسات دفع إلكترونية. تُؤكَّد المدفوعات عبر Webhook موقّع ويُسجَّل سند قبض تلقائيًا."
                : "أضِف مفاتيح المزود (PAYMENT_PROVIDER, PAYMOB_API_KEY, PAYMOB_HMAC_SECRET, PAYMOB_INTEGRATION_ID, PAYMOB_IFRAME_ID) في إعدادات Vercel لتفعيلها. حتى ذلك الحين، التحصيل يدوي عبر سندات القبض."}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-institute-blue" /> أحداث Webhook الأخيرة</CardTitle><CardDescription>التحقق من التوقيع ومطابقة المبلغ ومنع التكرار</CardDescription></CardHeader>
        <CardContent>
          {!data?.webhooks?.length ? <p className="p-4 text-center text-muted-foreground">لا توجد أحداث</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>المزود</TableHead><TableHead className="text-center">موثّق</TableHead><TableHead>النتيجة</TableHead><TableHead className="text-center">التاريخ</TableHead></TableRow></TableHeader>
              <TableBody>{data.webhooks.map((w: Any, i: number) => <TableRow key={i}><TableCell>{w.provider}</TableCell><TableCell className="text-center">{w.verified ? "✓" : "✗"}</TableCell><TableCell className="font-mono text-xs">{w.outcome}</TableCell><TableCell className="text-center text-xs">{w.createdAt?.slice(0, 16).replace("T", " ")}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>جلسات الدفع</CardTitle><CardDescription>{data?.intents?.length ?? 0} جلسة</CardDescription></CardHeader>
        <CardContent>
          {!data?.intents?.length ? <p className="p-4 text-center text-muted-foreground">لا توجد جلسات دفع</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>المزود</TableHead><TableHead className="text-center">المبلغ</TableHead><TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">التاريخ</TableHead></TableRow></TableHeader>
              <TableBody>{data.intents.map((i: Any) => <TableRow key={i.id}><TableCell>{i.provider}</TableCell><TableCell className="text-center font-bold">{n(i.amount)}</TableCell><TableCell className="text-center"><Badge className={ST[i.status]}>{i.status}</Badge></TableCell><TableCell className="text-center text-xs">{i.createdAt?.slice(0, 10)}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
