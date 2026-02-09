"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Monitor,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  Timer,
  BarChart3,
  FileText,
  Settings,
  Download,
  Send,
  AlertCircle,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// Mock Data
const exams = [
  {
    id: "EX001",
    name: "امتحان منتصف الفصل - مقدمة في البرمجة",
    courseCode: "CS101",
    courseName: "مقدمة في البرمجة",
    semester: "الفصل الأول 2024/2025",
    section: "جميع الشعب",
    startDate: "2025-01-10T09:00:00",
    endDate: "2025-01-10T11:00:00",
    duration: 90,
    questionsCount: 30,
    totalPoints: 50,
    studentsCount: 120,
    completedCount: 85,
    averageScore: 72,
    status: "active", // draft, scheduled, active, completed
    createdAt: "2025-01-02",
  },
  {
    id: "EX002",
    name: "اختبار قصير - هياكل البيانات",
    courseCode: "CS201",
    courseName: "هياكل البيانات",
    semester: "الفصل الأول 2024/2025",
    section: "الشعبة A",
    startDate: "2025-01-15T14:00:00",
    endDate: "2025-01-15T15:00:00",
    duration: 45,
    questionsCount: 15,
    totalPoints: 20,
    studentsCount: 40,
    completedCount: 0,
    averageScore: null,
    status: "scheduled",
    createdAt: "2025-01-03",
  },
  {
    id: "EX003",
    name: "امتحان نهائي - قواعد البيانات",
    courseCode: "CS301",
    courseName: "قواعد البيانات",
    semester: "الفصل الأول 2024/2025",
    section: "جميع الشعب",
    startDate: "2024-12-20T10:00:00",
    endDate: "2024-12-20T13:00:00",
    duration: 150,
    questionsCount: 50,
    totalPoints: 100,
    studentsCount: 95,
    completedCount: 95,
    averageScore: 68,
    status: "completed",
    createdAt: "2024-12-10",
  },
  {
    id: "EX004",
    name: "اختبار تجريبي - شبكات الحاسب",
    courseCode: "NET101",
    courseName: "شبكات الحاسب",
    semester: "الفصل الأول 2024/2025",
    section: "الشعبة B",
    startDate: "",
    endDate: "",
    duration: 60,
    questionsCount: 20,
    totalPoints: 30,
    studentsCount: 35,
    completedCount: 0,
    averageScore: null,
    status: "draft",
    createdAt: "2025-01-03",
  },
]

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "مسودة", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400", icon: FileText },
  scheduled: { label: "مجدول", color: "bg-institute-blue text-blue-700 dark:bg-institute-blue/30 dark:text-blue-400", icon: Clock },
  active: { label: "نشط الآن", color: "bg-institute-blue text-green-700 dark:bg-institute-blue/30 dark:text-green-400", icon: Play },
  completed: { label: "مكتمل", color: "bg-institute-gold text-purple-700 dark:bg-institute-gold/30 dark:text-purple-400", icon: CheckCircle2 },
}

