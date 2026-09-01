"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, CheckCircle2, XCircle, RotateCcw, AlertTriangle, ClipboardCheck, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdviseeRow {
  studentCode: string
  name: string
  level: number
  system?: "CREDIT_HOURS" | "ANNUAL"
  cgpa?: number // credit-hours only
  onProbation?: boolean
  escalation?: string
  flags?: string[]
  // annual-system fields
  result?: string
  pct?: number | null
  grade?: string | null
  atRisk?: boolean
  requestStatus: string
}
interface Issue { rule: string; message: string; severity: "error" | "warning" }
interface ReqItem { code: string; name: string; creditHours: number; sectionCode: string }
interface PendingRow {
  id: string
  student: { studentCode: string; name: string; level: number }
  academicYear: string
  semester: string
  totalHours: number
  validation: { ok: boolean; issues: Issue[]; maxHours: number }
  items: ReqItem[]
}
interface Profile {
  student: { studentCode: string; name: string; level: number; status: string }
  system?: "CREDIT_HOURS" | "ANNUAL"
  standing: { cgpa: number; earnedHours: number; onProbation: boolean; flags: string[]; remainingHours: number; qualifiedLevel: number } | null
  annual?: { result: string; overallPct: number | null; overallGrade: string | null; yearGroup: number } | null
  transcript: { academicYear: string; semester: string; courses: { code: string; name: string; creditHours: number; status: string | null; statusName: string | null; points: number | null }[] }[]
  currentRequest: { status: string; items: ReqItem[] } | null
}

const SEM: Record<string, string> = { first: "الأول", second: "الثاني", summer: "الصيفي" }

