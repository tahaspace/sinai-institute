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
  ClipboardList,
  CheckCircle2,
  ArrowLeftRight,
  FileQuestion,
  Users,
} from "lucide-react"

interface AdmissionStats {
  pendingApplications: number
  approvedApplications: number
  transfers: number
  pendingEquivalence: number
}

interface RecentApplication {
  fullName: string
  firstChoice: string
  status: string
  date: string
}

// Map the raw application status to an Arabic label + badge variant. Unknown
// values fall through to a neutral outline badge so new statuses never break.
function statusBadge(status: string) {
  switch (status.toUpperCase()) {
    case "APPROVED":
      return { label: "مقبول", className: "bg-green-100 text-green-700 border-green-200" }
    case "REJECTED":
      return { label: "مرفوض", className: "bg-red-100 text-red-700 border-red-200" }
    case "PENDING":
      return { label: "قيد المراجعة", className: "bg-amber-100 text-amber-700 border-amber-200" }
    default:
      return { label: status, className: "" }
  }
}

export default function AdmissionDashboardPage() {
  const [apiStats, setApiStats] = useState<AdmissionStats | null>(null)
  const [recent, setRecent] = useState<RecentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/admission/stats`)
        if (!res.ok) throw new Error("فشل في جلب بيانات القبول")
        const json = await res.json()
        if (!cancelled) {
          setApiStats(json.stats ?? null)
          setRecent(json.recent ?? [])
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
    { label: "طلبات قيد المراجعة", value: apiStats?.pendingApplications ?? 0, icon: ClipboardList, color: "text-institute-blue" },
    { label: "طلبات مقبولة", value: apiStats?.approvedApplications ?? 0, icon: CheckCircle2, color: "text-green-600" },
    { label: "إجمالي طلبات التحويل", value: apiStats?.transfers ?? 0, icon: ArrowLeftRight, color: "text-institute-gold" },
    { label: "معادلات قيد المراجعة", value: apiStats?.pendingEquivalence ?? 0, icon: FileQuestion, color: "text-institute-blue" },
  ]

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7 text-institute-blue" />
          لوحة القبول والتسجيل
        </h1>
        <p className="text-muted-foreground">متابعة طلبات القبول والتحويل والمعادلات</p>
      </div>

      {error && (
        <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>
      )}
      {loading && (
        <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل بيانات القبول...</CardContent></Card>
      )}

      {/* KPI cards */}
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
                  <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            أحدث طلبات القبول
          </CardTitle>
          <CardDescription>آخر عشرة طلبات تقديم مستلمة</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 && !loading ? (
            <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الرغبة الأولى</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((app, index) => {
                  const badge = statusBadge(app.status)
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{app.fullName}</TableCell>
                      <TableCell>{app.firstChoice || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{app.date}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