export default function OnlineExamsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("all")

  const filteredExams = exams.filter(exam => {
    const matchesSearch = 
      exam.name.includes(searchQuery) ||
      exam.courseCode.includes(searchQuery) ||
      exam.courseName.includes(searchQuery)
    const matchesStatus = statusFilter === "all" || exam.status === statusFilter
    const matchesTab = activeTab === "all" || exam.status === activeTab
    return matchesSearch && matchesStatus && matchesTab
  })

  const stats = {
    total: exams.length,
    draft: exams.filter(e => e.status === "draft").length,
    scheduled: exams.filter(e => e.status === "scheduled").length,
    active: exams.filter(e => e.status === "active").length,
    completed: exams.filter(e => e.status === "completed").length,
    totalStudents: exams.reduce((sum, e) => sum + e.studentsCount, 0),
    averageCompletion: Math.round(
      exams.filter(e => e.status === "completed").reduce((sum, e) => sum + (e.completedCount / e.studentsCount) * 100, 0) / 
      (exams.filter(e => e.status === "completed").length || 1)
    ),
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "غير محدد"
    return new Date(dateStr).toLocaleString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="w-7 h-7 text-institute-blue" />
            الامتحانات الأونلاين
          </h1>
          <p className="text-muted-foreground">
            إدارة الامتحانات الإلكترونية للمعهد
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/institute/online-exams/question-bank">
              <FileText className="w-4 h-4 ml-2" />
              بنك الأسئلة
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/institute/online-exams/reports">
              <BarChart3 className="w-4 h-4 ml-2" />
              التقارير
            </Link>
          </Button>
          <Button asChild className="bg-institute-blue hover:bg-institute-blue">
            <Link href="/institute/online-exams/create">
              <Plus className="w-4 h-4 ml-2" />
              إنشاء امتحان
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الامتحانات</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-institute-blue dark:bg-institute-blue/30 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-institute-blue" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">نشط الآن</p>
                <p className="text-2xl font-bold text-institute-blue">{stats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-institute-blue dark:bg-institute-blue/30 flex items-center justify-center">
                <Play className="w-6 h-6 text-institute-blue" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مجدول</p>
                <p className="text-2xl font-bold text-institute-blue">{stats.scheduled}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-institute-blue dark:bg-institute-blue/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-institute-blue" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مكتمل</p>
                <p className="text-2xl font-bold text-institute-gold">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-institute-gold dark:bg-institute-gold/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-institute-gold" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
            <TabsTrigger value="active">نشط ({stats.active})</TabsTrigger>
            <TabsTrigger value="scheduled">مجدول ({stats.scheduled})</TabsTrigger>
            <TabsTrigger value="completed">مكتمل ({stats.completed})</TabsTrigger>
            <TabsTrigger value="draft">مسودة ({stats.draft})</TabsTrigger>
          </TabsList>
          
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
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الامتحان</TableHead>
                    <TableHead>المقرر</TableHead>
                    <TableHead>الموعد</TableHead>
                    <TableHead>المدة</TableHead>
                    <TableHead>الأسئلة</TableHead>
                    <TableHead>الطلاب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam) => {
                    const status = statusConfig[exam.status]
                    const StatusIcon = status.icon
                    const completionRate = exam.studentsCount > 0 
                      ? Math.round((exam.completedCount / exam.studentsCount) * 100) 
                      : 0
                    
                    return (
                      <TableRow key={exam.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{exam.name}</p>
                            <p className="text-xs text-muted-foreground">{exam.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono text-sm">{exam.courseCode}</p>
                            <p className="text-xs text-muted-foreground">{exam.courseName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{formatDateTime(exam.startDate)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Timer className="w-3 h-3" />
                            {exam.duration} دقيقة
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <p className="font-bold">{exam.questionsCount}</p>
                            <p className="text-xs text-muted-foreground">{exam.totalPoints} درجة</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span>{exam.completedCount}/{exam.studentsCount}</span>
                            </div>
                            {exam.status === "completed" && (
                              <Progress value={completionRate} className="h-1" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                          {exam.status === "completed" && exam.averageScore !== null && (
                            <p className="text-xs text-muted-foreground mt-1">
                              المتوسط: {exam.averageScore}%
                            </p>
                          )}
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
                                <Link href={`/institute/online-exams/${exam.id}`}>
                                  <Eye className="w-4 h-4 ml-2" />
                                  عرض التفاصيل
                                </Link>
                              </DropdownMenuItem>
                              {exam.status === "draft" && (
                                <DropdownMenuItem>
                                  <Edit className="w-4 h-4 ml-2" />
                                  تعديل
                                </DropdownMenuItem>
                              )}
                              {exam.status === "draft" && (
                                <DropdownMenuItem>
                                  <Send className="w-4 h-4 ml-2" />
                                  نشر الامتحان
                                </DropdownMenuItem>
                              )}
                              {exam.status === "scheduled" && (
                                <DropdownMenuItem>
                                  <Play className="w-4 h-4 ml-2" />
                                  بدء الامتحان
                                </DropdownMenuItem>
                              )}
                              {exam.status === "active" && (
                                <DropdownMenuItem>
                                  <Pause className="w-4 h-4 ml-2" />
                                  إيقاف مؤقت
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Copy className="w-4 h-4 ml-2" />
                                نسخ
                              </DropdownMenuItem>
                              {exam.status === "completed" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <Link href={`/institute/online-exams/reports?exam=${exam.id}`}>
                                      <BarChart3 className="w-4 h-4 ml-2" />
                                      التقارير
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="w-4 h-4 ml-2" />
                                    تصدير النتائج
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 ml-2" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {filteredExams.length === 0 && (
                <div className="text-center py-12">
                  <Monitor className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد امتحانات</p>
                  <Button asChild className="mt-4 bg-institute-blue hover:bg-institute-blue">
                    <Link href="/institute/online-exams/create">
                      <Plus className="w-4 h-4 ml-2" />
                      إنشاء امتحان جديد
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
