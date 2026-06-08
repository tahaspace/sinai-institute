"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  GraduationCap,
  Briefcase,
  Wallet,
  Clock,
  CheckCircle2,
  BarChart3,
} from "lucide-react"

interface ByTitle {
  title: string
  count: number
}

interface ByRole {
  role: string
  count: number
  net: number
}

interface HrData {
  staff: {
    total: number
    byTitle: ByTitle[]
  }
  payroll: {
    netTotal: number
    completed: number
    pending: number
    byRole: ByRole[]
  }
}

// Localize the raw role strings stored on Payroll ("faculty" | "staff").
function roleLabel(role: string): string {
  if (role === "faculty") return "هيئة تدريس"
  if (role === "staff") return "موظفون"
  return role
}

export default function HrDashboardPage() {
  const [data, setData] = useState<HrData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/hr/dashboard`)
        if (!res.ok) throw new Error("فشل في جلب بيانات الموارد البشرية")
        const json = await res.json()
        if (!cancelled) setData(json as HrData)
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

  // Derive faculty vs staff payroll counts from the per-role breakdown.
  const facultyCount = data?.payroll.byRole.find((r) => r.role === "faculty")?.count ?? 0
  const staffCount = data?.payroll.byRole.find((r) => r.role === "staff")?.count ?? 0
  const totalPayrollRecords = data?.payroll.byRole.reduce((s, r) => s + r.count, 0) ?? 0

  const stats = [
    {
      label: "إجمالي هيئة التدريس",
      value: (data?.staff.total ?? 0).toLocaleString(),
      icon: GraduationCap,
      color: "text-institute-blue",
      suffix: "",
    },
    {
      label: "كشوف هيئة التدريس",
      value: facultyCount.toLocaleString(),
      icon: Users,
      color: "text-institute-blue",
      suffix: "كشف",
    },
    {
      label: "كشوف الموظفين",
      value: staffCount.toLocaleString(),
      icon: Briefcase,
      color: "text-institute-gold",
      suffix: "كشف",
    },
    {
      label: "صافي الرواتب الشهري",
      value: (data?.payroll.netTotal ?? 0).toLocaleString(),
      icon: Wallet,
      color: "text-institute-blue",
      suffix: "ج.م",
    },
    {
      label: "رواتب معلّقة",
      value: (data?.payroll.pending ?? 0).toLocaleString(),
      icon: Clock,
      color: "text-red-600",
      suffix: "",
    },
  ]

  const payrollStatus = [
    {
      label: "مكتملة",
      count: data?.payroll.completed ?? 0,
      icon: CheckCircle2,
      tone: "text-institute-blue",
    },
    {
      label: "معلّقة",
      count: data?.payroll.pending ?? 0,
      icon: Clock,
      tone: "text-red-600",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7 text-institute-blue" />
          لوحة الموارد البشرية
        </h1>
        <p className="text-muted-foreground">
          نظرة عامة على هيئة التدريس والموظفين وكشوف الرواتب
        </p>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            جارٍ تحميل بيانات الموارد البشرية...
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-sm font-normal text-muted-foreground"> {stat.suffix}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Payroll by status + by role */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              كشوف الرواتب
            </CardTitle>
            <CardDescription>
              توزيع الكشوف حسب الحالة والفئة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status summary */}
            <div className="grid grid-cols-2 gap-3">
              {payrollStatus.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <s.icon className={`w-5 h-5 ${s.tone}`} />
                  <div>
                    <p className="text-xl font-bold">{s.count.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* By role table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الفئة</TableHead>
                  <TableHead className="text-center">عدد الكشوف</TableHead>
                  <TableHead className="text-left">صافي الرواتب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.payroll.byRole ?? []).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{roleLabel(r.role)}</TableCell>
                    <TableCell className="text-center">{r.count.toLocaleString()}</TableCell>
                    <TableCell className="text-left">{r.net.toLocaleString()} ج.م</TableCell>
                  </TableRow>
                ))}
                {(!data || data.payroll.byRole.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      —
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {totalPayrollRecords > 0 && (
              <p className="text-xs text-muted-foreground text-left">
                إجمالي الكشوف: {totalPayrollRecords.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Staff by title */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              هيئة التدريس حسب الدرجة العلمية
            </CardTitle>
            <CardDescription>توزيع الأعضاء حسب الدرجة العلمية</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الدرجة العلمية</TableHead>
                  <TableHead className="text-left">العدد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.staff.byTitle ?? []).map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-left">
                      <Badge variant="outline">{t.count.toLocaleString()}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data || data.staff.byTitle.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      —
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
