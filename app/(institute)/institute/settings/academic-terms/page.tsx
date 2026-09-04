"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { CalendarDays, Save, Star, Trash2, CheckCircle2 } from "lucide-react"

/**
 * «التقويم الأكاديمي» — the institute types its own term dates here.
 *
 * The bylaw states the shape of a term but not its dates, and every institute runs a different
 * calendar: «فصل التسجيل اسبوع واحد … الدراسه 12 اسبوع … الامتحانات اسبوعان»، «الفصل الصيفي 8 اسابيع
 * مكثف»، «حق الإضافة والحذف خلال الاسبوع الثاني من الدراسة»، «الانسحاب حتي نهايه الاسبوع الثاني عشر».
 * Those week counts are meaningless without a start date — which is exactly why the withdrawal week
 * on the bylaw screen was never enforced. What is entered here is read by the registration engine.
 *
 * The year list comes from the managed list in «السنوات الدراسية» — never a second list.
 * Client component: no server module is imported; everything arrives through the API.
 */

type Term = {
  id: string
  academicYear: string
  termType: string
  label?: string
  nameAr: string | null
  registrationStart: string | null
  registrationEnd: string | null
  teachingStart: string | null
  teachingEnd: string | null
  addDropDeadline: string | null
  withdrawDeadline: string | null
  examsStart: string | null
  examsEnd: string | null
  lateRegistrationFee: number | null
  isCurrent: boolean
}

// No institute's week counts are asserted here: what used to read «اللائحة: حتى نهاية الأسبوع
// الثاني عشر» was Sinai's own number shown to every tenant. The guidance is neutral, and the one
// week number the platform actually stores (withdrawWeek) arrives from this tenant's own
// Regulations through the API — this file stays a client component and imports no server module.
const TERM_TYPES = [
  { type: "first", label: "الفصل الدراسي الأول" },
  { type: "second", label: "الفصل الدراسي الثاني" },
  { type: "summer", label: "الفصل الصيفي" },
]

const DATE_FIELDS: { key: keyof Term; label: string; note?: string }[] = [
  { key: "registrationStart", label: "بداية التسجيل" },
  { key: "registrationEnd", label: "نهاية التسجيل", note: "بعد هذا التاريخ يُعدّ التسجيل متأخراً وتُستحق الغرامة" },
  { key: "teachingStart", label: "بداية الدراسة" },
  { key: "addDropDeadline", label: "آخر موعد للحذف والإضافة", note: "آخر يوم مسموح فيه بالحذف والإضافة — اليوم نفسه محسوب" },
  { key: "withdrawDeadline", label: "آخر موعد للانسحاب", note: "آخر يوم مسموح فيه بالانسحاب — اليوم نفسه محسوب" },
  { key: "teachingEnd", label: "نهاية الدراسة" },
  { key: "examsStart", label: "بداية الامتحانات" },
  { key: "examsEnd", label: "نهاية الامتحانات" },
]

const toInput = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 10) : "")

function emptyTerm(academicYear: string, termType: string): Term {
  return {
    id: "", academicYear, termType, nameAr: null,
    registrationStart: null, registrationEnd: null, teachingStart: null, teachingEnd: null,
    addDropDeadline: null, withdrawDeadline: null, examsStart: null, examsEnd: null,
    lateRegistrationFee: null, isCurrent: false,
  }
}

