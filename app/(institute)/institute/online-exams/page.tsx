"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Monitor,
  Plus,
  Search,
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
  Timer,
  BarChart3,
  FileText,
  Download,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ExamRow {
  id: string
  title: string
  course: string
  code: string
  date: string
  time: string
  durationMins: number
  questions: number
  participants: number
  status: "active" | "scheduled" | "completed"
}

interface ExamStats {
  total: number
  active: number
  scheduled: number
  completed: number
  totalQuestions: number
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "مسودة", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400", icon: FileText },
  scheduled: { label: "مجدول", color: "bg-institute-blue text-blue-700 dark:bg-institute-blue/30 dark:text-blue-400", icon: Clock },
  active: { label: "نشط الآن", color: "bg-institute-blue text-green-700 dark:bg-institute-blue/30 dark:text-green-400", icon: Play },
  completed: { label: "مكتمل", color: "bg-institute-gold text-purple-700 dark:bg-institute-gold/30 dark:text-purple-400", icon: CheckCircle2 },
}

export default function OnlineExamsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("all")
  const [exams, setExams] = useState<ExamRow[]>([])
  const [apiStats, setApiStats] = useState<ExamStats>({ total: 0, active: 0, scheduled: 0, completed: 0, totalQuestions: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/online-exams`)
        if (!res.ok) throw new Error("فشل في جلب الامتحانات الإلكترونية")
        const json = await res.json()
        if (!cancelled) {
          setExams(json.exams ?? [])
          setApiStats(json.stats ?? { total: 0, active: 0, scheduled: 0, completed: 0, totalQuestions: 0 })
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

  const filteredExams = exams.filter(exam => {
    const matchesSearch =
      exam.title.includes(searchQuery) ||
      exam.code.includes(searchQuery) ||
      exam.course.includes(searchQuery)
    const matchesStatus = statusFilter === "all" || exam.status === statusFilter
    const matchesTab = activeTab === "all" || exam.status === activeTab
    return matchesSearch && matchesStatus && matchesTab
  })

  const stats = {
    total: apiStats.total,
    draft: 0,
    scheduled: apiStats.scheduled,
    active: apiStats.active,
    completed: apiStats.completed,
    totalQuestions: apiStats.totalQuestions,
  }

  const formatDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr) return "غير محدد"
    return timeStr ? `${dateStr} ${timeStr}` : dateStr
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

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الامتحانات الإلكترونية...</CardContent></Card>}

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
                    const status = statusConfig[exam.status] ?? statusConfig.scheduled
                    const StatusIcon = status.icon

                    return (
                      <TableRow key={exam.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{exam.title}</p>
                            <p className="text-xs text-muted-foreground">{exam.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono text-sm">{exam.code}</p>
                            <p className="text-xs text-muted-foreground">{exam.course}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{formatDateTime(exam.date, exam.time)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Timer className="w-3 h-3" />
                            {exam.durationMins} دقيقة
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <p className="font-bold">{exam.questions}</p>
                            <p className="text-xs text-muted-foreground">—</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span>{exam.participants}</span>
                            </div>
                          </div>
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
                                <Link href={`/institute/online-exams/${exam.id}`}>
                                  <Eye className="w-4 h-4 ml-2" />
                                  عرض التفاصيل
                                </Link>
                              </DropdownMenuItem>
                              {(exam.status as string) === "draft" && (
                                <DropdownMenuItem>
                                  <Edit className="w-4 h-4 ml-2" />
                                  تعديل
                                </DropdownMenuItem>
                              )}
                              {(exam.status as string) === "draft" && (
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
