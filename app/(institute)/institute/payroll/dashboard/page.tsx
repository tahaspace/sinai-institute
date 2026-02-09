"use client"

import { motion } from "framer-motion"
import {
  Wallet,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

// إحصائيات الرواتب للمعهد
const payrollStats = {
  totalEmployees: 320,
  totalPayroll: 8500000,
  netPayroll: 7400000,
  deductions: 1100000,
  facultyCount: 120,
  facultySalary: 5500000,
  staffCount: 200,
  staffSalary: 3000000,
}

// حالة مسير الرواتب
const payrollStatus = [
  { month: "نوفمبر 2024", status: "completed", amount: 8500000, date: "2024-11-25" },
  { month: "أكتوبر 2024", status: "completed", amount: 8300000, date: "2024-10-25" },
  { month: "سبتمبر 2024", status: "completed", amount: 8200000, date: "2024-09-25" },
  { month: "ديسمبر 2024", status: "pending", amount: 8600000, date: "-" },
]

// ملخص الخصومات
const deductionsSummary = [
  { type: "التأمينات الاجتماعية", amount: 580000, percentage: 52.7 },
  { type: "ضريبة كسب العمل", amount: 350000, percentage: 31.8 },
  { type: "سلف وقروض", amount: 120000, percentage: 10.9 },
  { type: "خصومات أخرى", amount: 50000, percentage: 4.6 },
]

export default function InstitutePayrollDashboardPage() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-institute-blue text-green-800">
            <CheckCircle className="h-3 w-3 ml-1" />
            مكتمل
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 ml-1" />
            قيد الإعداد
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-8 w-8 text-institute-blue" />
            لوحة متابعة الرواتب
          </h1>
          <p className="text-muted-foreground">
            إدارة ومتابعة رواتب منسوبي المعهد
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 ml-2" />
            تصدير التقرير
          </Button>
          <Button className="bg-institute-blue hover:bg-institute-blue">
            <FileText className="h-4 w-4 ml-2" />
            إعداد مسير جديد
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-institute-blue to-institute-blue dark:from-institute-blue/20 dark:to-institute-blue/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الموظفين</p>
                <p className="text-2xl font-bold text-institute-blue">
                  {payrollStats.totalEmployees}
                </p>
              </div>
              <Users className="h-8 w-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الرواتب</p>
                <p className="text-2xl font-bold text-green-700 font-mono">
                  {formatCurrency(payrollStats.totalPayroll)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">صافي المستحق</p>
                <p className="text-2xl font-bold text-blue-700 font-mono">
                  {formatCurrency(payrollStats.netPayroll)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الخصومات</p>
                <p className="text-2xl font-bold text-amber-700 font-mono">
                  {formatCurrency(payrollStats.deductions)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* توزيع الرواتب */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع الرواتب حسب الفئة</CardTitle>
            <CardDescription>
              رواتب هيئة التدريس والموظفين
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-institute-blue rounded-full"></div>
                  <span className="font-medium">أعضاء هيئة التدريس</span>
                </div>
                <Badge variant="outline">{payrollStats.facultyCount}</Badge>
              </div>
              <p className="text-2xl font-bold font-mono text-institute-blue mb-2">
                {formatCurrency(payrollStats.facultySalary)}
              </p>
              <Progress 
                value={(payrollStats.facultySalary / payrollStats.totalPayroll) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {((payrollStats.facultySalary / payrollStats.totalPayroll) * 100).toFixed(1)}% من الإجمالي
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-institute-blue rounded-full"></div>
                  <span className="font-medium">الموظفون</span>
                </div>
                <Badge variant="outline">{payrollStats.staffCount}</Badge>
              </div>
              <p className="text-2xl font-bold font-mono text-blue-700 mb-2">
                {formatCurrency(payrollStats.staffSalary)}
              </p>
              <Progress 
                value={(payrollStats.staffSalary / payrollStats.totalPayroll) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {((payrollStats.staffSalary / payrollStats.totalPayroll) * 100).toFixed(1)}% من الإجمالي
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ملخص الخصومات */}
        <Card>
          <CardHeader>
            <CardTitle>ملخص الخصومات</CardTitle>
            <CardDescription>
              توزيع الخصومات الشهرية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deductionsSummary.map((item) => (
              <div key={item.type} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{item.type}</span>
                  <Badge variant="outline">{item.percentage}%</Badge>
                </div>
                <p className="text-lg font-bold font-mono text-red-600">
                  {formatCurrency(item.amount)}
                </p>
                <Progress value={item.percentage} className="h-2 mt-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* حالة المسيرات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            حالة مسيرات الرواتب
          </CardTitle>
          <CardDescription>
            آخر المسيرات المعدة والقادمة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payrollStatus.map((item) => (
              <div key={item.month} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-semibold">{item.month}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.date !== "-" ? `تم الصرف: ${item.date}` : "لم يتم الصرف بعد"}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-bold font-mono text-lg">
                    {formatCurrency(item.amount)}
                  </p>
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
