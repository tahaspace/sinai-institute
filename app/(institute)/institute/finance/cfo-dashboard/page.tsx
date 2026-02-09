"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw,
  Download,
  Bell,
  GraduationCap,
  Building2,
  BookOpen,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// مؤشرات الأداء المالي للمعهد
const instituteKPIs = [
  {
    id: "revenue",
    title: "إجمالي الإيرادات",
    value: 42000000,
    previousValue: 38000000,
    target: 45000000,
    trend: "up",
    change: 10.5,
    icon: TrendingUp,
    color: "green",
  },
  {
    id: "expenses",
    title: "إجمالي المصروفات",
    value: 32000000,
    previousValue: 30000000,
    target: 31000000,
    trend: "up",
    change: 6.7,
    icon: TrendingDown,
    color: "red",
  },
  {
    id: "profit",
    title: "صافي الربح",
    value: 10000000,
    previousValue: 8000000,
    target: 14000000,
    trend: "up",
    change: 25.0,
    icon: DollarSign,
    color: "blue",
  },
  {
    id: "collection",
    title: "نسبة التحصيل",
    value: 89.5,
    previousValue: 85.2,
    target: 95,
    trend: "up",
    change: 4.3,
    icon: Target,
    color: "teal",
    isPercentage: true,
  },
]

// إيرادات الأقسام
const revenueByDepartment = [
  { department: "قسم الحاسبات والمعلومات", amount: 12500000, students: 850, percentage: 29.8 },
  { department: "قسم إدارة الأعمال", amount: 10800000, students: 920, percentage: 25.7 },
  { department: "قسم الهندسة", amount: 9200000, students: 580, percentage: 21.9 },
  { department: "قسم المحاسبة", amount: 5500000, students: 450, percentage: 13.1 },
  { department: "قسم نظم المعلومات", amount: 4000000, students: 320, percentage: 9.5 },
]

// التنبيهات المالية
const financialAlerts = [
  {
    id: 1,
    type: "warning",
    title: "متأخرات تحصيل مرتفعة",
    description: "125 طالب لم يسدد رسوم الفصل الحالي",
    amount: 2850000,
    priority: "high",
  },
  {
    id: 2,
    type: "info",
    title: "موعد سداد التأمينات",
    description: "يجب سداد التأمينات الاجتماعية قبل 15 يناير",
    amount: 185000,
    priority: "medium",
  },
  {
    id: 3,
    type: "success",
    title: "تحقيق هدف التحصيل",
    description: "تم تحقيق 102% من هدف التحصيل لقسم الحاسبات",
    amount: null,
    priority: "low",
  },
]

// مقارنة الفصول
const semesterComparison = [
  { semester: "خريف 2023", revenue: 19500000, students: 2800 },
  { semester: "ربيع 2024", revenue: 18200000, students: 2750 },
  { semester: "خريف 2024", revenue: 21000000, students: 3120 },
]

export default function InstituteCFODashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("year")
  const [selectedDepartment, setSelectedDepartment] = useState("all")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "info":
        return <Bell className="h-5 w-5 text-blue-500" />
      default:
        return <Bell className="h-5 w-5" />
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
            <BarChart3 className="h-8 w-8 text-institute-blue" />
            لوحة تحكم المدير المالي - المعهد العالي
          </h1>
          <p className="text-muted-foreground">
            نظرة شاملة على الأداء المالي للمعهد والأقسام
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <Building2 className="h-4 w-4 ml-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأقسام</SelectItem>
              {revenueByDepartment.map((d) => (
                <SelectItem key={d.department} value={d.department}>
                  {d.department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 ml-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semester">الفصل الحالي</SelectItem>
              <SelectItem value="year">السنة الأكاديمية</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {instituteKPIs.map((kpi) => {
          const Icon = kpi.icon
          const progressValue = (kpi.value / kpi.target) * 100

          return (
            <Card key={kpi.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{kpi.title}</span>
                  <div
                    className={`p-2 rounded-lg ${
                      kpi.color === "green"
                        ? "bg-institute-blue text-institute-blue"
                        : kpi.color === "red"
                        ? "bg-red-100 text-red-600"
                        : kpi.color === "blue"
                        ? "bg-institute-blue text-institute-blue"
                        : "bg-institute-blue text-institute-blue"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold font-mono">
                    {kpi.isPercentage ? `${kpi.value}%` : formatCurrency(kpi.value)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        kpi.trend === "up" && kpi.id !== "expenses"
                          ? "bg-institute-blue text-green-800"
                          : kpi.trend === "up" && kpi.id === "expenses"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {kpi.trend === "up" ? (
                        <ArrowUpRight className="h-3 w-3 ml-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 ml-1" />
                      )}
                      {kpi.change}%
                    </Badge>
                  </div>
                  <Progress value={Math.min(progressValue, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* إيرادات الأقسام */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                توزيع الإيرادات حسب القسم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueByDepartment.map((dept, index) => {
                  const colors = [
                    "bg-institute-blue",
                    "bg-institute-blue",
                    "bg-institute-blue",
                    "bg-amber-500",
                    "bg-institute-gold",
                  ]
                  return (
                    <div key={dept.department} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${colors[index]}`}></div>
                          <span className="text-sm">{dept.department}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm">
                            {formatCurrency(dept.amount)}
                          </span>
                          <Badge variant="outline">{dept.percentage}%</Badge>
                        </div>
                      </div>
                      <Progress value={dept.percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{dept.students} طالب</span>
                        <span>متوسط/طالب: {formatCurrency(dept.amount / dept.students)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* التنبيهات */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                التنبيهات المالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                        {alert.amount && (
                          <p className="text-sm font-mono text-institute-blue mt-1">
                            {formatCurrency(alert.amount)}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          alert.priority === "high"
                            ? "destructive"
                            : alert.priority === "medium"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {alert.priority === "high" ? "عاجل" : alert.priority === "medium" ? "متوسط" : "منخفض"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* مقارنة الفصول */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            مقارنة الفصول الدراسية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {semesterComparison.map((sem) => (
              <div key={sem.semester} className="p-4 border rounded-lg text-center">
                <p className="font-medium mb-2">{sem.semester}</p>
                <p className="text-2xl font-bold font-mono text-institute-blue">
                  {formatCurrency(sem.revenue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {sem.students} طالب
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
