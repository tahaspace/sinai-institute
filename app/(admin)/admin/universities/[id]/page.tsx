"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Building2, Plus, Pencil, Trash2, ArrowRight } from "lucide-react"

interface University {
  id: string
  nameAr: string
  nameEn: string
  slug: string
  domain: string | null
  isActive: boolean
}

interface FacultyRow {
  id: string
  nameAr: string
  nameEn: string
  dean: string | null
  order: number
  isActive: boolean
  _count: { departments: number }
}

export default function AdminUniversityDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [university, setUniversity] = useState<University | null>(null)
  const [faculties, setFaculties] = useState<FacultyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // University edit form
  const [uForm, setUForm] = useState({ nameAr: "", nameEn: "", domain: "", isActive: true })
  const [savingU, setSavingU] = useState(false)
  const [uError, setUError] = useState<string | null>(null)
  const [uSaved, setUSaved] = useState(false)

  // Faculty dialog (add or edit)
  const [facDialogOpen, setFacDialogOpen] = useState(false)
  const [editingFaculty, setEditingFaculty] = useState<FacultyRow | null>(null)
  const [facForm, setFacForm] = useState({ nameAr: "", nameEn: "", dean: "" })
  const [savingFac, setSavingFac] = useState(false)
  const [facError, setFacError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/platform/universities/${id}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب بيانات الجامعة")
      const json = await res.json()
      const u: University = json.university
      setUniversity(u)
      setFaculties(json.faculties ?? [])
      setUForm({ nameAr: u.nameAr, nameEn: u.nameEn, domain: u.domain ?? "", isActive: u.isActive })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/platform/universities/${id}`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب بيانات الجامعة")
        const json = await res.json()
        if (cancelled) return
        const u: University = json.university
        setUniversity(u)
        setFaculties(json.faculties ?? [])
        setUForm({ nameAr: u.nameAr, nameEn: u.nameEn, domain: u.domain ?? "", isActive: u.isActive })
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [id])

  async function saveUniversity() {
    setSavingU(true)
    setUError(null)
    setUSaved(false)
    try {
      const res = await fetch(`/api/admin/platform/universities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: uForm.nameAr,
          nameEn: uForm.nameEn,
          domain: uForm.domain,
          isActive: uForm.isActive,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في تحديث الجامعة")
      const json = await res.json()
      setUniversity(json.university)
      setUSaved(true)
    } catch (e) {
      setUError((e as Error).message)
    } finally {
      setSavingU(false)
    }
  }

  function openAddFaculty() {
    setEditingFaculty(null)
    setFacForm({ nameAr: "", nameEn: "", dean: "" })
    setFacError(null)
    setFacDialogOpen(true)
  }

  function openEditFaculty(f: FacultyRow) {
    setEditingFaculty(f)
    setFacForm({ nameAr: f.nameAr, nameEn: f.nameEn, dean: f.dean ?? "" })
    setFacError(null)
    setFacDialogOpen(true)
  }

  async function saveFaculty() {
    setSavingFac(true)
    setFacError(null)
    try {
      let res: Response
      if (editingFaculty) {
        res = await fetch(`/api/admin/platform/faculties/${editingFaculty.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nameAr: facForm.nameAr, nameEn: facForm.nameEn, dean: facForm.dean }),
        })
      } else {
        res = await fetch(`/api/admin/platform/faculties`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            universityId: id,
            nameAr: facForm.nameAr,
            nameEn: facForm.nameEn,
            dean: facForm.dean || undefined,
          }),
        })
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في حفظ الكلية")
      setFacDialogOpen(false)
      await load()
    } catch (e) {
      setFacError((e as Error).message)
    } finally {
      setSavingFac(false)
    }
  }

  async function deleteFaculty(f: FacultyRow) {
    if (!confirm(`هل تريد حذف كلية "${f.nameAr}"؟`)) return
    try {
      const res = await fetch(`/api/admin/platform/faculties/${f.id}`, { method: "DELETE" })
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error || "فشل في حذف الكلية"
        alert(msg)
        return
      }
      await load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  if (loading) {
    return <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ التحميل...</CardContent></Card>
  }
  if (error) {
    return <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>
  }
  if (!university) {
    return <Card><CardContent className="p-6 text-center text-muted-foreground">الجامعة غير موجودة</CardContent></Card>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/admin/universities">
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة للجامعات
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-7 h-7 text-institute-blue" />
          {university.nameAr}
        </h1>
        <p className="text-muted-foreground">
          المعرّف: <code>{university.slug}</code>
        </p>
      </div>

      {/* University edit */}
      <Card>
        <CardHeader>
          <CardTitle>بيانات الجامعة</CardTitle>
          <CardDescription>تعديل الاسم والنطاق وحالة التفعيل</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uNameAr">الاسم بالعربية</Label>
              <Input
                id="uNameAr"
                value={uForm.nameAr}
                onChange={(e) => { setUForm({ ...uForm, nameAr: e.target.value }); setUSaved(false) }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uNameEn">الاسم بالإنجليزية</Label>
              <Input
                id="uNameEn"
                value={uForm.nameEn}
                onChange={(e) => { setUForm({ ...uForm, nameEn: e.target.value }); setUSaved(false) }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uDomain">النطاق</Label>
              <Input
                id="uDomain"
                value={uForm.domain}
                onChange={(e) => { setUForm({ ...uForm, domain: e.target.value }); setUSaved(false) }}
                placeholder="sinai.edu.eg"
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="uActive"
                checked={uForm.isActive}
                onCheckedChange={(v) => { setUForm({ ...uForm, isActive: v }); setUSaved(false) }}
              />
              <Label htmlFor="uActive">الجامعة نشطة</Label>
            </div>
          </div>
          {uError && <p className="text-sm text-red-600">{uError}</p>}
          {uSaved && <p className="text-sm text-green-600">تم حفظ التغييرات</p>}
          <div>
            <Button onClick={saveUniversity} disabled={savingU}>
              {savingU ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Faculties */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>الكليات</CardTitle>
            <CardDescription>إجمالي {faculties.length} كلية</CardDescription>
          </div>
          <Button onClick={openAddFaculty}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة كلية
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>العميد</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>عدد الأقسام</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faculties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    لا توجد كليات بعد
                  </TableCell>
                </TableRow>
              )}
              {faculties.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{f.nameAr}</p>
                      <p className="text-sm text-muted-foreground">{f.nameEn}</p>
                    </div>
                  </TableCell>
                  <TableCell>{f.dean || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {f.isActive ? (
                      <Badge className="bg-green-100 text-green-700">نشطة</Badge>
                    ) : (
                      <Badge variant="secondary">غير نشطة</Badge>
                    )}
                  </TableCell>
                  <TableCell>{f._count.departments}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditFaculty(f)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteFaculty(f)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Faculty add/edit dialog */}
      <Dialog open={facDialogOpen} onOpenChange={setFacDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaculty ? "تعديل الكلية" : "إضافة كلية جديدة"}</DialogTitle>
            <DialogDescription>
              {editingFaculty ? "تعديل بيانات الكلية" : "أدخل بيانات الكلية الجديدة"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="facNameAr">الاسم بالعربية</Label>
              <Input
                id="facNameAr"
                value={facForm.nameAr}
                onChange={(e) => setFacForm({ ...facForm, nameAr: e.target.value })}
                placeholder="مثال: كلية الهندسة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facNameEn">الاسم بالإنجليزية</Label>
              <Input
                id="facNameEn"
                value={facForm.nameEn}
                onChange={(e) => setFacForm({ ...facForm, nameEn: e.target.value })}
                placeholder="e.g. Faculty of Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facDean">العميد (اختياري)</Label>
              <Input
                id="facDean"
                value={facForm.dean}
                onChange={(e) => setFacForm({ ...facForm, dean: e.target.value })}
                placeholder="اسم العميد"
              />
            </div>
            {facError && <p className="text-sm text-red-600">{facError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFacDialogOpen(false)} disabled={savingFac}>
              إلغاء
            </Button>
            <Button onClick={saveFaculty} disabled={savingFac}>
              {savingFac ? "جارٍ الحفظ..." : editingFaculty ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
