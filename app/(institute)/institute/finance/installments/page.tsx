"use client"

import { useState, useEffect } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, CheckCircle, AlertTriangle, Plus } from "lucide-react"

interface InstallmentPlan {
  id: string
  student: string
  studentCode: string
  system: string
  totalFees: number
  installments: number
  paidInstallments: number
  paid: number
  remaining: number
  nextDueDate: string | null
  status: string
}

interface InstallmentStats {
  total: number
  completed: number
  active: number
  outstanding: number
}

export default function InstallmentsPage() {
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [apiStats, setApiStats] = useState<InstallmentStats>({ total: 0, completed: 0, active: 0, outstanding: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/finance/installments`)
        if (!res.ok) throw new Error("فشل في جلب الأقساط")
        const json = await res.json()
        if (!cancelled) {
          setPlans(json.plans ?? [])
          setApiStats(json.stats ?? { total: 0, completed: 0, active: 0, outstanding: 0 })
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

  // The filter narrows the list of plans only. The stat cards stay institute-wide on purpose:
  // «متأخرة» is the outstanding receivable, an accounting figure that must not move with a view filter.
  const visiblePlans = plans.filter((p) => matchesSystem(p.system, systemFilter))

  const stats = [
    { label: "إجمالي الأقساط", value: String(apiStats.total), icon: Calendar, color: "text-institute-blue" },
    { label: "مدفوعة", value: String(apiStats.completed), icon: CheckCircle, color: "text-institute-blue" },
    { label: "قادمة", value: String(apiStats.active), icon: Clock, color: "text-yellow-600" },
    { label: "متأخرة", value: apiStats.outstanding.toLocaleString(), icon: AlertTriangle, color: "text-red-600" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-7 h-7 text-institute-blue" />
            نظام الأقساط
          </h1>
          <p className="text-muted-foreground">إدارة خطط التقسيط ومتابعة السداد</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          خطة تقسيط جديدة
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الأقساط...</CardContent></Card>}

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
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Installment Plans */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>خطط التقسيط النشطة</CardTitle>
              <CardDescription>متابعة خطط التقسيط الحالية</CardDescription>
            </div>
            <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-56" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* A blank card under non-zero stat cards would otherwise read as "no plans exist" —
                say whether the filter is what emptied it. */}
            {!loading && visiblePlans.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {systemFilter === ACADEMIC_SYSTEM_ALL ? "لا توجد خطط تقسيط" : "لا توجد خطط تقسيط ضمن النظام المحدد"}
              </p>
            )}
            {visiblePlans.map((plan, index) => {
              const percentage = plan.totalFees > 0 ? (plan.paid / plan.totalFees) * 100 : 0
              const isOverdue = plan.nextDueDate !== null && new Date(plan.nextDueDate) < new Date()

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{plan.student}</h4>
                      <p className="text-sm text-muted-foreground">
                        {plan.paidInstallments} / {plan.installments} أقساط مدفوعة
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{plan.totalFees.toLocaleString()} ج.م</p>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">القسط القادم:</span>
                        <Badge className={isOverdue ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>
                          {plan.nextDueDate ?? "—"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress value={percentage} className="h-2" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-institute-blue font-medium">{plan.paid.toLocaleString()}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-red-600 font-medium">{plan.remaining.toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
