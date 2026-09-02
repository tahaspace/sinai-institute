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
// client-safe half of the module — importing lib/academic-system.ts here would drag Prisma into the browser bundle
import { ACADEMIC_SYSTEM_LABELS, type AcademicSystem } from "@/lib/academic-system-shared"

type Opt = { id: string; name: string; academicSystem: AcademicSystem }
type PreviewRow = {
  row: number
  data: Record<string, string>
  errors: string[]
  programId: string | null
  programName: string | null
  programOverride: boolean
  academicSystem: AcademicSystem | null
  systemSource: "sheet-program" | "sheet-system" | "cohort" | null
}
type Preview = { rows: PreviewRow[]; total: number; validCount: number; errorCount: number; systemCounts?: Record<AcademicSystem, number>; overrideCount?: number }
// A dead programme dropdown disables the whole screen, so it always says so — and says WHICH of the
// two reasons it is, instead of blaming a failed request for an empty catalogue (or the reverse).
const PROGRAMS_FETCH_ERROR = "تعذّر تحميل قائمة البرامج — لا يمكن الاستيراد بدون تحديد البرنامج"
const PROGRAMS_EMPTY_ERROR = "لا توجد برامج مفعّلة لمؤسستك — أضف برنامجًا أولاً، فالنظام الأكاديمي يُشتق من البرنامج"

// Where a row's system came from — the registrar must be able to tell a per-row override from the batch default.
const SOURCE_LABEL: Record<string, string> = { "sheet-program": "برنامج من الملف", "sheet-system": "محدد في الملف", cohort: "من الدفعة" }

