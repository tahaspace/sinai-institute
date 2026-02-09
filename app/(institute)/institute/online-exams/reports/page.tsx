"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  BarChart3,
  Download,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  Printer,
  Eye,
  BookOpen,
  Calendar,
  Award,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
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
  LineChart,
  Line,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"

// Mock Data
const exams = [
  { id: "EX001", name: "امتحان منتصف الفصل - مقدمة في البرمجة", courseCode: "CS101" },
  { id: "EX003", name: "امتحان نهائي - قواعد البيانات", courseCode: "CS301" },
]

const sections = [
  { id: "all", name: "جميع الشعب" },
  { id: "A", name: "الشعبة A" },
  { id: "B", name: "الشعبة B" },
  { id: "C", name: "الشعبة C" },
]

const studentResults = [
  {
    id: "STU001",
    name: "أحمد محمد علي",
    studentId: "2021001",
    section: "A",
    score: 45,
    maxScore: 50,
    percentage: 90,
    grade: "A",
    submittedAt: "2025-01-10T09:45:00",
    duration: 45, // minutes
    status: "passed",
    correctAnswers: 27,
    wrongAnswers: 3,
    unanswered: 0,
  },
  {
    id: "STU002",
    name: "سارة أحمد محمود",
    studentId: "2021002",
    section: "A",
    score: 42,
    maxScore: 50,
    percentage: 84,
    grade: "B+",
    submittedAt: "2025-01-10T10:00:00",
    duration: 60,
    status: "passed",
    correctAnswers: 25,
    wrongAnswers: 4,
    unanswered: 1,
  },
  {
    id: "STU003",
    name: "محمد خالد إبراهيم",
    studentId: "2021003",
    section: "B",
    score: 38,
    maxScore: 50,
    percentage: 76,
    grade: "B",
    submittedAt: "2025-01-10T10:15:00",
    duration: 75,
    status: "passed",
    correctAnswers: 23,
    wrongAnswers: 6,
    unanswered: 1,
  },
  {
    id: "STU004",
    name: "نورا محمد السيد",
    studentId: "2021004",
    section: "B",
    score: 22,
    maxScore: 50,
    percentage: 44,
    grade: "F",
    submittedAt: "2025-01-10T10:30:00",
    duration: 90,
    status: "failed",
    correctAnswers: 13,
    wrongAnswers: 15,
    unanswered: 2,
  },
  {
    id: "STU005",
    name: "يوسف عمر حسين",
    studentId: "2021005",
    section: "A",
    score: 35,
    maxScore: 50,
    percentage: 70,
    grade: "C+",
    submittedAt: "2025-01-10T09:55:00",
    duration: 55,
    status: "passed",
    correctAnswers: 21,
    wrongAnswers: 8,
    unanswered: 1,
  },
  {
    id: "STU006",
    name: "فاطمة حسن محمود",
    studentId: "2021006",
    section: "C",
    score: 48,
    maxScore: 50,
    percentage: 96,
    grade: "A+",
    submittedAt: "2025-01-10T09:30:00",
    duration: 30,
    status: "passed",
    correctAnswers: 29,
    wrongAnswers: 1,
    unanswered: 0,
  },
  {
    id: "STU007",
    name: "علي محمد أحمد",
    studentId: "2021007",
    section: "C",
    score: null,
    maxScore: 50,
    percentage: 0,
    grade: "-",
    submittedAt: null,
    duration: null,
    status: "absent",
    correctAnswers: 0,
    wrongAnswers: 0,
    unanswered: 30,
  },
]

const gradeDistribution = [
  { grade: "A+", count: 1, color: "#22c55e" },
  { grade: "A", count: 1, color: "#84cc16" },
  { grade: "B+", count: 1, color: "#eab308" },
  { grade: "B", count: 1, color: "#f97316" },
  { grade: "C+", count: 1, color: "#f59e0b" },
  { grade: "F", count: 1, color: "#ef4444" },
  { grade: "غائب", count: 1, color: "#94a3b8" },
]

const scoreDistribution = [
  { range: "0-10", count: 0 },
  { range: "11-20", count: 0 },
  { range: "21-30", count: 1 },
  { range: "31-40", count: 2 },
  { range: "41-50", count: 3 },
]

const gradeColors: Record<string, string> = {
  "A+": "bg-institute-blue text-green-700",
  "A": "bg-institute-blue text-green-700",
  "B+": "bg-lime-100 text-lime-700",
  "B": "bg-yellow-100 text-yellow-700",
  "C+": "bg-amber-100 text-amber-700",
  "C": "bg-institute-gold text-orange-700",
  "D+": "bg-red-100 text-red-600",
  "D": "bg-red-100 text-red-600",
  "F": "bg-red-200 text-red-800",
  "-": "bg-gray-100 text-gray-600",
}

