"use client"

import { useState, useEffect } from "react"
import {
  User,
  Phone,
  Edit,
  Camera,
  Save,
  Shield,
  Key,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- API response shapes (served by /api/student/profile) ---
interface StudentData {
  id: string
  name: string
  nameEn: string
  email: string
  phone: string
  nationalId: string
  birthDate: string
  address: string
  grade: string
  section: string
  enrollmentDate: string
  status: string
}
interface ParentInfo {
  fatherName: string
  fatherPhone: string
  fatherJob: string
  motherName: string
  motherPhone: string
  motherJob: string
}
interface ProfileResponse {
  studentData: StudentData
  parentInfo: ParentInfo
}

const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString("ar-EG") : "-")

export default function StudentProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [data, setData] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", nameEn: "", email: "", phone: "", address: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/student/profile`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || "فشل في جلب الملف الشخصي")
        }
        const json = (await res.json()) as ProfileResponse
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const studentData = data?.studentData
  const parentInfo = data?.parentInfo

  const startEdit = () => {
    if (!studentData) return
    setForm({
      name: studentData.name,
      nameEn: studentData.nameEn,
      email: studentData.email,
      phone: studentData.phone,
      address: studentData.address,
    })
    setIsEditing(true)
  }

  const saveProfile = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/student/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error || "فشل في حفظ الملف الشخصي")
      }
      // refresh from the server so the view reflects the saved values
      const fresh = (await (await fetch(`/api/student/profile`)).json()) as ProfileResponse
      setData(fresh)
      setIsEditing(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الملف الشخصي</h1>
          <p className="text-muted-foreground">عرض وتعديل بياناتك الشخصية</p>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الملف الشخصي...</CardContent>
        </Card>
      )}

      {!loading && !error && studentData && parentInfo && (
      /* Tabs */
      <Tabs defaultValue="personal">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="personal">البيانات الشخصية</TabsTrigger>
          <TabsTrigger value="academic">البيانات الأكاديمية</TabsTrigger>
          <TabsTrigger value="security">الأمان</TabsTrigger>
        </TabsList>

        {/* Personal Data Tab */}
        <TabsContent value="personal" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src="/avatars/student.jpg" />
                    <AvatarFallback className="text-4xl bg-blue-100 text-blue-600">
                      أ
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute bottom-0 left-0 w-8 h-8 rounded-full"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="text-xl font-bold">{studentData.name}</h3>
                <p className="text-muted-foreground">{studentData.nameEn}</p>
                <Badge className="mt-2 bg-green-100 text-green-700">طالب نشط</Badge>
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                  <p>رقم الطالب: {studentData.id}</p>
                </div>
              </CardContent>
            </Card>

            {/* Personal Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>المعلومات الشخصية</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => (isEditing ? saveProfile() : startEdit())}
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-4 h-4 ml-2" />
                        {saving ? "جارٍ الحفظ..." : "حفظ"}
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 ml-2" />
                        تعديل
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الاسم بالعربية</Label>
                    <Input
                      value={isEditing ? form.name : studentData.name}
                      disabled={!isEditing}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم بالإنجليزية</Label>
                    <Input
                      value={isEditing ? form.nameEn : studentData.nameEn}
                      disabled={!isEditing}
                      onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      value={isEditing ? form.email : studentData.email}
                      disabled={!isEditing}
                      type="email"
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input
                      value={isEditing ? form.phone : studentData.phone}
                      disabled={!isEditing}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الرقم القومي</Label>
                    <Input
                      value={studentData.nationalId}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ الميلاد</Label>
                    <Input
                      value={formatDate(studentData.birthDate)}
                      disabled
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>العنوان</Label>
                    <Input
                      value={isEditing ? form.address : studentData.address}
                      disabled={!isEditing}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parent Info */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>بيانات ولي الأمر</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">الأب</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">الاسم</p>
                          <p className="font-medium">{parentInfo.fatherName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">الهاتف</p>
                          <p className="font-medium">{parentInfo.fatherPhone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">الأم</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">الاسم</p>
                          <p className="font-medium">{parentInfo.motherName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">الهاتف</p>
                          <p className="font-medium">{parentInfo.motherPhone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Academic Data Tab */}
        <TabsContent value="academic" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>البيانات الأكاديمية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">المرحلة الدراسية</p>
                  <p className="font-medium">{studentData.grade}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">الشعبة</p>
                  <p className="font-medium">{studentData.section}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">تاريخ الالتحاق</p>
                  <p className="font-medium">
                    {formatDate(studentData.enrollmentDate)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">رقم الطالب</p>
                  <p className="font-medium">{studentData.id}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge className="bg-green-100 text-green-700">نشط</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                الأمان وكلمة المرور
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">تغيير كلمة المرور</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>كلمة المرور الحالية</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div></div>
                  <div className="space-y-2">
                    <Label>كلمة المرور الجديدة</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label>تأكيد كلمة المرور</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                </div>
                <Button>
                  <Key className="w-4 h-4 ml-2" />
                  تغيير كلمة المرور
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  )
}



