"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BookOpen, Clock, Users, Download, BarChart3 } from "lucide-react"

export default function WorkloadPage() {
  const workloadStats = [
    { label: "إجمالي الساعات", value: "1,240", icon: Clock, color: "text-institute-blue" },
    { label: "متوسط العبء", value: "10", icon: BookOpen, color: "text-institute-blue" },
    { label: "أعضاء متفرغين", value: "85", icon: Users, color: "text-institute-gold" },
    { label: "نسبة التغطية", value: "94%", icon: BarChart3, color: "text-institute-gold" },
  ]

  const facultyWorkload = [
    { name: "أ.د. أحمد محمد", title: "أستاذ", courses: 2, creditHours: 9, maxHours: 12, department: "الهندسة" },
    { name: "أ.د. سارة علي", title: "أستاذ", courses: 2, creditHours: 6, maxHours: 12, department: "الحاسبات" },
    { name: "د. محمد حسن", title: "أستاذ مساعد", courses: 3, creditHours: 12, maxHours: 14, department: "إدارة الأعمال" },
    { name: "د. نورا سعيد", title: "مدرس", courses: 4, creditHours: 15, maxHours: 16, department: "المحاسبة" },
    { name: "م. يوسف أحمد", title: "معيد", courses: 2, creditHours: 6, maxHours: 8, department: "الهندسة" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-institute-blue" />
            العبء التدريسي
          </h1>
          <p className="text-muted-foreground">إدارة ومتابعة الأعباء التدريسية لأعضاء هيئة التدريس</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 ml-2" />
          تصدير التقرير
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {workloadStats.map((stat, index) => (
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

      {/* Workload Table */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع الأعباء التدريسية</CardTitle>
          <CardDescription>الفصل الدراسي الأول 2024/2025</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {facultyWorkload.map((faculty, index) => {
              const percentage = (faculty.creditHours / faculty.maxHours) * 100
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-lg border"
                >
                  <Avatar>
                    <AvatarFallback className="bg-institute-blue text-institute-blue">
                      {faculty.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{faculty.name}</h4>
                      <Badge variant="secondary">{faculty.title}</Badge>
                      <Badge variant="outline">{faculty.department}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={percentage} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground">
                        {faculty.creditHours}/{faculty.maxHours} ساعة
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {faculty.courses} مقررات
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
