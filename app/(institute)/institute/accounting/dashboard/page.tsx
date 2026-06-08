"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  GraduationCap,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileText,
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

interface FinancialStats {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  collectionRate: number
  studentsCount: number
  paidStudents: number
  pendingAmount: number
}

interface DepartmentRevenue {
  name: string
  students: number
  revenue: number
  rate: number
}

interface Transaction {
  id: string
  type: string
  description: string
  amount: number
  date: string
  status: string
}

interface FinanceApiStats {
  totalDues: number
  collected: number
  remaining: number
  collectionRate: number
  scholarshipsCount: number
  scholarshipsTotal: number
}

interface FinanceApiTransaction {
  id: string
  student: string
  type: string
  amount: number
  date: string
  method: string
}

interface FinanceApiDepartment {
  name: string
  collected: number
  total: number
}

interface FinanceApiResponse {
  stats: FinanceApiStats
  recentTransactions: FinanceApiTransaction[]
  departmentCollection: FinanceApiDepartment[]
}

const emptyFinancialStats: FinancialStats = {
  totalRevenue: 0,
  totalExpenses: 0,
  netIncome: 0,
  collectionRate: 0,
  studentsCount: 0,
  paidStudents: 0,
  pendingAmount: 0,
}

export default function InstituteAccountingDashboardPage() {
  const [financialStats, setFinancialStats] = useState<FinancialStats>(emptyFinancialStats)
  const [departmentRevenue, setDepartmentRevenue] = useState<DepartmentRevenue[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/finance`)
        if (!res.ok) throw new Error("فشل في جلب البيانات المالية")
        const json: FinanceApiResponse = await res.json()
        if (cancelled) return

        const s = json.stats
        setFinancialStats({
          totalRevenue: s?.collected ?? 0,
          totalExpenses: 0,
          netIncome: 0,
          collectionRate: s?.collectionRate ?? 0,
          studentsCount: 0,
          paidStudents: 0,
          pendingAmount: s?.remaining ?? 0,
        })

        setDepartmentRevenue(
          (json.departmentCollection ?? []).map((d) => ({
            name: d.name,
            students: 0,
            revenue: d.collected,
            rate: d.total > 0 ? Math.round((d.collected / d.total) * 100) : 0,
          }))
        )

        setRecentTransactions(
          (json.recentTransactions ?? []).map((t) => ({
            id: t.id,
            type: t.type,
            description: `${t.student} - ${t.method}`,
            amount: t.amount,
            date: t.date,
            status: "completed",
          }))
        )
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-EG")
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
            لوحة المتابعة المالية
          </h1>
          <p className="text-muted-foreground">
            نظرة شاملة على الوضع المالي للمعهد
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 ml-2" />
            تقرير مالي
          </Button>
          <Button className="bg-institute-blue hover:bg-institute-blue">
            <Receipt className="h-4 w-4 ml-2" />
            تسجيل دفعة
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            جارٍ تحميل البيانات المالية...
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-green-700 font-mono">
                  {formatCurrency(financialStats.totalRevenue)}
                </p>
                <p className="text-xs text-institute-blue flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3" />
                  +12% عن الشهر السابق
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                <p className="text-2xl font-bold text-red-700 font-mono">
                  {formatCurrency(financialStats.totalExpenses)}
                </p>
                <p className="text-xs text-red-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3" />
                  +5% عن الشهر السابق
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-institute-blue to-institute-blue dark:from-institute-blue/20 dark:to-institute-blue/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">صافي الربح</p>
                <p className="text-2xl font-bold text-institute-blue font-mono">
                  {formatCurrency(financialStats.netIncome)}
                </p>
                <p className="text-xs text-institute-blue mt-1">
                  هامش الربح: {((financialStats.netIncome / financialStats.totalRevenue) * 100).toFixed(1)}%
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
                <p className="text-sm text-muted-foreground">نسبة التحصيل</p>
                <p className="text-2xl font-bold text-blue-700">
                  {financialStats.collectionRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {financialStats.paidStudents}/{financialStats.studentsCount} طالب
                </p>
              </div>
              <Users className="h-8 w-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* إيرادات الأقسام */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              إيرادات الأقسام
            </CardTitle>
            <CardDescription>
              توزيع الإيرادات حسب القسم الأكاديمي
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {departmentRevenue.map((dept) => (
              <div key={dept.name} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{dept.name}</span>
                  <Badge variant="outline">{dept.students} طالب</Badge>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold font-mono text-institute-blue">
                    {formatCurrency(dept.revenue)}
                  </span>
                  <Badge 
                    className={
                      dept.rate >= 85
                        ? "bg-institute-blue text-green-800"
                        : dept.rate >= 75
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {dept.rate}%
                  </Badge>
                </div>
                <Progress value={dept.rate} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* آخر المعاملات */}
        <Card>
          <CardHeader>
            <CardTitle>آخر المعاملات</CardTitle>
            <CardDescription>
              أحدث الحركات المالية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        tx.type === "revenue"
                          ? "bg-institute-blue text-institute-blue"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {tx.type === "revenue" ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p
                      className={`font-bold font-mono ${
                        tx.type === "revenue" ? "text-institute-blue" : "text-red-600"
                      }`}
                    >
                      {tx.type === "revenue" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        tx.status === "completed"
                          ? "border-institute-blue text-green-700"
                          : "border-amber-500 text-amber-700"
                      }
                    >
                      {tx.status === "completed" ? "مكتمل" : "قيد الانتظار"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* المتأخرات */}
      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
              <div>
                <h3 className="font-bold text-lg">متأخرات التحصيل</h3>
                <p className="text-sm text-muted-foreground">
                  {financialStats.studentsCount - financialStats.paidStudents} طالب لم يسدد
                </p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold font-mono text-amber-700">
                {formatCurrency(financialStats.pendingAmount)}
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                عرض التفاصيل
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