export default function ImportStudentsPage() {
  const [programs, setPrograms] = useState<Opt[]>([])
  const [years, setYears] = useState<string[]>([])
  // programId starts EMPTY, not "all": the academic system comes from the programme, so there is no
  // safe default — "" is still a controlled Radix value and just shows the placeholder.
  const [form, setForm] = useState({ academicYear: "", semester: "first", programId: "", level: "1" })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [result, setResult] = useState<{ imported: number; failed: number; errors: { row: number; error: string }[] } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadOpts = useCallback(async () => {
    try {
      // The importer's OWN endpoint, not /api/institute/programs: that one needs 'program.view',
      // which the registrar — the role holding 'student.import' — does not have, so it answered 403
      // and left the (now mandatory) picker empty, i.e. import permanently disabled for its main user.
      const [p, y] = await Promise.all([fetch("/api/institute/students/import"), fetch("/api/institute/academic-years")])
      if (p.ok) {
        const j = await p.json()
        const list: Opt[] = (j.programs ?? []).map((x: Record<string, string>) => ({ id: x.id, name: x.nameAr ?? x.id, academicSystem: x.academicSystem === "ANNUAL" ? "ANNUAL" : "CREDIT_HOURS" }))
        setPrograms(list)
        if (!list.length) setError(PROGRAMS_EMPTY_ERROR)
      } else { setError(PROGRAMS_FETCH_ERROR) }
      if (y.ok) { const j = await y.json(); setYears(j.years ?? []); setForm((f) => ({ ...f, academicYear: f.academicYear || j.current || (j.years ?? [])[0] || "" })) }
    } catch { setError(PROGRAMS_FETCH_ERROR) }
  }, [])
  useEffect(() => { loadOpts() }, [loadOpts])

  const selectedProgram = programs.find((p) => p.id === form.programId) ?? null
  // The programme is part of the gate now: without it every imported student would silently be
  // classified as credit-hours (the system is read from Program.academicSystem, never stored on the student).
  const cohortReady = form.academicYear.trim() !== "" && form.programId !== ""

  async function send(action: "preview" | "commit") {
    if (!file) { setError("يرجى اختيار ملف Excel/CSV"); return }
    if (!cohortReady) { setError("اختر العام الأكاديمي والبرنامج أولاً — النظام الأكاديمي يُحدَّد من البرنامج"); return }
    setBusy(action); setError(null)
    try {
      const fd = new FormData()
      fd.set("file", file); fd.set("action", action)
      fd.set("academicYear", form.academicYear); fd.set("semester", form.semester); fd.set("level", form.level)
      fd.set("programId", form.programId) // always sent — the server rejects an import without it
      const res = await fetch("/api/institute/students/import", { method: "POST", body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "فشل العملية")
      // The route returns the rows under `preview`, not `rows` — map explicitly, or preview.rows is
      // undefined and the whole table (system column included) throws on render.
      if (action === "preview") {
        setPreview({ rows: j.preview ?? [], total: j.total ?? 0, validCount: j.validCount ?? 0, errorCount: j.errorCount ?? 0, systemCounts: j.systemCounts, overrideCount: j.overrideCount })
        setResult(null)
      }
      else { setResult(j); setPreview(null) }
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><UploadCloud className="w-7 h-7 text-institute-blue" /> استيراد الطلاب الجدد</h1>
        <p className="text-muted-foreground">رفع ملف Excel/CSV بالطلاب المقبولين وربطهم بالعام والبرنامج والمستوى والفصل، مع إنشاء الحساب المالي وطلب تسجيل مبدئي (Draft) للفصل المحدد تلقائيًا.</p>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600 flex items-center justify-between"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => setError(null)}>إغلاق</Button></CardContent></Card>}

      {/* Step 1 — cohort */}
      <Card>
        <CardHeader><CardTitle>١) بيانات الدفعة</CardTitle><CardDescription>يُربط كل الطلاب في الملف بهذه الاختيارات — والبرنامج إلزامي لأن النظام الأكاديمي يُشتق منه</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label className="mb-1 block">العام الأكاديمي</Label>
            <Select value={form.academicYear} onValueChange={(v) => setForm({ ...form, academicYear: v })}>
              <SelectTrigger><SelectValue placeholder="اختر السنة" /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="mb-1 block">البرنامج <span className="text-red-600">*</span></Label>
            {/* No "بدون تحديد" option: a batch with no programme is a batch of silently mis-classified students. */}
            <Select value={form.programId} onValueChange={(v) => { setForm({ ...form, programId: v }); setPreview(null); setResult(null) }}>
              <SelectTrigger><SelectValue placeholder="اختر البرنامج" /></SelectTrigger>
              <SelectContent>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {ACADEMIC_SYSTEM_LABELS[p.academicSystem]}</SelectItem>)}</SelectContent>
            </Select>
            {/* Show the system the chosen programme RESOLVES to — the user must see what they are creating.
                A <div>, not a <p>: Badge renders a <div>, and the parser auto-closes a <p> before it → hydration mismatch. */}
            {selectedProgram ? (
              <div className="mt-2 text-xs flex items-center gap-1 flex-wrap">
                <span className="text-muted-foreground">النظام الأكاديمي:</span>
                <Badge variant={selectedProgram.academicSystem === "ANNUAL" ? "secondary" : "outline"}>{ACADEMIC_SYSTEM_LABELS[selectedProgram.academicSystem]}</Badge>
              </div>
            ) : (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> اختر البرنامج — منه يُحدَّد النظام الأكاديمي (ساعات معتمدة / سنوي) لكل طلاب الملف</p>
            )}
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
          <div><CardTitle>٢) ملف البيانات</CardTitle><CardDescription>الأعمدة كما في القالب — Excel (.xlsx) أو CSV. لخلط برنامجين أو نظامين في ملف واحد اكتب اسم البرنامج في عمود «النظام الأكاديمي أو البرنامج»؛ كتابة «ساعات معتمدة» / «سنوي» تأكيد فقط ويجب أن تطابق نظام برنامج الدفعة وإلا يُرفض الصف. اتركه فارغًا ليأخذ الصف برنامج الدفعة.</CardDescription></div>
          <Button variant="outline" onClick={() => { const a = document.createElement("a"); a.href = "/api/institute/students/import/template"; a.click() }}><Download className="w-4 h-4 ml-2" /> تحميل القالب</Button>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setResult(null) }} className="max-w-sm" />
          {file && <span className="text-sm text-muted-foreground flex items-center gap-1"><FileSpreadsheet className="w-4 h-4" /> {file.name}</span>}
          {!cohortReady && <span className="text-xs text-red-600">أكمل بيانات الدفعة (العام والبرنامج) لتفعيل المعاينة</span>}
          <div className="flex gap-2 md:mr-auto">
            <Button variant="secondary" disabled={!file || !cohortReady || busy !== null} onClick={() => send("preview")}>معاينة والتحقق</Button>
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
              {/* System split of the whole batch, before anything is written. */}
              {preview.systemCounts?.CREDIT_HOURS ? <Badge variant="outline" className="font-normal">{ACADEMIC_SYSTEM_LABELS.CREDIT_HOURS}: {preview.systemCounts.CREDIT_HOURS}</Badge> : null}
              {preview.systemCounts?.ANNUAL ? <Badge variant="secondary" className="font-normal">{ACADEMIC_SYSTEM_LABELS.ANNUAL}: {preview.systemCounts.ANNUAL}</Badge> : null}
              {/* Rows the FILE moved off the batch programme — different programme, different fees, different department. */}
              {preview.overrideCount ? <Badge className="bg-amber-100 text-amber-800 font-normal">برنامج مختلف من الملف: {preview.overrideCount}</Badge> : null}
            </CardTitle>
            <CardDescription>راجِع الأخطاء والنظام الأكاديمي والبرنامج لكل صف قبل الاستيراد — الصفوف التي بها أخطاء لن تُستورد</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>صف</TableHead><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>الرقم القومي</TableHead>
                <TableHead>الهاتف</TableHead><TableHead>النظام الأكاديمي والبرنامج</TableHead><TableHead className="text-center">الحالة</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {preview.rows.map((r) => (
                  <TableRow key={r.row} className={r.errors.length ? "bg-red-50/50" : ""}>
                    <TableCell>{r.row}</TableCell>
                    <TableCell>{r.data.studentCode || "—"}</TableCell>
                    <TableCell className="font-medium">{r.data.nameAr || "—"}</TableCell>
                    <TableCell>{r.data.nationalId || "—"}</TableCell>
                    <TableCell>{r.data.phone || "—"}</TableCell>
                    {/* The point of the whole preview: which engine this student will be graded on. */}
                    <TableCell className="whitespace-nowrap">
                      {r.academicSystem ? (
                        <span className="flex items-center gap-1 flex-wrap">
                          <Badge variant={r.academicSystem === "ANNUAL" ? "secondary" : "outline"}>{ACADEMIC_SYSTEM_LABELS[r.academicSystem]}</Badge>
                          {/* The programme itself, because it — not the system alone — decides fees and department. */}
                          {r.programName && <span className={r.programOverride ? "text-[11px] text-amber-700 font-medium" : "text-[11px] text-muted-foreground"}>{r.programName}</span>}
                          {r.systemSource && <span className="text-[11px] text-muted-foreground">({SOURCE_LABEL[r.systemSource]})</span>}
                          {r.programOverride && <span className="text-[11px] text-amber-700">يخالف برنامج الدفعة</span>}
                        </span>
                      ) : <span className="text-red-600 text-xs">غير محدد</span>}
                    </TableCell>
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
