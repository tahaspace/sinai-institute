"use client"

import { useState } from "react"
import {
  GraduationCap,
  Download,
  TrendingUp,
  TrendingDown,
  Award,
  FileText,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Grades Data
const subjectGrades = [
  { subject: "الرياضيات", midterm: 48, final: 92, practical: 28, homework: 18, total: 186, max: 200, trend: "up" },
  { subject: "الفيزياء", midterm: 45, final: 88, practical: 27, homework: 17, total: 177, max: 200, trend: "up" },
  { subject: "الكيمياء", midterm: 42, final: 85, practical: 26, homework: 16, total: 169, max: 200, trend: "down" },
  { subject: "الأحياء", midterm: 46, final: 90, practical: 28, homework: 18, total: 182, max: 200, trend: "up" },
  { subject: "اللغة العربية", midterm: 44, final: 87, practical: 0, homework: 18, total: 149, max: 160, trend: "same" },
  { subject: "اللغة الإنجليزية", midterm: 47, final: 91, practical: 0, homework: 19, total: 157, max: 170, trend: "up" },
]

// Exam Results
const examResults = [
  { id: 1, exam: "اختبار منتصف الفصل", date: "2024-11-15", subjects: 6, average: 92 },
  { id: 2, exam: "اختبار نهاية الفصل", date: "2024-12-20", subjects: 6, average: 88 },
]

// Stats
const stats = {
  gpa: 3.85,
  rank: 5,
  totalStudents: 120,
  totalGrade: 1020,
  maxGrade: 1130,
}

const getGradeColor = (percentage: number) => {
  if (percentage >= 90) return "text-green-600"
  if (percentage >= 75) return "text-blue-600"
  if (percentage >= 60) return "text-yellow-600"
  return "text-red-600"
}

const getGradeLabel = (percentage: number) => {
  if (percentage >= 90) return "ممتاز"
  if (percentage >= 80) return "جيد جداً"
  if (percentage >= 70) return "جيد"
  if (percentage >= 60) return "مقبول"
  return "ضعيف"
}

export default function StudentGradesPage() {
  const [semester, setSemester] = useState("first")

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الدرجات والنتائج</h1>
          <p className="text-muted-foreground">عرض درجاتك ونتائج الاختبارات</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first">الفصل الأول</SelectItem>
              <SelectItem value="second">الفصل الثاني</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تحميل التقرير
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <GraduationCap className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-blue-600">{stats.gpa}</p>
            <p className="text-sm text-muted-foreground">المعدل التراكمي</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{stats.rank}</p>
            <p className="text-sm text-muted-foreground">الترتيب من {stats.totalStudents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">
              {stats.totalGrade}/{stats.maxGrade}
            </p>
            <p className="text-sm text-muted-foreground">المجموع الكلي</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-teal-500 mb-2" />
            <p className="text-2xl font-bold text-teal-600">
              {((stats.totalGrade / stats.maxGrade) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">النسبة المئوية</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="subjects">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="subjects">درجات المواد</TabsTrigger>
          <TabsTrigger value="exams">نتائج الاختبارات</TabsTrigger>
          <TabsTrigger value="certificates">الشهادات</TabsTrigger>
        </TabsList>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>درجات المواد الدراسية</CardTitle>
              <CardDescription>تفاصيل الدرجات لكل مادة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-right font-medium">المادة</th>
                      <th className="p-3 text-center font-medium">نصف العام</th>
                      <th className="p-3 text-center font-medium">نهاية العام</th>
                      <th className="p-3 text-center font-medium">عملي</th>
                      <th className="p-3 text-center font-medium">أعمال سنة</th>
                      <th className="p-3 text-center font-medium">المجموع</th>
                      <th className="p-3 text-center font-medium">التقدير</th>
                      <th className="p-3 text-center font-medium">الاتجاه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectGrades.map((grade) => {
                      const percentage = (grade.total / grade.max) * 100
                      
                      return (
                        <tr key={grade.subject} className="border-b">
                          <td className="p-3 font-medium">{grade.subject}</td>
                          <td className="p-3 text-center">{grade.midterm}/50</td>
                          <td className="p-3 text-center">{grade.final}/100</td>
                          <td className="p-3 text-center">
                            {grade.practical > 0 ? `${grade.practical}/30` : "-"}
                          </td>
                          <td className="p-3 text-center">{grade.homework}/20</td>
                          <td className="p-3 text-center font-bold">
                            <span className={getGradeColor(percentage)}>
                              {grade.total}/{grade.max}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={cn(
                              percentage >= 90 ? "bg-green-100 text-green-700" :
                              percentage >= 75 ? "bg-blue-100 text-blue-700" :
                              percentage >= 60 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            )}>
                              {getGradeLabel(percentage)}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            {grade.trend === "up" && (
                              <TrendingUp className="w-5 h-5 text-green-500 mx-auto" />
                            )}
                            {grade.trend === "down" && (
                              <TrendingDown className="w-5 h-5 text-red-500 mx-auto" />
                            )}
                            {grade.trend === "same" && (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exams Tab */}
        <TabsContent value="exams" className="mt-6">
          <div className="space-y-4">
            {examResults.map((exam) => (
              <Card key={exam.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold">{exam.exam}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(exam.date).toLocaleDateString("ar-EG")} • {exam.subjects} مواد
                      </p>
                    </div>
                    <div className="text-center">
                      <p className={cn(
                        "text-3xl font-bold",
                        getGradeColor(exam.average)
                      )}>
                        {exam.average}%
                      </p>
                      <Badge className={cn(
                        exam.average >= 90 ? "bg-green-100 text-green-700" :
                        exam.average >= 75 ? "bg-blue-100 text-blue-700" :
                        "bg-yellow-100 text-yellow-700"
                      )}>
                        {getGradeLabel(exam.average)}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={exam.average} className="h-3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>الشهادات</CardTitle>
              <CardDescription>تحميل الشهادات والنتائج</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Award className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">شهادات متاحة للتحميل</h3>
                <p className="text-muted-foreground mb-4">
                  يمكنك تحميل شهادات نتائج الفصل الدراسي
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Button variant="outline">
                    <Download className="w-4 h-4 ml-2" />
                    شهادة نصف العام
                  </Button>
                  <Button>
                    <Download className="w-4 h-4 ml-2" />
                    شهادة نهاية العام
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



