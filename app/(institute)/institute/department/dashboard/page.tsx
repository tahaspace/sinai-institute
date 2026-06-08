"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, GraduationCap, BookOpen, AlertTriangle } from "lucide-react"

interface DashboardStats {
  students: number
  instructors: number
  courses: number
  activeWarnings: number
}

interface AtRiskStudent {
  name: string
  gpa: number | null
  department: string
}

export default function DepartmentHeadDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/institute/department/dashboard")
        if (!res.ok) throw new Error("فشل تحميل البيانات")
        const json = await res.json()
        if (!cancelled) {
          setStats(json.stats ?? null)
          setAtRisk(json.atRisk ?? [])
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

  // KPI cards — values from the API; icon/color presentation stays here.
  const statCards = [
    {
      title: "طلاب القسم",
      value: stats?.students ?? 0,
      icon: Users,
      color: "text-institute-blue",
      bgColor: "bg-gradient-to-br from-institute-blue/10 to-institute-blue/20 dark:bg-institute-blue/20",
    },
    {
      title: "أعضاء هيئة التدريس",
      value: stats?.instructors ?? 0,
      icon: GraduationCap,
      color: "text-institute-gold",
      bgColor: "bg-gradient-to-br from-institute-gold/10 to-institute-gold/20 dark:bg-institute-gold/20",
    },
    {
      title: "المقررات",
      value: stats?.courses ?? 0,
      icon: BookOpen,
      color: "text-institute-blue",
      bgColor: "bg-gradient-to-br from-institute-blue/20 to-institute-gold/10 dark:bg-institute-blue/30",
    },
    {
      title: "الإنذارات النشطة",
      value: stats?.activeWarnings ?? 0,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-gradient-to-br from-institute-gold/20 to-red-100 dark:bg-institute-gold/30",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-institute-blue to-institute-gold bg-clip-text text-transparent">
            لوحة رئيس القسم
          </h1>
          <p className="text-muted-foreground">
            متابعة طلاب القسم وأعضاء هيئة التدريس والحالات الأكاديمية الحرجة
          </p>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">جارٍ التحميل...</CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{stat.value.toLocaleString("ar-EG")}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Students at risk */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            طلاب بحاجة لمتابعة
          </CardTitle>
          <CardDescription>طلاب بمعدل تراكمي منخفض (أقل من 2.0) أو لديهم إنذار نشط</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {atRisk.map((student, index) => {
              const lowGpa = student.gpa !== null && student.gpa < 2
              return (
                <motion.div
                  key={`${student.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-institute-gold/20 to-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-institute-gold" />
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.department}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <Badge variant={lowGpa ? "destructive" : "secondary"}>
                      {lowGpa ? "معدل منخفض" : "إنذار نشط"}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      GPA: {student.gpa !== null ? student.gpa.toFixed(2) : "—"}
                    </p>
                  </div>
                </motion.div>
              )
            })}
            {!loading && atRisk.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">لا يوجد طلاب بحاجة لمتابعة حالياً</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
