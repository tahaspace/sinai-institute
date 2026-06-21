"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, Printer, Download, Play, FolderTree } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
interface RepMeta { id: string; nameAr: string; description?: string; filters: string[]; requires?: string[] }
interface Cat { category: string; label: string; reports: RepMeta[] }

const FILTER_LABEL: Record<string, string> = { academicYear: "السنة الدراسية", semester: "الفصل", facultyId: "الكلية", departmentId: "القسم", programId: "البرنامج", level: "المستوى", courseId: "المقرر", advisorId: "المرشد", instructorId: "الدكتور", studentCode: "رقم الطالب", dateFrom: "من تاريخ", dateTo: "إلى تاريخ", status: "الحالة", qualification: "المؤهل" }

export default function ReportingHub() {
  const [catalogue, setCatalogue] = useState<Cat[]>([])
  const [options, setOptions] = useState<Any>(null)
  const [active, setActive] = useState<RepMeta | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [result, setResult] = useState<Any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/institute/reporting")
        const j = await res.json(); if (!res.ok) throw new Error(j.error)
        setCatalogue(j.catalogue ?? []); setOptions(j.options ?? {})
      } catch (e) { setError((e as Error).message) }
    })()
  }, [])

  const pick = (r: RepMeta) => { setActive(r); setFilters({}); setResult(null); setError(null) }

  const run = useCallback(async (rep: RepMeta, f: Record<string, string>) => {
    setLoading(true); setError(null)
    try {
      const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v))
      const res = await fetch(`/api/institute/reporting/${rep.id}?${qs}`)
      const j = await res.json(); if (!res.ok) throw new Error(j.error || "فشل")
      setResult(j.result)
    } catch (e) { setError((e as Error).message); setResult(null) }
    finally { setLoading(false) }
  }, [])

  const exportAs = (format: "csv" | "xlsx") => {
    if (!active) return
    const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), format })
    window.open(`/api/institute/reporting/${active.id}?${qs}`, "_blank")
  }

  const optsFor = (key: string): { value: string; label: string }[] => {
    if (!options) return []
    const map: Record<string, string> = { academicYear: "academicYears", semester: "semesters", facultyId: "faculties", departmentId: "departments", programId: "programs", courseId: "courses", advisorId: "advisors", level: "levels" }
    return options[map[key]] ?? []
  }
  const missingRequired = (active?.requires ?? []).some((r) => !filters[r])

  return (
    <div className="space-y-6">
      <style>{`@media print { .no-print { display: none !important; } .print-sheet { border: none !important; box-shadow: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-7 h-7 text-institute-blue" /> التقارير والتحليلات</h1>
          <p className="text-muted-foreground">مركز التقارير — كشوف الوزارة وشؤون الطلاب والنتائج والمالية والتحليلات</p>
        </div>
        {result && <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 ml-2" /> طباعة</Button>}
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}

      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        {/* category tree */}
        <Card className="h-fit no-print">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FolderTree className="w-4 h-4" /> أنواع التقارير</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {catalogue.length === 0 ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p> : catalogue.map((cat) => (
              <div key={cat.category}>
                <div className="text-xs font-semibold text-muted-foreground mb-1">{cat.label} <Badge variant="outline" className="ml-1">{cat.reports.length}</Badge></div>
                <div className="space-y-0.5">
                  {cat.reports.map((r) => (
                    <button key={r.id} onClick={() => pick(r)} className={`block w-full text-right text-sm rounded px-2 py-1 hover:bg-muted ${active?.id === r.id ? "bg-muted font-medium" : ""}`}>{r.nameAr}</button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* report panel */}
        <div className="space-y-4">
          {!active ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">اختر تقريرًا من القائمة</CardContent></Card>
          ) : (
            <>
              <Card className="no-print">
                <CardHeader><CardTitle>{active.nameAr}</CardTitle>{active.description && <CardDescription>{active.description}</CardDescription>}</CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 items-end">
                    {active.filters.map((key) => (
                      <div key={key}>
                        <label className="text-xs text-muted-foreground">{FILTER_LABEL[key] ?? key}{active.requires?.includes(key) && <span className="text-red-500"> *</span>}</label>
                        {["dateFrom", "dateTo"].includes(key) ? (
                          <Input type="date" className="w-36" value={filters[key] ?? ""} onChange={(e) => setFilters((p) => ({ ...p, [key]: e.target.value }))} />
                        ) : ["studentCode", "status", "qualification"].includes(key) ? (
                          <Input className="w-40" value={filters[key] ?? ""} onChange={(e) => setFilters((p) => ({ ...p, [key]: e.target.value }))} />
                        ) : (
                          <Select value={filters[key] ?? ""} onValueChange={(v) => setFilters((p) => ({ ...p, [key]: v }))}>
                            <SelectTrigger className="w-44"><SelectValue placeholder="الكل" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">الكل</SelectItem>
                              {optsFor(key).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                    <Button onClick={() => run(active, filters)} disabled={loading || missingRequired}><Play className="w-4 h-4 ml-1" /> عرض</Button>
                    {result && <Button variant="outline" onClick={() => exportAs("csv")}><Download className="w-4 h-4 ml-1" /> تصدير CSV</Button>}
                    {result && <Button variant="outline" onClick={() => exportAs("xlsx")}><Download className="w-4 h-4 ml-1" /> تصدير Excel</Button>}
                  </div>
                  {missingRequired && <p className="text-xs text-amber-600 mt-2">يجب تحديد الفلاتر المطلوبة (*)</p>}
                </CardContent>
              </Card>

              {loading ? <Card><CardContent className="p-8 text-center text-muted-foreground">جارٍ التشغيل…</CardContent></Card> : result && <ResultView result={result} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultView({ result }: { result: Any }) {
  if (result.kind === "kpi") {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{result.cards.map((c: Any) => <Card key={c.key}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{c.label}</div><div className="text-xl font-bold">{c.value}{c.unit ? ` ${c.unit}` : ""}</div></CardContent></Card>)}</div>
  }
  const cols = result.columns ?? []
  const isSheet = result.kind === "sheet"
  return (
    <Card className="print-sheet">
      <CardContent className="p-0">
        {isSheet && (result.title || result.header) && (
          <div className="px-6 pt-6 pb-3 text-center border-b">
            {result.title && <h2 className="text-lg font-bold">{result.title}</h2>}
            {result.header && (
              <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm">
                {Object.entries(result.header).map(([k, v]: Any) => (
                  <span key={k}><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{String(v)}</span></span>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="overflow-x-auto">
          {(!result.rows || result.rows.length === 0) ? <p className="p-8 text-center text-muted-foreground">لا توجد بيانات</p> : (
            <Table>
              <TableHeader><TableRow>{cols.map((c: Any) => <TableHead key={c.key} className={c.align === "center" ? "text-center" : ""}>{c.label}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {result.rows.map((row: Any, i: number) => (
                  <TableRow key={i}>{cols.map((c: Any) => <TableCell key={c.key} className={`${c.align === "center" ? "text-center" : ""} ${c.numeric ? "font-mono" : ""}`}>{String(row[c.key] ?? "—")}</TableCell>)}</TableRow>
                ))}
                {result.totals && <TableRow className="bg-muted/50 font-bold">{cols.map((c: Any) => <TableCell key={c.key} className={c.align === "center" ? "text-center" : ""}>{result.totals[c.key] != null ? String(result.totals[c.key]) : ""}</TableCell>)}</TableRow>}
              </TableBody>
            </Table>
          )}
        </div>
        {isSheet && Array.isArray(result.footer) && result.footer.length > 0 && (
          <div className="px-6 py-4 border-t">
            <div className="text-sm font-semibold mb-2">مفتاح التقديرات</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {result.footer.map((g: Any, i: number) => (
                <span key={i} className="border rounded px-2 py-1"><b>{String(g.code)}</b> {String(g.name)} — {String(g.points)}{g.minPercent && g.minPercent !== "—" ? ` (${g.minPercent}+)` : ""}</span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
