"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BookOpen, Search, Plus, Filter, FolderOpen, FileText, CheckSquare, ListOrdered } from "lucide-react"

interface CourseRow {
  id: string
  code: string
  nameAr: string
  total: number
  mcq: number
  essay: number
  truefalse: number
}

interface ApiStats {
  totalQuestions: number
  courses: number
  mcq: number
  essay: number
}

export default function QuestionBankPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [allCourses, setAllCourses] = useState<CourseRow[]>([])
  const [apiStats, setApiStats] = useState<ApiStats>({ totalQuestions: 0, courses: 0, mcq: 0, essay: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/exams/question-bank`)
        if (!res.ok) throw new Error("فشل في جلب بنك الأسئلة")
        const json = await res.json()
        if (!cancelled) {
          setAllCourses(json.courses ?? [])
          setApiStats(json.stats ?? { totalQuestions: 0, courses: 0, mcq: 0, essay: 0 })
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const stats = [
    { label: "إجمالي الأسئلة", value: String(apiStats.totalQuestions), icon: FileText, color: "text-institute-blue" },
    { label: "اختيار من متعدد", value: String(apiStats.mcq), icon: CheckSquare, color: "text-institute-blue" },
    { label: "مقالية", value: String(apiStats.essay), icon: ListOrdered, color: "text-institute-gold" },
    { label: "المقررات", value: String(apiStats.courses), icon: FolderOpen, color: "text-institute-gold" },
  ]

  const courses = allCourses.filter((c) => !searchQuery || c.nameAr.includes(searchQuery))

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

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل بنك الأسئلة...</CardContent></Card>}

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
                key={course.id}
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
                    <h4 className="font-medium">{course.nameAr}</h4>
                    <Badge variant="outline">{course.code}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-institute-blue">{course.total}</p>
                    <p className="text-xs text-muted-foreground">سؤال</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-institute-blue text-green-700">{course.mcq} MCQ</Badge>
                    <Badge className="bg-institute-gold text-purple-700">{course.essay} مقالي</Badge>
                    <Badge variant="outline">{course.truefalse} ص/خ</Badge>
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
