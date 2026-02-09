"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, CheckCircle, AlertTriangle, Plus } from "lucide-react"

export default function InstallmentsPage() {
  const stats = [
    { label: "إجمالي الأقساط", value: "850", icon: Calendar, color: "text-institute-blue" },
    { label: "مدفوعة", value: "620", icon: CheckCircle, color: "text-institute-blue" },
    { label: "قادمة", value: "180", icon: Clock, color: "text-yellow-600" },
    { label: "متأخرة", value: "50", icon: AlertTriangle, color: "text-red-600" },
  ]

  const installmentPlans = [
    { student: "أحمد محمد", total: 30000, paid: 20000, remaining: 10000, nextDue: "2025-01-15", installments: 3, paidInstallments: 2 },
    { student: "سارة علي", total: 25000, paid: 12500, remaining: 12500, nextDue: "2025-01-20", installments: 2, paidInstallments: 1 },
    { student: "محمد حسن", total: 30000, paid: 10000, remaining: 20000, nextDue: "2025-01-10", installments: 3, paidInstallments: 1 },
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
          <CardTitle>خطط التقسيط النشطة</CardTitle>
          <CardDescription>متابعة خطط التقسيط الحالية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {installmentPlans.map((plan, index) => {
              const percentage = (plan.paid / plan.total) * 100
              const isOverdue = new Date(plan.nextDue) < new Date()
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{plan.student}</h4>
                      <p className="text-sm text-muted-foreground">
                        {plan.paidInstallments}/{plan.installments} أقساط مدفوعة
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{plan.total.toLocaleString()} ج.م</p>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">القسط القادم:</span>
                        <Badge className={isOverdue ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>
                          {plan.nextDue}
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
