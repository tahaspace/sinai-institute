"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  GraduationCap,
  ClipboardCheck,
  CreditCard,
  Bell,
  ChevronLeft,
  AlertTriangle,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// --- API response shapes (served by /api/parent/dashboard) ---
interface ChildFees {
  total: number
  paid: number
  remaining: number
}
interface Child {
  id: string
  name: string
  studentCode: string
  gpa: number
  attendance: number
  activeWarnings: number
  fees: ChildFees
}
interface FeesSummary {
  totalDue: number
  totalPaid: number
  remaining: number
}
interface DashboardNotification {
  id: string
  type: string
  message: string
  time: string
}
interface DashboardResponse {
  children: Child[]
  feesSummary: FeesSummary
  notifications: DashboardNotification[]
}

export default function ParentDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/parent/dashboard`)
        if (!res.ok) {
          throw new Error("فشل في جلب لوحة التحكم")
        }
        const json = (await res.json()) as DashboardResponse
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

  const children = data?.children ?? []
  const notifications = data?.notifications ?? []
  const feesSummary = data?.feesSummary

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

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل لوحة التحكم...</CardContent>
        </Card>
      )}

      {!loading && !error && data && (
      <>
      {/* Children Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children.map((child) => (
          <Card key={child.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-2xl bg-pink-100 text-pink-600">
                    {child.name?.charAt(0) || "—"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{child.name}</h3>
                  <p className="text-muted-foreground">{child.studentCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-center">
                  <ClipboardCheck className="w-6 h-6 mx-auto text-green-600 mb-1" />
                  <p className="text-xl font-bold text-green-600">{child.attendance ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">الحضور</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-center">
                  <GraduationCap className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                  <p className="text-xl font-bold text-blue-600">{child.gpa ?? 0}</p>
                  <p className="text-xs text-muted-foreground">المعدل</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-center">
                  <AlertTriangle className="w-6 h-6 mx-auto text-orange-600 mb-1" />
                  <p className="text-xl font-bold text-orange-600">{child.activeWarnings ?? 0}</p>
                  <p className="text-xs text-muted-foreground">الإنذارات</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 mb-4">
                <p className="text-sm text-muted-foreground">المصروفات المتبقية</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-medium">المتبقي</span>
                  <span className={cn(
                    "font-bold",
                    (child.fees?.remaining ?? 0) === 0 ? "text-green-600" : "text-orange-600"
                  )}>
                    {(child.fees?.remaining ?? 0).toLocaleString()} ج.م
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
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">الإجمالي المستحق</p>
                  <p className="text-lg font-bold">{(feesSummary?.totalDue ?? 0).toLocaleString()} ج.م</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">المدفوع</p>
                  <p className="text-lg font-bold text-green-600">{(feesSummary?.totalPaid ?? 0).toLocaleString()} ج.م</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">المتبقي</p>
                  <p className={cn(
                    "text-lg font-bold",
                    (feesSummary?.remaining ?? 0) === 0 ? "text-green-600" : "text-orange-600"
                  )}>
                    {(feesSummary?.remaining ?? 0).toLocaleString()} ج.م
                  </p>
                </div>
              </div>
              <Progress
                value={
                  (feesSummary?.totalDue ?? 0) > 0
                    ? ((feesSummary?.totalPaid ?? 0) / (feesSummary?.totalDue ?? 1)) * 100
                    : 0
                }
                className="h-2"
              />
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
      </>
      )}
    </div>
  )
}



