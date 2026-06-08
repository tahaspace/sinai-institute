"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import {
  UserPlus,
  Search,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Filter,
  Calendar,
  GraduationCap,
  Building2,
} from "lucide-react"

// --- API response shapes (served by /api/institute/admissions) ---
interface ApplicationRow {
  id: string
  fullName: string
  nationalId: string
  email: string
  phone: string
  highSchoolGrade: number
  firstChoice: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "ENROLLED"
  statusLabel: string
  createdAt: string
}
interface AdmissionStats {
  total: number
  pending: number
  approved: number
  rejected: number
  enrolled: number
}
interface AdmissionsResponse {
  applications: ApplicationRow[]
  stats: AdmissionStats
}

// Tab value (lowercase) → API status code (uppercase). "all" means no filter.
const tabToStatus: Record<string, string> = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
}

export default function AdmissionPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("pending")
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [apiStats, setApiStats] = useState<AdmissionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const status = tabToStatus[activeTab]
        const url = status
          ? `/api/institute/admissions?status=${status}`
          : `/api/institute/admissions`
        const res = await fetch(url)
        if (!res.ok) throw new Error("فشل في جلب طلبات الالتحاق")
        const json = (await res.json()) as AdmissionsResponse
        if (!cancelled) {
          setApplications(json.applications)
          setApiStats(json.stats)
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
  }, [activeTab])

  // Re-fetch the current tab after a mutation. The stats card counts always
  // reflect the filtered result set returned by the API for that status.
  async function reload() {
    setError(null)
    try {
      const status = tabToStatus[activeTab]
      const url = status
        ? `/api/institute/admissions?status=${status}`
        : `/api/institute/admissions`
      const res = await fetch(url)
      if (!res.ok) throw new Error("فشل في جلب طلبات الالتحاق")
      const json = (await res.json()) as AdmissionsResponse
      setApplications(json.applications)
      setApiStats(json.stats)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Approving with ENROLLED creates a real Student server-side (intended).
  async function updateStatus(id: string, status: "ENROLLED" | "REJECTED") {
    setActioning(id)
    try {
      const res = await fetch("/api/institute/admissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error("فشل في تحديث طلب الالتحاق")
      await reload()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setActioning(null)
    }
  }

  const stats = [
    { label: "إجمالي الطلبات", value: String(apiStats?.total ?? 0), icon: FileText, color: "text-institute-blue" },
    { label: "في الانتظار", value: String(apiStats?.pending ?? 0), icon: Clock, color: "text-yellow-600" },
    { label: "مقبول", value: String(apiStats?.approved ?? 0), icon: CheckCircle, color: "text-institute-blue" },
    { label: "مرفوض", value: String(apiStats?.rejected ?? 0), icon: XCircle, color: "text-red-600" },
  ]

  const getStatusBadge = (app: ApplicationRow) => {
    switch (app.status) {
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-700">{app.statusLabel}</Badge>
      case "APPROVED":
        return <Badge className="bg-institute-blue text-green-700">{app.statusLabel}</Badge>
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-700">{app.statusLabel}</Badge>
      default:
        return <Badge variant="secondary">{app.statusLabel}</Badge>
    }
  }

  // The API already filters by status (via ?status=). Search narrows further client-side.
  const filteredApplications = applications.filter((app) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    return (
      app.fullName.toLowerCase().includes(q) ||
      app.nationalId.toLowerCase().includes(q) ||
      app.id.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-institute-blue" />
            القبول والتسجيل
          </h1>
          <p className="text-muted-foreground">
            إدارة طلبات القبول وتسجيل الطلاب الجدد
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          طلب قبول جديد
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            جارٍ تحميل الطلبات...
          </CardContent>
        </Card>
      )}

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

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/institute/admission/registration">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 text-institute-blue" />
              <p className="font-medium">تسجيل المقررات</p>
              <p className="text-xs text-muted-foreground">فتح باب التسجيل</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/institute/admission/transfers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-institute-blue" />
              <p className="font-medium">التحويلات</p>
              <p className="text-xs text-muted-foreground">من وإلى المعهد</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/institute/admission/equivalence">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-institute-gold" />
              <p className="font-medium">المعادلات</p>
              <p className="text-xs text-muted-foreground">معادلة المقررات</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-institute-gold" />
            <p className="font-medium">التقويم الأكاديمي</p>
            <p className="text-xs text-muted-foreground">مواعيد مهمة</p>
          </CardContent>
        </Card>
      </div>

      {/* Applications */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>طلبات القبول</CardTitle>
              <CardDescription>إدارة ومتابعة طلبات القبول للطلاب الجدد</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 w-64"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 ml-2" />
                تصفية
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 ml-2" />
                تصدير
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">الكل</TabsTrigger>
              <TabsTrigger value="pending">في الانتظار</TabsTrigger>
              <TabsTrigger value="approved">مقبول</TabsTrigger>
              <TabsTrigger value="rejected">مرفوض</TabsTrigger>
            </TabsList>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>اسم الطالب</TableHead>
                  <TableHead>الرقم القومي</TableHead>
                  <TableHead>المجموع</TableHead>
                  <TableHead>القسم المطلوب</TableHead>
                  <TableHead>تاريخ التقديم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono">{app.id}</TableCell>
                    <TableCell className="font-medium">{app.fullName}</TableCell>
                    <TableCell className="font-mono text-sm">{app.nationalId || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold">
                        {app.highSchoolGrade}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{app.firstChoice || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.email || app.phone || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{app.createdAt}</TableCell>
                    <TableCell>{getStatusBadge(app)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {app.status === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-institute-blue"
                              disabled={actioning === app.id}
                              onClick={() => updateStatus(app.id, "ENROLLED")}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              disabled={actioning === app.id}
                              onClick={() => updateStatus(app.id, "REJECTED")}
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
