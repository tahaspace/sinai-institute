"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Plus, Trash2, UserCircle } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const HR_STATUS: Record<string, string> = { NEW: "جديد", UNDER_REVIEW: "تحت المراجعة", ACCEPTED: "مقبول", PROBATION: "تحت التمرين", SUSPENDED: "موقوف", INVESTIGATION: "تحت التحقيق", RESIGNED: "استقالة", TERMINATED: "فصل", RETIRED: "تقاعد", DECEASED: "وفاة", CONTRACT_ENDED: "انتهاء عقد", ACTIVE: "على رأس العمل" }
const CONTRACT: Record<string, string> = { permanent: "دائم", temporary: "مؤقت", partial: "جزئي", seasonal: "موسمي", consultant: "استشاري", fulltime_faculty: "هيئة تدريس متفرغ", seconded_faculty: "هيئة تدريس منتدب" }
const DOC_TYPES: Record<string, string> = { NATIONAL_ID: "بطاقة الرقم القومي", BIRTH_CERT: "شهادة الميلاد", QUALIFICATION: "مؤهل", CONTRACT: "عقد العمل", PHOTO: "صورة شخصية", OTHER: "أخرى" }
const dstr = (d: Any) => (d ? String(d).slice(0, 10) : "")

export default function EmployeeProfilePage() {
  const id = (useParams() as Any).id as string
  const [emp, setEmp] = useState<Any>(null)
  const [org, setOrg] = useState<Any>({ employeeTypes: [], jobTitles: [], positions: [], adminDepartments: [], sections: [] })
  const [staff, setStaff] = useState<Any[]>([])
  const [f, setF] = useState<Record<string, Any>>({})
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [sub, setSub] = useState<Record<string, Any>>({})

  const load = useCallback(async () => {
    setError(null)
    try {
      const [e, o, s] = await Promise.all([
        fetch(`/api/institute/hr/employees/${id}`),
        fetch("/api/institute/hr/org"),
        fetch("/api/institute/hr/employees"),
      ])
      const j = await e.json()
      if (!e.ok) throw new Error(j.error || "فشل")
      setEmp(j.employee); setF(j.employee)
      if (o.ok) setOrg(await o.json())
      if (s.ok) setStaff((await s.json()).employees ?? [])
    } catch (err) { setError((err as Error).message) }
  }, [id])
  useEffect(() => { load() }, [load])

  const set = (k: string, v: Any) => setF((p) => ({ ...p, [k]: v }))
  const save = async () => {
    setError(null); setMsg(null)
    const r = await fetch(`/api/institute/hr/employees/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) })
    const j = await r.json(); if (!r.ok) { setError(j.error || "فشل"); return }
    setMsg("تم الحفظ"); load()
  }
  const addSub = async (kind: string, payload: Any, resetKey: string) => {
    const r = await fetch(`/api/institute/hr/employees/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ...payload }) })
    if (!r.ok) { const j = await r.json(); setError(j.error || "فشل"); return }
    setSub((p) => ({ ...p, [resetKey]: {} })); load()
  }
  const delSub = async (kind: string, subId: string) => { await fetch(`/api/institute/hr/employees/${id}?kind=${kind}&subId=${subId}`, { method: "DELETE" }); load() }

  if (!emp) return <div className="p-8 text-center text-muted-foreground">{error ?? "جارٍ التحميل…"}</div>
  const staffName = (sid: string) => staff.find((x) => x.id === sid)?.nameAr ?? sid
  const orgName = (arr: Any[], oid: string) => arr.find((x: Any) => x.id === oid)?.nameAr ?? "—"

  // plain render helper (not a component) — avoids remounting inputs on each keystroke
  const fld = (label: string, k: string, type = "text") => (
    <div><label className="text-xs text-muted-foreground">{label}</label><Input type={type} value={type === "date" ? dstr(f[k]) : (f[k] ?? "")} onChange={(e) => set(k, e.target.value)} /></div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><UserCircle className="w-7 h-7 text-institute-blue" /> {emp.nameAr}</h1>
          <p className="text-muted-foreground">كود {emp.code} · <Badge variant="outline">{HR_STATUS[emp.hrStatus] ?? emp.hrStatus}</Badge></p></div>
        <Button onClick={save}><Save className="w-4 h-4 ml-1" /> حفظ الملف</Button>
      </div>
      {error && <Card><CardContent className="p-3 text-center text-red-600">{error}</CardContent></Card>}
      {msg && <Card><CardContent className="p-3 text-center text-green-600">{msg}</CardContent></Card>}

      <Card><CardHeader className="pb-2"><CardTitle className="text-base">البيانات الأساسية والاتصال</CardTitle></CardHeader>
        <CardContent><div className="grid md:grid-cols-4 gap-3">
          {fld("الاسم (عربي)", "nameAr")}{fld("الاسم (إنجليزي)", "nameEn")}{fld("الرقم القومي", "nationalId")}{fld("تاريخ الميلاد", "birthDate", "date")}
          <div><label className="text-xs text-muted-foreground">النوع</label>
            <Select value={f.gender ?? "none"} onValueChange={(v) => set("gender", v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem></SelectContent></Select></div>
          {fld("الحالة الاجتماعية", "maritalStatus")}{fld("الهاتف", "phone")}{fld("البريد الإلكتروني", "email")}
          <div className="md:col-span-4"><label className="text-xs text-muted-foreground">العنوان</label><Input value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
        </div></CardContent>
      </Card>

      <Card><CardHeader className="pb-2"><CardTitle className="text-base">التوظيف والعقد والحالة</CardTitle></CardHeader>
        <CardContent><div className="grid md:grid-cols-4 gap-3">
          <div><label className="text-xs text-muted-foreground">النوع الوظيفي</label>
            <Select value={f.employeeTypeId ?? "none"} onValueChange={(v) => set("employeeTypeId", v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{org.employeeTypes.map((t: Any) => <SelectItem key={t.id} value={t.id}>{t.nameAr}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="text-xs text-muted-foreground">نوع العقد</label>
            <Select value={f.contractType ?? "none"} onValueChange={(v) => set("contractType", v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{Object.entries(CONTRACT).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
          {fld("بداية العقد", "contractStart", "date")}{fld("نهاية العقد", "contractEnd", "date")}{fld("تاريخ التعيين", "hireDate", "date")}
          <div><label className="text-xs text-muted-foreground">الحالة</label>
            <Select value={f.hrStatus ?? "NEW"} onValueChange={(v) => set("hrStatus", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(HR_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
        </div></CardContent>
      </Card>

      <Card><CardHeader className="pb-2"><CardTitle className="text-base">البيانات المالية</CardTitle></CardHeader>
        <CardContent><div className="grid md:grid-cols-4 gap-3">
          {fld("الراتب الأساسي", "baseSalary", "number")}{fld("البنك / الحساب", "bankAccount")}{fld("IBAN", "iban")}{fld("رقم البطاقة الضريبية", "taxCardNo")}{fld("رقم التأمين", "insuranceNo")}
          <div><label className="text-xs text-muted-foreground">طريقة الصرف</label>
            <Select value={f.payMethod ?? "none"} onValueChange={(v) => set("payMethod", v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem><SelectItem value="bank">بنك</SelectItem><SelectItem value="cash">نقدي</SelectItem><SelectItem value="cheque">شيك</SelectItem></SelectContent></Select></div>
        </div></CardContent>
      </Card>

      {/* Current placement + assignment history */}
      <Card><CardHeader className="pb-2"><CardTitle className="text-base">التعيين والهيكل الوظيفي</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">الوضع الحالي: <b>{emp.adminDepartmentId ? orgName(org.adminDepartments, emp.adminDepartmentId) : "—"}</b> / {emp.jobTitleId ? orgName(org.jobTitles, emp.jobTitleId) : "—"} {emp.positionId ? `— ${orgName(org.positions, emp.positionId)}` : ""} {emp.managerId ? `· المدير: ${staffName(emp.managerId)}` : ""}</p>
          <div className="flex flex-wrap gap-2 items-end border-t pt-3">
            <Select value={sub.asg?.adminDepartmentId ?? "none"} onValueChange={(v) => setSub((p) => ({ ...p, asg: { ...p.asg, adminDepartmentId: v === "none" ? "" : v } }))}><SelectTrigger className="w-40"><SelectValue placeholder="الإدارة" /></SelectTrigger><SelectContent><SelectItem value="none">الإدارة —</SelectItem>{org.adminDepartments.map((d: Any) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent></Select>
            <Select value={sub.asg?.jobTitleId ?? "none"} onValueChange={(v) => setSub((p) => ({ ...p, asg: { ...p.asg, jobTitleId: v === "none" ? "" : v } }))}><SelectTrigger className="w-40"><SelectValue placeholder="المسمى" /></SelectTrigger><SelectContent><SelectItem value="none">المسمى —</SelectItem>{org.jobTitles.map((d: Any) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent></Select>
            <Select value={sub.asg?.positionId ?? "none"} onValueChange={(v) => setSub((p) => ({ ...p, asg: { ...p.asg, positionId: v === "none" ? "" : v } }))}><SelectTrigger className="w-36"><SelectValue placeholder="المنصب" /></SelectTrigger><SelectContent><SelectItem value="none">المنصب —</SelectItem>{org.positions.map((d: Any) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent></Select>
            <Select value={sub.asg?.managerEmployeeId ?? "none"} onValueChange={(v) => setSub((p) => ({ ...p, asg: { ...p.asg, managerEmployeeId: v === "none" ? "" : v } }))}><SelectTrigger className="w-40"><SelectValue placeholder="المدير المباشر" /></SelectTrigger><SelectContent><SelectItem value="none">المدير —</SelectItem>{staff.filter((x) => x.id !== id).map((d: Any) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent></Select>
            <Button onClick={() => addSub("assignment", sub.asg ?? {}, "asg")}><Plus className="w-4 h-4 ml-1" /> تعيين/نقل</Button>
          </div>
          {emp.assignments?.length > 0 && (
            <Table><TableHeader><TableRow><TableHead>من</TableHead><TableHead>الإدارة</TableHead><TableHead>المسمى</TableHead><TableHead className="text-center">الحالي</TableHead></TableRow></TableHeader>
              <TableBody>{emp.assignments.map((a: Any) => <TableRow key={a.id}><TableCell>{dstr(a.startDate)}</TableCell><TableCell>{a.adminDepartmentId ? orgName(org.adminDepartments, a.adminDepartmentId) : "—"}</TableCell><TableCell>{a.jobTitleId ? orgName(org.jobTitles, a.jobTitleId) : "—"}</TableCell><TableCell className="text-center">{a.isCurrent ? <Badge>حالي</Badge> : ""}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Owned sub-records */}
      <div className="grid md:grid-cols-2 gap-4">
        <SubList title="المؤهلات العلمية" items={emp.qualifications} render={(q: Any) => `${q.degree} — ${q.institution ?? ""} ${q.year ?? ""} ${q.grade ?? ""}`} onDel={(sid) => delSub("qualification", sid)}
          form={<>
            <Input placeholder="المؤهل" className="w-36" value={sub.q?.degree ?? ""} onChange={(e) => setSub((p) => ({ ...p, q: { ...p.q, degree: e.target.value } }))} />
            <Input placeholder="الجهة" className="w-36" value={sub.q?.institution ?? ""} onChange={(e) => setSub((p) => ({ ...p, q: { ...p.q, institution: e.target.value } }))} />
            <Input placeholder="السنة" className="w-20" value={sub.q?.year ?? ""} onChange={(e) => setSub((p) => ({ ...p, q: { ...p.q, year: e.target.value } }))} />
            <Button size="sm" disabled={!sub.q?.degree} onClick={() => addSub("qualification", sub.q, "q")}><Plus className="w-4 h-4" /></Button>
          </>} />
        <SubList title="الخبرات العملية" items={emp.experiences} render={(x: Any) => `${x.employer} — ${x.title ?? ""} ${x.years ? `(${x.years} سنة)` : ""}`} onDel={(sid) => delSub("experience", sid)}
          form={<>
            <Input placeholder="جهة العمل" className="w-36" value={sub.x?.employer ?? ""} onChange={(e) => setSub((p) => ({ ...p, x: { ...p.x, employer: e.target.value } }))} />
            <Input placeholder="المسمى" className="w-32" value={sub.x?.title ?? ""} onChange={(e) => setSub((p) => ({ ...p, x: { ...p.x, title: e.target.value } }))} />
            <Input placeholder="سنوات" className="w-20" value={sub.x?.years ?? ""} onChange={(e) => setSub((p) => ({ ...p, x: { ...p.x, years: e.target.value } }))} />
            <Button size="sm" disabled={!sub.x?.employer} onClick={() => addSub("experience", sub.x, "x")}><Plus className="w-4 h-4" /></Button>
          </>} />
        <SubList title="المستندات" items={emp.documents} render={(d: Any) => `${DOC_TYPES[d.type] ?? d.type}: ${d.name}`} onDel={(sid) => delSub("document", sid)}
          form={<>
            <Select value={sub.d?.type ?? "OTHER"} onValueChange={(v) => setSub((p) => ({ ...p, d: { ...p.d, type: v } }))}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(DOC_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="الاسم/الرقم" className="w-36" value={sub.d?.name ?? ""} onChange={(e) => setSub((p) => ({ ...p, d: { ...p.d, name: e.target.value } }))} />
            <Button size="sm" disabled={!sub.d?.name} onClick={() => addSub("document", sub.d, "d")}><Plus className="w-4 h-4" /></Button>
          </>} />
        <SubList title="العهد" items={emp.custody} render={(c: Any) => `${c.item} ${c.code ? `(${c.code})` : ""}`} onDel={(sid) => delSub("custody", sid)}
          form={<>
            <Input placeholder="العهدة" className="w-36" value={sub.c?.item ?? ""} onChange={(e) => setSub((p) => ({ ...p, c: { ...p.c, item: e.target.value } }))} />
            <Input placeholder="الكود" className="w-28" value={sub.c?.code ?? ""} onChange={(e) => setSub((p) => ({ ...p, c: { ...p.c, code: e.target.value } }))} />
            <Button size="sm" disabled={!sub.c?.item} onClick={() => addSub("custody", sub.c, "c")}><Plus className="w-4 h-4" /></Button>
          </>} />
      </div>

      <Card><CardHeader className="pb-2"><CardTitle className="text-base">سجل الحركة الوظيفية</CardTitle></CardHeader>
        <CardContent>{emp.jobHistory?.length > 0 ? (
          <Table><TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>الحركة</TableHead><TableHead>ملاحظة</TableHead></TableRow></TableHeader>
            <TableBody>{emp.jobHistory.map((h: Any) => <TableRow key={h.id}><TableCell>{dstr(h.date)}</TableCell><TableCell>{h.action}</TableCell><TableCell>{h.note ?? "—"}</TableCell></TableRow>)}</TableBody>
          </Table>
        ) : <p className="text-sm text-muted-foreground">لا توجد حركات</p>}</CardContent>
      </Card>
    </div>
  )
}

function SubList({ title, items, render, onDel, form }: { title: string; items: Any[]; render: (x: Any) => string; onDel: (id: string) => void; form: ReactNode }) {
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">{form}</div>
        {(items ?? []).length > 0 ? (
          <ul className="text-sm space-y-1">{items.map((it: Any) => (
            <li key={it.id} className="flex items-center justify-between border-b py-1"><span>{render(it)}</span><button onClick={() => onDel(it.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></li>
          ))}</ul>
        ) : <p className="text-xs text-muted-foreground">لا توجد سجلات</p>}
      </CardContent>
    </Card>
  )
}
