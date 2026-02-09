"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Download, Eye, CheckCircle, AlertTriangle, Users, Award } from "lucide-react"

export default function ResultsPage() {
  const stats = [
    { label: "نسبة النجاح", value: "89%", icon: Award, color: "text-institute-blue" },
    { label: "ناجح", value: "1,940", icon: CheckCircle, color: "text-institute-blue" },
    { label: "راسب", value: "240", icon: AlertTriangle, color: "text-red-600" },
    { label: "إجمالي الطلاب", value: "2,180", icon: Users, color: "text-institute-gold" },
  ]

  const courseResults = [
    { code: "CS301", name: "الذكاء الاصطناعي", students: 85, passed: 78, failed: 7, avg: 72.5, passRate: 91.8 },
    { code: "MATH301", name: "رياضيات متقدمة", students: 120, passed: 95, failed: 25, avg: 65.2, passRate: 79.2 },
    { code: "BUS101", name: "مبادئ الإدارة", students: 95, passed: 88, failed: 7, avg: 75.8, passRate: 92.6 },
    { code: "ACC201", name: "المحاسبة المتوسطة", students: 80, passed: 72, failed: 8, avg: 68.4, passRate: 90.0 },
    { code: "ENG301", name: "اللغة الإنجليزية المتقدمة", students: 60, passed: 52, failed: 8, avg: 70.2, passRate: 86.7 },
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
                    <h4 className="font-medium">{course.name}</h4>
                    <Badge variant="outline">{course.code}</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-institute-blue">{course.passed}</p>
                      <p className="text-xs text-muted-foreground">ناجح</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">{course.failed}</p>
                      <p className="text-xs text-muted-foreground">راسب</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-institute-blue">{course.avg}</p>
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
