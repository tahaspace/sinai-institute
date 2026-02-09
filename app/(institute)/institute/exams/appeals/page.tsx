"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle, Eye, CheckCircle, XCircle, Clock, FileText, Plus } from "lucide-react"

export default function AppealsPage() {
  const stats = [
    { label: "إجمالي التظلمات", value: "28", icon: FileText, color: "text-institute-blue" },
    { label: "قيد المراجعة", value: "12", icon: Clock, color: "text-yellow-600" },
    { label: "مقبول", value: "8", icon: CheckCircle, color: "text-institute-blue" },
    { label: "مرفوض", value: "8", icon: XCircle, color: "text-red-600" },
  ]

  const appeals = [
    { id: 1, student: "أحمد محمد", studentId: "STU2024001", course: "CS301", oldGrade: 55, requestedAction: "إعادة تصحيح", date: "2024-12-20", status: "pending" },
    { id: 2, student: "سارة علي", studentId: "STU2024002", course: "MATH301", oldGrade: 48, requestedAction: "مراجعة الجمع", date: "2024-12-19", status: "approved" },
    { id: 3, student: "محمد حسن", studentId: "STU2024003", course: "BUS101", oldGrade: 42, requestedAction: "إعادة تصحيح", date: "2024-12-18", status: "rejected" },
    { id: 4, student: "نور سعيد", studentId: "STU2024004", course: "ACC201", oldGrade: 58, requestedAction: "مراجعة الجمع", date: "2024-12-21", status: "pending" },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 ml-1" />قيد المراجعة</Badge>
      case "approved":
        return <Badge className="bg-institute-blue text-green-700"><CheckCircle className="w-3 h-3 ml-1" />مقبول</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 ml-1" />مرفوض</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-institute-blue" />
            التظلمات
          </h1>
          <p className="text-muted-foreground">إدارة طلبات التظلم من نتائج الامتحانات</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          تقديم تظلم
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

      {/* Appeals Table */}
      <Card>
        <CardHeader>
          <CardTitle>طلبات التظلم</CardTitle>
          <CardDescription>قائمة طلبات التظلم من نتائج الامتحانات</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>المقرر</TableHead>
                <TableHead>الدرجة</TableHead>
                <TableHead>الطلب</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appeals.map((appeal) => (
                <TableRow key={appeal.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{appeal.student}</p>
                      <p className="text-xs text-muted-foreground">{appeal.studentId}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{appeal.course}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-red-600">{appeal.oldGrade}</span>
                  </TableCell>
                  <TableCell>{appeal.requestedAction}</TableCell>
                  <TableCell>{appeal.date}</TableCell>
                  <TableCell>{getStatusBadge(appeal.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {appeal.status === "pending" && (
                        <>
                          <Button variant="ghost" size="icon" className="text-institute-blue">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
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
