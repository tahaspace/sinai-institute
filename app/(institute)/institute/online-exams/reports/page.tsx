"use client"

import { useState, useEffect } from "react"
import {
  BarChart3,
  Search,
  Users,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  Printer,
  Eye,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL } from "@/components/shared/academic-system-filter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

interface CourseOption {
  id: string
  code: string
  nameAr: string
}

interface StudentResult {
  name: string
  studentCode: string
  score: number
  max: number
  percentage: number
  grade: string
  /** Server-resolved from the student's programme: 'CREDIT_HOURS' | 'ANNUAL'. */
  system: string
}

interface GradeBucket {
  grade: string
  count: number
}

interface ScoreBucket {
  range: string
  count: number
}

interface ApiStats {
  participants: number
  average: number
  passRate: number
  highest: number
  lowest: number
}

const PIE_COLORS = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#f59e0b", "#ef4444", "#94a3b8", "#14b8a6"]

// Two scales share this table: credit-hour letters and — for annual students, who have no
// letterGrade — the bylaw's تقدير bands (lib/annual.ts). Every value the API can emit needs a key
// here, or the Badge renders with className={undefined}. "A-" was missing (letterOf returns it at ≥85).
const gradeColors: Record<string, string> = {
  "A+": "bg-institute-blue text-green-700",
  "A": "bg-institute-blue text-green-700",
  "A-": "bg-lime-100 text-lime-700",
  "B+": "bg-lime-100 text-lime-700",
  "B": "bg-yellow-100 text-yellow-700",
  "C+": "bg-amber-100 text-amber-700",
  "C": "bg-institute-gold text-orange-700",
  "D+": "bg-red-100 text-red-600",
  "D": "bg-red-100 text-red-600",
  "F": "bg-red-200 text-red-800",
  "ممتاز": "bg-green-100 text-green-700",
  "جيد جداً": "bg-lime-100 text-lime-700",
  "جيد": "bg-yellow-100 text-yellow-700",
  "مقبول": "bg-amber-100 text-amber-700",
  "راسب": "bg-red-200 text-red-800",
  "-": "bg-gray-100 text-gray-600",
}

