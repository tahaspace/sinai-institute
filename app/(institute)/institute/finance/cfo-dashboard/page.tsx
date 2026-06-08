"use client"

import { useState, useEffect } from "react"
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

// API response shapes
interface ApiKpi {
  value: number
  isPercentage: boolean
}

interface CfoKpis {
  revenue: ApiKpi
  expenses: ApiKpi
  profit: ApiKpi
  collection: ApiKpi
}

interface DepartmentRevenue {
  department: string
  amount: number
  students: number
  percentage: number
}

interface FinancialAlert {
  id: string
  type: "warning" | "info" | "success"
  title: string
  description: string
  amount: number | null
  priority: "high" | "medium" | "low"
}

interface SemesterRow {
  semester: string
  revenue: number
  students: number
}

// Presentation config per KPI id — title/icon/color are UI concerns, not data.
// `expenses` is salaries-only (Payroll is the only modeled cost source).
const KPI_META = {
  revenue: { title: "إجمالي الإيرادات (المُحصّل)", icon: TrendingUp, color: "green" },
  expenses: { title: "مصروفات الرواتب", icon: TrendingDown, color: "red" },
  profit: { title: "صافي الربح", icon: DollarSign, color: "blue" },
  collection: { title: "نسبة التحصيل", icon: Target, color: "teal" },
} as const

const KPI_ORDER: (keyof CfoKpis)[] = ["revenue", "expenses", "profit", "collection"]

export default function InstituteCFODashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("year")
  const [selectedDepartment, setSelectedDepartment] = useState("all")

  const [kpis, setKpis] = useState<CfoKpis | null>(null)
  const [revenueByDepartment, setRevenueByDepartment] = useState<DepartmentRevenue[]>([])
  const [financialAlerts, setFinancialAlerts] = useState<FinancialAlert[]>([])
  const [semesterComparison, setSemesterComparison] = useState<SemesterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/finance/cfo-dashboard`)
        if (!res.ok) throw new Error("فشل تحميل البيانات")
        const json = await res.json()
        if (!cancelled) {
          setKpis(json.kpis ?? null)
          setRevenueByDepartment(json.revenueByDepartment ?? [])
          setFinancialAlerts(json.financialAlerts ?? [])
          setSemesterComparison(json.semesterComparison ?? [])
        }
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

      {/* حالة التحميل / الخطأ */}
      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ التحميل...</CardContent></Card>}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_ORDER.map((id) => {
          const meta = KPI_META[id]
          const kpi = kpis?.[id]
          const Icon = meta.icon
          const value = kpi?.value ?? 0
          const isPercentage = kpi?.isPercentage ?? false

          return (
            <Card key={id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{meta.title}</span>
                  <div
                    className={`p-2 rounded-lg ${
                      meta.color === "green"
                        ? "bg-institute-blue text-institute-blue"
                        : meta.color === "red"
                        ? "bg-red-100 text-red-600"
                        : meta.color === "blue"
                        ? "bg-institute-blue text-institute-blue"
                        : "bg-institute-blue text-institute-blue"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold font-mono">
                    {isPercentage ? `${value}%` : formatCurrency(value)}
                  </p>
                  {id === "collection" && (
                    <Progress value={Math.min(value, 100)} className="h-2" />
                  )}
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
                        <span>متوسط/طالب: {formatCurrency(dept.students > 0 ? dept.amount / dept.students : 0)}</span>
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
