"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  GraduationCap,
  Clock,
  Calculator,
  Search,
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

// رسوم الأقسام
const departmentFees = [
  {
    id: 1,
    department: "قسم الهندسة",
    creditHourPrice: 450,
    semesterCredits: 18,
    registrationFee: 2000,
    labFee: 1500,
    totalSemester: 11600,
    annualFee: 23200,
    system: "ساعات معتمدة",
  },
  {
    id: 2,
    department: "قسم إدارة الأعمال",
    creditHourPrice: 350,
    semesterCredits: 18,
    registrationFee: 1500,
    labFee: 500,
    totalSemester: 8300,
    annualFee: 16600,
    system: "ساعات معتمدة",
  },
  {
    id: 3,
    department: "قسم الحاسبات",
    creditHourPrice: 400,
    semesterCredits: 18,
    registrationFee: 1800,
    labFee: 2000,
    totalSemester: 11000,
    annualFee: 22000,
    system: "ساعات معتمدة",
  },
  {
    id: 4,
    department: "قسم المحاسبة",
    creditHourPrice: 300,
    semesterCredits: 18,
    registrationFee: 1200,
    labFee: 0,
    totalSemester: 6600,
    annualFee: 13200,
    system: "فصلي",
  },
]

// الرسوم الإضافية
const additionalFees = [
  { id: 1, name: "رسوم الكتب والمراجع", amount: 500, mandatory: true },
  { id: 2, name: "رسوم التأمين الصحي", amount: 300, mandatory: true },
  { id: 3, name: "رسوم الأنشطة الطلابية", amount: 200, mandatory: true },
  { id: 4, name: "رسوم المكتبة", amount: 150, mandatory: true },
  { id: 5, name: "رسوم الامتحانات", amount: 100, mandatory: false },
  { id: 6, name: "رسوم إعادة المقرر", amount: 250, mandatory: false },
]

export default function InstituteTuitionPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedCredits, setSelectedCredits] = useState(18)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const calculateFees = () => {
    if (!selectedDepartment) return null
    const dept = departmentFees.find(d => d.department === selectedDepartment)
    if (!dept) return null

    const creditsFee = dept.creditHourPrice * selectedCredits
    const total = creditsFee + dept.registrationFee + dept.labFee
    return {
      creditsFee,
      registrationFee: dept.registrationFee,
      labFee: dept.labFee,
      total,
    }
  }

  const calculatedFees = calculateFees()

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
            <DollarSign className="h-8 w-8 text-institute-blue" />
            رسوم البرامج الأكاديمية
          </h1>
          <p className="text-muted-foreground">
            إدارة رسوم الأقسام والبرامج المختلفة
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-institute-blue hover:bg-institute-blue">
              <Plus className="h-4 w-4 ml-2" />
              إضافة قسم جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة رسوم قسم جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات الرسوم للقسم
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>اسم القسم</Label>
                <Input placeholder="قسم..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نظام الدراسة</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر النظام" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">ساعات معتمدة</SelectItem>
                      <SelectItem value="semester">فصلي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>سعر الساعة</Label>
                  <Input type="number" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رسوم التسجيل</Label>
                  <Input type="number" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>رسوم المعامل</Label>
                  <Input type="number" placeholder="0" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(false)}
                className="bg-institute-blue hover:bg-institute-blue"
              >
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departments">رسوم الأقسام</TabsTrigger>
          <TabsTrigger value="additional">رسوم إضافية</TabsTrigger>
          <TabsTrigger value="calculator">حاسبة الرسوم</TabsTrigger>
        </TabsList>

        {/* رسوم الأقسام */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                رسوم الأقسام الأكاديمية
              </CardTitle>
              <CardDescription>
                رسوم كل قسم حسب نظام الدراسة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>القسم</TableHead>
                    <TableHead>النظام</TableHead>
                    <TableHead className="text-left">سعر الساعة</TableHead>
                    <TableHead className="text-left">رسوم التسجيل</TableHead>
                    <TableHead className="text-left">رسوم المعامل</TableHead>
                    <TableHead className="text-left">الفصل الدراسي</TableHead>
                    <TableHead className="text-left">السنة الكاملة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentFees.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.department}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {dept.system === "ساعات معتمدة" ? (
                            <>
                              <Clock className="h-3 w-3 ml-1" />
                              ساعات معتمدة
                            </>
                          ) : (
                            "فصلي"
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left font-mono">
                        {formatCurrency(dept.creditHourPrice)}
                      </TableCell>
                      <TableCell className="text-left font-mono">
                        {formatCurrency(dept.registrationFee)}
                      </TableCell>
                      <TableCell className="text-left font-mono">
                        {dept.labFee > 0 ? formatCurrency(dept.labFee) : "-"}
                      </TableCell>
                      <TableCell className="text-left font-mono font-bold text-institute-blue">
                        {formatCurrency(dept.totalSemester)}
                      </TableCell>
                      <TableCell className="text-left font-mono font-bold text-green-700">
                        {formatCurrency(dept.annualFee)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
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

        {/* الرسوم الإضافية */}
        <TabsContent value="additional">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>الرسوم الإضافية</CardTitle>
                <CardDescription>
                  رسوم الخدمات والأنشطة الإضافية
                </CardDescription>
              </div>
              <Button variant="outline">
                <Plus className="h-4 w-4 ml-2" />
                إضافة رسم
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>البند</TableHead>
                    <TableHead className="text-left">المبلغ</TableHead>
                    <TableHead className="text-center">إلزامي</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {additionalFees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">{fee.name}</TableCell>
                      <TableCell className="text-left font-mono">
                        {formatCurrency(fee.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            fee.mandatory
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {fee.mandatory ? "إلزامي" : "اختياري"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
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

        {/* حاسبة الرسوم */}
        <TabsContent value="calculator">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  حاسبة الرسوم
                </CardTitle>
                <CardDescription>
                  احسب الرسوم الفصلية للطالب
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>القسم</Label>
                  <Select onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentFees.map((dept) => (
                        <SelectItem key={dept.id} value={dept.department}>
                          {dept.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>عدد الساعات المسجلة</Label>
                  <Input
                    type="number"
                    value={selectedCredits}
                    onChange={(e) => setSelectedCredits(parseInt(e.target.value) || 0)}
                    min={1}
                    max={24}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>نتيجة الحساب</CardTitle>
              </CardHeader>
              <CardContent>
                {calculatedFees ? (
                  <div className="space-y-4">
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span>رسوم الساعات ({selectedCredits} ساعة)</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(calculatedFees.creditsFee)}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span>رسوم التسجيل</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(calculatedFees.registrationFee)}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span>رسوم المعامل</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(calculatedFees.labFee)}
                      </span>
                    </div>
                    <div className="flex justify-between p-4 bg-institute-blue dark:bg-institute-blue/30 rounded-lg border border-institute-blue">
                      <span className="font-bold text-lg">الإجمالي</span>
                      <span className="font-mono font-bold text-xl text-institute-blue">
                        {formatCurrency(calculatedFees.total)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    اختر القسم لحساب الرسوم
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
