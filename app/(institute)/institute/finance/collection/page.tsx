"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreditCard, Search, Plus, Receipt, User, Wallet } from "lucide-react"

export default function CollectionPage() {
  const [studentId, setStudentId] = useState("")

  const recentPayments = [
    { id: 1, student: "أحمد محمد", amount: 15000, method: "بطاقة", date: "2024-12-28", receipt: "RCP001" },
    { id: 2, student: "سارة علي", amount: 20000, method: "تحويل", date: "2024-12-27", receipt: "RCP002" },
    { id: 3, student: "محمد حسن", amount: 5000, method: "نقدي", date: "2024-12-27", receipt: "RCP003" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-institute-blue" />
            تحصيل الرسوم
          </h1>
          <p className="text-muted-foreground">تسجيل المدفوعات وإصدار الإيصالات</p>
        </div>
      </div>

      {/* New Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            تسجيل دفعة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">رقم الطالب</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="أدخل رقم الطالب"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">المبلغ</label>
                <div className="relative">
                  <Wallet className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="0.00" type="number" className="pr-10" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">طريقة الدفع</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="card">بطاقة ائتمان</SelectItem>
                    <SelectItem value="transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">ملاحظات</label>
                <Input placeholder="ملاحظات إضافية (اختياري)" />
              </div>
              <Button className="w-full mt-4">
                <Receipt className="w-4 h-4 ml-2" />
                تسجيل الدفعة وإصدار إيصال
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>آخر المدفوعات</CardTitle>
          <CardDescription>المدفوعات المسجلة اليوم</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-institute-blue flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-institute-blue" />
                  </div>
                  <div>
                    <p className="font-medium">{payment.student}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{payment.method}</Badge>
                      <span>•</span>
                      <span>{payment.date}</span>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-bold text-institute-blue">{payment.amount.toLocaleString()} ج.م</p>
                  <p className="text-xs text-muted-foreground">{payment.receipt}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
