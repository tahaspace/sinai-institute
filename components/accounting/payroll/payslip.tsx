"use client"

import { forwardRef } from "react"
import {
  Building2,
  User,
  Calendar,
  Hash,
  Printer,
  Download,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface PayslipData {
  // بيانات المؤسسة
  organization: {
    name: string
    logo?: string
    address: string
    phone: string
  }
  // بيانات الموظف
  employee: {
    id: string
    name: string
    position: string
    department: string
    joinDate: string
    bankAccount?: string
    bankName?: string
  }
  // بيانات الراتب
  salary: {
    month: string
    year: string
    basicSalary: number
    allowances: {
      name: string
      amount: number
    }[]
    deductions: {
      name: string
      amount: number
    }[]
    socialInsurance: {
      employeeShare: number
      employerShare: number
    }
    incomeTax: number
    netSalary: number
  }
}

interface PayslipProps {
  data: PayslipData
  onPrint?: () => void
  onDownload?: () => void
  onEmail?: () => void
}

export const Payslip = forwardRef<HTMLDivElement, PayslipProps>(
  ({ data, onPrint, onDownload, onEmail }, ref) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: "EGP",
      }).format(amount)
    }

    const totalAllowances = data.salary.allowances.reduce(
      (sum, a) => sum + a.amount,
      0
    )
    const totalDeductions = data.salary.deductions.reduce(
      (sum, d) => sum + d.amount,
      0
    )
    const grossSalary = data.salary.basicSalary + totalAllowances
    const totalTaxAndInsurance =
      data.salary.socialInsurance.employeeShare + data.salary.incomeTax

    return (
      <div className="space-y-4">
        {/* أزرار الإجراءات */}
        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={onEmail}>
            <Mail className="h-4 w-4 ml-2" />
            إرسال بالبريد
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 ml-2" />
            تحميل PDF
          </Button>
          <Button size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 ml-2" />
            طباعة
          </Button>
        </div>

        {/* قسيمة الراتب */}
        <Card ref={ref} className="max-w-2xl mx-auto print:shadow-none">
          <CardContent className="p-8">
            {/* رأس القسيمة */}
            <div className="flex items-start justify-between mb-6">
              <div>
                {data.organization.logo ? (
                  <img
                    src={data.organization.logo}
                    alt={data.organization.name}
                    className="h-16 mb-2"
                  />
                ) : (
                  <Building2 className="h-16 w-16 text-primary mb-2" />
                )}
                <h1 className="text-xl font-bold">{data.organization.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {data.organization.address}
                </p>
                <p className="text-sm text-muted-foreground">
                  هاتف: {data.organization.phone}
                </p>
              </div>
              <div className="text-left">
                <div className="bg-primary/10 px-4 py-2 rounded-lg">
                  <p className="text-sm text-muted-foreground">قسيمة راتب</p>
                  <p className="text-2xl font-bold text-primary">
                    {data.salary.month} / {data.salary.year}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* بيانات الموظف */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    اسم الموظف:
                  </span>
                  <span className="font-medium">{data.employee.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    الرقم الوظيفي:
                  </span>
                  <span className="font-mono">{data.employee.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">القسم:</span>
                  <span>{data.employee.department}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    المسمى الوظيفي:
                  </span>
                  <span className="font-medium">{data.employee.position}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    تاريخ التعيين:
                  </span>
                  <span>{data.employee.joinDate}</span>
                </div>
                {data.employee.bankAccount && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      الحساب البنكي:
                    </span>
                    <span className="font-mono text-sm">
                      {data.employee.bankAccount}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            {/* تفاصيل الراتب */}
            <div className="grid grid-cols-2 gap-8">
              {/* الاستحقاقات */}
              <div>
                <h3 className="font-bold text-green-600 mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  الاستحقاقات
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الراتب الأساسي</span>
                    <span className="font-mono">
                      {formatCurrency(data.salary.basicSalary)}
                    </span>
                  </div>
                  {data.salary.allowances.map((allowance, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {allowance.name}
                      </span>
                      <span className="font-mono">
                        {formatCurrency(allowance.amount)}
                      </span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-bold text-green-600">
                    <span>إجمالي الاستحقاقات</span>
                    <span className="font-mono">
                      {formatCurrency(grossSalary)}
                    </span>
                  </div>
                </div>
              </div>

              {/* الاستقطاعات */}
              <div>
                <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  الاستقطاعات
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      التأمينات الاجتماعية (11%)
                    </span>
                    <span className="font-mono">
                      {formatCurrency(data.salary.socialInsurance.employeeShare)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      ضريبة كسب العمل
                    </span>
                    <span className="font-mono">
                      {formatCurrency(data.salary.incomeTax)}
                    </span>
                  </div>
                  {data.salary.deductions.map((deduction, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {deduction.name}
                      </span>
                      <span className="font-mono">
                        {formatCurrency(deduction.amount)}
                      </span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-bold text-red-600">
                    <span>إجمالي الاستقطاعات</span>
                    <span className="font-mono">
                      {formatCurrency(
                        totalTaxAndInsurance + totalDeductions
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* صافي الراتب */}
            <div className="bg-gradient-to-l from-primary/20 to-primary/5 p-6 rounded-xl text-center">
              <p className="text-muted-foreground mb-2">صافي الراتب المستحق</p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(data.salary.netSalary)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                ({numberToArabicWords(Math.round(data.salary.netSalary))} جنيه
                مصري فقط لا غير)
              </p>
            </div>

            {/* ملاحظة حصة صاحب العمل */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-1">ملاحظة:</p>
              <p>
                حصة المؤسسة في التأمينات الاجتماعية (18.75%):{" "}
                <span className="font-mono">
                  {formatCurrency(data.salary.socialInsurance.employerShare)}
                </span>
              </p>
            </div>

            {/* التوقيعات */}
            <div className="grid grid-cols-3 gap-8 mt-8 pt-8 border-t">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-8">
                  إعداد: المحاسب
                </p>
                <div className="border-t border-dashed pt-2">
                  <p className="text-sm">التوقيع</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-8">
                  مراجعة: المدير المالي
                </p>
                <div className="border-t border-dashed pt-2">
                  <p className="text-sm">التوقيع</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-8">
                  استلام: الموظف
                </p>
                <div className="border-t border-dashed pt-2">
                  <p className="text-sm">التوقيع</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
)

Payslip.displayName = "Payslip"

// تحويل الرقم إلى نص عربي (مبسط)
function numberToArabicWords(num: number): string {
  const units = [
    "",
    "واحد",
    "اثنان",
    "ثلاثة",
    "أربعة",
    "خمسة",
    "ستة",
    "سبعة",
    "ثمانية",
    "تسعة",
  ]
  const tens = [
    "",
    "عشرة",
    "عشرون",
    "ثلاثون",
    "أربعون",
    "خمسون",
    "ستون",
    "سبعون",
    "ثمانون",
    "تسعون",
  ]
  const teens = [
    "عشرة",
    "أحد عشر",
    "اثنا عشر",
    "ثلاثة عشر",
    "أربعة عشر",
    "خمسة عشر",
    "ستة عشر",
    "سبعة عشر",
    "ثمانية عشر",
    "تسعة عشر",
  ]

  if (num === 0) return "صفر"
  if (num < 10) return units[num]
  if (num < 20) return teens[num - 10]
  if (num < 100) {
    const t = Math.floor(num / 10)
    const u = num % 10
    return u ? `${units[u]} و${tens[t]}` : tens[t]
  }

  // للأرقام الكبيرة نعيد النص المبسط
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000)
    const remainder = num % 1000
    if (remainder === 0) return `${thousands} ألف`
    return `${thousands} ألف و${numberToArabicWords(remainder)}`
  }

  const hundreds = Math.floor(num / 100)
  const remainder = num % 100
  const hundredNames = [
    "",
    "مائة",
    "مائتان",
    "ثلاثمائة",
    "أربعمائة",
    "خمسمائة",
    "ستمائة",
    "سبعمائة",
    "ثمانمائة",
    "تسعمائة",
  ]

  if (remainder === 0) return hundredNames[hundreds]
  return `${hundredNames[hundreds]} و${numberToArabicWords(remainder)}`
}
