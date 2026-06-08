"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Download, Eye, CheckCircle, Award } from "lucide-react"

interface CourseResult {
  course: string
  code: string
  enrolled: number
  graded: number
  passed: number
  passRate: number
  avgGrade: number
}

interface ResultsStats {
  totalCourses: number
  avgPassRate: number
  publishedCourses: number
}

export default function ResultsPage() {
  const [courseResults, setCourseResults] = useState<CourseResult[]>([])
  const [apiStats, setApiStats] = useState<ResultsStats>({ totalCourses: 0, avgPassRate: 0, publishedCourses: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/exams/results`)
        if (!res.ok) throw new Error("فشل في جلب النتائج")
        const json = await res.json()
        if (!cancelled) {
          setCourseResults(json.courseResults ?? [])
          setApiStats(json.stats ?? { totalCourses: 0, avgPassRate: 0, publishedCourses: 0 })
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
    { label: "إجمالي المقررات", value: String(apiStats.totalCourses), icon: BarChart3, color: "text-institute-blue" },
    { label: "متوسط نسبة النجاح", value: `${apiStats.avgPassRate}%`, icon: Award, color: "text-institute-blue" },
    { label: "المقررات المعلنة", value: String(apiStats.publishedCourses), icon: CheckCircle, color: "text-institute-gold" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-institute-blue" />
            النتائج
          </h1>
          <p className="text-muted-foreground">نتائج الفصل الدراسي الأول 2024/2025</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير النتائج
          </Button>
          <Button>
            إعلان النتائج
          </Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل النتائج...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

      {/* Results by Course */}
      <Card>
        <CardHeader>
          <CardTitle>النتائج حسب المقرر</CardTitle>
          <CardDescription>إحصائيات النجاح والرسوب لكل مقرر</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courseResults.map((course, index) => (
              <motion.div
                key={course.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg border"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{course.course}</h4>
                    <Badge variant="outline">{course.code}</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-institute-blue">{course.passed}</p>
                      <p className="text-xs text-muted-foreground">ناجح</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">{course.enrolled - course.passed}</p>
                      <p className="text-xs text-muted-foreground">راسب</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-institute-blue">{course.avgGrade}%</p>
                      <p className="text-xs text-muted-foreground">المتوسط</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={course.passRate} 
                    className={`h-2 flex-1 ${course.passRate < 80 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-institute-blue"}`}
                  />
                  <span className={`text-sm font-bold ${course.passRate < 80 ? "text-yellow-600" : "text-institute-blue"}`}>
                    {course.passRate}%
                  </span>
                  <Button variant="ghost" size="icon">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
