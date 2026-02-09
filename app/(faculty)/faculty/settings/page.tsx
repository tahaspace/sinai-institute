"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Settings, User, Bell, Lock, Palette, Globe, Save, Camera, Mail, Phone, Building, GraduationCap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

export default function FacultySettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    studentMessages: true,
    gradeReminders: true,
    scheduleChanges: true,
    researchUpdates: false,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-600" />
            الإعدادات
          </h1>
          <p className="text-gray-500 mt-1">إدارة حسابك وتفضيلاتك</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Save className="w-4 h-4 ml-2" />
          حفظ التغييرات
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            الملف الشخصي
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            الإشعارات
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="w-4 h-4" />
            الأمان
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            المظهر
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid gap-6">
            {/* Profile Picture */}
            <Card>
              <CardHeader>
                <CardTitle>الصورة الشخصية</CardTitle>
                <CardDescription>صورتك التي تظهر في النظام</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src="/avatars/faculty.jpg" />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                      د م
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button variant="outline">
                      <Camera className="w-4 h-4 ml-2" />
                      تغيير الصورة
                    </Button>
                    <p className="text-sm text-gray-500">JPG, GIF or PNG. الحد الأقصى 2MB</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>المعلومات الأساسية</CardTitle>
                <CardDescription>معلوماتك الشخصية والأكاديمية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <Input id="name" defaultValue="د. محمد أحمد علي" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">اللقب العلمي</Label>
                    <Select defaultValue="assistant">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lecturer">مدرس</SelectItem>
                        <SelectItem value="assistant">أستاذ مساعد</SelectItem>
                        <SelectItem value="associate">أستاذ مشارك</SelectItem>
                        <SelectItem value="professor">أستاذ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input id="email" type="email" defaultValue="m.ahmed@university.edu" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input id="phone" defaultValue="+20 100 123 4567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">القسم</Label>
                    <Input id="department" defaultValue="علوم الحاسب" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office">رقم المكتب</Label>
                    <Input id="office" defaultValue="مبنى أ - مكتب 205" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">نبذة مختصرة</Label>
                  <Textarea id="bio" rows={4} defaultValue="أستاذ مساعد في قسم علوم الحاسب، متخصص في الذكاء الاصطناعي والتعلم الآلي. حاصل على الدكتوراه من جامعة..." />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الإشعارات</CardTitle>
              <CardDescription>تحكم في طريقة تلقي الإشعارات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">طرق الإرسال</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium">إشعارات البريد الإلكتروني</p>
                      <p className="text-sm text-gray-500">استلام الإشعارات عبر البريد</p>
                    </div>
                  </div>
                  <Switch checked={notifications.email} onCheckedChange={(v) => setNotifications({...notifications, email: v})} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium">رسائل SMS</p>
                      <p className="text-sm text-gray-500">استلام الإشعارات الهامة عبر SMS</p>
                    </div>
                  </div>
                  <Switch checked={notifications.sms} onCheckedChange={(v) => setNotifications({...notifications, sms: v})} />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">أنواع الإشعارات</h3>
                {[
                  { key: "studentMessages", label: "رسائل الطلاب", desc: "عند استلام رسالة من طالب" },
                  { key: "gradeReminders", label: "تذكيرات الدرجات", desc: "تذكير برصد الدرجات" },
                  { key: "scheduleChanges", label: "تغييرات الجدول", desc: "عند تغيير في الجدول الدراسي" },
                  { key: "researchUpdates", label: "تحديثات البحث العلمي", desc: "أخبار المنح والمؤتمرات" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <Switch 
                      checked={notifications[item.key as keyof typeof notifications]} 
                      onCheckedChange={(v) => setNotifications({...notifications, [item.key]: v})} 
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>تغيير كلمة المرور</CardTitle>
                <CardDescription>تأكد من استخدام كلمة مرور قوية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current">كلمة المرور الحالية</Label>
                  <Input id="current" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new">كلمة المرور الجديدة</Label>
                  <Input id="new" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
                  <Input id="confirm" type="password" />
                </div>
                <Button>تغيير كلمة المرور</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>المصادقة الثنائية</CardTitle>
                <CardDescription>أضف طبقة حماية إضافية لحسابك</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">تفعيل المصادقة الثنائية</p>
                    <p className="text-sm text-gray-500">استخدم تطبيق المصادقة أو SMS</p>
                  </div>
                  <Button variant="outline">تفعيل</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>المظهر والعرض</CardTitle>
              <CardDescription>تخصيص شكل الواجهة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الوضع</Label>
                  <Select defaultValue="system">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">فاتح</SelectItem>
                      <SelectItem value="dark">داكن</SelectItem>
                      <SelectItem value="system">تلقائي (حسب النظام)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>اللغة</Label>
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
                  <Label>حجم الخط</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">صغير</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="large">كبير</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
