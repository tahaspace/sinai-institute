"use client"

import { useState, useEffect } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
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

interface DepartmentStat {
  name: string
  students: number
  totalFees: number
  collected: number
  pending: number
  rate: number
}

interface PaymentRow {
  id: string
  student: string
  studentCode: string
  // Resolved server-side from the student's Program.academicSystem — display dimension only.
  system: string
  department: string
  amount: number
  method: string
  receipt: string
  status: string
  date: string
}

interface PaymentMethodStat {
  name: string
  count: number
  amount: number
}

// طرق الدفع — أيقونة/لون عرضي فقط حسب اسم الطريقة (ليست بيانات)
const methodVisual = (name: string): { icon: typeof DollarSign; color: string } => {
  switch (name) {
    case "نقدي":
      return { icon: DollarSign, color: "bg-institute-blue" }
    case "بطاقة ائتمان":
      return { icon: CreditCard, color: "bg-institute-blue" }
    case "تحويل بنكي":
      return { icon: Receipt, color: "bg-institute-gold" }
    case "فوري":
    case "محفظة إلكترونية":
      return { icon: Wallet, color: "bg-amber-500" }
    default:
      return { icon: DollarSign, color: "bg-institute-blue" }
  }
}

export default function InstituteCollectionPage() {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([])
  const [recentPayments, setRecentPayments] = useState<PaymentRow[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStat[]>([])
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/institute/finance/collection")
        if (!res.ok) throw new Error("فشل تحميل البيانات")
        const json = await res.json()
        if (!cancelled) {
          setDepartmentStats(json.departmentStats ?? [])
          setRecentPayments(json.recentPayments ?? [])
          setPaymentMethods(json.paymentMethods ?? [])
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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

  // Narrows the payments feed only — the same treatment the finance collection screen gets. Every
  // figure above it (the four totals, the department table, the payment-method cards) is accounting
  // data covering all systems and stays exactly as it is whatever is selected here.
  const visiblePayments = recentPayments.filter((p) => matchesSystem(p.system, systemFilter))

  const totalCollected = departmentStats.reduce((sum, d) => sum + d.collected, 0)
  const totalPending = departmentStats.reduce((sum, d) => sum + d.pending, 0)
  const totalFees = departmentStats.reduce((sum, d) => sum + d.totalFees, 0)
  const overallRate = totalFees > 0 ? ((totalCollected / totalFees) * 100).toFixed(1) : "0"

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
                        <SelectItem key={dept.name} value={dept.name}>
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

      {loading && (
        <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
      )}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

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
          const visual = methodVisual(method.name)
          const Icon = visual.icon
          return (
            <Card key={method.name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 ${visual.color} rounded-lg flex items-center justify-center text-white`}
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
                    <TableRow key={dept.name}>
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
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle>أحدث المدفوعات</CardTitle>
                <CardDescription>
                  آخر عمليات التحصيل — أحدث 50 عملية فقط
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-44" />
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
                    <TableHead className="text-left">المبلغ</TableHead>
                    <TableHead>طريقة الدفع</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && visiblePayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        {systemFilter === ACADEMIC_SYSTEM_ALL
                          ? "لا توجد مدفوعات مسجلة"
                          : "لا توجد مدفوعات ضمن النظام المحدد بين أحدث 50 عملية — قد توجد مدفوعات أقدم"}
                      </TableCell>
                    </TableRow>
                  )}
                  {visiblePayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">
                        {payment.receipt}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.student}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.studentCode}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{payment.department}</TableCell>
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
