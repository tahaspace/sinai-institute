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
import { FileText, Plus, Eye, CheckCircle, XCircle, Clock, BookOpen } from "lucide-react"

export default function EquivalencePage() {
  const equivalenceRequests = [
    {
      id: 1,
      student: "أحمد محمد",
      originalCourse: "CS101 - مقدمة في البرمجة",
      originalInstitute: "جامعة القاهرة",
      requestedCourse: "CS101 - أساسيات البرمجة",
      creditHours: 3,
      date: "2024-12-20",
      status: "approved",
    },
    {
      id: 2,
      student: "سارة علي",
      originalCourse: "MATH101 - حساب التفاضل",
      originalInstitute: "جامعة عين شمس",
      requestedCourse: "MATH101 - رياضيات (1)",
      creditHours: 3,
      date: "2024-12-18",
      status: "pending",
    },
    {
      id: 3,
      student: "محمد حسن",
      originalCourse: "ENG101 - English Language",
      originalInstitute: "معهد أخر",
      requestedCourse: "ENG101 - اللغة الإنجليزية",
      creditHours: 2,
      date: "2024-12-15",
      status: "rejected",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 ml-1" />قيد المراجعة</Badge>
      case "approved":
        return <Badge className="bg-institute-blue text-green-700"><CheckCircle className="w-3 h-3 ml-1" />معتمد</Badge>
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
            <FileText className="w-7 h-7 text-institute-blue" />
            معادلة المقررات
          </h1>
          <p className="text-muted-foreground">إدارة طلبات معادلة المقررات للطلاب المحولين</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          طلب معادلة جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الطلبات", value: "45", icon: FileText, color: "text-institute-blue" },
          { label: "معتمدة", value: "32", icon: CheckCircle, color: "text-institute-blue" },
          { label: "قيد المراجعة", value: "8", icon: Clock, color: "text-yellow-600" },
          { label: "ساعات معادلة", value: "128", icon: BookOpen, color: "text-institute-gold" },
        ].map((stat, index) => (
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

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>طلبات المعادلة</CardTitle>
          <CardDescription>قائمة طلبات معادلة المقررات</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>المقرر الأصلي</TableHead>
                <TableHead>المؤسسة السابقة</TableHead>
                <TableHead>المقرر المطلوب</TableHead>
                <TableHead>الساعات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equivalenceRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.student}</TableCell>
                  <TableCell>{request.originalCourse}</TableCell>
                  <TableCell>{request.originalInstitute}</TableCell>
                  <TableCell>{request.requestedCourse}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{request.creditHours}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {request.status === "pending" && (
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