export default function OnlineExamReportsPage() {
  const [selectedExam, setSelectedExam] = useState("EX001")
  const [selectedSection, setSelectedSection] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"score" | "name" | "time">("score")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const filteredResults = studentResults
    .filter(s => {
      const matchesSearch = 
        s.name.includes(searchQuery) ||
        s.studentId.includes(searchQuery)
      const matchesSection = selectedSection === "all" || s.section === selectedSection
      return matchesSearch && matchesSection
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === "score") {
        comparison = (a.score || 0) - (b.score || 0)
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name, "ar")
      } else if (sortBy === "time") {
        comparison = (a.duration || 0) - (b.duration || 0)
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

  const stats = {
    total: studentResults.length,
    completed: studentResults.filter(s => s.status !== "absent").length,
    passed: studentResults.filter(s => s.status === "passed").length,
    failed: studentResults.filter(s => s.status === "failed").length,
    absent: studentResults.filter(s => s.status === "absent").length,
    averageScore: Math.round(
      studentResults
        .filter(s => s.score !== null)
        .reduce((sum, s) => sum + (s.score || 0), 0) / 
      studentResults.filter(s => s.score !== null).length
    ),
    highestScore: Math.max(...studentResults.filter(s => s.score !== null).map(s => s.score || 0)),
    lowestScore: Math.min(...studentResults.filter(s => s.score !== null && s.score > 0).map(s => s.score || 0)),
    averageTime: Math.round(
      studentResults
        .filter(s => s.duration !== null)
        .reduce((sum, s) => sum + (s.duration || 0), 0) / 
      studentResults.filter(s => s.duration !== null).length
    ),
  }

  const passRate = Math.round((stats.passed / stats.completed) * 100)

  const handleExport = () => {
    // Simulate Excel export
    const headers = ["الرقم الأكاديمي", "اسم الطالب", "الشعبة", "الدرجة", "النسبة", "التقدير", "الحالة"]
    const data = filteredResults.map(s => [
      s.studentId,
      s.name,
      s.section,
      s.score || 0,
      `${s.percentage}%`,
      s.grade,
      s.status === "passed" ? "ناجح" : s.status === "failed" ? "راسب" : "غائب"
    ])
    console.log("Exporting:", { headers, data })
    alert("تم تصدير التقرير بنجاح!")
  }

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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">الامتحان</label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <BookOpen className="w-4 h-4 ml-2" />
                  <SelectValue placeholder="اختر الامتحان" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الشعبة</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <Users className="w-4 h-4 ml-2" />
                  <SelectValue placeholder="الشعبة" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(sec => (
                    <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الطلاب</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الناجحين</p>
                <p className="text-2xl font-bold text-institute-blue">{stats.passed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-institute-blue" />
            </div>
            <div className="mt-2">
              <Progress value={passRate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">نسبة النجاح: {passRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الراسبين</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متوسط الدرجات</p>
                <p className="text-2xl font-bold">{stats.averageScore}/50</p>
              </div>
              <TrendingUp className="w-8 h-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متوسط الوقت</p>
                <p className="text-2xl font-bold">{stats.averageTime} د</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600" />
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
                  label={({ grade, count }) => `${grade}: ${count}`}
                >
                  {gradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
              <Select value={sortBy} onValueChange={(v: "score" | "name" | "time") => setSortBy(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">الدرجة</SelectItem>
                  <SelectItem value="name">الاسم</SelectItem>
                  <SelectItem value="time">الوقت</SelectItem>
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
                <TableHead>الشعبة</TableHead>
                <TableHead>الدرجة</TableHead>
                <TableHead>النسبة</TableHead>
                <TableHead>التقدير</TableHead>
                <TableHead>الإجابات</TableHead>
                <TableHead>الوقت</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-institute-blue text-institute-blue flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.studentId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.section}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-lg">
                      {student.score !== null ? student.score : "-"}
                    </span>
                    <span className="text-muted-foreground">/{student.maxScore}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={student.percentage} 
                        className="w-20 h-2"
                      />
                      <span className="text-sm font-medium">{student.percentage}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={gradeColors[student.grade]}>
                      {student.grade}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {student.status !== "absent" ? (
                      <div className="text-xs space-y-1">
                        <p className="text-institute-blue">✓ {student.correctAnswers} صحيح</p>
                        <p className="text-red-600">✗ {student.wrongAnswers} خطأ</p>
                        {student.unanswered > 0 && (
                          <p className="text-gray-500">○ {student.unanswered} بدون إجابة</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.duration !== null ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {student.duration} دقيقة
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.status === "passed" && (
                      <Badge className="bg-institute-blue text-green-700 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        ناجح
                      </Badge>
                    )}
                    {student.status === "failed" && (
                      <Badge className="bg-red-100 text-red-700 gap-1">
                        <XCircle className="w-3 h-3" />
                        راسب
                      </Badge>
                    )}
                    {student.status === "absent" && (
                      <Badge className="bg-gray-100 text-gray-700 gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        غائب
                      </Badge>
                    )}
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
    </div>
  )
}
