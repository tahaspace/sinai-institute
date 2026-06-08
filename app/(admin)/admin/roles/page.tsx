"use client"

import { useState, useEffect } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ShieldCheck, Plus, ChevronLeft, Globe, Building2, Lock } from "lucide-react"

interface RoleRow {
  id: string
  key: string
  nameAr: string
  nameEn: string
  description: string | null
  isSystem: boolean
  universityId: string | null
  universityName: string | null
  permissionCount: number
}

interface UniversityOption {
  id: string
  nameAr: string
}

const PLATFORM_VALUE = "__platform__"

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [universities, setUniversities] = useState<UniversityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // create dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ key: "", nameAr: "", nameEn: "", universityId: PLATFORM_VALUE })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/platform/roles`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب الأدوار")
      const json = await res.json()
      setRoles(json.roles ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      setError(null)
      try {
        const [rolesRes, uniRes] = await Promise.all([
          fetch(`/api/admin/platform/roles`),
          fetch(`/api/admin/platform/universities`),
        ])
        if (!rolesRes.ok) throw new Error((await rolesRes.json().catch(() => ({}))).error || "فشل في جلب الأدوار")
        const rolesJson = await rolesRes.json()
        const uniJson = uniRes.ok ? await uniRes.json() : { universities: [] }
        if (!cancelled) {
          setRoles(rolesJson.roles ?? [])
          setUniversities((uniJson.universities ?? []).map((u: UniversityOption) => ({ id: u.id, nameAr: u.nameAr })))
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  async function handleCreate() {
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        key: form.key,
        nameAr: form.nameAr,
        nameEn: form.nameEn,
        universityId: form.universityId === PLATFORM_VALUE ? "" : form.universityId,
      }
      const res = await fetch(`/api/admin/platform/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في إنشاء الدور")
      setDialogOpen(false)
      setForm({ key: "", nameAr: "", nameEn: "", universityId: PLATFORM_VALUE })
      await load()
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const platformCount = roles.filter((r) => r.universityId === null).length
  const tenantCount = roles.length - platformCount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            الأدوار والصلاحيات
          </h1>
          <p className="text-muted-foreground">
            إدارة أدوار المنصة والجامعات وضبط مصفوفة الصلاحيات لكل دور
          </p>
        </div>
        <Button onClick={() => { setFormError(null); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة دور
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الأدوار...</CardContent></Card>}

      {!loading && !error && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roles.length}</p>
                  <p className="text-xs text-muted-foreground">إجمالي الأدوار</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Globe className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{platformCount}</p>
                  <p className="text-xs text-muted-foreground">أدوار المنصة</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tenantCount}</p>
                  <p className="text-xs text-muted-foreground">أدوار الجامعات</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Roles Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة الأدوار</CardTitle>
              <CardDescription>إجمالي {roles.length} دور</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المفتاح</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>النطاق</TableHead>
                    <TableHead>عدد الصلاحيات</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        لا توجد أدوار بعد
                      </TableCell>
                    </TableRow>
                  )}
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{role.key}</code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{role.nameAr}</p>
                          <p className="text-sm text-muted-foreground">{role.nameEn}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {role.universityId === null ? (
                          <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                            <Globe className="w-3 h-3 ml-1" />
                            المنصة
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Building2 className="w-3 h-3 ml-1" />
                            {role.universityName ?? "جامعة"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{role.permissionCount}</span>
                        <span className="text-muted-foreground text-sm"> صلاحية</span>
                      </TableCell>
                      <TableCell>
                        {role.isSystem ? (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            <Lock className="w-3 h-3 ml-1" />
                            نظامي
                          </Badge>
                        ) : (
                          <Badge variant="secondary">مخصص</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/roles/${role.id}`}>
                            ضبط الصلاحيات
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
        </>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة دور جديد</DialogTitle>
            <DialogDescription>
              عرّف مفتاحًا فريدًا واسمًا للدور. يمكنك ضبط الصلاحيات بعد الإنشاء.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="role-key">المفتاح (key)</Label>
              <Input
                id="role-key"
                placeholder="مثال: AUDITOR"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-nameAr">الاسم بالعربية</Label>
              <Input
                id="role-nameAr"
                placeholder="مثال: مدقق"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-nameEn">الاسم بالإنجليزية</Label>
              <Input
                id="role-nameEn"
                placeholder="e.g. Auditor"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-scope">النطاق</Label>
              <Select
                value={form.universityId}
                onValueChange={(v) => setForm({ ...form, universityId: v })}
              >
                <SelectTrigger id="role-scope">
                  <SelectValue placeholder="اختر النطاق" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PLATFORM_VALUE}>المنصة (عام)</SelectItem>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={handleCreate} disabled={saving || !form.key || !form.nameAr || !form.nameEn}>
              {saving ? "جارٍ الحفظ..." : "إنشاء الدور"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
