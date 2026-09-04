"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Settings2, Plus, Trash2, Sliders, ListOrdered, Save, RotateCcw, AlertTriangle } from "lucide-react"

interface GradeStatus {
  id: string; code: string; name: string; points: number | null
  affectsGpa: boolean; isPass: boolean; isLetter: boolean; minPercent: number | null
  countsAttempt: boolean; needsAction: boolean; nextAction: string | null; isException: boolean; isFinal: boolean
  reasonCodes: string[] // أسباب النتيجة المرتبطة بهذه الحالة (من appliesTo)
}
interface ReasonRow {
  id: string; code: string; nameAr: string; nameEn: string | null
  category: string; appliesTo: string | null; order: number; isActive: boolean
}
// One rung of سلّم التقديرات. Kept as strings while editing so a half-typed "5" in a percent
// box doesn't get coerced to a number and reordered under the user's cursor — and so an EMPTY
// box stays empty all the way to the server (a saved letter with no band must not silently
// become a 0% band, which would move whatever grade currently owns 0%).
interface LetterDraft {
  key: string; code: string; name: string; minPercent: string; points: string; isPass: boolean
}
// A brand-new non-letter status the institute's own bylaw carries.
interface NewStatus {
  code: string; name: string; points: string; kind: "FINAL" | "PENDING"; nextAction: string
  affectsGpa: boolean; isPass: boolean; countsAttempt: boolean; isException: boolean
  reasonCodes: string[]
}
const EMPTY_STATUS: NewStatus = {
  code: "", name: "", points: "", kind: "FINAL", nextAction: "NONE",
  affectsGpa: true, isPass: false, countsAttempt: true, isException: true, reasonCodes: [],
}

// Fallback only — the live list comes from the API (lib/course-result.ts ACTION_TYPES).
const NEXT_ACTIONS = ["NONE", "REPEAT", "MAKEUP_EXAM", "COMPLETE_ASSESSMENT"]
const NEXT_ACTION_LABEL: Record<string, string> = { NONE: "لا شيء", REPEAT: "إعادة المقرر", MAKEUP_EXAM: "امتحان تكميلي", COMPLETE_ASSESSMENT: "استكمال تقييم" }
const CATEGORY_LABEL: Record<string, string> = { FAIL: "رسوب", ABSENCE: "غياب", WITHDRAWAL: "انسحاب", DISCIPLINARY: "تأديبي", INCOMPLETE: "غير مكتمل", OTHER: "أخرى" }

const LADDER_API = "/api/institute/exams/result-states/letter-grades"
const STATUS_API = "/api/institute/grade-statuses"
const REASON_API = "/api/institute/course-result-reasons"
let draftSeq = 0
const newKey = () => `row-${++draftSeq}`

