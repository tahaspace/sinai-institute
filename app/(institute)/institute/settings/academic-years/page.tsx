"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { CalendarRange, Plus, Trash2, CheckCircle2, Star } from "lucide-react"

export default function AcademicYearsSettingsPage() {
  const [years, setYears] = useState<string[]>([])
  const [current, setCurrent] = useState<string>("")
  const [newYear, setNewYear] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/institute/academic-years")
      if (!r.ok) throw new Error("فشل التحميل")
      const j = await r.json(); setYears(j.years ?? []); setCurrent(j.current ?? "")
    } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  async function act(action: "add" | "remove" | "setCurrent", year: string) {
    setBusy(year || action); setError(null)
    try {
      const r = await fetch("/api/institute/academic-years", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, year }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || "فشل الإجراء")
      setYears(j.years ?? []); setCurrent(j.current ?? "")
      if (action === "add") setNewYear("")
    } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarRange className="w-7 h-7 text-institute-blue" /> السنوات الدراسية</h1>
        <p className="text-muted-foreground">قائمة الأعوام الأكاديمية المُفعّلة — تُستخدم في تسجيل الطلاب الجدد وترحيل الطلاب لضمان ربط البيانات بسنة واحدة موحّدة.</p>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600 flex items-center justify-between"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => setError(null)}>إغلاق</Button></CardContent></Card>}

      <Card>
        <CardHeader><CardTitle>إضافة سنة دراسية</CardTitle><CardDescription>الصيغة: 2026-2027</CardDescription></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="2026-2027" value={newYear} onChange={(e) => setNewYear(e.target.value)} className="max-w-xs" />
          <Button disabled={!newYear.trim() || busy !== null} onClick={() => act("add", newYear.trim())}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الأعوام المُفعّلة</CardTitle><CardDescription>حدّد العام الحالي بالنجمة</CardDescription></CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border">
            {years.length === 0 ? <div className="p-4 text-center text-muted-foreground text-sm">لا توجد أعوام بعد</div> :
              years.map((y) => (
                <div key={y} className="flex items-center justify-between p-3">
                  <span className="flex items-center gap-2 font-medium">{y}{y === current && <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 ml-1" /> الحالي</Badge>}</span>
                  <div className="flex gap-1">
                    {y !== current && <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => act("setCurrent", y)} title="تعيين كعام حالي"><Star className="w-4 h-4 text-amber-500" /></Button>}
                    <Button variant="ghost" size="icon" disabled={busy !== null} onClick={() => act("remove", y)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
