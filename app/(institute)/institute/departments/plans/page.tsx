"use client"

// شاشة إدخال الخطة الدراسية — the write path the platform never had.
// The bylaw's جدول 1 splits the total hours into six buckets per specialisation
// («… 32 | 28 | 4 | 54 | 4 | 8 | 130 ساعة اجمالية») and جداول 5-35 are the plan itself, one table
// per level+term. So the editor works LEVEL BY LEVEL and foots every bucket, and compares the
// programme total against the institute's own Program.totalCreditHours — no number is hardcoded.

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClipboardList, Plus, Save, Trash2, AlertTriangle, Layers, Users } from "lucide-react"

type Program = { id: string; nameAr: string; years: number; totalCreditHours: number; academicSystem: string; departmentId: string | null }
type Item = {
  id: string; programId: string | null; programName: string; year: string; semester: string
  courseCode: string; courseName: string; hours: number; order: number
  courseId: string | null; levelNo: number | null; termNo: number | null
  requirementType: string | null; bucket: string | null; specializationId: string | null
  electiveGroup: string | null; chooseCount: number | null; isLegacy: boolean
}
type Meta = { buckets: { value: string; label: string }[]; requirementTypes: { value: string; label: string }[]; maxLevel?: number | null }
type CourseOpt = { id: string; code: string; name: string; creditHours: number }
type Spec = {
  id: string; nameAr: string; nameEn: string; kind: string; programId: string | null; programName: string
  minLevel: number | null; minCgpaForSecond: number | null; isActive: boolean; students: number
}
type StudentRow = { id: string; studentCode: string; nameAr: string; level: number; gpa: number; specializationId: string | null; specializationName: string; isLegacySection: boolean }

// Draft row in the level editor (a row not yet saved has no id).
type Draft = {
  key: string; id?: string; courseId: string; hours: number; termNo: number
  requirementType: string; bucket: string; specializationId: string; electiveGroup: string; chooseCount: string
}

const selectCls = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
const newKey = () => Math.random().toString(36).slice(2)

