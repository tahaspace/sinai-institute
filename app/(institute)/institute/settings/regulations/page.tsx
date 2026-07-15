"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Scale, Save, Loader2 } from "lucide-react"

// Edits the bylaw thresholds that lib/regulations.ts reads from Setting key
// "institute.regulations". Until now these were only changeable via direct DB
// writes; this screen makes them configurable from the UI through the generic
// /api/settings GET/PATCH endpoint. Unset values fall back to the documented
// defaults below (shown as placeholders), exactly as getRegulations() merges them.
const SETTINGS_KEY = "institute.regulations"

// Mirror of DEFAULT_REGULATIONS in lib/regulations.ts (kept in sync). Used as the
// placeholder/fallback so an admin sees the bylaw baseline before overriding.
const DEFAULT_REGULATIONS = {
  probationGpa: 2.0,
  probationHourCap: 12,
  minRegHours: 12,
  maxRegHours: 18,
  summerMaxHours: 9,
  maxCourseAttempts: 3,
  maxConsecutiveProbation: 3,
  maxSeparateProbation: 4,
  honorCgpa: 3.33,
  honorTermGpa: 3.0,
  absenceBanPercent: 25,
  attendanceWarnThreshold: 75,
  withdrawWeek: 12,
  writtenMinPercent: 30,
  incompleteCourseworkPercent: 60,
  graduationHours: 132,
  levelMinHours: { "1": 0, "2": 30, "3": 66, "4": 99 } as Record<string, number>,
  annualPassPercent: 50,
  maxCarryOverSubjects: 2,
  annualExcellentMin: 85,
  annualVeryGoodMin: 75,
  annualGoodMin: 65,
}

type RegKey = Exclude<keyof typeof DEFAULT_REGULATIONS, "levelMinHours">

// Scalar threshold fields grouped by bylaw concern, each with an Arabic label and a
// short note. `step` lets GPA-style fields accept decimals; the rest are integers.
type FieldDef = { key: RegKey; label: string; note: string; step?: string }

const FIELD_GROUPS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: "الإنذار الأكاديمي",
    description: "حدود المعدل التراكمي والإنذارات",
    fields: [
      { key: "probationGpa", label: "معدل الإنذار التراكمي (CGPA)", note: "أقل من هذا المعدل ← إنذار أكاديمي", step: "0.01" },
      { key: "probationHourCap", label: "الحد الأقصى لساعات الطالب المنذر", note: "أقصى ساعات مسموح بها أثناء الإنذار" },
      { key: "maxConsecutiveProbation", label: "أقصى إنذارات متتالية", note: "إنذارات متتالية ← تحويل مسار / فصل" },
      { key: "maxSeparateProbation", label: "أقصى إنذارات منفصلة", note: "إنذارات غير متتالية (باستثناء الصيفي)" },
    ],
  },
  {
    title: "أعباء التسجيل",
    description: "الحد الأدنى والأقصى لساعات الفصل",
    fields: [
      { key: "minRegHours", label: "الحد الأدنى لساعات الفصل العادي", note: "أقل مجموع ساعات للتسجيل العادي" },
      { key: "maxRegHours", label: "الحد الأقصى لساعات الفصل العادي", note: "أقصى عدد ساعات في الفصل العادي" },
      { key: "summerMaxHours", label: "الحد الأقصى لساعات الفصل الصيفي", note: "أقصى عدد ساعات في الفصل الصيفي" },
      { key: "maxCourseAttempts", label: "أقصى عدد محاولات المقرر", note: "رسوب متكرر بهذا العدد يمنع إعادة التسجيل" },
    ],
  },
  {
    title: "التفوق ومرتبة الشرف",
    description: "حدود لائحة الشرف",
    fields: [
      { key: "honorCgpa", label: "معدل الشرف التراكمي (CGPA)", note: "مرتبة شرف عند معدل تراكمي ≥ هذا", step: "0.01" },
      { key: "honorTermGpa", label: "معدل الشرف الفصلي (GPA)", note: "أو معدل فصلي ≥ هذا (بنجاح كل الإجباري)", step: "0.01" },
    ],
  },
  {
    title: "الحضور والامتحانات",
    description: "نسب الغياب والدرجات الدنيا",
    fields: [
      { key: "absenceBanPercent", label: "نسبة الغياب للحرمان (%)", note: "غياب أعلى من هذه النسبة ← محروم" },
      { key: "attendanceWarnThreshold", label: "عتبة تحذير الحضور (%)", note: "حضور عند/أقل من هذه النسبة ← تقرير تحذير" },
      { key: "withdrawWeek", label: "آخر أسبوع للانسحاب", note: "آخر أسبوع يمكن فيه الانسحاب (W)" },
      { key: "writtenMinPercent", label: "الحد الأدنى للامتحان التحريري (%)", note: "أقل من هذا ← رسوب لجنة (BL) حتى لو نجح الإجمالي" },
      { key: "incompleteCourseworkPercent", label: "أدنى نسبة أعمال الفصل للمستمر (%)", note: "أقل نسبة أعمال فصل لاستحقاق تقدير غير مكتمل (I)" },
    ],
  },
  {
    title: "التخرج والمستويات",
    description: "ساعات التخرج وحدود الترقي",
    fields: [
      { key: "graduationHours", label: "إجمالي ساعات التخرج", note: "إجمالي الساعات المعتمدة المطلوبة للتخرج" },
    ],
  },
  {
    title: "النظام السنوي (العادي)",
    description: "قواعد النتيجة السنوية — تُطبَّق على البرامج ذات النظام السنوي فقط",
    fields: [
      { key: "annualPassPercent", label: "نسبة النجاح في المادة (%)", note: "أقل من هذه النسبة ← رسوب في المادة (النظام السنوي)" },
      { key: "maxCarryOverSubjects", label: "أقصى مواد للدور الثاني", note: "رسوب في عدد مواد ≤ هذا ← له دور ثانٍ؛ أكثر ← باقٍ للإعادة" },
      { key: "annualExcellentMin", label: "حد تقدير ممتاز (%)", note: "المجموع/المادة ≥ هذه النسبة ← تقدير ممتاز" },
      { key: "annualVeryGoodMin", label: "حد تقدير جيد جداً (%)", note: "≥ هذه النسبة (وأقل من ممتاز) ← تقدير جيد جداً" },
      { key: "annualGoodMin", label: "حد تقدير جيد (%)", note: "≥ هذه النسبة (وأقل من جيد جداً) ← تقدير جيد؛ ومن نسبة النجاح حتى هنا ← مقبول" },
    ],
  },
]

