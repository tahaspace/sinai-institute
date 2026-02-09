"use client"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClipboardList, Save, Upload, Download, Search } from "lucide-react"

export default function GradesPage() {
  const [selectedCourse, setSelectedCourse] = useState("")

  const students = [
    { id: "STU001", name: "أحمد محمد", midterm: 28, practical: 18, final: null, total: null },
    { id: "STU002", name: "سارة علي", midterm: 25, practical: 20, final: null, total: null },
    { id: "STU003", name: "محمد حسن", midterm: 22, practical: 15, final: null, total: null },
    { id: "STU004", name: "نور سعيد", midterm: 30, practical: 19, final: null, total: null },
    { id: "STU005", name: "يوسف أحمد", midterm: 18, practical: 16, final: null, total: null },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-institute-blue" />
            إدخال الدرجات
          </h1>
          <p className="text-muted-foreground">رصد درجات الطلاب</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 ml-2" />
            استيراد
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button>
            <Save className="w-4 h-4 ml-2" />
            حفظ
          </Button>
        </div>
      </div>

      {/* Course Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="اختر المقرر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CS301">CS301 - الذكاء الاصطناعي</SelectItem>
                <SelectItem value="MATH301">MATH301 - رياضيات متقدمة</SelectItem>
                <SelectItem value="BUS101">BUS101 - مبادئ الإدارة</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث عن طالب..." className="pr-10" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle>درجات الطلاب</CardTitle>
          <CardDescription>
            CS301 - الذكاء الاصطناعي | أعمال فصل: 30 | عملي: 20 | نهائي: 50
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطالب</TableHead>
                <TableHead>اسم الطالب</TableHead>
                <TableHead className="text-center">أعمال فصل (30)</TableHead>
                <TableHead className="text-center">عملي (20)</TableHead>
                <TableHead className="text-center">نهائي (50)</TableHead>
                <TableHead className="text-center">المجموع (100)</TableHead>
                <TableHead className="text-center">التقدير</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono">{student.id}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={student.midterm}
                      className="w-20 text-center mx-auto"
                      max={30}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={student.practical}
                      className="w-20 text-center mx-auto"
                      max={20}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="-"
                      className="w-20 text-center mx-auto"
                      max={50}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">-</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">-</Badge>
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
