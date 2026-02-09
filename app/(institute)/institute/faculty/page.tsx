"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import {
  GraduationCap,
  Search,
  Plus,
  Filter,
  Building2,
  BookOpen,
  Clock,
  Mail,
  Phone,
  ChevronLeft,
  Award,
  Calendar,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function FacultyPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [rankFilter, setRankFilter] = useState("all")

  const faculty = [
    {
      id: 1,
      name: "أ.د. أحمد محمد عبدالله",
      title: "أستاذ",
      department: "الهندسة",
      specialization: "هندسة الحاسبات",
      email: "ahmed.m@institute.edu.eg",
      phone: "01012345678",
      officeHours: "الأحد والثلاثاء 10-12",
      courses: 3,
      creditHours: 12,
      avatar: "",
    },
    {
      id: 2,
      name: "أ.د. سارة علي حسن",
      title: "أستاذ",
      department: "الحاسبات",
      specialization: "الذكاء الاصطناعي",
      email: "sara.a@institute.edu.eg",
      phone: "01023456789",
      officeHours: "الإثنين والأربعاء 11-1",
      courses: 2,
      creditHours: 9,
      avatar: "",
    },
    {
      id: 3,
      name: "د. محمد علي إبراهيم",
      title: "أستاذ مساعد",
      department: "إدارة الأعمال",
      specialization: "التسويق الرقمي",
      email: "mohamed.a@institute.edu.eg",
      phone: "01034567890",
      officeHours: "الثلاثاء والخميس 9-11",
      courses: 4,
      creditHours: 15,
      avatar: "",
    },
    {
      id: 4,
      name: "د. نورا محمود سعيد",
      title: "مدرس",
      department: "المحاسبة",
      specialization: "المحاسبة المالية",
      email: "nora.m@institute.edu.eg",
      phone: "01045678901",
      officeHours: "الأحد والإثنين 12-2",
      courses: 3,
      creditHours: 12,
      avatar: "",
    },
    {
      id: 5,
      name: "م. يوسف أحمد حسين",
      title: "معيد",
      department: "الهندسة",
      specialization: "هندسة الاتصالات",
      email: "youssef.a@institute.edu.eg",
      phone: "01056789012",
      officeHours: "الثلاثاء 10-12",
      courses: 2,
      creditHours: 6,
      avatar: "",
    },
  ]

  const stats = [
    { label: "إجمالي أعضاء هيئة التدريس", value: "124", icon: GraduationCap, color: "text-institute-gold" },
    { label: "أستاذ", value: "28", icon: Award, color: "text-institute-blue" },
    { label: "أستاذ مساعد", value: "42", icon: Award, color: "text-institute-blue" },
    { label: "مدرس ومعيد", value: "54", icon: BookOpen, color: "text-institute-gold" },
  ]

  const getTitleBadge = (title: string) => {
    switch (title) {
      case "أستاذ":
        return <Badge className="bg-institute-gold text-purple-700">أستاذ</Badge>
      case "أستاذ مساعد":
        return <Badge className="bg-institute-blue text-blue-700">أستاذ مساعد</Badge>
      case "مدرس":
        return <Badge className="bg-institute-blue text-green-700">مدرس</Badge>
      case "معيد":
        return <Badge className="bg-institute-gold text-orange-700">معيد</Badge>
      default:
        return <Badge variant="secondary">{title}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-institute-blue" />
            هيئة التدريس
          </h1>
          <p className="text-muted-foreground">
            إدارة أعضاء هيئة التدريس والهيئة المعاونة
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          إضافة عضو جديد
        </Button>
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
                placeholder="بحث بالاسم أو التخصص..."
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
            <Select value={rankFilter} onValueChange={setRankFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Award className="w-4 h-4 ml-2" />
                <SelectValue placeholder="الدرجة العلمية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الدرجات</SelectItem>
                <SelectItem value="professor">أستاذ</SelectItem>
                <SelectItem value="associate">أستاذ مساعد</SelectItem>
                <SelectItem value="lecturer">مدرس</SelectItem>
                <SelectItem value="assistant">معيد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Faculty Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {faculty.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-institute-blue text-institute-blue text-xl">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold">{member.name}</h3>
                        {getTitleBadge(member.title)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{member.specialization}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>{member.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{member.officeHours}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-institute-blue">{member.courses}</p>
                    <p className="text-xs text-muted-foreground">مقررات</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-institute-blue">{member.creditHours}</p>
                    <p className="text-xs text-muted-foreground">ساعة</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href={`/institute/faculty/${member.id}`}>
                    عرض الملف الكامل
                    <ChevronLeft className="w-4 h-4 mr-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/faculty/workload">
            <div className="text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-institute-blue" />
              <span>العبء التدريسي</span>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/faculty/schedules">
            <div className="text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-institute-blue" />
              <span>الجداول الدراسية</span>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/institute/faculty/office-hours">
            <div className="text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-institute-gold" />
              <span>الساعات المكتبية</span>
            </div>
          </Link>
        </Button>
      </div>
    </div>
  )
}
