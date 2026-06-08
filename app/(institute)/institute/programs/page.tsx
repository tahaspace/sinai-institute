"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BookOpen,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Users,
  Clock,
  Calendar,
  DollarSign,
  Play,
  Video,
  FileText,
  ChevronLeft,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Programs Data (fetched from /api/institute/programs)
interface ProgramRow {
  id: string
  nameAr: string
  nameEn: string
  department: string
  departmentId: string | null
  degree: string
  years: number
  totalCreditHours: number
  description: string
  isActive: boolean
  students: number
}

// Courses (Active Sessions)
const courses = [
  {
    id: "CRS001",
    program: "تطوير تطبيقات الويب",
    batch: "الدفعة 15",
    trainer: "م. أحمد سعيد",
    trainees: 35,
    progress: 65,
    startDate: "2024-12-01",
    endDate: "2025-02-28",
    status: "active",
    schedule: "السبت والاثنين 6-9 م",
  },
  {
    id: "CRS002",
    program: "إدارة المشاريع PMP",
    batch: "الدفعة 8",
    trainer: "د. سارة محمود",
    trainees: 28,
    progress: 40,
    startDate: "2024-12-15",
    endDate: "2025-03-15",
    status: "active",
    schedule: "الأحد والثلاثاء 6-9 م",
  },
]

// Content
const content = [
  { id: 1, title: "مقدمة في HTML و CSS", type: "video", duration: "45 دقيقة", program: "تطوير الويب" },
  { id: 2, title: "أساسيات JavaScript", type: "video", duration: "60 دقيقة", program: "تطوير الويب" },
  { id: 3, title: "ملخص إدارة النطاق", type: "pdf", size: "2.5 MB", program: "إدارة المشاريع" },
  { id: 4, title: "تمارين عملية", type: "file", size: "1.2 MB", program: "تطوير الويب" },
]

const statusConfig = {
  active: { label: "نشط", color: "bg-institute-blue text-green-700" },
  upcoming: { label: "قادم", color: "bg-institute-blue text-blue-700" },
  completed: { label: "مكتمل", color: "bg-gray-100 text-gray-700" },
}

export default function ProgramsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/programs`)
        if (!res.ok) throw new Error("فشل في جلب البرامج")
        const json = await res.json()
        if (!cancelled) setPrograms(json.programs ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Stats derived from fetched programs
  const stats = {
    totalPrograms: programs.length,
    activePrograms: programs.filter((p) => p.isActive).length,
    totalTrainees: programs.reduce((a, b) => a + b.students, 0),
    totalHours: programs.reduce((a, b) => a + b.totalCreditHours, 0),
  }

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch = program.nameAr.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || program.department === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">البرامج والدورات</h1>
          <p className="text-muted-foreground">إدارة البرامج التدريبية والدورات</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          برنامج جديد
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            جارٍ تحميل البرامج...
          </CardContent>
        </Card>
      )}
      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-institute-blue mb-2" />
            <p className="text-2xl font-bold">{stats.totalPrograms}</p>
            <p className="text-sm text-muted-foreground">برنامج تدريبي</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Play className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.activePrograms}</p>
            <p className="text-sm text-muted-foreground">نشط حالياً</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.totalTrainees}</p>
            <p className="text-sm text-muted-foreground">متدرب مسجل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-institute-gold">{stats.totalHours}</p>
            <p className="text-sm text-muted-foreground">ساعة تدريبية</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="programs">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="programs">البرامج</TabsTrigger>
          <TabsTrigger value="courses">الدورات النشطة</TabsTrigger>
          <TabsTrigger value="content">المحتوى</TabsTrigger>
        </TabsList>

        {/* Programs Tab */}
        <TabsContent value="programs" className="mt-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن برنامج..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التصنيفات</SelectItem>
                    <SelectItem value="البرمجة">البرمجة</SelectItem>
                    <SelectItem value="الإدارة">الإدارة</SelectItem>
                    <SelectItem value="التسويق">التسويق</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program) => {
              const statusKey = program.isActive ? "active" : "inactive"
              const status = statusKey in statusConfig
                ? statusConfig[statusKey as keyof typeof statusConfig]
                : { label: program.isActive ? "نشط" : "غير نشط", color: "bg-gray-100 text-gray-700" }

              return (
                <Card key={program.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-institute-blue to-institute-blue" />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">📚</div>
                        <div>
                          <h3 className="font-bold">{program.nameAr}</h3>
                          <Badge variant="outline" className="mt-1">{program.department}</Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 ml-2" />
                            عرض
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{program.years} سنوات</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{program.totalCreditHours} ساعة</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{program.students} متدرب</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>—</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <Badge className={status.color}>{status.label}</Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/institute/programs/${program.id}`}>
                          تفاصيل
                          <ChevronLeft className="w-4 h-4 mr-2" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>الدورات النشطة</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  دورة جديدة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 rounded-lg border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold">{course.program}</h4>
                        <p className="text-sm text-muted-foreground">
                          {course.batch} • {course.trainer}
                        </p>
                      </div>
                      <Badge className="bg-institute-blue text-green-700">نشط</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">المتدربين:</span>
                        <span className="font-medium mr-1">{course.trainees}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الجدول:</span>
                        <span className="font-medium mr-1">{course.schedule}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">البداية:</span>
                        <span className="font-medium mr-1">
                          {new Date(course.startDate).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">النهاية:</span>
                        <span className="font-medium mr-1">
                          {new Date(course.endDate).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">التقدم</span>
                        <span className="text-sm font-bold">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>المحتوى التعليمي</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  رفع محتوى
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {content.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        item.type === "video" ? "bg-red-100" : "bg-institute-blue"
                      )}>
                        {item.type === "video" ? (
                          <Video className={cn("w-6 h-6", "text-red-600")} />
                        ) : (
                          <FileText className="w-6 h-6 text-institute-blue" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.program} • {item.duration || item.size}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



