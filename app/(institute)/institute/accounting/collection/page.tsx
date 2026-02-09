"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Receipt,
  Plus,
  Search,
  DollarSign,
  Users,
  CreditCard,
  Wallet,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileText,
  Download,
  Printer,
  GraduationCap,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// بيانات التحصيل حسب القسم
const departmentStats = [
  {
    id: 1,
    name: "قسم الهندسة",
    students: 850,
    totalFees: 6800000,
    collected: 5780000,
    pending: 1020000,
    rate: 85,
  },
  {
    id: 2,
    name: "قسم إدارة الأعمال",
    students: 720,
    totalFees: 4320000,
    collected: 3542400,
    pending: 777600,
    rate: 82,
  },
  {
    id: 3,
    name: "قسم الحاسبات",
    students: 680,
    totalFees: 5440000,
    collected: 4787200,
    pending: 652800,
    rate: 88,
  },
  {
    id: 4,
    name: "قسم المحاسبة",
    students: 550,
    totalFees: 1940000,
    collected: 1513200,
    pending: 426800,
    rate: 78,
  },
]

// أحدث المدفوعات
const recentPayments = [
  {
    id: 1,
    studentName: "محمد أحمد علي",
    studentId: "STU-2024-001",
    department: "قسم الهندسة",
    amount: 5800,
    type: "رسوم فصلية",
    method: "بطاقة ائتمان",
    receiptNo: "REC-2024-0301",
    date: "2024-11-20",
    status: "completed",
  },
  {
    id: 2,
    studentName: "سارة محمود حسن",
    studentId: "STU-2024-002",
    department: "قسم الحاسبات",
    amount: 5500,
    type: "قسط شهري",
    method: "فوري",
    receiptNo: "REC-2024-0302",
    date: "2024-11-20",
    status: "completed",
  },
  {
    id: 3,
    studentName: "أحمد خالد سعيد",
    studentId: "STU-2024-003",
    department: "قسم إدارة الأعمال",
    amount: 4150,
    type: "رسوم فصلية",
    method: "تحويل بنكي",
    receiptNo: "REC-2024-0303",
    date: "2024-11-19",
    status: "completed",
  },
]

// طرق الدفع
const paymentMethods = [
  { id: "cash", name: "نقدي", icon: DollarSign, color: "bg-institute-blue", count: 450, amount: 2250000 },
  { id: "card", name: "بطاقة ائتمان", icon: CreditCard, color: "bg-institute-blue", count: 1200, amount: 8400000 },
  { id: "transfer", name: "تحويل بنكي", icon: Receipt, color: "bg-institute-gold", count: 350, amount: 3500000 },
  { id: "fawry", name: "فوري", icon: Wallet, color: "bg-amber-500", count: 800, amount: 3200000 },
]

export default function InstituteCollectionPage() {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-EG")
  }

  const totalCollected = departmentStats.reduce((sum, d) => sum + d.collected, 0)
  const totalPending = departmentStats.reduce((sum, d) => sum + d.pending, 0)
  const totalFees = departmentStats.reduce((sum, d) => sum + d.totalFees, 0)
  const overallRate = ((totalCollected / totalFees) * 100).toFixed(1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8 text-institute-blue" />
            تحصيل الرسوم
          </h1>
          <p className="text-muted-foreground">
            إدارة عمليات تحصيل الرسوم من الطلاب
          </p>
        </div>
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-institute-blue hover:bg-institute-blue">
              <Plus className="h-4 w-4 ml-2" />
              تسجيل دفعة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>تسجيل دفعة جديدة</DialogTitle>
              <DialogDescription>
                أدخل بيانات الدفعة للطالب
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>الطالب</Label>
                <Input placeholder="اسم الطالب أو الرقم الجامعي" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>القسم</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentStats.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>نوع الرسوم</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semester">رسوم فصلية</SelectItem>
                      <SelectItem value="installment">قسط شهري</SelectItem>
                      <SelectItem value="registration">رسوم تسجيل</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المبلغ (جنيه)</Label>
                  <Input type="number" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>طريقة الدفع</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الطريقة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="card">بطاقة ائتمان</SelectItem>
                      <SelectItem value="transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="fawry">فوري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => setIsPaymentDialogOpen(false)}
                className="bg-institute-blue hover:bg-institute-blue"
              >
                تسجيل الدفعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-institute-blue to-institute-blue dark:from-institute-blue/20 dark:to-institute-blue/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الرسوم</p>
                <p className="text-2xl font-bold text-institute-blue font-mono">
                  {formatCurrency(totalFees)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">تم تحصيله</p>
                <p className="text-2xl font-bold text-green-700 font-mono">
                  {formatCurrency(totalCollected)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متأخرات</p>
                <p className="text-2xl font-bold text-amber-700 font-mono">
                  {formatCurrency(totalPending)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">نسبة التحصيل</p>
                <p className="text-2xl font-bold text-blue-700">{overallRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* طرق الدفع */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {paymentMethods.map((method) => {
          const Icon = method.icon
          return (
            <Card key={method.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 ${method.color} rounded-lg flex items-center justify-center text-white`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{method.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {method.count} عملية
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-institute-blue mt-2 font-mono">
                  {formatCurrency(method.amount)}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departments">التحصيل حسب القسم</TabsTrigger>
          <TabsTrigger value="recent">أحدث المدفوعات</TabsTrigger>
        </TabsList>

        {/* التحصيل حسب القسم */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                نسب التحصيل حسب القسم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>القسم</TableHead>
                    <TableHead className="text-center">عدد الطلاب</TableHead>
                    <TableHead className="text-left">إجمالي الرسوم</TableHead>
                    <TableHead className="text-left">تم تحصيله</TableHead>
                    <TableHead className="text-left">متأخرات</TableHead>
                    <TableHead className="text-center">نسبة التحصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentStats.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-center">{dept.students}</TableCell>
                      <TableCell className="text-left font-mono">
                        {formatCurrency(dept.totalFees)}
                      </TableCell>
                      <TableCell className="text-left font-mono text-institute-blue">
                        {formatCurrency(dept.collected)}
                      </TableCell>
                      <TableCell className="text-left font-mono text-red-600">
                        {formatCurrency(dept.pending)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            dept.rate >= 85
                              ? "bg-institute-blue text-green-800"
                              : dept.rate >= 75
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {dept.rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* أحدث المدفوعات */}
        <TabsContent value="recent">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>أحدث المدفوعات</CardTitle>
                <CardDescription>
                  آخر عمليات التحصيل
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="بحث..." className="pr-10 w-48" />
                </div>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الإيصال</TableHead>
                    <TableHead>الطالب</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>نوع الرسوم</TableHead>
                    <TableHead className="text-left">المبلغ</TableHead>
                    <TableHead>طريقة الدفع</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">
                        {payment.receiptNo}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.studentName}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.studentId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{payment.department}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.type}</Badge>
                      </TableCell>
                      <TableCell className="text-left font-mono font-bold text-institute-blue">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>{formatDate(payment.date)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="icon">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
