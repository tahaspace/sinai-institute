"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Search } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
export const HR_STATUS: Record<string, string> = { NEW: "جديد", UNDER_REVIEW: "تحت المراجعة", ACCEPTED: "مقبول", PROBATION: "تحت التمرين", SUSPENDED: "موقوف", INVESTIGATION: "تحت التحقيق", RESIGNED: "استقالة", TERMINATED: "فصل", RETIRED: "تقاعد", DECEASED: "وفاة", CONTRACT_ENDED: "انتهاء عقد", ACTIVE: "على رأس العمل" }

export default function EmployeesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Any[]>([])
  const [opts, setOpts] = useState<{ employeeTypes: Any[]; adminDepartments: Any[] }>({ employeeTypes: [], adminDepartments: [] })
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v))
    try {
      const r = await fetch(`/api/institute/hr/employees?${qs}`); const j = await r.json(); if (!r.ok) throw new Error(j.error)
      setRows(j.employees ?? [])
    } catch (e) { setError((e as Error).message) }
  }, [filters])
  useEffect(() => { load() }, [load])
  useEffect(() => { (async () => { try { const r = await fetch("/api/institute/hr/org"); const j = await r.json(); if (r.ok) setOpts({ employeeTypes: j.employeeTypes ?? [], adminDepartments: j.adminDepartments ?? [] }) } catch { /* org optional */ } })() }, [])

  const create = async () => {
    setError(null)
    if (!form.nameAr) { setError("اسم الموظف مطلوب"); return }
    const r = await fetch("/api/institute/hr/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const j = await r.json(); if (!r.ok) { setError(j.error || "فشل"); return }
    router.push(`/institute/hr/employees/${j.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-7 h-7 text-institute-blue" /> العاملون</h1>
          <p className="text-muted-foreground">دليل العاملين وملفاتهم الكاملة</p>
        </div>
        <Button onClick={() => setShowNew((s) => !s)}><Plus className="w-4 h-4 ml-1" /> موظف جديد</Button>
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}

      {showNew && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">إضافة موظف</CardTitle></CardHeader>
          <CardContent><div className="flex flex-wrap gap-2 items-end">
            <div><label className="text-xs text-muted-foreground">الكود (اختياري)</label><Input className="w-28" value={form.code ?? ""} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">الاسم *</label><Input className="w-52" value={form.nameAr ?? ""} onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">الرقم القومي</label><Input className="w-40" value={form.nationalId ?? ""} onChange={(e) => setForm((p) => ({ ...p, nationalId: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">الهاتف</label><Input className="w-36" value={form.phone ?? ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">النوع</label>
              <Select value={form.employeeTypeId ?? "none"} onValueChange={(v) => setForm((p) => ({ ...p, employeeTypeId: v === "none" ? "" : v }))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{opts.employeeTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.nameAr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={create}>حفظ وفتح الملف</Button>
          </div></CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]"><label className="text-xs text-muted-foreground">بحث (اسم / كود / رقم قومي)</label>
              <div className="relative"><Search className="w-4 h-4 absolute right-2 top-2.5 text-muted-foreground" /><Input className="pr-8" value={filters.q ?? ""} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">الإدارة</label>
              <Select value={filters.adminDepartmentId ?? "all"} onValueChange={(v) => setFilters((p) => ({ ...p, adminDepartmentId: v === "all" ? "" : v }))}>
                <SelectTrigger className="w-44"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent><SelectItem value="all">الكل</SelectItem>{opts.adminDepartments.map((d) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">الحالة</label>
              <Select value={filters.hrStatus ?? "all"} onValueChange={(v) => setFilters((p) => ({ ...p, hrStatus: v === "all" ? "" : v }))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent><SelectItem value="all">الكل</SelectItem>{Object.entries(HR_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto">
            {rows.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا يوجد عاملون</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>النوع</TableHead><TableHead>الإدارة</TableHead><TableHead>الوظيفة</TableHead><TableHead>الهاتف</TableHead><TableHead className="text-center">الحالة</TableHead></TableRow></TableHeader>
                <TableBody>{rows.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer hover:bg-muted" onClick={() => router.push(`/institute/hr/employees/${e.id}`)}>
                    <TableCell className="font-mono"><Link href={`/institute/hr/employees/${e.id}`} className="text-institute-blue hover:underline">{e.code}</Link></TableCell>
                    <TableCell>{e.nameAr}</TableCell><TableCell>{e.type}</TableCell><TableCell>{e.department}</TableCell><TableCell>{e.jobTitle}</TableCell><TableCell>{e.phone ?? "—"}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline">{HR_STATUS[e.hrStatus] ?? e.hrStatus}</Badge></TableCell>
                  </TableRow>))}</TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
