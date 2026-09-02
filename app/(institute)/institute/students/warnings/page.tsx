"use client"

import { useState, useEffect } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle, Eye, Mail, FileText, TrendingDown, CheckCircle } from "lucide-react"

interface WarningRow {
  id: string
  student: string
  studentCode: string
  department: string
  type: string
  typeLabel: string
  reason: string
  gpa: number | null
  system: string
  status: "ACTIVE" | "RESOLVED"
  date: string
}

interface WarningApiStats {
  total: number
  active: number
  resolved: number
}

export default function WarningsPage() {
  const [warnings, setWarnings] = useState<WarningRow[]>([])
  const [apiStats, setApiStats] = useState<WarningApiStats>({ total: 0, active: 0, resolved: 0 })
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  async function load(signal?: { cancelled: boolean }) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/institute/students/warnings`)
      if (!res.ok) throw new Error("فشل في جلب الإنذارات")
      const json = await res.json()
      if (!signal?.cancelled) {
        setWarnings(json.warnings ?? [])
        setApiStats(json.stats ?? { total: 0, active: 0, resolved: 0 })
      }
    } catch (e) {
      if (!signal?.cancelled) setError((e as Error).message)
    } finally {
      if (!signal?.cancelled) setLoading(false)
    }
  }

  useEffect(() => {
    const signal = { cancelled: false }
    load(signal)
    return () => { signal.cancelled = true }
  }, [])

  const reload = () => load()

  async function resolveWarning(id: string) {
    setActioning(id)
    try {
      const res = await fetch(`/api/institute/students/warnings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "RESOLVED" }),
      })
      if (!res.ok) throw new Error("فشل في تحديث الإنذار")
      await reload()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setActioning(null)
    }
  }

  const narrowed = systemFilter === "CREDIT_HOURS" || systemFilter === "ANNUAL"
  const visibleWarnings = warnings.filter((w) => matchesSystem(w.system, systemFilter))

  // With no system selected the cards are the API's own totals, byte-for-byte; a real selection
  // recounts the visible rows so the headline can never disagree with the table below.
  const visibleStats = narrowed
    ? {
        total: visibleWarnings.length,
        active: visibleWarnings.filter((w) => w.status === "ACTIVE").length,
        resolved: visibleWarnings.filter((w) => w.status === "RESOLVED").length,
      }
    : apiStats

  const warningStats = [
    { label: "إجمالي الإنذارات", value: String(visibleStats.total), icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100" },
    { label: "إنذارات نشطة", value: String(visibleStats.active), icon: TrendingDown, color: "text-red-700", bg: "bg-red-200" },
    { label: "تمت المعالجة", value: String(visibleStats.resolved), icon: CheckCircle, color: "text-green-700", bg: "bg-green-100" },
  ]

  const getWarningBadge = (warning: WarningRow) => {
    switch (warning.type) {
      case "إنذار أول":
        return <Badge className="bg-yellow-100 text-yellow-700">{warning.typeLabel}</Badge>
      case "إنذار ثاني":
        return <Badge className="bg-institute-gold text-orange-700">{warning.typeLabel}</Badge>
      case "إنذار نهائي":
        return <Badge className="bg-red-100 text-red-700">{warning.typeLabel}</Badge>
      default:
        return <Badge variant="secondary">{warning.typeLabel}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-yellow-600" />
            الإنذارات الأكاديمية
          </h1>
          <p className="text-muted-foreground">متابعة الطلاب ذوي الأداء الأكاديمي المنخفض</p>
        </div>
        <Button variant="outline">
          <FileText className="w-4 h-4 ml-2" />
          تقرير الإنذارات
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الإنذارات...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {warningStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${stat.bg} flex items-center justify-center`}>
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-64" />
          </div>
        </CardContent>
      </Card>

      {/* Warnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الإنذارات</CardTitle>
          <CardDescription>الطلاب الذين حصلوا على إنذارات أكاديمية</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>المعدل</TableHead>
                <TableHead>نوع الإنذار</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>السبب</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleWarnings.map((warning) => (
                <TableRow key={warning.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                          {warning.student.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{warning.student}</p>
                        <p className="text-xs text-muted-foreground">{warning.studentCode}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{warning.department}</TableCell>
                  <TableCell>
                    {/* annual students are judged by percentage/تقدير and store no CGPA — a snapshot
                        of their 0 is not a 0.00 grade, so it must never be printed as one */}
                    {warning.gpa !== null && warning.system !== "ANNUAL" ? (
                      <span className={`font-bold ${warning.gpa < 1.5 ? "text-red-600" : "text-yellow-600"}`}>
                        {warning.gpa.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getWarningBadge(warning)}</TableCell>
                  <TableCell>{warning.date}</TableCell>
                  <TableCell className="max-w-32 truncate">{warning.reason}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {warning.status === "ACTIVE" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={actioning === warning.id}
                          onClick={() => resolveWarning(warning.id)}
                          title="تم المعالجة"
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {narrowed && visibleWarnings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    لا توجد إنذارات مطابقة للتصفية الحالية.
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
