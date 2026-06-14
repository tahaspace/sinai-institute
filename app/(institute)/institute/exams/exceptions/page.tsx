"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, CheckCircle2, XCircle, Clock, Save, FileWarning } from "lucide-react"

// --- API shapes ---
interface CourseLite { id: string; code: string; nameAr: string }
interface ExceptionStatus { code: string; name: string; needsAction: boolean; nextAction: string | null; affectsGpa: boolean; isPass: boolean; countsAttempt: boolean; isFinal: boolean }
interface LetterStatus { code: string; name: string }
interface ReasonOpt { code: string; nameAr: string; category: string; appliesTo: string | null }
interface RosterRow {
  enrollmentId: string; studentCode: string; name: string
  gradeStatusCode: string | null; reasonCode: string | null; attemptNo: number
  resultPending: boolean; actionType: string | null; actionDueDate: string | null
  approvalState: string | null; resultLocked: boolean; academicYear: string; semester: string
}
interface QueueRow {
  enrollmentId: string; studentCode: string; name: string; course: string; courseCode: string
  gradeStatusCode: string | null; reasonCode: string | null; actionType: string | null
  actionDueDate: string | null; approvalState: string | null
}

const APPROVAL_LABEL: Record<string, string> = { PENDING: "بانتظار الاعتماد", APPROVED: "معتمد", REJECTED: "مرفوض" }
const ACTION_LABEL: Record<string, string> = { MAKEUP_EXAM: "امتحان تكميلي", COMPLETE_ASSESSMENT: "استكمال تقييم", REPEAT: "إعادة المقرر", NONE: "—" }

