"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import {
  Users,
  Search,
  Plus,
  Filter,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Mail,
  GraduationCap,
  Building2,
  Clock,
  Award,
} from "lucide-react"

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")

  const students = [
    {
      id: "STU2024001",
      name: "أحمد محمد علي",
      email: "ahmed.m@institute.edu.eg",
      department: "الهندسة",
      program: "هندسة الحاسبات",
      level: "الثالثة",
      gpa: 3.45,
      creditHours: 96,
      status: "منتظم",
      avatar: "",
    },
    {
      id: "STU2024002",
      name: "سارة أحمد حسن",
      email: "sara.a@institute.edu.eg",
      department: "الحاسبات",
      program: "علوم الحاسب",
      level: "الرابعة",
      gpa: 3.82,
      creditHours: 128,
      status: "منتظم",
      avatar: "",
    },
    {
      id: "STU2024003",
      name: "محمد علي إبراهيم",
      email: "mohamed.a@institute.edu.eg",
      department: "إدارة الأعمال",
      program: "إدارة الأعمال",
      level: "الثانية",
      gpa: 2.15,
      creditHours: 58,
      status: "إنذار أول",
      avatar: "",
    },
    {
      id: "STU2024004",
      name: "نور محمود سعيد",
      email: "nour.m@institute.edu.eg",
      department: "المحاسبة",
      program: "المحاسبة",
      level: "الأولى",
      gpa: 3.12,
      creditHours: 32,
      status: "منتظم",
      avatar: "",
    },
    {
      id: "STU2024005",
      name: "يوسف أحمد محمد",
      email: "youssef.a@institute.edu.eg",
      department: "السياحة",
      program: "إدارة الفنادق",
      level: "الثالثة",
      gpa: 1.85,
      creditHours: 89,
      status: "إنذار ثاني",
      avatar: "",
    },
  ]

  const stats = [
    { label: "إجمالي الطلاب", value: "2,548", icon: Users, color: "text-institute-blue" },
    { label: "طلاب جدد", value: "485", icon: Plus, color: "text-institute-blue" },
    { label: "متوسط GPA", value: "2.85", icon: Award, color: "text-institute-gold" },
    { label: "نسبة الحضور", value: "87%", icon: Clock, color: "text-institute-gold" },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "منتظم":
        return <Badge className="bg-institute-blue text-green-700">منتظم</Badge>
      case "إنذار أول":
        return <Badge className="bg-yellow-100 text-yellow-700">إنذار أول</Badge>
      case "إنذار ثاني":
        return <Badge className="bg-red-100 text-red-700">إنذار ثاني</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.5) return "text-institute-blue"
    if (gpa >= 2.5) return "text-institute-blue"
    if (gpa >= 2.0) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-institute-blue" />
            شؤون الطلاب
          </h1>
          <p className="text-muted-foreground">
            إدارة بيانات الطلاب والمتابعة الأكاديمية
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button asChild>
            <Link href="/institute/admission">
              <Plus className="w-4 h-4 ml-2" />
              قبول طالب جديد
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الرقم الأكاديمي..."
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
                <SelectItem value="accounting">المحاسبة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full md:w-48">
                <GraduationCap className="w-4 h-4 ml-2" />
                <SelectValue placeholder="المستوى" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستويات</SelectItem>
                <SelectItem value="1">الأولى</SelectItem>
                <SelectItem value="2">الثانية</SelectItem>
                <SelectItem value="3">الثالثة</SelectItem>
                <SelectItem value="4">الرابعة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلاب</CardTitle>
          <CardDescription>إجمالي {students.length} طالب</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>القسم / البرنامج</TableHead>
                <TableHead>المستوى</TableHead>
                <TableHead>الساعات</TableHead>
                <TableHead>المعدل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={student.avatar} />
                        <AvatarFallback className="bg-institute-blue text-institute-blue">
                          {student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{student.department}</p>
                      <p className="text-sm text-muted-foreground">{student.program}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.level}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{student.creditHours}</span>
                    <span className="text-muted-foreground text-sm"> ساعة</span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${getGPAColor(student.gpa)}`}>
                      {student.gpa.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(student.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/institute/students/${student.id}`}>
                            <Eye className="w-4 h-4 ml-2" />
                            عرض الملف
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 ml-2" />
                          تعديل البيانات
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="w-4 h-4 ml-2" />
                          إرسال رسالة
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/students/advising">
            <div className="text-center">
              <GraduationCap className="w-6 h-6 mx-auto mb-2 text-institute-blue" />
              <span>الإرشاد الأكاديمي</span>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/students/warnings">
            <div className="text-center">
              <Award className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <span>الإنذارات الأكاديمية</span>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/students/graduation">
            <div className="text-center">
              <Award className="w-6 h-6 mx-auto mb-2 text-institute-gold" />
              <span>طلبات التخرج</span>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/students/attendance">
            <div className="text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-institute-blue" />
              <span>الحضور والغياب</span>
            </div>
          </Link>
        </Button>
      </div>
    </div>
  )
}