export default function AdviseesPage() {
  const [advisees, setAdvisees] = useState<AdviseeRow[]>([])
  const [pending, setPending] = useState<PendingRow[]>([])
  const [stats, setStats] = useState<{ total: number; pending: number; approved: number; warnings: number } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [note, setNote] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [aRes, pRes] = await Promise.all([
        fetch(`/api/faculty/advisees`),
        fetch(`/api/faculty/registration?status=Pending`),
      ])
      if (!aRes.ok) throw new Error("فشل في جلب الطلاب")
      const a = await aRes.json()
      setAdvisees(a.rows ?? [])
      setStats(a.stats ?? null)
      const p = pRes.ok ? await pRes.json() : { rows: [] }
      setPending(p.rows ?? [])
      setSelected(new Set())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const decide = async (action: "approve" | "reject" | "return", ids?: string[]) => {
    const requestIds = ids ?? [...selected]
    if (!requestIds.length) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/faculty/registration`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestIds, action, note: note || undefined }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "فشل في معالجة الطلبات") }
      setNote("")
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const openProfile = async (studentCode: string) => {
    setProfile(null)
    try {
      const res = await fetch(`/api/faculty/advisees?studentCode=${encodeURIComponent(studentCode)}`)
      if (res.ok) setProfile(await res.json())
    } catch { /* ignore */ }
  }

  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-600" />
          الإرشاد الأكاديمي
        </h1>
        <p className="text-muted-foreground">مراجعة واعتماد طلبات تسجيل المقررات لطلابك</p>
      </div>

      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><Users className="w-6 h-6 mx-auto mb-1 text-blue-600" /><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">طلابي</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><ClipboardCheck className="w-6 h-6 mx-auto mb-1 text-amber-600" /><p className="text-2xl font-bold">{stats.pending}</p><p className="text-xs text-muted-foreground">طلبات معلقة</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-600" /><p className="text-2xl font-bold">{stats.approved}</p><p className="text-xs text-muted-foreground">معتمدة</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><AlertTriangle className="w-6 h-6 mx-auto mb-1 text-red-600" /><p className="text-2xl font-bold">{stats.warnings}</p><p className="text-xs text-muted-foreground">تحت الإنذار</p></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">طلبات التسجيل ({pending.length})</TabsTrigger>
          <TabsTrigger value="students">طلابي ({advisees.length})</TabsTrigger>
        </TabsList>

        {/* Pending requests */}
        <TabsContent value="requests" className="mt-6 space-y-4">
          {!loading && pending.length === 0 && (
            <Card><CardContent className="p-12 text-center text-muted-foreground">لا توجد طلبات بانتظار المراجعة</CardContent></Card>
          )}
          {pending.length > 0 && (
            <Card>
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <Input placeholder="ملاحظة (سبب الرفض / الإعادة)..." value={note} onChange={(e) => setNote(e.target.value)} className="flex-1 min-w-[200px]" />
                <Button disabled={busy || selected.size === 0} onClick={() => decide("approve")}><CheckCircle2 className="w-4 h-4 ml-2" />اعتماد ({selected.size})</Button>
                <Button variant="outline" disabled={busy || selected.size === 0} onClick={() => decide("return")} className="text-orange-600"><RotateCcw className="w-4 h-4 ml-2" />إعادة</Button>
                <Button variant="outline" disabled={busy || selected.size === 0} onClick={() => decide("reject")} className="text-red-600"><XCircle className="w-4 h-4 ml-2" />رفض</Button>
              </CardContent>
            </Card>
          )}
          {pending.map((r) => (
            <Card key={r.id} className={cn("border-r-4", r.validation.ok ? "border-r-green-500" : "border-r-red-500")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1.5 w-4 h-4" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono">{r.student.studentCode}</span>
                      <span className="font-semibold">{r.student.name}</span>
                      <Badge variant="outline">المستوى {r.student.level}</Badge>
                      <Badge variant="outline">{r.totalHours} ساعة</Badge>
                      <span className="text-sm text-muted-foreground">الفصل {SEM[r.semester] ?? r.semester} {r.academicYear}</span>
                      <button className="text-blue-600 text-sm underline mr-auto" onClick={() => openProfile(r.student.studentCode)}>الملف الأكاديمي</button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.items.map((it, i) => (
                        <Badge key={i} variant="secondary">{it.code} ({it.sectionCode}) · {it.creditHours}س</Badge>
                      ))}
                    </div>
                    {r.validation.issues.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {r.validation.issues.map((iss, i) => (
                          <div key={i} className={cn("text-sm flex items-center gap-1", iss.severity === "error" ? "text-red-700" : "text-amber-700")}>
                            <AlertTriangle className="w-3.5 h-3.5" /> {iss.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Advisees */}
        <TabsContent value="students" className="mt-6">
          <Card>
            <CardHeader><CardTitle>قائمة طلابي</CardTitle><CardDescription>اضغط على الطالب لعرض ملفه الأكاديمي</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الرقم الجامعي</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead className="text-center">المستوى</TableHead>
                    <TableHead className="text-center">المعدل</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-center">طلب التسجيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advisees.map((s) => (
                    <TableRow key={s.studentCode} className="cursor-pointer" onClick={() => openProfile(s.studentCode)}>
                      <TableCell className="font-mono">{s.studentCode}</TableCell>
                      <TableCell className="font-medium text-blue-600">{s.name}</TableCell>
                      <TableCell className="text-center">{s.level}</TableCell>
                      <TableCell className="text-center">
                        {s.system === "ANNUAL" ? (
                          <Badge className={s.atRisk ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>{s.pct != null ? `${s.pct}%` : "—"}{s.grade ? ` · ${s.grade}` : ""}</Badge>
                        ) : (
                          <Badge className={(s.cgpa ?? 0) >= 3.33 ? "bg-green-100 text-green-700" : (s.cgpa ?? 0) >= 2 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}>{(s.cgpa ?? 0).toFixed(2)}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {s.system === "ANNUAL" ? (
                            s.result ? <Badge variant="outline" className={s.atRisk ? "border-red-300 text-red-700" : "border-green-300 text-green-700"}>{s.result}</Badge> : <span className="text-muted-foreground text-sm">—</span>
                          ) : (s.flags ?? []).length === 0 ? <span className="text-muted-foreground text-sm">منتظم</span> :
                            (s.flags ?? []).map((f, i) => <Badge key={i} variant="outline" className={f.includes("نهائي") ? "border-red-300 text-red-700" : f.includes("إنذار") || f.includes("الملاحظة") ? "border-amber-300 text-amber-700" : f.includes("الشرف") ? "border-yellow-400 text-yellow-700" : "border-green-300 text-green-700"}>{f}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">{s.requestStatus === "None" ? "—" : s.requestStatus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Academic profile panel */}
      {profile && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-blue-600" />الملف الأكاديمي — {profile.student.name}</CardTitle>
              <CardDescription>{profile.student.studentCode} · المستوى {profile.student.level}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setProfile(null)}><XCircle className="w-5 h-5" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.standing && (
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-blue-100 text-blue-700">المعدل التراكمي {profile.standing.cgpa.toFixed(2)}</Badge>
                <Badge variant="outline">ساعات منجزة {profile.standing.earnedHours}</Badge>
                <Badge variant="outline">متبقٍ للتخرج {profile.standing.remainingHours}</Badge>
                {profile.standing.flags.map((f, i) => <Badge key={i} variant="outline">{f}</Badge>)}
              </div>
            )}
            {profile.system === "ANNUAL" && profile.annual && (
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-amber-100 text-amber-800">النسبة {profile.annual.overallPct != null ? `${profile.annual.overallPct}%` : "—"}</Badge>
                {profile.annual.overallGrade && <Badge variant="outline">التقدير {profile.annual.overallGrade}</Badge>}
                <Badge variant="outline">نتيجة العام: {profile.annual.result}</Badge>
              </div>
            )}
            <div>
              <h4 className="font-semibold mb-2">السجل الأكاديمي</h4>
              {profile.transcript.length === 0 ? <p className="text-muted-foreground text-sm">لا يوجد سجل</p> : profile.transcript.map((t, i) => (
                <div key={i} className="mb-3">
                  <p className="text-sm font-medium text-muted-foreground mb-1">الفصل {SEM[t.semester] ?? t.semester} — {t.academicYear}</p>
                  <div className="flex flex-wrap gap-1">
                    {t.courses.map((c, j) => (
                      <Badge key={j} variant="secondary" title={c.statusName ?? undefined}>
                        {c.code} {c.status ? `· ${c.status}` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {profile.currentRequest && (
              <div>
                <h4 className="font-semibold mb-2">طلب التسجيل الحالي ({profile.currentRequest.status})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.currentRequest.items.map((it, i) => <Badge key={i} variant="outline">{it.code} · {it.creditHours}س</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
