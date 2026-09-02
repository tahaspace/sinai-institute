"use client"

import { useState, useEffect } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
// client-safe half of the module — importing lib/academic-system.ts here would pull Prisma into the browser bundle
import { ACADEMIC_SYSTEM_LABELS, normalizeSystem } from "@/lib/academic-system-shared"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import {
  Users,
  Search,
  Plus,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Mail,
  GraduationCap,
  Building2,
  Clock,
  Award,
  Lock,
} from "lucide-react"

interface StudentRow {
  id: string
  studentCode: string
  name: string
  email: string
  department: string
  program: string
  // null ⇒ no programme ⇒ no programme-derived system: `system` below is then the CREDIT_HOURS
  // fallback, not a real classification, and the row is labelled as such.
  programId: string | null
  level: string
  levelNum: number
  gpa: number
  system: string
  creditHours: number
  status: string
}

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [allStudents, setAllStudents] = useState<StudentRow[]>([])
  const [apiStats, setApiStats] = useState<{ total: number; avgGpa: number }>({ total: 0, avgGpa: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/students`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب الطلاب")
        const json = await res.json()
        if (!cancelled) { setAllStudents(json.students ?? []); setApiStats(json.stats ?? { total: 0, avgGpa: 0 }) }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const students = allStudents.filter((s) => {
    const matchesSearch = !searchQuery || s.name.includes(searchQuery) || s.studentCode.includes(searchQuery)
    const matchesLevel = levelFilter === "all" || String(s.levelNum) === levelFilter
    return matchesSearch && matchesLevel && matchesSystem(s.system, systemFilter)
  })

  // How many of the rows on screen are here only by default. matchesSystem() buckets a
  // programme-less student under CREDIT_HOURS because academicSystemWhere() does the same on the
  // server, and the two must stay identical or a list and its own totals would disagree — so the
  // filter cannot be "fixed" here. What it CAN do is stop the contradiction being silent: the
  // credit-hours view otherwise shows rows whose own badge reads «بدون برنامج», with nothing saying
  // why. Counted over the filtered rows, so the number matches the «إجمالي N طالب» beside it.
  const unlinkedShown = students.filter((s) => !s.programId).length

  const stats = [
    { label: "إجمالي الطلاب", value: String(apiStats.total), icon: Users, color: "text-institute-blue" },
    { label: "الأقسام", value: String(new Set(allStudents.map((s) => s.department)).size), icon: Building2, color: "text-institute-blue" },
    { label: "متوسط GPA", value: apiStats.avgGpa.toFixed(2), icon: Award, color: "text-institute-gold" },
    { label: "تحت الملاحظة", value: String(allStudents.filter((s) => s.system === "CREDIT_HOURS" && s.gpa < 2).length), icon: Clock, color: "text-institute-gold" },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "منتظم":
        return <Badge className="bg-institute-blue text-green-700">منتظم</Badge>
      case "إنذار أول":
        return <Badge className="bg-yellow-100 text-yellow-700">إنذار أول</Badge>
      case "إنذار ثاني":
        return <Badge className="bg-red-100 text-red-700">إنذار ثاني</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.5) return "text-institute-blue"
    if (gpa >= 2.5) return "text-institute-blue"
    if (gpa >= 2.0) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-institute-blue" />
            شؤون الطلاب
          </h1>
          <p className="text-muted-foreground">
            إدارة بيانات الطلاب والمتابعة الأكاديمية
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button asChild>
            <Link href="/institute/admission">
              <Plus className="w-4 h-4 ml-2" />
              قبول طالب جديد
            </Link>
          </Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل بيانات الطلاب...</CardContent></Card>}

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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الرقم الأكاديمي..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Building2 className="w-4 h-4 ml-2" />
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأقسام</SelectItem>
                <SelectItem value="engineering">الهندسة</SelectItem>
                <SelectItem value="cs">الحاسبات</SelectItem>
                <SelectItem value="business">إدارة الأعمال</SelectItem>
                <SelectItem value="accounting">المحاسبة</SelectItem>
              </SelectContent>
            </Select>
            <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-48" />
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full md:w-48">
                <GraduationCap className="w-4 h-4 ml-2" />
                <SelectValue placeholder="المستوى" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستويات</SelectItem>
                <SelectItem value="1">الأولى</SelectItem>
                <SelectItem value="2">الثانية</SelectItem>
                <SelectItem value="3">الثالثة</SelectItem>
                <SelectItem value="4">الرابعة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلاب</CardTitle>
          <CardDescription>إجمالي {students.length} طالب</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Same note the admissions screen uses for its unlinked applications, so a registrar
              meets one explanation for one gap in both places. */}
          {systemFilter === "CREDIT_HOURS" && unlinkedShown > 0 && (
            <p className="mb-3 text-xs text-muted-foreground">
              منهم {unlinkedShown} طالب بلا برنامج يظهرون هنا افتراضياً فقط — لم يُحدَّد لهم نظام أكاديمي بعد.
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>القسم / البرنامج</TableHead>
                <TableHead>المستوى</TableHead>
                <TableHead>الساعات</TableHead>
                <TableHead>المعدل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-institute-blue text-institute-blue">
                          {student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.studentCode}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{student.department}</p>
                      <p className="text-sm text-muted-foreground">{student.program}</p>
                      {/* The academic system is a property of the programme, never of the student —
                          so it belongs in this cell, right under the programme that produces it.
                          A student with no programme is NOT a credit-hours student: the API's
                          `system` is only its default in that case, so say so instead of printing a
                          classification nobody made. */}
                      {student.programId ? (
                        <Badge
                          variant="outline"
                          className={`mt-1 text-[10px] font-normal ${
                            normalizeSystem(student.system) === "ANNUAL"
                              ? "border-institute-gold text-institute-gold"
                              : "border-institute-blue text-institute-blue"
                          }`}
                        >
                          {ACADEMIC_SYSTEM_LABELS[normalizeSystem(student.system)]}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="mt-1 text-[10px] font-normal border-red-300 text-red-600">
                          بدون برنامج — يُعامل افتراضياً كساعات معتمدة
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.level}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{student.creditHours}</span>
                    <span className="text-muted-foreground text-sm"> ساعة</span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${student.system === "ANNUAL" ? "text-muted-foreground" : getGPAColor(student.gpa)}`}>
                      {/* annual students are graded by percentage/تقدير, not CGPA — showing 0.00 would be a lie */}
                      {student.system === "ANNUAL" ? "—" : student.gpa.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(student.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/institute/students/${student.id}`}>
                            <Eye className="w-4 h-4 ml-2" />
                            عرض الملف
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 ml-2" />
                          تعديل البيانات
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="w-4 h-4 ml-2" />
                          إرسال رسالة
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/students/holds">
            <div className="text-center">
              <Lock className="w-6 h-6 mx-auto mb-2 text-red-600" />
              <span>حجب الطلاب</span>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/students/advising">
            <div className="text-center">
              <GraduationCap className="w-6 h-6 mx-auto mb-2 text-institute-blue" />
              <span>الإرشاد الأكاديمي</span>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/students/warnings">
            <div className="text-center">
              <Award className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <span>الإنذارات الأكاديمية</span>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/students/graduation">
            <div className="text-center">
              <Award className="w-6 h-6 mx-auto mb-2 text-institute-gold" />
              <span>طلبات التخرج</span>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/students/attendance">
            <div className="text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-institute-blue" />
              <span>الحضور والغياب</span>
            </div>
          </Link>
        </Button>
      </div>
    </div>
  )
}
