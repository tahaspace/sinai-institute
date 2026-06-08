"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Download, FileText, TrendingUp, Wallet, PieChart } from "lucide-react"

interface ReportStats {
  totalDues: number
  collected: number
  remaining: number
  collectionRate: number
}

interface MonthlyData {
  month: string
  collected: number
}

interface ReportType {
  name: string
  type: string
  href: string
  dataAsOf: string | null
}

export default function FinanceReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [reports, setReports] = useState<ReportType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/finance/reports`)
        if (!res.ok) throw new Error("فشل تحميل البيانات")
        const json = await res.json()
        if (!cancelled) {
          setStats(json.stats ?? null)
          setMonthlyData(json.monthly ?? [])
          setReports(json.reportTypes ?? [])
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const summaryCards = [
    { label: "إجمالي الإيرادات", value: `${((stats?.totalDues ?? 0) / 1000000).toFixed(1)}M`, color: "text-institute-blue", icon: TrendingUp },
    { label: "المحصل", value: `${((stats?.collected ?? 0) / 1000000).toFixed(1)}M`, color: "text-institute-blue", icon: Wallet },
    { label: "المتبقي", value: `${((stats?.remaining ?? 0) / 1000000).toFixed(1)}M`, color: "text-red-600", icon: PieChart },
    { label: "نسبة التحصيل", value: `${stats?.collectionRate ?? 0}%`, color: "text-institute-gold", icon: BarChart3 },
  ]

  // No schema-backed monthly target exists; scale each month's bar against the
  // highest-collected month so the chart is honest rather than fabricated.
  const maxCollected = monthlyData.reduce((m, d) => Math.max(m, d.collected), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-institute-blue" />
            التقارير المالية
          </h1>
          <p className="text-muted-foreground">تقارير وإحصائيات مالية شاملة</p>
        </div>
        <Button>
          <FileText className="w-4 h-4 ml-2" />
          إنشاء تقرير جديد
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ التحميل...</CardContent></Card>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Collection */}
        <Card>
          <CardHeader>
            <CardTitle>التحصيل الشهري</CardTitle>
            <CardDescription>إجمالي المحصل في كل شهر</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data, index) => {
                const percentage = maxCollected > 0 ? (data.collected / maxCollected) * 100 : 0
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{data.month}</span>
                      <span className="text-sm text-muted-foreground">
                        {(data.collected / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={percentage}
                        className="h-2 flex-1 [&>div]:bg-institute-blue"
                      />
                    </div>
                  </motion.div>
                )
              })}
              {!loading && monthlyData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات تحصيل</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Reports */}
        <Card>
          <CardHeader>
            <CardTitle>التقارير المتاحة</CardTitle>
            <CardDescription>تقارير جاهزة للتحميل</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.map((report, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-institute-blue flex items-center justify-center">
                      <FileText className="w-5 h-5 text-institute-blue" />
                    </div>
                    <div>
                      <h4 className="font-medium">{report.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{report.type}</Badge>
                        {report.dataAsOf && <span>محدّث حتى {report.dataAsOf}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={report.href} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 ml-1" />
                      تحميل
                    </a>
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
