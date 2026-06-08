"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BookOpen, Search, Plus, Download, Building2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CourseRow {
  id: string
  code: string
  name: string
  nameEn: string
  department: string
  departmentId: string | null
  creditHours: number
  instructor: string
  students: number
  countsInGpa: boolean
  requirementType: string
  availableInSummer: boolean
  gradeSplit: { midterm: number; final: number; practical: number; homework: number }
}

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [allCourses, setAllCourses] = useState<CourseRow[]>([])
  const [apiStats, setApiStats] = useState<{ total: number; totalCreditHours: number }>({ total: 0, totalCreditHours: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/courses`)
        if (!res.ok) throw new Error("فشل في جلب المقررات")
        const json = await res.json()
        if (!cancelled) { setAllCourses(json.courses ?? []); setApiStats(json.stats ?? { total: 0, totalCreditHours: 0 }) }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const departmentLabels: Record<string, string> = {
    engineering: "الهندسة",
    cs: "الحاسبات",
    business: "إدارة الأعمال",
  }

  const courses = allCourses.filter((c) => {
    const matchesSearch = !searchQuery || c.name.includes(searchQuery) || c.code.includes(searchQuery)
    const matchesDepartment = departmentFilter === "all" || c.department === departmentLabels[departmentFilter]
    return matchesSearch && matchesDepartment
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-institute-blue" />
            المقررات الدراسية
          </h1>
          <p className="text-muted-foreground">إدارة المقررات والساعات المعتمدة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            إضافة مقرر
          </Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل المقررات...</CardContent></Card>}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الكود..."
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
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المقررات</CardTitle>
          <CardDescription>إجمالي {apiStats.total} مقرر · {apiStats.totalCreditHours} ساعة معتمدة</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>كود المقرر</TableHead>
                <TableHead>اسم المقرر</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>الساعات</TableHead>
                <TableHead>يدخل في المعدل</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الفصل الصيفي</TableHead>
                <TableHead>تقسيم الدرجات (س/تحريري/عملي/أعمال)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-mono font-bold">{course.code}</TableCell>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{course.department}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-institute-blue text-institute-blue">{course.creditHours}</Badge>
                  </TableCell>
                  <TableCell>
                    {course.countsInGpa
                      ? <Badge className="bg-green-100 text-green-700">✓ نعم</Badge>
                      : <Badge className="bg-gray-100 text-gray-600">نجاح/رسوب</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{course.requirementType === "elective" ? "اختياري" : "إجباري"}</Badge>
                  </TableCell>
                  <TableCell>
                    {course.availableInSummer
                      ? <Badge className="bg-blue-100 text-blue-700">✓</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {course.gradeSplit.homework}/{course.gradeSplit.final}/{course.gradeSplit.practical}/{course.gradeSplit.midterm}
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
