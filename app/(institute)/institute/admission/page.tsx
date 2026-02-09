"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export default function AdmissionPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("pending")

  const applications = [
    {
      id: "APP2024001",
      name: "أحمد محمد علي",
      nationalId: "30001010012345",
      highSchoolScore: 85.5,
      department: "الهندسة",
      program: "هندسة الحاسبات",
      applicationDate: "2024-12-15",
      status: "pending",
    },
    {
      id: "APP2024002",
      name: "سارة أحمد حسن",
      nationalId: "30002020023456",
      highSchoolScore: 92.3,
      department: "الحاسبات",
      program: "علوم الحاسب",
      applicationDate: "2024-12-16",
      status: "approved",
    },
    {
      id: "APP2024003",
      name: "محمد علي إبراهيم",
      nationalId: "30003030034567",
      highSchoolScore: 78.2,
      department: "إدارة الأعمال",
      program: "إدارة الأعمال",
      applicationDate: "2024-12-17",
      status: "rejected",
    },
    {
      id: "APP2024004",
      name: "نور محمود سعيد",
      nationalId: "30004040045678",
      highSchoolScore: 88.7,
      department: "المحاسبة",
      program: "المحاسبة",
      applicationDate: "2024-12-18",
      status: "pending",
    },
  ]

  const stats = [
    { label: "إجمالي الطلبات", value: "320", icon: FileText, color: "text-institute-blue" },
    { label: "في الانتظار", value: "85", icon: Clock, color: "text-yellow-600" },
    { label: "مقبول", value: "198", icon: CheckCircle, color: "text-institute-blue" },
    { label: "مرفوض", value: "37", icon: XCircle, color: "text-red-600" },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700">في الانتظار</Badge>
      case "approved":
        return <Badge className="bg-institute-blue text-green-700">مقبول</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-700">مرفوض</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredApplications = applications.filter((app) => {
    if (activeTab === "all") return true
    return app.status === activeTab
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
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell className="font-mono text-sm">{app.nationalId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold">
                        {app.highSchoolScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{app.department}</p>
                        <p className="text-xs text-muted-foreground">{app.program}</p>
                      </div>
                    </TableCell>
                    <TableCell>{app.applicationDate}</TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {app.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" className="text-institute-blue">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-600">
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