export default function ResultStatesPage() {
  const [statuses, setStatuses] = useState<GradeStatus[]>([])
  const [reasons, setReasons] = useState<ReasonRow[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newReason, setNewReason] = useState({ code: "", nameAr: "", category: "FAIL", appliesTo: "" })
  const [nextActions, setNextActions] = useState<string[]>(NEXT_ACTIONS)
  const [newStatus, setNewStatus] = useState<NewStatus>(EMPTY_STATUS)
  const [showAddStatus, setShowAddStatus] = useState(false)

  // --- سلّم التقديرات ---
  const [ladder, setLadder] = useState<LetterDraft[]>([])
  const [savedLadder, setSavedLadder] = useState<string>("[]") // serialized baseline, for the dirty check
  const [usage, setUsage] = useState<Record<string, number>>({})
  const [ladderIssues, setLadderIssues] = useState<string[]>([])
  const [ladderErrors, setLadderErrors] = useState<string[]>([])
  const [ladderSaved, setLadderSaved] = useState<string | null>(null)

  // Three independent loaders. The ladder tab holds an UNSAVED draft, so any refresh triggered by
  // the other two tabs must never re-seed it — that is how a typed ladder used to disappear.
  const loadStatuses = useCallback(async () => {
    const res = await fetch(STATUS_API)
    if (!res.ok) throw new Error("فشل في جلب حالات النتيجة")
    const json = await res.json()
    setStatuses(json.gradeStatuses ?? [])
    if (Array.isArray(json.nextActions) && json.nextActions.length) setNextActions(json.nextActions)
  }, [])

  const loadReasons = useCallback(async () => {
    const res = await fetch(REASON_API)
    if (!res.ok) return
    const json = await res.json()
    setReasons(json.reasons ?? [])
    setCategories(json.categories ?? [])
  }, [])

  const loadLadder = useCallback(async () => {
    const res = await fetch(LADDER_API)
    if (!res.ok) return
    const json = await res.json()
    const rows: LetterDraft[] = (json.letters ?? []).map((g: { code: string; name: string; minPercent: number | null; points: number; isPass: boolean }) => ({
      key: newKey(), code: g.code, name: g.name,
      // A letter with no band arrives as null and stays an EMPTY box — never 0.
      minPercent: g.minPercent == null ? "" : String(g.minPercent),
      points: String(g.points), isPass: g.isPass,
    }))
    setLadder(rows)
    setSavedLadder(JSON.stringify(rows.map(stripKey)))
    setUsage(json.usage ?? {})
    setLadderIssues(json.issues ?? [])
    setLadderErrors([])
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      await Promise.all([loadStatuses(), loadReasons(), loadLadder()])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [loadStatuses, loadReasons, loadLadder])

  useEffect(() => { load() }, [load])

  // PATCH a single status property; optimistic local update so toggles feel instant.
  const patchStatus = async (id: string, patch: Partial<GradeStatus>) => {
    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    setBusy(true); setError(null)
    try {
      const res = await fetch(STATUS_API, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "فشل التحديث") }
    } catch (e) {
      setError((e as Error).message)
      // Revert to server truth for the STATUSES only — reloading everything here used to throw
      // away an unsaved سلّم التقديرات draft without a word.
      await loadStatuses().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  // ---- ladder editing (local draft; one atomic save) ----
  const editRow = (key: string, patch: Partial<LetterDraft>) =>
    setLadder((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const removeRow = (key: string) => setLadder((prev) => prev.filter((r) => r.key !== key))
  const addRow = () =>
    setLadder((prev) => [...prev, { key: newKey(), code: "", name: "", minPercent: "", points: "", isPass: true }])

  // Live feedback on the number that actually matters while typing: the pass floor the draft
  // implies (the lowest band still marked ناجح). The engine derives it the same way.
  const passFloor = useMemo(() => {
    const mins = ladder
      .filter((r) => r.isPass && r.minPercent.trim() !== "")
      .map((r) => Number(r.minPercent))
      .filter((n) => Number.isFinite(n))
    return mins.length ? Math.min(...mins) : null
  }, [ladder])

  const dirty = useMemo(() => JSON.stringify(ladder.map(stripKey)) !== savedLadder, [ladder, savedLadder])

  const saveLadder = async (force = false) => {
    setBusy(true); setError(null); setLadderErrors([]); setLadderSaved(null)
    try {
      const res = await fetch(LADDER_API, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          force,
          // Sent as TYPED strings, never Number(""): an empty box is a missing band, and the
          // server rejects it by name instead of silently saving a 0% band.
          letters: ladder.map((r) => ({
            code: r.code.trim(), name: r.name.trim(),
            minPercent: r.minPercent.trim(), points: r.points.trim(), isPass: r.isPass,
          })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 409 && json.requiresConfirm) {
        // Removing a grade that sits on recorded results — ask before orphaning them.
        if (typeof window !== "undefined" && window.confirm(`${json.error}\n\nهل تريد المتابعة؟`)) {
          setBusy(false)
          return saveLadder(true)
        }
        setLadderErrors([json.error])
        return
      }
      if (!res.ok) { setLadderErrors(json.errors ?? [json.error ?? "فشل حفظ سلّم التقديرات"]); return }
      setLadderSaved(
        `تم حفظ ${json.saved} تقدير.` +
        (json.passFloor != null ? ` حد النجاح الآن ${json.passFloor}%.` : "") +
        " حدود النسب تسري على ما يُرصد من الآن؛ أما النقاط وخانة (ناجح) فتسري فورًا على المعدلات المحفوظة."
      )
      await Promise.all([loadLadder(), loadStatuses().catch(() => {})])
    } catch (e) {
      setLadderErrors([(e as Error).message])
    } finally {
      setBusy(false)
    }
  }

  // ---- حالات النتيجة: add / delete a NON-letter state (letters live in the ladder tab) ----
  const addStatus = async () => {
    if (!newStatus.code.trim() || !newStatus.name.trim()) { setError("الكود والاسم مطلوبان"); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch(STATUS_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newStatus.code.trim(),
          name: newStatus.name.trim(),
          // sent as typed; the server turns "" into «بلا نقاط» and rejects anything unparsable
          points: newStatus.points.trim(),
          affectsGpa: newStatus.affectsGpa,
          isPass: newStatus.isPass,
          countsAttempt: newStatus.countsAttempt,
          isException: newStatus.isException,
          // One decision, two columns: منتهية = إجراء منتهي، معلّقة = تنتظر إجراءً.
          needsAction: newStatus.kind === "PENDING",
          isFinal: newStatus.kind === "FINAL",
          nextAction: newStatus.nextAction,
          reasonCodes: newStatus.reasonCodes,
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "فشل إضافة الحالة") }
      setNewStatus(EMPTY_STATUS)
      setShowAddStatus(false)
      await Promise.all([loadStatuses(), loadReasons()])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const deleteStatus = async (s: GradeStatus, force = false) => {
    if (!force && !window.confirm(`حذف الحالة ${s.code} — ${s.name}؟`)) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`${STATUS_API}?id=${s.id}${force ? "&force=1" : ""}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (res.status === 409 && json.requiresConfirm) {
        // The state sits on recorded results — deleting it drops them out of the CGPA.
        setBusy(false)
        if (window.confirm(`${json.error}\n\nهل تريد المتابعة؟`)) return deleteStatus(s, true)
        return
      }
      if (!res.ok) throw new Error(json.error || "فشل حذف الحالة")
      if (Array.isArray(json.orphanReasons) && json.orphanReasons.length) {
        setError(`تم الحذف. أسباب كانت مرتبطة بهذه الحالة وحدها: ${json.orphanReasons.join("، ")} — راجعها من تبويب «أسباب النتيجة».`)
      }
      await Promise.all([loadStatuses(), loadReasons()])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const addReason = async () => {
    if (!newReason.code || !newReason.nameAr) { setError("الكود والاسم مطلوبان"); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch(REASON_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newReason, appliesTo: newReason.appliesTo || null }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "فشل الإضافة") }
      setNewReason({ code: "", nameAr: "", category: "FAIL", appliesTo: "" })
      await Promise.all([loadReasons(), loadStatuses().catch(() => {})])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const deleteReason = async (id: string) => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`${REASON_API}?id=${id}`, { method: "DELETE" })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "فشل الحذف") }
      await Promise.all([loadReasons(), loadStatuses().catch(() => {})])
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
          <Sliders className="w-7 h-7 text-institute-gold" />
          حالات وقواعد النتائج
        </h1>
        <p className="text-muted-foreground">
          لائحة المعهد كما يدخلها المعهد بنفسه: سلّم التقديرات (حدود النسب والنقاط) وجدول قواعد حالات النتيجة الذي يقرؤه السيستم لإنتاج النتيجة تلقائيًا
        </p>
      </div>

      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}

      <Tabs defaultValue="ladder">
        <TabsList>
          <TabsTrigger value="ladder"><ListOrdered className="w-4 h-4 ml-1" /> سلّم التقديرات</TabsTrigger>
          <TabsTrigger value="statuses"><Settings2 className="w-4 h-4 ml-1" /> حالات النتيجة</TabsTrigger>
          <TabsTrigger value="reasons"><Sliders className="w-4 h-4 ml-1" /> أسباب النتيجة</TabsTrigger>
        </TabsList>

        {/* --- سلّم التقديرات: the letter ladder, fully enterable --- */}
        <TabsContent value="ladder">
          <Card>
            <CardHeader>
              <CardTitle>سلّم التقديرات (جدول التقديرات في اللائحة)</CardTitle>
              <CardDescription>
                أدخل سلّم لائحة معهدك كاملًا: الرمز، التقدير، الحد الأدنى للنسبة، عدد النقاط، وهل التقدير ناجح.
                يقرأ السيستم هذا السلّم لتحويل الدرجة المئوية إلى تقدير ونقاط، ويُشتق منه حد النجاح تلقائيًا.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* The one thing an institute must understand before it edits: stored results do not move. */}
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  تعديل السلّم: نصفه بأثر رجعي ونصفه لا — اقرأ الفرق
                </div>
                <p>
                  <strong>«من نسبة %» لا تسري بأثر رجعي.</strong> التقدير الحرفي يُحفظ مع كل تسجيل مقرر لحظة
                  الرصد، فتغيير حدود النسب يسري على ما يُرصد بعد الحفظ فقط؛ والنتائج السابقة تحتفظ بحرفها.
                </p>
                <p>
                  <strong>«عدد النقاط» و«ناجح» تسريان فورًا وبأثر رجعي.</strong> المعدل التراكمي والحالة
                  الأكاديمية تُحسب لحظيًا من هذا الجدول لا من قيمة مخزَّنة، فتعديل نقاط تقدير واحد يغيّر معدل
                  كل طالب سبق أن حصل عليه — وقد يغيّر معه الإنذار الأكاديمي والتخرج ومرتبة الشرف.
                </p>
                <p>
                  لتصحيح <em>حروف</em> نتائج سابقة بعد تغيير الحدود يلزم إعادة اشتقاق مقصودة (إعادة رصد النتيجة
                  من شاشة الكنترول لكل مقرر، أو إعادة احتساب شاملة على قاعدة البيانات) — لا تتم تلقائيًا.
                </p>
              </div>

              {ladderIssues.length > 0 && (
                <div className="rounded-lg border border-orange-300 bg-orange-50 p-4 text-sm text-orange-900">
                  <div className="font-semibold mb-1">ملاحظات على السلّم المحفوظ حاليًا:</div>
                  <ul className="list-disc pr-5 space-y-1">{ladderIssues.map((m, i) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
              {ladderErrors.length > 0 && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                  <div className="font-semibold mb-1">لم يُحفظ السلّم:</div>
                  <ul className="list-disc pr-5 space-y-1">{ladderErrors.map((m, i) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
              {ladderSaved && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">{ladderSaved}</div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="outline" className="text-sm">
                  حد النجاح المشتق: {passFloor != null ? `${passFloor}%` : "— (لا يوجد تقدير ناجح)"}
                </Badge>
                <Badge variant="outline" className="text-sm">عدد التقديرات: {ladder.length}</Badge>
                {dirty && <span className="text-amber-700">توجد تعديلات غير محفوظة</span>}
              </div>

              {loading ? (
                <div className="p-8 text-center text-muted-foreground">جارٍ التحميل...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">الرمز</TableHead>
                        <TableHead className="w-56">التقدير</TableHead>
                        <TableHead className="text-center w-40">من نسبة % (فأعلى)</TableHead>
                        <TableHead className="text-center w-32">عدد النقاط</TableHead>
                        <TableHead className="text-center w-24">ناجح</TableHead>
                        <TableHead className="text-center w-36">نتائج مرصودة</TableHead>
                        <TableHead className="text-center w-16">حذف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ladder.map((r) => (
                        <TableRow key={r.key}>
                          <TableCell>
                            <Input className="w-24 font-mono text-center" value={r.code} placeholder="A-"
                              onChange={(e) => editRow(r.key, { code: e.target.value })} />
                          </TableCell>
                          <TableCell>
                            <Input className="w-52" value={r.name} placeholder="ممتاز"
                              onChange={(e) => editRow(r.key, { name: e.target.value })} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input type="number" min={0} max={100} step={1} className="w-24 text-center mx-auto"
                              value={r.minPercent} placeholder="85"
                              onChange={(e) => editRow(r.key, { minPercent: e.target.value })} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input type="number" min={0} step="0.01" className="w-24 text-center mx-auto"
                              value={r.points} placeholder="3.67"
                              onChange={(e) => editRow(r.key, { points: e.target.value })} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={r.isPass} onCheckedChange={(v) => editRow(r.key, { isPass: v })} />
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground text-xs">
                            {usage[r.code] ? `${usage[r.code]} نتيجة` : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeRow(r.key)} disabled={busy}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {ladder.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-6">
                          لا يوجد سلّم تقديرات — أضف تقديرات لائحة معهدك
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex flex-wrap gap-2 items-center border-t pt-4">
                <Button variant="outline" onClick={addRow} disabled={busy}><Plus className="w-4 h-4 ml-1" /> إضافة تقدير</Button>
                <Button onClick={() => saveLadder(false)} disabled={busy || !dirty}><Save className="w-4 h-4 ml-1" /> حفظ السلّم</Button>
                <Button variant="ghost" onClick={() => loadLadder()} disabled={busy || !dirty}><RotateCcw className="w-4 h-4 ml-1" /> تراجع</Button>
              </div>

              <p className="text-xs text-muted-foreground leading-6">
                قواعد الحفظ: لا يتكرر رمز ولا يتكرر حد نسبة (حدّان متساويان = نطاقان متداخلان)، والنقاط تتنازل مع
                النطاق، وأدنى تقدير يبدأ من 0% حتى تُغطّى كل الدرجات، وتقديرات النجاح تقع فوق تقديرات الرسوب،
                ويجب وجود تقدير راسب واحد على الأقل. الترتيب المعروض عند الحفظ يكون تنازليًا حسب النسبة تلقائيًا.
                حد النسبة يُدخل كعدد صحيح (بدون كسور)، وترك الخانة فارغة يعني «بلا حد» فلا يُحفظ التقدير حتى تُملأ.
              </p>
              <p className="text-xs text-muted-foreground leading-6">
                ملاحظة عن التعدد المؤسسي: هذا السلّم مشترك على مستوى المنصة (وليس لكل جهة سلّمها بعد)، لأن محرك
                احتساب النتيجة يقرأ التقديرات دون تقييد بالجهة. فصل السلّم لكل معهد يحتاج تعديلًا مصاحبًا في محرك
                المعدل وبيان الحالة معًا.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Status rules table --- */}
        <TabsContent value="statuses">
          <Card>
            <CardHeader>
              <CardTitle>جدول قواعد الحالات</CardTitle>
              <CardDescription>
                حالات نتيجة اللائحة وتأثير كل حالة: هل هي «إجراء منتهي» (استقرّت النتيجة — راسب مثلًا) أم «تحتاج
                قرار/إجراء» (معلّقة حتى يتم الإجراء). تنطبق التغييرات فورًا على احتساب المعدل والساعات والمحاولات.
                حدود النسب وعدد النقاط وخانة (ناجح) للتقديرات الحرفية تُعدَّل من تبويب «سلّم التقديرات».
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* add a non-letter state — «كل معهد بندخل حالات وتاثيرها» */}
              <div className="border-b pb-4">
                {!showAddStatus ? (
                  <Button variant="outline" onClick={() => setShowAddStatus(true)} disabled={busy}>
                    <Plus className="w-4 h-4 ml-1" /> إضافة حالة نتيجة
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 items-end">
                      <div>
                        <label className="text-xs text-muted-foreground">الكود</label>
                        <Input className="w-28 font-mono" value={newStatus.code} placeholder="DS"
                          onChange={(e) => setNewStatus((p) => ({ ...p, code: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">اسم الحالة</label>
                        <Input className="w-56" value={newStatus.name} placeholder="حرمان تأديبي"
                          onChange={(e) => setNewStatus((p) => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">النقاط (اتركها فارغة لحالة بلا نقاط)</label>
                        <Input type="number" step="0.01" min={0} className="w-28 text-center" value={newStatus.points} placeholder="0"
                          onChange={(e) => setNewStatus((p) => ({ ...p, points: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">تأثير الحالة</label>
                        <Select value={newStatus.kind} onValueChange={(v) => setNewStatus((p) => ({
                          ...p, kind: v as NewStatus["kind"],
                          // a pending state must name what it waits for; a terminal one defaults to none
                          nextAction: v === "PENDING" ? (p.nextAction === "NONE" ? "MAKEUP_EXAM" : p.nextAction) : p.nextAction,
                        }))}>
                          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FINAL">إجراء منتهي (النتيجة استقرّت)</SelectItem>
                            <SelectItem value="PENDING">تحتاج قرار/إجراء (معلّقة)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">الإجراء التالي</label>
                        <Select value={newStatus.nextAction} onValueChange={(v) => setNewStatus((p) => ({ ...p, nextAction: v }))}>
                          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {nextActions.map((a) => (
                              <SelectItem key={a} value={a} disabled={a === "NONE" && newStatus.kind === "PENDING"}>
                                {NEXT_ACTION_LABEL[a] ?? a}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-6 items-center text-sm">
                      <label className="flex items-center gap-2">
                        <Switch checked={newStatus.affectsGpa} onCheckedChange={(v) => setNewStatus((p) => ({ ...p, affectsGpa: v }))} />
                        تدخل المعدل التراكمي
                      </label>
                      <label className="flex items-center gap-2">
                        <Switch checked={newStatus.isPass} onCheckedChange={(v) => setNewStatus((p) => ({ ...p, isPass: v }))} />
                        تُكسب ساعات معتمدة (ناجح)
                      </label>
                      <label className="flex items-center gap-2">
                        <Switch checked={newStatus.countsAttempt} onCheckedChange={(v) => setNewStatus((p) => ({ ...p, countsAttempt: v }))} />
                        تُحتسب محاولة
                      </label>
                      <label className="flex items-center gap-2">
                        <Switch checked={newStatus.isException} onCheckedChange={(v) => setNewStatus((p) => ({ ...p, isException: v }))} />
                        حالة استثنائية (تُرصد من شاشة الحالات الاستثنائية)
                      </label>
                    </div>
                    {reasons.some((r) => r.appliesTo !== null) && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">أسباب النتيجة المرتبطة (اختياري — تغذّي تقارير «راسب بسبب…»)</div>
                        <div className="flex flex-wrap gap-2">
                          {reasons.filter((r) => r.appliesTo !== null).map((r) => {
                            const on = newStatus.reasonCodes.includes(r.code)
                            return (
                              <Button key={r.id} type="button" size="sm" variant={on ? "default" : "outline"}
                                onClick={() => setNewStatus((p) => ({
                                  ...p,
                                  reasonCodes: on ? p.reasonCodes.filter((c) => c !== r.code) : [...p.reasonCodes, r.code],
                                }))}>
                                {r.nameAr}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={addStatus} disabled={busy}><Plus className="w-4 h-4 ml-1" /> حفظ الحالة</Button>
                      <Button variant="ghost" onClick={() => { setShowAddStatus(false); setNewStatus(EMPTY_STATUS) }} disabled={busy}>إلغاء</Button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-6">
                      التقديرات الحرفية (A / B+ / F …) لا تُضاف من هنا — مكانها «سلّم التقديرات» حيث يُتحقَّق من
                      السلّم ككل. الكود يُخزَّن مع كل نتيجة، فلا يحتوي مسافة أو فاصلة ولا يتكرر مع حالة أخرى.
                    </p>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="p-8 text-center text-muted-foreground">جارٍ التحميل...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الكود</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead className="text-center">من نسبة %</TableHead>
                        <TableHead className="text-center">نقاط</TableHead>
                        <TableHead className="text-center">المعدل GPA</TableHead>
                        <TableHead className="text-center">ساعات معتمدة</TableHead>
                        <TableHead className="text-center">تُحتسب محاولة</TableHead>
                        <TableHead className="text-center">تحتاج إجراء</TableHead>
                        <TableHead className="text-center w-44">الإجراء التالي</TableHead>
                        <TableHead className="text-center">استثنائية</TableHead>
                        <TableHead className="text-center">منتهية</TableHead>
                        <TableHead className="text-center">الأسباب المرتبطة</TableHead>
                        <TableHead className="text-center w-16">حذف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statuses.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell><Badge variant={s.isLetter ? "secondary" : "outline"} className="font-mono">{s.code}</Badge></TableCell>
                          <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                          {/* Read-only here on purpose: a band is only meaningful against the whole ladder,
                              so it is edited (and validated as a set) in the سلّم التقديرات tab. */}
                          <TableCell className="text-center text-sm tabular-nums">{s.isLetter && s.minPercent != null ? `${s.minPercent}%` : "—"}</TableCell>
                          {/* Read-only for letters, exactly like the band above: نقاط and ناجح are
                              validated as one ladder, and this tab's snapshot would be overwritten
                              by the next «حفظ السلّم» — the two editors used to revert each other. */}
                          <TableCell className="text-center">
                            {s.isLetter ? (
                              <span className="text-sm tabular-nums text-muted-foreground" title="يُعدَّل من تبويب سلّم التقديرات">
                                {s.points ?? "—"}
                              </span>
                            ) : (
                              <Input type="number" step="0.01" className="w-16 text-center mx-auto"
                                value={s.points ?? ""} placeholder="—"
                                onChange={(e) => setStatuses((prev) => prev.map((x) => x.id === s.id ? { ...x, points: e.target.value === "" ? null : Number(e.target.value) } : x))}
                                onBlur={(e) => patchStatus(s.id, { points: e.target.value === "" ? null : Number(e.target.value) })} />
                            )}
                          </TableCell>
                          <TableCell className="text-center"><Switch checked={s.affectsGpa} onCheckedChange={(v) => patchStatus(s.id, { affectsGpa: v })} /></TableCell>
                          <TableCell className="text-center">
                            {s.isLetter ? (
                              <span className="text-sm text-muted-foreground" title="يُعدَّل من تبويب سلّم التقديرات">
                                {s.isPass ? "ناجح" : "راسب"}
                              </span>
                            ) : (
                              <Switch checked={s.isPass} onCheckedChange={(v) => patchStatus(s.id, { isPass: v })} />
                            )}
                          </TableCell>
                          <TableCell className="text-center"><Switch checked={s.countsAttempt} onCheckedChange={(v) => patchStatus(s.id, { countsAttempt: v })} /></TableCell>
                          {/* منتهية ⟺ لا تحتاج إجراءً: one decision, so both columns move together
                              (the API refuses the incoherent pair). */}
                          <TableCell className="text-center">
                            <Switch checked={s.needsAction} onCheckedChange={(v) => patchStatus(s.id, {
                              needsAction: v, isFinal: !v, nextAction: v && (s.nextAction ?? "NONE") === "NONE" ? "MAKEUP_EXAM" : s.nextAction,
                            })} />
                          </TableCell>
                          <TableCell>
                            <Select value={s.nextAction ?? "NONE"} onValueChange={(v) => patchStatus(s.id, { nextAction: v })}>
                              <SelectTrigger className="w-40 mx-auto"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {nextActions.map((a) => (
                                  <SelectItem key={a} value={a} disabled={a === "NONE" && s.needsAction}>
                                    {NEXT_ACTION_LABEL[a] ?? a}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center"><Switch checked={s.isException} onCheckedChange={(v) => patchStatus(s.id, { isException: v })} /></TableCell>
                          <TableCell className="text-center">
                            <Switch checked={s.isFinal} onCheckedChange={(v) => patchStatus(s.id, {
                              isFinal: v, needsAction: !v, nextAction: !v && (s.nextAction ?? "NONE") === "NONE" ? "MAKEUP_EXAM" : s.nextAction,
                            })} />
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {(s.reasonCodes ?? []).length
                              ? (s.reasonCodes ?? []).map((c) => reasons.find((r) => r.code === c)?.nameAr ?? c).join("، ")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {s.isLetter ? (
                              <span className="text-xs text-muted-foreground" title="يُحذف من تبويب سلّم التقديرات">—</span>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteStatus(s)} disabled={busy}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-xs text-muted-foreground leading-6">
                صفوف التقديرات الحرفية تظهر هنا للاطلاع فقط في خانات «من نسبة %» و«نقاط» و«ساعات معتمدة» — تُعدَّل
                جميعها من تبويب «سلّم التقديرات» لأنها سلّم واحد يُتحقَّق من ترابطه ككل. حذف حالة مرصودة على نتائج
                سابقة يستبعد تلك النتائج من احتساب المعدل التراكمي، لذا يطلب النظام تأكيدًا صريحًا.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Reasons --- */}
        <TabsContent value="reasons">
          <Card>
            <CardHeader>
              <CardTitle>أسباب حالات النتيجة</CardTitle>
              <CardDescription>السبب وراء الحالة (سقوط التحريري / نقص الحضور / عذر طبي …) — يغذّي تقارير أسباب الرسوب والغياب.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* add form */}
              <div className="flex flex-wrap gap-2 items-end border-b pb-4">
                <div><label className="text-xs text-muted-foreground">الكود</label><Input className="w-36" value={newReason.code} onChange={(e) => setNewReason((p) => ({ ...p, code: e.target.value }))} placeholder="WrittenFail" /></div>
                <div><label className="text-xs text-muted-foreground">الاسم</label><Input className="w-48" value={newReason.nameAr} onChange={(e) => setNewReason((p) => ({ ...p, nameAr: e.target.value }))} placeholder="سقوط في التحريري" /></div>
                <div><label className="text-xs text-muted-foreground">الفئة</label>
                  <Select value={newReason.category} onValueChange={(v) => setNewReason((p) => ({ ...p, category: v }))}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{(categories.length ? categories : Object.keys(CATEGORY_LABEL)).map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs text-muted-foreground">ينطبق على (أكواد)</label><Input className="w-36" value={newReason.appliesTo} onChange={(e) => setNewReason((p) => ({ ...p, appliesTo: e.target.value }))} placeholder="F,BL" /></div>
                <Button onClick={addReason} disabled={busy}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
              </div>

              {reasons.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">لا توجد أسباب معرّفة بعد</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">الفئة</TableHead>
                    <TableHead className="text-center">ينطبق على</TableHead><TableHead className="text-center">حذف</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {reasons.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono">{r.code}</TableCell>
                        <TableCell className="font-medium">{r.nameAr}</TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{CATEGORY_LABEL[r.category] ?? r.category}</Badge></TableCell>
                        <TableCell className="text-center font-mono text-xs">{r.appliesTo ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteReason(r.id)} disabled={busy}><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// The React row key is local bookkeeping, not part of the saved ladder — excluded so the
// dirty check compares content only.
function stripKey(r: LetterDraft) {
  return { code: r.code, name: r.name, minPercent: r.minPercent, points: r.points, isPass: r.isPass }
}
