"use client"

import Link from "next/link"
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  CreditCard,
  Bell,
  ChevronLeft,
  TrendingUp,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// Children Data
const children = [
  {
    id: 1,
    name: "أحمد محمد علي",
    grade: "الصف الثالث الثانوي",
    class: "3/1",
    attendance: 95,
    gpa: 3.8,
    avatar: "أ",
    recentGrade: { subject: "الرياضيات", grade: 48, total: 50 },
  },
  {
    id: 2,
    name: "سارة محمد علي",
    grade: "الصف الأول الإعدادي",
    class: "1/2",
    attendance: 98,
    gpa: 3.9,
    avatar: "س",
    recentGrade: { subject: "العلوم", grade: 45, total: 50 },
  },
]

// Notifications
const notifications = [
  { id: 1, type: "grade", message: "تم رصد درجة أحمد في الرياضيات", time: "منذ ساعة" },
  { id: 2, type: "attendance", message: "سارة حضرت اليوم", time: "منذ 3 ساعات" },
  { id: 3, type: "fee", message: "موعد سداد القسط الثالث", time: "أمس" },
]

// Fees Summary
const feesSummary = {
  ahmed: { total: 25000, paid: 20000, remaining: 5000 },
  sara: { total: 18000, paid: 18000, remaining: 0 },
}

export default function ParentDashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">مرحباً، محمد 👋</h1>
          <p className="text-muted-foreground">تابع أداء أبنائك اليوم</p>
        </div>
        <Badge variant="outline" className="gap-1 w-fit">
          <Calendar className="w-3 h-3" />
          {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </Badge>
      </div>

      {/* Children Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children.map((child) => (
          <Card key={child.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-2xl bg-pink-100 text-pink-600">
                    {child.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{child.name}</h3>
                  <p className="text-muted-foreground">{child.grade}</p>
                  <Badge variant="outline" className="mt-1">الفصل {child.class}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-center">
                  <ClipboardCheck className="w-6 h-6 mx-auto text-green-600 mb-1" />
                  <p className="text-xl font-bold text-green-600">{child.attendance}%</p>
                  <p className="text-xs text-muted-foreground">الحضور</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-center">
                  <GraduationCap className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                  <p className="text-xl font-bold text-blue-600">{child.gpa}</p>
                  <p className="text-xs text-muted-foreground">المعدل</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 mb-4">
                <p className="text-sm text-muted-foreground">آخر درجة</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-medium">{child.recentGrade.subject}</span>
                  <span className="font-bold text-green-600">
                    {child.recentGrade.grade}/{child.recentGrade.total}
                  </span>
                </div>
              </div>

              <Button className="w-full" variant="outline" asChild>
                <Link href={`/parent/children/${child.id}`}>
                  عرض التفاصيل
                  <ChevronLeft className="w-4 h-4 mr-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fees Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              ملخص المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {children.map((child) => {
                const fees = child.name.includes("أحمد") ? feesSummary.ahmed : feesSummary.sara
                const progress = (fees.paid / fees.total) * 100

                return (
                  <div key={child.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{child.name}</span>
                      <span className={cn(
                        "font-bold",
                        fees.remaining === 0 ? "text-green-600" : "text-orange-600"
                      )}>
                        {fees.remaining === 0 ? "مكتمل" : `${fees.remaining.toLocaleString()} ج.م متبقي`}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )
              })}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/parent/fees">
                عرض التفاصيل
                <ChevronLeft className="w-4 h-4 mr-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              الإشعارات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.map((notif) => (
                <div key={notif.id} className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    notif.type === "grade" && "bg-green-100 text-green-600",
                    notif.type === "attendance" && "bg-blue-100 text-blue-600",
                    notif.type === "fee" && "bg-orange-100 text-orange-600"
                  )}>
                    {notif.type === "grade" && <GraduationCap className="w-4 h-4" />}
                    {notif.type === "attendance" && <ClipboardCheck className="w-4 h-4" />}
                    {notif.type === "fee" && <CreditCard className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm">{notif.message}</p>
                    <p className="text-xs text-muted-foreground">{notif.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