// Levels a student can be promoted INTO and the minimum EARNED hours each requires.
const LEVEL_KEYS = ["1", "2", "3", "4"] as const

type FormState = {
  scalars: Record<RegKey, string>
  levelMinHours: Record<string, string>
}

// All scalar fields start blank; the input placeholders carry the default so an
// empty field means "use the bylaw default" rather than "set to 0".
function emptyForm(): FormState {
  const scalars = {} as Record<RegKey, string>
  for (const group of FIELD_GROUPS) {
    for (const f of group.fields) scalars[f.key] = ""
  }
  const levelMinHours: Record<string, string> = {}
  for (const lvl of LEVEL_KEYS) levelMinHours[lvl] = ""
  return { scalars, levelMinHours }
}

export default function RegulationsSettingsPage() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/settings?key=${encodeURIComponent(SETTINGS_KEY)}`)
        if (!res.ok) throw new Error("load failed")
        const data = await res.json()
        const value = data?.value
        if (cancelled) return
        // Hydrate only the keys actually stored; missing keys stay blank so their
        // placeholder (the bylaw default) keeps showing.
        if (value && typeof value === "object" && !Array.isArray(value)) {
          setForm((prev) => {
            const scalars = { ...prev.scalars }
            for (const group of FIELD_GROUPS) {
              for (const f of group.fields) {
                const v = (value as Record<string, unknown>)[f.key]
                if (typeof v === "number" || typeof v === "string") scalars[f.key] = String(v)
              }
            }
            const levelMinHours = { ...prev.levelMinHours }
            const storedLevels = (value as Record<string, unknown>).levelMinHours
            if (storedLevels && typeof storedLevels === "object" && !Array.isArray(storedLevels)) {
              for (const lvl of LEVEL_KEYS) {
                const v = (storedLevels as Record<string, unknown>)[lvl]
                if (typeof v === "number" || typeof v === "string") levelMinHours[lvl] = String(v)
              }
            }
            return { scalars, levelMinHours }
          })
        }
      } catch {
        if (!cancelled) setError("فشل في جلب اللائحة")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const updateScalar = (key: RegKey, value: string) =>
    setForm((prev) => ({ ...prev, scalars: { ...prev.scalars, [key]: value } }))

  const updateLevel = (lvl: string, value: string) =>
    setForm((prev) => ({ ...prev, levelMinHours: { ...prev.levelMinHours, [lvl]: value } }))

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      // Build a numeric blob. A blank field is omitted so getRegulations() falls
      // back to its DEFAULT_REGULATIONS for that key (rather than persisting 0).
      const value: Record<string, unknown> = {}
      for (const group of FIELD_GROUPS) {
        for (const f of group.fields) {
          const raw = form.scalars[f.key].trim()
          if (raw === "") continue
          const num = Number(raw)
          if (!Number.isNaN(num)) value[f.key] = num
        }
      }
      const levelMinHours: Record<string, number> = {}
      for (const lvl of LEVEL_KEYS) {
        const raw = form.levelMinHours[lvl].trim()
        if (raw === "") continue
        const num = Number(raw)
        if (!Number.isNaN(num)) levelMinHours[lvl] = num
      }
      if (Object.keys(levelMinHours).length > 0) value.levelMinHours = levelMinHours

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: SETTINGS_KEY, value }),
      })
      if (!res.ok) throw new Error("save failed")
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError("فشل في حفظ اللائحة")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-7 h-7 text-institute-blue" />
            إعدادات اللائحة الأكاديمية
          </h1>
          <p className="text-muted-foreground">
            تعديل حدود اللائحة (الإنذار، التفوق، الحضور، التخرج). الحقول الفارغة تستخدم القيمة الافتراضية.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">تم الحفظ</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="w-4 h-4 ml-2" />
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>جارٍ تحميل اللائحة...</span>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {FIELD_GROUPS.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.fields.map((f) => (
                  <div key={f.key}>
                    <Label>{f.label}</Label>
                    <Input
                      type="number"
                      step={f.step ?? "1"}
                      value={form.scalars[f.key]}
                      placeholder={String(DEFAULT_REGULATIONS[f.key])}
                      onChange={(e) => updateScalar(f.key, e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{f.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Level promotion thresholds — minimum EARNED hours to enter each level. */}
          <Card>
            <CardHeader>
              <CardTitle>الحد الأدنى لساعات الترقي بين المستويات</CardTitle>
              <CardDescription>أقل عدد ساعات معتمدة مكتسبة للترقي إلى كل مستوى</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {LEVEL_KEYS.map((lvl) => (
                <div key={lvl}>
                  <Label>المستوى {lvl}</Label>
                  <Input
                    type="number"
                    step="1"
                    value={form.levelMinHours[lvl]}
                    placeholder={String(DEFAULT_REGULATIONS.levelMinHours[lvl])}
                    onChange={(e) => updateLevel(lvl, e.target.value)}
                    className="mt-1"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
