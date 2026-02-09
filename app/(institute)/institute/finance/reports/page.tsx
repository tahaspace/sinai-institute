"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Download, FileText, TrendingUp, Wallet, PieChart } from "lucide-react"

export default function FinanceReportsPage() {
  const reports = [
    { name: "تقرير التحصيل الشهري", type: "شهري", lastGenerated: "2024-12-28", status: "ready" },
    { name: "تقرير المتأخرات", type: "أسبوعي", lastGenerated: "2024-12-25", status: "ready" },
    { name: "تقرير المنح والإعفاءات", type: "فصلي", lastGenerated: "2024-12-01", status: "ready" },
    { name: "التقرير المالي الشامل", type: "سنوي", lastGenerated: "2024-12-31", status: "pending" },
  ]

  const monthlyData = [
    { month: "سبتمبر", collected: 2500000, target: 3000000 },
    { month: "أكتوبر", collected: 2800000, target: 3000000 },
    { month: "نوفمبر", collected: 3200000, target: 3000000 },
    { month: "ديسمبر", collected: 2700000, target: 3000000 },
  ]

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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الإيرادات", value: "12.5M", color: "text-institute-blue", icon: TrendingUp },
          { label: "المحصل", value: "11.2M", color: "text-institute-blue", icon: Wallet },
          { label: "المتأخرات", value: "1.3M", color: "text-red-600", icon: PieChart },
          { label: "نسبة التحصيل", value: "92%", color: "text-institute-gold", icon: BarChart3 },
        ].map((stat, index) => (
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
            <CardDescription>مقارنة التحصيل الفعلي بالمستهدف</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data, index) => {
                const percentage = (data.collected / data.target) * 100
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
                        {(data.collected / 1000000).toFixed(1)}M / {(data.target / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={percentage > 100 ? 100 : percentage} 
                        className={`h-2 flex-1 ${percentage >= 100 ? "[&>div]:bg-institute-blue" : "[&>div]:bg-yellow-500"}`}
                      />
                      <span className={`text-sm font-bold ${percentage >= 100 ? "text-institute-blue" : "text-yellow-600"}`}>
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </motion.div>
                )
              })}
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
                        <span>{report.lastGenerated}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled={report.status !== "ready"}>
                    <Download className="w-4 h-4 ml-1" />
                    تحميل
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
