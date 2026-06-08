"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
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
import { ArrowRight, Save, Plus, Trash2, ShieldCheck, Info } from "lucide-react"

interface UserRoleRow {
  id: string
  facultyId: string | null
  departmentId: string | null
  facultyName: string | null
  departmentName: string | null
  role: { id: string; key: string; nameAr: string; nameEn: string }
}

interface UserDetail {
  id: string
  name: string
  email: string
  role: string
  title: string | null
  universityId: string | null
  isPlatformAdmin: boolean
  university: { id: string; nameAr: string } | null
  userRoles: UserRoleRow[]
}

interface RoleOption { id: string; key: string; nameAr: string; universityId: string | null }
interface UniversityOption { id: string; nameAr: string }
interface FacultyOption { id: string; nameAr: string; universityId: string | null }
interface DepartmentOption { id: string; nameAr: string; facultyId: string | null; universityId: string | null }

const NONE = "none"

export default function AdminUserEditPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [user, setUser] = useState<UserDetail | null>(null)
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [universities, setUniversities] = useState<UniversityOption[]>([])
  const [faculties, setFaculties] = useState<FacultyOption[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // profile form
  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [universityId, setUniversityId] = useState<string>(NONE)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)

  // role-assignment form
  const [newRoleId, setNewRoleId] = useState<string>(NONE)
  const [newFacultyId, setNewFacultyId] = useState<string>(NONE)
  const [newDepartmentId, setNewDepartmentId] = useState<string>(NONE)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  const load = useCallback(async (cancelledRef?: { cancelled: boolean }) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/platform/users/${id}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب المستخدم")
      const json = await res.json()
      if (cancelledRef?.cancelled) return
      const u: UserDetail = json.user
      setUser(u)
      setName(u.name)
      setTitle(u.title ?? "")
      setUniversityId(u.universityId ?? NONE)
      setRoles(json.roles ?? [])
      setUniversities(json.universities ?? [])
      setFaculties(json.faculties ?? [])
      setDepartments(json.departments ?? [])
    } catch (e) {
      if (!cancelledRef?.cancelled) setError((e as Error).message)
    } finally {
      if (!cancelledRef?.cancelled) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const ref = { cancelled: false }
    load(ref)
    return () => { ref.cancelled = true }
  }, [load])

  async function saveProfile() {
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      const res = await fetch(`/api/admin/platform/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          title: title.trim() ? title : null,
          universityId: universityId === NONE ? null : universityId,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "فشل في حفظ البيانات")
      setProfileMsg("تم حفظ البيانات بنجاح")
      await load()
    } catch (e) {
      setProfileMsg((e as Error).message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function assignRole() {
    if (newRoleId === NONE) { setAssignError("اختر دورًا"); return }
    setAssigning(true)
    setAssignError(null)
    try {
      const res = await fetch(`/api/admin/platform/users/${id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: newRoleId,
          facultyId: newFacultyId === NONE ? null : newFacultyId,
          departmentId: newDepartmentId === NONE ? null : newDepartmentId,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "فشل في إسناد الدور")
      setNewRoleId(NONE)
      setNewFacultyId(NONE)
      setNewDepartmentId(NONE)
      await load()
    } catch (e) {
      setAssignError((e as Error).message)
    } finally {
      setAssigning(false)
    }
  }

  async function removeRole(userRoleId: string) {
    try {
      const res = await fetch(`/api/admin/platform/users/${id}/roles?userRoleId=${encodeURIComponent(userRoleId)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في إزالة الدور")
      await load()
    } catch (e) {
      setAssignError((e as Error).message)
    }
  }

  if (loading) {
    return <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل المستخدم...</CardContent></Card>
  }
  if (error || !user) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link href="/admin/users"><ArrowRight className="w-4 h-4 ml-2" />رجوع</Link>
        </Button>
        <Card><CardContent className="p-6 text-center text-red-600">{error ?? "المستخدم غير موجود"}</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {user.name}
            {user.isPlatformAdmin && (
              <Badge variant="secondary" className="gap-1"><ShieldCheck className="w-3 h-3" />مدير منصة</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/users"><ArrowRight className="w-4 h-4 ml-2" />رجوع للقائمة</Link>
        </Button>
      </div>

      {/* Re-login note */}
      <div className="flex items-start gap-2 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 p-3 text-sm text-amber-800 dark:text-amber-300">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>يجب على المستخدم تسجيل الخروج وإعادة الدخول حتى تُطبَّق التغييرات على الأدوار والصلاحيات.</span>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>بيانات المستخدم</CardTitle>
          <CardDescription>تعديل الاسم والمسمّى الوظيفي والجامعة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">المسمّى الوظيفي</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اختياري" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="university">الجامعة</Label>
              <Select value={universityId} onValueChange={setUniversityId}>
                <SelectTrigger id="university">
                  <SelectValue placeholder="اختر الجامعة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>بدون جامعة (على مستوى المنصة)</SelectItem>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveProfile} disabled={savingProfile}>
              <Save className="w-4 h-4 ml-2" />
              {savingProfile ? "جارٍ الحفظ..." : "حفظ البيانات"}
            </Button>
            {profileMsg && <span className="text-sm text-muted-foreground">{profileMsg}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Role assignments */}
      <Card>
        <CardHeader>
          <CardTitle>الأدوار المسندة</CardTitle>
          <CardDescription>إدارة أدوار المستخدم ونطاق كل دور (كلية / قسم)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الدور</TableHead>
                <TableHead>الكلية</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.userRoles.map((ur) => (
                <TableRow key={ur.id}>
                  <TableCell>
                    <span className="font-medium">{ur.role.nameAr}</span>
                    <Badge variant="outline" className="mr-2 text-xs">{ur.role.key}</Badge>
                  </TableCell>
                  <TableCell>{ur.facultyName ?? <span className="text-muted-foreground">كل الكليات</span>}</TableCell>
                  <TableCell>{ur.departmentName ?? <span className="text-muted-foreground">كل الأقسام</span>}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeRole(ur.id)} title="إزالة الدور">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {user.userRoles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    لا توجد أدوار مسندة
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Add role */}
          <div className="rounded-lg border p-4 space-y-4">
            <p className="font-medium flex items-center gap-2"><Plus className="w-4 h-4" />إسناد دور جديد</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>الدور</Label>
                <Select value={newRoleId} onValueChange={setNewRoleId}>
                  <SelectTrigger><SelectValue placeholder="اختر الدور" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE} disabled>اختر الدور</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nameAr}{r.universityId ? "" : " (منصة)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الكلية (اختياري)</Label>
                <Select value={newFacultyId} onValueChange={setNewFacultyId}>
                  <SelectTrigger><SelectValue placeholder="كل الكليات" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>كل الكليات</SelectItem>
                    {faculties.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>القسم (اختياري)</Label>
                <Select value={newDepartmentId} onValueChange={setNewDepartmentId}>
                  <SelectTrigger><SelectValue placeholder="كل الأقسام" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>كل الأقسام</SelectItem>
                    {departments
                      .filter((d) => newFacultyId === NONE || d.facultyId === newFacultyId)
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {assignError && <p className="text-sm text-red-600">{assignError}</p>}
            <Button onClick={assignRole} disabled={assigning}>
              <Plus className="w-4 h-4 ml-2" />
              {assigning ? "جارٍ الإسناد..." : "إسناد الدور"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
