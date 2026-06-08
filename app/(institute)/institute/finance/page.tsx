"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Download,
  Plus,
  Calendar,
  Receipt,
  BarChart3,
  Gift,
} from "lucide-react"

interface FinanceStats {
  totalDues: number
  collected: number
  remaining: number
  collectionRate: number
  scholarshipsCount: number
  scholarshipsTotal: number
}

interface Transaction {
  id: string
  student: string
  type: string
  amount: number
  date: string
  method: string
}

interface DepartmentCollection {
  name: string
  collected: number
  total: number
}

export default function FinancePage() {
  const [apiStats, setApiStats] = useState<FinanceStats | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [departmentCollection, setDepartmentCollection] = useState<DepartmentCollection[]>([])
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
        const json = await res.json()
        if (!cancelled) {
          setApiStats(json.stats ?? null)
          setRecentTransactions(json.recentTransactions ?? [])
          setDepartmentCollection(json.departmentCollection ?? [])
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

  const stats = [
    { label: "المستحقات الكلية", value: (apiStats?.totalDues ?? 0).toLocaleString(), icon: Wallet, color: "text-institute-blue", suffix: "ج.م" },
    { label: "المحصل", value: (apiStats?.collected ?? 0).toLocaleString(), icon: CreditCard, color: "text-institute-blue", suffix: "ج.م" },
    { label: "المتبقي", value: (apiStats?.remaining ?? 0).toLocaleString(), icon: TrendingDown, color: "text-red-600", suffix: "ج.م" },
    { label: "نسبة التحصيل", value: String(apiStats?.collectionRate ?? 0), icon: TrendingUp, color: "text-institute-gold", suffix: "%" },
  ]

  const quickLinks = [
    { title: "المصروفات الدراسية", href: "/institute/finance", icon: Wallet, color: "text-institute-blue", desc: "إعداد وإدارة المصروفات" },
    { title: "التحصيل", href: "/institute/finance/collection", icon: CreditCard, color: "text-institute-blue", desc: "تحصيل الرسوم" },
    { title: "الأقساط", href: "/institute/finance/installments", icon: Calendar, color: "text-institute-gold", desc: "نظام التقسيط" },
    { title: "المنح والإعفاءات", href: "/institute/finance/scholarships", icon: Gift, color: "text-institute-gold", desc: "إدارة المنح" },
    { title: "التقارير المالية", href: "/institute/finance/reports", icon: BarChart3, color: "text-institute-blue", desc: "تقارير وإحصائيات" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-7 h-7 text-institute-blue" />
            الشؤون المالية
          </h1>
          <p className="text-muted-foreground">
            إدارة المصروفات الدراسية والتحصيل المالي
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير التقارير
          </Button>
          <Button asChild>
            <Link href="/institute/finance/collection">
              <Plus className="w-4 h-4 ml-2" />
              تحصيل جديد
            </Link>
          </Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل البيانات المالية...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
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
                  <p className="text-2xl font-bold">
                    {stat.value}<span className="text-sm font-normal text-muted-foreground"> {stat.suffix}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {quickLinks.map((link, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={link.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 text-center">
                  <link.icon className={`w-8 h-8 mx-auto mb-2 ${link.color}`} />
                  <p className="font-medium text-sm">{link.title}</p>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Department Collection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              التحصيل حسب القسم
            </CardTitle>
            <CardDescription>نسبة التحصيل لكل قسم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {departmentCollection.map((dept, index) => {
              const percentage = Math.round((dept.collected / dept.total) * 100)
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{dept.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {(dept.collected / 1000000).toFixed(1)}M / {(dept.total / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={percentage} className="flex-1 h-2" />
                    <span className="text-sm font-bold text-institute-blue w-12">{percentage}%</span>
                  </div>
                </motion.div>
              )
            })}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              آخر المعاملات
            </CardTitle>
            <CardDescription>العمليات المالية الأخيرة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((trans, index) => (
                <motion.div
                  key={trans.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      trans.amount > 0 ? "bg-institute-blue" : "bg-institute-gold"
                    }`}>
                      {trans.amount > 0 ? (
                        <TrendingUp className="w-5 h-5 text-institute-blue" />
                      ) : (
                        <Gift className="w-5 h-5 text-institute-gold" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{trans.student}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{trans.type}</Badge>
                        <span>•</span>
                        <span>{trans.method}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`font-bold ${trans.amount > 0 ? "text-institute-blue" : "text-institute-gold"}`}>
                      {trans.amount > 0 ? "+" : ""}{trans.amount.toLocaleString()} ج.م
                    </p>
                    <p className="text-xs text-muted-foreground">{trans.date}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
