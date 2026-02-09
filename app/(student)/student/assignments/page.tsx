"use client"

import { useState } from "react"
import {
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Eye,
  Download,
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

// Assignments Data
const assignments = [
  {
    id: 1,
    title: "حل تمارين الباب الثالث",
    subject: "الرياضيات",
    teacher: "أ. محمد أحمد",
    dueDate: "2024-12-26",
    status: "pending",
    grade: null,
    maxGrade: 20,
  },
  {
    id: 2,
    title: "تقرير عن قوانين نيوتن",
    subject: "الفيزياء",
    teacher: "أ. أحمد علي",
    dueDate: "2024-12-27",
    status: "pending",
    grade: null,
    maxGrade: 20,
  },
  {
    id: 3,
    title: "إنشاء عن حب الوطن",
    subject: "اللغة العربية",
    teacher: "أ. سارة خالد",
    dueDate: "2024-12-28",
    status: "pending",
    grade: null,
    maxGrade: 20,
  },
  {
    id: 4,
    title: "حل تمارين التفاضل",
    subject: "الرياضيات",
    teacher: "أ. محمد أحمد",
    dueDate: "2024-12-20",
    status: "submitted",
    grade: 18,
    maxGrade: 20,
  },
  {
    id: 5,
    title: "تجربة معملية",
    subject: "الكيمياء",
    teacher: "أ. خالد سعيد",
    dueDate: "2024-12-18",
    status: "graded",
    grade: 17,
    maxGrade: 20,
  },
  {
    id: 6,
    title: "ترجمة نص",
    subject: "اللغة الإنجليزية",
    teacher: "أ. نورا محمد",
    dueDate: "2024-12-15",
    status: "late",
    grade: 12,
    maxGrade: 20,
  },
]

// Stats
const stats = {
  total: 28,
  pending: 3,
  submitted: 1,
  graded: 20,
  late: 4,
  averageGrade: 85,
}

const statusConfig = {
  pending: { label: "قيد الانتظار", color: "bg-orange-100 text-orange-700", icon: Clock },
  submitted: { label: "تم التسليم", color: "bg-blue-100 text-blue-700", icon: Upload },
  graded: { label: "تم التقييم", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  late: { label: "متأخر", color: "bg-red-100 text-red-700", icon: AlertCircle },
}

export default function StudentAssignmentsPage() {
  const [filter, setFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesStatus = filter === "all" || assignment.status === filter
    const matchesSubject = subjectFilter === "all" || assignment.subject === subjectFilter
    return matchesStatus && matchesSubject
  })

  const getDaysRemaining = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الواجبات</h1>
          <p className="text-muted-foreground">إدارة وتسليم الواجبات المدرسية</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">إجمالي الواجبات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">قيد الانتظار</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Upload className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
            <p className="text-sm text-muted-foreground">تم التسليم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.graded}</p>
            <p className="text-sm text-muted-foreground">تم التقييم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.late}</p>
            <p className="text-sm text-muted-foreground">متأخر</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="حالة الواجب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="submitted">تم التسليم</SelectItem>
                <SelectItem value="graded">تم التقييم</SelectItem>
                <SelectItem value="late">متأخر</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="المادة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المواد</SelectItem>
                <SelectItem value="الرياضيات">الرياضيات</SelectItem>
                <SelectItem value="الفيزياء">الفيزياء</SelectItem>
                <SelectItem value="الكيمياء">الكيمياء</SelectItem>
                <SelectItem value="اللغة العربية">اللغة العربية</SelectItem>
                <SelectItem value="اللغة الإنجليزية">اللغة الإنجليزية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.map((assignment) => {
          const status = statusConfig[assignment.status as keyof typeof statusConfig]
          const StatusIcon = status.icon
          const daysRemaining = getDaysRemaining(assignment.dueDate)
          const isUrgent = daysRemaining <= 2 && assignment.status === "pending"

          return (
            <Card key={assignment.id} className={cn(
              "hover:shadow-md transition-shadow",
              isUrgent && "border-red-200 bg-red-50/50 dark:bg-red-950/10"
            )}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      isUrgent ? "bg-red-100" : "bg-blue-100"
                    )}>
                      <FileText className={cn(
                        "w-6 h-6",
                        isUrgent ? "text-red-600" : "text-blue-600"
                      )} />
                    </div>
                    <div>
                      <h3 className="font-bold">{assignment.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {assignment.subject} • {assignment.teacher}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {status.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(assignment.dueDate).toLocaleDateString("ar-EG")}
                        </span>
                        {assignment.status === "pending" && (
                          <Badge variant={isUrgent ? "destructive" : "outline"}>
                            {daysRemaining <= 0 ? "منتهي" :
                             daysRemaining === 1 ? "غداً" :
                             `${daysRemaining} أيام`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {assignment.grade !== null && (
                      <div className="text-center">
                        <p className={cn(
                          "text-2xl font-bold",
                          (assignment.grade / assignment.maxGrade) >= 0.9 ? "text-green-600" :
                          (assignment.grade / assignment.maxGrade) >= 0.7 ? "text-blue-600" :
                          "text-red-600"
                        )}>
                          {assignment.grade}/{assignment.maxGrade}
                        </p>
                        <p className="text-xs text-muted-foreground">الدرجة</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {assignment.status === "pending" && (
                        <Button>
                          <Upload className="w-4 h-4 ml-2" />
                          تسليم
                        </Button>
                      )}
                      {assignment.status === "graded" && (
                        <Button variant="outline">
                          <Eye className="w-4 h-4 ml-2" />
                          عرض التقييم
                        </Button>
                      )}
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}