export default function AcademicTermsSettingsPage() {
  const [years, setYears] = useState<string[]>([])
  const [year, setYear] = useState("")
  const [drafts, setDrafts] = useState<Record<string, Term>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  // أسبوع الانسحاب المُعرَّف في لائحة هذه المؤسسة — يُعرض كإرشاد فقط، والتاريخ المُدخل هو المُلزِم.
  const [withdrawWeek, setWithdrawWeek] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/institute/academic-years")
      .then((r) => r.json())
      .then((j) => { setYears(j.years ?? []); setYear(j.current ?? (j.years ?? [])[0] ?? "") })
      .catch(() => setError("تعذّر تحميل السنوات الدراسية"))
  }, [])

  const load = useCallback(async (y: string) => {
    if (!y) return
    try {
      const r = await fetch(`/api/institute/academic-terms?academicYear=${encodeURIComponent(y)}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || "فشل التحميل")
      const next: Record<string, Term> = {}
      for (const t of TERM_TYPES) next[t.type] = emptyTerm(y, t.type)
      for (const t of (j.terms ?? []) as Term[]) next[t.termType] = { ...emptyTerm(y, t.termType), ...t }
      setDrafts(next)
      setWithdrawWeek(typeof j.regulations?.withdrawWeek === "number" ? j.regulations.withdrawWeek : null)
    } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load(year) }, [year, load])

  const patch = (type: string, k: keyof Term, v: unknown) =>
    setDrafts((d) => ({ ...d, [type]: { ...d[type], [k]: v } as Term }))

  async function save(type: string, opts?: { makeCurrent?: boolean }) {
    const t = drafts[type]
    if (!t) return
    setBusy(type); setError(null); setSaved(null)
    try {
      const body = { ...t, isCurrent: opts?.makeCurrent ?? t.isCurrent }
      const r = await fetch(t.id ? `/api/institute/academic-terms/${t.id}` : "/api/institute/academic-terms", {
        method: t.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || "فشل الحفظ")
      setSaved(type)
      await load(year)
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  async function remove(type: string) {
    const t = drafts[type]
    if (!t?.id) { setDrafts((d) => ({ ...d, [type]: emptyTerm(year, type) })); return }
    setBusy(type); setError(null)
    try {
      const r = await fetch(`/api/institute/academic-terms/${t.id}`, { method: "DELETE" })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || "فشل الحذف")
      await load(year)
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="w-7 h-7 text-institute-blue" /> التقويم الأكاديمي
        </h1>
        <p className="text-muted-foreground">
          مواعيد كل فصل دراسي: التسجيل، الدراسة، الحذف والإضافة، الانسحاب، والامتحانات. هذه المواعيد
          هي ما يعتمد عليه نظام تسجيل المقررات — وبدونها لا يمكن حساب «الأسبوع الثاني عشر» الوارد باللائحة.
          الفصل غير المُعرَّف هنا لا يفرض أي قيد إضافي على التسجيل.
        </p>
      </div>

      {error && (
        <Card><CardContent className="p-4 text-red-600 flex items-center justify-between">
          <span>{error}</span><Button variant="ghost" size="sm" onClick={() => setError(null)}>إغلاق</Button>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>السنة الدراسية</CardTitle>
          <CardDescription>القائمة مُدارة من شاشة «السنوات الدراسية»</CardDescription></CardHeader>
        <CardContent>
          <select
            className="border rounded-md h-10 px-3 text-sm bg-background"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {years.length === 0 && <option value="">لا توجد سنوات مُفعّلة</option>}
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {TERM_TYPES.map(({ type, label }) => {
          const t = drafts[type]
          if (!t) return null
          return (
            <Card key={type} className={t.isCurrent ? "border-green-500" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {label}
                    {t.isCurrent && <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 ml-1" /> الفصل الحالي</Badge>}
                  </span>
                  {!t.id && <Badge variant="outline">غير مُعرَّف</Badge>}
                </CardTitle>
                <CardDescription>
                  {withdrawWeek != null
                    ? `حدّد المواعيد وفق لائحة مؤسستك — أسبوع الانسحاب المُعرَّف باللائحة: ${withdrawWeek}`
                    : "حدّد مواعيد التسجيل والدراسة والحذف والإضافة والانسحاب والامتحانات وفق لائحة مؤسستك"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DATE_FIELDS.map(({ key, label: fl, note }) => (
                  <div key={String(key)} className="space-y-1">
                    <label className="text-sm font-medium">{fl}</label>
                    <Input
                      type="date"
                      value={toInput(t[key])}
                      onChange={(e) => patch(type, key, e.target.value || null)}
                    />
                    {note && <p className="text-xs text-muted-foreground">{note}</p>}
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="text-sm font-medium">غرامة التأخير في التسجيل</label>
                  <Input
                    type="number" min={0} step="0.01"
                    value={t.lateRegistrationFee ?? ""}
                    onChange={(e) => patch(type, "lateRegistrationFee", e.target.value === "" ? null : Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">تُعرض كتنبيه على التسجيل المتأخر ولا تُخصم تلقائياً</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button disabled={busy !== null || !year} onClick={() => save(type)}>
                    <Save className="w-4 h-4 ml-1" /> حفظ
                  </Button>
                  {!t.isCurrent && (
                    <Button variant="outline" disabled={busy !== null || !year} onClick={() => save(type, { makeCurrent: true })}>
                      <Star className="w-4 h-4 ml-1 text-amber-500" /> تعيين كفصل حالي
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" disabled={busy !== null} onClick={() => remove(type)} title="حذف">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                  {saved === type && <span className="text-sm text-green-600 self-center">تم الحفظ</span>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
