"use client"

import { useState } from "react"
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Download,
  Upload,
  Filter,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// Assignments
const assignments = [
  {
    id: 1,
    title: "حل تمارين الباب الثالث",
    class: "3/1",
    subject: "الرياضيات",
    dueDate: "2024-12-26",
    maxGrade: 20,
    submissions: 28,
    total: 35,
    graded: 20,
    status: "active",
    attachments: 2,
  },
  {
    id: 2,
    title: "تقرير عن قوانين نيوتن",
    class: "3/2",
    subject: "الفيزياء",
    dueDate: "2024-12-27",
    maxGrade: 20,
    submissions: 18,
    total: 32,
    graded: 10,
    status: "active",
    attachments: 1,
  },
  {
    id: 3,
    title: "اختبار قصير - التفاضل",
    class: "2/1",
    subject: "الرياضيات",
    dueDate: "2024-12-20",
    maxGrade: 20,
    submissions: 30,
    total: 30,
    graded: 30,
    status: "completed",
    attachments: 0,
  },
]

// Submissions for grading
const submissions = [
  { id: 1, student: "أحمد محمد علي", submittedAt: "2024-12-24 14:30", status: "pending", file: "homework.pdf" },
  { id: 2, student: "سارة خالد أحمد", submittedAt: "2024-12-24 15:45", status: "graded", grade: 18, file: "assignment.pdf" },
  { id: 3, student: "محمد سعيد حسن", submittedAt: "2024-12-25 09:20", status: "pending", file: "math_hw.pdf" },
  { id: 4, student: "فاطمة علي محمود", submittedAt: "2024-12-25 10:15", status: "graded", grade: 17, file: "my_work.pdf" },
  { id: 5, student: "علي أحمد محمد", submittedAt: "2024-12-25 11:00", status: "late", file: "late_submission.pdf" },
]

// Stats
const stats = {
  total: 24,
  active: 5,
  completed: 19,
  pendingGrading: 45,
  avgGrade: 85,
}

const statusConfig = {
  pending: { label: "في انتظار التصحيح", color: "bg-yellow-100 text-yellow-700" },
  graded: { label: "تم التصحيح", color: "bg-green-100 text-green-700" },
  late: { label: "متأخر", color: "bg-red-100 text-red-700" },
}

export default function AssignmentsPage() {
  const [showNewForm, setShowNewForm] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الواجبات</h1>
          <p className="text-muted-foreground">إنشاء وتصحيح الواجبات</p>
        </div>
        <Button className="bg-violet-500 hover:bg-violet-600" onClick={() => setShowNewForm(!showNewForm)}>
          <Plus className="w-4 h-4 ml-2" />
          إنشاء واجب جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 mx-auto text-violet-500 mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">إجمالي الواجبات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-orange-600">{stats.active}</p>
            <p className="text-sm text-muted-foreground">نشط</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">مكتمل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.pendingGrading}</p>
            <p className="text-sm text-muted-foreground">ينتظر التصحيح</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-blue-600">{stats.avgGrade}%</p>
            <p className="text-sm text-muted-foreground">متوسط الدرجات</p>
          </CardContent>
        </Card>
      </div>

      {/* New Assignment Form */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle>إنشاء واجب جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>عنوان الواجب</Label>
                <Input placeholder="مثال: حل تمارين الباب الثالث" />
              </div>
              <div className="space-y-2">
                <Label>المادة</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="math">الرياضيات</SelectItem>
                    <SelectItem value="physics">الفيزياء</SelectItem>
                    <SelectItem value="chemistry">الكيمياء</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الفصل</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفصل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3/1">3/1</SelectItem>
                    <SelectItem value="3/2">3/2</SelectItem>
                    <SelectItem value="3/3">3/3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>موعد التسليم</Label>
                <Input type="datetime-local" />
              </div>
              <div className="space-y-2">
                <Label>الدرجة الكاملة</Label>
                <Input type="number" defaultValue="20" />
              </div>
              <div className="space-y-2">
                <Label>السماح بالتسليم المتأخر</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">نعم</SelectItem>
                    <SelectItem value="no">لا</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>التعليمات</Label>
                <Textarea placeholder="تعليمات الواجب للطلاب..." rows={4} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>المرفقات</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm">اسحب الملفات هنا أو اضغط للتحميل</p>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Button className="bg-violet-500 hover:bg-violet-600">إنشاء الواجب</Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>إلغاء</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="assignments">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="assignments">الواجبات</TabsTrigger>
          <TabsTrigger value="grading">التصحيح</TabsTrigger>
        </TabsList>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="mt-6">
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const submissionProgress = (assignment.submissions / assignment.total) * 100
              const gradingProgress = (assignment.graded / assignment.submissions) * 100

              return (
                <Card key={assignment.id} className={cn(
                  assignment.status === "completed" && "opacity-75"
                )}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          assignment.status === "active" ? "bg-orange-100" : "bg-green-100"
                        )}>
                          <FileText className={cn(
                            "w-6 h-6",
                            assignment.status === "active" ? "text-orange-600" : "text-green-600"
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold">{assignment.title}</h3>
                            <Badge variant={assignment.status === "active" ? "default" : "secondary"}>
                              {assignment.status === "active" ? "نشط" : "مكتمل"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {assignment.subject} • الفصل {assignment.class} • موعد التسليم: {new Date(assignment.dueDate).toLocaleDateString("ar-EG")}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {assignment.submissions}/{assignment.total} تسليم
                            </span>
                            <span className="text-sm flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              {assignment.graded} مُصحح
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedAssignment(assignment.id)}>
                          <Eye className="w-4 h-4 ml-2" />
                          التفاصيل
                        </Button>
                        {assignment.status === "active" && (
                          <Button size="sm" className="bg-violet-500 hover:bg-violet-600">
                            التصحيح
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 ml-2" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 ml-2" />
                              تصدير الدرجات
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">نسبة التسليم</p>
                        <Progress value={submissionProgress} className="h-2" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">نسبة التصحيح</p>
                        <Progress value={gradingProgress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Grading Tab */}
        <TabsContent value="grading" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>التسليمات المعلقة</CardTitle>
                <Select defaultValue="all">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الواجبات</SelectItem>
                    <SelectItem value="1">حل تمارين الباب الثالث</SelectItem>
                    <SelectItem value="2">تقرير عن قوانين نيوتن</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submissions.map((submission) => {
                  const config = statusConfig[submission.status as keyof typeof statusConfig]

                  return (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback className="bg-violet-100 text-violet-600">
                            {submission.student.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{submission.student}</p>
                          <p className="text-sm text-muted-foreground">
                            {submission.submittedAt} • {submission.file}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {submission.status === "graded" ? (
                          <span className="font-bold text-green-600">{submission.grade}/20</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input type="number" placeholder="الدرجة" className="w-20" max={20} />
                            <span className="text-muted-foreground">/20</span>
                          </div>
                        )}
                        <Badge className={config.color}>{config.label}</Badge>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 ml-2" />
                          تحميل
                        </Button>
                        {submission.status !== "graded" && (
                          <Button size="sm" className="bg-violet-500 hover:bg-violet-600">
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            تصحيح
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



