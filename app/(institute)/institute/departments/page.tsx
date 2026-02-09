"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Search,
  Plus,
  ChevronLeft,
  Settings,
  BarChart3,
  Award,
} from "lucide-react"

export default function DepartmentsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const departments = [
    {
      id: 1,
      name: "قسم الهندسة",
      nameEn: "Engineering",
      description: "هندسة الحاسبات والاتصالات والإلكترونيات",
      students: 520,
      faculty: 25,
      courses: 42,
      programs: ["هندسة الحاسبات", "هندسة الاتصالات", "هندسة الإلكترونيات"],
      head: "د. أحمد محمد",
      color: "from-institute-blue to-blue-600",
      icon: "🔧",
    },
    {
      id: 2,
      name: "قسم الحاسبات والمعلومات",
      nameEn: "Computer Science",
      description: "علوم الحاسب ونظم المعلومات",
      students: 480,
      faculty: 22,
      courses: 38,
      programs: ["علوم الحاسب", "نظم المعلومات", "الذكاء الاصطناعي"],
      head: "د. محمد علي",
      color: "from-institute-gold to-yellow-600",
      icon: "💻",
    },
    {
      id: 3,
      name: "قسم إدارة الأعمال",
      nameEn: "Business Administration",
      description: "إدارة الأعمال والتسويق والموارد البشرية",
      students: 420,
      faculty: 18,
      courses: 35,
      programs: ["إدارة الأعمال", "التسويق", "الموارد البشرية"],
      head: "د. سارة أحمد",
      color: "from-institute-blue to-blue-600",
      icon: "📊",
    },
    {
      id: 4,
      name: "قسم المحاسبة",
      nameEn: "Accounting",
      description: "المحاسبة والمراجعة والتمويل",
      students: 380,
      faculty: 16,
      courses: 32,
      programs: ["المحاسبة", "المراجعة", "التمويل والاستثمار"],
      head: "د. محمود حسن",
      color: "from-institute-gold to-yellow-600",
      icon: "📈",
    },
    {
      id: 5,
      name: "قسم السياحة والفنادق",
      nameEn: "Tourism & Hotels",
      description: "السياحة وإدارة الفنادق والإرشاد",
      students: 250,
      faculty: 12,
      courses: 28,
      programs: ["السياحة", "إدارة الفنادق", "الإرشاد السياحي"],
      head: "د. نورا علي",
      color: "from-institute-blue to-blue-600",
      icon: "✈️",
    },
    {
      id: 6,
      name: "قسم الإعلام",
      nameEn: "Media",
      description: "الصحافة والإذاعة والتلفزيون والعلاقات العامة",
      students: 220,
      faculty: 14,
      courses: 30,
      programs: ["الصحافة", "الإذاعة والتلفزيون", "العلاقات العامة"],
      head: "د. هدى سالم",
      color: "to-blue-600 to-blue-600",
      icon: "📺",
    },
    {
      id: 7,
      name: "قسم اللغات والترجمة",
      nameEn: "Languages & Translation",
      description: "اللغة الإنجليزية والترجمة",
      students: 180,
      faculty: 10,
      courses: 25,
      programs: ["اللغة الإنجليزية", "الترجمة التحريرية", "الترجمة الفورية"],
      head: "د. منى حسين",
      color: "from-institute-gold to-yellow-600",
      icon: "🌍",
    },
    {
      id: 8,
      name: "قسم الخدمة الاجتماعية",
      nameEn: "Social Work",
      description: "الخدمة الاجتماعية والتنمية المجتمعية",
      students: 98,
      faculty: 7,
      courses: 22,
      programs: ["الخدمة الاجتماعية", "التنمية المجتمعية"],
      head: "د. فاطمة محمد",
      color: "from-institute-blue to-blue-600",
      icon: "🤝",
    },
  ]

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.includes(searchQuery) ||
      dept.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description.includes(searchQuery)
  )

  const totalStudents = departments.reduce((acc, dept) => acc + dept.students, 0)
  const totalFaculty = departments.reduce((acc, dept) => acc + dept.faculty, 0)
  const totalCourses = departments.reduce((acc, dept) => acc + dept.courses, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-7 h-7 text-institute-blue" />
            الأقسام العلمية
          </h1>
          <p className="text-muted-foreground">
            إدارة الأقسام العلمية والبرامج الأكاديمية
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          إضافة قسم جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "الأقسام العلمية", value: departments.length, icon: Building2, color: "text-institute-blue" },
          { label: "إجمالي الطلاب", value: totalStudents.toLocaleString(), icon: Users, color: "text-institute-blue" },
          { label: "أعضاء هيئة التدريس", value: totalFaculty, icon: GraduationCap, color: "text-institute-gold" },
          { label: "المقررات الدراسية", value: totalCourses, icon: BookOpen, color: "text-institute-gold" },
        ].map((stat, index) => (
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث عن قسم..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Departments Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDepartments.map((dept, index) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${dept.color} flex items-center justify-center text-2xl`}>
                    {dept.icon}
                  </div>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="mt-4">{dept.name}</CardTitle>
                <CardDescription>{dept.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{dept.students}</p>
                    <p className="text-xs text-muted-foreground">طالب</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{dept.faculty}</p>
                    <p className="text-xs text-muted-foreground">عضو</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{dept.courses}</p>
                    <p className="text-xs text-muted-foreground">مقرر</p>
                  </div>
                </div>

                {/* Programs */}
                <div>
                  <p className="text-sm font-medium mb-2">البرامج:</p>
                  <div className="flex flex-wrap gap-1">
                    {dept.programs.map((program, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {program}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Head */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">رئيس القسم:</span>
                  </div>
                  <span className="text-sm font-medium">{dept.head}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/institute/departments/${dept.id}`}>
                      عرض التفاصيل
                      <ChevronLeft className="w-4 h-4 mr-2" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon">
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
