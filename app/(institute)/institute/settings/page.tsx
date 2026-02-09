"use client"

import { useState } from "react"
import {
  Settings,
  Building2,
  Users,
  Shield,
  Bell,
  Globe,
  Mail,
  Save,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  CreditCard,
  Palette,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Admin Users
const adminUsers = [
  { id: 1, name: "أحمد محمد", email: "ahmed@institute.com", role: "مدير النظام", status: "active" },
  { id: 2, name: "سارة خالد", email: "sara@institute.com", role: "مسؤول التسجيل", status: "active" },
  { id: 3, name: "محمد سعيد", email: "mohamed@institute.com", role: "مسؤول التسويق", status: "active" },
]

// Roles
const roles = [
  { id: 1, name: "مدير النظام", users: 1, permissions: "كاملة" },
  { id: 2, name: "مسؤول التسجيل", users: 2, permissions: "التسجيل والمتدربين" },
  { id: 3, name: "مسؤول التسويق", users: 1, permissions: "التسويق والحملات" },
  { id: 4, name: "مدرب", users: 45, permissions: "الدورات والتقييم" },
]

export default function SettingsPage() {
  const [instituteName, setInstituteName] = useState("معهد التقنية للتدريب المهني")
  const [instituteNameEn, setInstituteNameEn] = useState("Tech Training Institute")
  const [email, setEmail] = useState("info@tech-institute.com")
  const [phone, setPhone] = useState("01012345678")
  const [address, setAddress] = useState("القاهرة، مصر الجديدة، شارع الثورة")

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الإعدادات</h1>
          <p className="text-muted-foreground">إعدادات المعهد والمستخدمين والنظام</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="general">عام</TabsTrigger>
          <TabsTrigger value="users">المستخدمين</TabsTrigger>
          <TabsTrigger value="roles">الصلاحيات</TabsTrigger>
          <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
          <TabsTrigger value="payment">الدفع</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Institute Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  معلومات المعهد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instituteName">اسم المعهد (عربي)</Label>
                  <Input
                    id="instituteName"
                    value={instituteName}
                    onChange={(e) => setInstituteName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instituteNameEn">اسم المعهد (إنجليزي)</Label>
                  <Input
                    id="instituteNameEn"
                    value={instituteNameEn}
                    onChange={(e) => setInstituteNameEn(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">الهاتف</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">العنوان</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <Button className="w-full">
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التغييرات
                </Button>
              </CardContent>
            </Card>

            {/* Training Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  إعدادات التدريب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionDuration">مدة الجلسة الافتراضية</Label>
                  <Select defaultValue="3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">ساعتان</SelectItem>
                      <SelectItem value="3">3 ساعات</SelectItem>
                      <SelectItem value="4">4 ساعات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minAttendance">الحد الأدنى للحضور (%)</Label>
                  <Input id="minAttendance" type="number" defaultValue="75" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certificateThreshold">الحد الأدنى للشهادة (%)</Label>
                  <Input id="certificateThreshold" type="number" defaultValue="70" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>إصدار الشهادات تلقائياً</Label>
                    <p className="text-xs text-muted-foreground">
                      عند اجتياز الحد الأدنى
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>السماح بالتسجيل الإلكتروني</Label>
                    <p className="text-xs text-muted-foreground">
                      عبر الموقع الإلكتروني
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Localization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  اللغة والتوطين
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">اللغة الافتراضية</Label>
                  <Select defaultValue="ar">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">المنطقة الزمنية</Label>
                  <Select defaultValue="africa_cairo">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="africa_cairo">Africa/Cairo (GMT+2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">العملة</Label>
                  <Select defaultValue="egp">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="egp">جنيه مصري (ج.م)</SelectItem>
                      <SelectItem value="usd">دولار أمريكي ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Branding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  الهوية البصرية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>شعار المعهد</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg bg-institute-blue flex items-center justify-center">
                      <Building2 className="w-10 h-10 text-institute-blue" />
                    </div>
                    <Button variant="outline">تغيير الشعار</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">اللون الأساسي</Label>
                  <div className="flex items-center gap-2">
                    <Input id="primaryColor" defaultValue="#14B8A6" className="w-32" />
                    <div className="w-10 h-10 rounded-lg bg-institute-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>مستخدمي النظام</CardTitle>
                  <CardDescription>إدارة المستخدمين والصلاحيات</CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة مستخدم
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adminUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-institute-blue text-institute-blue">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{user.role}</Badge>
                      <Badge className="bg-institute-blue text-green-700">نشط</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>الأدوار والصلاحيات</CardTitle>
                  <CardDescription>إدارة أدوار المستخدمين وصلاحياتهم</CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 ml-2" />
                  دور جديد
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-institute-blue flex items-center justify-center">
                        <Shield className="w-6 h-6 text-institute-blue" />
                      </div>
                      <div>
                        <p className="font-medium">{role.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {role.users} مستخدم • {role.permissions}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 ml-2" />
                        تعديل
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                إعدادات الإشعارات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>إشعارات البريد الإلكتروني</Label>
                  <p className="text-sm text-muted-foreground">
                    إرسال إشعارات للمتدربين عبر البريد
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>إشعارات SMS</Label>
                  <p className="text-sm text-muted-foreground">
                    إرسال رسائل نصية للمتدربين
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>تذكير بالجلسات</Label>
                  <p className="text-sm text-muted-foreground">
                    إرسال تذكير قبل الجلسات
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>إشعار إصدار الشهادة</Label>
                  <p className="text-sm text-muted-foreground">
                    إعلام المتدرب عند إصدار شهادته
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                إعدادات الدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>الدفع الإلكتروني</Label>
                  <p className="text-sm text-muted-foreground">
                    تفعيل الدفع عبر البوابات الإلكترونية
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>التقسيط</Label>
                  <p className="text-sm text-muted-foreground">
                    السماح بالدفع على أقساط
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label>طرق الدفع المتاحة</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <CreditCard className="w-3 h-3" />
                    بطاقة ائتمان
                  </Badge>
                  <Badge variant="outline">فوري</Badge>
                  <Badge variant="outline">أمان</Badge>
                  <Badge variant="outline">تحويل بنكي</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



