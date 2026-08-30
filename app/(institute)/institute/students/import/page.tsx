"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle } from "lucide-react"

type Opt = { id: string; name: string }
type PreviewRow = { row: number; data: Record<string, string>; errors: string[] }

export default function ImportStudentsPage() {
  const [programs, setPrograms] = useState<Opt[]>([])
  const [years, setYears] = useState<string[]>([])
  const [form, setForm] = useState({ academicYear: "", semester: "first", programId: "all", level: "1" })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ rows: PreviewRow[]; total: number; validCount: number; errorCount: number } | null>(null)
  const [result, setResult] = useState<{ imported: number; failed: number; errors: { row: number; error: string }[] } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadOpts = useCallback(async () => {
    try {
      const [p, y] = await Promise.all([fetch("/api/institute/programs"), fetch("/api/institute/academic-years")])
      if (p.ok) { const j = await p.json(); setPrograms((j.programs ?? []).map((x: Record<string, string>) => ({ id: x.id, name: x.nameAr ?? x.id }))) }
      if (y.ok) { const j = await y.json(); setYears(j.years ?? []); setForm((f) => ({ ...f, academicYear: f.academicYear || j.current || (j.years ?? [])[0] || "" })) }
    } catch { /* optional */ }
  }, [])
  useEffect(() => { loadOpts() }, [loadOpts])

  const cohortReady = form.academicYear.trim() !== ""

  async function send(action: "preview" | "commit") {
    if (!file) { setError("يرجى اختيار ملف Excel/CSV"); return }
    setBusy(action); setError(null)
    try {
      const fd = new FormData()
      fd.set("file", file); fd.set("action", action)
      fd.set("academicYear", form.academicYear); fd.set("semester", form.semester); fd.set("level", form.level)
      if (form.programId !== "all") fd.set("programId", form.programId)
      const res = await fetch("/api/institute/students/import", { method: "POST", body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "فشل العملية")
      if (action === "preview") { setPreview(j); setResult(null) }
      else { setResult(j); setPreview(null) }
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><UploadCloud className="w-7 h-7 text-institute-blue" /> استيراد الطلاب الجدد</h1>
        <p className="text-muted-foreground">رفع ملف Excel/CSV بالطلاب المقبولين وربطهم بالعام والبرنامج والمستوى والفصل، مع إنشاء الحساب المالي والسجل الأكاديمي تلقائيًا.</p>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600 flex items-center justify-between"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => setError(null)}>إغلاق</Button></CardContent></Card>}

      {/* Step 1 — cohort */}
      <Card>
        <CardHeader><CardTitle>١) بيانات الدفعة</CardTitle><CardDescription>يُربط كل الطلاب في الملف بهذه الاختيارات</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label className="mb-1 block">العام الأكاديمي</Label>
            <Select value={form.academicYear} onValueChange={(v) => setForm({ ...form, academicYear: v })}>
              <SelectTrigger><SelectValue placeholder="اختر السنة" /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="mb-1 block">البرنامج</Label>
            <Select value={form.programId} onValueChange={(v) => setForm({ ...form, programId: v })}>
              <SelectTrigger><SelectValue placeholder="البرنامج" /></SelectTrigger>
              <SelectContent><SelectItem value="all">— بدون تحديد —</SelectItem>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="mb-1 block">المستوى</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>المستوى {n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="mb-1 block">الفصل الدراسي</Label>
            <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="first">الأول</SelectItem><SelectItem value="second">الثاني</SelectItem><SelectItem value="summer">الصيفي</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — file */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>٢) ملف البيانات</CardTitle><CardDescription>الأعمدة كما في القالب — Excel (.xlsx) أو CSV</CardDescription></div>
          <Button variant="outline" onClick={() => { const a = document.createElement("a"); a.href = "/api/institute/students/import/template"; a.click() }}><Download className="w-4 h-4 ml-2" /> تحميل القالب</Button>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setResult(null) }} className="max-w-sm" />
          {file && <span className="text-sm text-muted-foreground flex items-center gap-1"><FileSpreadsheet className="w-4 h-4" /> {file.name}</span>}
          <div className="flex gap-2 md:mr-auto">
            <Button variant="secondary" disabled={!file || busy !== null} onClick={() => send("preview")}>معاينة والتحقق</Button>
            <Button disabled={!file || !preview || preview.validCount === 0 || !cohortReady || busy !== null} onClick={() => send("commit")}>استيراد البيانات ({preview?.validCount ?? 0})</Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-r-4 border-r-green-500 bg-green-50/50">
          <CardContent className="p-4">
            <p className="font-bold text-green-800 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> تم الاستيراد: {result.imported} طالب{result.failed ? ` — فشل ${result.failed}` : ""}</p>
            {result.errors.length > 0 && <ul className="mt-2 text-sm text-red-700 list-disc pr-6">{result.errors.slice(0, 10).map((e, i) => <li key={i}>صف {e.row}: {e.error}</li>)}</ul>}
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">معاينة البيانات
              <Badge className="bg-green-100 text-green-700">صالح: {preview.validCount}</Badge>
              {preview.errorCount > 0 && <Badge className="bg-red-100 text-red-700">أخطاء: {preview.errorCount}</Badge>}
              <span className="text-sm font-normal text-muted-foreground">من {preview.total}</span>
            </CardTitle>
            <CardDescription>راجِع الأخطاء قبل الاستيراد — الصفوف التي بها أخطاء لن تُستورد</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>صف</TableHead><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>الرقم القومي</TableHead>
                <TableHead>الهاتف</TableHead><TableHead className="text-center">الحالة</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {preview.rows.map((r) => (
                  <TableRow key={r.row} className={r.errors.length ? "bg-red-50/50" : ""}>
                    <TableCell>{r.row}</TableCell>
                    <TableCell>{r.data.studentCode || "—"}</TableCell>
                    <TableCell className="font-medium">{r.data.nameAr || "—"}</TableCell>
                    <TableCell>{r.data.nationalId || "—"}</TableCell>
                    <TableCell>{r.data.phone || "—"}</TableCell>
                    <TableCell className="text-center">
                      {r.errors.length === 0 ? <Badge className="bg-green-100 text-green-700">صالح</Badge> :
                        <span className="text-red-600 text-xs flex items-center gap-1 justify-center"><AlertTriangle className="w-3.5 h-3.5" /> {r.errors.join("، ")}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
