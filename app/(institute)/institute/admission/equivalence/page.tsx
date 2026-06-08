"use client"

import { useState, useEffect } from "react"
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
import { FileText, Plus, Eye, CheckCircle, XCircle, Clock, BookOpen } from "lucide-react"

interface EquivalenceRequest {
  id: string
  student: string
  originalCourse: string
  originalInstitute: string
  requestedCourse: string
  creditHours: number
  date: string
  status: string
}

interface EquivalenceStats {
  total: number
  approved: number
  pending: number
  approvedHours: number
}

export default function EquivalencePage() {
  const [equivalenceRequests, setEquivalenceRequests] = useState<EquivalenceRequest[]>([])
  const [stats, setStats] = useState<EquivalenceStats>({ total: 0, approved: 0, pending: 0, approvedHours: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/institute/admission/equivalence")
        if (!res.ok) throw new Error("فشل تحميل البيانات")
        const json = await res.json()
        if (!cancelled) {
          setEquivalenceRequests(json.requests ?? [])
          setStats(json.stats ?? { total: 0, approved: 0, pending: 0, approvedHours: 0 })
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

  const updateStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/institute/admission/equivalence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error("فشل تحديث الطلب")
      const lower = status.toLowerCase()
      setEquivalenceRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: lower } : r))
      )
      setStats((prev) => {
        const target = equivalenceRequests.find((r) => r.id === id)
        const hours = target?.creditHours ?? 0
        const wasApproved = target?.status === "approved"
        const isApproved = lower === "approved"
        return {
          ...prev,
          pending: target?.status === "pending" ? Math.max(0, prev.pending - 1) : prev.pending,
          approved: isApproved ? prev.approved + 1 : wasApproved ? Math.max(0, prev.approved - 1) : prev.approved,
          approvedHours: isApproved
            ? prev.approvedHours + hours
            : wasApproved
            ? Math.max(0, prev.approvedHours - hours)
            : prev.approvedHours,
        }
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 ml-1" />قيد المراجعة</Badge>
      case "approved":
        return <Badge className="bg-institute-blue text-green-700"><CheckCircle className="w-3 h-3 ml-1" />معتمد</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 ml-1" />مرفوض</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-7 h-7 text-institute-blue" />
            معادلة المقررات
          </h1>
          <p className="text-muted-foreground">إدارة طلبات معادلة المقررات للطلاب المحولين</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          طلب معادلة جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الطلبات", value: String(stats.total), icon: FileText, color: "text-institute-blue" },
          { label: "معتمدة", value: String(stats.approved), icon: CheckCircle, color: "text-institute-blue" },
          { label: "قيد المراجعة", value: String(stats.pending), icon: Clock, color: "text-yellow-600" },
          { label: "ساعات معادلة", value: String(stats.approvedHours), icon: BookOpen, color: "text-institute-gold" },
        ].map((stat, index) => (
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

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>طلبات المعادلة</CardTitle>
          <CardDescription>قائمة طلبات معادلة المقررات</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground py-4">جارٍ التحميل...</p>}
          {error && !loading && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>المقرر الأصلي</TableHead>
                <TableHead>المؤسسة السابقة</TableHead>
                <TableHead>المقرر المطلوب</TableHead>
                <TableHead>الساعات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equivalenceRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.student}</TableCell>
                  <TableCell>{request.originalCourse}</TableCell>
                  <TableCell>{request.originalInstitute}</TableCell>
                  <TableCell>{request.requestedCourse}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{request.creditHours}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {request.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-institute-blue"
                            onClick={() => updateStatus(request.id, "APPROVED")}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={() => updateStatus(request.id, "REJECTED")}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
