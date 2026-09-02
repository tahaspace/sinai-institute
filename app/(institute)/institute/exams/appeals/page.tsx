"use client"

import { useState, useEffect } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle, Eye, CheckCircle, XCircle, Clock, FileText, Plus } from "lucide-react"

type AppealStatus = "PENDING" | "APPROVED" | "REJECTED"

interface AppealRow {
  id: string
  student: string
  studentCode: string
  system: string
  course: string
  courseCode: string
  reason: string
  status: AppealStatus
  statusLabel: string
  response: string
  date: string
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<AppealRow[]>([])
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  async function load(signal?: { cancelled: boolean }) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/institute/exams/appeals`)
      if (!res.ok) throw new Error("فشل في جلب التظلمات")
      const json = await res.json()
      if (!signal?.cancelled) {
        setAppeals(json.appeals ?? [])
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

  async function reload() {
    await load()
  }

  async function updateStatus(id: string, status: AppealStatus) {
    setActioning(id)
    try {
      await fetch(`/api/institute/exams/appeals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      await reload()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setActioning(null)
    }
  }

  // The endpoint hands back every appeal in one response (no server-side cap), so the narrowing is a
  // browser-side pass — the house pattern. With "كل الأنظمة" this is the untouched `appeals` array.
  const narrowed = systemFilter !== ACADEMIC_SYSTEM_ALL
  const visibleAppeals = appeals.filter((a) => matchesSystem(a.system, systemFilter))

  // Counted off the visible rows rather than the API's set-wide `stats`, because the cards sit above
  // the filter and would otherwise keep quoting institute-wide totals. Unfiltered the two agree.
  const countBy = (s: AppealStatus) => visibleAppeals.filter((a) => a.status === s).length
  const stats = [
    { label: "إجمالي التظلمات", value: String(visibleAppeals.length), icon: FileText, color: "text-institute-blue" },
    { label: "قيد المراجعة", value: String(countBy("PENDING")), icon: Clock, color: "text-yellow-600" },
    { label: "مقبول", value: String(countBy("APPROVED")), icon: CheckCircle, color: "text-institute-blue" },
    { label: "مرفوض", value: String(countBy("REJECTED")), icon: XCircle, color: "text-red-600" },
  ]

  const getStatusBadge = (status: AppealStatus, statusLabel: string) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 ml-1" />{statusLabel}</Badge>
      case "APPROVED":
        return <Badge className="bg-institute-blue text-green-700"><CheckCircle className="w-3 h-3 ml-1" />{statusLabel}</Badge>
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 ml-1" />{statusLabel}</Badge>
      default:
        return <Badge variant="secondary">{statusLabel}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-institute-blue" />
            التظلمات
          </h1>
          <p className="text-muted-foreground">إدارة طلبات التظلم من نتائج الامتحانات</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Above the stat cards on purpose: they are counted off the narrowed rows, so they follow it. */}
          <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-48" />
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            تقديم تظلم
          </Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل التظلمات...</CardContent></Card>}

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

      {/* Appeals Table */}
      <Card>
        <CardHeader>
          <CardTitle>طلبات التظلم</CardTitle>
          <CardDescription>قائمة طلبات التظلم من نتائج الامتحانات</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>المقرر</TableHead>
                <TableHead>السبب</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleAppeals.map((appeal) => (
                <TableRow key={appeal.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{appeal.student}</p>
                      <p className="text-xs text-muted-foreground">{appeal.studentCode}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{appeal.course}</Badge>
                  </TableCell>
                  <TableCell>{appeal.reason}</TableCell>
                  <TableCell>{appeal.date}</TableCell>
                  <TableCell>{getStatusBadge(appeal.status, appeal.statusLabel)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {appeal.status === "PENDING" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-institute-blue"
                            disabled={actioning === appeal.id}
                            onClick={() => updateStatus(appeal.id, "APPROVED")}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            disabled={actioning === appeal.id}
                            onClick={() => updateStatus(appeal.id, "REJECTED")}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {/* !loading too: a reload() after an approve/reject would otherwise show the spinner
                  card and a "no matches" row at once — asserting absence about a list still in flight. */}
              {!loading && narrowed && visibleAppeals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    لا توجد تظلمات مطابقة للنظام الأكاديمي المختار
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