export default function OnlineExamReportsPage() {
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])
  const [gradeDistribution, setGradeDistribution] = useState<GradeBucket[]>([])
  const [scoreDistribution, setScoreDistribution] = useState<ScoreBucket[]>([])
  const [apiStats, setApiStats] = useState<ApiStats>({
    participants: 0,
    average: 0,
    passRate: 0,
    highest: 0,
    lowest: 0,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [sortBy, setSortBy] = useState<"score" | "name">("score")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // The system filter goes to the SERVER: the stat cards and both charts are computed there,
        // so narrowing in the browser would leave them claiming numbers for hidden students.
        // "كل الأنظمة" sends no `system` param at all, so the request is the one we sent before.
        const params = new URLSearchParams()
        if (selectedCourseId) params.set("courseId", selectedCourseId)
        if (systemFilter !== ACADEMIC_SYSTEM_ALL) params.set("system", systemFilter)
        const qs = params.toString()
        const res = await fetch(`/api/institute/online-exams/reports${qs ? `?${qs}` : ""}`)
        if (!res.ok) throw new Error("فشل في جلب تقارير الامتحانات")
        const json = await res.json()
        if (cancelled) return
        setCourses(json.courses ?? [])
        setStudentResults(json.studentResults ?? [])
        setGradeDistribution(json.gradeDistribution ?? [])
        setScoreDistribution(json.scoreDistribution ?? [])
        setApiStats(
          json.stats ?? { participants: 0, average: 0, passRate: 0, highest: 0, lowest: 0 }
        )
        // No courseId yet → default to the first course returned, then refetch with ?courseId=
        if (!selectedCourseId && json.course?.id) {
          setSelectedCourseId(json.course.id)
        } else if (!selectedCourseId && json.courses?.length) {
          setSelectedCourseId(json.courses[0].id)
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
  }, [selectedCourseId, systemFilter])

  const filteredResults = studentResults
    .filter((s) => {
      return (
        !searchQuery ||
        s.name.includes(searchQuery) ||
        s.studentCode.includes(searchQuery)
      )
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === "score") {
        comparison = a.score - b.score
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name, "ar")
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

  const handleExport = () => {
    const headers = ["الرقم الأكاديمي", "اسم الطالب", "الدرجة", "النسبة", "التقدير"]
    const data = filteredResults.map((s) => [
      s.studentCode,
      s.name,
      s.score,
      `${s.percentage}%`,
      s.grade,
    ])
    console.log("Exporting:", { headers, data })
    alert("تم تصدير التقرير بنجاح!")
  }

  // A pass rate / average / max over an EMPTY population is not 0 — it does not exist. Reachable
  // as soon as a system selection matches nobody on this exam, so guard every derived card.
  const hasPopulation = (apiStats.participants ?? 0) > 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-institute-blue" />
            تقارير نتائج الامتحانات
          </h1>
          <p className="text-muted-foreground">
            عرض وتحليل نتائج الامتحانات الأونلاين
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 ml-2" />
            طباعة
          </Button>
          <Button onClick={handleExport} className="bg-institute-blue hover:bg-institute-blue">
            <FileSpreadsheet className="w-4 h-4 ml-2" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            جارٍ تحميل تقارير الامتحانات...
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">المقرر</label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <BookOpen className="w-4 h-4 ml-2" />
                  <SelectValue placeholder="اختر المقرر" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} - {course.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الشعبة</label>
              <Select value="all" disabled>
                <SelectTrigger>
                  <Users className="w-4 h-4 ml-2" />
                  <SelectValue placeholder="الشعبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">النظام الأكاديمي</label>
              <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">بحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو الرقم الأكاديمي..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!loading && !error && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">عدد المشاركين</p>
                    <p className="text-2xl font-bold">{apiStats.participants}</p>
                  </div>
                  <Users className="w-8 h-8 text-institute-blue" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">نسبة النجاح</p>
                    <p className="text-2xl font-bold text-institute-blue">{hasPopulation ? `${apiStats.passRate}%` : "—"}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-institute-blue" />
                </div>
                <div className="mt-2">
                  <Progress value={hasPopulation ? apiStats.passRate : 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">متوسط النسبة</p>
                    <p className="text-2xl font-bold">{hasPopulation ? `${apiStats.average}%` : "—"}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-institute-blue" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">أعلى درجة</p>
                    <p className="text-2xl font-bold">{hasPopulation ? apiStats.highest : "—"}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-institute-blue" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">أدنى درجة</p>
                    <p className="text-2xl font-bold">{hasPopulation ? apiStats.lowest : "—"}</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>توزيع التقديرات</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={gradeDistribution}
                      dataKey="count"
                      nameKey="grade"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(props: { payload?: GradeBucket }) =>
                        props.payload ? `${props.payload.grade}: ${props.payload.count}` : ""
                      }
                    >
                      {gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${entry.grade}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>توزيع الدرجات</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>نتائج الطلاب التفصيلية</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">ترتيب حسب:</span>
                  <Select value={sortBy} onValueChange={(v: "score" | "name") => setSortBy(v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">الدرجة</SelectItem>
                      <SelectItem value="name">الاسم</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    {sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الطالب</TableHead>
                    <TableHead>الدرجة</TableHead>
                    <TableHead>النسبة</TableHead>
                    <TableHead>التقدير</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Rows are narrowed by BOTH the server-side system filter and the client-side
                      search, so the "no matches" row must cover either being active. The search test
                      mirrors the predicate above (`!searchQuery`) exactly, so a whitespace-only query
                      — which does narrow — is covered too. With neither active the genuinely-empty
                      table renders exactly as it did before. */}
                  {filteredResults.length === 0 &&
                    (systemFilter !== ACADEMIC_SYSTEM_ALL || searchQuery !== "") && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                        لا توجد نتائج مطابقة للتصفية
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredResults.map((student, index) => (
                    <TableRow key={`${student.studentCode}-${index}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-institute-blue text-institute-blue flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.studentCode}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-lg">{student.score}</span>
                        <span className="text-muted-foreground">/{student.max}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={student.percentage} className="w-20 h-2" />
                          <span className="text-sm font-medium">{student.percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={gradeColors[student.grade]}>
                          {student.grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
