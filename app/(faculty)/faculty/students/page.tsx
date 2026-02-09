"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Users, Search, Download, Filter, Eye, MessageSquare, FileText, BarChart, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const studentsData = [
  { id: "20240001", name: "أحمد محمد علي", course: "CS101", grade: 92, attendance: 95, assignments: 5, trend: "up" },
  { id: "20240002", name: "سارة أحمد حسن", course: "CS101", grade: 88, attendance: 90, assignments: 5, trend: "up" },
  { id: "20240003", name: "محمود عبدالله", course: "CS101", grade: 75, attendance: 85, assignments: 4, trend: "stable" },
  { id: "20240004", name: "فاطمة السيد", course: "CS101", grade: 55, attendance: 70, assignments: 3, trend: "down" },
  { id: "20240005", name: "عمر خالد", course: "CS201", grade: 82, attendance: 88, assignments: 4, trend: "up" },
  { id: "20240006", name: "نور محمد", course: "CS201", grade: 78, attendance: 92, assignments: 4, trend: "stable" },
]

export default function FacultyStudentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")

  const filteredStudents = studentsData.filter(s => 
    (selectedCourse === "all" || s.course === selectedCourse) &&
    s.name.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            طلابي
          </h1>
          <p className="text-gray-500 mt-1">متابعة أداء الطلاب في جميع المقررات</p>
        </div>
        <Button variant="outline"><Download className="w-4 h-4 ml-2" />تصدير</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الطلاب", value: studentsData.length, color: "indigo" },
          { label: "متوسط الدرجات", value: `${Math.round(studentsData.reduce((s, st) => s + st.grade, 0) / studentsData.length)}%`, color: "green" },
          { label: "متوسط الحضور", value: `${Math.round(studentsData.reduce((s, st) => s + st.attendance, 0) / studentsData.length)}%`, color: "blue" },
          { label: "طلاب يحتاجون متابعة", value: studentsData.filter(s => s.grade < 60).length, color: "red" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`border-r-4 border-r-${stat.color}-500`}>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
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
              <SelectTrigger className="w-48"><SelectValue placeholder="المقرر" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المقررات</SelectItem>
                <SelectItem value="CS101">CS101</SelectItem>
                <SelectItem value="CS201">CS201</SelectItem>
                <SelectItem value="CS301">CS301</SelectItem>
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
                <TableHead className="text-center">المقرر</TableHead>
                <TableHead className="text-center">الدرجة</TableHead>
                <TableHead className="text-center">الحضور</TableHead>
                <TableHead className="text-center">الواجبات</TableHead>
                <TableHead className="text-center">الاتجاه</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-indigo-100 text-indigo-700">
                          {student.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center"><Badge variant="outline">{student.course}</Badge></TableCell>
                  <TableCell className="text-center">
                    <Badge className={student.grade >= 80 ? "bg-green-100 text-green-700" : student.grade >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                      {student.grade}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-center">
                      <Progress value={student.attendance} className="w-16 h-2" />
                      <span className="text-xs">{student.attendance}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{student.assignments}/5</TableCell>
                  <TableCell className="text-center">
                    {student.trend === "up" ? (
                      <TrendingUp className="w-5 h-5 text-green-500 mx-auto" />
                    ) : student.trend === "down" ? (
                      <TrendingDown className="w-5 h-5 text-red-500 mx-auto" />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button size="icon" variant="ghost"><Eye className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost"><MessageSquare className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost"><FileText className="w-4 h-4" /></Button>
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
