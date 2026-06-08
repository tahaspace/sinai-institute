"use client"

import { useState, useEffect } from "react"
import { GraduationCap, ClipboardCheck, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- API response shape (served by /api/parent/children) ---
interface Child {
  id: string
  studentCode: string
  name: string
  level: number
  gpa: number
  attendance: number
  fees: { total: number; paid: number; remaining: number }
}

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/parent/children`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب بيانات الأبناء")
        const json = await res.json()
        if (!cancelled) setChildren(json.children ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">متابعة الأبناء</h1>
        <p className="text-muted-foreground">متابعة الحضور والدرجات والمصروفات</p>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل بيانات الأبناء...</CardContent></Card>}

      {!loading && !error && children.length === 0 && (
        <Card><CardContent className="p-12 text-center text-muted-foreground">لا يوجد أبناء مرتبطون بهذا الحساب</CardContent></Card>
      )}

      {!loading && !error && children.length > 0 && (
        <Tabs defaultValue={children[0].id}>
          <TabsList className="w-full justify-start">
            {children.map((child) => (
              <TabsTrigger key={child.id} value={child.id} className="gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs bg-pink-100 text-pink-600">{child.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {child.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {children.map((child) => {
            const paidPct = child.fees.total > 0 ? (child.fees.paid / child.fees.total) * 100 : 0
            return (
              <TabsContent key={child.id} value={child.id} className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <ClipboardCheck className="w-8 h-8 mx-auto text-green-500 mb-2" />
                      <p className="text-2xl font-bold text-green-600">{child.attendance}%</p>
                      <p className="text-sm text-muted-foreground">الحضور</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <GraduationCap className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                      <p className="text-2xl font-bold text-blue-600">{child.gpa.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">المعدل التراكمي</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <CreditCard className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                      <p className="text-2xl font-bold text-orange-600">{child.fees.remaining.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">المتبقي من الرسوم (ج.م)</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>المصروفات الدراسية — {child.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>المدفوع: {child.fees.paid.toLocaleString()} ج.م</span>
                      <span className="text-muted-foreground">الإجمالي: {child.fees.total.toLocaleString()} ج.م</span>
                    </div>
                    <Progress value={paidPct} className="h-3" />
                    <p className="text-sm text-muted-foreground">
                      رقم الطالب: {child.studentCode} • المستوى {child.level}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}
