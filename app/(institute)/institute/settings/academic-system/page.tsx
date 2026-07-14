"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const SYSTEMS: { value: string; label: string }[] = [
  { value: "CREDIT_HOURS", label: "نظام الساعات المعتمدة" },
  { value: "ANNUAL", label: "النظام السنوي (العادي)" },
]

export default function AcademicSystemSettingsPage() {
  const [programs, setPrograms] = useState<Any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await fetch("/api/institute/programs")
      const j = await r.json(); if (!r.ok) throw new Error(j.error)
      setPrograms(j.programs ?? [])
    } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  const setSystem = async (id: string, academicSystem: string) => {
    setError(null); setMsg(null)
    setPrograms((prev) => prev.map((p) => (p.id === id ? { ...p, academicSystem } : p)))
    const r = await fetch("/api/institute/programs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, academicSystem }) })
    if (!r.ok) { setError((await r.json()).error || "فشل الحفظ"); load(); return }
    setMsg("تم حفظ النظام الأكاديمي للبرنامج")
  }

  const annual = programs.filter((p) => p.academicSystem === "ANNUAL").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="w-7 h-7 text-institute-blue" /> النظام الأكاديمي للبرامج</h1>
        <p className="text-muted-foreground">حدّد لكل برنامج نظامه: نظام الساعات المعتمدة أو النظام السنوي (العادي). يُطبَّق النظام على نتائج وتقارير البرنامج.</p>
      </div>
      {error && <Card><CardContent className="p-3 text-center text-red-600">{error}</CardContent></Card>}
      {msg && <Card><CardContent className="p-3 text-center text-green-600">{msg}</CardContent></Card>}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">البرامج ({programs.length})</CardTitle>
          <CardDescription>{annual > 0 ? `${annual} برنامج بالنظام السنوي · ${programs.length - annual} بالساعات المعتمدة` : "كل البرامج حالياً بنظام الساعات المعتمدة"}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {programs.length === 0 ? <p className="p-8 text-center text-muted-foreground">لا توجد برامج</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>البرنامج</TableHead><TableHead>القسم</TableHead><TableHead className="text-center">الطلاب</TableHead><TableHead>النظام الأكاديمي</TableHead></TableRow></TableHeader>
              <TableBody>
                {programs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nameAr}</TableCell>
                    <TableCell>{p.department || "—"}</TableCell>
                    <TableCell className="text-center">{p.students}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select value={p.academicSystem ?? "CREDIT_HOURS"} onValueChange={(v) => setSystem(p.id, v)}>
                          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                          <SelectContent>{SYSTEMS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                        {p.academicSystem === "ANNUAL" && <Badge variant="secondary">سنوي</Badge>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card><CardContent className="p-4 text-sm text-muted-foreground">
        ملاحظة: تغيير النظام يؤثر على طريقة عرض النتائج والتقارير للبرنامج. حالياً (المرحلة الأولى) يتم حفظ النظام وإظهاره في الشريط العلوي؛ محرك النتائج السنوية وتقاريره يُضاف في المراحل التالية.
      </CardContent></Card>
    </div>
  )
}
