"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ClipboardList, Save } from "lucide-react"

const SETTINGS_KEY = "institute.creditHours"

type CreditHoursSettings = {
  minHours: string
  maxHours: string
  maxHonorsHours: string
  maxWarnedHours: string
  minPassGpa: string
  firstWarningGpa: string
  secondWarningGpa: string
  dismissalGpa: string
  allowEarlyRegistration: boolean
  allowLateRegistration: boolean
  autoDropOnAbsence: boolean
  warningNotifications: boolean
}

const defaultSettings: CreditHoursSettings = {
  minHours: "12",
  maxHours: "21",
  maxHonorsHours: "24",
  maxWarnedHours: "14",
  minPassGpa: "2.00",
  firstWarningGpa: "2.00",
  secondWarningGpa: "1.75",
  dismissalGpa: "1.50",
  allowEarlyRegistration: true,
  allowLateRegistration: false,
  autoDropOnAbsence: true,
  warningNotifications: true,
}

export default function CreditHoursSettingsPage() {
  const [settings, setSettings] = useState<CreditHoursSettings>(defaultSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/settings?key=${encodeURIComponent(SETTINGS_KEY)}`)
        if (!res.ok) return
        const data = await res.json()
        const value = data?.value
        if (!cancelled && value && typeof value === "object" && Object.keys(value).length > 0) {
          setSettings((prev) => ({ ...prev, ...value }))
        }
      } catch {
        // ignore load failures — fall back to defaults
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const update = <K extends keyof CreditHoursSettings>(field: K, value: CreditHoursSettings[K]) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: SETTINGS_KEY, value: settings }),
      })
      if (!res.ok) throw new Error("save failed")
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError("فشل في حفظ الإعدادات")
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
            إعدادات نظام الساعات المعتمدة
          </h1>
          <p className="text-muted-foreground">تكوين نظام الساعات المعتمدة والتسجيل</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">تم الحفظ</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 ml-2" />
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Registration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات التسجيل</CardTitle>
            <CardDescription>تحديد قواعد تسجيل المقررات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>الحد الأدنى للساعات في الفصل</Label>
              <Input
                type="number"
                value={settings.minHours}
                onChange={(e) => update("minHours", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>الحد الأقصى للساعات في الفصل</Label>
              <Input
                type="number"
                value={settings.maxHours}
                onChange={(e) => update("maxHours", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>الحد الأقصى للطالب المتفوق (GPA ≥ 3.5)</Label>
              <Input
                type="number"
                value={settings.maxHonorsHours}
                onChange={(e) => update("maxHonorsHours", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>الحد الأقصى للطالب المنذر</Label>
              <Input
                type="number"
                value={settings.maxWarnedHours}
                onChange={(e) => update("maxWarnedHours", e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* GPA Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات المعدل التراكمي</CardTitle>
            <CardDescription>تحديد حدود التقديرات والإنذارات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>الحد الأدنى للنجاح (GPA)</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.minPassGpa}
                onChange={(e) => update("minPassGpa", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>حد الإنذار الأول</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.firstWarningGpa}
                onChange={(e) => update("firstWarningGpa", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>حد الإنذار الثاني</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.secondWarningGpa}
                onChange={(e) => update("secondWarningGpa", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>حد الفصل</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.dismissalGpa}
                onChange={(e) => update("dismissalGpa", e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Grade Scale */}
        <Card>
          <CardHeader>
            <CardTitle>مقياس التقديرات</CardTitle>
            <CardDescription>نظام النقاط والتقديرات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { grade: "A+", points: "4.00", range: "90-100%" },
                { grade: "A", points: "3.75", range: "85-89%" },
                { grade: "B+", points: "3.50", range: "80-84%" },
                { grade: "B", points: "3.00", range: "75-79%" },
                { grade: "C+", points: "2.50", range: "70-74%" },
                { grade: "C", points: "2.00", range: "65-69%" },
                { grade: "D+", points: "1.50", range: "60-64%" },
                { grade: "D", points: "1.00", range: "50-59%" },
                { grade: "F", points: "0.00", range: "أقل من 50%" },
              ].map((item) => (
                <div key={item.grade} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="font-bold">{item.grade}</Badge>
                  <span className="text-sm">{item.range}</span>
                  <Badge className="bg-institute-blue text-institute-blue">{item.points}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات متقدمة</CardTitle>
            <CardDescription>خيارات إضافية للنظام</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">السماح بالتسجيل المبكر</p>
                <p className="text-sm text-muted-foreground">للطلاب المتفوقين</p>
              </div>
              <Switch
                checked={settings.allowEarlyRegistration}
                onCheckedChange={(v) => update("allowEarlyRegistration", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">التسجيل المتأخر</p>
                <p className="text-sm text-muted-foreground">بعد انتهاء الفترة الرسمية</p>
              </div>
              <Switch
                checked={settings.allowLateRegistration}
                onCheckedChange={(v) => update("allowLateRegistration", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">حذف المقرر تلقائياً</p>
                <p className="text-sm text-muted-foreground">عند تجاوز حد الغياب</p>
              </div>
              <Switch
                checked={settings.autoDropOnAbsence}
                onCheckedChange={(v) => update("autoDropOnAbsence", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">إشعارات الإنذار</p>
                <p className="text-sm text-muted-foreground">تنبيه الطلاب والأولياء</p>
              </div>
              <Switch
                checked={settings.warningNotifications}
                onCheckedChange={(v) => update("warningNotifications", v)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
