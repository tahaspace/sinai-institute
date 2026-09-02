"use client"

import { useState, useEffect } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
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
import { CreditCard, Plus, Receipt, User, Wallet } from "lucide-react"

interface PaymentRow {
  id: string
  student: string
  studentCode: string
  system: string
  amount: number
  method: string
  receipt: string
  status: "paid" | "pending" | "overdue"
  date: string
}

interface CollectionStats {
  totalPayments: number
  collected: number
  pending: number
  collectedToday: number
}

export default function CollectionPage() {
  const [studentId, setStudentId] = useState("")
  const [allPayments, setAllPayments] = useState<PaymentRow[]>([])
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [stats, setStats] = useState<CollectionStats>({
    totalPayments: 0,
    collected: 0,
    pending: 0,
    collectedToday: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/finance/collection`)
        if (!res.ok) throw new Error("فشل في جلب التحصيل")
        const json = await res.json()
        if (!cancelled) {
          setAllPayments(json.recentPayments ?? [])
          setStats(
            json.stats ?? { totalPayments: 0, collected: 0, pending: 0, collectedToday: 0 }
          )
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

  // Narrows the payments feed only. The four stat cards stay institute-wide: «المحصّل» / «المعلّق»
  // are cash and receivable figures, and a display filter must never appear to restate them.
  const recentPayments = allPayments.filter((p) => matchesSystem(p.system, systemFilter))

  const getStatusBadge = (status: PaymentRow["status"]) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-700">مدفوع</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700">معلق</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-700">متأخر</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

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

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل التحصيل...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Receipt className="w-5 h-5 text-institute-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalPayments}</p>
              <p className="text-xs text-muted-foreground">إجمالي المدفوعات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Wallet className="w-5 h-5 text-institute-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.collected.toLocaleString()} ج.م</p>
              <p className="text-xs text-muted-foreground">المحصّل</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-institute-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending.toLocaleString()} ج.م</p>
              <p className="text-xs text-muted-foreground">المعلّق</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <User className="w-5 h-5 text-institute-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.collectedToday.toLocaleString()} ج.م</p>
              <p className="text-xs text-muted-foreground">محصّل اليوم</p>
            </div>
          </CardContent>
        </Card>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>آخر المدفوعات</CardTitle>
              {/* The endpoint returns the latest 50 payments only — named here so an empty filtered
                  feed reads as "not in this page of results" rather than "none exist". */}
              <CardDescription>المدفوعات المسجلة — أحدث 50 عملية فقط</CardDescription>
            </div>
            <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-56" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!loading && recentPayments.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {systemFilter === ACADEMIC_SYSTEM_ALL
                  ? "لا توجد مدفوعات مسجلة"
                  : "لا توجد مدفوعات ضمن النظام المحدد بين أحدث 50 عملية — قد توجد مدفوعات أقدم"}
              </p>
            )}
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-institute-blue flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-institute-blue" />
                  </div>
                  <div>
                    <p className="font-medium">{payment.student}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{payment.studentCode}</span>
                      <span>•</span>
                      <Badge variant="outline">{payment.method}</Badge>
                      <span>•</span>
                      <span>{payment.date}</span>
                      {getStatusBadge(payment.status)}
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
