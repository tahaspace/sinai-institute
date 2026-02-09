"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Award, Users, FileText, CheckCircle, Clock, Settings } from "lucide-react"

export default function ControlPage() {
  const committees = [
    {
      name: "لجنة كنترول الهندسة",
      department: "الهندسة",
      head: "أ.د. أحمد محمد",
      members: 5,
      courses: 12,
      status: "active",
    },
    {
      name: "لجنة كنترول الحاسبات",
      department: "الحاسبات",
      head: "أ.د. سارة علي",
      members: 4,
      courses: 10,
      status: "active",
    },
    {
      name: "لجنة كنترول إدارة الأعمال",
      department: "إدارة الأعمال",
      head: "د. محمد حسن",
      members: 4,
      courses: 8,
      status: "pending",
    },
  ]

  const tasks = [
    { task: "مراجعة درجات CS301", status: "completed", deadline: "2025-01-10" },
    { task: "اعتماد نتائج MATH201", status: "in_progress", deadline: "2025-01-12" },
    { task: "تجهيز كشوف BUS101", status: "pending", deadline: "2025-01-15" },
    { task: "إعلان نتائج الفصل", status: "pending", deadline: "2025-01-20" },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-institute-blue text-green-700"><CheckCircle className="w-3 h-3 ml-1" />مكتمل</Badge>
      case "in_progress":
        return <Badge className="bg-institute-blue text-blue-700"><Clock className="w-3 h-3 ml-1" />قيد التنفيذ</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 ml-1" />في الانتظار</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-7 h-7 text-institute-blue" />
            الكنترول
          </h1>
          <p className="text-muted-foreground">إدارة لجان الكنترول ومراجعة النتائج</p>
        </div>
        <Button>
          <Settings className="w-4 h-4 ml-2" />
          إعدادات الكنترول
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Committees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              لجان الكنترول
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {committees.map((committee, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{committee.name}</h4>
                      <p className="text-sm text-muted-foreground">رئيس اللجنة: {committee.head}</p>
                    </div>
                    <Badge className={committee.status === "active" ? "bg-institute-blue text-green-700" : "bg-yellow-100 text-yellow-700"}>
                      {committee.status === "active" ? "نشط" : "معلق"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{committee.members} أعضاء</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>{committee.courses} مقرر</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              مهام الكنترول
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{task.task}</p>
                    <p className="text-sm text-muted-foreground">الموعد: {task.deadline}</p>
                  </div>
                  {getStatusBadge(task.status)}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
