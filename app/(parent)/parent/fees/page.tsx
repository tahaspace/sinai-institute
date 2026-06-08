"use client"

import { useState, useEffect } from "react"
import {
  CreditCard,
  Download,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// --- API response shape (served by /api/parent/fees) ---
interface FeeItem {
  label: string
  amount: number
}

interface Payment {
  date: string | null
  amount: number
  method: string
  status: "paid" | "pending" | "overdue"
}

interface ChildFees {
  id: string
  name: string
  studentCode: string
  total: number
  paid: number
  remaining: number
  nextDueDate: string | null
  items: FeeItem[]
  payments: Payment[]
}

export default function ParentFeesPage() {
  const [childrenFees, setChildrenFees] = useState<ChildFees[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/parent/fees`)
        if (!res.ok) throw new Error("فشل في جلب المصروفات")
        const json = await res.json()
        if (!cancelled) setChildrenFees(json.childrenFees ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const totalFees = childrenFees.reduce((acc, c) => acc + c.total, 0)
  const totalPaid = childrenFees.reduce((acc, c) => acc + c.paid, 0)
  const totalRemaining = childrenFees.reduce((acc, c) => acc + c.remaining, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المصروفات الدراسية</h1>
          <p className="text-muted-foreground">إدارة مصروفات الأبناء</p>
        </div>
        <Button>
          <CreditCard className="w-4 h-4 ml-2" />
          دفع الآن
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل المصروفات...</CardContent></Card>}

      {!loading && !error && childrenFees.length === 0 && (
        <Card><CardContent className="p-12 text-center text-muted-foreground">لا يوجد أبناء مرتبطون بهذا الحساب</CardContent></Card>
      )}

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">إجمالي المصروفات</span>
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{totalFees.toLocaleString()} ج.م</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">المدفوع</span>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">{totalPaid.toLocaleString()} ج.م</p>
          </CardContent>
        </Card>
        <Card className={cn(totalRemaining > 0 && "border-orange-200 bg-orange-50 dark:bg-orange-950/20")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">المتبقي</span>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-orange-600">{totalRemaining.toLocaleString()} ج.م</p>
          </CardContent>
        </Card>
      </div>

      {/* Children Tabs */}
      {!loading && !error && childrenFees.length > 0 && (
      <Tabs defaultValue={childrenFees[0].id}>
        <TabsList className="w-full justify-start">
          {childrenFees.map((child) => (
            <TabsTrigger key={child.id} value={child.id} className="gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs bg-pink-100 text-pink-600">
                  {child.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {child.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {childrenFees.map((child) => {
          const progress = child.total > 0 ? (child.paid / child.total) * 100 : 0

          return (
            <TabsContent key={child.id} value={child.id} className="mt-6">
              {/* Child Fee Summary */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{child.name}</h3>
                      <p className="text-sm text-muted-foreground">رقم الطالب: {child.studentCode}</p>
                      {child.nextDueDate && (
                        <p className="text-sm text-muted-foreground">
                          موعد القسط القادم: {new Date(child.nextDueDate).toLocaleDateString("ar-EG")}
                        </p>
                      )}
                    </div>
                    <div className="text-left">
                      <p className={cn(
                        "text-2xl font-bold",
                        child.remaining === 0 ? "text-green-600" : "text-orange-600"
                      )}>
                        {child.remaining === 0 ? "مكتمل" : `${child.remaining.toLocaleString()} ج.م`}
                      </p>
                      <p className="text-sm text-muted-foreground">المتبقي</p>
                    </div>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {child.paid.toLocaleString()} من {child.total.toLocaleString()} ج.م
                  </p>
                </CardContent>
              </Card>

              {/* Fee Breakdown */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>تفاصيل المصروفات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {child.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">{item.amount.toLocaleString()} ج.م</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle>سجل المدفوعات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {child.payments.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            payment.status === "paid" ? "bg-green-100" : "bg-yellow-100"
                          )}>
                            {payment.status === "paid" ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{payment.amount.toLocaleString()} ج.م</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.date ? new Date(payment.date).toLocaleDateString("ar-EG") : "—"} • {payment.method}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn(
                            payment.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {payment.status === "paid" ? "مدفوع" : "قيد الانتظار"}
                          </Badge>
                          {payment.status === "paid" && (
                            <Button variant="ghost" size="icon">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>
      )}
    </div>
  )
}



