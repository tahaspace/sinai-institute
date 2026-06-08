"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarPlus, Save, Send, XCircle, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface SectionRow {
  id: string
  code: string
  instructor: string
  day: string | null
  startMin: number | null
  endMin: number | null
  room: string | null
  capacity: number
  taken: number
}
interface CatalogRow {
  offeringId: string
  courseId: string
  code: string
  name: string
  creditHours: number
  requirementType: string
  prerequisites: string[]
  passed: boolean
  sections: SectionRow[]
}
interface Issue { rule: string; message: string; severity: "error" | "warning" }
interface Validation { ok: boolean; issues: Issue[]; totalHours: number; maxHours: number; minHours: number }
interface RegResponse {
  term: { academicYear: string; semester: string }
  student: { studentCode: string; name: string; level: number }
  standing: { cgpa: number; onProbation: boolean; hourCap: number | null } | null
  catalog: CatalogRow[]
  request: { id: string; status: string; note: string | null; sectionIds: string[] } | null
  validation: Validation
}

const DAYS: Record<string, string> = { sun: "الأحد", mon: "الإثنين", tue: "الثلاثاء", wed: "الأربعاء", thu: "الخميس" }
const fmt = (m: number | null) => (m == null ? "" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`)
const SEM: Record<string, string> = { first: "الأول", second: "الثاني", summer: "الصيفي" }

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  Draft: { label: "مسودة", cls: "bg-gray-100 text-gray-700" },
  Pending: { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-700" },
  Approved: { label: "معتمد", cls: "bg-green-100 text-green-700" },
  Rejected: { label: "مرفوض", cls: "bg-red-100 text-red-700" },
  Returned: { label: "مُعاد للتعديل", cls: "bg-orange-100 text-orange-700" },
  Cancelled: { label: "ملغي", cls: "bg-gray-100 text-gray-500" },
}

export default function RegistrationPage() {
  const [data, setData] = useState<RegResponse | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/student/registration`)
      if (!res.ok) throw new Error("فشل في تحميل التسجيل")
      const json = (await res.json()) as RegResponse
      setData(json)
      setSelected(new Set(json.request?.sectionIds ?? []))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // one section per offering: selecting a section deselects others in the same offering
  const toggle = (offering: CatalogRow, sectionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const wasSelected = next.has(sectionId)
      offering.sections.forEach((s) => next.delete(s.id))
      if (!wasSelected) next.add(sectionId)
      return next
    })
  }

  const locked = data?.request?.status === "Approved" || data?.request?.status === "Pending"

  const selectedCourses = data?.catalog.filter((c) => c.sections.some((s) => selected.has(s.id))) ?? []
  const totalHours = selectedCourses.reduce((s, c) => s + c.creditHours, 0)

  const save = async (action: "save" | "submit" | "cancel") => {
    setBusy(true); setError(null); setNotice(null)
    try {
      const res = await fetch(`/api/student/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sectionIds: [...selected] }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "فشل في حفظ التسجيل")
        if (json.validation) setData((d) => (d ? { ...d, validation: json.validation } : d))
      } else {
        setNotice(action === "submit" ? "تم إرسال الطلب للمرشد الأكاديمي" : action === "cancel" ? "تم إلغاء الطلب" : "تم حفظ المسودة")
        await load()
      }
    } catch {
      setError("فشل في الاتصال بالخادم")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarPlus className="w-7 h-7 text-blue-600" />
            تسجيل المقررات
          </h1>
          <p className="text-muted-foreground">
            {data ? `الفصل ${SEM[data.term.semester] ?? data.term.semester} — ${data.term.academicYear}` : "اختيار الشُعب وإرسال الطلب للمرشد الأكاديمي"}
          </p>
        </div>
        {data?.request && (
          <Badge className={STATUS_LABEL[data.request.status]?.cls}>
            حالة الطلب: {STATUS_LABEL[data.request.status]?.label ?? data.request.status}
          </Badge>
        )}
      </div>

      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}
      {notice && <Card><CardContent className="p-4 text-center text-green-700">{notice}</CardContent></Card>}
      {data?.request?.note && (data.request.status === "Rejected" || data.request.status === "Returned") && (
        <Card className="border-r-4 border-r-orange-500">
          <CardContent className="p-4"><span className="font-semibold">ملاحظة المرشد: </span>{data.request.note}</CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ التحميل...</CardContent></Card>
      ) : !data ? null : (
        <>
          {/* summary bar */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">{totalHours}</span>
                <span className="text-muted-foreground text-sm">/ {data.validation.maxHours} ساعة</span>
              </div>
              {data.standing?.onProbation && (
                <Badge className="bg-amber-100 text-amber-700">تحت الملاحظة — حد {data.standing.hourCap} ساعة</Badge>
              )}
              <div className="flex-1" />
              <Button variant="outline" disabled={busy || locked} onClick={() => save("save")}>
                <Save className="w-4 h-4 ml-2" /> حفظ المسودة
              </Button>
              <Button disabled={busy || locked} onClick={() => save("submit")}>
                <Send className="w-4 h-4 ml-2" /> إرسال للمرشد
              </Button>
              {data.request && data.request.status !== "Approved" && data.request.status !== "Cancelled" && (
                <Button variant="outline" disabled={busy} onClick={() => save("cancel")} className="text-red-600">
                  <XCircle className="w-4 h-4 ml-2" /> إلغاء
                </Button>
              )}
            </CardContent>
          </Card>

          {/* validation issues */}
          {selected.size > 0 && data.validation.issues.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                {data.validation.issues.map((iss, i) => (
                  <div key={i} className={cn("flex items-center gap-2 text-sm", iss.severity === "error" ? "text-red-700" : "text-amber-700")}>
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {iss.message}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {selected.size > 0 && data.validation.ok && (
            <Card><CardContent className="p-4 flex items-center gap-2 text-green-700"><CheckCircle2 className="w-4 h-4" /> الاختيار مستوفٍ لقواعد التسجيل</CardContent></Card>
          )}

          {/* catalog */}
          <Card>
            <CardHeader>
              <CardTitle>المقررات المتاحة</CardTitle>
              <CardDescription>اختر شعبة واحدة لكل مقرر</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.catalog.length === 0 && <div className="text-center text-muted-foreground py-8">لا توجد مقررات معروضة لهذا الفصل</div>}
              {data.catalog.map((c) => (
                <div key={c.offeringId} className="border rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{c.code}</span>
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="outline">{c.creditHours} ساعات</Badge>
                      <Badge variant="outline">{c.requirementType === "elective" ? "اختياري" : "إجباري"}</Badge>
                      {c.prerequisites.length > 0 && <Badge variant="outline" className="text-xs">متطلب: {c.prerequisites.join("، ")}</Badge>}
                      {c.passed && <Badge className="bg-green-100 text-green-700">سبق اجتيازه</Badge>}
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {c.sections.map((s) => {
                      const isSel = selected.has(s.id)
                      const full = s.taken >= s.capacity
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={locked}
                          onClick={() => toggle(c, s.id)}
                          className={cn(
                            "text-right border rounded-md p-3 transition-colors",
                            isSel ? "border-blue-500 bg-blue-50" : "hover:bg-muted/50",
                            locked && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">شعبة {s.code}</span>
                            {isSel && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {s.day ? `${DAYS[s.day] ?? s.day} ${fmt(s.startMin)}–${fmt(s.endMin)}` : "بدون موعد"}
                            {s.room ? ` · ${s.room}` : ""}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {s.instructor} · {s.taken}/{s.capacity} {full && <span className="text-red-600">(ممتلئة)</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
