"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Plus, Layers, Briefcase } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const URL_ORG = "/api/institute/hr/org"

export default function HrOrgPage() {
  const [data, setData] = useState<Any>({ adminDepartments: [], sections: [], employeeTypes: [], jobTitles: [], positions: [] })
  const [error, setError] = useState<string | null>(null)
  const [dep, setDep] = useState<Record<string, string>>({})
  const [sec, setSec] = useState<Record<string, string>>({})
  const [typ, setTyp] = useState<Record<string, string>>({})
  const [job, setJob] = useState<Record<string, string>>({})
  const [pos, setPos] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try { const r = await fetch(URL_ORG); const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j) } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  const post = async (payload: Any, reset: () => void) => {
    setError(null)
    const r = await fetch(URL_ORG, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const j = await r.json(); if (!r.ok) { setError(j.error || "فشل"); return }
    reset(); load()
  }
  const patch = async (payload: Any) => { await fetch(URL_ORG, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); load() }

  const depName = (id: string) => data.adminDepartments.find((d: Any) => d.id === id)?.nameAr ?? "—"
  const typName = (id: string) => data.employeeTypes.find((t: Any) => t.id === id)?.nameAr ?? "—"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="w-7 h-7 text-institute-blue" /> الهيكل الإداري والوظائف</h1>
        <p className="text-muted-foreground">الإدارات والأقسام وأنواع العاملين والمسميات الوظيفية والمناصب — أساس ملف الموظف</p>
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}

      {/* Employee types */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4" /> أنواع العاملين</CardTitle>
          <CardDescription>الفئات الوظيفية. <Button variant="link" className="h-auto p-0 text-xs" onClick={() => post({ entity: "seed-employee-types" }, () => {})}>إدراج القائمة القياسية</Button></CardDescription></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <div><label className="text-xs text-muted-foreground">الكود</label><Input className="w-24" value={typ.code ?? ""} onChange={(e) => setTyp((p) => ({ ...p, code: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">الاسم</label><Input className="w-48" value={typ.nameAr ?? ""} onChange={(e) => setTyp((p) => ({ ...p, nameAr: e.target.value }))} /></div>
            <Button onClick={() => post({ entity: "employeeType", ...typ }, () => setTyp({}))}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
          </div>
          <div className="flex flex-wrap gap-2">{data.employeeTypes.map((t: Any) => <Badge key={t.id} variant="outline">{t.nameAr}</Badge>)}</div>
        </CardContent>
      </Card>

      {/* Job titles */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">المسميات الوظيفية</CardTitle><CardDescription>مع مستوى السلم الوظيفي (JobLevel) والصفة الأكاديمية/الإدارية</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div><label className="text-xs text-muted-foreground">الكود</label><Input className="w-24" value={job.code ?? ""} onChange={(e) => setJob((p) => ({ ...p, code: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">الاسم</label><Input className="w-44" value={job.nameAr ?? ""} onChange={(e) => setJob((p) => ({ ...p, nameAr: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">المستوى</label><Input type="number" className="w-20" value={job.jobLevel ?? ""} onChange={(e) => setJob((p) => ({ ...p, jobLevel: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">النوع</label>
              <Select value={job.employeeTypeId ?? "none"} onValueChange={(v) => setJob((p) => ({ ...p, employeeTypeId: v === "none" ? "" : v }))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{data.employeeTypes.map((t: Any) => <SelectItem key={t.id} value={t.id}>{t.nameAr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => post({ entity: "jobTitle", ...job, jobLevel: job.jobLevel ? Number(job.jobLevel) : 1 }, () => setJob({}))}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
          </div>
          {data.jobTitles.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>المسمى</TableHead><TableHead className="text-center">المستوى</TableHead><TableHead>النوع</TableHead></TableRow></TableHeader>
              <TableBody>{data.jobTitles.map((t: Any) => <TableRow key={t.id}><TableCell className="font-mono">{t.code}</TableCell><TableCell>{t.nameAr}</TableCell><TableCell className="text-center">{t.jobLevel}</TableCell><TableCell>{t.employeeTypeId ? typName(t.employeeTypeId) : "—"}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Positions */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">المناصب</CardTitle><CardDescription>رئيس قسم / مدير إدارة / وكيل / عميد / أمين عام — منفصلة عن المسمى الوظيفي</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <div><label className="text-xs text-muted-foreground">الكود</label><Input className="w-24" value={pos.code ?? ""} onChange={(e) => setPos((p) => ({ ...p, code: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">الاسم</label><Input className="w-48" value={pos.nameAr ?? ""} onChange={(e) => setPos((p) => ({ ...p, nameAr: e.target.value }))} /></div>
            <Button onClick={() => post({ entity: "position", ...pos }, () => setPos({}))}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
          </div>
          <div className="flex flex-wrap gap-2">{data.positions.map((t: Any) => <Badge key={t.id} variant="outline">{t.nameAr}</Badge>)}</div>
        </CardContent>
      </Card>

      {/* Admin departments */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> الإدارات</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div><label className="text-xs text-muted-foreground">الكود</label><Input className="w-24" value={dep.code ?? ""} onChange={(e) => setDep((p) => ({ ...p, code: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">الاسم</label><Input className="w-52" value={dep.nameAr ?? ""} onChange={(e) => setDep((p) => ({ ...p, nameAr: e.target.value }))} /></div>
            <Button onClick={() => post({ entity: "adminDepartment", ...dep }, () => setDep({}))}><Plus className="w-4 h-4 ml-1" /> إضافة إدارة</Button>
          </div>
          {data.adminDepartments.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الإدارة</TableHead><TableHead className="text-center">الحالة</TableHead></TableRow></TableHeader>
              <TableBody>{data.adminDepartments.map((d: Any) => <TableRow key={d.id}><TableCell className="font-mono">{d.code}</TableCell><TableCell>{d.nameAr}</TableCell><TableCell className="text-center"><button onClick={() => patch({ entity: "adminDepartment", id: d.id, isActive: !d.isActive })}><Badge variant={d.isActive ? "default" : "outline"}>{d.isActive ? "نشط" : "موقوف"}</Badge></button></TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sections */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">الأقسام التابعة للإدارات</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div><label className="text-xs text-muted-foreground">الإدارة</label>
              <Select value={sec.adminDepartmentId ?? ""} onValueChange={(v) => setSec((p) => ({ ...p, adminDepartmentId: v }))}>
                <SelectTrigger className="w-48"><SelectValue placeholder="اختر الإدارة" /></SelectTrigger>
                <SelectContent>{data.adminDepartments.map((d: Any) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">اسم القسم</label><Input className="w-48" value={sec.nameAr ?? ""} onChange={(e) => setSec((p) => ({ ...p, nameAr: e.target.value }))} /></div>
            <Button disabled={!sec.adminDepartmentId} onClick={() => post({ entity: "section", ...sec }, () => setSec({}))}><Plus className="w-4 h-4 ml-1" /> إضافة قسم</Button>
          </div>
          {data.sections.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>القسم</TableHead><TableHead>الإدارة</TableHead></TableRow></TableHeader>
              <TableBody>{data.sections.map((s: Any) => <TableRow key={s.id}><TableCell>{s.nameAr}</TableCell><TableCell>{depName(s.adminDepartmentId)}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
