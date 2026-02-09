"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Users,
  Search,
  Plus,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Award,
  Calendar,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

// Trainees Data
const trainees = [
  {
    id: "TRN001",
    name: "أحمد محمد علي",
    phone: "01012345678",
    email: "ahmed@example.com",
    program: "تطوير الويب",
    batch: "الدفعة 15",
    progress: 65,
    attendance: 92,
    status: "active",
    joinDate: "2024-12-01",
    certificates: 0,
  },
  {
    id: "TRN002",
    name: "سارة خالد أحمد",
    phone: "01123456789",
    email: "sara@example.com",
    program: "التسويق الرقمي",
    batch: "الدفعة 10",
    progress: 85,
    attendance: 98,
    status: "active",
    joinDate: "2024-11-01",
    certificates: 1,
  },
  {
    id: "TRN003",
    name: "محمد سعيد حسن",
    phone: "01234567890",
    email: "mohamed@example.com",
    program: "إدارة المشاريع",
    batch: "الدفعة 8",
    progress: 40,
    attendance: 75,
    status: "warning",
    joinDate: "2024-12-15",
    certificates: 0,
  },
  {
    id: "TRN004",
    name: "فاطمة علي محمود",
    phone: "01098765432",
    email: "fatma@example.com",
    program: "تطوير الويب",
    batch: "الدفعة 14",
    progress: 100,
    attendance: 95,
    status: "completed",
    joinDate: "2024-09-01",
    certificates: 1,
  },
]

const statusConfig = {
  active: { label: "نشط", color: "bg-institute-blue text-green-700", icon: CheckCircle2 },
  warning: { label: "تحذير", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  completed: { label: "مكتمل", color: "bg-institute-blue text-blue-700", icon: Award },
  dropped: { label: "منسحب", color: "bg-red-100 text-red-700", icon: XCircle },
}

// Stats
const stats = {
  total: 1250,
  active: 1100,
  completed: 120,
  dropped: 30,
}

export default function TraineesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [programFilter, setProgramFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredTrainees = trainees.filter((trainee) => {
    const matchesSearch =
      trainee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trainee.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesProgram = programFilter === "all" || trainee.program === programFilter
    const matchesStatus = statusFilter === "all" || trainee.status === statusFilter
    return matchesSearch && matchesProgram && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المتدربين</h1>
          <p className="text-muted-foreground">إدارة المتدربين ومتابعة تقدمهم</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            متدرب جديد
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-institute-blue mb-2" />
            <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">إجمالي المتدربين</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.active.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">نشط</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">أتموا التدريب</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.dropped}</p>
            <p className="text-sm text-muted-foreground">منسحب</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="list">القائمة</TabsTrigger>
          <TabsTrigger value="attendance">الحضور</TabsTrigger>
          <TabsTrigger value="evaluations">التقييمات</TabsTrigger>
        </TabsList>

        {/* List Tab */}
        <TabsContent value="list" className="mt-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم أو الرقم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Select value={programFilter} onValueChange={setProgramFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="البرنامج" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع البرامج</SelectItem>
                    <SelectItem value="تطوير الويب">تطوير الويب</SelectItem>
                    <SelectItem value="التسويق الرقمي">التسويق الرقمي</SelectItem>
                    <SelectItem value="إدارة المشاريع">إدارة المشاريع</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="warning">تحذير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Trainees Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox />
                    </TableHead>
                    <TableHead>المتدرب</TableHead>
                    <TableHead>البرنامج</TableHead>
                    <TableHead>التقدم</TableHead>
                    <TableHead>الحضور</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrainees.map((trainee) => {
                    const status = statusConfig[trainee.status as keyof typeof statusConfig]
                    const StatusIcon = status.icon

                    return (
                      <TableRow key={trainee.id}>
                        <TableCell>
                          <Checkbox />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-institute-blue text-institute-blue">
                                {trainee.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <Link
                                href={`/institute/trainees/${trainee.id}`}
                                className="font-medium hover:text-primary hover:underline"
                              >
                                {trainee.name}
                              </Link>
                              <p className="text-xs text-muted-foreground">{trainee.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{trainee.program}</p>
                            <p className="text-xs text-muted-foreground">{trainee.batch}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>{trainee.progress}%</span>
                            </div>
                            <Progress value={trainee.progress} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-medium",
                              trainee.attendance >= 90 ? "text-institute-blue" :
                              trainee.attendance >= 75 ? "text-yellow-600" :
                              "text-red-600"
                            )}
                          >
                            {trainee.attendance}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/institute/trainees/${trainee.id}`}>
                                  <Eye className="w-4 h-4 ml-2" />
                                  عرض الملف
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 ml-2" />
                                تعديل
                              </DropdownMenuItem>
                              {trainee.status === "completed" && (
                                <DropdownMenuItem>
                                  <Award className="w-4 h-4 ml-2" />
                                  إصدار شهادة
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  عرض {filteredTrainees.length} من {trainees.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" disabled>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">1</Button>
                  <Button variant="outline" size="icon">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>سجل الحضور</CardTitle>
              <CardDescription>متابعة حضور المتدربين</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">سجل الحضور</h3>
                <p className="text-muted-foreground mb-4">
                  اختر الدورة والتاريخ لعرض سجل الحضور
                </p>
                <Button>تسجيل الحضور</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>التقييمات</CardTitle>
              <CardDescription>تقييم أداء المتدربين</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Award className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">التقييمات</h3>
                <p className="text-muted-foreground mb-4">
                  سيتم عرض تقييمات المتدربين هنا
                </p>
                <Button variant="outline">إضافة تقييم</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



