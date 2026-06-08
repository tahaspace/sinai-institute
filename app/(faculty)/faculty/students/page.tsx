"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, Search, Eye, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// --- API response shape (served by /api/faculty/students) ---
interface FacultyStudent {
  id: string
  studentCode: string
  name: string
  level: number
  gpa: number
  courses: string[]
}

export default function FacultyStudentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [students, setStudents] = useState<FacultyStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/faculty/students`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب الطلاب")
        const json = await res.json()
        if (!cancelled) setStudents(json.students ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const allCourses = [...new Set(students.flatMap((s) => s.courses))]
  const filteredStudents = students.filter(
    (s) =>
      (selectedCourse === "all" || s.courses.includes(selectedCourse)) &&
      (s.name.includes(searchTerm) || s.studentCode.includes(searchTerm))
  )
  const avgGpa = students.length
    ? (students.reduce((sum, s) => sum + s.gpa, 0) / students.length).toFixed(2)
    : "0.00"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            طلابي
          </h1>
          <p className="text-gray-500 mt-1">متابعة الطلاب المسجلين في مقرراتك</p>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-gray-500">جارٍ تحميل الطلاب...</CardContent></Card>}

      {!loading && !error && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "إجمالي الطلاب", value: students.length, color: "indigo" },
              { label: "متوسط المعدل التراكمي", value: avgGpa, color: "green" },
              { label: "طلاب يحتاجون متابعة", value: students.filter((s) => s.gpa < 2.0).length, color: "red" },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input placeholder="بحث بالاسم أو الرقم الجامعي..." className="pr-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="المقرر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المقررات</SelectItem>
                    {allCourses.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card>
            <CardHeader><CardTitle>قائمة الطلاب ({filteredStudents.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الطالب</TableHead>
                    <TableHead className="text-center">المستوى</TableHead>
                    <TableHead className="text-center">المعدل التراكمي</TableHead>
                    <TableHead className="text-right">المقررات</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-indigo-100 text-indigo-700">{student.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-gray-500">{student.studentCode}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{student.level}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={student.gpa >= 3 ? "bg-green-100 text-green-700" : student.gpa >= 2 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                          {student.gpa.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap gap-1">
                          {student.courses.map((c) => (
                            <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="ghost"><Eye className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost"><MessageSquare className="w-4 h-4" /></Button>
                        </div>
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
