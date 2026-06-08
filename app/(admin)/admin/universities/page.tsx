"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Building2, Plus, ChevronLeft } from "lucide-react"

interface UniversityRow {
  id: string
  nameAr: string
  nameEn: string
  slug: string
  domain: string | null
  isActive: boolean
  _count: { faculties: number }
}

export default function AdminUniversitiesPage() {
  const [universities, setUniversities] = useState<UniversityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ nameAr: "", nameEn: "", slug: "", domain: "" })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/platform/universities`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب الجامعات")
      const json = await res.json()
      setUniversities(json.universities ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/platform/universities`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب الجامعات")
        const json = await res.json()
        if (!cancelled) setUniversities(json.universities ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  async function handleCreate() {
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/admin/platform/universities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: form.nameAr,
          nameEn: form.nameEn,
          slug: form.slug,
          domain: form.domain || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في إنشاء الجامعة")
      setDialogOpen(false)
      setForm({ nameAr: "", nameEn: "", slug: "", domain: "" })
      await load()
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-7 h-7 text-institute-blue" />
            الجامعات
          </h1>
          <p className="text-muted-foreground">
            إدارة الجامعات (المستأجرين) على المنصة وكلياتها
          </p>
        </div>
        <Button onClick={() => { setFormError(null); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة جامعة
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الجامعات...</CardContent></Card>}

      {!loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>قائمة الجامعات</CardTitle>
            <CardDescription>إجمالي {universities.length} جامعة</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>المعرّف (slug)</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>عدد الكليات</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {universities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      لا توجد جامعات بعد
                    </TableCell>
                  </TableRow>
                )}
                {universities.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{u.nameAr}</p>
                        <p className="text-sm text-muted-foreground">{u.nameEn}</p>
                      </div>
                    </TableCell>
                    <TableCell><code className="text-sm">{u.slug}</code></TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge className="bg-green-100 text-green-700">نشطة</Badge>
                      ) : (
                        <Badge variant="secondary">غير نشطة</Badge>
                      )}
                    </TableCell>
                    <TableCell>{u._count.faculties}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/universities/${u.id}`}>
                          إدارة
                          <ChevronLeft className="w-4 h-4 mr-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add University Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة جامعة جديدة</DialogTitle>
            <DialogDescription>أدخل بيانات الجامعة الجديدة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nameAr">الاسم بالعربية</Label>
              <Input
                id="nameAr"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="مثال: معهد سيناء العالي"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameEn">الاسم بالإنجليزية</Label>
              <Input
                id="nameEn"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                placeholder="e.g. Sinai Higher Institute"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">المعرّف (slug)</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="sinai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">النطاق (اختياري)</Label>
              <Input
                id="domain"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="sinai.edu.eg"
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
