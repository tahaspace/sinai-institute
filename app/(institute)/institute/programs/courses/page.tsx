"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { BookOpen, Search, Plus, Calendar, Clock, Users, Eye, Edit, Play } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface CourseRow {
  id: string
  name: string
  program: string
  trainer: string
  duration: string
  trainees: number
  startDate: string
  status: keyof typeof statusConfig
}

const statusConfig = {
  active: { label: "جارية", color: "bg-institute-blue text-green-700" },
  scheduled: { label: "مجدولة", color: "bg-institute-blue text-blue-700" },
  completed: { label: "مكتملة", color: "bg-gray-100 text-gray-700" },
}

export default function InstitueCoursesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [coursesData, setCoursesData] = useState<CourseRow[]>([])
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
        const rows: CourseRow[] = (json.courses ?? []).map(
          (c: { id: string; code: string; name: string; department: string; creditHours: number; instructor: string; students: number }) => ({
            id: c.code,
            name: c.name,
            program: c.department,
            trainer: c.instructor,
            duration: `${c.creditHours} ساعة معتمدة`,
            trainees: c.students,
            startDate: "—",
            status: "active",
          })
        )
        if (!cancelled) setCoursesData(rows)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filteredCourses = coursesData.filter(
    (c) => !searchTerm || c.name.includes(searchTerm) || c.id.includes(searchTerm)
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-institute-blue" />
            الدورات التدريبية
          </h1>
          <p className="text-gray-500 mt-1">إدارة الدورات وجداولها</p>
        </div>
        <Button className="bg-institute-blue hover:bg-institute-blue">
          <Plus className="w-4 h-4 ml-2" />
          دورة جديدة
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-gray-500">جارٍ تحميل المقررات...</CardContent></Card>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الدورات", value: coursesData.length, icon: BookOpen, color: "teal" },
          { label: "دورات جارية", value: coursesData.filter(c => c.status === "active").length, icon: Play, color: "green" },
          { label: "دورات مجدولة", value: coursesData.filter(c => c.status === "scheduled").length, icon: Calendar, color: "blue" },
          { label: "إجمالي المتدربين", value: coursesData.reduce((s, c) => s + c.trainees, 0), icon: Users, color: "purple" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`border-r-4 border-r-${stat.color}-500`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-10 h-10 text-${stat.color}-500`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input placeholder="بحث في الدورات..." className="pr-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-48"><SelectValue placeholder="البرنامج" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع البرامج</SelectItem>
                <SelectItem value="software">تطوير البرمجيات</SelectItem>
                <SelectItem value="design">التصميم الرقمي</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">جارية</SelectItem>
                <SelectItem value="scheduled">مجدولة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>قائمة الدورات</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الدورة</TableHead>
                <TableHead className="text-right">البرنامج</TableHead>
                <TableHead className="text-right">المدرب</TableHead>
                <TableHead className="text-center">المدة</TableHead>
                <TableHead className="text-center">المتدربين</TableHead>
                <TableHead className="text-center">تاريخ البدء</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{course.name}</p>
                      <p className="text-xs text-gray-500">{course.id}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{course.program}</Badge></TableCell>
                  <TableCell>{course.trainer}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />{course.duration}</Badge></TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="gap-1"><Users className="w-3 h-3" />{course.trainees}</Badge></TableCell>
                  <TableCell className="text-center">{course.startDate}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={statusConfig[course.status].color}>
                      {statusConfig[course.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button size="icon" variant="ghost"><Eye className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost"><Edit className="w-4 h-4" /></Button>
                    </div>
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
