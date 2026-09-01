"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { AcademicModeBanner } from "@/components/academic-mode-banner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Award, CheckCircle, Clock, FileText, Download, Eye, X } from "lucide-react"

interface GraduationRequest {
  id: string
  student: string
  studentCode: string
  department: string
  program: string
  academicSystem?: "CREDIT_HOURS" | "ANNUAL"
  completedHours: number
  requiredHours: number
  gpa: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  statusLabel: string
  date: string
}

interface GraduationStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export default function GraduationPage() {
  const [graduationRequests, setGraduationRequests] = useState<GraduationRequest[]>([])
  const [apiStats, setApiStats] = useState<GraduationStats>({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/institute/students/graduation`)
      if (!res.ok) throw new Error("فشل في جلب طلبات التخرج")
      const json = await res.json()
      setGraduationRequests(json.graduationRequests ?? [])
      setApiStats(json.stats ?? { total: 0, pending: 0, approved: 0, rejected: 0 })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function initialLoad() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/students/graduation`)
        if (!res.ok) throw new Error("فشل في جلب طلبات التخرج")
        const json = await res.json()
        if (!cancelled) {
          setGraduationRequests(json.graduationRequests ?? [])
          setApiStats(json.stats ?? { total: 0, pending: 0, approved: 0, rejected: 0 })
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    initialLoad()
    return () => { cancelled = true }
  }, [])

  async function updateStatus(id: string, status: "APPROVED" | "REJECTED") {
    setActioning(id)
    try {
      const res = await fetch(`/api/institute/students/graduation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error("فشل في تحديث حالة الطلب")
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setActioning(null)
    }
  }

  const gradStats = [
    { label: "إجمالي الطلبات", value: String(apiStats.total), icon: FileText, color: "text-institute-blue" },
    { label: "قيد المراجعة", value: String(apiStats.pending), icon: Clock, color: "text-yellow-600" },
    { label: "مقبول", value: String(apiStats.approved), icon: CheckCircle, color: "text-institute-blue" },
    { label: "مرفوض", value: String(apiStats.rejected), icon: X, color: "text-red-600" },
  ]

  const requirements = [
    { name: "إتمام الساعات المعتمدة", required: 160, current: 160, completed: true },
    { name: "المعدل التراكمي", required: 2.0, current: 3.45, completed: true },
    { name: "مشروع التخرج", required: 1, current: 1, completed: true },
    { name: "التدريب الميداني", required: 200, current: 200, completed: true },
    { name: "السداد المالي", required: 100, current: 100, completed: true },
  ]

  const getStatusBadge = (request: GraduationRequest) => {
    switch (request.status) {
      case "APPROVED":
        return <Badge className="bg-institute-blue text-green-700"><CheckCircle className="w-3 h-3 ml-1" />{request.statusLabel}</Badge>
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 ml-1" />{request.statusLabel}</Badge>
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-700"><X className="w-3 h-3 ml-1" />{request.statusLabel}</Badge>
      default:
        return <Badge variant="secondary">{request.statusLabel}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <AcademicModeBanner />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-7 h-7 text-institute-blue" />
            التخرج
          </h1>
          <p className="text-muted-foreground">إدارة طلبات التخرج ومتطلباته</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير قائمة الخريجين
          </Button>
          <Button>
            <FileText className="w-4 h-4 ml-2" />
            طلب تخرج جديد
          </Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل طلبات التخرج...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {gradStats.map((stat, index) => (
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Requirements Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              متطلبات التخرج
            </CardTitle>
            <CardDescription>نموذج متطلبات التخرج</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requirements.map((req, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    req.completed ? "bg-institute-blue" : "bg-gray-100"
                  }`}>
                    {req.completed ? (
                      <CheckCircle className="w-4 h-4 text-institute-blue" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{req.name}</p>
                    <p className="text-xs text-muted-foreground">{req.current}/{req.required}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Graduation Requests */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>طلبات التخرج</CardTitle>
            <CardDescription>قائمة طلبات التخرج الحالية</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>البرنامج</TableHead>
                  <TableHead>المعدل</TableHead>
                  <TableHead>الساعات</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {graduationRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-institute-blue text-institute-blue text-xs">
                            {request.student.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{request.student}</p>
                          <p className="text-xs text-muted-foreground">{request.studentCode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{request.program}</p>
                        <p className="text-xs text-muted-foreground">{request.department}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.academicSystem === "ANNUAL"
                        ? <span className="text-xs text-muted-foreground">نظام سنوي</span>
                        : <span className="font-bold text-institute-blue">{request.gpa.toFixed(2)}</span>}
                    </TableCell>
                    <TableCell>
                      {request.academicSystem === "ANNUAL" ? (
                        <span className="text-xs text-muted-foreground">اجتياز الفرقة النهائية بتقدير</span>
                      ) : (
                        <div className="space-y-1 min-w-[120px]">
                          <p className="text-xs font-medium">{request.completedHours} / {request.requiredHours} ساعة</p>
                          <Progress value={request.requiredHours > 0 ? (request.completedHours / request.requiredHours) * 100 : 0} className="h-2" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(request)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {request.status === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-institute-blue"
                              disabled={actioning === request.id}
                              onClick={() => updateStatus(request.id, "APPROVED")}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              disabled={actioning === request.id}
                              onClick={() => updateStatus(request.id, "REJECTED")}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
