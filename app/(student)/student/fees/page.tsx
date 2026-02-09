"use client"

import { useState } from "react"
import {
  CreditCard,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Wallet,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Fees Data
const feesData = {
  totalFees: 25000,
  paid: 20000,
  remaining: 5000,
  nextDueDate: "2025-01-15",
  installments: 3,
  paidInstallments: 2,
}

// Payment History
const paymentHistory = [
  { id: 1, date: "2024-12-01", amount: 10000, method: "بطاقة ائتمان", receipt: "RCP-001", status: "paid" },
  { id: 2, date: "2024-11-01", amount: 10000, method: "فوري", receipt: "RCP-002", status: "paid" },
  { id: 3, date: "2025-01-15", amount: 5000, method: "-", receipt: "-", status: "pending" },
]

// Fee Breakdown
const feeBreakdown = [
  { item: "الرسوم الدراسية", amount: 20000 },
  { item: "رسوم الكتب", amount: 2000 },
  { item: "رسوم الأنشطة", amount: 1500 },
  { item: "رسوم النقل", amount: 1500 },
]

// Payment Methods
const paymentMethods = [
  { id: "card", name: "بطاقة ائتمان", icon: CreditCard },
  { id: "fawry", name: "فوري", icon: Receipt },
  { id: "wallet", name: "محفظة إلكترونية", icon: Wallet },
]

const statusConfig = {
  paid: { label: "مدفوع", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  overdue: { label: "متأخر", color: "bg-red-100 text-red-700", icon: AlertCircle },
}

export default function StudentFeesPage() {
  const [selectedMethod, setSelectedMethod] = useState("card")
  const paidPercentage = (feesData.paid / feesData.totalFees) * 100

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المصروفات الدراسية</h1>
          <p className="text-muted-foreground">إدارة المصروفات والمدفوعات</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <Badge variant="outline">2024/2025</Badge>
            </div>
            <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
            <p className="text-3xl font-bold">{feesData.totalFees.toLocaleString()} ج.م</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-green-600 font-bold">{paidPercentage.toFixed(0)}%</span>
            </div>
            <p className="text-sm text-muted-foreground">المدفوع</p>
            <p className="text-3xl font-bold text-green-600">{feesData.paid.toLocaleString()} ج.م</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <Badge className="bg-orange-100 text-orange-700">
                <Calendar className="w-3 h-3 ml-1" />
                {new Date(feesData.nextDueDate).toLocaleDateString("ar-EG")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">المتبقي</p>
            <p className="text-3xl font-bold text-orange-600">{feesData.remaining.toLocaleString()} ج.م</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold">تقدم السداد</h3>
              <p className="text-sm text-muted-foreground">
                {feesData.paidInstallments} من {feesData.installments} أقساط
              </p>
            </div>
            <span className="text-2xl font-bold text-green-600">{paidPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={paidPercentage} className="h-4" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="history">سجل المدفوعات</TabsTrigger>
          <TabsTrigger value="breakdown">تفاصيل الرسوم</TabsTrigger>
          <TabsTrigger value="pay">دفع الآن</TabsTrigger>
        </TabsList>

        {/* Payment History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>سجل المدفوعات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentHistory.map((payment) => {
                  const status = statusConfig[payment.status as keyof typeof statusConfig]
                  const StatusIcon = status.icon

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          payment.status === "paid" ? "bg-green-100" : "bg-yellow-100"
                        )}>
                          <StatusIcon className={cn(
                            "w-5 h-5",
                            payment.status === "paid" ? "text-green-600" : "text-yellow-600"
                          )} />
                        </div>
                        <div>
                          <p className="font-medium">{payment.amount.toLocaleString()} ج.م</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(payment.date).toLocaleDateString("ar-EG")} • {payment.method}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={status.color}>{status.label}</Badge>
                        {payment.status === "paid" && (
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Breakdown Tab */}
        <TabsContent value="breakdown" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الرسوم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feeBreakdown.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <span>{item.item}</span>
                    <span className="font-bold">{item.amount.toLocaleString()} ج.م</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200">
                  <span className="font-bold">الإجمالي</span>
                  <span className="font-bold text-blue-600 text-xl">
                    {feesData.totalFees.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pay Now Tab */}
        <TabsContent value="pay" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>دفع المصروفات</CardTitle>
              <CardDescription>اختر طريقة الدفع المناسبة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Amount */}
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200">
                  <p className="text-sm text-muted-foreground">المبلغ المستحق</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {feesData.remaining.toLocaleString()} ج.م
                  </p>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3">
                  <p className="font-medium">طريقة الدفع</p>
                  <div className="grid grid-cols-3 gap-4">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={cn(
                          "p-4 rounded-lg border-2 text-center transition-all",
                          selectedMethod === method.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                            : "border-muted hover:border-blue-300"
                        )}
                      >
                        <method.icon className={cn(
                          "w-8 h-8 mx-auto mb-2",
                          selectedMethod === method.id ? "text-blue-600" : "text-muted-foreground"
                        )} />
                        <p className="text-sm font-medium">{method.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full" size="lg">
                  <CreditCard className="w-4 h-4 ml-2" />
                  ادفع الآن
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



