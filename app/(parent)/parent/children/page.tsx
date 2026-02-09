"use client"

import Link from "next/link"
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  FileText,
  Eye,
  TrendingUp,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Children Data
const children = [
  {
    id: 1,
    name: "أحمد محمد علي",
    grade: "الصف الثالث الثانوي",
    class: "3/1",
    attendance: 95,
    gpa: 3.8,
    avatar: "أ",
    behavior: "ممتاز",
    assignments: { completed: 24, total: 28 },
  },
  {
    id: 2,
    name: "سارة محمد علي",
    grade: "الصف الأول الإعدادي",
    class: "1/2",
    attendance: 98,
    gpa: 3.9,
    avatar: "س",
    behavior: "ممتاز",
    assignments: { completed: 20, total: 22 },
  },
]

// Recent Grades
const recentGrades = {
  1: [
    { subject: "الرياضيات", grade: 48, total: 50, date: "2024-12-20" },
    { subject: "الفيزياء", grade: 45, total: 50, date: "2024-12-18" },
    { subject: "اللغة العربية", grade: 42, total: 50, date: "2024-12-15" },
  ],
  2: [
    { subject: "العلوم", grade: 45, total: 50, date: "2024-12-20" },
    { subject: "الرياضيات", grade: 47, total: 50, date: "2024-12-18" },
    { subject: "اللغة الإنجليزية", grade: 44, total: 50, date: "2024-12-15" },
  ],
}

// Attendance
const attendance = {
  1: [
    { date: "2024-12-25", status: "present" },
    { date: "2024-12-24", status: "present" },
    { date: "2024-12-23", status: "late" },
    { date: "2024-12-22", status: "present" },
  ],
  2: [
    { date: "2024-12-25", status: "present" },
    { date: "2024-12-24", status: "present" },
    { date: "2024-12-23", status: "present" },
    { date: "2024-12-22", status: "present" },
  ],
}

export default function ParentChildrenPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">متابعة الأبناء</h1>
        <p className="text-muted-foreground">متابعة الحضور والدرجات والسلوك</p>
      </div>

      {/* Children Tabs */}
      <Tabs defaultValue="1">
        <TabsList className="w-full justify-start">
          {children.map((child) => (
            <TabsTrigger key={child.id} value={child.id.toString()} className="gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs bg-pink-100 text-pink-600">
                  {child.avatar}
                </AvatarFallback>
              </Avatar>
              {child.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {children.map((child) => (
          <TabsContent key={child.id} value={child.id.toString()} className="mt-6">
            {/* Child Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <ClipboardCheck className="w-8 h-8 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-green-600">{child.attendance}%</p>
                  <p className="text-sm text-muted-foreground">الحضور</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <GraduationCap className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{child.gpa}</p>
                  <p className="text-sm text-muted-foreground">المعدل</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <FileText className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                  <p className="text-2xl font-bold text-orange-600">
                    {child.assignments.completed}/{child.assignments.total}
                  </p>
                  <p className="text-sm text-muted-foreground">الواجبات</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{child.behavior}</p>
                  <p className="text-sm text-muted-foreground">السلوك</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Grades */}
              <Card>
                <CardHeader>
                  <CardTitle>آخر الدرجات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentGrades[child.id as keyof typeof recentGrades].map((grade, index) => {
                      const percentage = (grade.grade / grade.total) * 100
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{grade.subject}</span>
                            <span className={cn(
                              "font-bold",
                              percentage >= 90 ? "text-green-600" : percentage >= 70 ? "text-blue-600" : "text-yellow-600"
                            )}>
                              {grade.grade}/{grade.total}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Attendance */}
              <Card>
                <CardHeader>
                  <CardTitle>سجل الحضور الأخير</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {attendance[child.id as keyof typeof attendance].map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(record.date).toLocaleDateString("ar-EG")}</span>
                        </div>
                        <Badge className={cn(
                          record.status === "present" && "bg-green-100 text-green-700",
                          record.status === "absent" && "bg-red-100 text-red-700",
                          record.status === "late" && "bg-yellow-100 text-yellow-700"
                        )}>
                          {record.status === "present" ? "حاضر" : record.status === "absent" ? "غائب" : "متأخر"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}



