"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  QrCode,
  CheckCircle,
  Receipt,
  User,
  Calendar,
  Hash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

interface PaymentFormProps {
  studentId?: string
  studentName?: string
  pendingAmount?: number
  onSubmit: (payment: PaymentData) => void
  onCancel: () => void
}

interface PaymentData {
  studentId: string
  amount: number
  paymentMethod: string
  reference: string
  notes: string
  date: string
}

const paymentMethods = [
  { id: "cash", name: "نقدي", icon: Banknote, color: "bg-green-100 text-green-800" },
  { id: "bank_transfer", name: "تحويل بنكي", icon: Building2, color: "bg-blue-100 text-blue-800" },
  { id: "card", name: "بطاقة ائتمان", icon: CreditCard, color: "bg-purple-100 text-purple-800" },
  { id: "fawry", name: "فوري", icon: Smartphone, color: "bg-yellow-100 text-yellow-800" },
  { id: "aman", name: "أمان", icon: Smartphone, color: "bg-orange-100 text-orange-800" },
  { id: "instapay", name: "إنستاباي", icon: QrCode, color: "bg-pink-100 text-pink-800" },
]

export function PaymentForm({
  studentId = "",
  studentName = "",
  pendingAmount = 0,
  onSubmit,
  onCancel,
}: PaymentFormProps) {
  const [formData, setFormData] = useState<PaymentData>({
    studentId,
    amount: pendingAmount,
    paymentMethod: "cash",
    reference: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  })

  const [isProcessing, setIsProcessing] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
    }).format(amount)
  }

  const handleSubmit = async () => {
    setIsProcessing(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    onSubmit(formData)
    setIsProcessing(false)
  }

  const selectedMethod = paymentMethods.find((m) => m.id === formData.paymentMethod)

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          تسجيل دفعة جديدة
        </CardTitle>
        <CardDescription>
          أدخل بيانات الدفعة للطالب
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* معلومات الطالب */}
        {studentName && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{studentName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">المبلغ المستحق:</span>
              <span className="font-bold text-red-600">
                {formatCurrency(pendingAmount)}
              </span>
            </div>
          </div>
        )}

        {/* التاريخ والمبلغ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">
              <Calendar className="h-4 w-4 inline ml-1" />
              تاريخ الدفع
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">المبلغ المدفوع</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                value={formData.amount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="text-lg font-bold pr-16"
                dir="ltr"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ج.م
              </span>
            </div>
          </div>
        </div>

        {/* طريقة الدفع */}
        <div className="space-y-3">
          <Label>طريقة الدفع</Label>
          <RadioGroup
            value={formData.paymentMethod}
            onValueChange={(value) =>
              setFormData({ ...formData, paymentMethod: value })
            }
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
          >
            {paymentMethods.map((method) => {
              const Icon = method.icon
              const isSelected = formData.paymentMethod === method.id
              return (
                <Label
                  key={method.id}
                  htmlFor={method.id}
                  className={cn(
                    "flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{method.name}</span>
                </Label>
              )
            })}
          </RadioGroup>
        </div>

        {/* رقم المرجع (للطرق غير النقدية) */}
        {formData.paymentMethod !== "cash" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <Label htmlFor="reference">
              <Hash className="h-4 w-4 inline ml-1" />
              رقم المرجع / العملية
            </Label>
            <Input
              id="reference"
              placeholder={
                formData.paymentMethod === "bank_transfer"
                  ? "رقم الحوالة البنكية"
                  : formData.paymentMethod === "card"
                  ? "آخر 4 أرقام من البطاقة"
                  : "رقم العملية"
              }
              value={formData.reference}
              onChange={(e) =>
                setFormData({ ...formData, reference: e.target.value })
              }
            />
          </motion.div>
        )}

        {/* ملاحظات */}
        <div className="space-y-2">
          <Label htmlFor="notes">ملاحظات</Label>
          <Textarea
            id="notes"
            placeholder="أي ملاحظات إضافية..."
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={3}
          />
        </div>

        {/* ملخص الدفعة */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
            ملخص الدفعة
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المبلغ:</span>
              <span className="font-bold">{formatCurrency(formData.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">طريقة الدفع:</span>
              <Badge className={selectedMethod?.color}>
                {selectedMethod?.name}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">التاريخ:</span>
              <span>{formData.date}</span>
            </div>
            {formData.reference && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">المرجع:</span>
                <span className="font-mono">{formData.reference}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!formData.amount || isProcessing}
          className="min-w-[150px]"
        >
          {isProcessing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-4 w-4 border-2 border-white border-t-transparent rounded-full ml-2"
              />
              جاري المعالجة...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 ml-2" />
              تأكيد الدفعة
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
