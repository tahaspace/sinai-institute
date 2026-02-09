"use client"

import {
  CreditCard,
  Download,
  CheckCircle2,
  Clock,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// Children Fees
const childrenFees = [
  {
    id: 1,
    name: "أحمد محمد علي",
    avatar: "أ",
    total: 25000,
    paid: 20000,
    remaining: 5000,
    nextDue: "2025-01-15",
    payments: [
      { date: "2024-12-01", amount: 10000, method: "بطاقة ائتمان", status: "paid" },
      { date: "2024-11-01", amount: 10000, method: "فوري", status: "paid" },
      { date: "2025-01-15", amount: 5000, method: "-", status: "pending" },
    ],
  },
  {
    id: 2,
    name: "سارة محمد علي",
    avatar: "س",
    total: 18000,
    paid: 18000,
    remaining: 0,
    nextDue: null,
    payments: [
      { date: "2024-09-01", amount: 18000, method: "تحويل بنكي", status: "paid" },
    ],
  },
]

export default function ParentFeesPage() {
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
      <Tabs defaultValue="1">
        <TabsList className="w-full justify-start">
          {childrenFees.map((child) => (
            <TabsTrigger key={child.id} value={child.id.toString()} className="gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs bg-pink-100 text-pink-600">
                  {child.avatar}
                </AvatarFallback>
              </Avatar>
              {child.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {childrenFees.map((child) => {
          const progress = (child.paid / child.total) * 100

          return (
            <TabsContent key={child.id} value={child.id.toString()} className="mt-6">
              {/* Child Fee Summary */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{child.name}</h3>
                      {child.nextDue && (
                        <p className="text-sm text-muted-foreground">
                          موعد القسط القادم: {new Date(child.nextDue).toLocaleDateString("ar-EG")}
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
                              {new Date(payment.date).toLocaleDateString("ar-EG")} • {payment.method}
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
    </div>
  )
}



