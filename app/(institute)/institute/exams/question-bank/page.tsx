"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BookOpen, Search, Plus, Filter, FolderOpen, FileText, CheckSquare, ListOrdered } from "lucide-react"

export default function QuestionBankPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const stats = [
    { label: "إجمالي الأسئلة", value: "2,450", icon: FileText, color: "text-institute-blue" },
    { label: "اختيار من متعدد", value: "1,200", icon: CheckSquare, color: "text-institute-blue" },
    { label: "مقالية", value: "850", icon: ListOrdered, color: "text-institute-gold" },
    { label: "المقررات", value: "48", icon: FolderOpen, color: "text-institute-gold" },
  ]

  const courses = [
    { code: "CS301", name: "الذكاء الاصطناعي", questions: 85, mcq: 50, essay: 35 },
    { code: "MATH301", name: "رياضيات متقدمة", questions: 120, mcq: 80, essay: 40 },
    { code: "BUS101", name: "مبادئ الإدارة", questions: 95, mcq: 60, essay: 35 },
    { code: "ACC201", name: "المحاسبة المتوسطة", questions: 110, mcq: 70, essay: 40 },
    { code: "ENG301", name: "اللغة الإنجليزية المتقدمة", questions: 150, mcq: 100, essay: 50 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-institute-blue" />
            بنك الأسئلة
          </h1>
          <p className="text-muted-foreground">إدارة الأسئلة الامتحانية</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          إضافة سؤال
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

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث في الأسئلة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 ml-2" />
              تصفية
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Courses */}
      <Card>
        <CardHeader>
          <CardTitle>الأسئلة حسب المقرر</CardTitle>
          <CardDescription>عدد الأسئلة المتاحة لكل مقرر</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courses.map((course, index) => (
              <motion.div
                key={course.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-institute-blue flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-institute-blue" />
                  </div>
                  <div>
                    <h4 className="font-medium">{course.name}</h4>
                    <Badge variant="outline">{course.code}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-institute-blue">{course.questions}</p>
                    <p className="text-xs text-muted-foreground">سؤال</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-institute-blue text-green-700">{course.mcq} MCQ</Badge>
                    <Badge className="bg-institute-gold text-purple-700">{course.essay} مقالي</Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
