"use client"

import { useState } from "react"
import {
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Attendance Data
const attendanceRecords = [
  { date: "2024-12-25", day: "الأربعاء", status: "present", note: "" },
  { date: "2024-12-24", day: "الثلاثاء", status: "present", note: "" },
  { date: "2024-12-23", day: "الاثنين", status: "present", note: "" },
  { date: "2024-12-22", day: "الأحد", status: "present", note: "" },
  { date: "2024-12-19", day: "الخميس", status: "late", note: "تأخر 15 دقيقة" },
  { date: "2024-12-18", day: "الأربعاء", status: "present", note: "" },
  { date: "2024-12-17", day: "الثلاثاء", status: "absent", note: "عذر مرضي" },
  { date: "2024-12-16", day: "الاثنين", status: "present", note: "" },
]

// Monthly Stats
const monthlyStats = [
  { month: "ديسمبر", present: 18, absent: 1, late: 1, percentage: 95 },
  { month: "نوفمبر", present: 20, absent: 2, late: 0, percentage: 91 },
  { month: "أكتوبر", present: 22, absent: 0, late: 1, percentage: 96 },
  { month: "سبتمبر", present: 19, absent: 1, late: 2, percentage: 86 },
]

// Stats
const stats = {
  totalDays: 85,
  presentDays: 80,
  absentDays: 3,
  lateDays: 2,
  percentage: 95,
}

const statusConfig = {
  present: { label: "حاضر", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  absent: { label: "غائب", color: "bg-red-100 text-red-700", icon: XCircle },
  late: { label: "متأخر", color: "bg-yellow-100 text-yellow-700", icon: Clock },
}

export default function StudentAttendancePage() {
  const [month, setMonth] = useState("december")

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الحضور والغياب</h1>
          <p className="text-muted-foreground">متابعة سجل الحضور والغياب</p>
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="december">ديسمبر 2024</SelectItem>
            <SelectItem value="november">نوفمبر 2024</SelectItem>
            <SelectItem value="october">أكتوبر 2024</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{stats.totalDays}</p>
            <p className="text-sm text-muted-foreground">إجمالي الأيام</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.presentDays}</p>
            <p className="text-sm text-muted-foreground">أيام الحضور</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.absentDays}</p>
            <p className="text-sm text-muted-foreground">أيام الغياب</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{stats.lateDays}</p>
            <p className="text-sm text-muted-foreground">أيام التأخير</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-teal-500 mb-2" />
            <p className="text-2xl font-bold text-teal-600">{stats.percentage}%</p>
            <p className="text-sm text-muted-foreground">نسبة الحضور</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Progress */}
      <Card>
        <CardHeader>
          <CardTitle>نسبة الحضور الكلية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>نسبة الحضور</span>
              <span className="font-bold text-green-600">{stats.percentage}%</span>
            </div>
            <Progress value={stats.percentage} className="h-4" />
            {stats.percentage >= 90 ? (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                نسبة حضور ممتازة!
              </p>
            ) : stats.percentage >= 75 ? (
              <p className="text-sm text-yellow-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                يجب تحسين نسبة الحضور
              </p>
            ) : (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                تحذير: نسبة الحضور منخفضة
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Records */}
        <Card>
          <CardHeader>
            <CardTitle>سجل الحضور الأخير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceRecords.map((record, index) => {
                const status = statusConfig[record.status as keyof typeof statusConfig]
                const StatusIcon = status.icon

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="font-bold">
                          {new Date(record.date).getDate()}
                        </p>
                        <p className="text-xs text-muted-foreground">{record.day}</p>
                      </div>
                      <div>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {status.label}
                        </Badge>
                        {record.note && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {record.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Summary */}
        <Card>
          <CardHeader>
            <CardTitle>ملخص شهري</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyStats.map((stat) => (
                <div key={stat.month} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{stat.month}</span>
                    <span className={cn(
                      "font-bold",
                      stat.percentage >= 90 ? "text-green-600" :
                      stat.percentage >= 75 ? "text-yellow-600" :
                      "text-red-600"
                    )}>
                      {stat.percentage}%
                    </span>
                  </div>
                  <Progress value={stat.percentage} className="h-2" />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="text-green-600">حضور: {stat.present}</span>
                    <span className="text-red-600">غياب: {stat.absent}</span>
                    <span className="text-yellow-600">تأخير: {stat.late}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



