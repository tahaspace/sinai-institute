"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  GraduationCap,
  Clock,
  Calculator,
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

// رسوم القسم كما تُخزَّن في Setting (institute.tuition).
// totalSemester / annualFee لا تُخزَّن — تُحسب عند العرض من calculateDept().
interface DepartmentFee {
  id: string
  departmentId: string | null
  department: string
  system: "ساعات معتمدة" | "فصلي"
  creditHourPrice: number
  semesterCredits: number
  registrationFee: number
  labFee: number
}

interface AdditionalFee {
  id: string
  name: string
  amount: number
  mandatory: boolean
}

interface TuitionSettings {
  departmentFees?: DepartmentFee[]
  additionalFees?: AdditionalFee[]
}

interface SettingsResponse {
  key: string
  value: TuitionSettings | string
}

// قسم حقيقي من قاعدة البيانات (GET /api/departments) لربط جدول الرسوم بأقسام فعلية.
interface DepartmentRow {
  id: string
  nameAr: string
}

const TUITION_KEY = "institute.tuition"

export default function InstituteTuitionPage() {
  const [departmentFees, setDepartmentFees] = useState<DepartmentFee[]>([])
  const [additionalFees, setAdditionalFees] = useState<AdditionalFee[]>([])
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // حالة حوار إضافة قسم
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newDeptId, setNewDeptId] = useState<string | null>(null)
  const [newSystem, setNewSystem] = useState<"ساعات معتمدة" | "فصلي">("ساعات معتمدة")
  const [newCreditHourPrice, setNewCreditHourPrice] = useState("")
  const [newRegistrationFee, setNewRegistrationFee] = useState("")
  const [newLabFee, setNewLabFee] = useState("")
  const [newSemesterCredits, setNewSemesterCredits] = useState("18")

  // حالة حوار إضافة رسم إضافي
  const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false)
  const [newFeeName, setNewFeeName] = useState("")
  const [newFeeAmount, setNewFeeAmount] = useState("")
  const [newFeeMandatory, setNewFeeMandatory] = useState("true")

  // حاسبة الرسوم
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedCredits, setSelectedCredits] = useState(18)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [settingsRes, deptRes] = await Promise.all([
          fetch(`/api/settings?key=${TUITION_KEY}`),
          fetch(`/api/departments`),
        ])
        if (!settingsRes.ok) throw new Error("فشل تحميل البيانات")
        const settingsJson: SettingsResponse = await settingsRes.json()
        const value =
          settingsJson.value && typeof settingsJson.value === "object"
            ? (settingsJson.value as TuitionSettings)
            : {}
        // الأقسام اختيارية للربط؛ لا نفشل الصفحة إن تعذر تحميلها.
        const deptJson: DepartmentRow[] = deptRes.ok ? await deptRes.json() : []
        if (!cancelled) {
          setDepartmentFees(value.departmentFees ?? [])
          setAdditionalFees(value.additionalFees ?? [])
          setDepartments(Array.isArray(deptJson) ? deptJson : [])
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

  // إجمالي الفصل = سعر الساعة × ساعات الفصل + التسجيل + المعامل (مشتق، غير مُخزَّن).
  const semesterTotal = (dept: DepartmentFee) =>
    dept.creditHourPrice * dept.semesterCredits + dept.registrationFee + dept.labFee

  // الرسوم السنوية = إجمالي الفصل × فصلين (مشتق، غير مُخزَّن).
  const annualTotal = (dept: DepartmentFee) => semesterTotal(dept) * 2

  // كتابة الحقول الحالية كاملةً عبر PATCH (the whole blob).
  const persist = async (deptFees: DepartmentFee[], addFees: AdditionalFee[]) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: TUITION_KEY,
          value: { departmentFees: deptFees, additionalFees: addFees },
        }),
      })
      if (!res.ok) throw new Error("فشل حفظ البيانات")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const resetNewDeptForm = () => {
    setNewDeptId(null)
    setNewSystem("ساعات معتمدة")
    setNewCreditHourPrice("")
    setNewRegistrationFee("")
    setNewLabFee("")
    setNewSemesterCredits("18")
  }

  const handleAddDepartment = async () => {
    const dept = departments.find((d) => d.id === newDeptId)
    const row: DepartmentFee = {
      id: crypto.randomUUID(),
      departmentId: dept?.id ?? null,
      department: dept?.nameAr ?? "",
      system: newSystem,
      creditHourPrice: Number(newCreditHourPrice) || 0,
      semesterCredits: Number(newSemesterCredits) || 0,
      registrationFee: Number(newRegistrationFee) || 0,
      labFee: Number(newLabFee) || 0,
    }
    const next = [...departmentFees, row]
    setDepartmentFees(next)
    setIsAddDialogOpen(false)
    resetNewDeptForm()
    await persist(next, additionalFees)
  }

  const handleDeleteDepartment = async (id: string) => {
    const next = departmentFees.filter((d) => d.id !== id)
    setDepartmentFees(next)
    await persist(next, additionalFees)
  }

  const handleAddFee = async () => {
    const row: AdditionalFee = {
      id: crypto.randomUUID(),
      name: newFeeName.trim(),
      amount: Number(newFeeAmount) || 0,
      mandatory: newFeeMandatory === "true",
    }
    const next = [...additionalFees, row]
    setAdditionalFees(next)
    setIsFeeDialogOpen(false)
    setNewFeeName("")
    setNewFeeAmount("")
    setNewFeeMandatory("true")
    await persist(departmentFees, next)
  }

  const handleDeleteFee = async (id: string) => {
    const next = additionalFees.filter((f) => f.id !== id)
    setAdditionalFees(next)
    await persist(departmentFees, next)
  }

  const calculateFees = () => {
    if (!selectedDepartment) return null
    const dept = departmentFees.find((d) => d.department === selectedDepartment)
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
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) resetNewDeptForm()
          }}
        >
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
                <Select value={newDeptId ?? undefined} onValueChange={setNewDeptId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نظام الدراسة</Label>
                  <Select
                    value={newSystem === "ساعات معتمدة" ? "credit" : "semester"}
                    onValueChange={(v) =>
                      setNewSystem(v === "credit" ? "ساعات معتمدة" : "فصلي")
                    }
                  >
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
                  <Input
                    type="number"
                    placeholder="0"
                    value={newCreditHourPrice}
                    onChange={(e) => setNewCreditHourPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ساعات الفصل</Label>
                  <Input
                    type="number"
                    placeholder="18"
                    value={newSemesterCredits}
                    onChange={(e) => setNewSemesterCredits(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رسوم التسجيل</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newRegistrationFee}
                    onChange={(e) => setNewRegistrationFee(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>رسوم المعامل</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newLabFee}
                  onChange={(e) => setNewLabFee(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleAddDepartment}
                disabled={saving || !newDeptId}
                className="bg-institute-blue hover:bg-institute-blue"
              >
                {saving ? "جارٍ الحفظ..." : "إضافة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
          <CardContent className="py-4 text-red-700 dark:text-red-300">
            {error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-8">
          جارٍ التحميل...
        </div>
      ) : (
        /* Tabs */
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
                    {departmentFees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          لا توجد رسوم أقسام مسجلة
                        </TableCell>
                      </TableRow>
                    ) : (
                      departmentFees.map((dept) => (
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
                            {formatCurrency(semesterTotal(dept))}
                          </TableCell>
                          <TableCell className="text-left font-mono font-bold text-green-700">
                            {formatCurrency(annualTotal(dept))}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              <Button variant="ghost" size="icon" disabled>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                disabled={saving}
                                onClick={() => handleDeleteDepartment(dept.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
                <Dialog
                  open={isFeeDialogOpen}
                  onOpenChange={(open) => {
                    setIsFeeDialogOpen(open)
                    if (!open) {
                      setNewFeeName("")
                      setNewFeeAmount("")
                      setNewFeeMandatory("true")
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة رسم
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة رسم إضافي</DialogTitle>
                      <DialogDescription>أدخل بيانات الرسم</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>البند</Label>
                        <Input
                          placeholder="اسم الرسم"
                          value={newFeeName}
                          onChange={(e) => setNewFeeName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>المبلغ</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={newFeeAmount}
                            onChange={(e) => setNewFeeAmount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>النوع</Label>
                          <Select value={newFeeMandatory} onValueChange={setNewFeeMandatory}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">إلزامي</SelectItem>
                              <SelectItem value="false">اختياري</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsFeeDialogOpen(false)}>
                        إلغاء
                      </Button>
                      <Button
                        onClick={handleAddFee}
                        disabled={saving || !newFeeName.trim()}
                        className="bg-institute-blue hover:bg-institute-blue"
                      >
                        {saving ? "جارٍ الحفظ..." : "إضافة"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                    {additionalFees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          لا توجد رسوم إضافية مسجلة
                        </TableCell>
                      </TableRow>
                    ) : (
                      additionalFees.map((fee) => (
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
                              <Button variant="ghost" size="icon" disabled>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                disabled={saving}
                                onClick={() => handleDeleteFee(fee.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
      )}
    </motion.div>
  )
}