export default function ExceptionsPage() {
  const [courses, setCourses] = useState<CourseLite[]>([])
  const [statuses, setStatuses] = useState<ExceptionStatus[]>([])
  const [letters, setLetters] = useState<LetterStatus[]>([])
  const [reasons, setReasons] = useState<ReasonOpt[]>([])
  const [pendingApproval, setPendingApproval] = useState<QueueRow[]>([])
  const [openActions, setOpenActions] = useState<QueueRow[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [draft, setDraft] = useState<Record<string, { code?: string; reasonCode?: string; due?: string }>>({})
  const [resolveCode, setResolveCode] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async (courseId?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = courseId ? `/api/institute/exams/exceptions?courseId=${courseId}` : `/api/institute/exams/exceptions`
      const res = await fetch(url)
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "فشل في جلب الحالات الاستثنائية")
      }
      const json = await res.json()
      setCourses(json.courses ?? [])
      setStatuses(json.exceptionStatuses ?? [])
      setLetters(json.letterStatuses ?? [])
      setReasons(json.reasons ?? [])
      setPendingApproval(json.pendingApproval ?? [])
      setOpenActions(json.openActions ?? [])
      setRoster(json.roster ?? [])
      if (!courseId && json.courses?.[0]?.id) setSelectedCourseId(json.courses[0].id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (selectedCourseId) load(selectedCourseId) }, [selectedCourseId, load])

  const statusByCode = (c: string | null) => statuses.find((s) => s.code === c)
  const needsAction = (code?: string) => !!statusByCode(code ?? null)?.needsAction

  // Apply an exceptional status to a roster row.
  const applyStatus = async (row: RosterRow) => {
    const d = draft[row.enrollmentId]
    if (!d?.code) { setError("اختر كود الحالة أولاً"); return }
    setBusy(true); setError(null); setNotice(null)
    try {
      const res = await fetch(`/api/institute/exams/exceptions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set", enrollmentId: row.enrollmentId,
          code: d.code, reasonCode: d.reasonCode || undefined,
          actionDueDate: d.due || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "فشل تطبيق الحالة")
      setNotice(`تم تطبيق الحالة ${d.code} (محاولة #${json.result?.attemptNo ?? "-"})${json.result?.resultPending ? " — بانتظار الإجراء والاعتماد" : " — بانتظار الاعتماد"}`)
      setDraft((p) => ({ ...p, [row.enrollmentId]: {} }))
      await load(selectedCourseId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Approver: confirm / reject a pending exceptional status.
  const decide = async (enrollmentId: string, approve: boolean) => {
    setBusy(true); setError(null); setNotice(null)
    try {
      const res = await fetch(`/api/institute/exams/exceptions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: approve ? "approve" : "reject", enrollmentId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "فشل تنفيذ الاعتماد")
      setNotice(approve ? "تم اعتماد الحالة" : "تم رفض الحالة")
      await load(selectedCourseId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Resolve a held result (makeup graded / assessment completed) → final outcome.
  const resolve = async (enrollmentId: string) => {
    const code = resolveCode[enrollmentId]
    setBusy(true); setError(null); setNotice(null)
    try {
      const res = await fetch(`/api/institute/exams/exceptions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // code === "__derive" → omit code so the server recomputes from recorded scores
        body: JSON.stringify({ action: "resolve", enrollmentId, code: code && code !== "__derive" ? code : undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "فشل إنهاء الإجراء")
      setNotice(`تم إنهاء الإجراء — النتيجة: ${json.result?.gradeStatusCode ?? "-"}`)
      await load(selectedCourseId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileWarning className="w-7 h-7 text-red-600" />
          الحالات الاستثنائية للنتائج
        </h1>
        <p className="text-muted-foreground">
          تعيين حالات الكنترول (غائب بعذر / غير مكتمل / محروم / مؤجل …) بسبب وإجراء، واعتمادها وإنهاء الإجراءات المعلّقة
        </p>
      </div>

      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}
      {notice && <Card><CardContent className="p-4 text-center text-green-700">{notice}</CardContent></Card>}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="w-8 h-8 text-amber-500" /><div><div className="text-2xl font-bold">{pendingApproval.length}</div><div className="text-xs text-muted-foreground">بانتظار الاعتماد</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="w-8 h-8 text-red-600" /><div><div className="text-2xl font-bold">{openActions.length}</div><div className="text-xs text-muted-foreground">إجراءات مفتوحة</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CheckCircle2 className="w-8 h-8 text-institute-blue" /><div><div className="text-2xl font-bold">{statuses.length}</div><div className="text-xs text-muted-foreground">حالات استثنائية مُعرّفة</div></div></CardContent></Card>
      </div>

      {/* 1) Set exceptional status on a course roster */}
      <Card>
        <CardHeader>
          <CardTitle>تعيين حالة استثنائية</CardTitle>
          <CardDescription>اختر المقرر ثم عيّن الحالة والسبب لكل طالب. الحالات التي تتطلب إجراءً تُعلَّق نتيجتها حتى الاستكمال.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-full md:w-72"><SelectValue placeholder="اختر المقرر" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.nameAr}</SelectItem>)}
            </SelectContent>
          </Select>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">جارٍ التحميل...</div>
          ) : roster.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">لا يوجد طلاب مسجلون في هذا المقرر</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead className="text-center">الحالة الحالية</TableHead>
                  <TableHead className="text-center">المحاولة</TableHead>
                  <TableHead className="text-center w-40">الحالة</TableHead>
                  <TableHead className="text-center w-44">السبب</TableHead>
                  <TableHead className="text-center w-36">مهلة الإجراء</TableHead>
                  <TableHead className="text-center">تطبيق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((row) => {
                  const d = draft[row.enrollmentId] ?? {}
                  const showDue = needsAction(d.code)
                  return (
                    <TableRow key={row.enrollmentId}>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{row.studentCode}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.gradeStatusCode ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant={row.resultPending ? "outline" : "secondary"} className={row.resultPending ? "border-amber-500 text-amber-700" : ""}>{row.gradeStatusCode}</Badge>
                            {row.approvalState && <span className="text-[10px] text-muted-foreground">{APPROVAL_LABEL[row.approvalState] ?? row.approvalState}</span>}
                          </div>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-center">{row.attemptNo}</TableCell>
                      <TableCell>
                        <Select value={d.code ?? ""} onValueChange={(v) => setDraft((p) => ({ ...p, [row.enrollmentId]: { ...p[row.enrollmentId], code: v } }))} disabled={row.resultLocked}>
                          <SelectTrigger className="w-36 mx-auto"><SelectValue placeholder="اختر" /></SelectTrigger>
                          <SelectContent>
                            {statuses.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={d.reasonCode ?? ""} onValueChange={(v) => setDraft((p) => ({ ...p, [row.enrollmentId]: { ...p[row.enrollmentId], reasonCode: v } }))} disabled={row.resultLocked}>
                          <SelectTrigger className="w-40 mx-auto"><SelectValue placeholder="(افتراضي)" /></SelectTrigger>
                          <SelectContent>
                            {reasons.map((r) => <SelectItem key={r.code} value={r.code}>{r.nameAr}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="date" className="w-36 mx-auto" disabled={!showDue || row.resultLocked}
                          value={d.due ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [row.enrollmentId]: { ...p[row.enrollmentId], due: e.target.value } }))} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" onClick={() => applyStatus(row)} disabled={busy || row.resultLocked || !d.code}>
                          <Save className="w-4 h-4 ml-1" /> تطبيق
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 2) Pending approval queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" /> بانتظار الاعتماد</CardTitle>
          <CardDescription>اعتماد أو رفض الحالات الاستثنائية التي عيّنها الكنترول (المعتمد: رئيس الكنترول / شؤون الطلاب)</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApproval.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">لا توجد حالات بانتظار الاعتماد</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>الطالب</TableHead><TableHead>المقرر</TableHead>
                <TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">السبب</TableHead>
                <TableHead className="text-center">الإجراء</TableHead><TableHead className="text-center">القرار</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pendingApproval.map((r) => (
                  <TableRow key={r.enrollmentId}>
                    <TableCell><div className="font-medium">{r.name}</div><div className="font-mono text-xs text-muted-foreground">{r.studentCode}</div></TableCell>
                    <TableCell>{r.courseCode} - {r.course}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{r.gradeStatusCode}</Badge></TableCell>
                    <TableCell className="text-center text-sm">{reasons.find((x) => x.code === r.reasonCode)?.nameAr ?? r.reasonCode ?? "-"}</TableCell>
                    <TableCell className="text-center text-sm">{ACTION_LABEL[r.actionType ?? "NONE"] ?? r.actionType}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="outline" className="text-green-700 border-green-600" onClick={() => decide(r.enrollmentId, true)} disabled={busy}><CheckCircle2 className="w-4 h-4 ml-1" /> اعتماد</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-500" onClick={() => decide(r.enrollmentId, false)} disabled={busy}><XCircle className="w-4 h-4 ml-1" /> رفض</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 3) Open follow-up actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" /> الإجراءات المفتوحة</CardTitle>
          <CardDescription>إنهاء الامتحان التكميلي / استكمال التقييم — يعيد احتساب نتيجة المقرر (غير مكتمل ← ناجح / راسب)</CardDescription>
        </CardHeader>
        <CardContent>
          {openActions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">لا توجد إجراءات مفتوحة</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>الطالب</TableHead><TableHead>المقرر</TableHead>
                <TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">الإجراء</TableHead>
                <TableHead className="text-center">المهلة</TableHead><TableHead className="text-center w-64">النتيجة النهائية</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {openActions.map((r) => (
                  <TableRow key={r.enrollmentId}>
                    <TableCell><div className="font-medium">{r.name}</div><div className="font-mono text-xs text-muted-foreground">{r.studentCode}</div></TableCell>
                    <TableCell>{r.courseCode} - {r.course}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="border-amber-500 text-amber-700">{r.gradeStatusCode}</Badge></TableCell>
                    <TableCell className="text-center text-sm">{ACTION_LABEL[r.actionType ?? "NONE"] ?? r.actionType}</TableCell>
                    <TableCell className="text-center text-sm">{r.actionDueDate ? new Date(r.actionDueDate).toLocaleDateString("ar-EG") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center items-center">
                        <Select value={resolveCode[r.enrollmentId] ?? "__derive"} onValueChange={(v) => setResolveCode((p) => ({ ...p, [r.enrollmentId]: v }))}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__derive">من الدرجات</SelectItem>
                            {letters.map((l) => <SelectItem key={l.code} value={l.code}>{l.code} — {l.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => resolve(r.enrollmentId)} disabled={busy}>إنهاء</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
