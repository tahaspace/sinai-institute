"use client"

import { useState, useEffect } from "react"
import {
  ClipboardList,
  Plus,
  Clock,
  CheckCircle2,
  Users,
  Calendar,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Play,
  Pause,
  BarChart3,
  Lock,
  Copy,
  Shuffle,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type ExamStatus = "scheduled" | "live" | "completed"

interface ExamRow {
  id: string
  title: string
  subject: string
  date: string
  time: string
  duration: number
  questions: number
  participants: number
  status: ExamStatus
}

interface ExamResultRow {
  id: string
  student: string
  grade: number
  maxGrade: number
  status: string
}

interface ApiStats {
  total: number
  scheduled: number
  live: number
  completed: number
}

// Default anti-cheating preset for the create form (static; no API field)
const defaultExamSettings = { shuffle: true, preventCopy: true, showResults: true }

// Question Types (static — used by the create form)
const questionTypes = [
  { id: "mcq", label: "اختيار من متعدد", icon: "📝" },
  { id: "tf", label: "صح أو خطأ", icon: "✅" },
  { id: "short", label: "إجابة قصيرة", icon: "📄" },
  { id: "essay", label: "مقالي", icon: "📖" },
  { id: "match", label: "توصيل", icon: "🔗" },
  { id: "fill", label: "ملء الفراغات", icon: "___" },
]

const statusConfig = {
  scheduled: { label: "مجدول", color: "bg-blue-100 text-blue-700", icon: Calendar },
  live: { label: "جاري الآن", color: "bg-red-100 text-red-700", icon: Play },
  completed: { label: "مكتمل", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
}

export default function ExamsPage() {
  const [showNewForm, setShowNewForm] = useState(false)
  const [activeTab, setActiveTab] = useState("exams")
  const [exams, setExams] = useState<ExamRow[]>([])
  const [examResults, setExamResults] = useState<ExamResultRow[]>([])
  const [apiStats, setApiStats] = useState<ApiStats>({ total: 0, scheduled: 0, live: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/lms/exams`)
        if (!res.ok) throw new Error("فشل في جلب الاختبارات")
        const json = await res.json()
        if (!cancelled) {
          setExams(json.exams ?? [])
          setExamResults(json.examResults ?? [])
          setApiStats(json.stats ?? { total: 0, scheduled: 0, live: 0, completed: 0 })
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

  // avgGrade has no direct API field — compute from examResults average %
  const avgGrade =
    examResults.length > 0
      ? Math.round(
          examResults.reduce((sum, r) => sum + (r.maxGrade > 0 ? (r.grade / r.maxGrade) * 100 : 0), 0) /
            examResults.length,
        )
      : null

  const stats = {
    total: apiStats.total,
    scheduled: apiStats.scheduled,
    live: apiStats.live,
    completed: apiStats.completed,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الاختبارات الإلكترونية</h1>
          <p className="text-muted-foreground">إنشاء وإدارة الاختبارات الإلكترونية</p>
        </div>
        <Button className="bg-violet-500 hover:bg-violet-600" onClick={() => setShowNewForm(!showNewForm)}>
          <Plus className="w-4 h-4 ml-2" />
          إنشاء اختبار جديد
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الاختبارات...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <ClipboardList className="w-8 h-8 mx-auto text-violet-500 mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">إجمالي الاختبارات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
            <p className="text-sm text-muted-foreground">مجدول</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="relative mx-auto w-8 h-8 mb-2">
              <Play className="w-8 h-8 text-red-500" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.live}</p>
            <p className="text-sm text-muted-foreground">جاري الآن</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">مكتمل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-orange-600">{avgGrade === null ? "—" : `${avgGrade}%`}</p>
            <p className="text-sm text-muted-foreground">متوسط النجاح</p>
          </CardContent>
        </Card>
      </div>

      {/* New Exam Form */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle>إنشاء اختبار جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>عنوان الاختبار</Label>
                <Input placeholder="مثال: اختبار نهاية الفصل" />
              </div>
              <div className="space-y-2">
                <Label>المادة</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="math">الرياضيات</SelectItem>
                    <SelectItem value="physics">الفيزياء</SelectItem>
                    <SelectItem value="chemistry">الكيمياء</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الفصل</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفصل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3/1">3/1</SelectItem>
                    <SelectItem value="3/2">3/2</SelectItem>
                    <SelectItem value="3/3">3/3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>الوقت</Label>
                <Input type="time" />
              </div>
              <div className="space-y-2">
                <Label>المدة (دقيقة)</Label>
                <Input type="number" defaultValue="60" />
              </div>
              <div className="space-y-2">
                <Label>الدرجة الكاملة</Label>
                <Input type="number" defaultValue="50" />
              </div>
              <div className="space-y-2">
                <Label>درجة النجاح (%)</Label>
                <Input type="number" defaultValue="50" />
              </div>
              <div className="space-y-2">
                <Label>عدد المحاولات</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">محاولة واحدة</SelectItem>
                    <SelectItem value="2">محاولتان</SelectItem>
                    <SelectItem value="3">ثلاث محاولات</SelectItem>
                    <SelectItem value="unlimited">غير محدود</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Anti-Cheating Settings */}
              <div className="md:col-span-2 lg:col-span-3 space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  إعدادات منع الغش
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">خلط الأسئلة</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">خلط الإجابات</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">منع النسخ</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">وضع ملء الشاشة</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label>تعليمات الاختبار</Label>
                <Textarea placeholder="تعليمات للطلاب قبل بدء الاختبار..." rows={3} />
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex items-center gap-2">
                <Button className="bg-violet-500 hover:bg-violet-600">
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء وإضافة الأسئلة
                </Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>إلغاء</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Types Quick View */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">أنواع الأسئلة المدعومة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {questionTypes.map((type) => (
              <div key={type.id} className="text-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                <span className="text-2xl mb-2 block">{type.icon}</span>
                <span className="text-sm">{type.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="exams">الاختبارات</TabsTrigger>
          <TabsTrigger value="results">النتائج</TabsTrigger>
          <TabsTrigger value="bank">بنك الأسئلة</TabsTrigger>
        </TabsList>

        {/* Exams Tab */}
        <TabsContent value="exams" className="mt-6">
          <div className="space-y-4">
            {exams.map((exam) => {
              const status = statusConfig[exam.status as keyof typeof statusConfig]
              const StatusIcon = status.icon
              const settings = defaultExamSettings

              return (
                <Card key={exam.id} className={cn(
                  exam.status === "live" && "border-red-200 bg-red-50/50 dark:bg-red-950/10"
                )}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-14 h-14 rounded-xl flex items-center justify-center",
                          exam.status === "live" ? "bg-red-100" : exam.status === "scheduled" ? "bg-blue-100" : "bg-green-100"
                        )}>
                          {exam.status === "live" ? (
                            <div className="relative">
                              <ClipboardList className="w-7 h-7 text-red-600" />
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            </div>
                          ) : (
                            <StatusIcon className={cn(
                              "w-7 h-7",
                              exam.status === "scheduled" ? "text-blue-600" : "text-green-600"
                            )} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold">{exam.title}</h3>
                            <Badge className={status.color}>{status.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {exam.subject} • الفصل — • {new Date(exam.date).toLocaleDateString("ar-EG")} {exam.time}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {exam.duration} دقيقة
                            </span>
                            <span className="flex items-center gap-1">
                              <ClipboardList className="w-4 h-4" />
                              {exam.questions} سؤال
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {exam.participants}/—
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {settings.shuffle && (
                              <Badge variant="outline" className="text-xs">
                                <Shuffle className="w-3 h-3 ml-1" />
                                خلط الأسئلة
                              </Badge>
                            )}
                            {settings.preventCopy && (
                              <Badge variant="outline" className="text-xs">
                                <Lock className="w-3 h-3 ml-1" />
                                منع النسخ
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {exam.status === "live" && (
                          <Button variant="destructive">
                            <Pause className="w-4 h-4 ml-2" />
                            إيقاف
                          </Button>
                        )}
                        {exam.status === "scheduled" && (
                          <>
                            <Button variant="outline">
                              <Edit className="w-4 h-4 ml-2" />
                              تعديل
                            </Button>
                            <Button className="bg-violet-500 hover:bg-violet-600">
                              <Play className="w-4 h-4 ml-2" />
                              بدء
                            </Button>
                          </>
                        )}
                        {exam.status === "completed" && (
                          <Button variant="outline">
                            <BarChart3 className="w-4 h-4 ml-2" />
                            النتائج
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 ml-2" />
                              معاينة
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="w-4 h-4 ml-2" />
                              نسخ
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {exam.status !== "scheduled" && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">نسبة المشاركة</span>
                          <span className="font-medium">—</span>
                        </div>
                        <Progress value={0} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>نتائج اختبار التفاضل والتكامل</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    تصدير PDF
                  </Button>
                  <Button variant="outline" size="sm">
                    تصدير Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">32</p>
                  <p className="text-sm text-muted-foreground">المشاركون</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">28</p>
                  <p className="text-sm text-muted-foreground">ناجح</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">4</p>
                  <p className="text-sm text-muted-foreground">راسب</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">43.5</p>
                  <p className="text-sm text-muted-foreground">المتوسط</p>
                </div>
              </div>
              <div className="space-y-3">
                {examResults.map((result, index) => (
                  <div key={result.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center font-bold text-violet-600">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{result.student}</p>
                        <p className="text-sm text-muted-foreground">
                          الوقت: —
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className={cn(
                          "text-xl font-bold",
                          (result.grade / result.maxGrade) >= 0.5 ? "text-green-600" : "text-red-600"
                        )}>
                          {result.grade}/{result.maxGrade}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {((result.grade / result.maxGrade) * 100).toFixed(0)}%
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 ml-2" />
                        التفاصيل
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Question Bank Tab */}
        <TabsContent value="bank" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>بنك الأسئلة</CardTitle>
                <Button className="bg-violet-500 hover:bg-violet-600">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة سؤال
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-blue-50 dark:bg-blue-950/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">256</p>
                    <p className="text-sm text-muted-foreground">الرياضيات</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-950/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">189</p>
                    <p className="text-sm text-muted-foreground">الفيزياء</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 dark:bg-purple-950/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">145</p>
                    <p className="text-sm text-muted-foreground">الكيمياء</p>
                  </CardContent>
                </Card>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>اختر مادة لعرض الأسئلة</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



