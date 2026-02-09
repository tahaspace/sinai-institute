"use client"

import { useState } from "react"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Camera,
  Save,
  Shield,
  Key,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Student Data
const studentData = {
  id: "STU-2024-001",
  name: "أحمد محمد علي",
  nameEn: "Ahmed Mohamed Ali",
  email: "ahmed.student@school.edu",
  phone: "01012345678",
  nationalId: "30012345678901",
  birthDate: "2007-05-15",
  address: "القاهرة، مصر الجديدة، شارع الثورة",
  grade: "الصف الثالث الثانوي",
  section: "علمي رياضة",
  class: "3/1",
  enrollmentDate: "2022-09-01",
  status: "active",
}

// Parent Info
const parentInfo = {
  fatherName: "محمد علي أحمد",
  fatherPhone: "01098765432",
  fatherJob: "مهندس",
  motherName: "فاطمة أحمد محمود",
  motherPhone: "01123456789",
  motherJob: "طبيبة",
}

export default function StudentProfilePage() {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الملف الشخصي</h1>
          <p className="text-muted-foreground">عرض وتعديل بياناتك الشخصية</p>
        </div>
      </div>

      {/* Tabs */}
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
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-4 h-4 ml-2" />
                        حفظ
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
                      value={studentData.name}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم بالإنجليزية</Label>
                    <Input
                      value={studentData.nameEn}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      value={studentData.email}
                      disabled={!isEditing}
                      type="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input
                      value={studentData.phone}
                      disabled={!isEditing}
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
                      value={new Date(studentData.birthDate).toLocaleDateString("ar-EG")}
                      disabled
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>العنوان</Label>
                    <Input
                      value={studentData.address}
                      disabled={!isEditing}
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
                  <p className="text-sm text-muted-foreground">الفصل</p>
                  <p className="font-medium">{studentData.class}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">تاريخ الالتحاق</p>
                  <p className="font-medium">
                    {new Date(studentData.enrollmentDate).toLocaleDateString("ar-EG")}
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
    </div>
  )
}



