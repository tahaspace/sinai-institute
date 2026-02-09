"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ClipboardCheck, Search, Upload, Download, Save, Users, BarChart, CheckCircle, Clock, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const gradesData = [
  { id: "20240001", name: "أحمد محمد علي", quiz1: 18, quiz2: 17, midterm: 28, assignments: 9, total: 72 },
  { id: "20240002", name: "سارة أحمد حسن", quiz1: 20, quiz2: 19, midterm: 30, assignments: 10, total: 79 },
  { id: "20240003", name: "محمود عبدالله", quiz1: 15, quiz2: 16, midterm: 25, assignments: 8, total: 64 },
  { id: "20240004", name: "فاطمة السيد", quiz1: 12, quiz2: 10, midterm: 20, assignments: 6, total: 48 },
  { id: "20240005", name: "عمر خالد", quiz1: 19, quiz2: 18, midterm: 27, assignments: 9, total: 73 },
]

const courseGradeStatus = [
  { course: "CS101", total: 45, graded: 45, status: "completed" },
  { course: "CS201", total: 35, graded: 20, status: "in_progress" },
  { course: "CS301", total: 25, graded: 0, status: "pending" },
  { course: "CS401", total: 15, graded: 15, status: "completed" },
]

export default function FacultyGradesPage() {
  const [selectedCourse, setSelectedCourse] = useState("CS101")
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-indigo-600" />
            الدرجات والتقييم
          </h1>
          <p className="text-gray-500 mt-1">رصد درجات الطلاب وإدارة التقييمات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Upload className="w-4 h-4 ml-2" />استيراد</Button>
          <Button variant="outline"><Download className="w-4 h-4 ml-2" />تصدير</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700"><Save className="w-4 h-4 ml-2" />حفظ</Button>
        </div>
      </div>

      {/* Course Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {courseGradeStatus.map((course, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`cursor-pointer transition-all ${selectedCourse === course.course ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'}`}
              onClick={() => setSelectedCourse(course.course)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{course.course}</Badge>
                  {course.status === "completed" ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : course.status === "in_progress" ? (
                    <Clock className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(course.graded / course.total) * 100} className="flex-1 h-2" />
                  <span className="text-xs font-medium">{course.graded}/{course.total}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">رصد الدرجات</TabsTrigger>
          <TabsTrigger value="assignments">الواجبات</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>رصد درجات - {selectedCourse}</CardTitle>
                  <CardDescription>أعمال السنة: 50 درجة | النهائي: 50 درجة</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="بحث بالاسم..." className="pr-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الطالب</TableHead>
                    <TableHead className="text-center">اختبار 1 (20)</TableHead>
                    <TableHead className="text-center">اختبار 2 (20)</TableHead>
                    <TableHead className="text-center">منتصف الفصل (30)</TableHead>
                    <TableHead className="text-center">الواجبات (10)</TableHead>
                    <TableHead className="text-center">المجموع (100)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradesData.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input type="number" className="w-16 h-8 text-center mx-auto" defaultValue={student.quiz1} max={20} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input type="number" className="w-16 h-8 text-center mx-auto" defaultValue={student.quiz2} max={20} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input type="number" className="w-16 h-8 text-center mx-auto" defaultValue={student.midterm} max={30} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input type="number" className="w-16 h-8 text-center mx-auto" defaultValue={student.assignments} max={10} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={student.total >= 60 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {student.total}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card><CardContent className="p-6 text-center text-gray-500"><FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />قائمة الواجبات والتصحيح</CardContent></Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card><CardContent className="p-6 text-center text-gray-500"><BarChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />تقارير تحليل الأداء</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