export default function PlansPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [programId, setProgramId] = useState("")
  const [level, setLevel] = useState(1)
  const [items, setItems] = useState<Item[]>([])
  const [meta, setMeta] = useState<Meta>({ buckets: [], requirementTypes: [], maxLevel: null })
  const [courses, setCourses] = useState<CourseOpt[]>([])
  const [specs, setSpecs] = useState<Spec[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [courseSearch, setCourseSearch] = useState("")
  // جدول 1 foots the hours PER specialisation — three rows of 130 inside ONE programme. So the
  // totals card is read one specialisation at a time; summing the whole programme would put the
  // mismatch banner permanently on as soon as a second تخصص is entered.
  const [totalsSpecId, setTotalsSpecId] = useState("")
  const [planDenied, setPlanDenied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const program = programs.find((p) => p.id === programId) ?? null

  const loadPlan = useCallback(async (pid: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/institute/study-plan${pid ? `?programId=${pid}` : ""}`)
      const json = await res.json()
      // A registrar holds student.* but not plan.view: the plan itself is out of reach, yet the
      // «إسناد التخصص للطلاب» tab is their job. A 403 must not blank the whole screen.
      if (res.status === 403) {
        setPlanDenied(true)
        return
      }
      if (!res.ok) throw new Error(json.error || "فشل في جلب البيانات")
      setPlanDenied(false)
      setItems(json.items ?? [])
      setMeta(json.meta ?? { buckets: [], requirementTypes: [], maxLevel: null })
      setPrograms((prev) => (prev.length ? prev : json.programs ?? []))
      if (!pid && json.programs?.length) setProgramId(json.programs[0].id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPlan("") }, [loadPlan])
  useEffect(() => { if (programId) loadPlan(programId) }, [programId, loadPlan])

  useEffect(() => {
    ;(async () => {
      const [c, s] = await Promise.all([
        fetch("/api/institute/courses").then((r) => r.json()).catch(() => ({})),
        fetch("/api/institute/specializations").then((r) => r.json()).catch(() => ({})),
      ])
      setCourses(c.courses ?? [])
      setSpecs(s.specializations ?? [])
    })()
  }, [])

  // Rows of the selected level become the editable drafts; legacy rows (levelNo NULL) are excluded
  // — they are shown read-only below and are never rewritten by a level save.
  useEffect(() => {
    setDrafts(
      items
        .filter((i) => i.levelNo === level)
        .map((i) => ({
          key: i.id, id: i.id, courseId: i.courseId ?? "", hours: i.hours, termNo: i.termNo ?? 1,
          requirementType: i.requirementType ?? "", bucket: i.bucket ?? "", specializationId: i.specializationId ?? "",
          electiveGroup: i.electiveGroup ?? "", chooseCount: i.chooseCount != null ? String(i.chooseCount) : "",
        })),
    )
  }, [items, level])

  const legacyRows = useMemo(() => items.filter((i) => i.levelNo === null), [items])
  const structured = useMemo(() => items.filter((i) => i.levelNo !== null), [items])

  const programSpecs = useMemo(
    () => specs.filter((sp) => !sp.programId || sp.programId === programId),
    [specs, programId],
  )

  // One جدول 1 row = the shared rows (no تخصص) + the chosen specialisation's rows.
  const footed = useMemo(
    () => (totalsSpecId ? structured.filter((i) => !i.specializationId || i.specializationId === totalsSpecId) : structured),
    [structured, totalsSpecId],
  )

  const bucketTotals = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of footed) m.set(i.bucket ?? "—", (m.get(i.bucket ?? "—") ?? 0) + i.hours)
    return m
  }, [footed])

  const levelTotal = drafts.reduce((a, d) => a + (Number(d.hours) || 0), 0)
  const planTotal = footed.reduce((a, i) => a + i.hours, 0)
  const legacyTotal = legacyRows.reduce((a, i) => a + i.hours, 0)
  const target = program?.totalCreditHours ?? 0
  // Only a specialisation-level footing can be compared against the programme total; with no تخصص
  // selected the figure mixes specialisations, so the banner would be noise, not a signal.
  const mismatch = !!totalsSpecId && target > 0 && planTotal + legacyTotal !== target

  // Per-specialisation footing shown when none is selected — each line is one جدول 1 row.
  const perSpecTotals = useMemo(() => {
    if (totalsSpecId) return []
    const shared = structured.filter((i) => !i.specializationId).reduce((a, i) => a + i.hours, 0)
    return programSpecs.map((sp) => ({
      id: sp.id,
      nameAr: sp.nameAr,
      total: shared + legacyTotal + structured.filter((i) => i.specializationId === sp.id).reduce((a, i) => a + i.hours, 0),
    }))
  }, [structured, programSpecs, totalsSpecId, legacyTotal])

  // The level picker must reach the bylaw's own «المستوي الخامس», which Program.years (a YEAR
  // count) cannot express. Prefer the institute's typed عدد المستويات; never offer fewer levels
  // than the plan already has rows for.
  const maxLevel = Math.max(
    meta.maxLevel ?? 0,
    program?.years ?? 4,
    ...structured.map((i) => i.levelNo ?? 0),
    1,
  )

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase()
    if (!q) return courses.slice(0, 200)
    return courses.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).slice(0, 200)
  }, [courses, courseSearch])

  const addDraft = () =>
    setDrafts((d) => [...d, { key: newKey(), courseId: "", hours: 3, termNo: 1, requirementType: "MANDATORY", bucket: "", specializationId: "", electiveGroup: "", chooseCount: "" }])

  const patchDraft = (key: string, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)))

  const saveLevel = async () => {
    if (!programId) return
    setSaving(true); setError(null); setNotice(null)
    try {
      const res = await fetch("/api/institute/study-plan/level", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          levelNo: level,
          items: drafts.map((d) => ({
            courseId: d.courseId, hours: Number(d.hours), termNo: Number(d.termNo),
            requirementType: d.requirementType || null, bucket: d.bucket || null,
            specializationId: d.specializationId || null,
            electiveGroup: d.electiveGroup || null,
            chooseCount: d.chooseCount === "" ? null : Number(d.chooseCount),
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "فشل الحفظ")
      setNotice(`تم حفظ المستوى ${level} (${json.count} مقرر)`)
      await loadPlan(programId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-institute-blue" />
            الخطط الدراسية
          </h1>
          <p className="text-muted-foreground">إدخال خطة البرنامج مستوى بمستوى، وضبط التخصصات كما وردت في اللائحة</p>
        </div>
      </div>

      {planDenied && (
        <Card><CardContent className="py-4 text-sm text-muted-foreground">
          صلاحيتك لا تشمل عرض الخطة الدراسية؛ تبويب «إسناد التخصص للطلاب» متاح كالمعتاد.
        </CardContent></Card>
      )}
      {error && <Card><CardContent className="py-4 text-destructive">{error}</CardContent></Card>}
      {notice && <Card><CardContent className="py-4 text-emerald-700">{notice}</CardContent></Card>}

      <Tabs key={planDenied ? "denied" : "full"} defaultValue={planDenied ? "assign" : "plan"}>
        <TabsList>
          <TabsTrigger value="plan">الخطة الدراسية</TabsTrigger>
          <TabsTrigger value="specs">التخصصات</TabsTrigger>
          <TabsTrigger value="assign">إسناد التخصص للطلاب</TabsTrigger>
        </TabsList>

        {/* ── الخطة ─────────────────────────────────────────────────────────── */}
        <TabsContent value="plan" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">البرنامج والمستوى</CardTitle>
              <CardDescription>اختر البرنامج ثم المستوى المراد إدخاله</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <select className={selectCls} value={programId} onChange={(e) => setProgramId(e.target.value)}>
                <option value="">— اختر البرنامج —</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.nameAr}</option>
                ))}
              </select>
              <select className={selectCls} value={level} onChange={(e) => setLevel(Number(e.target.value))}>
                {Array.from({ length: maxLevel }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>المستوى {n}</option>
                ))}
              </select>
              <Input placeholder="بحث في دليل المقررات (كود أو اسم)" value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} />
            </CardContent>
          </Card>

          {/* Running totals — جدول 1 is exactly this: hours split into buckets summing to the total. */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2"><Layers className="w-5 h-5" /> توزيع الساعات</CardTitle>
              <CardDescription>
                مجموع المستوى الحالي: {levelTotal} ساعة —{" "}
                {totalsSpecId
                  ? `إجمالي ساعات التخصص المحدد: ${planTotal + legacyTotal} ساعة`
                  : "اختر تخصصًا لمطابقة إجمالي ساعاته مع إجمالي البرنامج (اللائحة توزّع الساعات لكل تخصص على حدة)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <select className={`${selectCls} md:w-72`} value={totalsSpecId} onChange={(e) => setTotalsSpecId(e.target.value)}>
                <option value="">— كل التخصصات (بدون مطابقة) —</option>
                {programSpecs.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.nameAr}{sp.kind === "MINOR" ? " (فرعي)" : ""}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                {meta.buckets.map((b) => (
                  <Badge key={b.value} variant="secondary">{b.label}: {bucketTotals.get(b.value) ?? 0}</Badge>
                ))}
                {bucketTotals.has("—") && <Badge variant="outline">بدون بند: {bucketTotals.get("—")}</Badge>}
              </div>
              {!totalsSpecId && perSpecTotals.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {perSpecTotals.map((t) => (
                    <Badge key={t.id} variant={target > 0 && t.total !== target ? "outline" : "secondary"}>
                      {t.nameAr}: {t.total}{target > 0 ? ` / ${target}` : ""}
                    </Badge>
                  ))}
                </div>
              )}
              {mismatch && (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    مجموع ساعات هذا التخصص ({planTotal + legacyTotal}) لا يساوي إجمالي الساعات المعتمدة للبرنامج ({target}).
                    راجع توزيع الساعات على المستويات قبل اعتماد الخطة.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">مقررات المستوى {level}</CardTitle>
                <CardDescription>يُحفظ المستوى كاملاً؛ الحفظ يستبدل مقررات هذا المستوى فقط</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={addDraft} disabled={!programId}>
                  <Plus className="w-4 h-4 ml-2" /> إضافة مقرر
                </Button>
                <Button onClick={saveLevel} disabled={!programId || saving}>
                  <Save className="w-4 h-4 ml-2" /> {saving ? "جارٍ الحفظ..." : "حفظ المستوى"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && <p className="text-muted-foreground text-sm">جارٍ التحميل...</p>}
              {!loading && drafts.length === 0 && (
                <p className="text-muted-foreground text-sm">لا توجد مقررات في هذا المستوى بعد — اضغط «إضافة مقرر».</p>
              )}
              {drafts.map((d) => (
                <div key={d.key} className="grid gap-2 md:grid-cols-12 items-center rounded-lg border p-3">
                  <select className={`${selectCls} md:col-span-3`} value={d.courseId}
                    onChange={(e) => {
                      const c = courses.find((x) => x.id === e.target.value)
                      patchDraft(d.key, { courseId: e.target.value, hours: c ? c.creditHours : d.hours })
                    }}>
                    <option value="">— اختر المقرر —</option>
                    {/* the row's own course stays listed even when the search box filters it out */}
                    {(filteredCourses.some((c) => c.id === d.courseId) || !d.courseId
                      ? filteredCourses
                      : [...courses.filter((c) => c.id === d.courseId), ...filteredCourses]
                    ).map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                  <Input className="md:col-span-1" type="number" min={1} value={d.hours}
                    onChange={(e) => patchDraft(d.key, { hours: Number(e.target.value) })} />
                  <select className={`${selectCls} md:col-span-1`} value={d.termNo} onChange={(e) => patchDraft(d.key, { termNo: Number(e.target.value) })}>
                    <option value={1}>الفصل 1</option>
                    <option value={2}>الفصل 2</option>
                    <option value={3}>صيفي</option>
                  </select>
                  <select className={`${selectCls} md:col-span-2`} value={d.requirementType} onChange={(e) => patchDraft(d.key, { requirementType: e.target.value })}>
                    <option value="">— نوع المتطلب —</option>
                    {meta.requirementTypes.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <select className={`${selectCls} md:col-span-2`} value={d.bucket} onChange={(e) => patchDraft(d.key, { bucket: e.target.value })}>
                    <option value="">— بند الساعات —</option>
                    {meta.buckets.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                  <select className={`${selectCls} md:col-span-2`} value={d.specializationId} onChange={(e) => patchDraft(d.key, { specializationId: e.target.value })}>
                    <option value="">— بدون تخصص —</option>
                    {programSpecs.map((s) => (
                      <option key={s.id} value={s.id}>{s.nameAr}{s.kind === "MINOR" ? " (فرعي)" : ""}</option>
                    ))}
                  </select>
                  <Button variant="ghost" size="icon" className="md:col-span-1 text-destructive" onClick={() => setDrafts((x) => x.filter((y) => y.key !== d.key))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {/* «وليكن اربعة او خمسه وهو لازم ياخد من مقررات دي وليكن اتنين» */}
                  <div className="md:col-span-12 grid gap-2 md:grid-cols-4">
                    <Input placeholder="اسم المجموعة الاختيارية (اختياري)" value={d.electiveGroup}
                      onChange={(e) => patchDraft(d.key, { electiveGroup: e.target.value })} />
                    <Input placeholder="يُختار منها (عدد المقررات)" type="number" min={1} value={d.chooseCount}
                      onChange={(e) => patchDraft(d.key, { chooseCount: e.target.value })} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {legacyRows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">سطور الخطة القديمة (غير مُهيكلة)</CardTitle>
                <CardDescription>
                  أُدخلت قبل إتاحة الإدخال المُهيكل، ولا تحمل مستوى أو بند ساعات. تُعرض كما هي ولا يمسّها حفظ المستويات.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {legacyRows.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm">
                    <span>{i.year} — {i.semester} — {i.courseCode} {i.courseName}</span>
                    <Badge variant="outline">{i.hours} س</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── التخصصات ──────────────────────────────────────────────────────── */}
        <TabsContent value="specs">
          <SpecializationsSection programs={programs} specs={specs} onChanged={async () => {
            const s = await fetch("/api/institute/specializations").then((r) => r.json()).catch(() => ({}))
            setSpecs(s.specializations ?? [])
          }} />
        </TabsContent>

        {/* ── إسناد التخصص ─────────────────────────────────────────────────── */}
        <TabsContent value="assign">
          <AssignSection programs={programs} specs={specs} programId={programId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────────
// التخصصات — «ثلاث تخصصات رئيسه» + التخصص الفرعي. minLevel carries «التخصص الفرعي يكون في المستوي
// الرابع فقط»؛ minCgpaForSecond carries «يشترط حصوله علي تقدير تراكمي 2.7 فاكثر» for the SECOND minor.
function SpecializationsSection({ programs, specs, onChanged }: { programs: Program[]; specs: Spec[]; onChanged: () => void }) {
  const [form, setForm] = useState({ nameAr: "", nameEn: "", kind: "MAIN", programId: "", minLevel: "", minCgpaForSecond: "" })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch("/api/institute/specializations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "فشل الحفظ")
      setForm({ nameAr: "", nameEn: "", kind: "MAIN", programId: "", minLevel: "", minCgpaForSecond: "" })
      setMsg("تمت إضافة التخصص")
      onChanged()
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // The API has always accepted a partial PATCH (it merges onto the stored row) but nothing called
  // it, so a mistyped name or a wrong مستوى was uncorrectable once a student had been assigned —
  // DELETE is (correctly) refused at that point.
  const [editId, setEditId] = useState<string | null>(null)
  const [edit, setEdit] = useState({ nameAr: "", kind: "MAIN", minLevel: "", minCgpaForSecond: "" })

  const startEdit = (s: Spec) => {
    setEditId(s.id)
    setEdit({
      nameAr: s.nameAr,
      kind: s.kind,
      minLevel: s.minLevel != null ? String(s.minLevel) : "",
      minCgpaForSecond: s.minCgpaForSecond != null ? String(s.minCgpaForSecond) : "",
    })
  }

  const saveEdit = async () => {
    if (!editId) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch("/api/institute/specializations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          nameAr: edit.nameAr,
          kind: edit.kind,
          minLevel: edit.minLevel,
          minCgpaForSecond: edit.kind === "MINOR" ? edit.minCgpaForSecond : "",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "فشل التعديل")
      setEditId(null)
      setMsg("تم تعديل التخصص")
      onChanged()
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    const res = await fetch(`/api/institute/specializations?id=${id}`, { method: "DELETE" })
    const json = await res.json().catch(() => ({}))
    setMsg(res.ok ? "تم حذف التخصص" : json.error || "فشل الحذف")
    if (res.ok) onChanged()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">إضافة تخصص</CardTitle>
          <CardDescription>التخصص الرئيسي أو الفرعي كما تنص عليه لائحة المعهد</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="اسم التخصص بالعربية" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
          <Input placeholder="الاسم بالإنجليزية (اختياري)" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          <select className={selectCls} value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value })}>
            <option value="">— البرنامج —</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.nameAr}</option>)}
          </select>
          <select className={selectCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="MAIN">تخصص رئيسي</option>
            <option value="MINOR">تخصص فرعي</option>
          </select>
          <Input placeholder="أول مستوى يظهر فيه التخصص" type="number" min={1} value={form.minLevel}
            onChange={(e) => setForm({ ...form, minLevel: e.target.value })} />
          <Input placeholder="المعدل التراكمي للتخصص الفرعي الثاني" type="number" step="0.01" value={form.minCgpaForSecond}
            disabled={form.kind !== "MINOR"}
            onChange={(e) => setForm({ ...form, minCgpaForSecond: e.target.value })} />
          <div className="md:col-span-3 flex items-center gap-3">
            <Button onClick={submit} disabled={busy}><Plus className="w-4 h-4 ml-2" /> إضافة</Button>
            {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
          </div>
          <p className="md:col-span-3 text-xs text-muted-foreground">
            «التخصص الفرعي يكون في المستوي الرابع فقط» — أدخل المستوى من لائحتك. وللتخصص الفرعي الثاني:
            «يشترط حصوله علي تقدير تراكمي … فاكثر للالتحاق» — أدخل الحد من لائحتك أيضًا.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg">التخصصات المسجّلة</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {specs.length === 0 && <p className="text-sm text-muted-foreground">لا توجد تخصصات بعد.</p>}
          {specs.map((s) => (
            <div key={s.id} className="rounded-md border p-3 text-sm">
              {editId === s.id ? (
                <div className="grid gap-2 md:grid-cols-5 items-center">
                  <Input value={edit.nameAr} onChange={(e) => setEdit({ ...edit, nameAr: e.target.value })} placeholder="اسم التخصص" />
                  <select className={selectCls} value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>
                    <option value="MAIN">تخصص رئيسي</option>
                    <option value="MINOR">تخصص فرعي</option>
                  </select>
                  <Input type="number" min={1} value={edit.minLevel} placeholder="أول مستوى"
                    onChange={(e) => setEdit({ ...edit, minLevel: e.target.value })} />
                  <Input type="number" step="0.01" value={edit.minCgpaForSecond} placeholder="معدل التخصص الفرعي الثاني"
                    disabled={edit.kind !== "MINOR"}
                    onChange={(e) => setEdit({ ...edit, minCgpaForSecond: e.target.value })} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={busy}>حفظ</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditId(null)}>إلغاء</Button>
                  </div>
                </div>
              ) : (
              <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{s.nameAr} <Badge variant={s.kind === "MINOR" ? "outline" : "secondary"}>{s.kind === "MINOR" ? "فرعي" : "رئيسي"}</Badge></p>
                <p className="text-xs text-muted-foreground">
                  {s.programName || "بدون برنامج"}
                  {s.minLevel ? ` — من المستوى ${s.minLevel}` : ""}
                  {s.minCgpaForSecond ? ` — التخصص الفرعي الثاني بمعدل ${s.minCgpaForSecond}` : ""}
                  {` — ${s.students} طالب`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(s)}>تعديل</Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
              </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────────
// إسناد التخصص للطلاب — writes Student.specializationId, the authoritative field. The legacy
// free-text Student.section is only displayed when no specialisation has been assigned, and is
// never overwritten.
function AssignSection({ programs, specs, programId }: { programs: Program[]; specs: Spec[]; programId: string }) {
  const [pid, setPid] = useState(programId)
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<StudentRow[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [specId, setSpecId] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const q = new URLSearchParams()
    if (pid) q.set("programId", pid)
    if (search) q.set("search", search)
    const json = await fetch(`/api/institute/specializations/assign?${q}`).then((r) => r.json()).catch(() => ({}))
    setRows(json.students ?? [])
    setSelected([])
  }, [pid, search])

  useEffect(() => { load() }, [load])

  const apply = async () => {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch("/api/institute/specializations/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selected, specializationId: specId || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "فشل الإسناد")
      setMsg(`تم تحديث ${json.updated} طالب`)
      await load()
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> إسناد التخصص للطلاب</CardTitle>
        <CardDescription>التخصص المُسنَد هنا هو المصدر المعتمد، ويحلّ محل حقل «الشعبة» النصي القديم</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <select className={selectCls} value={pid} onChange={(e) => setPid(e.target.value)}>
            <option value="">كل البرامج</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.nameAr}</option>)}
          </select>
          <Input placeholder="بحث بالاسم أو الرقم الجامعي" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={selectCls} value={specId} onChange={(e) => setSpecId(e.target.value)}>
            <option value="">— إزالة التخصص —</option>
            {specs.filter((s) => !pid || !s.programId || s.programId === pid).map((s) => (
              <option key={s.id} value={s.id}>{s.nameAr}{s.kind === "MINOR" ? " (فرعي)" : ""}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={apply} disabled={busy || selected.length === 0}>تطبيق على {selected.length} طالب</Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
        <div className="space-y-1 max-h-[26rem] overflow-auto">
          {rows.map((r) => (
            <label key={r.id} className="flex items-center justify-between rounded-md bg-muted/40 p-2 text-sm">
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={selected.includes(r.id)}
                  onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))} />
                {r.studentCode} — {r.nameAr} (المستوى {r.level})
              </span>
              <span className="text-muted-foreground">
                {r.specializationName || "—"}
                {r.isLegacySection && <Badge variant="outline" className="mr-2">شعبة قديمة</Badge>}
              </span>
            </label>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد طلاب مطابقون.</p>}
        </div>
      </CardContent>
    </Card>
  )
}
