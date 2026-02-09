"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle, Eye, Mail, FileText, Users, TrendingDown, Clock } from "lucide-react"

export default function WarningsPage() {
  const warningStats = [
    { label: "إنذار أول", value: "45", icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100" },
    { label: "إنذار ثاني", value: "18", icon: AlertTriangle, color: "text-institute-gold", bg: "bg-institute-gold" },
    { label: "إنذار نهائي", value: "7", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
    { label: "فصل مؤقت", value: "3", icon: TrendingDown, color: "text-red-700", bg: "bg-red-200" },
  ]

  const warnings = [
    { id: 1, name: "أحمد محمد علي", studentId: "STU2024001", department: "الهندسة", gpa: 1.85, type: "إنذار أول", date: "2024-12-15", reason: "انخفاض المعدل التراكمي" },
    { id: 2, name: "سارة أحمد حسن", studentId: "STU2024002", department: "الحاسبات", gpa: 1.52, type: "إنذار ثاني", date: "2024-12-10", reason: "استمرار انخفاض المعدل" },
    { id: 3, name: "محمد علي إبراهيم", studentId: "STU2024003", department: "إدارة الأعمال", gpa: 1.78, type: "إنذار أول", date: "2024-12-12", reason: "انخفاض المعدل التراكمي" },
    { id: 4, name: "نور محمود سعيد", studentId: "STU2024004", department: "المحاسبة", gpa: 1.35, type: "إنذار نهائي", date: "2024-12-08", reason: "عدم تحسن المعدل" },
    { id: 5, name: "يوسف أحمد محمد", studentId: "STU2024005", department: "السياحة", gpa: 1.92, type: "إنذار أول", date: "2024-12-18", reason: "انخفاض المعدل التراكمي" },
  ]

  const getWarningBadge = (type: string) => {
    switch (type) {
      case "إنذار أول":
        return <Badge className="bg-yellow-100 text-yellow-700">إنذار أول</Badge>
      case "إنذار ثاني":
        return <Badge className="bg-institute-gold text-orange-700">إنذار ثاني</Badge>
      case "إنذار نهائي":
        return <Badge className="bg-red-100 text-red-700">إنذار نهائي</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-yellow-600" />
            الإنذارات الأكاديمية
          </h1>
          <p className="text-muted-foreground">متابعة الطلاب ذوي الأداء الأكاديمي المنخفض</p>
        </div>
        <Button variant="outline">
          <FileText className="w-4 h-4 ml-2" />
          تقرير الإنذارات
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {warningStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${stat.bg} flex items-center justify-center`}>
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

      {/* Warnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الإنذارات</CardTitle>
          <CardDescription>الطلاب الذين حصلوا على إنذارات أكاديمية</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>المعدل</TableHead>
                <TableHead>نوع الإنذار</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>السبب</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warnings.map((warning) => (
                <TableRow key={warning.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                          {warning.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{warning.name}</p>
                        <p className="text-xs text-muted-foreground">{warning.studentId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{warning.department}</TableCell>
                  <TableCell>
                    <span className={`font-bold ${warning.gpa < 1.5 ? "text-red-600" : "text-yellow-600"}`}>
                      {warning.gpa.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{getWarningBadge(warning.type)}</TableCell>
                  <TableCell>{warning.date}</TableCell>
                  <TableCell className="max-w-32 truncate">{warning.reason}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
