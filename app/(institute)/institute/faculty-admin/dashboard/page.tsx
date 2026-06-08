"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Users, GraduationCap, Building2, BookOpen } from "lucide-react"

interface FacultyAdminStats {
  departments: number
  students: number
  instructors: number
  courses: number
}

interface DepartmentRow {
  id: string
  name: string
  students: number
  instructors: number
}

export default function FacultyAdminDashboard() {
  const [stats, setStats] = useState<FacultyAdminStats | null>(null)
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/institute/faculty-admin/dashboard")
        if (!res.ok) throw new Error("فشل في جلب بيانات لوحة وكيل الكلية")
        const json = await res.json()
        if (!cancelled) {
          setStats(json.stats ?? null)
          setDepartments(json.departments ?? [])
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

  // KPI cards — values come from the API; presentation (icon/colors) stays here.
  const statCards = [
    {
      title: "الأقسام العلمية",
      value: stats?.departments ?? 0,
      icon: Building2,
      color: "text-institute-blue",
      bgColor: "bg-gradient-to-br from-institute-blue/10 to-institute-blue/20 dark:bg-institute-blue/20",
    },
    {
      title: "إجمالي الطلاب",
      value: stats?.students ?? 0,
      icon: Users,
      color: "text-institute-gold",
      bgColor: "bg-gradient-to-br from-institute-gold/10 to-institute-gold/20 dark:bg-institute-gold/20",
    },
    {
      title: "أعضاء هيئة التدريس",
      value: stats?.instructors ?? 0,
      icon: GraduationCap,
      color: "text-institute-blue",
      bgColor: "bg-gradient-to-br from-institute-blue/20 to-institute-gold/10 dark:bg-institute-blue/30",
    },
    {
      title: "المقررات",
      value: stats?.courses ?? 0,
      icon: BookOpen,
      color: "text-institute-gold",
      bgColor: "bg-gradient-to-br from-institute-gold/20 to-institute-blue/10 dark:bg-institute-gold/30",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-7 h-7 text-institute-blue" />
          لوحة وكيل الكلية
        </h1>
        <p className="text-muted-foreground">
          نظرة عامة على الأقسام والطلاب وأعضاء هيئة التدريس داخل الكلية
        </p>
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

      {/* Per-department table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            الأقسام العلمية
          </CardTitle>
          <CardDescription>توزيع الطلاب وأعضاء هيئة التدريس على أقسام الكلية</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">القسم</TableHead>
                <TableHead className="text-right">عدد الطلاب</TableHead>
                <TableHead className="text-right">أعضاء هيئة التدريس</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>{dept.students.toLocaleString("ar-EG")}</TableCell>
                  <TableCell>{dept.instructors.toLocaleString("ar-EG")}</TableCell>
                </TableRow>
              ))}
              {!loading && departments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    لا توجد أقسام
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
