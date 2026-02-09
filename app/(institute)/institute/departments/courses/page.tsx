"use client"

import { useState } from "react"
import { motion } from "framer-motion"
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
import { BookOpen, Search, Plus, Filter, Download, Building2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")

  const courses = [
    { code: "MATH101", name: "الرياضيات (1)", department: "الهندسة", creditHours: 3, theoretical: 2, practical: 2, prerequisite: "-" },
    { code: "CS101", name: "مقدمة في البرمجة", department: "الحاسبات", creditHours: 3, theoretical: 2, practical: 2, prerequisite: "-" },
    { code: "CS201", name: "هياكل البيانات", department: "الحاسبات", creditHours: 3, theoretical: 2, practical: 2, prerequisite: "CS101" },
    { code: "BUS101", name: "مبادئ الإدارة", department: "إدارة الأعمال", creditHours: 3, theoretical: 3, practical: 0, prerequisite: "-" },
    { code: "ACC101", name: "مبادئ المحاسبة", department: "المحاسبة", creditHours: 3, theoretical: 2, practical: 2, prerequisite: "-" },
    { code: "ENG101", name: "اللغة الإنجليزية", department: "اللغات", creditHours: 2, theoretical: 2, practical: 0, prerequisite: "-" },
    { code: "MATH201", name: "الرياضيات (2)", department: "الهندسة", creditHours: 3, theoretical: 3, practical: 0, prerequisite: "MATH101" },
    { code: "PHYS101", name: "الفيزياء", department: "الهندسة", creditHours: 3, theoretical: 2, practical: 2, prerequisite: "-" },
  ]

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
          <CardDescription>إجمالي {courses.length} مقرر</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>كود المقرر</TableHead>
                <TableHead>اسم المقرر</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>الساعات</TableHead>
                <TableHead>نظري</TableHead>
                <TableHead>عملي</TableHead>
                <TableHead>المتطلب السابق</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.code}>
                  <TableCell className="font-mono font-bold">{course.code}</TableCell>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{course.department}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-institute-blue text-institute-blue">{course.creditHours}</Badge>
                  </TableCell>
                  <TableCell>{course.theoretical}</TableCell>
                  <TableCell>{course.practical}</TableCell>
                  <TableCell className="text-muted-foreground">{course.prerequisite}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
