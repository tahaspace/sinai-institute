"use client"

import { useState } from "react"
import {
  Award,
  Search,
  Plus,
  Download,
  Eye,
  FileText,
  CheckCircle2,
  Clock,
  QrCode,
  Printer,
  Copy,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Certificates Data
const certificates = [
  {
    id: "CERT-2024-001",
    trainee: "أحمد محمد علي",
    program: "تطوير تطبيقات الويب",
    issueDate: "2024-12-20",
    status: "issued",
    verificationCode: "VER-ABC123",
  },
  {
    id: "CERT-2024-002",
    trainee: "سارة خالد أحمد",
    program: "التسويق الرقمي",
    issueDate: "2024-12-18",
    status: "issued",
    verificationCode: "VER-DEF456",
  },
  {
    id: "CERT-2024-003",
    trainee: "محمد سعيد حسن",
    program: "إدارة المشاريع PMP",
    issueDate: null,
    status: "pending",
    verificationCode: null,
  },
]

// Templates
const templates = [
  { id: 1, name: "شهادة إتمام التدريب", uses: 450, type: "completion" },
  { id: 2, name: "شهادة الحضور", uses: 320, type: "attendance" },
  { id: 3, name: "شهادة التميز", uses: 85, type: "excellence" },
]

// Stats
const stats = {
  total: 850,
  thisMonth: 45,
  pending: 12,
  verified: 1250,
}

const statusConfig = {
  issued: { label: "صادرة", color: "bg-institute-blue text-green-700", icon: CheckCircle2 },
  pending: { label: "قيد الإصدار", color: "bg-yellow-100 text-yellow-700", icon: Clock },
}

export default function CertificatesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [verificationCode, setVerificationCode] = useState("")

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch =
      cert.trainee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || cert.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الشهادات</h1>
          <p className="text-muted-foreground">إصدار الشهادات والتحقق منها</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            إصدار شهادة
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto text-institute-blue mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">شهادة صادرة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.thisMonth}</p>
            <p className="text-sm text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">قيد الإصدار</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <QrCode className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.verified.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">عملية تحقق</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="certificates">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="certificates">الشهادات</TabsTrigger>
          <TabsTrigger value="templates">القوالب</TabsTrigger>
          <TabsTrigger value="verify">التحقق</TabsTrigger>
          <TabsTrigger value="archive">الأرشيف</TabsTrigger>
        </TabsList>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="mt-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم أو رقم الشهادة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="issued">صادرة</SelectItem>
                    <SelectItem value="pending">قيد الإصدار</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Certificates Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الشهادة</TableHead>
                    <TableHead>المتدرب</TableHead>
                    <TableHead>البرنامج</TableHead>
                    <TableHead>تاريخ الإصدار</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.map((cert) => {
                    const status = statusConfig[cert.status as keyof typeof statusConfig]
                    const StatusIcon = status.icon

                    return (
                      <TableRow key={cert.id}>
                        <TableCell className="font-mono">{cert.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-institute-blue text-institute-blue">
                                {cert.trainee.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{cert.trainee}</span>
                          </div>
                        </TableCell>
                        <TableCell>{cert.program}</TableCell>
                        <TableCell>
                          {cert.issueDate
                            ? new Date(cert.issueDate).toLocaleDateString("ar-EG")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {cert.status === "issued" ? (
                              <>
                                <Button variant="ghost" size="icon">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon">
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button size="sm">إصدار</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>قوالب الشهادات</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  قالب جديد
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 rounded-lg border hover:shadow-md transition-shadow"
                  >
                    <div className="w-full h-32 bg-gradient-to-br from-institute-blue to-institute-blue rounded-lg flex items-center justify-center mb-4">
                      <Award className="w-12 h-12 text-institute-blue" />
                    </div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      استخدمت {template.uses} مرة
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="w-4 h-4 ml-2" />
                        معاينة
                      </Button>
                      <Button variant="ghost" size="sm">
                        تعديل
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verify Tab */}
        <TabsContent value="verify" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>التحقق من الشهادات</CardTitle>
              <CardDescription>أدخل رمز التحقق للتأكد من صحة الشهادة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md mx-auto">
                <div className="flex gap-2 mb-6">
                  <Input
                    placeholder="أدخل رمز التحقق (مثال: VER-ABC123)"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                  <Button>تحقق</Button>
                </div>
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">أو امسح رمز QR</h3>
                  <p className="text-muted-foreground text-sm">
                    استخدم كاميرا الهاتف لمسح رمز QR الموجود على الشهادة
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>أرشيف الشهادات</CardTitle>
              <CardDescription>جميع الشهادات الصادرة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">أرشيف الشهادات</h3>
                <p className="text-muted-foreground mb-4">
                  {stats.total} شهادة في الأرشيف
                </p>
                <Button variant="outline">
                  <Download className="w-4 h-4 ml-2" />
                  تحميل الأرشيف
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



