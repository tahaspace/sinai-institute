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
import { Users, Search, Plus, ShieldCheck } from "lucide-react"

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  title: string | null
  universityId: string | null
  isPlatformAdmin: boolean
  university: { id: string; nameAr: string; nameEn: string } | null
  userRoles: {
    id: string
    facultyId: string | null
    departmentId: string | null
    role: { id: string; key: string; nameAr: string; nameEn: string }
  }[]
}

interface UniversityOption {
  id: string
  nameAr: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // create dialog state
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "", universityId: "none" })
  const [universities, setUniversities] = useState<UniversityOption[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function loadUsers(cancelledRef?: { cancelled: boolean }) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/platform/users`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب المستخدمين")
      const json = await res.json()
      if (!cancelledRef?.cancelled) setUsers(json.users ?? [])
    } catch (e) {
      if (!cancelledRef?.cancelled) setError((e as Error).message)
    } finally {
      if (!cancelledRef?.cancelled) setLoading(false)
    }
  }

  useEffect(() => {
    const ref = { cancelled: false }
    loadUsers(ref)
    // universities feed the create-dialog Select; their list rarely changes.
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/platform/universities`)
        if (res.ok) {
          const json = await res.json()
          if (!ref.cancelled) setUniversities(json.universities ?? [])
        }
      } catch {
        /* universities are optional in the create form; ignore load failure */
      }
    })()
    return () => {
      ref.cancelled = true
    }
  }, [])

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.university?.nameAr ?? "").toLowerCase().includes(q)
    )
  })

  async function handleCreate() {
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/admin/platform/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          universityId: form.universityId === "none" ? null : form.universityId,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "فشل في إنشاء المستخدم")
      setOpen(false)
      setForm({ name: "", email: "", password: "", universityId: "none" })
      await loadUsers()
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
            <Users className="w-7 h-7 text-indigo-600" />
            المستخدمون
          </h1>
          <p className="text-muted-foreground">إدارة حسابات المستخدمين وإسناد الأدوار عبر المنصة</p>
        </div>
        <Button onClick={() => { setFormError(null); setOpen(true) }}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة مستخدم
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو البريد أو الجامعة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين</CardTitle>
          <CardDescription>إجمالي {filtered.length} مستخدم</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="p-8 text-center text-muted-foreground">جارٍ تحميل المستخدمين...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الجامعة</TableHead>
                  <TableHead>عدد الأدوار</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-indigo-600 hover:underline">
                        {u.name}
                      </Link>
                      {u.isPlatformAdmin && (
                        <Badge variant="secondary" className="mr-2 gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          مدير منصة
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.role}</Badge>
                    </TableCell>
                    <TableCell>{u.university?.nameAr ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u.userRoles.length}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      لا يوجد مستخدمون مطابقون
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
            <DialogDescription>أنشئ حسابًا جديدًا. يمكن إسناد الأدوار بعد الإنشاء من صفحة المستخدم.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="university">الجامعة</Label>
              <Select value={form.universityId} onValueChange={(v) => setForm({ ...form, universityId: v })}>
                <SelectTrigger id="university">
                  <SelectValue placeholder="اختر الجامعة (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون جامعة (على مستوى المنصة)</SelectItem>
                  {universities.map((uni) => (
                    <SelectItem key={uni.id} value={uni.id}>
                      {uni.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
