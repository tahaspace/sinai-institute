"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Plus, Layers } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
interface Centre { id: string; code: string; nameAr: string; type: string; parentId: string | null; branchId: string | null; programId: string | null; facultyId: string | null; isActive: boolean }
interface Opt { id: string; nameAr: string }
interface Branch { id: string; code: string; nameAr: string; isActive: boolean }

const TYPE_LABEL: Record<string, string> = { ACADEMIC: "أكاديمي", ADMIN: "إداري", OPERATIONAL: "تشغيلي", BRANCH: "فرع" }

export default function CostCentresPage() {
  const [centres, setCentres] = useState<Centre[]>([])
  const [options, setOptions] = useState<{ types: string[]; branches: Opt[]; programs: Opt[]; faculties: Opt[] }>({ types: [], branches: [], programs: [], faculties: [] })
  const [branches, setBranches] = useState<Branch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cc, setCc] = useState<Record<string, string>>({ type: "ADMIN" })
  const [br, setBr] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const [c, b] = await Promise.all([fetch("/api/institute/finance/cost-centers"), fetch("/api/institute/finance/branches")])
      const cj = await c.json(); if (!c.ok) throw new Error(cj.error)
      const bj = await b.json(); if (!b.ok) throw new Error(bj.error)
      setCentres(cj.centres ?? []); setOptions(cj.options ?? { types: [], branches: [], programs: [], faculties: [] }); setBranches(bj.branches ?? [])
    } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  const nameById = (arr: Opt[], id: string | null) => (id ? arr.find((x) => x.id === id)?.nameAr ?? "—" : "—")

  const submit = async (url: string, payload: Any, reset: () => void) => {
    setError(null)
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const j = await res.json(); if (!res.ok) { setError(j.error || "فشل"); return }
    reset(); load()
  }
  const toggle = async (url: string, id: string, isActive: boolean) => {
    await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !isActive }) })
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="w-7 h-7 text-institute-blue" /> مراكز التكلفة والفروع</h1>
        <p className="text-muted-foreground">بُعد الربحية — تُنسب الإيرادات والمصروفات لمراكز التكلفة لاستخراج تقارير ربحية البرامج والكليات والفروع</p>
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}

      {/* Branches */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-4 h-4" /> الفروع</CardTitle><CardDescription>الفروع/الحرم الجامعية لمقارنة الربحية بينها</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div><label className="text-xs text-muted-foreground">الكود</label><Input className="w-28" value={br.code ?? ""} onChange={(e) => setBr((p) => ({ ...p, code: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">الاسم</label><Input className="w-52" value={br.nameAr ?? ""} onChange={(e) => setBr((p) => ({ ...p, nameAr: e.target.value }))} /></div>
            <Button onClick={() => submit("/api/institute/finance/branches", { code: br.code, nameAr: br.nameAr }, () => setBr({}))}><Plus className="w-4 h-4 ml-1" /> إضافة فرع</Button>
          </div>
          {branches.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">الحالة</TableHead></TableRow></TableHeader>
              <TableBody>{branches.map((b) => (
                <TableRow key={b.id}><TableCell className="font-mono">{b.code}</TableCell><TableCell>{b.nameAr}</TableCell>
                  <TableCell className="text-center"><button onClick={() => toggle("/api/institute/finance/branches", b.id, b.isActive)}><Badge variant={b.isActive ? "default" : "outline"}>{b.isActive ? "نشط" : "موقوف"}</Badge></button></TableCell>
                </TableRow>))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cost centres */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Layers className="w-4 h-4" /> مراكز التكلفة</CardTitle><CardDescription>اربط المركز ببرنامج/كلية/فرع ليُجمَّع في تقارير الربحية</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div><label className="text-xs text-muted-foreground">الكود</label><Input className="w-24" value={cc.code ?? ""} onChange={(e) => setCc((p) => ({ ...p, code: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">الاسم</label><Input className="w-44" value={cc.nameAr ?? ""} onChange={(e) => setCc((p) => ({ ...p, nameAr: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">النوع</label>
              <Select value={cc.type ?? "ADMIN"} onValueChange={(v) => setCc((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{(options.types.length ? options.types : ["ACADEMIC", "ADMIN", "OPERATIONAL", "BRANCH"]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">البرنامج</label>
              <Select value={cc.programId ?? "none"} onValueChange={(v) => setCc((p) => ({ ...p, programId: v === "none" ? "" : v }))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{options.programs.map((o) => <SelectItem key={o.id} value={o.id}>{o.nameAr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">الكلية</label>
              <Select value={cc.facultyId ?? "none"} onValueChange={(v) => setCc((p) => ({ ...p, facultyId: v === "none" ? "" : v }))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{options.faculties.map((o) => <SelectItem key={o.id} value={o.id}>{o.nameAr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">الفرع</label>
              <Select value={cc.branchId ?? "none"} onValueChange={(v) => setCc((p) => ({ ...p, branchId: v === "none" ? "" : v }))}>
                <SelectTrigger className="w-36"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{options.branches.map((o) => <SelectItem key={o.id} value={o.id}>{o.nameAr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => submit("/api/institute/finance/cost-centers", cc, () => setCc({ type: "ADMIN" }))}><Plus className="w-4 h-4 ml-1" /> إضافة مركز</Button>
          </div>

          {centres.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">النوع</TableHead><TableHead>البرنامج</TableHead><TableHead>الكلية</TableHead><TableHead>الفرع</TableHead><TableHead className="text-center">الحالة</TableHead></TableRow></TableHeader>
              <TableBody>{centres.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.code}</TableCell><TableCell>{c.nameAr}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline">{TYPE_LABEL[c.type] ?? c.type}</Badge></TableCell>
                  <TableCell>{nameById(options.programs, c.programId)}</TableCell>
                  <TableCell>{nameById(options.faculties, c.facultyId)}</TableCell>
                  <TableCell>{nameById(options.branches, c.branchId)}</TableCell>
                  <TableCell className="text-center"><button onClick={() => toggle("/api/institute/finance/cost-centers", c.id, c.isActive)}><Badge variant={c.isActive ? "default" : "outline"}>{c.isActive ? "نشط" : "موقوف"}</Badge></button></TableCell>
                </TableRow>))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
