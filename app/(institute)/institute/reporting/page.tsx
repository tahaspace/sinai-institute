"use client"

import { useState, useEffect, useCallback, type CSSProperties } from "react"
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
  const [officialPrint, setOfficialPrint] = useState(false)

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

  // Official ministry export: render the landscape sheet, print (→ Save as PDF), then restore.
  const printOfficial = () => {
    setOfficialPrint(true)
    setTimeout(() => { window.print(); setTimeout(() => setOfficialPrint(false), 300) }, 80)
  }

  const optsFor = (key: string): { value: string; label: string }[] => {
    if (!options) return []
    const map: Record<string, string> = { academicYear: "academicYears", semester: "semesters", facultyId: "faculties", departmentId: "departments", programId: "programs", courseId: "courses", advisorId: "advisors", level: "levels" }
    return options[map[key]] ?? []
  }
  const missingRequired = (active?.requires ?? []).some((r) => !filters[r])

  return (
    <div className="space-y-6">
      <style>{`@media print { .no-print { display: none !important; } .print-sheet { border: none !important; box-shadow: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } } .official-doc { display: none; }`}</style>
      {officialPrint && <style>{`@page { size: A4 landscape; margin: 8mm; } @media print { body * { visibility: hidden !important; } .official-doc, .official-doc * { visibility: visible !important; } .official-doc { position: absolute; inset: 0; display: block !important; } }`}</style>}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-7 h-7 text-institute-blue" /> التقارير والتحليلات</h1>
          <p className="text-muted-foreground">مركز التقارير — كشوف الوزارة وشؤون الطلاب والنتائج والمالية والتحليلات</p>
        </div>
        <div className="flex gap-2">
          {result?.meta?.ministrySheet && <Button onClick={printOfficial}><Printer className="w-4 h-4 ml-2" /> طباعة رسمية (للوزارة)</Button>}
          {result && <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 ml-2" /> طباعة</Button>}
        </div>
      </div>
      {officialPrint && result?.meta?.ministrySheet && <MinistrySheet result={result} />}
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
        {Array.isArray(result.meta?.stats) && result.meta.stats.length > 0 && (
          <div className="px-6 py-3 border-b flex flex-wrap gap-3">
            {result.meta.stats.map((s: Any, i: number) => (
              <div key={i} className="border rounded px-3 py-1.5 text-center min-w-[90px]"><div className="text-xs text-muted-foreground">{s.label}</div><div className="font-bold">{String(s.value)}</div></div>
            ))}
          </div>
        )}
        {result.meta?.transcript ? (
          <TranscriptView t={result.meta.transcript} />
        ) : (
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
        )}
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

// Dedicated academic-transcript layout (بيان حالة) — per-term sections + six-figure term footer,
// matching the ministry/Mansoura sheet. Falls back to the generic table for non-transcript sheets.
function TranscriptView({ t }: { t: Any }) {
  return (
    <div className="px-4 py-3 space-y-4">
      {t.terms.map((term: Any, i: number) => (
        <div key={i} className="border rounded overflow-hidden">
          <div className="bg-muted px-3 py-1.5 font-bold text-sm">{term.label}</div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>كود المقرر</TableHead><TableHead>اسم المقرر</TableHead>
                <TableHead className="text-center">الساعات</TableHead><TableHead className="text-center">الدرجة</TableHead>
                <TableHead className="text-center">النقاط</TableHead><TableHead className="text-center">التقدير</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {term.courses.map((c: Any, j: number) => (
                  <TableRow key={j}><TableCell className="font-mono">{c.code}</TableCell><TableCell>{c.name}</TableCell>
                    <TableCell className="text-center">{c.hours}</TableCell><TableCell className="text-center">{c.score}</TableCell>
                    <TableCell className="text-center font-mono">{c.points}</TableCell><TableCell className="text-center">{c.grade}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="bg-muted/40 px-3 py-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs justify-center">
            <span>المعدل الفصلي: <b>{term.footer.termGpa}</b></span>
            <span>المعدل التراكمي: <b>{term.footer.cumulativeGpa}</b></span>
            <span>الساعات المسجلة: <b>{term.footer.registeredHours}</b></span>
            <span>الساعات الحاصل عليها: <b>{term.footer.earnedHours}</b></span>
            <span>نقاط الجودة الفصلية: <b>{term.footer.qualityPoints}</b></span>
            <span>النقاط الفصلية: <b>{term.footer.termPoints}</b></span>
          </div>
        </div>
      ))}
      <div className="border-2 rounded px-3 py-2 flex flex-wrap gap-x-6 gap-y-1 text-sm justify-center font-semibold">
        <span>المعدل التراكمي النهائي: <b>{t.summary.cgpa}</b></span>
        <span>الساعات المكتسبة: <b>{t.summary.earnedHours}</b></span>
        <span>التقدير العام: <b>{t.summary.grade}</b></span>
      </div>
    </div>
  )
}

// Official ministry export layout (landscape, print-only) — letterhead + full students×courses
// matrix + grade-distribution box + signature/approval lines, matching the client's PDF sheets.
// Inline styles so the printed output is deterministic regardless of Tailwind/print quirks.
function MinistrySheet({ result }: { result: Any }) {
  const cols = result.columns ?? []
  const sigs: string[] = result.meta?.ministrySheet?.signatures ?? []
  const stats: Any[] = Array.isArray(result.meta?.stats) ? result.meta.stats : []
  const cell = (align: string, bold = false): CSSProperties => ({ border: "1px solid #333", padding: "2px 4px", textAlign: align === "center" ? "center" : "right", fontWeight: bold ? "bold" : "normal" })
  return (
    <div className="official-doc" dir="rtl" style={{ padding: "3mm", color: "#000", fontSize: "10px" }}>
      <div style={{ textAlign: "center", marginBottom: "6px" }}>
        {result.header?.["المعهد"] && <div style={{ fontWeight: "bold", fontSize: "15px" }}>{result.header["المعهد"]}</div>}
        {result.title && <div style={{ fontWeight: "bold", fontSize: "12px", marginTop: "2px" }}>{result.title}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "14px", fontSize: "11px", marginTop: "3px" }}>
          {Object.entries(result.header ?? {}).filter(([k]) => k !== "المعهد").map(([k, v]: Any) => <span key={k}>{k}: <b>{String(v)}</b></span>)}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{cols.map((c: Any) => <th key={c.key} style={{ ...cell("center", true), background: "#e5e7eb" }}>{c.label}</th>)}</tr></thead>
        <tbody>
          {(result.rows ?? []).map((r: Any, i: number) => <tr key={i}>{cols.map((c: Any) => <td key={c.key} style={cell(c.align)}>{String(r[c.key] ?? "")}</td>)}</tr>)}
          {result.totals && <tr>{cols.map((c: Any) => <td key={c.key} style={cell(c.align, true)}>{result.totals[c.key] != null ? String(result.totals[c.key]) : ""}</td>)}</tr>}
        </tbody>
      </table>
      {stats.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px", fontSize: "10px" }}>{stats.map((s: Any, i: number) => <span key={i} style={{ border: "1px solid #333", padding: "2px 6px" }}>{s.label}: <b>{String(s.value)}</b></span>)}</div>}
      {Array.isArray(result.footer) && result.footer.length > 0 && <div style={{ marginTop: "6px", fontSize: "9px" }}>مفتاح التقديرات: {result.footer.map((g: Any) => `${g.code}=${g.name} (${g.points})`).join(" · ")}</div>}
      <div style={{ display: "flex", justifyContent: "space-around", marginTop: "26px", fontSize: "11px" }}>
        {sigs.map((s: string, i: number) => <div key={i} style={{ textAlign: "center" }}><div>{s}</div><div style={{ marginTop: "30px", borderTop: "1px solid #333", width: "150px" }} /></div>)}
      </div>
    </div>
  )
}
