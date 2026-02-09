"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Award, CheckCircle, Clock, FileText, Download, Eye, Users, GraduationCap } from "lucide-react"

export default function GraduationPage() {
  const gradStats = [
    { label: "طلبات التخرج", value: "185", icon: FileText, color: "text-institute-blue" },
    { label: "مؤهل للتخرج", value: "142", icon: CheckCircle, color: "text-institute-blue" },
    { label: "قيد المراجعة", value: "28", icon: Clock, color: "text-yellow-600" },
    { label: "خريجين هذا العام", value: "520", icon: Award, color: "text-institute-gold" },
  ]

  const graduationRequests = [
    { id: 1, name: "أحمد محمد علي", studentId: "STU2020001", department: "الهندسة", program: "هندسة الحاسبات", gpa: 3.45, creditHours: 160, status: "approved" },
    { id: 2, name: "سارة أحمد حسن", studentId: "STU2020002", department: "الحاسبات", program: "علوم الحاسب", gpa: 3.82, creditHours: 140, status: "pending" },
    { id: 3, name: "محمد علي إبراهيم", studentId: "STU2020003", department: "إدارة الأعمال", program: "إدارة الأعمال", gpa: 3.15, creditHours: 128, status: "review" },
    { id: 4, name: "نور محمود سعيد", studentId: "STU2020004", department: "المحاسبة", program: "المحاسبة", gpa: 3.68, creditHours: 130, status: "approved" },
  ]

  const requirements = [
    { name: "إتمام الساعات المعتمدة", required: 160, current: 160, completed: true },
    { name: "المعدل التراكمي", required: 2.0, current: 3.45, completed: true },
    { name: "مشروع التخرج", required: 1, current: 1, completed: true },
    { name: "التدريب الميداني", required: 200, current: 200, completed: true },
    { name: "السداد المالي", required: 100, current: 100, completed: true },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-institute-blue text-green-700"><CheckCircle className="w-3 h-3 ml-1" />مؤهل للتخرج</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 ml-1" />في الانتظار</Badge>
      case "review":
        return <Badge className="bg-institute-blue text-blue-700"><FileText className="w-3 h-3 ml-1" />قيد المراجعة</Badge>
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
            التخرج
          </h1>
          <p className="text-muted-foreground">إدارة طلبات التخرج ومتطلباته</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير قائمة الخريجين
          </Button>
          <Button>
            <FileText className="w-4 h-4 ml-2" />
            طلب تخرج جديد
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {gradStats.map((stat, index) => (
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Requirements Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              متطلبات التخرج
            </CardTitle>
            <CardDescription>نموذج متطلبات التخرج</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requirements.map((req, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    req.completed ? "bg-institute-blue" : "bg-gray-100"
                  }`}>
                    {req.completed ? (
                      <CheckCircle className="w-4 h-4 text-institute-blue" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{req.name}</p>
                    <p className="text-xs text-muted-foreground">{req.current}/{req.required}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Graduation Requests */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>طلبات التخرج</CardTitle>
            <CardDescription>قائمة طلبات التخرج الحالية</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>البرنامج</TableHead>
                  <TableHead>المعدل</TableHead>
                  <TableHead>الساعات</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {graduationRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-institute-blue text-institute-blue text-xs">
                            {request.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{request.name}</p>
                          <p className="text-xs text-muted-foreground">{request.studentId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{request.program}</p>
                        <p className="text-xs text-muted-foreground">{request.department}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-institute-blue">{request.gpa.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.creditHours}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
