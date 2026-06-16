"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileBarChart, Printer } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const n = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function StatementsPage() {
  const [type, setType] = useState("trial-balance")
  const [report, setReport] = useState<Any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (t: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/institute/finance/statements?type=${t}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "فشل")
      setReport(j.report)
    } catch (e) { setError((e as Error).message); setReport(null) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { run(type) }, [type, run])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileBarChart className="w-7 h-7 text-institute-blue" /> القوائم المالية</h1>
          <p className="text-muted-foreground">محسوبة من دفتر الأستاذ (القيود المُرحّلة فقط)</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 ml-2" /> طباعة</Button>
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}

      <Tabs value={type} onValueChange={setType}>
        <TabsList>
          <TabsTrigger value="trial-balance">ميزان المراجعة</TabsTrigger>
          <TabsTrigger value="income-statement">قائمة الدخل</TabsTrigger>
          <TabsTrigger value="balance-sheet">الميزانية العمومية</TabsTrigger>
          <TabsTrigger value="cash-flow">التدفق النقدي</TabsTrigger>
        </TabsList>

        <TabsContent value={type}>
          {loading ? <Card><CardContent className="p-8 text-center text-muted-foreground">جارٍ الحساب...</CardContent></Card> : !report ? null : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {type === "trial-balance" && "ميزان المراجعة"}
                  {type === "income-statement" && "قائمة الدخل"}
                  {type === "balance-sheet" && "الميزانية العمومية"}
                  {type === "cash-flow" && "قائمة التدفق النقدي"}
                </CardTitle>
                {report.totals && (
                  <CardDescription>
                    {type === "trial-balance" && <>مدين {n(report.totals.debit)} · دائن {n(report.totals.credit)} · <Badge className={report.totals.balanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{report.totals.balanced ? "متوازن" : "غير متوازن"}</Badge></>}
                    {type === "income-statement" && <>إيرادات {n(report.totals.revenue)} · مصروفات {n(report.totals.expense)} · صافي {n(report.totals.netIncome)}</>}
                    {type === "balance-sheet" && <>الأصول {n(report.totals.assets)} · الخصوم+حقوق الملكية {n(report.totals.liabilitiesPlusEquity)} · <Badge className={report.totals.balanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{report.totals.balanced ? "متوازنة" : "غير متوازنة"}</Badge></>}
                    {type === "cash-flow" && <>صافي حركة النقدية {n(report.totals.netCashMovement)}</>}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {/* trial balance */}
                {type === "trial-balance" && (
                  <Table>
                    <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الحساب</TableHead><TableHead className="text-center">مدين</TableHead><TableHead className="text-center">دائن</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {report.rows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground p-6">لا توجد قيود مُرحّلة بعد</TableCell></TableRow> :
                        report.rows.map((r: Any) => (
                          <TableRow key={r.code}><TableCell className="font-mono">{r.code}</TableCell><TableCell>{r.name}</TableCell><TableCell className="text-center">{r.debit ? n(r.debit) : "—"}</TableCell><TableCell className="text-center">{r.credit ? n(r.credit) : "—"}</TableCell></TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
                {/* income statement */}
                {type === "income-statement" && (
                  <div className="space-y-4">
                    <Section title="الإيرادات" rows={report.revenue} total={report.totals.revenue} />
                    <Section title="المصروفات" rows={report.expense} total={report.totals.expense} />
                    <div className="flex justify-between font-bold border-t pt-2"><span>صافي الربح/الخسارة</span><span>{n(report.totals.netIncome)}</span></div>
                  </div>
                )}
                {/* balance sheet */}
                {type === "balance-sheet" && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <Section title="الأصول" rows={report.assets} total={report.totals.assets} />
                    <div className="space-y-4">
                      <Section title="الخصوم" rows={report.liabilities} />
                      <Section title="حقوق الملكية" rows={report.equity} />
                      <div className="flex justify-between font-bold border-t pt-2"><span>إجمالي الخصوم وحقوق الملكية</span><span>{n(report.totals.liabilitiesPlusEquity)}</span></div>
                    </div>
                  </div>
                )}
                {/* cash flow */}
                {type === "cash-flow" && (
                  <Table>
                    <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الحساب</TableHead><TableHead className="text-center">داخل</TableHead><TableHead className="text-center">خارج</TableHead><TableHead className="text-center">الصافي</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {report.rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground p-6">لا توجد حركة نقدية</TableCell></TableRow> :
                        report.rows.map((r: Any) => (
                          <TableRow key={r.code}><TableCell className="font-mono">{r.code}</TableCell><TableCell>{r.name}</TableCell><TableCell className="text-center text-green-700">{n(r.inflow)}</TableCell><TableCell className="text-center text-red-700">{n(r.outflow)}</TableCell><TableCell className="text-center font-bold">{n(r.net)}</TableCell></TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Section({ title, rows, total }: { title: string; rows: any[]; total?: number }) {
  return (
    <div>
      <p className="font-medium mb-1">{title}</p>
      <Table>
        <TableBody>
          {rows.length === 0 ? <TableRow><TableCell className="text-muted-foreground text-sm">لا يوجد</TableCell></TableRow> :
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rows.map((r: any, i: number) => (
              <TableRow key={i}><TableCell className="font-mono text-xs w-16">{r.code}</TableCell><TableCell>{r.name}</TableCell><TableCell className="text-center w-32">{n(r.amount)}</TableCell></TableRow>
            ))}
        </TableBody>
      </Table>
      {total !== undefined && <div className="flex justify-between font-semibold text-sm px-2"><span>الإجمالي</span><span>{n(total)}</span></div>}
    </div>
  )
}
