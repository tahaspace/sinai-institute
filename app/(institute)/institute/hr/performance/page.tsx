"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Gauge, Plus, Trash2 } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const TARGET: Record<string, string> = { ALL: "الكل", ADMIN: "إداريون", FACULTY: "هيئة تدريس" }
const PERIOD: Record<string, string> = { ANNUAL: "سنوي", SEMI: "نصف سنوي", QUARTERLY: "ربع سنوي", MONTHLY: "شهري" }
const REC: Record<string, string> = { PROMOTION: "ترقية", BONUS: "مكافأة", TRAINING: "تدريب", WARNING: "إنذار", FOLLOWUP: "متابعة" }

export default function PerformancePage() {
  const [templates, setTemplates] = useState<Any[]>([])
  const [reviews, setReviews] = useState<Any[]>([])
  const [staff, setStaff] = useState<Any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  // template builder
  const [tpl, setTpl] = useState<{ nameAr: string; target: string; criteria: { nameAr: string; weight: string }[] }>({ nameAr: "", target: "ALL", criteria: [{ nameAr: "", weight: "" }] })
  // evaluation
  const [ev, setEv] = useState<Record<string, Any>>({ periodType: "ANNUAL" })
  const [scores, setScores] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setError(null)
    try {
      const [t, r, s] = await Promise.all([fetch("/api/institute/hr/performance/templates"), fetch("/api/institute/hr/performance"), fetch("/api/institute/hr/employees")])
      if (!t.ok) throw new Error((await t.json()).error)
      setTemplates((await t.json()).templates ?? [])
      if (r.ok) setReviews((await r.json()).reviews ?? [])
      if (s.ok) setStaff((await s.json()).employees ?? [])
    } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  const post = async (url: string, payload: Any, done: () => void) => {
    setError(null); setMsg(null)
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const j = await r.json(); if (!r.ok) { setError(j.error || "فشل"); return }
    done(); load(); return j
  }
  const critWeight = tpl.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0)
  const saveTemplate = () => {
    const criteria = tpl.criteria.filter((c) => c.nameAr).map((c) => ({ nameAr: c.nameAr, weight: Number(c.weight) || 0 }))
    if (!tpl.nameAr || !criteria.length) { setError("اسم النموذج وبند واحد على الأقل مطلوب"); return }
    post("/api/institute/hr/performance/templates", { nameAr: tpl.nameAr, target: tpl.target, criteria }, () => setTpl({ nameAr: "", target: "ALL", criteria: [{ nameAr: "", weight: "" }] }))
  }
  const selTpl = templates.find((t) => t.id === ev.templateId)
  const previewTotal = () => {
    if (!selTpl) return 0
    let w = 0, tw = 0
    for (const c of selTpl.criteria) { w += (Number(scores[c.id]) || 0) * c.weight; tw += c.weight }
    return tw > 0 ? Math.round((w / tw) * 10) / 10 : 0
  }
  const saveReview = async () => {
    if (!ev.employeeId || !ev.templateId || !ev.period) { setError("الموظف والنموذج والفترة مطلوبة"); return }
    const scoreArr = (selTpl?.criteria ?? []).map((c: Any) => ({ criterionId: c.id, score: Number(scores[c.id]) || 0 }))
    const j = await post("/api/institute/hr/performance", { ...ev, scores: scoreArr }, () => { setEv({ periodType: "ANNUAL" }); setScores({}) })
    if (j) setMsg(`تم الحفظ — النتيجة ${j.totalScore} (${j.grade})`)
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Gauge className="w-7 h-7 text-institute-blue" /> تقييم الأداء</h1>
        <p className="text-muted-foreground">نماذج التقييم بالأوزان + تقييمات العاملين والنتائج والتوصيات</p></div>
      {error && <Card><CardContent className="p-3 text-center text-red-600">{error}</CardContent></Card>}
      {msg && <Card><CardContent className="p-3 text-center text-green-600">{msg}</CardContent></Card>}

      {/* Template builder */}
      <Card><CardHeader className="pb-2"><CardTitle className="text-base">نماذج التقييم</CardTitle><CardDescription>البنود وأوزانها (يُفضّل أن يكون المجموع 100)</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <Input className="w-52" placeholder="اسم النموذج" value={tpl.nameAr} onChange={(e) => setTpl((p) => ({ ...p, nameAr: e.target.value }))} />
            <Select value={tpl.target} onValueChange={(v) => setTpl((p) => ({ ...p, target: v }))}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TARGET).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            <Badge variant={critWeight === 100 ? "default" : "outline"}>مجموع الأوزان: {critWeight}%</Badge>
          </div>
          {tpl.criteria.map((c, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input className="w-64" placeholder="اسم البند (الانضباط…)" value={c.nameAr} onChange={(e) => setTpl((p) => { const cr = [...p.criteria]; cr[i] = { ...cr[i], nameAr: e.target.value }; return { ...p, criteria: cr } })} />
              <Input className="w-24" placeholder="الوزن %" value={c.weight} onChange={(e) => setTpl((p) => { const cr = [...p.criteria]; cr[i] = { ...cr[i], weight: e.target.value }; return { ...p, criteria: cr } })} />
              <button className="text-red-500" onClick={() => setTpl((p) => ({ ...p, criteria: p.criteria.filter((_, j) => j !== i) }))}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setTpl((p) => ({ ...p, criteria: [...p.criteria, { nameAr: "", weight: "" }] }))}><Plus className="w-4 h-4 ml-1" /> بند</Button>
            <Button size="sm" onClick={saveTemplate}>حفظ النموذج</Button>
          </div>
          <div className="flex flex-wrap gap-2">{templates.map((t) => <Badge key={t.id} variant="outline">{t.nameAr} · {TARGET[t.target] ?? t.target} ({t.criteria.length} بند)</Badge>)}</div>
        </CardContent>
      </Card>

      {/* New evaluation */}
      <Card><CardHeader className="pb-2"><CardTitle className="text-base">تقييم جديد</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <Select value={ev.employeeId ?? ""} onValueChange={(v) => setEv((p) => ({ ...p, employeeId: v }))}><SelectTrigger className="w-52"><SelectValue placeholder="الموظف" /></SelectTrigger><SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.nameAr}</SelectItem>)}</SelectContent></Select>
            <Select value={ev.templateId ?? ""} onValueChange={(v) => { setEv((p) => ({ ...p, templateId: v })); setScores({}) }}><SelectTrigger className="w-52"><SelectValue placeholder="النموذج" /></SelectTrigger><SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.nameAr}</SelectItem>)}</SelectContent></Select>
            <Input className="w-40" placeholder="الفترة (2026 سنوي)" value={ev.period ?? ""} onChange={(e) => setEv((p) => ({ ...p, period: e.target.value }))} />
            <Select value={ev.periodType ?? "ANNUAL"} onValueChange={(v) => setEv((p) => ({ ...p, periodType: v }))}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PERIOD).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
          </div>
          {selTpl && (
            <div className="space-y-2 border-t pt-3">
              {selTpl.criteria.map((c: Any) => (
                <div key={c.id} className="flex items-center gap-3"><span className="w-64">{c.nameAr} <span className="text-muted-foreground text-xs">({c.weight}%)</span></span>
                  <Input type="number" className="w-28" placeholder="0-100" value={scores[c.id] ?? ""} onChange={(e) => setScores((p) => ({ ...p, [c.id]: e.target.value }))} /></div>
              ))}
              <div className="flex items-center gap-3 pt-1">
                <Badge>النتيجة المتوقعة: {previewTotal()}</Badge>
                <Select value={ev.recommendation ?? "none"} onValueChange={(v) => setEv((p) => ({ ...p, recommendation: v === "none" ? "" : v }))}><SelectTrigger className="w-40"><SelectValue placeholder="التوصية" /></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{Object.entries(REC).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
                <Button onClick={saveReview}>حفظ التقييم</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card><CardHeader className="pb-2"><CardTitle className="text-base">التقييمات السابقة</CardTitle></CardHeader>
        <CardContent>{reviews.length === 0 ? <p className="p-4 text-center text-muted-foreground">لا توجد تقييمات</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead>الفترة</TableHead><TableHead className="text-center">النتيجة</TableHead><TableHead className="text-center">التقدير</TableHead><TableHead className="text-center">التوصية</TableHead></TableRow></TableHeader>
            <TableBody>{reviews.map((r) => <TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell>{r.period}</TableCell><TableCell className="text-center font-mono">{r.totalScore}</TableCell><TableCell className="text-center"><Badge variant="outline">{r.grade}</Badge></TableCell><TableCell className="text-center">{r.recommendation ? REC[r.recommendation] ?? r.recommendation : "—"}</TableCell></TableRow>)}</TableBody>
          </Table>
        )}</CardContent>
      </Card>
    </div>
  )
}
