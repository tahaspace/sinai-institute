"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Settings2, Plus, Trash2, Sliders } from "lucide-react"

interface GradeStatus {
  id: string; code: string; name: string; points: number | null
  affectsGpa: boolean; isPass: boolean; isLetter: boolean; minPercent: number | null
  countsAttempt: boolean; needsAction: boolean; nextAction: string | null; isException: boolean; isFinal: boolean
}
interface ReasonRow {
  id: string; code: string; nameAr: string; nameEn: string | null
  category: string; appliesTo: string | null; order: number; isActive: boolean
}

const NEXT_ACTIONS = ["NONE", "REPEAT", "MAKEUP_EXAM", "COMPLETE_ASSESSMENT"]
const NEXT_ACTION_LABEL: Record<string, string> = { NONE: "لا شيء", REPEAT: "إعادة المقرر", MAKEUP_EXAM: "امتحان تكميلي", COMPLETE_ASSESSMENT: "استكمال تقييم" }
const CATEGORY_LABEL: Record<string, string> = { FAIL: "رسوب", ABSENCE: "غياب", WITHDRAWAL: "انسحاب", DISCIPLINARY: "تأديبي", INCOMPLETE: "غير مكتمل", OTHER: "أخرى" }

export default function ResultStatesPage() {
  const [statuses, setStatuses] = useState<GradeStatus[]>([])
  const [reasons, setReasons] = useState<ReasonRow[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newReason, setNewReason] = useState({ code: "", nameAr: "", category: "FAIL", appliesTo: "" })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [sRes, rRes] = await Promise.all([
        fetch(`/api/institute/grade-statuses`),
        fetch(`/api/institute/course-result-reasons`),
      ])
      if (!sRes.ok) throw new Error("فشل في جلب حالات النتيجة")
      const sJson = await sRes.json()
      setStatuses(sJson.gradeStatuses ?? [])
      if (rRes.ok) {
        const rJson = await rRes.json()
        setReasons(rJson.reasons ?? [])
        setCategories(rJson.categories ?? [])
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // PATCH a single status property; optimistic local update so toggles feel instant.
  const patchStatus = async (id: string, patch: Partial<GradeStatus>) => {
    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/institute/grade-statuses`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "فشل التحديث") }
    } catch (e) {
      setError((e as Error).message)
      await load() // revert to server truth on failure
    } finally {
      setBusy(false)
    }
  }

  const addReason = async () => {
    if (!newReason.code || !newReason.nameAr) { setError("الكود والاسم مطلوبان"); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/institute/course-result-reasons`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newReason, appliesTo: newReason.appliesTo || null }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "فشل الإضافة") }
      setNewReason({ code: "", nameAr: "", category: "FAIL", appliesTo: "" })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const deleteReason = async (id: string) => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/institute/course-result-reasons?id=${id}`, { method: "DELETE" })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "فشل الحذف") }
      await load()
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
          جدول القواعد القابل للتهيئة: لكل حالة نتيجة خصائص (المعدل / الساعات / المحاولة / الإجراء) يقرؤها السيستم لإنتاج النتيجة تلقائيًا
        </p>
      </div>

      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}

      <Tabs defaultValue="statuses">
        <TabsList>
          <TabsTrigger value="statuses"><Settings2 className="w-4 h-4 ml-1" /> حالات النتيجة</TabsTrigger>
          <TabsTrigger value="reasons"><Sliders className="w-4 h-4 ml-1" /> أسباب النتيجة</TabsTrigger>
        </TabsList>

        {/* --- Status rules table --- */}
        <TabsContent value="statuses">
          <Card>
            <CardHeader>
              <CardTitle>جدول قواعد الحالات</CardTitle>
              <CardDescription>عدّل خصائص كل حالة. تنطبق التغييرات فورًا على احتساب المعدل والساعات والمحاولات والإجراءات.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">جارٍ التحميل...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الكود</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead className="text-center">نقاط</TableHead>
                        <TableHead className="text-center">المعدل GPA</TableHead>
                        <TableHead className="text-center">ساعات معتمدة</TableHead>
                        <TableHead className="text-center">تُحتسب محاولة</TableHead>
                        <TableHead className="text-center">تحتاج إجراء</TableHead>
                        <TableHead className="text-center w-44">الإجراء التالي</TableHead>
                        <TableHead className="text-center">استثنائية</TableHead>
                        <TableHead className="text-center">منتهية</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statuses.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell><Badge variant={s.isLetter ? "secondary" : "outline"} className="font-mono">{s.code}</Badge></TableCell>
                          <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                          <TableCell className="text-center">
                            <Input type="number" step="0.01" className="w-16 text-center mx-auto"
                              value={s.points ?? ""} placeholder="—"
                              onChange={(e) => setStatuses((prev) => prev.map((x) => x.id === s.id ? { ...x, points: e.target.value === "" ? null : Number(e.target.value) } : x))}
                              onBlur={(e) => patchStatus(s.id, { points: e.target.value === "" ? null : Number(e.target.value) })} />
                          </TableCell>
                          <TableCell className="text-center"><Switch checked={s.affectsGpa} onCheckedChange={(v) => patchStatus(s.id, { affectsGpa: v })} /></TableCell>
                          <TableCell className="text-center"><Switch checked={s.isPass} onCheckedChange={(v) => patchStatus(s.id, { isPass: v })} /></TableCell>
                          <TableCell className="text-center"><Switch checked={s.countsAttempt} onCheckedChange={(v) => patchStatus(s.id, { countsAttempt: v })} /></TableCell>
                          <TableCell className="text-center"><Switch checked={s.needsAction} onCheckedChange={(v) => patchStatus(s.id, { needsAction: v })} /></TableCell>
                          <TableCell>
                            <Select value={s.nextAction ?? "NONE"} onValueChange={(v) => patchStatus(s.id, { nextAction: v })}>
                              <SelectTrigger className="w-40 mx-auto"><SelectValue /></SelectTrigger>
                              <SelectContent>{NEXT_ACTIONS.map((a) => <SelectItem key={a} value={a}>{NEXT_ACTION_LABEL[a]}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center"><Switch checked={s.isException} onCheckedChange={(v) => patchStatus(s.id, { isException: v })} /></TableCell>
                          <TableCell className="text-center"><Switch checked={s.isFinal} onCheckedChange={(v) => patchStatus(s.id, { isFinal: v })} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
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
